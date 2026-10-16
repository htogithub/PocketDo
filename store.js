/* PocketDo - data store, sync queue and backends (Supabase or this device only). */
(function () {
  'use strict';
  var PT = (window.PT = window.PT || {});

  /* ------------------------------------------------------------------ */
  /* Utilities                                                           */
  /* ------------------------------------------------------------------ */
  var U = (PT.util = {});
  U.pad = function (n) { return String(n).padStart(2, '0'); };
  U.dayStr = function (d) { return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()); };
  U.parseDay = function (s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); };
  U.today = function () { return U.dayStr(new Date()); };
  U.addDays = function (s, n) { var d = U.parseDay(s); d.setDate(d.getDate() + n); return U.dayStr(d); };
  U.diffDays = function (a, b) { return Math.round((U.parseDay(b) - U.parseDay(a)) / 864e5); };
  U.isoDow = function (s) { return ((U.parseDay(s).getDay() + 6) % 7) + 1; }; // 1 = Monday ... 7 = Sunday
  U.isWeekend = function (s) { return U.isoDow(s) >= 6; };
  U.mondayOf = function (s) { return U.addDays(s, 1 - U.isoDow(s)); };
  U.nowIso = function () { return new Date().toISOString(); };
  U.dayOfIso = function (iso) { return iso ? U.dayStr(new Date(iso)) : null; };
  U.time = function (iso) { return iso ? Date.parse(iso) || 0 : 0; };
  U.validDay = function (s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; };
  U.uuid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  };
  U.scheduledOn = function (habit, day) {
    if (habit.schedule === 'weekdays') return !U.isWeekend(day);
    if (habit.schedule === 'weekend') return U.isWeekend(day);
    return true;
  };
  U.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  U.isNetErr = function (e) {
    if (!navigator.onLine) return true;
    var m = (e && (e.message || String(e))) || '';
    return /failed to fetch|networkerror|network request|load failed|timeout|fetch/i.test(m) || (e && e.status === 0);
  };

  /* Recurrence: rep = { freq: 'day'|'week'|'month', every: n, days: [1..7], mday: 1..31 } */
  U.repDays = function (rep, ref) { return rep.days && rep.days.length ? rep.days : [U.isoDow(ref)]; };
  U.validRepeat = function (r) {
    if (!r || typeof r !== 'object' || ['day', 'week', 'month'].indexOf(r.freq) < 0) return null;
    var o = { freq: r.freq, every: Math.min(30, Math.max(1, parseInt(r.every, 10) || 1)) };
    if (r.freq === 'week' && Array.isArray(r.days)) o.days = r.days.map(Number).filter(function (d) { return d >= 1 && d <= 7; });
    if (r.freq === 'month' && r.mday) o.mday = Math.min(31, Math.max(1, parseInt(r.mday, 10) || 1));
    return o;
  };
  U.nextOccurrence = function (rep, base, today) {
    var every = Math.max(1, rep.every | 0 || 1);
    var anchorMon = U.mondayOf(base);
    var days = U.repDays(rep, base);
    function step(cur) {
      if (rep.freq === 'day') return U.addDays(cur, every);
      if (rep.freq === 'week') {
        var x = cur;
        for (var i = 0; i < 7 * every + 7; i++) {
          x = U.addDays(x, 1);
          var wk = Math.round(U.diffDays(anchorMon, U.mondayOf(x)) / 7);
          if (wk % every === 0 && days.indexOf(U.isoDow(x)) >= 0) return x;
        }
        return U.addDays(cur, 7 * every);
      }
      if (rep.freq === 'month') {
        var p = U.parseDay(cur);
        var mday = rep.mday || p.getDate();
        var y = p.getFullYear(), m = p.getMonth() + every;
        y += Math.floor(m / 12); m = m % 12;
        var last = new Date(y, m + 1, 0).getDate();
        return U.dayStr(new Date(y, m, Math.min(mday, last), 12));
      }
      return U.addDays(cur, 1);
    }
    var next = step(base), guard = 0;
    while (next <= today && guard++ < 2000) next = step(next);
    return next;
  };
  U.firstOnOrAfter = function (rep, from) {
    if (rep.freq !== 'week') return from;
    var days = U.repDays(rep, from);
    for (var i = 0; i < 7; i++) {
      var x = U.addDays(from, i);
      if (days.indexOf(U.isoDow(x)) >= 0) return x;
    }
    return from;
  };

  /* ------------------------------------------------------------------ */
  /* Store                                                               */
  /* ------------------------------------------------------------------ */
  var TABLES = ['lists', 'tasks', 'habits', 'habit_logs'];
  var EMPTY = new Set();
  function keyOf(table, row) {
    if (!row) return null;
    if (table === 'habit_logs') return row.habit_id && row.day ? row.habit_id + '|' + row.day : null;
    if (table === 'settings') return 'settings';
    return row.id || null;
  }
  function byPos(a, b) { return a.position - b.position || String(a.created_at).localeCompare(String(b.created_at)); }
  function clean(table, r) {
    var o = Object.assign({}, r);
    delete o.user_id;
    if ('position' in o) o.position = Number(o.position) || 0;
    if (table === 'tasks') {
      o.notes = o.notes || '';
      o.repeat = U.validRepeat(o.repeat);
      o.done = !!o.done;
      o.list_id = o.list_id || null;
    }
    if (table === 'habit_logs') o.done = o.done !== false;
    return o;
  }

  var S = (PT.store = {
    lists: new Map(), tasks: new Map(), habits: new Map(), habit_logs: new Map(),
    settings: {}, settingsAt: 0, hasSettings: false,
    backend: null, uid: null, email: '',
    queue: new Map(), inflight: new Set(), tombs: new Map(),
    flushing: false, flushTimer: null, retryDelay: 0,
    sync: 'idle', lastSync: 0, importing: false, resyncing: false,
    logVersion: 0, _doneCache: new Map(), _doneVer: -1,
    _ls: {},

    on: function (ev, fn) { (this._ls[ev] = this._ls[ev] || []).push(fn); },
    emit: function (ev) {
      var args = Array.prototype.slice.call(arguments, 1);
      (this._ls[ev] || []).forEach(function (f) { try { f.apply(null, args); } catch (e) { console.error(e); } });
    },
    changed: function () { this.emit('change'); },
    setSync: function (s) { if (this.sync !== s) { this.sync = s; this.emit('sync', s); } },

    reset: function () {
      clearTimeout(this.flushTimer);
      this.lists = new Map(); this.tasks = new Map(); this.habits = new Map(); this.habit_logs = new Map();
      this.queue = new Map(); this.inflight = new Set(); this.tombs = new Map();
      this.flushing = false; this.retryDelay = 0; this.hasSettings = false; this.settingsAt = 0;
      this.backend = null; this.uid = null; this.email = '';
      this.logVersion++; this.sync = 'idle';
    },

    /* ---------- loading ---------- */
    hydrate: function (data, merge) {
      var self = this;
      TABLES.forEach(function (table) {
        var map = new Map();
        (data[table] || []).forEach(function (r) { var row = clean(table, r); var k = keyOf(table, row); if (k) map.set(k, row); });
        if (merge) {
          var old = self[table];
          var keys = new Set(Array.from(map.keys()).concat(Array.from(old.keys())));
          keys.forEach(function (k) {
            if (self.isPending(table, k)) { if (old.has(k)) map.set(k, old.get(k)); else map.delete(k); }
          });
        }
        self[table] = map;
      });
      if (data.settings && !(merge && this.isPending('settings', 'settings'))) {
        this.settings = Object.assign(PT.defaultSettings(), data.settings.data || {});
        this.settingsAt = U.time(data.settings.updated_at);
        this.hasSettings = true;
        this.emit('settings');
      }
      this.logVersion++;
      this.changed();
    },

    resync: async function () {
      if (!this.backend || this.resyncing || this.importing) return;
      this.resyncing = true;
      try {
        var d = await this.backend.loadAll();
        this.hydrate(d, true);
        this.lastSync = Date.now();
        if (!this.queue.size && !this.inflight.size) this.setSync('idle');
      } catch (e) {
        if (U.isNetErr(e)) this.setSync('offline'); else this.emit('error', e);
      } finally { this.resyncing = false; }
    },

    /* ---------- sync queue ---------- */
    isPending: function (table, k) { var qk = table + ':' + k; return this.queue.has(qk) || this.inflight.has(qk); },
    enqueue: function (table, op, payload) {
      var k = op === 'upsert' ? keyOf(table, payload) : payload;
      if (!k) return;
      var qk = table + ':' + k;
      this.queue.delete(qk);
      this.queue.set(qk, { qk: qk, table: table, op: op, row: op === 'upsert' ? Object.assign({}, payload) : null, key: op === 'delete' ? k : null });
      this.scheduleFlush();
    },
    dropQueued: function (pred) {
      var self = this;
      Array.from(this.queue.entries()).forEach(function (e) { if (pred(e[1])) self.queue.delete(e[0]); });
    },
    scheduleFlush: function (ms) {
      clearTimeout(this.flushTimer);
      var self = this;
      this.flushTimer = setTimeout(function () { self.flush(); }, ms == null ? 350 : ms);
      if (this.sync !== 'offline') this.setSync('saving');
    },
    flush: async function () {
      if (this.flushing || !this.backend) return;
      clearTimeout(this.flushTimer);
      if (!this.queue.size) { if (!this.inflight.size && this.sync === 'saving') this.setSync('idle'); return; }
      this.flushing = true;
      var self = this;
      var ops = Array.from(this.queue.values());
      this.queue.clear();
      ops.forEach(function (o) { self.inflight.add(o.qk); });
      if (this.sync !== 'offline') this.setSync('saving');
      var failed = null;
      try {
        var upOrder = ['lists', 'habits', 'tasks', 'habit_logs', 'settings'];
        for (var i = 0; i < upOrder.length; i++) {
          var tb = upOrder[i];
          var rows = ops.filter(function (o) { return o.table === tb && o.op === 'upsert'; }).map(function (o) { return o.row; });
          if (rows.length) await this.backend.upsert(tb, rows);
        }
        var delOrder = ['tasks', 'lists', 'habits'];
        for (var j = 0; j < delOrder.length; j++) {
          var td = delOrder[j];
          var keys = ops.filter(function (o) { return o.table === td && o.op === 'delete'; }).map(function (o) { return o.key; });
          if (keys.length) await this.backend.remove(td, keys);
        }
        this.retryDelay = 0;
        this.lastSync = Date.now();
      } catch (err) { failed = err; }
      ops.forEach(function (o) { self.inflight.delete(o.qk); });
      this.flushing = false;

      if (failed) {
        if (U.isNetErr(failed)) {
          ops.forEach(function (o) { if (!self.queue.has(o.qk)) self.queue.set(o.qk, o); });
          this.setSync('offline');
          this.retryDelay = Math.min((this.retryDelay || 1000) * 2, 30000);
          clearTimeout(this.flushTimer);
          this.flushTimer = setTimeout(function () { self.flush(); }, this.retryDelay);
        } else {
          console.error(failed);
          this.setSync('error');
          this.emit('error', failed);
          setTimeout(function () { self.resync(); }, 1200);
        }
        return;
      }
      if (this.queue.size) this.scheduleFlush(60);
      else this.setSync('idle');
    },
    flushNow: async function () {
      clearTimeout(this.flushTimer);
      for (var i = 0; i < 40 && (this.queue.size || this.flushing); i++) {
        if (this.flushing) await U.sleep(80); else await this.flush();
        if (this.sync === 'offline') break;
      }
    },

    /* ---------- realtime ---------- */
    applyRemote: function (table, type, nw, old) {
      if (this.importing || !this.backend) return;
      if (table === 'settings') {
        if (type === 'DELETE' || !nw || this.isPending('settings', 'settings')) return;
        if (U.time(nw.updated_at) < this.settingsAt) return;
        this.settings = Object.assign(PT.defaultSettings(), nw.data || {});
        this.settingsAt = U.time(nw.updated_at);
        this.hasSettings = true;
        this.emit('settings');
        return;
      }
      var map = this[table];
      if (!map || TABLES.indexOf(table) < 0) return;
      if (type === 'DELETE') {
        var dk = keyOf(table, old);
        if (!dk || this.isPending(table, dk)) return;
        if (map.delete(dk)) { if (table === 'habit_logs') this.logVersion++; this.changed(); }
        return;
      }
      if (!nw) return;
      var row = clean(table, nw);
      var k = keyOf(table, row);
      if (!k || this.isPending(table, k)) return;
      var tomb = this.tombs.get(k);
      if (tomb && Date.now() - tomb < 20000) return;
      var cur = map.get(k);
      if (cur && U.time(cur.updated_at) > U.time(row.updated_at)) return;
      map.set(k, row);
      if (table === 'habit_logs') this.logVersion++;
      this.changed();
    },

    /* ---------- generic write ---------- */
    put: function (table, row) {
      row.updated_at = U.nowIso();
      this[table].set(keyOf(table, row), row);
      this.tombs.delete(keyOf(table, row));
      this.enqueue(table, 'upsert', row);
      if (table === 'habit_logs') this.logVersion++;
      this.changed();
    },
    nextPos: function (rows, top) {
      if (!rows.length) return 0;
      var ps = rows.map(function (r) { return r.position; });
      return top ? Math.min.apply(null, ps) - 1 : Math.max.apply(null, ps) + 1;
    },
    reorder: function (table, id, orderedIds) {
      var map = this[table];
      var i = orderedIds.indexOf(id);
      var row = map.get(id);
      if (!row || i < 0) return;
      var prev = map.get(orderedIds[i - 1]);
      var next = map.get(orderedIds[i + 1]);
      if (prev && next && Math.abs(next.position - prev.position) < 1e-7) {
        var self = this;
        orderedIds.forEach(function (x, j) {
          var r = map.get(x);
          if (r && r.position !== j) self.put(table, Object.assign({}, r, { position: j }));
        });
        return;
      }
      var pos = prev && next ? (prev.position + next.position) / 2 : prev ? prev.position + 1 : next ? next.position - 1 : 0;
      this.put(table, Object.assign({}, row, { position: pos }));
    },

    /* ---------- lists ---------- */
    listsSorted: function () { return Array.from(this.lists.values()).sort(byPos); },
    addList: function (name, color) {
      var row = { id: U.uuid(), name: name, color: color, position: this.nextPos(Array.from(this.lists.values()), false), created_at: U.nowIso() };
      this.put('lists', row);
      return row;
    },
    updateList: function (id, patch) { var o = this.lists.get(id); if (o) this.put('lists', Object.assign({}, o, patch)); },
    deleteList: function (id) {
      if (!this.lists.has(id)) return;
      var self = this;
      this.lists.delete(id);
      this.tombs.set(id, Date.now());
      Array.from(this.tasks.entries()).forEach(function (e) {
        if (e[1].list_id === id) { self.tasks.delete(e[0]); self.tombs.set(e[0], Date.now()); }
      });
      this.dropQueued(function (o) { return o.table === 'tasks' && o.op === 'upsert' && o.row.list_id === id; });
      this.enqueue('lists', 'delete', id);
      this.changed();
    },

    /* ---------- tasks ---------- */
    tasksIn: function (listId) {
      return Array.from(this.tasks.values()).filter(function (t) { return (t.list_id || null) === listId; });
    },
    addTask: function (o) {
      var listId = o.list_id || null;
      var row = {
        id: U.uuid(), list_id: listId, title: o.title, notes: '', due_date: o.due_date || null, prev_due: null,
        repeat: null, done: false, done_at: null,
        position: this.nextPos(this.tasksIn(listId), true), created_at: U.nowIso()
      };
      this.put('tasks', row);
      return row;
    },
    updateTask: function (id, patch) {
      var o = this.tasks.get(id);
      if (!o) return;
      var n = Object.assign({}, o, patch);
      if ('list_id' in patch && (patch.list_id || null) !== (o.list_id || null)) {
        n.list_id = patch.list_id || null;
        n.position = this.nextPos(this.tasksIn(n.list_id), true);
      }
      this.put('tasks', n);
    },
    completeTask: function (id) {
      var o = this.tasks.get(id);
      if (!o || o.done) return null;
      var today = U.today();
      if (o.repeat) {
        var base = o.due_date || today;
        var next = U.nextOccurrence(o.repeat, base, today);
        this.put('tasks', Object.assign({}, o, { prev_due: base, due_date: next, done_at: U.nowIso() }));
        return { recurring: true, next: next };
      }
      this.put('tasks', Object.assign({}, o, { done: true, done_at: U.nowIso() }));
      return { recurring: false };
    },
    uncompleteTask: function (id) {
      var o = this.tasks.get(id);
      if (!o) return;
      if (o.done) this.put('tasks', Object.assign({}, o, { done: false, done_at: null }));
      else if (o.repeat && o.prev_due) this.put('tasks', Object.assign({}, o, { due_date: o.prev_due, prev_due: null, done_at: null }));
    },
    isDoneToday: function (t) {
      if (U.dayOfIso(t.done_at) !== U.today()) return false;
      return t.done || !!(t.repeat && t.prev_due);
    },
    deleteTask: function (id) {
      var o = this.tasks.get(id);
      if (!o) return function () {};
      var self = this;
      this.tasks.delete(id);
      this.tombs.set(id, Date.now());
      this.enqueue('tasks', 'delete', id);
      this.changed();
      return function () {
        var row = Object.assign({}, o);
        if (row.list_id && !self.lists.has(row.list_id)) row.list_id = null;
        self.put('tasks', row);
      };
    },

    /* ---------- habits ---------- */
    habitsSorted: function () { return Array.from(this.habits.values()).sort(byPos); },
    addHabit: function (name, schedule) {
      var row = { id: U.uuid(), name: name, schedule: schedule, position: this.nextPos(Array.from(this.habits.values()), false), created_at: U.nowIso() };
      this.put('habits', row);
      return row;
    },
    updateHabit: function (id, patch) { var o = this.habits.get(id); if (o) this.put('habits', Object.assign({}, o, patch)); },
    deleteHabit: function (id) {
      if (!this.habits.has(id)) return;
      var self = this;
      this.habits.delete(id);
      this.tombs.set(id, Date.now());
      Array.from(this.habit_logs.entries()).forEach(function (e) { if (e[1].habit_id === id) self.habit_logs.delete(e[0]); });
      this.dropQueued(function (o) { return o.table === 'habit_logs' && o.op === 'upsert' && o.row.habit_id === id; });
      this.enqueue('habits', 'delete', id);
      this.logVersion++;
      this.changed();
    },
    setLog: function (habitId, day, done) { this.put('habit_logs', { habit_id: habitId, day: day, done: !!done }); },
    doneSet: function (habitId) {
      if (this._doneVer !== this.logVersion) {
        var m = new Map();
        this.habit_logs.forEach(function (l) {
          if (!l.done) return;
          if (!m.has(l.habit_id)) m.set(l.habit_id, new Set());
          m.get(l.habit_id).add(l.day);
        });
        this._doneCache = m;
        this._doneVer = this.logVersion;
      }
      return this._doneCache.get(habitId) || EMPTY;
    },
    isHabitDone: function (id, day) { return this.doneSet(id).has(day); },
    habitStart: function (h) {
      var s = U.dayOfIso(h.created_at) || U.today();
      this.doneSet(h.id).forEach(function (d) { if (d < s) s = d; });
      return s;
    },
    streak: function (h) {
      var today = U.today(), start = this.habitStart(h), done = this.doneSet(h.id);
      var n = 0;
      if (U.scheduledOn(h, today) && done.has(today)) n++;
      var d = U.addDays(today, -1), guard = 0;
      while (d >= start && guard++ < 5000) {
        if (U.scheduledOn(h, d)) { if (done.has(d)) n++; else break; }
        d = U.addDays(d, -1);
      }
      return n;
    },
    bestStreak: function (h) {
      var today = U.today(), done = this.doneSet(h.id);
      var d = this.habitStart(h), run = 0, best = 0, guard = 0;
      while (d <= today && guard++ < 5000) {
        if (U.scheduledOn(h, d)) {
          if (done.has(d)) { run++; if (run > best) best = run; }
          else if (d !== today) run = 0;
        }
        d = U.addDays(d, 1);
      }
      return best;
    },

    /* ---------- settings ---------- */
    setSettings: function (patch) {
      this.settings = Object.assign({}, this.settings, patch);
      this.hasSettings = true;
      var at = U.nowIso();
      this.settingsAt = U.time(at);
      if (this.backend) this.enqueue('settings', 'upsert', { data: this.settings, updated_at: at });
      this.emit('settings');
    },

    /* ---------- export / import ---------- */
    exportData: function () {
      return {
        app: 'PocketDo', schema: 1, exported_at: U.nowIso(),
        lists: this.listsSorted(),
        tasks: Array.from(this.tasks.values()),
        habits: this.habitsSorted(),
        habit_logs: Array.from(this.habit_logs.values()).filter(function (l) { return l.done; }),
        settings: this.settings
      };
    },
    validBackup: function (j) {
      return !!(j && j.app === 'PocketDo' && Array.isArray(j.lists) && Array.isArray(j.tasks) && Array.isArray(j.habits));
    },
    importData: async function (j) {
      var now = U.nowIso();
      var lmap = new Map(), hmap = new Map();
      var lists = j.lists.map(function (l) {
        var id = U.uuid(); lmap.set(l.id, id);
        return { id: id, name: String(l.name || '').slice(0, 200), color: /^#[0-9a-fA-F]{6}$/.test(l.color) ? l.color : '#64748B', position: Number(l.position) || 0, created_at: l.created_at || now, updated_at: now };
      });
      var tasks = j.tasks.map(function (t) {
        return {
          id: U.uuid(), list_id: t.list_id ? lmap.get(t.list_id) || null : null,
          title: String(t.title || '').slice(0, 500), notes: String(t.notes || ''),
          due_date: U.validDay(t.due_date), prev_due: U.validDay(t.prev_due), repeat: U.validRepeat(t.repeat),
          done: !!t.done, done_at: t.done_at || null, position: Number(t.position) || 0,
          created_at: t.created_at || now, updated_at: now
        };
      });
      var habits = j.habits.map(function (h) {
        var id = U.uuid(); hmap.set(h.id, id);
        return { id: id, name: String(h.name || '').slice(0, 200), schedule: ['all', 'weekdays', 'weekend'].indexOf(h.schedule) >= 0 ? h.schedule : 'all', position: Number(h.position) || 0, created_at: h.created_at || now, updated_at: now };
      });
      var seen = new Set();
      var logs = (j.habit_logs || []).filter(function (l) {
        if (!l || !hmap.has(l.habit_id) || !U.validDay(l.day) || l.done === false) return false;
        var k = l.habit_id + '|' + l.day;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      }).map(function (l) { return { habit_id: hmap.get(l.habit_id), day: l.day, done: true, updated_at: now }; });
      var settings = j.settings && typeof j.settings === 'object'
        ? { data: Object.assign(PT.defaultSettings(), j.settings), updated_at: now } : null;

      await this.flushNow();
      this.importing = true;
      try {
        await this.backend.replaceAll({ lists: lists, tasks: tasks, habits: habits, habit_logs: logs, settings: settings });
        var d = await this.backend.loadAll();
        this.queue.clear();
        this.importing = false;
        this.hydrate(d, false);
      } finally { this.importing = false; }
    }
  });

  /* ------------------------------------------------------------------ */
  /* Supabase backend                                                    */
  /* ------------------------------------------------------------------ */
  function appUrl() { return location.origin + location.pathname; }
  function chunks(arr, n) { var out = []; for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; }

  function SupabaseBackend(cfg) {
    this.sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'pocketdo-auth' }
    });
    this.uid = null;
    this.channel = null;
  }
  SupabaseBackend.prototype = {
    session: async function () { var r = await this.sb.auth.getSession(); return r.data.session; },
    onAuth: function (cb) { this.sb.auth.onAuthStateChange(function (ev, session) { cb(ev, session); }); },
    signIn: async function (email, password) {
      var r = await this.sb.auth.signInWithPassword({ email: email, password: password });
      if (r.error) throw r.error;
      return r.data.session;
    },
    signUp: async function (email, password) {
      var r = await this.sb.auth.signUp({ email: email, password: password, options: { emailRedirectTo: appUrl() } });
      if (r.error) throw r.error;
      return { session: r.data.session };
    },
    resetPassword: async function (email) {
      var r = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
      if (r.error) throw r.error;
    },
    updatePassword: async function (pw) {
      var r = await this.sb.auth.updateUser({ password: pw });
      if (r.error) throw r.error;
    },
    signOut: async function () { await this.sb.auth.signOut(); },

    fetchAll: async function (table) {
      var out = [], size = 500;
      for (var from = 0; ; from += size) {
        var q = this.sb.from(table).select('*');
        q = table === 'habit_logs' ? q.order('habit_id').order('day') : q.order('id');
        var r = await q.range(from, from + size - 1);
        if (r.error) throw r.error;
        out.push.apply(out, r.data);
        if (r.data.length < size) break;
      }
      return out;
    },
    loadAll: async function () {
      var self = this;
      var res = await Promise.all([
        this.fetchAll('lists'), this.fetchAll('tasks'), this.fetchAll('habits'), this.fetchAll('habit_logs'),
        this.sb.from('settings').select('*').maybeSingle()
      ]);
      if (res[4].error) throw res[4].error;
      void self;
      return { lists: res[0], tasks: res[1], habits: res[2], habit_logs: res[3], settings: res[4].data };
    },
    upsert: async function (table, rows) {
      var uid = this.uid;
      var withUser = rows.map(function (r) { return Object.assign({}, r, { user_id: uid }); });
      var onConflict = table === 'habit_logs' ? 'habit_id,day' : table === 'settings' ? 'user_id' : 'id';
      var r = await this.sb.from(table).upsert(withUser, { onConflict: onConflict });
      if (r.error) throw r.error;
    },
    remove: async function (table, ids) {
      var r = await this.sb.from(table).delete().in('id', ids);
      if (r.error) throw r.error;
    },
    replaceAll: async function (d) {
      var self = this;
      async function wipe(t, col) {
        var r = await self.sb.from(t).delete().not(col, 'is', null);
        if (r.error) throw r.error;
      }
      await wipe('habit_logs', 'habit_id');
      await wipe('tasks', 'id');
      await wipe('habits', 'id');
      await wipe('lists', 'id');
      var order = ['lists', 'tasks', 'habits', 'habit_logs'];
      for (var i = 0; i < order.length; i++) {
        var parts = chunks(d[order[i]] || [], 400);
        for (var j = 0; j < parts.length; j++) await this.upsert(order[i], parts[j]);
      }
      if (d.settings) await this.upsert('settings', [d.settings]);
    },
    subscribe: function (onChange, onStatus) {
      this.unsubscribe();
      var ch = this.sb.channel('pocketdo-' + this.uid);
      ['lists', 'tasks', 'habits', 'habit_logs', 'settings'].forEach(function (table) {
        ch.on('postgres_changes', { event: '*', schema: 'public', table: table }, function (p) {
          onChange(table, p.eventType, p.new && Object.keys(p.new).length ? p.new : null, p.old);
        });
      });
      ch.subscribe(function (status) { if (onStatus) onStatus(status); });
      this.channel = ch;
    },
    unsubscribe: function () {
      if (this.channel) { try { this.sb.removeChannel(this.channel); } catch (e) { /* ignore */ } this.channel = null; }
    }
  };

  /* ------------------------------------------------------------------ */
  /* Local backend (this device only)                                    */
  /* ------------------------------------------------------------------ */
  var LKEY = 'pocketdo-local';
  function LocalBackend() {
    this.uid = 'local';
    var db = null;
    try { db = JSON.parse(localStorage.getItem(LKEY) || 'null'); } catch (e) { db = null; }
    this.db = db && typeof db === 'object' ? db : {};
    var self = this;
    ['lists', 'tasks', 'habits', 'habit_logs'].forEach(function (t) { if (!Array.isArray(self.db[t])) self.db[t] = []; });
    if (!('settings' in this.db)) this.db.settings = null;
  }
  LocalBackend.prototype = {
    sessionSync: function () { return { user: { id: 'local', email: '' } }; },
    save: function () { try { localStorage.setItem(LKEY, JSON.stringify(this.db)); } catch (e) { console.error(e); throw e; } },
    loadAll: async function () { return JSON.parse(JSON.stringify(this.db)); },
    upsert: async function (table, rows) {
      if (table === 'settings') { this.db.settings = rows[0]; this.save(); return; }
      var arr = this.db[table];
      var idx = new Map(arr.map(function (r, i) { return [keyOf(table, r), i]; }));
      rows.forEach(function (r) {
        var k = keyOf(table, r);
        if (idx.has(k)) arr[idx.get(k)] = r; else { idx.set(k, arr.length); arr.push(r); }
      });
      this.save();
    },
    remove: async function (table, ids) {
      var set = new Set(ids);
      this.db[table] = this.db[table].filter(function (r) { return !set.has(r.id); });
      if (table === 'lists') this.db.tasks = this.db.tasks.filter(function (t) { return !set.has(t.list_id); });
      if (table === 'habits') this.db.habit_logs = this.db.habit_logs.filter(function (l) { return !set.has(l.habit_id); });
      this.save();
    },
    replaceAll: async function (d) {
      this.db = { lists: d.lists || [], tasks: d.tasks || [], habits: d.habits || [], habit_logs: d.habit_logs || [], settings: d.settings || null };
      this.save();
    },
    subscribe: function () {},
    unsubscribe: function () {},
    signOut: async function () {}
  };

  PT.SupabaseBackend = SupabaseBackend;
  PT.LocalBackend = LocalBackend;
  PT.keyOf = keyOf;
})();
