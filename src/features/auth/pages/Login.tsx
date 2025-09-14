import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from 'react-i18next';
// Resolve logo from src/features/auth/pages -> project root icons
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
          <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#20e3b2" />
            <stop offset="50%" stopColor="#2cccff" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow)">
          <path d="M0,200 Q300,100 600,200 T1200,200" fill="none" stroke="url(#lg)" strokeWidth="2">
            <animate attributeName="d" dur="14s" repeatCount="indefinite" values="M0,200 Q300,100 600,200 T1200,200; M0,200 Q300,300 600,200 T1200,200; M0,200 Q300,100 600,200 T1200,200" />
          </path>
          <path d="M0,260 Q300,160 600,260 T1200,260" fill="none" stroke="url(#lg)" strokeWidth="1.5" opacity="0.7">
            <animate attributeName="d" dur="18s" repeatCount="indefinite" values="M0,260 Q300,160 600,260 T1200,260; M0,260 Q300,360 600,260 T1200,260; M0,260 Q300,160 600,260 T1200,260" />
          </path>
          <path d="M0,320 Q300,220 600,320 T1200,320" fill="none" stroke="url(#lg)" strokeWidth="1" opacity="0.5">
            <animate attributeName="d" dur="22s" repeatCount="indefinite" values="M0,320 Q300,220 600,320 T1200,320; M0,320 Q300,420 600,320 T1200,320; M0,320 Q300,220 600,320 T1200,320" />
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
      className="relative w-full rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white font-semibold py-4 px-6 shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 disabled:opacity-60 group overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-center justify-center gap-4">
        <img alt="" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-6 w-6" />
        <span className="text-lg font-medium">{t('continueWithGoogle')}</span>
      </div>
    </button>
  );
}

function PhoneEntry({ onSend }: { onSend: (phone: string) => void }) {
  const { t } = useTranslation('auth');
  const [phone, setPhone] = useState('+91');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-gray-300">{t('phoneNumber')}</label>
      <div className="relative">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter your phone number"
          className="w-full rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-400/60 transition-all duration-300 text-lg"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-medium">
          +91
        </div>
      </div>
      <button
        onClick={async () => {
          setBusy(true);
          await onSend(phone);
          setBusy(false);
        }}
        disabled={busy}
        className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 py-4 font-semibold text-white shadow-2xl hover:shadow-cyan-500/40 transition-all duration-300 disabled:opacity-60 text-lg"
      >
        {busy ? 'Sending...' : t('sendCode')}
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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-white">Enter verification code</h3>
        <p className="text-sm text-gray-300">We sent a 6-digit code to {phone}</p>
      </div>
      
      <div className="flex justify-center gap-3">
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
              
              // Auto-focus next input
              if (v && idx < 5) {
                const nextInput = document.querySelector(`input[data-index="${idx + 1}"]`) as HTMLInputElement;
                nextInput?.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !d && idx > 0) {
                const prevInput = document.querySelector(`input[data-index="${idx - 1}"]`) as HTMLInputElement;
                prevInput?.focus();
              }
            }}
            data-index={idx}
            className="w-14 h-14 text-center rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-400/60 transition-all duration-300"
          />
        ))}
      </div>
      
      <button
        onClick={() => onVerify(value)}
        disabled={value.length !== 6}
        className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 py-4 font-semibold text-white shadow-2xl hover:shadow-cyan-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
      >
        Verify Code
      </button>
      
      <div className="text-center">
        <button
          disabled={cooldown > 0}
          onClick={onResend}
          className="text-sm text-gray-300 hover:text-white disabled:opacity-50 transition-colors duration-300"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const { actions, phoneNumber, error } = useAuth();
  const { t } = useTranslation('auth');

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
                Sign in to unlock your personalized vibe
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

            {phoneNumber ? (
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
        
        {/* Bottom text with premium styling */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-8"
        >
          <p className="text-gray-400 text-sm">
            New here?{' '}
            <span className="text-transparent bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text font-semibold cursor-pointer hover:from-cyan-200 hover:to-blue-200 transition-all duration-300">
              Create your Vibe ID
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
