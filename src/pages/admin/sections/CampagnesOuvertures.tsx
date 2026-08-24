import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { fmtDate } from '../primitives';
import type { Campagne } from '../../../firebase/campagnes';
import {
  suivreOuvertures, tauxOuverture, type Ouverture,
} from '../../../firebase/campagnesOuvertures';

// ─── Le taux d'ouverture d'une campagne ──────────────────────────────
// Alex, 2026-08-24 : « Ajouter un lien dans la section admin pour que
// l'on sache quelle infolettre a quel taux d'ouverture. »
//
// Deux morceaux, posés dans l'historique de CampagnesSection.tsx et
// tenus ici pour que cette section-là reste intacte pendant que le
// chantier voisin y travaille.
//
//   • `OuverturesCampagne` : la ligne de chiffres sous chaque campagne,
//     qui se déplie sur la liste des gens qui ont ouvert la lettre.
//   • `NoteOuvertures` : ce que la mesure vaut vraiment, sous le
//     tableau. Elle n'est pas décorative : un taux lu comme une vérité
//     mène à de mauvaises décisions d'écriture.
//
// LE PANNEAU EST NATIF. `<details>` fait le pliage tout seul, se pilote
// au clavier et s'annonce correctement aux lecteurs d'écran, sans une
// ligne de code de notre part. Le seul état que React tient ici sert à
// ne pas ouvrir quarante écoutes Firestore pour des listes que personne
// ne regarde.

export const OuverturesCampagne: React.FC<{ campagne: Campagne }> = ({ campagne }) => {
  const [deplie, setDeplie] = useState(false);
  const [liste, setListe]   = useState<Ouverture[]>([]);

  // La lecture ne part qu'au moment où le panneau s'ouvre, et se ferme
  // avec lui. L'historique montre quarante campagnes : quarante écoutes
  // en direct pour trois lignes lues coûteraient cher pour rien.
  useEffect(() => {
    if (!deplie) return;
    return suivreOuvertures(campagne.id, setListe);
  }, [deplie, campagne.id]);

  // Le dénominateur est le nombre de lettres réellement parties. Les
  // envois qui ont échoué ne sont jamais arrivés chez personne, alors
  // les compter ferait baisser le taux pour une raison qui n'a rien à
  // voir avec la lettre.
  const parties  = campagne.envoyes || campagne.destinataires || 0;
  const uniques  = campagne.ouvertures || 0;
  const taux     = tauxOuverture(uniques, parties);

  return (
    <details
      className="mt-3"
      onToggle={(e) => setDeplie((e.currentTarget as HTMLDetailsElement).open)}
      style={{
        borderRadius: 15,
        border: '1px solid var(--admin-line)',
        background: 'rgba(196, 214, 230, 0.02)',
      }}
    >
      <summary
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3.5 py-2.5"
        style={{ cursor: 'pointer', listStyle: 'none', borderRadius: 15 }}
      >
        <Eye size={14} style={{ color: 'var(--admin-accent)', alignSelf: 'center' }} aria-hidden />
        <span
          className="font-display text-[1.35rem] leading-none"
          style={{ color: 'var(--admin-accent)' }}
        >
          {taux} %
        </span>
        <span className="font-sans text-[11px]" style={{ color: 'var(--admin-text-soft)' }}>
          de taux d’ouverture
        </span>
        <span className="font-sans text-[11px] ml-auto" style={{ color: 'var(--admin-text-mute)' }}>
          {uniques === 0
            ? `${campagne.destinataires} destinataires, personne n’a encore ouvert`
            : `${uniques} ${uniques > 1 ? 'personnes' : 'personne'} sur ${campagne.destinataires} destinataires`}
        </span>
      </summary>

      <div
        className="px-3.5 pb-3.5 pt-1"
        style={{ borderTop: '1px solid var(--admin-line)', marginTop: 2 }}
      >
        {liste.length === 0 ? (
          <p className="admin-prose pt-2.5">
            Personne n’a encore ouvert celle-là. Le compte monte de lui-même dès qu’une lettre
            s’ouvre.
          </p>
        ) : (
          <ul className="pt-2">
            {liste.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5"
                style={{ borderBottom: '1px solid var(--admin-line)' }}
              >
                <span className="font-sans text-[12px]" style={{ color: 'var(--admin-text)' }}>
                  {o.courriel}
                </span>
                <span className="font-sans text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                  {fmtDate(o.derniereLe || o.premiereLe)}
                  {o.fois > 1 && ` · ${o.fois} fois`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
};

/** Ce que la mesure vaut vraiment. Elle se pose sous l'historique. */
export const NoteOuvertures: React.FC = () => (
  <p className="admin-prose mt-5" style={{ color: 'var(--admin-text-mute)' }}>
    Un taux d’ouverture ne dit jamais la vérité exacte. Quelqu’un qui lit sa lettre avec les
    images bloquées n’apparaîtra jamais ici, et Gmail garde nos images en mémoire, ce qui fait
    disparaître les relectures : ces deux-là tirent le chiffre vers le bas. Apple Mail tire dans
    l’autre sens et va chercher les images de ses usagers même quand la lettre reste fermée.
    Le nombre affiché plus haut reste donc une approximation. Regarde-le d’une infolettre à
    l’autre : le mouvement t’apprend davantage que le chiffre lui-même.
  </p>
);
