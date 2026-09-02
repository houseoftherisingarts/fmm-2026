import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '../../contexts/AppContext';
import { CONSENT } from '../../content';
import { enableAnalytics } from '../../firebase';
import { loadMetaPixel } from '../../lib/metaPixel';
import {
  EVENEMENT_OUVERTURE,
  REFUS_COMPLET,
  ecrireConsentement,
  lireConsentement,
  type Choix,
  type Consentement,
} from '../../lib/consentement';

// ─── La bannière de consentement (Loi 25 du Québec) ──────────────────
// Trois finalités, trois interrupteurs, tous éteints tant que la
// personne n'a pas posé de geste. L'article 8.1 demande que les
// fonctions d'identification et de profilage soient désactivées par
// défaut, et les lignes directrices de la Commission d'accès à
// l'information ajoutent qu'un refus doit être aussi facile qu'une
// acceptation. Les deux boutons portent donc exactement le même poids
// visuel.
//
// Rien ne se charge avant l'acceptation de la finalité qui le couvre :
// la mesure d'audience allume Google Analytics, la publicité injecte le
// script d'AdSense, et les contenus tiers chargent le pixel de Meta.

const CLIENT_ADSENSE = 'ca-pub-7365982984401895';

let adsenseCharge = false;

/** Injecte le script d'AdSense, une seule fois, après consentement. */
function chargerAdSense() {
  if (adsenseCharge || typeof document === 'undefined') return;
  adsenseCharge = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ADSENSE}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

/** Met en marche ce qui a été accepté, et rien d'autre. */
export function appliquerConsentement(c: Consentement | null) {
  if (!c) return;
  if (c.mesure) enableAnalytics();
  if (c.publicite) chargerAdSense();
  if (c.tiers) loadMetaPixel();
}

const FINALITES = [
  {
    cle: 'mesure' as const,
    titre: { FR: 'Mesure d\'audience', EN: 'Audience measurement' },
    texte: {
      FR: 'Google Analytics compte les visites et les pages lues, pour que nous sachions ce qui sert vraiment sur ce site.',
      EN: 'Google Analytics counts visits and pages read, so we know which parts of this site are actually useful.',
    },
  },
  {
    cle: 'publicite' as const,
    titre: { FR: 'Publicité', EN: 'Advertising' },
    texte: {
      FR: 'Google AdSense affiche des annonces dans le mur social et avant une partie de jeu. Ces annonces reposent sur un profilage.',
      EN: 'Google AdSense shows ads on the social wall and before a game starts. Those ads rely on profiling.',
    },
  },
  {
    cle: 'tiers' as const,
    titre: { FR: 'Contenus et mesures de tiers', EN: 'Third-party content and measurement' },
    texte: {
      FR: 'Le pixel de Meta et les formulaires de billets et de dons de Zeffy se chargent depuis leurs propres serveurs, hors du Québec.',
      EN: 'The Meta pixel and the Zeffy ticket and donation forms load from their own servers, outside Quebec.',
    },
  },
];

const T = {
  FR: {
    titre: 'Vos témoins et vos données',
    politique: 'Lire la politique de confidentialité',
    refuser: 'Tout refuser',
    enregistrer: 'Enregistrer mes choix',
    fermer: 'Fermer sans changer mes choix',
  },
  EN: {
    titre: 'Your cookies and your data',
    politique: 'Read the privacy policy',
    refuser: 'Decline everything',
    enregistrer: 'Save my choices',
    fermer: 'Close without changing my choices',
  },
};

/** Vrai si une finalité déjà acceptée vient d'être retirée. */
function retrait(avant: Consentement | null, apres: Choix): boolean {
  if (!avant) return false;
  return (avant.mesure && !apres.mesure)
    || (avant.publicite && !apres.publicite)
    || (avant.tiers && !apres.tiers);
}

