import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, Swords, Compass, BookOpen, Hammer, HeartHandshake, Megaphone, RefreshCw, X } from 'lucide-react';
import { FICHES, GROUPES, type Fonction, type Groupe } from '../../content/placeClan';
import type { Place } from '../../firebase/placeClan';
import Medaillon from '../compte/Medaillon';

export const ICONES: Record<Fonction, React.ReactNode> = {
  souverain: <Crown size={14} />, champion: <Swords size={14} />, eclaireur: <Compass size={14} />,
  sage: <BookOpen size={14} />, batisseur: <Hammer size={14} />, soigneur: <HeartHandshake size={14} />, heraut: <Megaphone size={14} />,
};

// ─── L'équipe de sept, une place par fonction ───────────────────────
// Sert à la page du jeu (avec les gestes : relancer, écarter) et au
// profil (lecture seule). La place de la personne elle-même est marquée.
const EquipeClan: React.FC<{
  groupe: Groupe;
  places: Place[];
  moi?: string | null;
  lienProfil?: boolean;
  onRelancer?: () => void;
  onEcarter?: (uid: string) => void;
  occupe?: boolean;
}> = ({ groupe, places, moi, lienProfil = true, onRelancer, onEcarter, occupe }) => {
  const titres = GROUPES[groupe].titres;
  const vides = places.filter((p) => !p.uid).length;
  return (
    <div>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {places.map((p) => {
          const estMoi = !!moi && p.uid === moi;
          const contenu = (
            <div className="caravan-glass rounded-[15px] p-3.5 h-full flex flex-col gap-2.5 relative"
                 style={{ border: `1px solid rgba(var(--sk-glow-rgb), ${estMoi ? 0.6 : 0.22})` }}>
              <div className="flex items-center gap-2 font-sans uppercase tracking-[0.18em] text-[10px]" style={{ color: 'var(--color-amber-glow)' }}>
                {ICONES[p.fonction]} {titres[p.fonction]}
              </div>
              <div className="flex items-center gap-3 min-w-0">
                {p.membre ? (
                  <>
                    <Medaillon nom={p.membre.nom} hue={p.membre.avatarHue} url={p.membre.avatarUrl} taille={36} />
                    <div className="min-w-0">
                      <div className="font-editorial text-[15px] text-ivory truncate">{estMoi ? 'Vous' : p.membre.nom}</div>
                      <div className="font-sans text-[10px] text-ivory-soft/60">{p.parDefaut ? 'seconde fonction' : FICHES[p.fonction].nom}</div>
                    </div>
                  </>
                ) : (
                  <div className="font-editorial text-[14px] text-ivory-soft/60">Place libre : personne de ce groupe n’a encore ce rôle.</div>
                )}
              </div>
              {onEcarter && p.uid && !estMoi && (
                <button type="button" onClick={() => onEcarter(p.uid!)} disabled={occupe}
                        aria-label="Écarter cette personne"
                        className="absolute top-2 right-2 text-ivory-soft/50 hover:text-ivory transition">
                  <X size={14} />
                </button>
              )}
            </div>
          );
          return (
            <li key={p.fonction}>
              {lienProfil && p.uid && !estMoi ? <Link to={`/profil/${p.uid}`} className="block h-full">{contenu}</Link> : contenu}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {onRelancer && (
          <button type="button" onClick={onRelancer} disabled={occupe}
                  className="inline-flex items-center gap-2 font-sans uppercase tracking-[0.2em] text-[11px]"
                  style={{ color: 'var(--color-amber-glow)' }}>
            <RefreshCw size={13} className={occupe ? 'animate-spin' : ''} /> Relancer l’équipe
          </button>
        )}
        {vides > 0 && (
          <span className="font-editorial text-sm text-ivory-soft/70">
            {vides === 1 ? 'Une place attend encore quelqu’un.' : `${vides} places attendent encore du monde.`} Elles se rempliront au fil des inscriptions.
          </span>
        )}
      </div>
    </div>
  );
};

export default EquipeClan;
