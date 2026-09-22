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

// L'aperçu des cartes de chaleur (?vh=apercu) ouvre la page dans un cadre qui fait toute la
// hauteur du document, où rien ne défile : une section épinglée ou révélée au défilement y
// resterait vide. Le site y prend donc sa version sans mouvement, comme ses feuilles de style,
// que le cadre de l'admin récrit de la même façon.
if (new URLSearchParams(location.search).get('vh') === 'apercu') {
  const lire = window.matchMedia.bind(window);
  window.matchMedia = (q: string) =>
    lire(q.replace(/\(prefers-reduced-motion:\s*no-preference\)/g, '(min-width: 100000px)').replace(/\(prefers-reduced-motion(:\s*reduce)?\)/g, '(min-width: 0px)'));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {harnaisDemande && Harnais
      ? <Suspense fallback={null}><Harnais /></Suspense>
      : <App />}
  </React.StrictMode>,
);
