Supabase Edge Functions (Deno, TypeScript) – deploy from the Supabase dashboard or CLI.

Functions:
- auth-prune-sessions: Enforce max 5 refresh tokens per user.
- auth-audit: Record partial IP (/24), ua_hash, provider, success.
- account-delete: Revoke sessions, delete app rows, then delete auth user.

Env required (Function secrets):
- SERVICE_ROLE_KEY: Supabase service role key

Note: Don’t commit SERVICE_ROLE_KEY. Set via `supabase functions secrets set`.