const ConsentBanner: React.FC = () => {
  const { lang } = useUI();
  const [ouvert, setOuvert] = useState(false);
  const [choix, setChoix] = useState<Choix>(REFUS_COMPLET);

  // Au premier rendu, la décision déjà prise se remet en marche. Une
  // absence de décision ouvre la bannière.
  useEffect(() => {
    const decision = lireConsentement();
    if (decision) appliquerConsentement(decision);
    else setOuvert(true);
  }, []);

  // Le lien « Témoins et vie privée » du pied de page rouvre la
  // bannière, avec les choix courants déjà posés sur les interrupteurs.
  useEffect(() => {
    const rouvrir = () => {
      const decision = lireConsentement();
      setChoix(decision
        ? { mesure: decision.mesure, publicite: decision.publicite, tiers: decision.tiers }
        : REFUS_COMPLET);
      setOuvert(true);
    };
    window.addEventListener(EVENEMENT_OUVERTURE, rouvrir);
    return () => window.removeEventListener(EVENEMENT_OUVERTURE, rouvrir);
  }, []);

  const repondre = useCallback((reponse: Choix) => {
    const avant = lireConsentement();
    const decision = ecrireConsentement(reponse);
    setOuvert(false);
    // Un script déjà en mémoire ne se décharge pas, et un témoin tiers
    // déjà posé ne s'efface pas depuis notre domaine. Le seul retrait
    // qui vaille quelque chose passe donc par un rechargement.
    if (retrait(avant, reponse)) { window.location.reload(); return; }
    appliquerConsentement(decision);
  }, []);

  const t = CONSENT[lang];
  const l = T[lang];
  const dejaRepondu = lireConsentement() !== null;

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 200 }}
          role="dialog"
          aria-label={l.titre}
          className="fixed inset-x-3 bottom-3 md:inset-x-auto md:bottom-6 md:right-6 md:max-w-lg z-[100]"
        >
          <div className="text-parchment p-5 md:p-6 rounded-card border border-[rgba(var(--sk-mustard-rgb),0.35)] bg-[rgba(14,7,10,0.96)] backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.6)] max-h-[82vh] overflow-y-auto">
            <p className="font-display text-base tracking-wide mb-2">{l.titre}</p>
            <p className="font-editorial text-sm leading-relaxed mb-4">{t.body}</p>

            <div className="flex flex-col gap-2 mb-4">
              {FINALITES.map((f) => (
                <Interrupteur
                  key={f.cle}
                  titre={f.titre[lang]}
                  texte={f.texte[lang]}
                  actif={choix[f.cle]}
                  onToggle={() => setChoix((c) => ({ ...c, [f.cle]: !c[f.cle] }))}
                />
              ))}
            </div>

            <Link
              to={lang === 'FR' ? '/politique-de-confidentialite' : '/en/privacy'}
              onClick={() => setOuvert(false)}
              className="inline-block font-sans text-xs underline underline-offset-4 text-brass hover:text-brass-soft transition mb-4"
            >
              {l.politique}
            </Link>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => repondre(REFUS_COMPLET)}
                className="flex-1 min-h-[44px] px-4 py-2 bg-brass text-night hover:bg-brass-soft transition font-sans text-xs uppercase tracking-wider font-semibold rounded-card"
              >
                {l.refuser}
              </button>
              <button
                onClick={() => repondre(choix)}
                className="flex-1 min-h-[44px] px-4 py-2 bg-brass text-night hover:bg-brass-soft transition font-sans text-xs uppercase tracking-wider font-semibold rounded-card"
              >
                {l.enregistrer}
              </button>
            </div>

            {/* Une bannière rouverte depuis le pied de page se referme
                sans rien changer, sinon la personne serait forcée de
                répondre une deuxième fois pour en sortir. */}
            {dejaRepondu && (
              <button
                onClick={() => setOuvert(false)}
                className="mt-3 w-full font-sans text-[11px] uppercase tracking-wider text-parchment/60 hover:text-parchment transition"
              >
                {l.fermer}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Interrupteur: React.FC<{
  titre: string;
  texte: string;
  actif: boolean;
  onToggle: () => void;
}> = ({ titre, texte, actif, onToggle }) => (
  <button
    type="button"
    role="switch"
    aria-checked={actif}
    onClick={onToggle}
    className="flex items-start gap-3 text-left p-3 rounded-card border border-stone-light/25 hover:border-brass/60 transition"
  >
    <span
      aria-hidden
      className={`mt-0.5 shrink-0 w-9 h-5 rounded-full transition ${actif ? 'bg-brass' : 'bg-stone-light/30'}`}
    >
      <span className={`block w-4 h-4 mt-0.5 rounded-full bg-night transition-transform ${actif ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </span>
    <span className="min-w-0">
      <span className="block font-sans text-xs uppercase tracking-wider font-semibold">{titre}</span>
      <span className="block font-editorial text-[13px] leading-relaxed text-parchment/75 mt-0.5">{texte}</span>
    </span>
  </button>
);

export default ConsentBanner;
