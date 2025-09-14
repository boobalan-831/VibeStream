import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

function AuroraBackdrop() {
	return (
		<div className="absolute inset-0 overflow-hidden">
			<div className="absolute -inset-32 opacity-60 blur-3xl">
				<div className="animate-pulse-slow">
					<svg width="100%" height="100%">
						<defs>
							<linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
								<stop offset="0%" stopColor="#20e3b2" />
								<stop offset="100%" stopColor="#2cccff" />
							</linearGradient>
						</defs>
						<circle cx="30%" cy="30%" r="200" fill="url(#g)" />
						<circle cx="70%" cy="60%" r="260" fill="url(#g)" opacity="0.6" />
					</svg>
				</div>
			</div>
		</div>
	);
}

function GoogleButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
	const { t } = useTranslation('auth');
	return (
		<button
			onClick={onClick}
			disabled={loading}
			className="relative w-full rounded-xl bg-white/90 text-gray-900 font-semibold py-3 px-4 shadow-lg hover:shadow-xl transition disabled:opacity-60"
		>
			<span className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-300/20 to-sky-300/20 opacity-0 group-hover:opacity-100 transition" />
			<div className="flex items-center justify-center gap-3">
				<img alt="" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" />
				<span>{t('continueWithGoogle')}</span>
			</div>
		</button>
	);
}

function PhoneEntry({ onSend }: { onSend: (phone: string) => void }) {
	const { t } = useTranslation('auth');
	const [phone, setPhone] = useState('+91');
	const [busy, setBusy] = useState(false);
	return (
		<div className="space-y-3">
			<label className="text-sm text-gray-300">{t('phoneNumber')}</label>
			<input
				value={phone}
				onChange={(e) => setPhone(e.target.value)}
				placeholder="+91XXXXXXXXXX"
				className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40"
			/>
			<button
				onClick={async () => {
					setBusy(true);
					await onSend(phone);
					setBusy(false);
				}}
				disabled={busy}
				className="w-full rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 py-3 font-semibold text-white shadow-lg hover:shadow-xl transition disabled:opacity-60"
			>
				{t('sendCode')}
			</button>
		</div>
	);
}

function OtpInputs({ onVerify, onResend, phone }: { onVerify: (otp: string) => void; onResend: () => void; phone: string }) {
	const { t } = useTranslation('auth');
	const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
	const [cooldown, setCooldown] = useState(30);
	React.useEffect(() => {
		const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
		return () => clearInterval(id);
	}, []);
	const value = digits.join('');
	return (
		<div className="space-y-3">
			<p className="text-sm text-gray-300">{t('enterOtp')}</p>
			<div className="flex justify-between gap-2">
				{digits.map((d, idx) => (
					<input
						key={idx}
						inputMode="numeric"
						maxLength={1}
						value={d}
						onChange={(e) => {
							const v = e.target.value.replace(/\D/g, '').slice(0, 1);
							const next = [...digits];
							next[idx] = v;
							setDigits(next);
						}}
						className="w-12 h-12 text-center rounded-lg bg-white/5 border border-white/10 text-white text-xl focus:outline-none focus:ring-2 focus:ring-teal-400/40"
					/>
				))}
			</div>
			<button
				onClick={() => onVerify(value)}
				className="w-full rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 py-3 font-semibold text-white shadow-lg hover:shadow-xl transition"
			>
				{t('verify')}
			</button>
			<button
				disabled={cooldown > 0}
				onClick={onResend}
				className="w-full text-sm text-gray-300 hover:text-white disabled:opacity-50"
			>
				{cooldown > 0 ? `${t('resendCode')} (${cooldown}s)` : t('resendCode')}
			</button>
			<p className="text-xs text-gray-400">{phone}</p>
		</div>
	);
}

function ProfileStepper() {
	const { t } = useTranslation('auth');
	return (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold text-white">{t('profileTitle')}</h3>
			<div className="grid grid-cols-1 gap-3">
				<input placeholder={t('displayName')} className="rounded-lg bg-white/5 border border-white/10 px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40" />
				<input placeholder={t('handle')} className="rounded-lg bg-white/5 border border-white/10 px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40" />
				<select className="rounded-lg bg-white/5 border border-white/10 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-400/40">
					<option value="en">English</option>
					<option value="hi">हिन्दी</option>
					<option value="ta">தமிழ்</option>
				</select>
			</div>
			<button className="w-full rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 py-3 font-semibold text-white shadow-lg hover:shadow-xl transition">
				Continue
			</button>
		</div>
	);
}

export default function AuthModal() {
	const { actions, phoneNumber, emailVerified, user, error } = useAuth();
	const { t } = useTranslation('auth');
	const [tab, setTab] = useState<'signin' | 'create'>('signin');

	const showProfile = Boolean(user) && emailVerified;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
			<AuroraBackdrop />
			<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl">
				<div className="mb-6 flex items-center justify-between">
					<div className="flex gap-2">
						<button onClick={() => setTab('signin')} className={clsx('px-3 py-1 rounded-full text-sm', tab === 'signin' ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white')}>{t('signIn')}</button>
						<button onClick={() => setTab('create')} className={clsx('px-3 py-1 rounded-full text-sm', tab === 'create' ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white')}>{t('createAccount')}</button>
					</div>
				</div>

				{error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

				<AnimatePresence mode="wait">
					{showProfile ? (
						<motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
							<ProfileStepper />
						</motion.div>
					) : phoneNumber ? (
						<motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
							<OtpInputs onVerify={(otp) => actions.verifyPhoneOtp(otp)} onResend={() => actions.resendOtp()} phone={phoneNumber} />
						</motion.div>
					) : (
						<motion.div key="entry" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
							<GoogleButton onClick={() => actions.signInWithGoogle()} />
							<div className="flex items-center gap-3 text-gray-400">
								<div className="h-px flex-1 bg-white/10" />
								<span className="text-xs">{t('or')}</span>
								<div className="h-px flex-1 bg-white/10" />
							</div>
							<PhoneEntry onSend={(p) => actions.signInWithPhone(p)} />
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</div>
	);
}

