import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { VibeStreamProvider } from "./context/VibeStreamContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <VibeStreamProvider>
      <App />
    </VibeStreamProvider>
  </React.StrictMode>
);