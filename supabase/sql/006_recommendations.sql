-- Simple recommendations: gather seed artists from user's recent plays & likes, then suggest top tracks by those artists

create or replace view public.user_seed_artists as
  select user_id, unnest(t.artists) as artist
  from public.user_recently_played rp
  join public.tracks t on t.id = rp.track_id
  where rp.played_at > now() - interval '30 days'
  union all
  select ul.user_id, unnest(t.artists) as artist
  from public.user_likes ul
  join public.tracks t on t.id = ul.track_id;

-- Materialized helper to count artist frequency by user
create table if not exists public.user_artist_counts (
  user_id uuid not null references auth.users(id) on delete cascade,
  artist text not null,
  play_count integer not null default 0,
  primary key (user_id, artist)
);

alter table public.user_artist_counts enable row level security;
do $$ begin
  create policy uac_select_own on public.user_artist_counts for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy uac_mutate_owner on public.user_artist_counts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- Rebuild counts from sources (call periodically or after session end)
create or replace function public.rebuild_user_artist_counts(p_user uuid)
returns void language sql as $$
  delete from public.user_artist_counts where user_id = p_user;
  insert into public.user_artist_counts(user_id, artist, play_count)
  select p_user, artist, count(*)
  from public.user_seed_artists
  where user_id = p_user
  group by artist
  order by count(*) desc;
$$;

-- Recommend top N tracks by seed artists (most frequent first)
create or replace function public.recommend_tracks(p_user uuid, p_limit int default 20)
returns setof public.tracks language sql stable as $$
  select t.*
  from public.user_artist_counts a
  join public.tracks t on t.artists @> array[a.artist]
  where a.user_id = p_user
  order by a.play_count desc, t.created_at desc
  limit p_limit;
$$;

-- Rebuild counts for all users (nightly)
create or replace function public.rebuild_artist_counts_all()
returns void language plpgsql security definer set search_path=public as $$
declare r record;
begin
  for r in select id from auth.users loop
    perform public.rebuild_user_artist_counts(r.id);
  end loop;
end;
$$;

-- Schedule nightly job at 03:10
create extension if not exists pg_cron;
select cron.schedule('rebuild_user_artist_counts_nightly', '10 3 * * *', $$
  select public.rebuild_artist_counts_all();
$$);
