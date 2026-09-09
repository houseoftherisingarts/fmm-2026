import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Le harnais de vérification de l'inventaire (Alex, 9 sept 2026) : il monte
// les vrais composants du plan et de la liste avec des objets fabriqués, pour
// capturer le survol sans passer par Firestore ni par un compte d'équipe.
// Il s'ouvre à /?harnais=1 en développement seulement. La garde import.meta.env.DEV
// vaut false au build, donc Rollup retire ce code du bundle de production.
const Harnais = import.meta.env.DEV ? React.lazy(() => import('./dev/HarnaisInventaire')) : null;
const harnaisDemande = import.meta.env.DEV && new URLSearchParams(location.search).get('harnais') === '1';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {harnaisDemande && Harnais
      ? <Suspense fallback={null}><Harnais /></Suspense>
      : <App />}
  </React.StrictMode>,
);
