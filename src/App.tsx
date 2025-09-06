import React from "react";
import { VibeStreamProvider } from "./context/VibeStreamContext";
import EnhancedMusicApp from "./components/EnhancedMusicApp";

export default function App() {
  return (
    <VibeStreamProvider>
      <EnhancedMusicApp />
    </VibeStreamProvider>
  );
}