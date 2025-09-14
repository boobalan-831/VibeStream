import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AuthModal from './AuthModal';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // For now, show app regardless; modal can be opened from UI when needed.
  return (
    <>
      {children}
      {!user && null /* Place <AuthModal /> when you want to force auth */}
    </>
  );
}
