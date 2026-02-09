import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/dark-mode.css";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FieldModeProvider } from "./contexts/FieldModeContext";
import { measurePageLoad } from "./utils/performance";
import { registerSW } from "virtual:pwa-register";

// Register service worker for PWA (auto-update on new build)
registerSW({ immediate: true });

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