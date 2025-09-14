import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, type Session, type User } from '../lib/supabaseClient';
import { ensureProfile } from '../services/profileService';

type AuthIntent = 'full-play' | 'save' | 'download' | 'cta' | null;

type AuthState = {
	user: User | null;
	session: Session | null;
	loading: boolean;
	error: string | null;
	emailVerified: boolean;
	phoneNumber?: string;
	// Guest and gating state
	isGuest: boolean;
	showAuthModal: boolean;
	authIntent: AuthIntent;
	previewLimitSeconds: number;
	// Pending actions (e.g., resume play after auth)
	pendingPlayTrackId: string | null;
};

type AuthActions = {
	signInWithGoogle: () => Promise<void>;
	signInWithPhone: (e164Phone: string) => Promise<void>;
	verifyPhoneOtp: (otp: string) => Promise<void>;
	resendOtp: () => Promise<void>;
	signInWithEmailMagicLink?: (email: string) => Promise<void>;
	signOut: () => Promise<void>;
	// Modal controls
	openAuthPrompt: (intent?: AuthIntent) => void;
	closeAuthPrompt: () => void;
	setPendingPlayTrackId: (id: string | null) => void;
};

const AuthContext = createContext<(AuthState & { actions: AuthActions }) | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [session, setSession] = useState<Session | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [phoneNumber, setPhoneNumber] = useState<string | undefined>(undefined);
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [authIntent, setAuthIntent] = useState<AuthIntent>(null);
	const [pendingPlayTrackId, setPendingPlayTrackId] = useState<string | null>(null);
	const previewLimitSeconds = 30;

	useEffect(() => {
		let mounted = true;
		(async () => {
			const { data } = await supabase.auth.getSession();
			if (!mounted) return;
			setSession(data.session);
			setUser(data.session?.user ?? null);
			setLoading(false);
		})();

		const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
			setSession(s);
			setUser(s?.user ?? null);
		});
		return () => {
			mounted = false;
			sub.subscription.unsubscribe();
		};
	}, []);

	// Ensure a profile record exists for authenticated users
	useEffect(() => {
		if (!user?.id) return;
		ensureProfile(user.id).catch(() => {});
	}, [user?.id]);

	const emailVerified = useMemo(() => {
		const identities = user?.identities || [];
		// If Google is linked or email_confirmed_at is present, treat as verified
		const providerVerified = identities.some((i) => i.provider === 'google');
		return providerVerified || Boolean(user?.email_confirmed_at);
	}, [user]);

	const isGuest = useMemo(() => !user, [user]);

	const signInWithGoogle = async () => {
		setError(null);
		const redirectTo = window.location.origin;
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo },
		} as any);
		if (error) setError(error.message);
	};

	const signInWithPhone = async (e164Phone: string) => {
		setError(null);
		setPhoneNumber(e164Phone);
		const { error } = await supabase.auth.signInWithOtp({ phone: e164Phone });
		if (error) setError(error.message);
	};

	const verifyPhoneOtp = async (otp: string) => {
		setError(null);
		if (!phoneNumber) {
			setError('Phone number missing');
			return;
		}
		const { error } = await supabase.auth.verifyOtp({ phone: phoneNumber, token: otp, type: 'sms' });
		if (error) setError(error.message);
	};

	const resendOtp = async () => {
		if (!phoneNumber) return;
		const { error } = await supabase.auth.signInWithOtp({ phone: phoneNumber });
		if (error) setError(error.message);
	};

	const signOut = async () => {
		await supabase.auth.signOut();
	};

	const signInWithEmailMagicLink = async (email: string) => {
		setError(null);
		const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
		if (error) setError(error.message);
	};

	const openAuthPrompt = (intent: AuthIntent = null) => {
		setAuthIntent(intent);
		setShowAuthModal(true);
	};

	const closeAuthPrompt = () => {
		setShowAuthModal(false);
		setAuthIntent(null);
	};

	// Auto-close modal on successful auth
	useEffect(() => {
		if (user && showAuthModal) {
			setShowAuthModal(false);
		}
	}, [user, showAuthModal]);

	const value = useMemo(
		() => ({
			user,
			session,
			loading,
			error,
			phoneNumber,
			emailVerified,
			isGuest,
			showAuthModal,
			authIntent,
			previewLimitSeconds,
			pendingPlayTrackId,
			actions: { 
				signInWithGoogle, 
				signInWithPhone, 
				verifyPhoneOtp, 
				resendOtp, 
				signInWithEmailMagicLink,
				signOut,
				openAuthPrompt,
				closeAuthPrompt,
				setPendingPlayTrackId,
			},
		}),
		[
			user, session, loading, error, phoneNumber, emailVerified, isGuest, showAuthModal, authIntent, previewLimitSeconds, pendingPlayTrackId
		]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
};
