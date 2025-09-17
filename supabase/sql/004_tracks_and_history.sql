-- Tracks catalog (lightweight cache keyed by external id)
create table if not exists public.tracks (
  id text primary key, -- e.g. 'saavn:123456'
  source text not null default 'saavn',
  name text not null,
  artists text[] not null default '{}', -- array of artist names
  image_url text,
  duration_seconds integer,
  album_name text,
  created_at timestamptz default now()
);

alter table public.tracks enable row level security;

-- Anyone can read tracks (non-sensitive), authenticated can insert/upsert
do $$ begin
  create policy tracks_read_all on public.tracks for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy tracks_insert_auth on public.tracks for insert to authenticated with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy tracks_update_auth on public.tracks for update to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

create index if not exists idx_tracks_source on public.tracks(source);
create index if not exists idx_tracks_artists_gin on public.tracks using gin (artists);

-- Upsert helper for tracks
create or replace function public.upsert_track(
  p_id text,
  p_name text,
  p_artists text[],
  p_image_url text,
  p_duration_seconds integer,
  p_album_name text,
  p_source text default 'saavn'
) returns void language sql as $$
  insert into public.tracks (id, name, artists, image_url, duration_seconds, album_name, source)
  values (p_id, p_name, coalesce(p_artists, '{}'), p_image_url, p_duration_seconds, p_album_name, p_source)
  on conflict (id) do update set
    name = excluded.name,
    artists = excluded.artists,
    image_url = excluded.image_url,
    duration_seconds = excluded.duration_seconds,
    album_name = excluded.album_name,
    source = excluded.source;
$$;

-- Recently played log
create table if not exists public.user_recently_played (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null references public.tracks(id) on delete cascade,
  progress_seconds integer,
  device text,
  played_at timestamptz not null default now()
);

alter table public.user_recently_played enable row level security;

do $$ begin
  create policy urp_select_own on public.user_recently_played for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy urp_insert_own on public.user_recently_played for insert to authenticated with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy urp_delete_own on public.user_recently_played for delete to authenticated using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_urp_user_time on public.user_recently_played(user_id, played_at desc);
