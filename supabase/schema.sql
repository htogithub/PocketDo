-- PocketDo database schema for Supabase.
-- Run it once: Supabase dashboard > SQL Editor > New query > paste this file > Run.
-- Running it again is safe.

create table if not exists public.lists (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null default '',
  color       text not null default '#64748B',
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id     uuid references public.lists (id) on delete cascade,
  title       text not null default '',
  notes       text not null default '',
  due_date    date,
  prev_due    date,
  repeat      jsonb,
  done        boolean not null default false,
  done_at     timestamptz,
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.habits (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null default '',
  schedule    text not null default 'all' check (schedule in ('all', 'weekdays', 'weekend')),
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.habit_logs (
  habit_id    uuid not null references public.habits (id) on delete cascade,
  day         date not null,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  done        boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (habit_id, day)
);

create table if not exists public.settings (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create index if not exists lists_user_idx      on public.lists (user_id);
create index if not exists tasks_user_idx      on public.tasks (user_id);
create index if not exists tasks_list_idx      on public.tasks (list_id);
create index if not exists habits_user_idx     on public.habits (user_id);
create index if not exists habit_logs_user_idx on public.habit_logs (user_id);

-- Row Level Security: every account only sees and changes its own rows.
do $$
declare t text;
begin
  foreach t in array array['lists', 'tasks', 'habits', 'habit_logs', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Own rows" on public.%I', t);
    execute format(
      'create policy "Own rows" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

grant select, insert, update, delete
  on public.lists, public.tasks, public.habits, public.habit_logs, public.settings
  to authenticated;

-- Realtime: push changes to every open device.
do $$
declare t text;
begin
  foreach t in array array['lists', 'tasks', 'habits', 'habit_logs', 'settings'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
