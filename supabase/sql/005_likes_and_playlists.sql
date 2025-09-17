-- Likes (favorites)
create table if not exists public.user_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null references public.tracks(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, track_id)
);

alter table public.user_likes enable row level security;

do $$ begin
  create policy likes_select_own on public.user_likes for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy likes_mutate_own on public.user_likes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_likes_user on public.user_likes(user_id);

-- Playlists
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cover_url text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.playlists enable row level security;

do $$ begin
  create policy playlists_owner_rw on public.playlists for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception when duplicate_object then null; end $$;

-- Collaborators (editors)
create table if not exists public.playlist_collaborators (
  playlist_id uuid references public.playlists(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'editor', -- viewer/editor
  added_at timestamptz default now(),
  primary key (playlist_id, user_id)
);

alter table public.playlist_collaborators enable row level security;

do $$ begin
  create policy pc_select_involved on public.playlist_collaborators for select using (
    auth.uid() = user_id or exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy pc_owner_manage on public.playlist_collaborators for all to authenticated using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
  );
exception when duplicate_object then null; end $$;

-- Now that collaborators table exists, add a read policy on playlists
do $$ begin
  create policy playlists_read_public on public.playlists for select using (
    is_public or auth.uid() = owner_id or exists (
      select 1 from public.playlist_collaborators c where c.playlist_id = id and c.user_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;

-- Playlist tracks
create table if not exists public.playlist_tracks (
  playlist_id uuid references public.playlists(id) on delete cascade,
  track_id text references public.tracks(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  position integer,
  added_at timestamptz default now(),
  primary key (playlist_id, track_id)
);

alter table public.playlist_tracks enable row level security;

do $$ begin
  create policy pt_select_visible on public.playlist_tracks for select using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and (p.is_public or p.owner_id = auth.uid() or exists (
        select 1 from public.playlist_collaborators c where c.playlist_id = playlist_id and c.user_id = auth.uid()
      ))
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy pt_edit_owner_collab on public.playlist_tracks for all to authenticated using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and (p.owner_id = auth.uid() or exists (
        select 1 from public.playlist_collaborators c where c.playlist_id = playlist_id and c.user_id = auth.uid()
      ))
    )
  ) with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and (p.owner_id = auth.uid() or exists (
        select 1 from public.playlist_collaborators c where c.playlist_id = playlist_id and c.user_id = auth.uid()
      ))
    )
  );
exception when duplicate_object then null; end $$;

create index if not exists idx_playlist_tracks_playlist on public.playlist_tracks(playlist_id);
create index if not exists idx_playlist_tracks_track on public.playlist_tracks(track_id);
