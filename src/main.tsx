import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeAnnouncer } from "./lib/a11y/screen-reader";
import { registerServiceWorker, isStandalone } from "./lib/pwa/register";

// Initialize screen reader announcer
initializeAnnouncer();

// Register service worker for PWA capabilities
if (import.meta.env.PROD) {
  registerServiceWorker((_registration) => {
    console.log("New version available. Reload to update.");
    // Optionally show update prompt to user
  });

  // Log PWA status
  if (isStandalone()) {
    console.log("Running as installed PWA");
  }
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
