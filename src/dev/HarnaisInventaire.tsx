// Harnais de vérification TEMPORAIRE (9 sept 2026) : monte les vrais
// composants de l'inventaire avec trois objets fabriqués, pour capturer
// le survol sans passer par Firestore. Retiré aussitôt les captures faites.
import React, { useCallback, useState } from 'react';
import { PlanContainer, Ligne } from '../pages/admin/sections/InventaireSection';
import type { Objet } from '../firebase/inventaire';

const o = (id: string, nom: string, section: any, niveau: any, profondeur: any): Objet => ({
  id, nom, categorie: 'Cuisine', quantite: 1, detail: '', aVerifier: false, statut: 'range',
  section, niveau, profondeur, sorti: null, historique: [], creeLe: null, maj: null,
} as unknown as Objet);

const OBJETS = [o('a', 'Gros chaudron', 'CD', 2, 'A'), o('b', 'Bacs gris', 'CG', 1, 'B'), o('c', 'Grande tente', 'CF', 1, null)];
const COMPTES: Record<string, { total: number; sortis: number }> = { CD2A: { total: 3, sortis: 0 }, CG1B: { total: 5, sortis: 1 }, CF1: { total: 2, sortis: 0 } };

const HarnaisInventaire: React.FC = () => {
  const [survol, setSurvol] = useState<string | null>(null);
  const entrer = useCallback((c: string) => setSurvol(c), []);
  const sortir = useCallback((c: string) => setSurvol((s) => (s === c ? null : s)), []);
  return (
    <div className="admin-scope" style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 22rem', gap: 24, background: '#0b0709', minHeight: '100vh' }}>
      <div><PlanContainer comptes={COMPTES} selection={null} survol={survol} onSelect={() => {}} /></div>
      <div>
        <p id="etat" data-etat={survol ?? 'aucun'} style={{ color: '#E8B14A', fontSize: 12, marginBottom: 8 }}>survol : {survol ?? 'aucun'}</p>
        <ul>{OBJETS.map((x, i) => <Ligne key={x.id} o={x} qui="Alex" categories={['Cuisine']} onError={() => {}} onEntrer={entrer} onSortir={sortir} premiere={i === 0} montrerCode />)}</ul>
      </div>
    </div>
  );
};
export default HarnaisInventaire;
