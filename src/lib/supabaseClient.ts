import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
	// eslint-disable-next-line no-console
	console.error('[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. App will not function properly.');
	console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
	console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnon ? 'SET' : 'MISSING');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnon || '', {
	auth: {
		persistSession: true,
		detectSessionInUrl: true,
		autoRefreshToken: true,
	},
});

export type { User, Session } from '@supabase/supabase-js';
