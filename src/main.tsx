import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/dark-mode.css";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FieldModeProvider } from "./contexts/FieldModeContext";
import { measurePageLoad } from "./utils/performance";

// Register service worker only in production via dynamic import (avoids virtual:pwa-register in dev).
if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

// Measure page load performance
measurePageLoad();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <ThemeProvider>
      <FieldModeProvider>
        <App />
      </FieldModeProvider>
    </ThemeProvider>
  </AuthProvider>
);