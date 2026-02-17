/// <reference types="vite/client" />

// Project-specific environment variables.
// Vite injects variables prefixed with `VITE_` into `import.meta.env`.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

