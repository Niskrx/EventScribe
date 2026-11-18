create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'professor' check (role in ('professor')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.format_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('pdf', 'docx', 'text')),
  source_storage_path text,
  source_description text,
  format_spec jsonb,
  analysis_status text not null default 'pending' check (analysis_status in ('pending', 'ready', 'failed')),
  analysis_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format_profile_id uuid references public.format_profiles(id) on delete set null,
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  department text not null,
  venue text not null,
  coordinator text not null,
  guest text,
  participants jsonb,
  objectives text not null,
  activities text not null,
  outcomes text not null,
  additional_facts text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'generating', 'complete', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  sort_order integer not null default 0,
  caption text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content_json jsonb,
  content_version integer not null default 1,
  docx_storage_path text,
  pdf_storage_path text,
  status text not null default 'draft' check (status in ('draft', 'generating', 'rendering', 'ready', 'failed')),
  generation_model text,
  prompt_version text,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists format_profiles_user_id_idx on public.format_profiles(user_id);
create index if not exists events_user_id_idx on public.events(user_id);
create index if not exists event_photos_event_id_idx on public.event_photos(event_id);
create index if not exists reports_user_id_idx on public.reports(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.format_profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_photos enable row level security;
alter table public.reports enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "format_profiles_own" on public.format_profiles;
create policy "format_profiles_own" on public.format_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "events_own" on public.events;
create policy "events_own" on public.events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "event_photos_own" on public.event_photos;
create policy "event_photos_own" on public.event_photos for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "reports_own" on public.reports;
create policy "reports_own" on public.reports for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('eventscribe-files', 'eventscribe-files', false)
on conflict (id) do nothing;

drop policy if exists "eventscribe_files_select_own" on storage.objects;
create policy "eventscribe_files_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'eventscribe-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eventscribe_files_insert_own" on storage.objects;
create policy "eventscribe_files_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'eventscribe-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eventscribe_files_update_own" on storage.objects;
create policy "eventscribe_files_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'eventscribe-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'eventscribe-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eventscribe_files_delete_own" on storage.objects;
create policy "eventscribe_files_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'eventscribe-files' and (storage.foldername(name))[1] = auth.uid()::text);
