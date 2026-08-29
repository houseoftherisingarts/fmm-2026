import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { GildedFrame } from '../marche/atmospherics';
import { PRIX_CONCOURS_WJW, normaliserCourriel } from '../../firebase/concoursWJW';

// ─── Le concours dans l'espace du membre ────────────────────────────
// La participation vit ici : dès que la personne s'inscrit, sa fiche
// dit qu'elle est dans le chapeau, et le jour du tirage l'équipe pose
// `gagnant` sur son document et la fiche l'annonce. Aucun courriel de
// gagnant à envoyer à la main, aucune page à part.

interface Participation {
  inscritLe?: { toDate?: () => Date } | null;
  gagnant?: number | null;   // index du prix gagné, posé par l'équipe
}

const ConcoursPanel: React.FC<{ email: string }> = ({ email }) => {
  const [part, setPart] = useState<Participation | null | undefined>(undefined);

  useEffect(() => {
    if (!db || !email) { setPart(null); return; }
    return onSnapshot(
      doc(db, 'concoursWJW', normaliserCourriel(email)),
      (s) => setPart(s.exists() ? (s.data() as Participation) : null),
      () => setPart(null),
    );
  }, [email]);

  // Pas d'inscription : la fiche ne parle pas d'un concours qu'on n'a
  // pas rejoint.
  if (!part) return null;

  const prix = typeof part.gagnant === 'number' ? PRIX_CONCOURS_WJW[part.gagnant] : null;

  return (
    <GildedFrame tone="amber" active={!!prix} className="block mt-8">
      <div className="caravan-glass px-6 py-6 md:px-8 md:py-7">
        <div className="flex items-start gap-4">
          <span className="shrink-0 mt-1" style={{ color: 'var(--color-amber-glow)' }}><Gift size={22} /></span>
          <div className="min-w-0">
            <p className="font-editorial italic uppercase tracking-[0.4em] text-[11px] mb-2" style={{ color: 'var(--color-amber-glow)' }}>
              Concours William J. Walter
            </p>
            {prix ? (
              <>
                <p className="font-display title-medieval text-2xl md:text-3xl text-ivory leading-tight mb-2">
                  Vous avez gagné.
                </p>
                <p className="font-editorial text-base md:text-lg text-ivory leading-relaxed">
                  {prix.titre}. {prix.detail}. L’équipe du festival vous écrit pour la remise.
                </p>
              </>
            ) : (
              <>
                <p className="font-display title-medieval text-2xl md:text-3xl text-ivory leading-tight mb-2">
                  Vous êtes dans le chapeau.
                </p>
                <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">
                  Le tirage a lieu le dimanche 27 septembre au matin. Le résultat s’affiche
                  ici même, dans votre espace.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </GildedFrame>
  );
};

export default ConcoursPanel;
