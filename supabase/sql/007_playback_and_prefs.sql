-- Continue Listening: save last playback per user
create table if not exists public.user_playback_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  track_id text not null references public.tracks(id) on delete cascade,
  position_seconds integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_playback_state enable row level security;

do $$ begin
  create policy ups_select_own on public.user_playback_state for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ups_upsert_own on public.user_playback_state for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create or replace function public.save_playback_state(p_user uuid, p_track_id text, p_position integer)
returns void language sql as $$
  insert into public.user_playback_state(user_id, track_id, position_seconds)
  values (p_user, p_track_id, greatest(0, coalesce(p_position,0)))
  on conflict (user_id) do update set track_id = excluded.track_id, position_seconds = excluded.position_seconds, updated_at = now();
$$;

-- Music language preferences: extend profiles
do $$ begin
  alter table public.profiles add column music_languages text[] default array['english','hindi'];
exception when duplicate_column then null; end $$;
