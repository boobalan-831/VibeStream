import { supabase } from '../lib/supabaseClient';

export type Profile = {
  user_id: string;
  display_name?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  locale?: string | null;
  onboarding_complete?: boolean | null;
};

export async function getProfile(userId: string) {
  return supabase.from('profiles').select('*').eq('user_id', userId).single<Profile>();
}

export async function ensureProfile(userId: string, defaults?: Partial<Profile>) {
  // Upsert a minimal row; relies on RLS insert policy allowing user_id = auth.uid()
  return supabase
    .from('profiles')
    .upsert({ user_id: userId, locale: 'en', ...defaults }, { onConflict: 'user_id' })
    .select()
    .single<Profile>();
}

export async function saveProfile(userId: string, data: Partial<Profile>) {
  return supabase
    .from('profiles')
    .upsert({ user_id: userId, ...data }, { onConflict: 'user_id' })
    .select()
    .single<Profile>();
}
