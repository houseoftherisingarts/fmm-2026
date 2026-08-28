import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Coins } from 'lucide-react';
import { addLocale } from '../../lib/locale';
import { useAuth } from '../../contexts/AuthContext';
import { suivreObjetsDe, type ObjetSouk } from '../../firebase/souk';
import { acheterAuSouk } from '../../firebase/montpellois';
import PieceMontpellois from '../boutique/PieceMontpellois';
import MesObjets from './MesObjets';

// ─── SoukDe : l'onglet « Souk » d'une fiche membre ───────────────────
// Branché depuis FicheMembre.tsx (hors périmètre de cet agent) sur la
// fiche de chaque personne. editable=true (le propriétaire regarde sa
// propre fiche) affiche MesObjets, le formulaire d'ajout + la gestion
// du statut. editable=false affiche la grille en lecture seule, avec
// un lien vers la messagerie pour joindre le vendeur.
interface Props {
  uid: string;
  lang: 'FR' | 'EN';
  editable: boolean;
}

const SoukDe: React.FC<Props> = ({ uid, lang, editable }) => {
  const fr = lang === 'FR';

  if (editable) return <MesObjets uid={uid} lang={lang} />;

  return <VitrineLectureSeule uid={uid} lang={lang} fr={fr} />;
};

const VitrineLectureSeule: React.FC<{ uid: string; lang: 'FR' | 'EN'; fr: boolean }> = ({ uid, lang, fr }) => {
  const [objets, setObjets] = useState<ObjetSouk[]>([]);

  useEffect(() => suivreObjetsDe(uid, setObjets), [uid]);

  const enVente = objets.filter((o) => o.statut !== 'vendu');
  if (enVente.length === 0) {
    return (
      <p className="font-editorial italic text-sm text-ivory-soft">
        {fr ? 'Rien en vente pour le moment.' : 'Nothing for sale right now.'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {enVente.map((o) => (
          <div key={o.id} className="glass-light rounded-lg-card p-4 flex gap-3">
            <div className="w-16 h-16 shrink-0 rounded-card overflow-hidden bg-midnight-deep/50 border border-brass/20">
              {o.photos[0] && <img src={o.photos[0]} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display title-medieval text-sm text-ivory truncate">{o.titre}</p>
              <p className="font-sans text-xs text-brass">{o.prix.toFixed(2)} $</p>
              {o.statut === 'reserve' && (
                <span className="witcher-stat-label">{fr ? 'Réservé' : 'Reserved'}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <Link
        to={addLocale(`/messages/${uid}`, lang)}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card"
      >
        <MessageSquare size={14} /> {fr ? 'Écrire au vendeur' : 'Message the seller'}
      </Link>
    </div>
  );
};

export default SoukDe;
