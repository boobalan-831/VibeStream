import React from "react";
import { VibeStreamProvider } from "./context/VibeStreamContext";
import { AuthProvider } from "./context/AuthContext";
import "./i18n";
import EnhancedMusicApp from "./components/EnhancedMusicApp";
import AuthPrompt from "./features/auth/AuthPrompt";

export default function App() {
  return (
    <AuthProvider>
      <VibeStreamProvider>
        <EnhancedMusicApp />
        <AuthPrompt />
      </VibeStreamProvider>
    </AuthProvider>
  );
}