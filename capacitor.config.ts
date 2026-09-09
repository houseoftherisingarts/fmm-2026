import type { CapacitorConfig } from '@capacitor/cli';

// Coquille mobile interne : l'app ne charge pas dist/, elle pointe le
// WebView directement sur le site en ligne (déjà temps réel via
// onSnapshot Firestore). dist/ ne sert qu'à satisfaire `cap add`.
// Section inventaire : /admin/inventaire (voir src/App.tsx, route
// "/admin/:section"). Alex, 9 sept 2026.
const config: CapacitorConfig = {
  appId: 'org.festivalmedieval.inventaire',
  appName: 'FMM Inventaire',
  webDir: 'dist',
  server: {
    url: 'https://www.festivalmedievaldemontpellier.org/admin/inventaire',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
