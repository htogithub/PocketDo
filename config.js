/* PocketDo configuration.
   1. Create a free Supabase project and run supabase/schema.sql in its SQL editor.
   2. Paste the project URL and the publishable key below (Project Settings > API Keys).
      The publishable key is meant to be public: Row Level Security keeps every account's data private.
   Leave both empty to use PocketDo on one device only (local mode). */
window.PT_CONFIG = {
  supabaseUrl: '',   // e.g. 'https://abcdefghijklmnop.supabase.co'
  supabaseKey: '',   // e.g. 'sb_publishable_...'
  allowSignup: true  // set to false to hide "Create an account" on the sign-in screen
};
