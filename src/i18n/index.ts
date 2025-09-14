import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    auth: {
      signIn: 'Sign in',
      createAccount: 'Create account',
      continueWithGoogle: 'Continue with Google',
      or: 'or',
      phoneNumber: 'Phone number',
      sendCode: 'Send code',
      resendCode: 'Resend code',
      enterOtp: 'Enter the 6‑digit code',
      verify: 'Verify',
      changeNumber: 'Change number',
      profileTitle: 'Complete your profile',
      displayName: 'Display name',
      handle: 'Handle',
      language: 'Language',
      theme: 'Theme',
      continue: 'Continue',
      signOut: 'Sign out',
      deleteAccount: 'Delete my account',
    },
  },
  hi: {
    auth: {
      signIn: 'साइन इन',
      createAccount: 'खाता बनाएँ',
      continueWithGoogle: 'Google से जारी रखें',
      or: 'या',
      phoneNumber: 'फ़ोन नंबर',
      sendCode: 'कोड भेजें',
      resendCode: 'फिर से भेजें',
      enterOtp: '6 अंकों का कोड दर्ज करें',
      verify: 'सत्यापित करें',
      changeNumber: 'नंबर बदलें',
      profileTitle: 'प्रोफ़ाइल पूर्ण करें',
      displayName: 'प्रदर्शित नाम',
      handle: 'हैंडल',
      language: 'भाषा',
      theme: 'थीम',
      continue: 'जारी रखें',
      signOut: 'साइन आउट',
      deleteAccount: 'मेरा खाता हटाएँ',
    },
  },
  ta: {
    auth: {
      signIn: 'உள்நுழை',
      createAccount: 'கணக்கு உருவாக்க',
      continueWithGoogle: 'Google மூலம் தொடரவும்',
      or: 'அல்லது',
      phoneNumber: 'தொலைபேசி எண்',
      sendCode: 'குறியீட்டை அனுப்பு',
      resendCode: 'மீண்டும் அனுப்பு',
      enterOtp: '6 இலக்க குறியீட்டை உள்ளிடவும்',
      verify: 'சரிபார்',
      changeNumber: 'எண்ணை மாற்று',
      profileTitle: 'சுயவிவரத்தை பூர்த்தி செய்க',
      displayName: 'காணும் பெயர்',
      handle: 'ஹாண்டில்',
      language: 'மொழி',
      theme: 'தீம்',
      continue: 'தொடரவும்',
      signOut: 'வெளியேறு',
      deleteAccount: 'என் கணக்கை நீக்கு',
    },
  },
};

const defaultLng = (import.meta as any).env?.VITE_DEFAULT_LOCALE || 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;