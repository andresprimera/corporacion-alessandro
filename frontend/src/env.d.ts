/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPPORTED_LOCALES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
