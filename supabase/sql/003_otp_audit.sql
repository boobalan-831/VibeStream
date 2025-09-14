create schema if not exists security;

create table if not exists security.otp_audit (
  id bigserial primary key,
  user_id uuid,
  event text not null, -- otp_send, otp_verify, login
  provider text not null, -- phone, google
  success boolean not null,
  ip_prefix text, -- store /24 prefix only
  ua_hash text,
  created_at timestamptz default now()
);

create index if not exists idx_otp_audit_user_time on security.otp_audit(user_id, created_at desc);

-- retention: requires pg_cron extension (enable in project)
create extension if not exists pg_cron;
select cron.schedule('otp_audit_retention', '0 3 * * *', $$
  delete from security.otp_audit where created_at < now() - interval '30 days';
$$);
