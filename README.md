# PocketDo

PocketDo is a minimalist to-do list and daily habit tracker that runs in the browser. It is designed to be added to the iPhone home screen, where it opens as a standalone app, and to be used on a computer in any web browser. Changes made on one device appear on the others automatically.

## Features

**Tasks**
- Lists to group tasks, each with its own colour (for example one list per course or project), plus a General list for everything else
- Optional date, notes and repeat rules: every n days, every n weeks on chosen weekdays, or every n months
- Completing a repeating task moves it to its next date
- Completed tasks are hidden from the active list and can be shown again at any time
- Swipe right to complete, swipe left to delete (with undo), drag the handle to reorder

**Today**
- One page for everything due today: today's habits, overdue tasks and tasks dated today
- A progress ring that fills as you check things off and turns into the PocketDo mark when the day is complete

**Notes**
- Free-text notes for quick lists and ideas, without checkboxes, in the spirit of Apple Notes
- The first line is used as the title in the list, the rest as a preview
- Saved automatically while typing and synced like everything else; empty notes are dropped
- Swipe left in the list to delete a note (with undo)

**Habits**
- Daily checkboxes that reset at midnight
- Each habit runs every day, on weekdays only, or on weekends only
- Current and best streaks, a regularity map of the last weeks, and a monthly calendar where past days can be corrected

**Everything else**
- Automatic sync between devices through Supabase accounts (email and password)
- English and French interface, switchable in Settings
- Twelve themes (Auto, Light, Dark, AMOLED, Glacier, Lavender, Rose, Matcha, Midnight, Forest, Ember, Mono) and a free accent colour
- Haptic feedback on supported phones (Android, and iPhone with iOS 18 or later), can be turned off
- Export of all your data (tasks, habits and notes) as a JSON backup, and import of a backup
- Bottom tab bar on phones, sidebar on larger screens, keyboard shortcut N to add a task on a computer
- Optional local mode that keeps everything on one device without an account

## Project structure

```
index.html            App shell, loading screen, home-screen app tags
style.css             All styles
themes.js             Themes, accent colours and list colours
i18n.js               English and French text
store.js              Data store, sync queue, Supabase and local backends
app.js                Interface: views, sheets, gestures, settings
config.js             Your Supabase project URL and key
manifest.webmanifest  Web app manifest
icons/                App icons and favicon
supabase/schema.sql   Database tables, security rules and realtime setup
```

There is no build step. The only external resources are the Supabase JavaScript client (version 2.78.0, loaded from jsDelivr) and the Instrument Sans font from Google Fonts.

## Setup

### 1. Put the files on GitHub Pages

1. Create a GitHub repository and upload all files, keeping the folder structure.
2. In the repository, open Settings, then Pages, and publish from the main branch (root folder).
3. Note the address GitHub gives you, for example `https://your-name.github.io/PocketDo/`.

Opened at this stage, PocketDo offers to run on the current device only. Sync starts working after the next two steps.

### 2. Create the Supabase project

1. Create a free account on Supabase and a new project.
2. In the project, open SQL Editor, create a new query, paste the content of `supabase/schema.sql` and run it. It creates the tables, turns on Row Level Security so that every account only sees its own data, and enables realtime updates.
3. Open Authentication, then URL Configuration:
   - set Site URL to your GitHub Pages address;
   - add the same address to Redirect URLs.
4. Open Authentication, then Sign In / Providers, and check that Email is enabled. For a small group of known people you can turn off "Confirm email" so new accounts can sign in right away. If you keep it on, new users must click the link in the confirmation email before their first sign-in.

### 3. Connect the app

1. In Supabase, open Project Settings, then API Keys, and copy the publishable key (it starts with `sb_publishable_`). Copy the project URL from the project overview or the Data API page.
2. Paste both into `config.js`:

```js
window.PT_CONFIG = {
  supabaseUrl: 'https://abcdefghijklmnop.supabase.co',
  supabaseKey: 'sb_publishable_...',
  allowSignup: true
};
```

3. Commit the change. GitHub Pages updates within a minute or two.

The publishable key is designed to be public. Access to data is controlled by the Row Level Security rules created by `schema.sql`. Never put the secret key in this file.

### 4. Install on your devices

- **iPhone:** open the address in Safari, tap Share, then Add to Home Screen. Open PocketDo from the new icon and sign in once. The home-screen app keeps its own session, separate from Safari.
- **Computer:** open the address in any browser and sign in with the same account.

## Accounts for friends

With `allowSignup: true`, anyone who has the address can create an account. Each account only sees its own lists, tasks and habits.

To keep the app limited to people you choose:
1. In Supabase, open Authentication, then Sign In / Providers, and turn off new user sign-ups.
2. Set `allowSignup: false` in `config.js` to hide the "Create an account" button.
3. Create each account yourself under Authentication, then Users, then Add user, with an email address and a password, and send the details to your friend.

## Password reset

"Forgot password?" on the sign-in screen sends a reset email. The link opens PocketDo in the browser, where a new password can be chosen. After that, sign in with the new password in the home-screen app and on your other devices.

## Backups

Settings, then Data, offers:
- **Export backup (JSON):** downloads all lists, tasks, habits, habit history and appearance settings. On a phone the share sheet opens, so the file can be saved to Files or sent elsewhere.
- **Import backup (JSON):** replaces all current data of the signed-in account with the content of a backup. This is also how data created in local mode can be moved into an account.

## Local mode

When `config.js` is left empty, the sign-in screen offers to use PocketDo on the current device only. Data is then stored in the browser of that device and is not synced. Leaving local mode keeps the data on the device, and an exported backup can later be imported into an account.

## Updating the app

Replace the changed files in the repository and commit. Data lives in Supabase, so updating the code never touches it. If the home-screen app still shows the previous version, wait a few minutes, close it completely and open it again. The version number is shown at the bottom of Settings.

When an update adds a table (version 1.2 added the notes table), run `supabase/schema.sql` again in the Supabase SQL Editor. The script only adds what is missing and never deletes data. Until then, the Notes page shows a reminder and the rest of the app keeps working.

## Notes

- PocketDo needs an internet connection to sync. Changes made during a short loss of connection are kept and sent again when the connection returns, as long as the app stays open.
- Supabase may pause free projects that stay unused for a long period. A paused project can be restored from the Supabase dashboard without losing data.
- The week starts on Monday in calendars and in the regularity map.
