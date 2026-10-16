/* PocketDo - interface text in English and French. */
(function () {
  'use strict';
  var PT = (window.PT = window.PT || {});
  var NB = '\u00A0'; // non-breaking space for French punctuation

  var D = {
    en: {
      'tagline': 'Your tasks and daily habits, in sync on every device.',
      'nav.today': 'Today', 'nav.lists': 'Lists', 'nav.habits': 'Habits', 'nav.settings': 'Settings',

      'auth.email': 'Email', 'auth.password': 'Password',
      'auth.signIn': 'Sign in', 'auth.signUp': 'Create account',
      'auth.toSignUp': 'Create an account', 'auth.toSignIn': 'I already have an account',
      'auth.forgot': 'Forgot password?',
      'auth.resetSent': 'If an account exists for {email}, a reset link is on its way. Open it, choose a new password, then sign in here.',
      'auth.confirmSent': 'Account created. Confirm it with the link sent to {email}, then sign in here.',
      'auth.enterEmail': 'Enter your email address first.',
      'auth.badLogin': 'Wrong email or password.',
      'auth.notConfirmed': 'Confirm your email with the link we sent, then sign in again.',
      'auth.pwShort': 'The password needs at least 6 characters.',
      'auth.fail': 'Something went wrong: {msg}',
      'auth.notConfigured': 'Sync isn\u2019t set up yet. Add your Supabase project URL and key to config.js (see the README), or try PocketDo on this device only.',
      'auth.localMode': 'Use on this device only',
      'auth.newPassword': 'Choose a new password',
      'auth.savePassword': 'Save password',
      'auth.passwordSaved': 'Password saved. Use it to sign in on your other devices.',
      'auth.loadFail': 'Your data couldn\u2019t be loaded: {msg}',
      'auth.sdkFail': 'PocketDo couldn\u2019t reach the sync service. Check your connection, then try again.',
      'auth.retry': 'Try again',

      'today.title': 'Today', 'today.habits': 'Habits', 'today.tasks': 'Tasks', 'today.overdue': 'Overdue',
      'today.doneToday': 'Completed today ({n})',
      'today.empty': 'Nothing due today. Add a task here, or give a task a date to see it on this page.',
      'today.allDone': 'Everything for today is done.',
      'today.noHabits': 'No habits planned for today.',
      'today.addHabits': 'Set up habits',
      'today.progress': '{done} of {total} done today',

      'task.add': 'Add a task', 'task.inbox': 'Inbox', 'task.completed': 'Completed ({n})',
      'task.emptyList': 'No tasks in this list. Add one above.',
      'task.title': 'Task name', 'task.notesPh': 'Notes', 'task.list': 'List', 'task.date': 'Date',
      'task.none': 'None', 'task.today': 'Today', 'task.tomorrow': 'Tomorrow', 'task.yesterday': 'Yesterday',
      'task.pick': 'Pick a date', 'task.repeat': 'Repeat', 'task.delete': 'Delete',
      'task.deleted': 'Task deleted', 'task.nextOn': 'Done. Next one: {date}',
      'a11y.check': 'Mark as done', 'a11y.uncheck': 'Mark as not done', 'a11y.more': 'More options',

      'rep.never': 'Never', 'rep.day': 'Daily', 'rep.week': 'Weekly', 'rep.month': 'Monthly',
      'rep.everyDay': 'Every day', 'rep.everyNDays': 'Every {n} days',
      'rep.everyWeek': 'Every week', 'rep.everyNWeeks': 'Every {n} weeks',
      'rep.everyMonth': 'Every month', 'rep.everyNMonths': 'Every {n} months',

      'lists.title': 'Lists', 'lists.new': 'New list', 'lists.edit': 'Edit list',
      'lists.name': 'Name', 'lists.namePh': 'e.g. Physics', 'lists.color': 'Color',
      'lists.create': 'Create list', 'lists.delete': 'Delete list',
      'lists.deleteConfirm': 'Delete \u201C{name}\u201D and its {n} tasks? This can\u2019t be undone.',
      'lists.deleteConfirmEmpty': 'Delete \u201C{name}\u201D?',
      'lists.empty': 'Group tasks into lists, for example one per subject or project.',

      'habits.title': 'Habits', 'habits.new': 'New habit', 'habits.namePh': 'e.g. Read 20 minutes',
      'habits.days': 'Days',
      'sch.all': 'Every day', 'sch.weekdays': 'Weekdays', 'sch.weekend': 'Weekend',
      'habits.create': 'Create habit', 'habits.delete': 'Delete habit',
      'habits.deleteConfirm': 'Delete \u201C{name}\u201D and its history? This can\u2019t be undone.',
      'habits.streak': 'Current streak', 'habits.best': 'Best streak',
      'habits.day': 'day', 'habits.daysUnit': 'days',
      'habits.regularity': 'Last {n} weeks',
      'habits.empty': 'Habits are things you check off every day, like a workout or reading. Create your first one.',
      'habits.calHint': 'Tap a past day to mark it done or not done.',

      'set.title': 'Settings', 'set.account': 'Account', 'set.local': 'This device only',
      'set.sync': 'Sync',
      'sync.idle': 'Up to date', 'sync.saving': 'Saving\u2026', 'sync.offline': 'Offline, will retry', 'sync.error': 'Sync problem, reloading',
      'set.signOut': 'Sign out', 'set.leaveLocal': 'Leave local mode',
      'set.appearance': 'Appearance', 'set.theme': 'Theme', 'set.accent': 'Accent color',
      'set.accentAuto': 'Theme default', 'set.custom': 'Custom color',
      'set.language': 'Language', 'set.behaviour': 'Behavior',
      'set.haptics': 'Haptic feedback', 'set.hapticsNote': 'On iPhone, requires iOS 18 or later.',
      'set.data': 'Data',
      'set.exportJson': 'Export backup (JSON)', 'set.import': 'Import backup (JSON)',
      'set.importConfirm': 'Replace all your current lists, tasks and habits with this backup? This can\u2019t be undone.',
      'set.importBtn': 'Replace my data', 'set.imported': 'Backup imported',
      'set.importBad': 'This file isn\u2019t a PocketDo backup.', 'set.importFail': 'Import failed: {msg}',
      'set.about': 'About', 'set.version': 'Version {v}',

      'theme.auto': 'Auto', 'theme.light': 'Light', 'theme.dark': 'Dark', 'theme.amoled': 'AMOLED',
      'theme.glacier': 'Glacier', 'theme.lavender': 'Lavender', 'theme.rose': 'Ros\u00E9', 'theme.matcha': 'Matcha',
      'theme.midnight': 'Midnight', 'theme.forest': 'Forest', 'theme.ember': 'Ember', 'theme.mono': 'Mono',

      'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.done': 'Done',
      'common.close': 'Close', 'common.undo': 'Undo', 'common.back': 'Back',
      'err.save': 'A change couldn\u2019t be saved: {msg}',
      'offline': 'You\u2019re offline. Changes will sync when the connection is back.',
      'days2': ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    },

    fr: {
      'tagline': 'Tes t\u00E2ches et tes habitudes, synchronis\u00E9es sur tous tes appareils.',
      'nav.today': 'Aujourd\u2019hui', 'nav.lists': 'Listes', 'nav.habits': 'Habitudes', 'nav.settings': 'R\u00E9glages',

      'auth.email': 'E-mail', 'auth.password': 'Mot de passe',
      'auth.signIn': 'Se connecter', 'auth.signUp': 'Cr\u00E9er le compte',
      'auth.toSignUp': 'Cr\u00E9er un compte', 'auth.toSignIn': 'J\u2019ai d\u00E9j\u00E0 un compte',
      'auth.forgot': 'Mot de passe oubli\u00E9' + NB + '?',
      'auth.resetSent': 'Si un compte existe pour {email}, un lien de r\u00E9initialisation arrive. Ouvre-le, choisis un nouveau mot de passe, puis connecte-toi ici.',
      'auth.confirmSent': 'Compte cr\u00E9\u00E9. Confirme-le avec le lien envoy\u00E9 \u00E0 {email}, puis connecte-toi ici.',
      'auth.enterEmail': 'Saisis d\u2019abord ton adresse e-mail.',
      'auth.badLogin': 'E-mail ou mot de passe incorrect.',
      'auth.notConfirmed': 'Confirme ton e-mail avec le lien re\u00E7u, puis reconnecte-toi.',
      'auth.pwShort': 'Le mot de passe doit contenir au moins 6 caract\u00E8res.',
      'auth.fail': 'Une erreur est survenue' + NB + ': {msg}',
      'auth.notConfigured': 'La synchronisation n\u2019est pas encore configur\u00E9e. Ajoute l\u2019URL et la cl\u00E9 de ton projet Supabase dans config.js (voir le README), ou essaie PocketDo sur cet appareil uniquement.',
      'auth.localMode': 'Utiliser sur cet appareil uniquement',
      'auth.newPassword': 'Choisis un nouveau mot de passe',
      'auth.savePassword': 'Enregistrer le mot de passe',
      'auth.passwordSaved': 'Mot de passe enregistr\u00E9. Utilise-le pour te connecter sur tes autres appareils.',
      'auth.loadFail': 'Impossible de charger tes donn\u00E9es' + NB + ': {msg}',
      'auth.sdkFail': 'PocketDo n\u2019arrive pas \u00E0 joindre le service de synchronisation. V\u00E9rifie ta connexion, puis r\u00E9essaie.',
      'auth.retry': 'R\u00E9essayer',

      'today.title': 'Aujourd\u2019hui', 'today.habits': 'Habitudes', 'today.tasks': 'T\u00E2ches', 'today.overdue': 'En retard',
      'today.doneToday': 'Termin\u00E9es aujourd\u2019hui ({n})',
      'today.empty': 'Rien de pr\u00E9vu aujourd\u2019hui. Ajoute une t\u00E2che ici, ou donne une date \u00E0 une t\u00E2che pour la voir sur cette page.',
      'today.allDone': 'Tout est fait pour aujourd\u2019hui.',
      'today.noHabits': 'Aucune habitude pr\u00E9vue aujourd\u2019hui.',
      'today.addHabits': 'Cr\u00E9er des habitudes',
      'today.progress': '{done} sur {total} faits aujourd\u2019hui',

      'task.add': 'Ajouter une t\u00E2che', 'task.inbox': 'G\u00E9n\u00E9ral', 'task.completed': 'Termin\u00E9es ({n})',
      'task.emptyList': 'Aucune t\u00E2che dans cette liste. Ajoutes-en une ci-dessus.',
      'task.title': 'Nom de la t\u00E2che', 'task.notesPh': 'Notes', 'task.list': 'Liste', 'task.date': 'Date',
      'task.none': 'Aucune', 'task.today': 'Aujourd\u2019hui', 'task.tomorrow': 'Demain', 'task.yesterday': 'Hier',
      'task.pick': 'Choisir une date', 'task.repeat': 'R\u00E9p\u00E9ter', 'task.delete': 'Supprimer',
      'task.deleted': 'T\u00E2che supprim\u00E9e', 'task.nextOn': 'Fait. Prochaine' + NB + ': {date}',
      'a11y.check': 'Marquer comme fait', 'a11y.uncheck': 'Marquer comme non fait', 'a11y.more': 'Plus d\u2019options',

      'rep.never': 'Jamais', 'rep.day': 'Jour', 'rep.week': 'Semaine', 'rep.month': 'Mois',
      'rep.everyDay': 'Tous les jours', 'rep.everyNDays': 'Tous les {n} jours',
      'rep.everyWeek': 'Toutes les semaines', 'rep.everyNWeeks': 'Toutes les {n} semaines',
      'rep.everyMonth': 'Tous les mois', 'rep.everyNMonths': 'Tous les {n} mois',

      'lists.title': 'Listes', 'lists.new': 'Nouvelle liste', 'lists.edit': 'Modifier la liste',
      'lists.name': 'Nom', 'lists.namePh': 'ex. Physique', 'lists.color': 'Couleur',
      'lists.create': 'Cr\u00E9er la liste', 'lists.delete': 'Supprimer la liste',
      'lists.deleteConfirm': 'Supprimer \u00AB' + NB + '{name}' + NB + '\u00BB et ses {n} t\u00E2ches' + NB + '? Action irr\u00E9versible.',
      'lists.deleteConfirmEmpty': 'Supprimer \u00AB' + NB + '{name}' + NB + '\u00BB' + NB + '?',
      'lists.empty': 'Regroupe tes t\u00E2ches en listes, par exemple une par mati\u00E8re ou par projet.',

      'habits.title': 'Habitudes', 'habits.new': 'Nouvelle habitude', 'habits.namePh': 'ex. Lire 20 minutes',
      'habits.days': 'Jours',
      'sch.all': 'Tous les jours', 'sch.weekdays': 'En semaine', 'sch.weekend': 'Le week-end',
      'habits.create': 'Cr\u00E9er l\u2019habitude', 'habits.delete': 'Supprimer l\u2019habitude',
      'habits.deleteConfirm': 'Supprimer \u00AB' + NB + '{name}' + NB + '\u00BB et son historique' + NB + '? Action irr\u00E9versible.',
      'habits.streak': 'S\u00E9rie actuelle', 'habits.best': 'Meilleure s\u00E9rie',
      'habits.day': 'jour', 'habits.daysUnit': 'jours',
      'habits.regularity': '{n} derni\u00E8res semaines',
      'habits.empty': 'Les habitudes sont des choses \u00E0 cocher chaque jour, comme le sport ou la lecture. Cr\u00E9e ta premi\u00E8re.',
      'habits.calHint': 'Touche un jour pass\u00E9 pour le marquer comme fait ou non.',

      'set.title': 'R\u00E9glages', 'set.account': 'Compte', 'set.local': 'Cet appareil uniquement',
      'set.sync': 'Synchronisation',
      'sync.idle': '\u00C0 jour', 'sync.saving': 'Enregistrement\u2026', 'sync.offline': 'Hors ligne, nouvel essai bient\u00F4t', 'sync.error': 'Probl\u00E8me de synchro, rechargement',
      'set.signOut': 'Se d\u00E9connecter', 'set.leaveLocal': 'Quitter le mode local',
      'set.appearance': 'Apparence', 'set.theme': 'Th\u00E8me', 'set.accent': 'Couleur d\u2019accent',
      'set.accentAuto': 'Couleur du th\u00E8me', 'set.custom': 'Couleur personnalis\u00E9e',
      'set.language': 'Langue', 'set.behaviour': 'Comportement',
      'set.haptics': 'Retour haptique', 'set.hapticsNote': 'Sur iPhone, n\u00E9cessite iOS 18 ou plus r\u00E9cent.',
      'set.data': 'Donn\u00E9es',
      'set.exportJson': 'Exporter une sauvegarde (JSON)', 'set.import': 'Importer une sauvegarde (JSON)',
      'set.importConfirm': 'Remplacer toutes tes listes, t\u00E2ches et habitudes actuelles par cette sauvegarde' + NB + '? Action irr\u00E9versible.',
      'set.importBtn': 'Remplacer mes donn\u00E9es', 'set.imported': 'Sauvegarde import\u00E9e',
      'set.importBad': 'Ce fichier n\u2019est pas une sauvegarde PocketDo.', 'set.importFail': '\u00C9chec de l\u2019import' + NB + ': {msg}',
      'set.about': '\u00C0 propos', 'set.version': 'Version {v}',

      'theme.auto': 'Auto', 'theme.light': 'Clair', 'theme.dark': 'Sombre', 'theme.amoled': 'AMOLED',
      'theme.glacier': 'Glacier', 'theme.lavender': 'Lavande', 'theme.rose': 'Ros\u00E9', 'theme.matcha': 'Matcha',
      'theme.midnight': 'Minuit', 'theme.forest': 'For\u00EAt', 'theme.ember': 'Braise', 'theme.mono': 'Mono',

      'common.cancel': 'Annuler', 'common.delete': 'Supprimer', 'common.done': 'OK',
      'common.close': 'Fermer', 'common.undo': 'Annuler', 'common.back': 'Retour',
      'err.save': 'Une modification n\u2019a pas pu \u00EAtre enregistr\u00E9e' + NB + ': {msg}',
      'offline': 'Hors ligne. Les modifications seront synchronis\u00E9es au retour de la connexion.',
      'days2': ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
    }
  };

  PT.lang = 'en';
  PT.t = function (key, vars) {
    var dict = D[PT.lang] || D.en;
    var s = key in dict ? dict[key] : (key in D.en ? D.en[key] : key);
    if (vars && typeof s === 'string') {
      s = s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
    }
    return s;
  };
  PT.setLang = function (l) {
    PT.lang = D[l] ? l : 'en';
    document.documentElement.lang = PT.lang;
  };
  PT.deviceLang = function () {
    return String(navigator.language || 'en').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
  };
})();
