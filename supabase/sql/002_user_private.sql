-- Ensure pgcrypto
create extension if not exists pgcrypto;

create schema if not exists private;

create table if not exists private.user_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  region text,
  phone_last4 text,
  -- Example of encrypted column (store ciphertext)
  enc_notes bytea,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table private.user_private enable row level security;

-- Only owner can access; service role can access implicitly
do $$ begin
  create policy user_private_owner on private.user_private for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- updated_at trigger
create or replace function private.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_user_private_updated_at on private.user_private;
create trigger trg_user_private_updated_at before update on private.user_private for each row execute function private.set_updated_at();
