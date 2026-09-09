import type { CapacitorConfig } from '@capacitor/cli';

// Coquille mobile interne : l'app ne charge pas de bundle local, elle
// pointe le WebView directement sur le site en ligne (déjà temps réel
// via onSnapshot Firestore). webDir pointe sur capacitor-shell/ (une
// page de secours minuscule) et jamais sur dist/ : dist/ pèse ~1 Go
// (médias du site complet) et gonflait l'APK à 900+ Mo pour rien,
// puisque ce contenu n'est jamais chargé au démarrage normal.
// Section inventaire : /admin/inventaire (voir src/App.tsx, route
// "/admin/:section"). Alex, 9 sept 2026.
const config: CapacitorConfig = {
  appId: 'org.festivalmedieval.inventaire',
  appName: 'FMM Inventaire',
  webDir: 'capacitor-shell',
  server: {
    url: 'https://www.festivalmedievaldemontpellier.org/admin/inventaire',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
