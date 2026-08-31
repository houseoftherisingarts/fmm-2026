import React, { useEffect, useState } from 'react';
import { Music, Disc3 } from 'lucide-react';
import { definirPref, suivreFiche } from '../../firebase/ordre';
import { suivreMaBourse, type Bourse } from '../../firebase/montpellois';
import { listGroupes, type GroupeMusical } from '../../firebase/groupesMusicaux';
import { AMBIANCES } from '../../lib/ambiances';

// ─── MusiquePanel : l'ambiance choisie dans l'onglet Profil ──────────
// Alex, 2026-08-28 : trois ambiances du festival, déjà licenciées et
// déjà dans le dépôt (voir src/lib/ambiances.ts), plus les albums
// achetés à la boutique (encore aucun tant que la vente n'est pas
// ouverte — voir BoutiqueMontpellois.tsx). Le choix s'écrit en chemin
// pointé (definirPref) pour ne jamais écraser les autres réglages de
// `prefs`. Branché par un autre agent sur l'onglet Profil (props
// exactes : uid, lang).
//
// Une quatrième ambiance (« Le ménestrel ») s'achète maintenant à la
// boutique pour 1 Montpellois (BoutiqueMontpellois.tsx) : ce panneau
// ne la propose qu'une fois possédée (bourse.ambiances), les trois
// premières restant offertes à tous (Ambiance.gratuite).

interface Props {
  uid: string;
  lang: 'FR' | 'EN';
}

const MusiquePanel: React.FC<Props> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const [choix, setChoix] = useState<string | undefined>();
  const [bourse, setBourse] = useState<Bourse | null>(null);
  const [groupes, setGroupes] = useState<GroupeMusical[]>([]);

  useEffect(() => suivreFiche(uid, (m) => setChoix(m?.prefs?.musique)), [uid]);
  useEffect(() => suivreMaBourse(uid, setBourse), [uid]);
  useEffect(() => { listGroupes().then(setGroupes); }, []);

  const albumsPossedes = groupes.filter((g) => (bourse?.albums || []).includes(g.id));
  const ambiancesProposees = AMBIANCES.filter((a) => a.gratuite || (bourse?.ambiances || []).includes(a.id));

  return (
    <section className="glass-light rounded-lg-card p-7 md:p-8">
      <p className="font-editorial text-brass uppercase tracking-[0.3em] text-xs mb-2">
        <Music size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Musique' : 'Music'}
      </p>
      <h2 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-5">
        {fr ? 'L’ambiance du site' : 'The site’s ambience'}
      </h2>

      <div className="space-y-2">
        {ambiancesProposees.map((a) => {
          const actif = !choix ? a.id === 'festin' : choix === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => definirPref(uid, 'musique', a.id)}
              className="w-full flex flex-col gap-0.5 px-4 py-2.5 rounded-card transition text-left"
              style={{
                background: actif ? 'rgba(var(--sk-gilt-rgb),0.14)' : 'transparent',
                border: `1px solid ${actif ? 'rgba(var(--sk-gilt-rgb),0.5)' : 'rgba(var(--sk-parchment-rgb),0.18)'}`,
              }}
            >
              <span className="font-sans text-sm" style={{ color: actif ? 'var(--sk-gilt)' : 'var(--color-ivory-soft)' }}>
                {fr ? a.titreFR : a.titreEN}
              </span>
              {/* L'attribution exacte de la licence Creative Commons, en
                  entier, jamais coupée (Alex, 2026-08-28). */}
              <span className="font-editorial italic text-[10px] text-ivory-soft/50 break-words">{a.credit}</span>
            </button>
          );
        })}
      </div>

      {albumsPossedes.length > 0 && (
        <div className="mt-6 pt-5 border-t border-ivory-soft/10">
          <p className="witcher-stat-label mb-3">
            <Disc3 size={12} className="inline mr-1.5 -mt-0.5" />{fr ? 'Vos albums' : 'Your albums'}
          </p>
          <div className="space-y-2">
            {albumsPossedes.map((g) => (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={choix === g.id}
                onClick={() => definirPref(uid, 'musique', g.id)}
                className="w-full px-4 py-2.5 rounded-card transition text-left font-sans text-sm"
                style={{
                  background: choix === g.id ? 'rgba(var(--sk-gilt-rgb),0.14)' : 'transparent',
                  border: `1px solid ${choix === g.id ? 'rgba(var(--sk-gilt-rgb),0.5)' : 'rgba(var(--sk-parchment-rgb),0.18)'}`,
                  color: choix === g.id ? 'var(--sk-gilt)' : 'var(--color-ivory-soft)',
                }}
              >
                {g.nom}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="font-editorial italic text-xs text-ivory-soft/50 mt-5">
        {fr
          ? 'D’autres ambiances s’ajoutent en achetant une ambiance ou l’album d’un groupe à la boutique.'
          : 'More ambiences arrive by buying an ambience or a band’s album at the shop.'}
      </p>
    </section>
  );
};

export default MusiquePanel;
