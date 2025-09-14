import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
	// eslint-disable-next-line no-console
	console.warn('[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnon || '', {
	auth: {
		persistSession: true,
		detectSessionInUrl: true,
		autoRefreshToken: true,
	},
});

export type { User, Session } from '@supabase/supabase-js';
