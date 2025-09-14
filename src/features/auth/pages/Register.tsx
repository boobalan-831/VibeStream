import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ensureProfile, saveProfile } from '../../../services/profileService';
const LOGO_URL = new URL('../../../../icons/VStream-logo.png', import.meta.url).href;

function AuroraBackdrop() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Dark premium background matching the image */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1117] to-[#161b22]" />
      
      {/* Animated music particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              background: `linear-gradient(45deg, #20e3b2, #2cccff)`,
              animation: `float ${Math.random() * 6 + 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
      
      {/* Premium aurora waves */}
      <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g-register" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#20e3b2" />
            <stop offset="50%" stopColor="#2cccff" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <filter id="glow-register">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow-register)">
          <path d="M0,200 Q300,100 600,200 T1200,200" fill="none" stroke="url(#g-register)" strokeWidth="2">
            <animate attributeName="d" dur="14s" repeatCount="indefinite" values="M0,200 Q300,100 600,200 T1200,200; M0,200 Q300,300 600,200 T1200,200; M0,200 Q300,100 600,200 T1200,200" />
          </path>
          <path d="M0,260 Q300,160 600,260 T1200,260" fill="none" stroke="url(#g-register)" strokeWidth="1.5" opacity="0.7">
            <animate attributeName="d" dur="18s" repeatCount="indefinite" values="M0,260 Q300,160 600,260 T1200,260; M0,260 Q300,360 600,260 T1200,260; M0,260 Q300,160 600,260 T1200,260" />
          </path>
        </g>
      </svg>
      
      {/* Subtle music symbols floating */}
      <div className="absolute inset-0 opacity-10">
        {['♪', '♫', '♬', '♩', '♭', '♯'].map((symbol, i) => (
          <div
            key={i}
            className="absolute text-cyan-300 text-xl font-bold"
            style={{
              left: `${20 + i * 15}%`,
              top: `${20 + (i % 3) * 30}%`,
              animation: `musicFloat ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`,
            }}
          >
            {symbol}
          </div>
        ))}
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

function ProfileStepper({ onSave }: { onSave: (data: { display_name: string; handle: string; locale: string }) => Promise<void> }) {
  const { t } = useTranslation('auth');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [locale, setLocale] = useState('en');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">{t('profileTitle')}</h3>
      {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div>}
      <div className="grid grid-cols-1 gap-3">
        <input 
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('displayName')}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40" 
        />
        <input 
          value={handle}
          onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9_]/g, '').slice(0, 20))}
          placeholder={t('handle')}
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/40" 
        />
        <select value={locale} onChange={(e) => setLocale(e.target.value)} className="rounded-lg bg-white/5 border border-white/10 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-400/40">
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
          <option value="ta">தமிழ்</option>
        </select>
      </div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            if (!displayName || !handle) throw new Error('Display name and handle are required');
            await onSave({ display_name: displayName, handle, locale });
          } catch (e: any) {
            setErr(e.message || 'Failed to save');
          } finally {
            setBusy(false);
          }
        }}
        className="w-full rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 py-3 font-semibold text-white shadow-lg hover:shadow-xl transition disabled:opacity-60"
      >
        {busy ? 'Saving…' : t('continue')}
      </button>
    </div>
  );
}

export default function Register() {
  const { actions, phoneNumber, emailVerified, user, error } = useAuth();
  const { t } = useTranslation('auth');

  const showProfile = Boolean(user) && emailVerified;

  React.useEffect(() => {
    // Ensure a profile row exists as soon as we have a user
    if (user?.id) {
      ensureProfile(user.id).catch(() => {});
    }
  }, [user?.id]);

  return (
    <div className="relative min-h-screen w-full text-white flex items-center justify-center">
      <AuroraBackdrop />
      
      {/* Premium glass container */}
      <div className="relative w-full max-w-lg mx-4">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl border border-white/20 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden"
        >
          {/* Premium glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-500/10 opacity-50" />
          
          <div className="relative p-8 space-y-8">
            {/* Header with premium typography and logo */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <img src={LOGO_URL} alt="VibeStream" className="w-12 h-12 rounded-lg shadow ring-1 ring-white/10 object-contain p-0.5" />
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-4xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent"
                >
                  VibeStream
                </motion.div>
              </div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-gray-300 text-lg font-medium"
              >
                Create your Vibe ID
              </motion.p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl p-4 text-sm text-red-200"
              >
                {error}
              </motion.div>
            )}

            {showProfile ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ProfileStepper
                  onSave={async (data) => {
                    if (!user?.id) return;
                    await saveProfile(user.id, { ...data, onboarding_complete: true });
                  }}
                />
              </motion.div>
            ) : phoneNumber ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <OtpInputs 
                  onVerify={(otp) => actions.verifyPhoneOtp(otp)} 
                  onResend={() => actions.resendOtp()} 
                  phone={phoneNumber} 
                />
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <GoogleButton onClick={() => actions.signInWithGoogle()} />
                
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="text-sm font-medium px-4">or</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
                
                <PhoneEntry onSend={(p) => actions.signInWithPhone(p)} />
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
