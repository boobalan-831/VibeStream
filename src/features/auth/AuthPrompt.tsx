import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
// Resolve logo for bundling/base path (from src/features/auth -> project root icons)
const LOGO_URL = new URL('../../../icons/VStream-logo.png', import.meta.url).href;

export default function AuthPrompt() {
  const { showAuthModal, authIntent, actions } = useAuth();

  const title = 'Sign in to listen without limits.';
  const subtitle = 'Save songs, download offline, and pick up where you left off.';

  return (
    <AnimatePresence>
      {showAuthModal && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => actions.closeAuthPrompt()} />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-[#0B0F14] border-t border-white/10 shadow-2xl"
          >
            <div className="p-5">
              <div className="h-1 w-12 bg-white/15 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-center mb-3">
                <div className="relative">
                  <img src={LOGO_URL} alt="VibeStream" className="w-10 h-10 rounded-lg shadow ring-1 ring-white/10" />
                </div>
              </div>
              <h3 className="text-white text-xl font-semibold mb-1">{title}</h3>
              <p className="text-gray-300 text-sm mb-4">{subtitle}</p>

              {authIntent && (
                <div className="mb-3 text-xs text-teal-300/90">
                  {authIntent === 'full-play' && 'One tap to play full tracks'}
                  {authIntent === 'save' && 'Sign in to save songs to your library'}
                  {authIntent === 'download' && 'Sign in to enable offline playback'}
                  {authIntent === 'cta' && 'Create your Vibe ID to personalize your experience'}
                </div>
              )}

              <div className="grid gap-3">
                <button
                  onClick={() => actions.signInWithGoogle()}
                  className="w-full rounded-xl bg-white text-gray-900 font-semibold py-3 px-4 shadow hover:shadow-lg transition flex items-center justify-center gap-3"
                >
                  <img alt="" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" />
                  Continue with Google
                </button>
                <button
                  onClick={() => actions.signInWithPhone('+91')}
                  className="w-full rounded-xl bg-white/10 text-white font-semibold py-3 px-4 border border-white/15 hover:bg-white/15 transition"
                >
                  Continue with Phone
                </button>
                <button
                  onClick={() => actions.closeAuthPrompt()}
                  className="w-full rounded-xl bg-transparent text-gray-300 py-2 text-sm hover:text-white"
                >
                  Continue as Guest (preview only)
                </button>
              </div>

              <p className="text-[11px] text-gray-400 mt-4">
                By continuing, you agree to our Terms and Privacy Policy.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
