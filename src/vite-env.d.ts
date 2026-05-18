/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_META_PIXEL_ID?: string;
  readonly VITE_ZEFFY_TICKET_URL?: string;
  readonly VITE_SITE_MODE?: 'live' | 'placeholder';
  readonly VITE_AUDIO_TRACK_URL?: string;
  readonly VITE_AUDIO_TRACK_TITLE?: string;
  readonly VITE_ADMIN_EMAILS?: string;
  readonly VITE_ADMIN_DEV_BYPASS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
