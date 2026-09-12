import React from 'react';
import MonKiosque from '../components/compte/MonKiosque';
import { planParDefaut, assigner } from '../lib/planMarche';

// ─── Page de test temporaire, RULE -5 ─────────────────────────────────
// Sert uniquement à voir MonKiosque avec un kiosque déjà attribué, sans
// dépendre de Firestore (le doc planMarche/9999 n'existe pas et
// n'existera jamais : signedIn() bloque de toute façon la lecture pour
// un visiteur non connecté). Le plan se fabrique ici, en mémoire, avec
// r2-3 donné au marchand de test. À retirer avec sa route dès que la
// capture d'écran est faite.
const QA_UID = 'mock-qa-test';
const planDeTest = assigner(planParDefaut(9999), 'r2-3', QA_UID);

const QaPlanPage: React.FC = () => (
  <main className="min-h-screen bg-midnight-deep px-4 py-10 md:py-16">
    <div className="max-w-2xl mx-auto">
      <MonKiosque uid={QA_UID} lang="FR" annee={9999} planTest={planDeTest} />
    </div>
  </main>
);

export default QaPlanPage;
