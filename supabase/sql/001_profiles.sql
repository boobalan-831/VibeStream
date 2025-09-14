-- Schema: public.profiles (minimal, non-sensitive)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  handle text unique,
  avatar_url text,
  locale text default 'en',
  onboarding_complete boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- RLS: anyone can read; user can update own; insert via function on first login if desired
do $$ begin
  create policy profiles_read_all on public.profiles for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy profiles_update_own on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy profiles_insert_own on public.profiles for insert to authenticated with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Optional helper trigger for updated_at
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
