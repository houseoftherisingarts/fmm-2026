// ─── La décision de consentement (Loi 25 du Québec) ──────────────────
// La décision vit ici plutôt que dans la bannière, pour deux raisons.
// La première est que le reste du site doit pouvoir la lire sans monter
// la bannière : un bloc d'annonces, par exemple, ne se rend que si la
// finalité « publicité » a été acceptée. La seconde est qu'un refus doit
// produire un effet réel, et un effet ne se déclenche que si quelqu'un
// écoute le changement.
//
// Trois finalités séparées, parce que l'article 14 demande un
// consentement demandé pour chaque fin. La mesure d'audience, la
// publicité et les contenus tiers embarqués sont trois choses
// distinctes, et personne ne les accepte en bloc sans le savoir.
import { useEffect, useState } from 'react';

/** Les trois finalités que la bannière propose, une par interrupteur. */
export interface Choix {
  /** La mesure d'audience du site (Google Analytics par Firebase). */
  mesure: boolean;
  /** La publicité (Google AdSense). */
  publicite: boolean;
  /** Les contenus et les mesures de tiers embarqués (Meta, Zeffy). */
  tiers: boolean;
}

/** La décision enregistrée, avec la trace de son moment et de son texte. */
export interface Consentement extends Choix {
  /** Le moment exact où la personne a répondu, au format ISO 8601. */
  horodatage: string;
  /** La version du texte qui lui a été montré quand elle a répondu. */
  version: string;
}

/**
 * La version du texte de la bannière. Elle change le jour où le texte
 * change, et ce jour-là chaque personne est reconsultée : un
 * consentement porte sur ce qui a été lu, pas sur une case cochée.
 */
export const VERSION_TEXTE = '2026-09-02';

const CLE = 'fmm.consentement.v2';

/**
 * L'ancienne clé, du temps où la bannière ne connaissait que deux
 * réponses. Un « accepted » d'alors valait les trois finalités, puisque
 * le seul bouton d'acceptation les ouvrait toutes; un « declined »
 * valait les trois refus. La reprise se fait une seule fois, à la
 * première lecture, et l'ancienne clé disparaît ensuite.
 */
const CLE_ANCIENNE = 'fmm.consent.v1';

export const REFUS_COMPLET: Choix = { mesure: false, publicite: false, tiers: false };
export const ACCEPTATION_COMPLETE: Choix = { mesure: true, publicite: true, tiers: true };

const abonnes = new Set<(c: Consentement | null) => void>();

function valide(brut: unknown): Consentement | null {
  if (!brut || typeof brut !== 'object') return null;
  const o = brut as Record<string, unknown>;
  if (typeof o.mesure !== 'boolean' || typeof o.publicite !== 'boolean' || typeof o.tiers !== 'boolean') return null;
  return {
    mesure: o.mesure,
    publicite: o.publicite,
    tiers: o.tiers,
    horodatage: typeof o.horodatage === 'string' ? o.horodatage : '',
    version: typeof o.version === 'string' ? o.version : '',
  };
}

function reprendreAncienneCle(): Consentement | null {
  const ancien = localStorage.getItem(CLE_ANCIENNE);
  if (ancien !== 'accepted' && ancien !== 'declined') return null;
  const repris: Consentement = {
    ...(ancien === 'accepted' ? ACCEPTATION_COMPLETE : REFUS_COMPLET),
    horodatage: new Date().toISOString(),
    version: 'v1',
  };
  localStorage.setItem(CLE, JSON.stringify(repris));
  localStorage.removeItem(CLE_ANCIENNE);
  return repris;
}

/**
 * La décision enregistrée, ou `null` si la personne n'a jamais répondu.
 * Un `null` veut dire « rien n'est accepté et la bannière doit
 * paraître », jamais « on peut y aller ».
 */
export function lireConsentement(): Consentement | null {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) return valide(JSON.parse(brut));
    return reprendreAncienneCle();
  } catch {
    return null;
  }
}

/** Enregistre la réponse, puis prévient tout ce qui l'écoute. */
export function ecrireConsentement(choix: Choix): Consentement {
  const decision: Consentement = {
    mesure: choix.mesure,
    publicite: choix.publicite,
    tiers: choix.tiers,
    horodatage: new Date().toISOString(),
    version: VERSION_TEXTE,
  };
  try {
    localStorage.setItem(CLE, JSON.stringify(decision));
    localStorage.removeItem(CLE_ANCIENNE);
  } catch {
    /* Un navigateur en navigation privée refuse parfois d'écrire. La
       décision tient alors le temps de la visite, et la bannière
       reparaîtra au retour. */
  }
  for (const cb of abonnes) cb(decision);
  return decision;
}

/** Efface la décision. La bannière reparaîtra à la prochaine lecture. */
export function effacerConsentement(): void {
  try {
    localStorage.removeItem(CLE);
    localStorage.removeItem(CLE_ANCIENNE);
  } catch {
    /* noop */
  }
  for (const cb of abonnes) cb(null);
}

/**
 * S'abonner au changement de décision. Rend la fonction qui met fin à
 * l'abonnement. C'est ce qui permet à une page déjà affichée de retirer
 * ses blocs d'annonces sans être rechargée.
 */
export function abonnerConsentement(cb: (c: Consentement | null) => void): () => void {
  abonnes.add(cb);
  return () => { abonnes.delete(cb); };
}

/** La décision, lue et suivie depuis un composant React. */
export function useConsentement(): Consentement | null {
  const [decision, setDecision] = useState<Consentement | null>(null);
  useEffect(() => {
    setDecision(lireConsentement());
    return abonnerConsentement(setDecision);
  }, []);
  return decision;
}

/** Vrai si cette finalité, et elle seule, a été acceptée. */
export function accepte(finalite: keyof Choix): boolean {
  return lireConsentement()?.[finalite] === true;
}

/**
 * L'événement qui rouvre la bannière avec les choix courants. Le lien
 * « Témoins et vie privée » du pied de page le lance, et la bannière
 * l'écoute. La Commission demande qu'un retrait soit aussi facile qu'un
 * consentement : ce chemin-là est le retrait.
 */
export const EVENEMENT_OUVERTURE = 'fmm:consentement:ouvrir';

export function ouvrirBanniereConsentement(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EVENEMENT_OUVERTURE));
}
