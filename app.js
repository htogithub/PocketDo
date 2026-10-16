/* PocketDo - interface. */
(function () {
  'use strict';
  var PT = window.PT, U = PT.util, S = PT.store;
  var t = function (k, v) { return PT.t(k, v); };
  var VERSION = '1.1.1';
  var CFG = window.PT_CONFIG || {};
  var THEMES = window.PT_THEMES, THEME_ORDER = window.PT_THEME_ORDER;
  var ACCENTS = window.PT_ACCENTS, LIST_COLORS = window.PT_LIST_COLORS;

  PT.defaultSettings = function () { return { theme: 'auto', accent: null, lang: PT.deviceLang(), haptics: true }; };

  var UI = {
    started: false, starting: false, mode: null, backend: null,
    route: null, param: null, view: null, viewEl: null, scroller: null,
    hold: 0, deferred: false, frame: 0, sheets: [], menu: null, suppressUntil: 0,
    showDone: {}, todayList: null, authMode: 'signin', day: U.today(), subscribedOnce: false
  };

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(html) { var tp = document.createElement('template'); tp.innerHTML = html.trim(); return tp.content.firstElementChild; }
  function R(name, root) { return (root || UI.viewEl).querySelector('[data-r="' + name + '"]'); }
  function safeColor(c) { return /^#[0-9a-fA-F]{3,8}$/.test(c || '') ? c : '#64748B'; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function locale() { return PT.lang === 'fr' ? 'fr-CH' : 'en-GB'; }
  function errMsg(e) { return (e && (e.message || e.error_description)) || String(e); }
  function readUi() { try { return JSON.parse(localStorage.getItem('pt-ui') || '{}') || {}; } catch (e) { return {}; } }

  var I = {
    today: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    lists: '<path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20"/><circle cx="5" cy="6.5" r="1.3" class="f"/><circle cx="5" cy="12" r="1.3" class="f"/><circle cx="5" cy="17.5" r="1.3" class="f"/>',
    habits: '<path d="M12 3.2c.7 2.7 2.8 4.3 4.1 6.2.9 1.3 1.4 2.7 1.4 4.3a5.5 5.5 0 0 1-11 0c0-1.9.8-3.5 2.1-4.7.2 1.6 1 2.6 2 3-.4-3 .2-6 1.4-8.8z"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.3" class="bg"/><circle cx="15" cy="17" r="2.3" class="bg"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12.5h9.2L17.5 7"/>',
    repeat: '<path d="M17 3.5l3 3-3 3M4 11.5v-2a3 3 0 0 1 3-3h13M7 20.5l-3-3 3-3M20 12.5v2a3 3 0 0 1-3 3H4"/>',
    note: '<path d="M6 3.5h12v17H6zM9 8.5h6M9 12h6M9 15.5h3.5"/>',
    chevL: '<path d="M15 18l-6-6 6-6"/>',
    chevR: '<path d="M9 18l6-6-6-6"/>',
    chevD: '<path d="M6 9.5l6 6 6-6"/>',
    grip: '<circle cx="9" cy="6.5" r="1.4" class="f"/><circle cx="15" cy="6.5" r="1.4" class="f"/><circle cx="9" cy="12" r="1.4" class="f"/><circle cx="15" cy="12" r="1.4" class="f"/><circle cx="9" cy="17.5" r="1.4" class="f"/><circle cx="15" cy="17.5" r="1.4" class="f"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    inbox: '<path d="M3.5 13.5h5l1.5 3h4l1.5-3h5M6 5h12l2.5 8.5v6H3.5v-6z"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 13.5l5-5 5 5M5 4h14"/>',
    logout: '<path d="M14.5 4H19v16h-4.5M10 8l-4 4 4 4M6 12h10"/>',
    more: '<circle cx="5.5" cy="12" r="1.6" class="f"/><circle cx="12" cy="12" r="1.6" class="f"/><circle cx="18.5" cy="12" r="1.6" class="f"/>'
  };
  function icon(name, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + I[name] + '</svg>'; }
  var GRIP = '<span class="grip" aria-hidden="true">' + icon('grip') + '</span>';
  var CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6.5,12.5 10.5,16.5 17.5,8.5"/></svg>';

  function logoSVG(cls) {
    return '<svg class="mark ' + (cls || '') + '" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="mark-ring" cx="50" cy="50" r="30" transform="rotate(-10.5 50 50)"/>' +
      '<polyline class="mark-check" points="35,51 46,62 80,24"/></svg>';
  }
  function ringSVG() {
    return '<svg class="pring" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="pr-track" cx="50" cy="50" r="30"/>' +
      '<circle class="pr-fill" cx="50" cy="50" r="30"/>' +
      '<polyline class="pr-check" points="35,51 46,62 80,24"/></svg>';
  }

  /* Dates */
  function fmtLong(day) {
    return cap(new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(U.parseDay(day)));
  }
  function fmtRel(day) {
    var today = U.today(), d = U.diffDays(today, day);
    if (d === 0) return t('task.today');
    if (d === 1) return t('task.tomorrow');
    if (d === -1) return t('task.yesterday');
    if (d > 1 && d < 7) return cap(new Intl.DateTimeFormat(locale(), { weekday: 'long' }).format(U.parseDay(day)));
    var opts = { day: 'numeric', month: 'short' };
    if (day.slice(0, 4) !== today.slice(0, 4)) opts.year = 'numeric';
    return new Intl.DateTimeFormat(locale(), opts).format(U.parseDay(day));
  }
  function repEvery(rep) {
    var n = rep.every || 1;
    if (rep.freq === 'day') return n === 1 ? t('rep.everyDay') : t('rep.everyNDays', { n: n });
    if (rep.freq === 'month') return n === 1 ? t('rep.everyMonth') : t('rep.everyNMonths', { n: n });
    return n === 1 ? t('rep.everyWeek') : t('rep.everyNWeeks', { n: n });
  }
  function repShort(rep) {
    if (rep.freq === 'week' && rep.days && rep.days.length && (rep.every || 1) === 1) {
      var names = t('days2');
      return rep.days.slice().sort().map(function (d) { return names[d - 1]; }).join(', ');
    }
    return repEvery(rep);
  }
  /* Haptics: vibrate on Android, hidden switch trick on iOS 18+ Safari */
  function haptic() {
    if (!S.settings || S.settings.haptics === false) return;
    try {
      if (navigator.vibrate) { navigator.vibrate(8); return; }
      var label = document.createElement('label');
      label.setAttribute('aria-hidden', 'true');
      label.style.display = 'none';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.head.appendChild(label);
      label.click();
      document.head.removeChild(label);
    } catch (e) { /* no haptics available */ }
  }

  /* Toasts */
  function toast(msg, opts) {
    opts = opts || {};
    var host = $('#toasts');
    var n = el('<div class="toast" role="status"><span>' + esc(msg) + '</span>' + (opts.action ? '<button type="button">' + esc(opts.action) + '</button>' : '') + '</div>');
    host.appendChild(n);
    while (host.children.length > 2) host.removeChild(host.firstChild);
    requestAnimationFrame(function () { n.classList.add('in'); });
    var kill = function () { n.classList.remove('in'); setTimeout(function () { n.remove(); }, 250); };
    var tm = setTimeout(kill, opts.duration || 4500);
    if (opts.action) n.querySelector('button').addEventListener('click', function () { clearTimeout(tm); kill(); opts.onAction(); });
  }

  /* Render scheduling: hold rendering during gestures and check animations */
  function scheduleRender() {
    if (UI.frame) return;
    UI.frame = requestAnimationFrame(function () { UI.frame = 0; renderNow(); });
  }
  function renderNow() {
    if (!UI.started) return;
    if (UI.hold > 0) { UI.deferred = true; return; }
    try {
      if (UI.view && UI.viewEl) UI.view.update(UI.viewEl, UI.param);
      renderSidebar();
      updateNav();
      UI.sheets.forEach(function (s) { if (s.refresh) s.refresh(); });
    } catch (e) { console.error(e); }
  }
  function holdOn() { UI.hold++; }
  function release() {
    UI.hold = Math.max(0, UI.hold - 1);
    if (!UI.hold && UI.deferred) { UI.deferred = false; renderNow(); }
  }

  /* ------------------------------------------------------------------ */
  /* Rows                                                                */
  /* ------------------------------------------------------------------ */
  function listColor(listId) { var l = listId && S.lists.get(listId); return l ? safeColor(l.color) : 'var(--text-3)'; }

  function taskRow(task, ctx, opts) {
    opts = opts || {};
    var today = U.today();
    var done = task.done || ctx === 'todaydone';
    var meta = [];
    if (ctx === 'today' || ctx === 'todaydone') {
      var l = task.list_id && S.lists.get(task.list_id);
      meta.push('<span class="mi"><i class="dot" style="--c:' + (l ? safeColor(l.color) : 'var(--text-3)') + '"></i>' + esc(l ? l.name : t('task.inbox')) + '</span>');
    }
    if (task.due_date && !done && !(ctx === 'today' && task.due_date === today)) {
      meta.push('<span class="mi' + (task.due_date < today ? ' late' : '') + '">' + icon('today') + esc(fmtRel(task.due_date)) + '</span>');
    }
    if (task.repeat) meta.push('<span class="mi">' + icon('repeat') + esc(repShort(task.repeat)) + '</span>');
    if (task.notes && task.notes.trim()) meta.push('<span class="mi">' + icon('note') + '</span>');
    return '<div class="row task' + (done ? ' is-done' : '') + '" data-id="' + task.id + '" data-ctx="' + ctx + '" style="--c:' + listColor(task.list_id) + '">' +
      '<div class="swipe-bg"><span class="sb sb-done">' + icon('check') + '</span><span class="sb sb-del">' + icon('trash') + '</span></div>' +
      '<div class="row-inner" data-act="task-open">' +
        '<button type="button" class="check" data-act="task-check" aria-label="' + esc(done ? t('a11y.uncheck') : t('a11y.check')) + '">' + CHECK_SVG + '</button>' +
        '<div class="row-main"><div class="row-title"><span class="tt">' + esc(task.title) + '</span></div>' +
        (meta.length ? '<div class="row-meta">' + meta.join('') + '</div>' : '') + '</div>' +
        (opts.sortable ? GRIP : '') +
      '</div></div>';
  }

  function habitRow(h, ctx, opts) {
    opts = opts || {};
    var today = U.today();
    var sched = U.scheduledOn(h, today);
    var done = S.isHabitDone(h.id, today);
    var st = S.streak(h);
    var extra = '';
    if (ctx === 'habits') {
      var dots = '';
      for (var i = 6; i >= 0; i--) {
        var d = U.addDays(today, -i);
        var cls = !U.scheduledOn(h, d) ? 'off' : S.isHabitDone(h.id, d) ? 'done' : i === 0 ? 'open' : 'miss';
        dots += '<i class="wdot ' + cls + '"></i>';
      }
      extra = '<div class="row-meta"><span class="mi">' + esc(t('sch.' + h.schedule)) + '</span><span class="wdots" aria-hidden="true">' + dots + '</span></div>';
    }
    return '<div class="row habit' + (done ? ' is-done' : '') + '" data-id="' + h.id + '">' +
      '<div class="row-inner" data-act="habit-open">' +
        (sched
          ? '<button type="button" class="check" data-act="habit-check" aria-label="' + esc(done ? t('a11y.uncheck') : t('a11y.check')) + '">' + CHECK_SVG + '</button>'
          : '<span class="check off" aria-hidden="true"></span>') +
        '<div class="row-main"><div class="row-title"><span class="tt">' + esc(h.name) + '</span></div>' + extra + '</div>' +
        '<span class="streak' + (st > 0 ? ' on' : '') + '" title="' + esc(t('habits.streak')) + '">' + icon('habits') + '<b>' + st + '</b></span>' +
        (opts.sortable ? GRIP : '') +
      '</div></div>';
  }

  function listRow(l, counts, sortable) {
    var id = l ? l.id : 'inbox';
    var n = counts.get(l ? l.id : null) || 0;
    return '<div class="row lrow" data-id="' + id + '">' +
      '<div class="row-inner" data-act="open-list" data-to="' + id + '">' +
        (l ? '<i class="ldot" style="--c:' + safeColor(l.color) + '"></i>' : '<span class="ldot inbox">' + icon('inbox') + '</span>') +
        '<div class="row-main"><div class="row-title">' + esc(l ? l.name : t('task.inbox')) + '</div></div>' +
        '<span class="lcount">' + (n || '') + '</span>' + (sortable ? GRIP : '') + icon('chevR', 'chev') +
      '</div></div>';
  }

  function doneSection(key, label, rows) {
    var open = !!UI.showDone[key];
    return '<button type="button" class="done-toggle' + (open ? ' open' : '') + '" data-act="toggle-done" data-key="' + esc(key) + '" aria-expanded="' + open + '">' +
      icon('chevR') + '<span>' + esc(label) + '</span></button>' + (open ? '<div class="rows done-rows">' + rows + '</div>' : '');
  }

  function openCounts() {
    var m = new Map();
    S.tasks.forEach(function (x) { if (!x.done) { var k = x.list_id || null; m.set(k, (m.get(k) || 0) + 1); } });
    return m;
  }
  function todayCount() {
    var today = U.today(), n = 0;
    S.tasks.forEach(function (x) { if (!x.done && x.due_date && x.due_date <= today) n++; });
    return n;
  }

  function addBar(withList) {
    return '<form class="addbar" data-r="add" autocomplete="off">' +
      '<span class="add-ico">' + icon('plus') + '</span>' +
      '<input name="title" type="text" placeholder="' + esc(t('task.add')) + '" enterkeyhint="done" maxlength="500" aria-label="' + esc(t('task.add')) + '">' +
      (withList ? '<button type="button" class="list-chip" data-act="pick-add-list" data-r="addlist"></button>' : '') +
      '</form>';
  }
  function bindAddBar(v, ctx) {
    var f = R('add', v), inp = f.querySelector('input');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = inp.value.replace(/\s+/g, ' ').trim();
      if (!title) return;
      var c = ctx();
      S.addTask({ title: title, list_id: c.list_id, due_date: c.due_date });
      inp.value = '';
      haptic();
    });
  }

  function setRing(wrap, total, done) {
    var fill = wrap.querySelector('.pr-fill');
    var count = wrap.querySelector('.pr-count');
    var complete = total > 0 && done >= total;
    wrap.classList.toggle('complete', complete);
    wrap.classList.toggle('zero', done === 0);
    // real lengths, because Safari ignores pathLength: circumference 188.5, logo arc 159.17
    fill.style.strokeDashoffset = complete ? 29.33 : 188.5 * (1 - (total ? done / total : 0));
    count.textContent = total && !complete ? done + '/' + total : '';
    wrap.setAttribute('aria-label', t('today.progress', { done: done, total: total }));
  }

  /* ------------------------------------------------------------------ */
  /* Views                                                               */
  /* ------------------------------------------------------------------ */
  var Views = {};

  Views.today = {
    mount: function (v) {
      v.innerHTML =
        '<header class="vhead"><div class="vhead-text"><h1>' + esc(t('today.title')) + '</h1><p class="vsub" data-r="date"></p></div>' +
        '<div class="pring-wrap" data-r="ring" role="img">' + ringSVG() + '<span class="pr-count"></span></div></header>' +
        '<section class="sec"><div class="sec-head"><h2>' + esc(t('today.habits')) + '</h2><span class="sec-meta" data-r="hmeta"></span></div><div class="rows" data-r="habits"></div></section>' +
        '<section class="sec"><div class="sec-head"><h2>' + esc(t('today.tasks')) + '</h2></div>' + addBar(true) +
        '<div data-r="tasks"></div><div data-r="done"></div></section>';
      bindAddBar(v, function () {
        return { list_id: UI.todayList && S.lists.has(UI.todayList) ? UI.todayList : null, due_date: U.today() };
      });
      attachSwipe(v);
      this.update(v);
    },
    update: function (v) {
      var today = U.today();
      R('date', v).textContent = fmtLong(today);

      var hs = S.habitsSorted().filter(function (h) { return U.scheduledOn(h, today); });
      var hDone = hs.filter(function (h) { return S.isHabitDone(h.id, today); }).length;
      R('hmeta', v).textContent = hs.length ? hDone + '/' + hs.length : '';
      R('habits', v).innerHTML = hs.length
        ? hs.map(function (h) { return habitRow(h, 'today'); }).join('')
        : '<p class="empty">' + esc(t('today.noHabits')) + ' <button type="button" class="link" data-act="go" data-to="habits">' + esc(t('today.addHabits')) + '</button></p>';

      var tl = UI.todayList && S.lists.get(UI.todayList);
      if (!tl) UI.todayList = null;
      R('addlist', v).innerHTML = '<i class="dot" style="--c:' + (tl ? safeColor(tl.color) : 'var(--text-3)') + '"></i><span>' + esc(tl ? tl.name : t('task.inbox')) + '</span>';

      var order = new Map(S.listsSorted().map(function (l, i) { return [l.id, i + 1]; }));
      var ord = function (a, b) { return (order.get(a.list_id) || 0) - (order.get(b.list_id) || 0) || a.position - b.position; };
      var active = Array.from(S.tasks.values()).filter(function (x) { return !x.done && x.due_date && x.due_date <= today; });
      var overdue = active.filter(function (x) { return x.due_date < today; }).sort(function (a, b) { return a.due_date.localeCompare(b.due_date) || ord(a, b); });
      var dueToday = active.filter(function (x) { return x.due_date === today; }).sort(ord);
      var doneToday = Array.from(S.tasks.values()).filter(function (x) { return S.isDoneToday(x); })
        .sort(function (a, b) { return U.time(b.done_at) - U.time(a.done_at); });

      var html = '';
      if (overdue.length) {
        html += '<div class="sub-head late">' + esc(t('today.overdue')) + '</div><div class="rows">' + overdue.map(function (x) { return taskRow(x, 'today'); }).join('') + '</div>';
      }
      if (dueToday.length) {
        html += (overdue.length ? '<div class="sub-head">' + esc(t('task.today')) + '</div>' : '') +
          '<div class="rows">' + dueToday.map(function (x) { return taskRow(x, 'today'); }).join('') + '</div>';
      }
      if (!overdue.length && !dueToday.length) {
        html = '<p class="empty">' + esc(doneToday.length ? t('today.allDone') : t('today.empty')) + '</p>';
      }
      R('tasks', v).innerHTML = html;
      R('done', v).innerHTML = doneToday.length
        ? doneSection('today', t('today.doneToday', { n: doneToday.length }), doneToday.map(function (x) { return taskRow(x, 'todaydone'); }).join(''))
        : '';

      setRing(R('ring', v), hs.length + active.length + doneToday.length, hDone + doneToday.length);
    }
  };

  Views.lists = {
    mount: function (v) {
      v.innerHTML =
        '<header class="vhead"><div class="vhead-text"><h1>' + esc(t('lists.title')) + '</h1></div>' +
        '<button type="button" class="icon-btn round" data-act="new-list" aria-label="' + esc(t('lists.new')) + '">' + icon('plus') + '</button></header>' +
        '<div class="rows" data-r="inbox"></div><div class="rows lists-rows" data-r="rows"></div><p class="empty" data-r="empty"></p>';
      attachSortable(R('rows', v), { itemSel: '.lrow', onDrop: function (id, ids) { S.reorder('lists', id, ids); } });
      this.update(v);
    },
    update: function (v) {
      var counts = openCounts();
      var ls = S.listsSorted();
      R('inbox', v).innerHTML = listRow(null, counts, false);
      R('rows', v).innerHTML = ls.map(function (l) { return listRow(l, counts, true); }).join('');
      R('empty', v).textContent = ls.length ? '' : t('lists.empty');
      R('empty', v).hidden = !!ls.length;
    }
  };

  Views.list = {
    mount: function (v, param) {
      var listId = param && param !== 'inbox' ? param : null;
      this.listId = listId;
      if (listId && !S.lists.has(listId)) { go('lists'); return; }
      v.innerHTML =
        '<header class="vhead lhead">' +
          '<button type="button" class="icon-btn back" data-act="go" data-to="lists" aria-label="' + esc(t('common.back')) + '">' + icon('chevL') + '</button>' +
          '<div class="vhead-text"><h1 data-r="title"></h1></div>' +
          (listId ? '<button type="button" class="icon-btn" data-act="edit-list" data-id="' + listId + '" aria-label="' + esc(t('lists.edit')) + '">' + icon('more') + '</button>' : '') +
        '</header>' + addBar(false) +
        '<div class="rows" data-r="active"></div><p class="empty" data-r="empty"></p><div data-r="done"></div>';
      var self = this;
      bindAddBar(v, function () { return { list_id: self.listId, due_date: null }; });
      attachSwipe(v);
      attachSortable(R('active', v), { itemSel: '.task', onDrop: function (id, ids) { S.reorder('tasks', id, ids); } });
      this.update(v);
    },
    update: function (v) {
      var listId = this.listId;
      if (listId && !S.lists.has(listId)) { go('lists'); return; }
      var l = listId && S.lists.get(listId);
      R('title', v).innerHTML = (l ? '<i class="ldot" style="--c:' + safeColor(l.color) + '"></i>' : '') + '<span>' + esc(l ? l.name : t('task.inbox')) + '</span>';
      var all = S.tasksIn(listId);
      var active = all.filter(function (x) { return !x.done; }).sort(function (a, b) { return a.position - b.position; });
      var done = all.filter(function (x) { return x.done; }).sort(function (a, b) { return U.time(b.done_at) - U.time(a.done_at); });
      R('active', v).innerHTML = active.map(function (x) { return taskRow(x, 'list', { sortable: true }); }).join('');
      R('empty', v).textContent = active.length ? '' : t('task.emptyList');
      R('empty', v).hidden = !!active.length;
      R('done', v).innerHTML = done.length
        ? doneSection('list:' + (listId || 'inbox'), t('task.completed', { n: done.length }), done.map(function (x) { return taskRow(x, 'done'); }).join(''))
        : '';
    }
  };

  Views.habits = {
    mount: function (v) {
      v.innerHTML =
        '<header class="vhead"><div class="vhead-text"><h1>' + esc(t('habits.title')) + '</h1></div>' +
        '<button type="button" class="icon-btn round" data-act="new-habit" aria-label="' + esc(t('habits.new')) + '">' + icon('plus') + '</button></header>' +
        '<section class="heat-card" data-r="heatcard"><div class="heat-head" data-r="heathead"></div><div class="heat" data-r="heat"></div></section>' +
        '<div class="rows" data-r="rows"></div><p class="empty" data-r="empty"></p>';
      attachSortable(R('rows', v), { itemSel: '.habit', onDrop: function (id, ids) { S.reorder('habits', id, ids); } });
      this.update(v);
    },
    update: function (v) {
      var hs = S.habitsSorted();
      R('heatcard', v).hidden = !hs.length;
      if (hs.length) renderHeat(R('heat', v), R('heathead', v), hs);
      R('rows', v).innerHTML = hs.map(function (h) { return habitRow(h, 'habits', { sortable: true }); }).join('');
      R('empty', v).textContent = hs.length ? '' : t('habits.empty');
      R('empty', v).hidden = !!hs.length;
    }
  };

  function renderHeat(box, head, hs) {
    var cell = 13, gap = 4;
    var w = box.clientWidth || (UI.viewEl ? UI.viewEl.clientWidth - 32 : 320);
    var weeks = Math.max(8, Math.min(26, Math.floor((w + gap) / (cell + gap))));
    head.textContent = t('habits.regularity', { n: weeks });
    var today = U.today();
    var start = U.addDays(U.mondayOf(today), -7 * (weeks - 1));
    var starts = new Map(hs.map(function (h) { return [h.id, S.habitStart(h)]; }));
    var html = '';
    for (var i = 0; i < weeks * 7; i++) {
      var d = U.addDays(start, i);
      if (d > today) { html += '<i class="hc future"></i>'; continue; }
      var tot = 0, dn = 0;
      for (var j = 0; j < hs.length; j++) {
        var h = hs[j];
        if (d < starts.get(h.id) || !U.scheduledOn(h, d)) continue;
        tot++;
        if (S.isHabitDone(h.id, d)) dn++;
      }
      var lv = !tot ? 'n' : dn === 0 ? '0' : String(Math.ceil((dn / tot) * 4));
      html += '<i class="hc l' + lv + (d === today ? ' now' : '') + '" title="' + d + (tot ? ' \u2013 ' + dn + '/' + tot : '') + '"></i>';
    }
    box.style.setProperty('--cell', cell + 'px');
    box.style.setProperty('--gap', gap + 'px');
    box.innerHTML = html;
  }

  Views.settings = {
    mount: function (v) {
      var local = UI.mode === 'local';
      v.innerHTML =
        '<header class="vhead"><div class="vhead-text"><h1>' + esc(t('set.title')) + '</h1></div></header>' +
        '<h2 class="group-title">' + esc(t('set.account')) + '</h2>' +
        '<div class="group">' +
          '<div class="srow"><span class="sl">' + esc(local ? t('set.local') : S.email) + '</span></div>' +
          (local ? '' : '<div class="srow"><span class="sl">' + esc(t('set.sync')) + '</span><span class="sv"><i class="sync-dot"></i><span data-r="sync"></span></span></div>') +
          '<button type="button" class="srow act danger" data-act="sign-out">' + icon('logout') + '<span>' + esc(local ? t('set.leaveLocal') : t('set.signOut')) + '</span></button>' +
        '</div>' +
        '<h2 class="group-title">' + esc(t('set.appearance')) + '</h2>' +
        '<div class="group gpad">' +
          '<div class="glabel">' + esc(t('set.theme')) + '</div><div class="themes" data-r="themes"></div>' +
          '<div class="glabel">' + esc(t('set.accent')) + '</div><div class="accents" data-r="accents"></div>' +
          '<p class="acc-cap" data-r="acccap"></p>' +
        '</div>' +
        '<h2 class="group-title">' + esc(t('set.language')) + '</h2>' +
        '<div class="group gpad"><div class="seg wide" data-r="lang">' +
          '<button type="button" data-act="lang" data-v="fr">Fran\u00E7ais</button><button type="button" data-act="lang" data-v="en">English</button>' +
        '</div></div>' +
        '<h2 class="group-title">' + esc(t('set.behaviour')) + '</h2>' +
        '<div class="group"><label class="srow"><span class="sl">' + esc(t('set.haptics')) + '<small>' + esc(t('set.hapticsNote')) + '</small></span>' +
          '<input type="checkbox" class="switch" data-r="haptics"></label></div>' +
        '<h2 class="group-title">' + esc(t('set.data')) + '</h2>' +
        '<div class="group">' +
          '<button type="button" class="srow act" data-act="export-json">' + icon('download') + '<span>' + esc(t('set.exportJson')) + '</span></button>' +
          '<button type="button" class="srow act" data-act="import">' + icon('upload') + '<span>' + esc(t('set.import')) + '</span></button>' +
          '<input type="file" accept=".json,application/json" hidden data-r="file">' +
        '</div>' +
        '<h2 class="group-title">' + esc(t('set.about')) + '</h2>' +
        '<div class="group"><div class="srow"><span class="sl brand-row">' + logoSVG() + 'PocketDo</span><span class="sv">' + esc(t('set.version', { v: VERSION })) + '</span></div></div>';

      R('haptics', v).addEventListener('change', function (e) { S.setSettings({ haptics: e.target.checked }); if (e.target.checked) haptic(); });
      R('file', v).addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (f) importFile(f);
      });
      this.update(v);
    },
    update: function (v) {
      var s = S.settings;
      var resolved = window.PT_resolveTheme(s.theme || 'auto');
      R('themes', v).innerHTML = THEME_ORDER.map(function (k) {
        var sel = (s.theme || 'auto') === k;
        var inner, style;
        if (k === 'auto') {
          var a = THEMES.light, b = THEMES.dark;
          style = '--tb:' + a.bg;
          inner = '<i class="tp-half" style="--tb:' + a.bg + ';--ts:' + a.surface2 + ';--ta:' + a.accent + '"><i class="tp-dot"></i><i class="tp-bar"></i></i>' +
            '<i class="tp-half right" style="--tb:' + b.bg + ';--ts:' + b.surface2 + ';--ta:' + b.accent + '"><i class="tp-dot"></i><i class="tp-bar"></i></i>';
        } else {
          var th = THEMES[k];
          style = '--tb:' + th.bg + ';--ts:' + th.surface2 + ';--ta:' + th.accent;
          inner = '<i class="tp-dot"></i><i class="tp-bar"></i><i class="tp-bar short"></i>';
        }
        // The preview itself is the button, with an explicit size: iOS Safari collapses
        // empty blocks laid out inside a flex button to zero width.
        return '<div class="theme-tile' + (sel ? ' sel' : '') + '" data-act="theme" data-v="' + k + '">' +
          '<button type="button" class="tp' + (k === 'auto' ? ' split' : '') + '" style="' + style + '" aria-pressed="' + sel + '" aria-label="' + esc(t('theme.' + k)) + '">' + inner + '</button>' +
          '<span class="tn" aria-hidden="true">' + esc(t('theme.' + k)) + '</span></div>';
      }).join('');

      var themeAccent = THEMES[resolved].accent;
      var acc = s.accent;
      var isPreset = acc && ACCENTS.indexOf(acc) >= 0;
      R('accents', v).innerHTML =
        '<button type="button" class="sw' + (!acc ? ' sel' : '') + '" style="--sw:' + themeAccent + '" data-act="accent" data-v="" aria-label="' + esc(t('set.accentAuto')) + '"><span class="sw-auto">A</span></button>' +
        ACCENTS.map(function (c) {
          return '<button type="button" class="sw' + (acc === c ? ' sel' : '') + '" style="--sw:' + c + '" data-act="accent" data-v="' + c + '" aria-label="' + c + '"></button>';
        }).join('') +
        '<label class="sw custom' + (acc && !isPreset ? ' sel' : '') + '" aria-label="' + esc(t('set.custom')) + '" title="' + esc(t('set.custom')) + '">' +
          '<input type="color" value="' + (acc || themeAccent) + '" data-r="custom"></label>';
      var custom = R('custom', v);
      custom.addEventListener('input', function (e) { window.PT_applyTheme(s.theme || 'auto', e.target.value); });
      custom.addEventListener('change', function (e) { S.setSettings({ accent: e.target.value.toUpperCase() }); });
      R('acccap', v).textContent = acc ? (isPreset ? '' : t('set.custom') + ' ') + acc.toUpperCase() : t('set.accentAuto');

      Array.prototype.forEach.call(R('lang', v).children, function (b) { b.classList.toggle('on', b.dataset.v === PT.lang); });
      R('haptics', v).checked = s.haptics !== false;
      var sy = R('sync', v);
      if (sy) { sy.textContent = t('sync.' + S.sync); sy.parentElement.dataset.state = S.sync; }
    }
  };

  /* ------------------------------------------------------------------ */
  /* Shell, navigation, routing                                          */
  /* ------------------------------------------------------------------ */
  function buildShell() {
    var app = $('#app');
    app.innerHTML =
      '<div class="shell">' +
        '<aside class="sidebar">' +
          '<div class="brand">' + logoSVG() + '<span>PocketDo</span><i class="sync-dot" data-state="idle"></i></div>' +
          '<nav class="side-nav">' +
            '<a href="#/today" data-nav="today">' + icon('today') + '<span>' + esc(t('nav.today')) + '</span><em class="cnt" data-count="today"></em></a>' +
            '<a href="#/habits" data-nav="habits">' + icon('habits') + '<span>' + esc(t('nav.habits')) + '</span></a>' +
          '</nav>' +
          '<div class="side-head"><a href="#/lists" data-nav="lists">' + esc(t('nav.lists')) + '</a>' +
            '<button type="button" class="icon-btn sm" data-act="new-list" aria-label="' + esc(t('lists.new')) + '">' + icon('plus') + '</button></div>' +
          '<div class="side-lists"></div>' +
          '<nav class="side-foot"><a href="#/settings" data-nav="settings">' + icon('settings') + '<span>' + esc(t('nav.settings')) + '</span></a></nav>' +
        '</aside>' +
        '<main class="main"><div class="banner" data-r="banner" hidden></div><div class="view-host"></div></main>' +
        '<nav class="tabbar">' + ['today', 'lists', 'habits', 'settings'].map(function (r) {
          return '<a href="#/' + r + '" data-nav="' + r + '">' + icon(r) + '<span>' + esc(t('nav.' + r)) + '</span></a>';
        }).join('') + '</nav>' +
      '</div>';
    updateBanner();
  }

  function renderSidebar() {
    var box = $('.side-lists');
    if (!box) return;
    var counts = openCounts();
    var cur = UI.route === 'list' ? (UI.param || 'inbox') : null;
    box.innerHTML = [null].concat(S.listsSorted()).map(function (l) {
      var id = l ? l.id : 'inbox';
      var n = counts.get(l ? l.id : null) || 0;
      return '<button type="button" class="sl' + (cur === id ? ' active' : '') + '" data-act="open-list" data-to="' + id + '">' +
        (l ? '<i class="ldot" style="--c:' + safeColor(l.color) + '"></i>' : '<span class="ldot inbox">' + icon('inbox') + '</span>') +
        '<span class="sl-name">' + esc(l ? l.name : t('task.inbox')) + '</span><em class="cnt">' + (n || '') + '</em></button>';
    }).join('');
    var tc = $('[data-count="today"]');
    if (tc) { var c = todayCount(); tc.textContent = c || ''; }
  }

  function updateNav() {
    var navKey = UI.route === 'list' ? 'lists' : UI.route;
    Array.prototype.forEach.call(document.querySelectorAll('.tabbar [data-nav]'), function (a) { a.classList.toggle('active', a.dataset.nav === navKey); });
    Array.prototype.forEach.call(document.querySelectorAll('.sidebar [data-nav]'), function (a) { a.classList.toggle('active', a.dataset.nav === UI.route); });
    var dot = $('.brand .sync-dot');
    if (dot) { dot.dataset.state = S.sync; dot.title = t('sync.' + S.sync); }
  }

  function updateBanner() {
    var b = $('[data-r="banner"]');
    if (!b) return;
    var off = !navigator.onLine || S.sync === 'offline';
    b.hidden = !(off && UI.mode === 'cloud');
    b.textContent = t('offline');
  }

  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    if (!h || /access_token|error=|type=/.test(h)) return { route: 'today', param: null };
    var parts = h.split('/');
    var r = parts[0];
    if (['today', 'lists', 'list', 'habits', 'settings'].indexOf(r) < 0) return { route: 'today', param: null };
    return { route: r, param: parts[1] ? decodeURIComponent(parts[1]) : null };
  }
  function go(path) {
    if (location.hash !== '#/' + path) location.hash = '#/' + path;
    else onRoute(true);
  }
  function onRoute(force) {
    if (!UI.started) return;
    var p = parseHash();
    if (!force && UI.route === p.route && UI.param === p.param && UI.viewEl && UI.viewEl.isConnected) { renderNow(); return; }
    UI.route = p.route; UI.param = p.param;
    closeMenu();
    mountView();
  }
  function mountView() {
    var host = $('.view-host');
    if (!host) return;
    host.innerHTML = '';
    var scroller = el('<div class="view"><div class="vin"></div></div>');
    host.appendChild(scroller);
    UI.scroller = scroller;
    UI.viewEl = scroller.firstChild;
    UI.view = Views[UI.route];
    UI.hold = 0; UI.deferred = false;
    UI.view.mount(UI.viewEl, UI.param);
    renderSidebar();
    updateNav();
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */
  function collapse(row) {
    row.style.height = row.offsetHeight + 'px';
    void row.offsetHeight;
    row.classList.add('leaving');
  }

  function onTaskCheck(id, row) {
    var o = S.tasks.get(id);
    if (!o || !row) return;
    var ctx = row.dataset.ctx;
    haptic();
    if (ctx === 'done' || ctx === 'todaydone') {
      row.classList.remove('is-done');
      holdOn();
      setTimeout(function () { S.uncompleteTask(id); release(); }, 220);
      return;
    }
    var leaves = !(o.repeat && ctx === 'list');
    row.classList.add('is-done', 'checking');
    holdOn();
    setTimeout(function () {
      if (leaves) collapse(row);
      setTimeout(function () {
        var res = S.completeTask(id);
        release();
        if (res && res.recurring) {
          toast(t('task.nextOn', { date: fmtRel(res.next) }), { action: t('common.undo'), onAction: function () { S.uncompleteTask(id); } });
        }
      }, leaves ? 200 : 60);
    }, 360);
  }

  function deleteTaskWithUndo(id) {
    var undo = S.deleteTask(id);
    toast(t('task.deleted'), { action: t('common.undo'), onAction: undo });
  }

  function toggleHabitToday(id, btn) {
    var today = U.today();
    var done = S.isHabitDone(id, today);
    haptic();
    var row = btn.closest('.row');
    if (row) row.classList.toggle('is-done', !done);
    holdOn();
    setTimeout(function () { S.setLog(id, today, !done); release(); }, 240);
  }

  function listItems(current) {
    return [{ value: null, label: t('task.inbox'), color: 'var(--text-3)', selected: !current }].concat(
      S.listsSorted().map(function (l) { return { value: l.id, label: l.name, color: safeColor(l.color), selected: current === l.id }; }));
  }

  document.addEventListener('click', function (e) {
    if (Date.now() < UI.suppressUntil && e.target.closest('.row, .sl')) { e.preventDefault(); e.stopPropagation(); return; }
    var nav = e.target.closest('[data-nav]');
    if (nav && UI.scroller && (nav.dataset.nav === UI.route) && nav.closest('.tabbar, .side-nav, .side-foot')) {
      e.preventDefault();
      UI.scroller.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    var a = e.target.closest('[data-act]');
    if (!a) return;
    var act = a.dataset.act;
    var row = a.closest('[data-id]');
    var id = row && row.dataset.id;
    switch (act) {
      case 'task-check': e.stopPropagation(); onTaskCheck(id, a.closest('.task')); break;
      case 'task-open': openTaskSheet(id); break;
      case 'habit-check': e.stopPropagation(); toggleHabitToday(id, a); break;
      case 'habit-open': openHabitSheet(id); break;
      case 'open-list': go('list/' + a.dataset.to); break;
      case 'go': go(a.dataset.to); break;
      case 'new-list': openListSheet(null); break;
      case 'edit-list': openListSheet(a.dataset.id); break;
      case 'new-habit': openHabitSheet(null); break;
      case 'toggle-done': UI.showDone[a.dataset.key] = !UI.showDone[a.dataset.key]; renderNow(); break;
      case 'pick-add-list': openMenu(a, listItems(UI.todayList), function (v) { UI.todayList = v; renderNow(); }); break;
      case 'theme': S.setSettings({ theme: a.dataset.v }); haptic(); break;
      case 'accent': S.setSettings({ accent: a.dataset.v || null }); haptic(); break;
      case 'lang': if (a.dataset.v !== PT.lang) S.setSettings({ lang: a.dataset.v }); break;
      case 'sign-out': signOut(); break;
      case 'export-json': exportJson(); break;
      case 'import': R('file').click(); break;
      case 'auth-lang': authLang(a.dataset.v); break;
      case 'auth-switch': authSwitch(); break;
      case 'auth-forgot': authForgot(); break;
      case 'local-mode': startLocal(); break;
      case 'reload': location.reload(); break;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (UI.menu) { closeMenu(); return; }
      var top = UI.sheets[UI.sheets.length - 1];
      if (top) top.close();
      return;
    }
    if (!UI.started || UI.sheets.length || e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (e.key === 'n' || e.key === 'N') {
      var inp = UI.viewEl && UI.viewEl.querySelector('.addbar input');
      if (inp) { e.preventDefault(); inp.focus(); }
    }
  });

  /* ------------------------------------------------------------------ */
  /* Gestures: swipe to complete / delete                                */
  /* ------------------------------------------------------------------ */
  function attachSwipe(container) {
    container.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var row = e.target.closest('.task');
      if (!row || !container.contains(row) || row.classList.contains('leaving')) return;
      if (e.target.closest('.grip, .check, input, textarea, button.link')) return;
      var inner = row.querySelector('.row-inner');
      var sx = e.clientX, sy = e.clientY, mode = null, dx = 0, pid = e.pointerId;
      var W = row.offsetWidth, TH = Math.min(110, W * 0.3);

      function move(ev) {
        if (ev.pointerId !== pid) return;
        var mx = ev.clientX - sx, my = ev.clientY - sy;
        if (!mode) {
          if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my) * 1.3) {
            mode = 'swipe'; holdOn(); row.classList.add('swiping');
            try { row.setPointerCapture(pid); } catch (err) { /* ignore */ }
          } else if (Math.abs(my) > 8) { mode = 'scroll'; end(); return; }
          else return;
        }
        ev.preventDefault();
        dx = mx;
        var over = Math.abs(dx) - TH;
        var eff = over > 0 ? Math.sign(dx) * (TH + over * 0.55) : dx;
        inner.style.transform = 'translateX(' + eff + 'px)';
        row.classList.toggle('sw-right', dx > 0);
        row.classList.toggle('sw-left', dx < 0);
        var armed = Math.abs(dx) > TH;
        if (armed !== row.classList.contains('armed')) { row.classList.toggle('armed', armed); if (armed) haptic(); }
      }
      function end() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      }
      function up(ev) {
        if (ev.pointerId !== pid) return;
        end();
        if (mode !== 'swipe') return;
        UI.suppressUntil = Date.now() + 350;
        var armed = Math.abs(dx) > TH;
        inner.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)';
        if (armed && dx < 0) {
          inner.style.transform = 'translateX(' + (-W) + 'px)';
          setTimeout(function () {
            collapse(row);
            setTimeout(function () { release(); deleteTaskWithUndo(row.dataset.id); }, 200);
          }, 180);
          return;
        }
        inner.style.transform = '';
        setTimeout(function () {
          inner.style.transition = '';
          row.classList.remove('swiping', 'sw-left', 'sw-right', 'armed');
          release();
          if (armed && dx > 0) onTaskCheck(row.dataset.id, row);
        }, 220);
      }
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Gestures: drag to reorder (grip handle)                             */
  /* ------------------------------------------------------------------ */
  function attachSortable(container, opt) {
    container.addEventListener('pointerdown', function (e) {
      var handle = e.target.closest('.grip');
      if (!handle || !container.contains(handle)) return;
      var item = handle.closest(opt.itemSel);
      if (!item || item.parentElement !== container) return;
      e.preventDefault();
      e.stopPropagation();
      startDrag(e, container, item, opt);
    });
  }

  function startDrag(e, container, item, opt) {
    var scroller = container.closest('.view') || container.closest('.sheet-body');
    var items = Array.prototype.filter.call(container.children, function (x) { return x.matches(opt.itemSel); });
    var startIdx = items.indexOf(item);
    if (startIdx < 0 || items.length < 2) return;
    var rects = items.map(function (x) { return x.getBoundingClientRect(); });
    var h = rects[startIdx].height;
    var startY = e.clientY, startScroll = scroller ? scroller.scrollTop : 0;
    var lastY = e.clientY, curIdx = startIdx, raf = 0, pid = e.pointerId, alive = true;

    holdOn();
    haptic();
    item.classList.add('dragging');
    container.classList.add('sorting');
    document.body.classList.add('is-dragging');

    function layout() {
      var dy = lastY - startY + ((scroller ? scroller.scrollTop : 0) - startScroll);
      item.style.transform = 'translateY(' + dy + 'px)';
      var center = rects[startIdx].top + rects[startIdx].height / 2 + dy;
      var idx = startIdx, i;
      for (i = 0; i < startIdx; i++) { if (center < rects[i].top + rects[i].height / 2) { idx = i; break; } }
      for (i = items.length - 1; i > startIdx; i--) { if (center > rects[i].top + rects[i].height / 2) { idx = i; break; } }
      if (idx !== curIdx) { curIdx = idx; haptic(); }
      items.forEach(function (x, j) {
        if (x === item) return;
        var s = 0;
        if (startIdx < curIdx && j > startIdx && j <= curIdx) s = -h;
        if (startIdx > curIdx && j >= curIdx && j < startIdx) s = h;
        x.style.transform = s ? 'translateY(' + s + 'px)' : '';
      });
    }
    function tick() {
      if (!alive) return;
      if (scroller) {
        var r = scroller.getBoundingClientRect();
        var edge = 64, sp = 0;
        if (lastY < r.top + edge) sp = -Math.ceil((r.top + edge - lastY) / 6);
        else if (lastY > r.bottom - edge) sp = Math.ceil((lastY - (r.bottom - edge)) / 6);
        if (sp) { scroller.scrollTop += sp; layout(); }
      }
      raf = requestAnimationFrame(tick);
    }
    function move(ev) { if (ev.pointerId !== pid) return; ev.preventDefault(); lastY = ev.clientY; layout(); }
    function up(ev) {
      if (ev.pointerId !== pid) return;
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      items.forEach(function (x) { x.style.transform = ''; });
      item.classList.remove('dragging');
      container.classList.remove('sorting');
      document.body.classList.remove('is-dragging');
      UI.suppressUntil = Date.now() + 300;
      if (curIdx !== startIdx) {
        var ids = items.map(function (x) { return x.dataset.id; });
        ids.splice(startIdx, 1);
        ids.splice(curIdx, 0, item.dataset.id);
        opt.onDrop(item.dataset.id, ids);
      }
      release();
    }
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    raf = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ */
  /* Sheets, menus, confirm                                              */
  /* ------------------------------------------------------------------ */
  function openSheet(o) {
    closeMenu();
    var wrap = el('<div class="sheet-wrap ' + (o.className || '') + '">' +
      '<div class="backdrop"></div>' +
      '<div class="sheet" role="dialog" aria-modal="true"' + (o.title ? ' aria-label="' + esc(o.title) + '"' : '') + '>' +
        '<div class="grab"></div>' +
        '<header class="sheet-head"><h2>' + esc(o.title || '') + '</h2>' +
        '<button type="button" class="icon-btn" data-sheet-close aria-label="' + esc(t('common.close')) + '">' + icon('close') + '</button></header>' +
        '<div class="sheet-body"></div>' +
        (o.footer && o.footer.length ? '<footer class="sheet-foot"></footer>' : '') +
      '</div></div>');
    wrap.querySelector('.sheet-body').appendChild(o.body);
    var api = { el: wrap, refresh: null, closed: false, close: close };
    if (o.footer) {
      var foot = wrap.querySelector('.sheet-foot');
      o.footer.forEach(function (b) {
        var btn = el('<button type="button" class="btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '') + '">' + (b.icon ? icon(b.icon) : '') + '<span>' + esc(b.label) + '</span></button>');
        btn.addEventListener('click', b.onClick);
        foot.appendChild(btn);
      });
    }
    function close() {
      if (api.closed) return;
      api.closed = true;
      if (o.onClose) { try { o.onClose(); } catch (e) { console.error(e); } }
      UI.sheets = UI.sheets.filter(function (s) { return s !== api; });
      if (document.activeElement && wrap.contains(document.activeElement)) document.activeElement.blur();
      wrap.classList.remove('open');
      wrap.classList.add('closing');
      setTimeout(function () { wrap.remove(); }, 280);
    }
    wrap.querySelector('.backdrop').addEventListener('click', close);
    wrap.querySelector('[data-sheet-close]').addEventListener('click', close);

    // drag the handle or header down to dismiss
    var sheet = wrap.querySelector('.sheet');
    [wrap.querySelector('.grab'), wrap.querySelector('.sheet-head')].forEach(function (zone) {
      zone.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' || e.target.closest('button')) return;
        var sy = e.clientY, dy = 0, pid = e.pointerId;
        sheet.style.transition = 'none';
        function mv(ev) { if (ev.pointerId !== pid) return; dy = Math.max(0, ev.clientY - sy); sheet.style.transform = 'translateY(' + dy + 'px)'; }
        function upH(ev) {
          if (ev.pointerId !== pid) return;
          window.removeEventListener('pointermove', mv);
          window.removeEventListener('pointerup', upH);
          window.removeEventListener('pointercancel', upH);
          sheet.style.transition = '';
          sheet.style.transform = '';
          if (dy > 90) close();
        }
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', upH);
        window.addEventListener('pointercancel', upH);
      });
    });

    document.body.appendChild(wrap);
    UI.sheets.push(api);
    void wrap.offsetHeight;
    wrap.classList.add('open');
    return api;
  }

  function openMenu(anchor, items, onPick) {
    closeMenu();
    var m = el('<div class="menu" role="menu">' + items.map(function (it, i) {
      return '<button type="button" class="menu-item" role="menuitem" data-i="' + i + '">' +
        (it.color ? '<i class="dot" style="--c:' + it.color + '"></i>' : '') + '<span>' + esc(it.label) + '</span>' +
        (it.selected ? icon('check', 'sel') : '') + '</button>';
    }).join('') + '</div>');
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    var mw = Math.max(m.offsetWidth, 200), mh = m.offsetHeight;
    var vw = window.innerWidth, vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    var left = Math.min(Math.max(8, r.right - mw), vw - mw - 8);
    var top = r.bottom + 6;
    if (top + mh > vh - 8) top = Math.max(8, r.top - mh - 6);
    m.style.left = left + 'px';
    m.style.top = top + 'px';
    m.style.minWidth = mw + 'px';
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]');
      if (!b) return;
      closeMenu();
      onPick(items[+b.dataset.i].value);
    });
    var outside = function (e) { if (!m.contains(e.target)) closeMenu(); };
    setTimeout(function () { document.addEventListener('pointerdown', outside, true); }, 0);
    UI.menu = { el: m, outside: outside };
  }
  function closeMenu() {
    if (!UI.menu) return;
    document.removeEventListener('pointerdown', UI.menu.outside, true);
    UI.menu.el.remove();
    UI.menu = null;
  }

  function confirmDialog(msg, okLabel) {
    return new Promise(function (resolve) {
      var answered = false;
      var body = el('<p class="confirm-msg">' + esc(msg) + '</p>');
      var s = openSheet({
        body: body, className: 'small',
        footer: [
          { label: t('common.cancel'), onClick: function () { answered = true; s.close(); resolve(false); } },
          { label: okLabel, danger: true, onClick: function () { answered = true; s.close(); resolve(true); } }
        ],
        onClose: function () { if (!answered) resolve(false); }
      });
    });
  }

  function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }

  /* Task sheet */
  function openTaskSheet(id) {
    if (!S.tasks.has(id)) return;
    function get() { return S.tasks.get(id); }
    var body = el('<div class="tsheet">' +
      '<textarea class="t-title" rows="1" maxlength="500" data-r="title" placeholder="' + esc(t('task.title')) + '"></textarea>' +
      '<textarea class="t-notes" rows="3" data-r="notes" placeholder="' + esc(t('task.notesPh')) + '"></textarea>' +
      '<div class="field"><span class="flabel">' + icon('lists') + esc(t('task.list')) + '</span><button type="button" class="chip" data-r="list"></button></div>' +
      '<div class="field col"><span class="flabel">' + icon('today') + esc(t('task.date')) + '</span><div class="chips" data-r="date"></div></div>' +
      '<div class="field col"><span class="flabel">' + icon('repeat') + esc(t('task.repeat')) + '</span><div class="seg wide" data-r="rep"></div><div data-r="repx"></div></div>' +
      '</div>');
    var titleIn = R('title', body), notesIn = R('notes', body);
    titleIn.value = get().title;
    notesIn.value = get().notes || '';
    var tT = 0, nT = 0;

    function saveTitle() {
      clearTimeout(tT);
      var o = get(), v = titleIn.value.replace(/\s+/g, ' ').trim();
      if (o && v && v !== o.title) S.updateTask(id, { title: v });
    }
    function saveNotes() {
      clearTimeout(nT);
      var o = get();
      if (o && notesIn.value !== (o.notes || '')) S.updateTask(id, { notes: notesIn.value });
    }
    titleIn.addEventListener('input', function () { autoGrow(titleIn); clearTimeout(tT); tT = setTimeout(saveTitle, 500); });
    titleIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); titleIn.blur(); } });
    titleIn.addEventListener('blur', saveTitle);
    notesIn.addEventListener('input', function () { autoGrow(notesIn); clearTimeout(nT); nT = setTimeout(saveNotes, 600); });
    notesIn.addEventListener('blur', saveNotes);

    function render() {
      var o = get();
      if (!o) return;
      if (document.activeElement !== titleIn && titleIn.value !== o.title) { titleIn.value = o.title; autoGrow(titleIn); }
      if (document.activeElement !== notesIn && notesIn.value !== (o.notes || '')) { notesIn.value = o.notes || ''; autoGrow(notesIn); }
      var l = o.list_id && S.lists.get(o.list_id);
      R('list', body).innerHTML = '<i class="dot" style="--c:' + (l ? safeColor(l.color) : 'var(--text-3)') + '"></i><span>' + esc(l ? l.name : t('task.inbox')) + '</span>' + icon('chevD');
      var today = U.today(), tom = U.addDays(today, 1), dd = o.due_date;
      var custom = dd && dd !== today && dd !== tom;
      R('date', body).innerHTML =
        '<button type="button" class="chip' + (!dd ? ' on' : '') + '" data-date="">' + esc(t('task.none')) + '</button>' +
        '<button type="button" class="chip' + (dd === today ? ' on' : '') + '" data-date="' + today + '">' + esc(t('task.today')) + '</button>' +
        '<button type="button" class="chip' + (dd === tom ? ' on' : '') + '" data-date="' + tom + '">' + esc(t('task.tomorrow')) + '</button>' +
        '<label class="chip pick' + (custom ? ' on' : '') + '">' + icon('today') + '<span>' + esc(custom ? fmtRel(dd) : t('task.pick')) + '</span>' +
        '<input type="date" value="' + (dd || '') + '" aria-label="' + esc(t('task.pick')) + '"></label>';
      var f = o.repeat ? o.repeat.freq : '';
      R('rep', body).innerHTML = [['', 'rep.never'], ['day', 'rep.day'], ['week', 'rep.week'], ['month', 'rep.month']].map(function (p) {
        return '<button type="button" class="' + (f === p[0] ? 'on' : '') + '" data-rep="' + p[0] + '">' + esc(t(p[1])) + '</button>';
      }).join('');
      var x = '';
      if (o.repeat) {
        var n = o.repeat.every || 1;
        x += '<div class="stepper"><button type="button" data-step="-1"' + (n <= 1 ? ' disabled' : '') + ' aria-label="-">\u2212</button>' +
          '<span>' + esc(repEvery(o.repeat)) + '</span>' +
          '<button type="button" data-step="1"' + (n >= 30 ? ' disabled' : '') + ' aria-label="+">+</button></div>';
        if (o.repeat.freq === 'week') {
          var days = U.repDays(o.repeat, o.due_date || today);
          x += '<div class="daychips">' + t('days2').map(function (d, i) {
            return '<button type="button" class="' + (days.indexOf(i + 1) >= 0 ? 'on' : '') + '" data-wd="' + (i + 1) + '">' + d + '</button>';
          }).join('') + '</div>';
        }
      }
      R('repx', body).innerHTML = x;
    }

    function setDate(d) {
      var o = get();
      var patch = { due_date: d || null };
      if (!d && o.repeat) patch.repeat = null;
      if (d && o.repeat && o.repeat.freq === 'month') patch.repeat = Object.assign({}, o.repeat, { mday: U.parseDay(d).getDate() });
      S.updateTask(id, patch);
      haptic();
    }
    function setRepeat(freq) {
      var o = get(), today = U.today();
      if (!freq) { S.updateTask(id, { repeat: null }); return; }
      var ref = o.due_date || today;
      var rep = { freq: freq, every: o.repeat && o.repeat.freq === freq ? o.repeat.every : 1 };
      if (freq === 'week') rep.days = o.repeat && o.repeat.freq === 'week' && o.repeat.days ? o.repeat.days : [U.isoDow(ref)];
      if (freq === 'month') rep.mday = U.parseDay(ref).getDate();
      var patch = { repeat: rep };
      if (!o.due_date) patch.due_date = U.firstOnOrAfter(rep, today);
      S.updateTask(id, patch);
      haptic();
    }

    body.addEventListener('click', function (e) {
      var o = get();
      if (!o) return;
      if (e.target.closest('[data-r="list"]')) {
        openMenu(R('list', body), listItems(o.list_id), function (v) { S.updateTask(id, { list_id: v }); });
        return;
      }
      var dateIn = e.target.closest('input[type="date"]');
      if (dateIn) { try { if (dateIn.showPicker) dateIn.showPicker(); } catch (err) { /* native picker opens anyway */ } return; }
      var db = e.target.closest('[data-date]');
      if (db) { setDate(db.dataset.date); return; }
      var rb = e.target.closest('[data-rep]');
      if (rb) { setRepeat(rb.dataset.rep); return; }
      var st = e.target.closest('[data-step]');
      if (st && o.repeat) {
        var n = Math.min(30, Math.max(1, (o.repeat.every || 1) + Number(st.dataset.step)));
        S.updateTask(id, { repeat: Object.assign({}, o.repeat, { every: n }) });
        return;
      }
      var wd = e.target.closest('[data-wd]');
      if (wd && o.repeat) {
        var today = U.today();
        var days = U.repDays(o.repeat, o.due_date || today).slice();
        var d = Number(wd.dataset.wd), i = days.indexOf(d);
        if (i >= 0) { if (days.length === 1) return; days.splice(i, 1); } else days.push(d);
        days.sort();
        var rep = Object.assign({}, o.repeat, { days: days });
        var patch = { repeat: rep };
        if (o.due_date && days.indexOf(U.isoDow(o.due_date)) < 0) patch.due_date = U.firstOnOrAfter(rep, o.due_date < today ? today : o.due_date);
        S.updateTask(id, patch);
        haptic();
      }
    });
    body.addEventListener('change', function (e) {
      if (e.target.matches('input[type="date"]')) setDate(e.target.value || null);
    });

    var sheet = openSheet({
      body: body,
      footer: [
        { label: t('task.delete'), danger: true, icon: 'trash', onClick: function () { sheet.close(); deleteTaskWithUndo(id); } },
        { label: t('common.done'), primary: true, onClick: function () { sheet.close(); } }
      ],
      onClose: function () { saveTitle(); saveNotes(); }
    });
    sheet.refresh = function () { if (!S.tasks.has(id)) { sheet.close(); return; } render(); };
    render();
    autoGrow(titleIn);
    autoGrow(notesIn);
  }

  /* List sheet (create / edit) */
  function openListSheet(id) {
    var l = id ? S.lists.get(id) : null;
    if (id && !l) return;
    var color = l ? l.color : LIST_COLORS[(S.lists.size * 5) % LIST_COLORS.length];
    var body = el('<div class="form">' +
      '<label class="field-label">' + esc(t('lists.name')) + '<input type="text" maxlength="80" data-r="name" placeholder="' + esc(t('lists.namePh')) + '" value="' + esc(l ? l.name : '') + '"></label>' +
      '<div class="field-label">' + esc(t('lists.color')) + '</div><div class="colors" data-r="colors"></div>' +
      (l ? '<button type="button" class="btn danger wide" data-r="del">' + icon('trash') + '<span>' + esc(t('lists.delete')) + '</span></button>' : '') +
      '</div>');
    var nameIn = R('name', body);
    function renderColors() {
      R('colors', body).innerHTML = LIST_COLORS.map(function (c) {
        return '<button type="button" class="sw' + (c === color ? ' sel' : '') + '" style="--sw:' + c + '" data-c="' + c + '" aria-label="' + c + '"></button>';
      }).join('');
    }
    renderColors();
    R('colors', body).addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      color = b.dataset.c;
      renderColors();
      haptic();
      if (l) S.updateList(l.id, { color: color });
    });
    function create() {
      var n = nameIn.value.trim();
      if (!n) { nameIn.focus(); return; }
      var row = S.addList(n, color);
      sheet.close();
      go('list/' + row.id);
    }
    nameIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (l) sheet.close(); else create(); }
    });
    if (l) {
      R('del', body).addEventListener('click', async function () {
        var n = S.tasksIn(l.id).length;
        var ok = await confirmDialog(n ? t('lists.deleteConfirm', { name: l.name, n: n }) : t('lists.deleteConfirmEmpty', { name: l.name }), t('common.delete'));
        if (!ok) return;
        sheet.close();
        S.deleteList(l.id);
        if (UI.route === 'list' && UI.param === l.id) go('lists');
      });
    }
    var sheet = openSheet({
      title: l ? t('lists.edit') : t('lists.new'), body: body,
      footer: l
        ? [{ label: t('common.done'), primary: true, onClick: function () { sheet.close(); } }]
        : [{ label: t('common.cancel'), onClick: function () { sheet.close(); } }, { label: t('lists.create'), primary: true, onClick: create }],
      onClose: function () {
        if (!l || !S.lists.has(l.id)) return;
        var n = nameIn.value.trim();
        if (n && n !== S.lists.get(l.id).name) S.updateList(l.id, { name: n });
      }
    });
    if (!l) nameIn.focus({ preventScroll: true });
  }

  /* Habit sheet (create / edit + calendar) */
  function openHabitSheet(id) {
    var h0 = id ? S.habits.get(id) : null;
    if (id && !h0) return;
    var schedule = h0 ? h0.schedule : 'all';
    var month = U.today().slice(0, 7);
    var body = el('<div class="form">' +
      '<input class="t-title" type="text" data-r="name" maxlength="80" placeholder="' + esc(t('habits.namePh')) + '" value="' + esc(h0 ? h0.name : '') + '">' +
      '<div class="field col"><span class="flabel">' + icon('today') + esc(t('habits.days')) + '</span><div class="seg wide" data-r="sched"></div></div>' +
      (h0 ? '<div class="stats" data-r="stats"></div><div class="cal" data-r="cal"></div><p class="hint">' + esc(t('habits.calHint')) + '</p>' +
        '<button type="button" class="btn danger wide" data-r="del">' + icon('trash') + '<span>' + esc(t('habits.delete')) + '</span></button>' : '') +
      '</div>');
    var nameIn = R('name', body);

    function renderSched() {
      R('sched', body).innerHTML = ['all', 'weekdays', 'weekend'].map(function (k) {
        return '<button type="button" class="' + (schedule === k ? 'on' : '') + '" data-sch="' + k + '">' + esc(t('sch.' + k)) + '</button>';
      }).join('');
    }
    function dayWord(n) { return n === 1 ? t('habits.day') : t('habits.daysUnit'); }
    function renderStats() {
      var h = S.habits.get(id);
      if (!h) return;
      var cur = S.streak(h), best = S.bestStreak(h);
      R('stats', body).innerHTML =
        '<div class="stat"><span class="stat-n"><b>' + cur + '</b> ' + esc(dayWord(cur)) + '</span><span class="stat-l">' + icon('habits') + esc(t('habits.streak')) + '</span></div>' +
        '<div class="stat"><span class="stat-n"><b>' + best + '</b> ' + esc(dayWord(best)) + '</span><span class="stat-l">' + esc(t('habits.best')) + '</span></div>';
    }
    function renderCal() {
      var h = S.habits.get(id);
      if (!h) return;
      var p = month.split('-').map(Number);
      var first = month + '-01';
      var daysIn = new Date(p[0], p[1], 0).getDate();
      var lead = U.isoDow(first) - 1;
      var today = U.today();
      var title = cap(new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(U.parseDay(first)));
      var canNext = month < today.slice(0, 7);
      var html = '<div class="cal-head"><button type="button" class="icon-btn sm" data-cal="-1" aria-label="\u2190">' + icon('chevL') + '</button>' +
        '<span>' + esc(title) + '</span><button type="button" class="icon-btn sm" data-cal="1" aria-label="\u2192"' + (canNext ? '' : ' disabled') + '>' + icon('chevR') + '</button></div>' +
        '<div class="cal-grid">' + t('days2').map(function (d) { return '<span class="cal-dow">' + d + '</span>'; }).join('');
      for (var i = 0; i < lead; i++) html += '<span></span>';
      for (var d = 1; d <= daysIn; d++) {
        var day = month + '-' + U.pad(d);
        var sch = U.scheduledOn(h, day), done = S.isHabitDone(h.id, day);
        var cls = 'cal-day';
        if (day > today) cls += ' future';
        else if (done) cls += ' done' + (sch ? '' : ' off');
        else if (!sch) cls += ' off';
        else if (day < today) cls += ' miss';
        if (day === today) cls += ' now';
        var can = day <= today && (sch || done);
        html += '<button type="button" class="' + cls + '"' + (can ? ' data-day="' + day + '"' : ' disabled') + '>' + d + '</button>';
      }
      R('cal', body).innerHTML = html + '</div>';
    }
    function renderAll() { renderSched(); if (h0) { renderStats(); renderCal(); } }

    body.addEventListener('click', function (e) {
      var sb = e.target.closest('[data-sch]');
      if (sb) {
        schedule = sb.dataset.sch;
        haptic();
        if (h0) S.updateHabit(id, { schedule: schedule }); else renderSched();
        return;
      }
      var cb = e.target.closest('[data-cal]');
      if (cb && !cb.disabled) {
        var p = month.split('-').map(Number);
        var nd = new Date(p[0], p[1] - 1 + Number(cb.dataset.cal), 1);
        month = nd.getFullYear() + '-' + U.pad(nd.getMonth() + 1);
        renderCal();
        return;
      }
      var dd = e.target.closest('[data-day]');
      if (dd) {
        haptic();
        S.setLog(id, dd.dataset.day, !S.isHabitDone(id, dd.dataset.day));
      }
    });

    function create() {
      var n = nameIn.value.trim();
      if (!n) { nameIn.focus(); return; }
      S.addHabit(n, schedule);
      sheet.close();
      if (UI.route !== 'habits' && UI.route !== 'today') go('habits');
    }
    nameIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (h0) nameIn.blur(); else create(); }
    });
    if (h0) {
      nameIn.addEventListener('blur', function () {
        var n = nameIn.value.trim(), h = S.habits.get(id);
        if (h && n && n !== h.name) S.updateHabit(id, { name: n });
      });
      R('del', body).addEventListener('click', async function () {
        var h = S.habits.get(id);
        if (!h) return;
        var ok = await confirmDialog(t('habits.deleteConfirm', { name: h.name }), t('common.delete'));
        if (!ok) return;
        sheet.close();
        S.deleteHabit(id);
      });
    }

    var sheet = openSheet({
      title: h0 ? '' : t('habits.new'), body: body,
      footer: h0
        ? [{ label: t('common.done'), primary: true, onClick: function () { sheet.close(); } }]
        : [{ label: t('common.cancel'), onClick: function () { sheet.close(); } }, { label: t('habits.create'), primary: true, onClick: create }],
      onClose: function () {
        if (!h0) return;
        var n = nameIn.value.trim(), h = S.habits.get(id);
        if (h && n && n !== h.name) S.updateHabit(id, { name: n });
      }
    });
    sheet.refresh = function () {
      if (!h0) return;
      var h = S.habits.get(id);
      if (!h) { sheet.close(); return; }
      schedule = h.schedule;
      if (document.activeElement !== nameIn && nameIn.value !== h.name) nameIn.value = h.name;
      renderAll();
    };
    renderAll();
    if (!h0) nameIn.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ */
  /* Export / import                                                     */
  /* ------------------------------------------------------------------ */
  function saveFile(name, text, mime) {
    var blob = new Blob([text], { type: mime });
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse && navigator.canShare && typeof File === 'function') {
      try {
        var file = new File([blob], name, { type: mime });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).catch(function (err) { if (err && err.name !== 'AbortError') download(); });
          return;
        }
      } catch (e) { /* fall back to a download */ }
    }
    download();
    function download() {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }
  }
  function exportJson() {
    saveFile('pocketdo-backup-' + U.today() + '.json', JSON.stringify(S.exportData(), null, 2), 'application/json');
  }
  async function importFile(file) {
    var json;
    try { json = JSON.parse(await file.text()); } catch (e) { toast(t('set.importBad')); return; }
    if (!S.validBackup(json)) { toast(t('set.importBad')); return; }
    var ok = await confirmDialog(t('set.importConfirm'), t('set.importBtn'));
    if (!ok) return;
    try {
      await S.importData(json);
      toast(t('set.imported'));
    } catch (e) {
      console.error(e);
      toast(t('set.importFail', { msg: errMsg(e) }));
      S.resync();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Appearance & language                                               */
  /* ------------------------------------------------------------------ */
  function applyAppearance() {
    var s = S.settings || {};
    window.PT_applyTheme(s.theme || 'auto', s.accent || null);
    try { localStorage.setItem('pt-ui', JSON.stringify({ theme: s.theme || 'auto', accent: s.accent || null, lang: s.lang || PT.lang })); } catch (e) { /* private mode */ }
  }
  function onSettings() {
    applyAppearance();
    var lang = S.settings.lang || PT.deviceLang();
    if (lang !== PT.lang) {
      PT.setLang(lang);
      if (UI.started) {
        var scroll = UI.scroller ? UI.scroller.scrollTop : 0;
        UI.sheets.slice().forEach(function (s) { s.close(); });
        buildShell();
        onRoute(true);
        if (UI.scroller) UI.scroller.scrollTop = scroll;
        return;
      }
    }
    if (UI.started && UI.route === 'settings') renderNow();
  }
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () { if ((S.settings.theme || 'auto') === 'auto') { applyAppearance(); if (UI.route === 'settings') renderNow(); } };
    if (mq.addEventListener) mq.addEventListener('change', onScheme); else if (mq.addListener) mq.addListener(onScheme);
  }

  /* ------------------------------------------------------------------ */
  /* Auth screens                                                        */
  /* ------------------------------------------------------------------ */
  function showAuth(opts) {
    opts = opts || UI.authOpts || {};
    UI.authOpts = opts;
    UI.started = false;
    var notConf = !!opts.notConfigured;
    var mode = UI.authMode;
    var prevEmail = ($('.auth-form [name="email"]') || {}).value || '';
    var app = $('#app');
    app.innerHTML =
      '<div class="auth">' +
        '<div class="auth-top"><div class="seg sm">' + ['fr', 'en'].map(function (l) {
          return '<button type="button" data-act="auth-lang" data-v="' + l + '" class="' + (PT.lang === l ? 'on' : '') + '">' + l.toUpperCase() + '</button>';
        }).join('') + '</div></div>' +
        '<div class="auth-box">' + logoSVG('auth-mark') +
          '<h1>PocketDo</h1><p class="auth-tag">' + esc(t('tagline')) + '</p>' +
          (notConf
            ? '<p class="auth-note">' + esc(t('auth.notConfigured')) + '</p><button type="button" class="btn primary wide" data-act="local-mode">' + esc(t('auth.localMode')) + '</button>'
            : '<form class="auth-form" novalidate>' +
                '<label class="field-label">' + esc(t('auth.email')) + '<input type="email" name="email" autocomplete="username" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" value="' + esc(prevEmail) + '"></label>' +
                '<label class="field-label">' + esc(t('auth.password')) + '<input type="password" name="password" autocomplete="' + (mode === 'signup' ? 'new-password' : 'current-password') + '"></label>' +
                '<p class="auth-msg" role="alert"></p>' +
                '<button class="btn primary wide" type="submit">' + esc(mode === 'signup' ? t('auth.signUp') : t('auth.signIn')) + '</button>' +
                '<div class="auth-links">' +
                  (CFG.allowSignup !== false ? '<button type="button" class="link" data-act="auth-switch">' + esc(mode === 'signup' ? t('auth.toSignIn') : t('auth.toSignUp')) + '</button>' : '<span></span>') +
                  (mode === 'signin' ? '<button type="button" class="link" data-act="auth-forgot">' + esc(t('auth.forgot')) + '</button>' : '') +
                '</div>' +
              '</form>') +
        '</div>' +
      '</div>';
    var form = $('.auth-form');
    if (form) form.addEventListener('submit', onAuthSubmit);
  }
  function authMsg(text, ok) {
    var m = $('.auth-msg');
    if (!m) return;
    m.textContent = text || '';
    m.classList.toggle('ok', !!ok);
  }
  function authErr(e) {
    var m = errMsg(e);
    if (/invalid login|invalid credentials/i.test(m)) return t('auth.badLogin');
    if (/not confirmed/i.test(m)) return t('auth.notConfirmed');
    if (/password/i.test(m) && /(6|short|least)/i.test(m)) return t('auth.pwShort');
    return t('auth.fail', { msg: m });
  }
  function authLang(l) {
    PT.setLang(l);
    S.settings = Object.assign({}, S.settings, { lang: l });
    applyAppearance();
    showAuth();
  }
  function authSwitch() {
    UI.authMode = UI.authMode === 'signup' ? 'signin' : 'signup';
    showAuth();
  }
  async function authForgot() {
    var email = ($('.auth-form [name="email"]') || {}).value || '';
    email = email.trim();
    if (!email) { authMsg(t('auth.enterEmail')); return; }
    try { await UI.backend.resetPassword(email); authMsg(t('auth.resetSent', { email: email }), true); }
    catch (e) { authMsg(authErr(e)); }
  }
  async function onAuthSubmit(e) {
    e.preventDefault();
    var f = e.currentTarget;
    var email = f.email.value.trim(), pw = f.password.value;
    var btn = f.querySelector('[type="submit"]');
    authMsg('');
    if (!email) { authMsg(t('auth.enterEmail')); return; }
    if (pw.length < 6) { authMsg(t('auth.pwShort')); return; }
    btn.disabled = true;
    try {
      if (UI.authMode === 'signup') {
        var r = await UI.backend.signUp(email, pw);
        if (r.session) { await startApp(r.session); return; }
        UI.authMode = 'signin';
        showAuth();
        authMsg(t('auth.confirmSent', { email: email }), true);
      } else {
        var session = await UI.backend.signIn(email, pw);
        await startApp(session);
      }
    } catch (err) {
      authMsg(authErr(err));
    } finally {
      if (btn.isConnected) btn.disabled = false;
    }
  }

  function openPasswordSheet() {
    if (UI.sheets.some(function (s) { return s.isPassword; })) return;
    var body = el('<form class="form" novalidate><label class="field-label">' + esc(t('auth.password')) +
      '<input type="password" autocomplete="new-password"></label><p class="auth-msg"></p></form>');
    var inp = body.querySelector('input'), msg = body.querySelector('.auth-msg');
    async function save() {
      if (inp.value.length < 6) { msg.textContent = t('auth.pwShort'); return; }
      try { await UI.backend.updatePassword(inp.value); sheet.close(); toast(t('auth.passwordSaved')); }
      catch (e) { msg.textContent = authErr(e); }
    }
    body.addEventListener('submit', function (e) { e.preventDefault(); save(); });
    var sheet = openSheet({ title: t('auth.newPassword'), body: body, className: 'small', footer: [{ label: t('auth.savePassword'), primary: true, onClick: save }] });
    sheet.isPassword = true;
  }

  function showFatal(msg) {
    UI.started = false;
    $('#app').innerHTML = '<div class="auth"><div class="auth-box">' + logoSVG('auth-mark') +
      '<h1>PocketDo</h1><p class="auth-note">' + esc(msg) + '</p>' +
      '<button type="button" class="btn primary wide" data-act="reload">' + esc(t('auth.retry')) + '</button></div></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Start / stop                                                        */
  /* ------------------------------------------------------------------ */
  async function startApp(session) {
    if (UI.starting || UI.started || !session) return;
    UI.starting = true;
    try {
      var pre = Object.assign({}, S.settings);
      S.reset();
      S.backend = UI.backend;
      UI.backend.uid = session.user.id;
      S.uid = session.user.id;
      S.email = session.user.email || '';
      var data = await UI.backend.loadAll();
      S.hydrate(data, false);
      if (!S.hasSettings) S.setSettings(Object.assign(PT.defaultSettings(), { theme: pre.theme || 'auto', accent: pre.accent || null, lang: pre.lang || PT.lang }));
      UI.started = true;
      UI.day = U.today();
      PT.setLang(S.settings.lang || PT.deviceLang());
      applyAppearance();
      buildShell();
      if (!/^#\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search + '#/today');
      onRoute(true);
      UI.subscribedOnce = false;
      UI.backend.subscribe(function (tb, ty, n, o) { S.applyRemote(tb, ty, n, o); }, function (status) {
        if (status === 'SUBSCRIBED') { if (UI.subscribedOnce) S.resync(); UI.subscribedOnce = true; }
      });
      S.lastSync = Date.now();
      if (!S.queue.size) S.setSync('idle');
    } catch (e) {
      console.error(e);
      showFatal(t('auth.loadFail', { msg: errMsg(e) }));
    } finally {
      UI.starting = false;
    }
  }

  function stopApp() {
    if (UI.backend) UI.backend.unsubscribe();
    UI.sheets.slice().forEach(function (s) { s.close(); });
    closeMenu();
    S.reset();
    UI.started = false;
    UI.route = null;
    UI.view = null;
    UI.viewEl = null;
  }

  async function startLocal() {
    UI.mode = 'local';
    UI.backend = new PT.LocalBackend();
    try { localStorage.setItem('pocketdo-mode', 'local'); } catch (e) { /* ignore */ }
    await startApp(UI.backend.sessionSync());
  }

  async function signOut() {
    if (UI.mode === 'local') {
      try { localStorage.removeItem('pocketdo-mode'); } catch (e) { /* ignore */ }
      stopApp();
      UI.mode = null;
      showAuth({ notConfigured: !(CFG.supabaseUrl && CFG.supabaseKey) });
      if (CFG.supabaseUrl && CFG.supabaseKey) location.reload();
      return;
    }
    try { await S.flushNow(); } catch (e) { /* ignore */ }
    try { await UI.backend.signOut(); } catch (e) { /* ignore */ }
    if (UI.started) { stopApp(); showAuth({}); }
  }

  function onAuthEvent(ev, session) {
    if (ev === 'PASSWORD_RECOVERY') {
      if (!UI.started && session) startApp(session).then(openPasswordSheet);
      else openPasswordSheet();
      return;
    }
    if (ev === 'SIGNED_OUT') { if (UI.started) { stopApp(); showAuth({}); } return; }
    if (ev === 'SIGNED_IN' && session && UI.started && session.user.id !== S.uid) { stopApp(); startApp(session); }
  }

  /* Store events */
  S.on('change', scheduleRender);
  S.on('settings', onSettings);
  S.on('sync', function () {
    updateBanner();
    updateNav();
    if (UI.route === 'settings' && UI.viewEl) { var sy = R('sync'); if (sy) { sy.textContent = t('sync.' + S.sync); sy.parentElement.dataset.state = S.sync; } }
  });
  S.on('error', function (e) { toast(t('err.save', { msg: errMsg(e) })); });

  /* App lifecycle */
  document.addEventListener('visibilitychange', function () {
    if (!UI.started) return;
    if (document.visibilityState === 'hidden') { S.flush(); return; }
    if (UI.day !== U.today()) { UI.day = U.today(); renderNow(); }
    if (UI.mode === 'cloud' && Date.now() - S.lastSync > 15000) S.resync();
  });
  window.addEventListener('online', function () { updateBanner(); if (UI.started && UI.mode === 'cloud') { S.flush(); S.resync(); } });
  window.addEventListener('offline', updateBanner);
  window.addEventListener('pagehide', function () { if (UI.started) S.flush(); });
  setInterval(function () { if (UI.started && UI.day !== U.today()) { UI.day = U.today(); renderNow(); } }, 30000);
  window.addEventListener('hashchange', function () { onRoute(false); });

  var resizeT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { if (UI.started && UI.route === 'habits') renderNow(); }, 150);
  });

  /* Keep sheets above the iOS keyboard */
  if (window.visualViewport) {
    var vv = window.visualViewport;
    var onVV = function () {
      var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', kb + 'px');
      document.documentElement.style.setProperty('--vvh', vv.height + 'px');
    };
    vv.addEventListener('resize', onVV);
    vv.addEventListener('scroll', onVV);
    onVV();
  }
  document.addEventListener('focusout', function () {
    setTimeout(function () { if (!document.activeElement || document.activeElement === document.body) window.scrollTo(0, 0); }, 50);
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  function hideSplash() {
    var sp = $('#splash');
    if (!sp) return;
    sp.classList.add('hide');
    setTimeout(function () { sp.remove(); }, 450);
  }

  async function boot() {
    var ui = readUi();
    PT.setLang(ui.lang || PT.deviceLang());
    S.settings = Object.assign(PT.defaultSettings(), { theme: ui.theme || 'auto', accent: ui.accent || null, lang: PT.lang });
    var t0 = performance.now();
    var configured = !!(CFG.supabaseUrl && CFG.supabaseKey);
    try {
      if (configured) {
        if (!(window.supabase && window.supabase.createClient)) { showFatal(t('auth.sdkFail')); }
        else {
          UI.mode = 'cloud';
          UI.backend = new PT.SupabaseBackend(CFG);
          UI.backend.onAuth(function (ev, session) { setTimeout(function () { onAuthEvent(ev, session); }, 0); });
          var session = await UI.backend.session();
          if (session) await startApp(session); else showAuth({});
        }
      } else if (localStorage.getItem('pocketdo-mode') === 'local') {
        await startLocal();
      } else {
        showAuth({ notConfigured: true });
      }
    } catch (e) {
      console.error(e);
      showFatal(errMsg(e));
    }
    setTimeout(hideSplash, Math.max(0, 1400 - (performance.now() - t0)));
  }

  PT.app = { UI: UI, go: go };
  boot();
})();
