import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import HarnaisInventaire from './dev/HarnaisInventaire';
import './index.css';

const HARNAIS = true; // TEMPORAIRE : vérification visuelle du survol inventaire, à retirer.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {HARNAIS ? <HarnaisInventaire /> : <App />}
  </React.StrictMode>,
);
