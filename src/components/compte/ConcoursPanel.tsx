import React, { useEffect, useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { GildedFrame } from '../marche/atmospherics';
import {
  PRIX_CONCOURS_WJW, normaliserCourriel, participerConcoursAvecCompte, type ParticipationWJW,
} from '../../firebase/concoursWJW';

// ─── Le concours dans l'espace du membre ────────────────────────────
// La participation vit ici : dès que la personne s'inscrit, sa fiche
// dit qu'elle est dans le chapeau, et le jour du tirage l'équipe pose
// `gagnant` sur son document et la fiche l'annonce. Aucun courriel de
// gagnant à envoyer à la main, aucune page à part.
//
// Depuis le 30 août 2026 : une personne pas encore inscrite participe
// d'un clic depuis ici (« Participer avec mon compte »), et le nombre
// de chances (les jours 7 des récompenses quotidiennes) se lit sous
// l'annonce.

const ConcoursPanel: React.FC<{ email: string }> = ({ email }) => {
  const [part, setPart] = useState<ParticipationWJW | null | undefined>(undefined);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !email) { setPart(null); return; }
    return onSnapshot(
      doc(db, 'concoursWJW', normaliserCourriel(email)),
      (s) => setPart(s.exists() ? (s.data() as ParticipationWJW) : null),
      () => setPart(null),
    );
  }, [email]);

  const participer = async () => {
    setEnvoi(true); setErreur(null);
    try { await participerConcoursAvecCompte(); }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
    finally { setEnvoi(false); }
  };

  // Tant que la lecture n'a pas répondu, la fiche ne dit rien.
  if (part === undefined) return null;

  const prix = part && typeof part.gagnant === 'number' ? PRIX_CONCOURS_WJW[part.gagnant] : null;
  const chances = part?.chances || 1;

  return (
    <GildedFrame tone="amber" active={!!prix} className="block mt-8">
      <div className="caravan-glass px-6 py-6 md:px-8 md:py-7">
        <div className="flex items-start gap-4">
          <span className="shrink-0 mt-1" style={{ color: 'var(--color-amber-glow)' }}><Gift size={22} /></span>
          <div className="min-w-0 flex-1">
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
            ) : part ? (
              <>
                <p className="font-display title-medieval text-2xl md:text-3xl text-ivory leading-tight mb-2">
                  Vous êtes dans le chapeau.
                </p>
                <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed">
                  Le tirage a lieu le dimanche 27 septembre au matin. Le résultat s’affiche
                  ici même, dans votre espace.
                </p>
                <p className="font-sans uppercase tracking-[0.18em] text-[10px] mt-3" style={{ color: 'var(--color-amber-glow)' }}>
                  {chances > 1
                    ? `${chances} chances dans le chapeau · le 7e jour des récompenses quotidiennes en ajoute une`
                    : 'Une chance dans le chapeau · le 7e jour des récompenses quotidiennes en ajoute une'}
                </p>
              </>
            ) : (
              <>
                <p className="font-display title-medieval text-2xl md:text-3xl text-ivory leading-tight mb-2">
                  Trois prix à gagner.
                </p>
                <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-4">
                  Un coffret William J. Walter, une place au Banquet du Prince William et un
                  certificat-cadeau de 50 $. Votre nom et votre courriel entrent dans le chapeau
                  tels qu'ils sont dans votre espace, et ils sont remis à William J. Walter pour
                  ses nouvelles et ses offres.
                </p>
                <button type="button" onClick={participer} disabled={envoi}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-card font-sans uppercase tracking-[0.16em] text-[11px] transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(216,176,90,0.18)', border: '1px solid rgba(216,176,90,0.7)', color: '#F4EFE3' }}>
                  {envoi ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />}
                  Participer avec mon compte
                </button>
                {erreur && <p className="mt-3 font-sans text-xs" style={{ color: '#D8B05A' }}>{erreur}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </GildedFrame>
  );
};

export default ConcoursPanel;
