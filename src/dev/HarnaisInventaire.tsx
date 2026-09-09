// Harnais TEMPORAIRE, hors admin, pour capturer le survol de l'inventaire
// sans compte Firebase. Monte les vrais composants (PlanContainer, Ligne,
// Container3D) avec des objets fabriqués, sans toucher Firestore. À
// supprimer après la vérification visuelle (Alex, 9 sept 2026).
import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { PlanContainer, Ligne } from '../pages/admin/sections/InventaireSection';
import { codeDe, type Objet } from '../firebase/inventaire';

const Container3D = lazy(() => import('../pages/admin/sections/inventaire/Container3D'));

const t = Timestamp.now();
const objets: Objet[] = [
  { id: '1', nom: 'Gros chaudron', categorie: 'Cuisine', quantite: 1, detail: '', aVerifier: false, section: 'CD', niveau: 2, profondeur: 'A', statut: 'range', sorti: null, historique: [{ type: 'creation', par: 'Alex', quand: t }] },
  { id: '2', nom: 'Bacs Gastro 1/2', categorie: 'Cuisine', quantite: 6, detail: '', aVerifier: false, section: 'CG', niveau: 1, profondeur: 'B', statut: 'range', sorti: null, historique: [{ type: 'creation', par: 'Alex', quand: t }] },
  { id: '3', nom: 'Tente 10x10', categorie: 'Structures', quantite: 1, detail: '', aVerifier: false, section: 'CF', niveau: 1, profondeur: null, statut: 'range', sorti: null, historique: [{ type: 'creation', par: 'Alex', quand: t }] },
];

export default function HarnaisInventaire() {
  const [survol, setSurvol] = useState<string | null>(null);
  const comptes = useMemo(() => {
    const out: Record<string, { total: number; sortis: number }> = {};
    for (const o of objets) {
      const c = (out[codeDe(o)] ??= { total: 0, sortis: 0 });
      c.total += 1;
    }
    return out;
  }, []);
  return (
    <div style={{ background: '#0B1015', minHeight: '100vh', padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <PlanContainer comptes={comptes} selection={null} survol={survol} onSelect={() => {}} />
          <Suspense fallback={<div>3D…</div>}>
            <Container3D comptes={comptes} selection={null} survol={survol} onSelect={() => {}} />
          </Suspense>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {objets.map((o, i) => (
            <Ligne key={o.id} o={o} qui="Test" categories={[]} onError={() => {}} onSurvol={setSurvol} premiere={i === 0} montrerCode />
          ))}
        </ul>
      </div>
    </div>
  );
}
