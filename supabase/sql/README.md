# Supabase SQL Migrations

Apply the SQL files in this folder in order using the Supabase SQL Editor:

1. 001_profiles.sql
2. 002_user_private.sql
3. 003_otp_audit.sql
4. 004_tracks_and_history.sql
5. 005_likes_and_playlists.sql
6. 006_recommendations.sql

Notes
- Extensions: These scripts use `pgcrypto` and `pg_cron`. They include `create extension if not exists`, but you can enable them from the Dashboard → SQL as well.
- Idempotency: Most objects are created with `if not exists` and policies are wrapped in `do $$ begin ... exception when duplicate_object then null; end $$;` so re-running should be safe.
- Policy ordering: The `playlists_read_public` policy references `playlist_collaborators`. Ensure 005 is executed as-is; if you saw an error like `relation "public.playlist_collaborators" does not exist`, re-run `005_likes_and_playlists.sql` after the table is created (the file order here already ensures that).
- Cron jobs: If you re-run scripts and get a job name conflict, you can unschedule then recreate:
  - `select cron.unschedule('otp_audit_retention');`
  - `select cron.unschedule('rebuild_user_artist_counts_nightly');`

Verification quick checks
- `select * from public.profiles limit 1;`
- `select * from public.tracks limit 1;`
- `select * from public.user_recently_played limit 1;`
- `select * from public.user_likes limit 1;`
- `select * from public.playlists limit 1;`
- `select * from public.playlist_tracks limit 1;`

Recommendations
- After recording some plays/likes as a user, rebuild your counts and fetch suggestions:
  - `select public.rebuild_user_artist_counts('<USER-UUID>'::uuid);`
  - `select * from public.recommend_tracks('<USER-UUID>'::uuid, 20);`