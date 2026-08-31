import React, { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { ecouterAvatar, definirVitrine, MAX_VITRINE, type AvatarChantier } from './avatar';
import { CATALOGUE, COULEUR_RARETE, objetParId } from './objets';

// ─── VitrineObjets : les trouvailles montrées publiquement ────────────
// Jusqu'à trois objets choisis par la personne, affichés sur sa fiche
// avec leur cadre de rareté. En mode editable, un clic sur un objet
// possédé (sac ou équipé) l'ajoute ou le retire de la vitrine.
// Branché par un autre agent sur la fiche membre (Alex, 2026-08-28) :
// props exactes ci-dessous.

interface Props {
  uid: string;
  lang: 'FR' | 'EN';
  editable: boolean;
}

const VitrineObjets: React.FC<Props> = ({ uid, lang, editable }) => {
  const fr = lang === 'FR';
  const [avatar, setAvatar] = useState<AvatarChantier | null>(null);

  useEffect(() => ecouterAvatar(uid, setAvatar), [uid]);

  const possedes = useMemo(() => {
    if (!avatar) return [];
    const equipes = Object.values(avatar.equipe).filter((id): id is string => !!id);
    return Array.from(new Set([...avatar.sac, ...equipes]));
  }, [avatar]);

  if (!avatar) return null;
  const vitrine = avatar.vitrine || [];

  async function basculer(id: string) {
    if (!editable) return;
    const deja = vitrine.includes(id);
    const suivante = deja ? vitrine.filter((v) => v !== id) : [...vitrine, id].slice(0, MAX_VITRINE);
    if (!deja && vitrine.length >= MAX_VITRINE) return;
    await definirVitrine(uid, suivante);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star size={13} className="text-brass" />
        <p className="witcher-stat-label">{fr ? 'Vitrine des trouvailles' : 'Showcase'}</p>
      </div>

      {vitrine.length === 0 ? (
        <p className="font-editorial italic text-xs text-ivory-soft">
          {editable
            ? (fr ? 'Choisissez jusqu’à trois objets à montrer, parmi ceux ci-dessous.' : 'Choose up to three items to show, from those below.')
            : (fr ? 'Rien d’exposé pour le moment.' : 'Nothing on display yet.')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {vitrine.map((id) => {
            const o = objetParId(id);
            if (!o) return null;
            return (
              <div key={id} className="flex flex-col items-center gap-1.5" title={fr ? o.nom.FR : o.nom.EN}>
                <span
                  className="w-14 h-14 rounded-md flex items-center justify-center"
                  style={{
                    background: 'rgba(var(--sk-parchment-rgb),0.05)',
                    border: `1.5px solid ${COULEUR_RARETE[o.rarete]}`,
                    boxShadow: o.rarete !== 'commune' ? `0 0 8px ${COULEUR_RARETE[o.rarete]}` : undefined,
                  }}
                >
                  <span style={{ width: 30, height: 30, borderRadius: 6, background: o.couleur }} />
                </span>
                <span className="font-sans text-[9px] text-ivory-soft/70 text-center max-w-[64px] truncate">
                  {fr ? o.nom.FR : o.nom.EN}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {editable && (
        <div className="pt-4 border-t border-ivory-soft/10">
          <p className="font-editorial text-xs text-ivory-soft/60 mb-3">
            {fr ? `${vitrine.length} / ${MAX_VITRINE} choisis · cliquez pour ajouter ou retirer` : `${vitrine.length} / ${MAX_VITRINE} chosen · click to add or remove`}
          </p>
          <div className="flex flex-wrap gap-2">
            {possedes.length === 0 && (
              <p className="font-editorial italic text-xs text-ivory-soft/50">
                {fr ? 'Rien dans le sac pour le moment.' : 'Nothing in the bag yet.'}
              </p>
            )}
            {possedes.map((id) => {
              const o = CATALOGUE.find((c) => c.id === id);
              if (!o) return null;
              const actif = vitrine.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => basculer(id)}
                  className="w-10 h-10 rounded-md flex items-center justify-center transition"
                  title={fr ? o.nom.FR : o.nom.EN}
                  style={{
                    background: actif ? 'rgba(var(--sk-gilt-rgb),0.22)' : 'rgba(var(--sk-parchment-rgb),0.05)',
                    border: `1px solid ${actif ? 'var(--sk-gilt)' : COULEUR_RARETE[o.rarete]}`,
                  }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: 4, background: o.couleur }} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VitrineObjets;
