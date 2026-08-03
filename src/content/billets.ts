// ─── Billetterie : les cartes de la page d'accueil des billets ───────
//
// Les montants viennent des deux billetteries Zeffy, relevés le
// 2026-08-03 sur les pages réelles :
//   • https://www.zeffy.com/fr-CA/ticketing/fmm--2026   (entrées)
//   • https://www.zeffy.com/fr-CA/ticketing/camping-7   (camping)
// Rien n'est inventé ici. Si un prix change sur Zeffy, il faut le
// changer ici aussi : les deux ne sont pas synchronisés.
//
// 🚨 `zeffyAmount` = le montant affiché PAR Zeffy.
// `showBeforeTax` décide de ce que la carte montre :
//   true  -> le montant hors taxes, calculé à partir du montant Zeffy
//   false -> le montant Zeffy tel quel
// Alex veut le prix avant taxes sur les cartes, Zeffy affichant le prix
// taxes comprises. À CONFIRMER avant mise en ligne : si les montants
// Zeffy sont en réalité HORS taxes, il faut passer ce drapeau à false,
// sinon les cartes annonceraient un prix plus bas que la réalité.

export const TPS = 0.05;
export const TVQ = 0.09975;
export const TAX_RATE = TPS + TVQ;          // 14,975 % au Québec

export const showBeforeTax = true;

export interface Billet {
  id:        string;
  /** Montant affiché par Zeffy, en dollars. */
  zeffyAmount: number;
  labelFR:   string;
  labelEN:   string;
  descFR:    string;
  descEN:    string;
  /** Mention courte sous le prix (durée, composition d'un groupe). */
  noteFR?:   string;
  noteEN?:   string;
  /** Vers quelle billetterie Zeffy la carte envoie. */
  billetterie: 'entrees' | 'camping';
  /** Ruban de mise en avant. Deux cartes ne doivent jamais porter la
      même mention : chacune dit pourquoi ELLE se détache. */
  mentionFR?: string;
  mentionEN?: string;
  /** Famille de couleur de la carte. Les billets d'une journée sont
      dans les rouges, les passes fin de semaine dans les verts, le
      camping garde le cuivre du site. */
  teinte:    'rouge' | 'vert' | 'cuivre';
  /** Nuance à l'intérieur de la famille : l'enfant est plus clair,
      l'adulte au milieu, la famille plus veloutée. */
  nuance:    'clair' | 'moyen' | 'profond';
}

export const BILLETS: Billet[] = [
  {
    id: 'enfant-jour',
    zeffyAmount: 20,
    labelFR: 'Enfant, une journée',   labelEN: 'Child, one day',
    descFR: 'Le programme complet et les activités principales, pour la journée de votre choix.',
    descEN: 'The full program and the main activities, for the day of your choice.',
    noteFR: '6 à 16 ans · un jour',    noteEN: 'Ages 6 to 16 · one day',
    billetterie: 'entrees', teinte: 'rouge', nuance: 'clair',
  },
  {
    id: 'adulte-jour',
    zeffyAmount: 35,
    labelFR: 'Adulte, une journée',   labelEN: 'Adult, one day',
    descFR: 'Le programme complet et les activités principales, pour la journée de votre choix.',
    descEN: 'The full program and the main activities, for the day of your choice.',
    noteFR: 'Une personne · un jour',  noteEN: 'One person · one day',
    billetterie: 'entrees', teinte: 'rouge', nuance: 'moyen',
  },
  {
    id: 'famille-jour',
    zeffyAmount: 90,
    labelFR: 'Famille, une journée',  labelEN: 'Family, one day',
    descFR: 'Un billet de groupe qui en contient quatre. Le programme complet pour la journée de votre choix.',
    descEN: 'A group ticket holding four. The full program for the day of your choice.',
    noteFR: '2 adultes, 2 enfants · un jour', noteEN: '2 adults, 2 children · one day',
    billetterie: 'entrees', teinte: 'rouge', nuance: 'profond',
  },
  {
    id: 'enfant-weekend',
    zeffyAmount: 25,
    labelFR: 'Enfant, passe fin de semaine', labelEN: 'Child, weekend pass',
    descFR: 'Les trois jours. Le programme complet et les activités principales, du vendredi au dimanche.',
    descEN: 'All three days. The full program and the main activities, Friday through Sunday.',
    noteFR: '6 à 16 ans · trois jours', noteEN: 'Ages 6 to 16 · three days',
    billetterie: 'entrees', teinte: 'vert', nuance: 'clair',
  },
  {
    id: 'adulte-weekend',
    zeffyAmount: 55,
    labelFR: 'Adulte, passe fin de semaine', labelEN: 'Adult, weekend pass',
    descFR: 'Les trois jours. Le programme complet et les activités principales, du vendredi au dimanche.',
    descEN: 'All three days. The full program and the main activities, Friday through Sunday.',
    noteFR: 'Une personne · trois jours', noteEN: 'One person · three days',
    billetterie: 'entrees', teinte: 'vert', nuance: 'moyen',
    mentionFR: 'Le plus populaire', mentionEN: 'Most popular',
  },
  {
    id: 'famille-weekend',
    zeffyAmount: 125,
    labelFR: 'Famille, passe fin de semaine', labelEN: 'Family, weekend pass',
    descFR: 'Un billet de groupe qui en contient quatre, pour les trois jours du festival.',
    descEN: 'A group ticket holding four, for all three festival days.',
    noteFR: '2 adultes, 2 enfants · trois jours', noteEN: '2 adults, 2 children · three days',
    billetterie: 'entrees', teinte: 'vert', nuance: 'profond',
    mentionFR: 'Le plus avantageux', mentionEN: 'Best value',
  },
  {
    id: 'camping-tente',
    zeffyAmount: 20,
    labelFR: 'Emplacement tente',     labelEN: 'Tent pitch',
    descFR: 'Un emplacement pour une tente ou une petite voiture, à deux pas du village.',
    descEN: 'A pitch for a tent or a small car, a few steps from the village.',
    noteFR: 'Du 25 au 27 septembre',  noteEN: 'September 25 to 27',
    billetterie: 'camping', teinte: 'cuivre', nuance: 'clair',
  },
  {
    id: 'camping-vr',
    zeffyAmount: 40,
    labelFR: 'Emplacement caravane',  labelEN: 'Caravan pitch',
    descFR: 'Un grand emplacement pour une roulotte ou un véhicule récréatif, sur le terrain du festival.',
    descEN: 'A large pitch for a camper or an RV, on the festival grounds.',
    noteFR: 'Du 25 au 27 septembre',  noteEN: 'September 25 to 27',
    billetterie: 'camping', teinte: 'cuivre', nuance: 'profond',
  },
];

// ─── Palettes des cartes ────────────────────────────────────────────
// Journée = rouges (oxblood chaud), passe = verts (forêt profonde),
// camping = cuivre. Dans chaque famille, l'enfant est plus clair,
// l'adulte au milieu, la famille plus veloutée. Tout reste sombre :
// le laiton du cadre et le texte ivoire doivent rester lisibles.
const PALETTE: Record<Billet['teinte'], Record<Billet['nuance'], { halo: string; fond: string; bord: string }>> = {
  rouge: {
    clair:   { halo: 'rgba(168,62,44,0.55)',  fond: '#2c0d10', bord: 'rgba(214,120,92,0.40)' },
    moyen:   { halo: 'rgba(140,42,32,0.55)',  fond: '#240a0e', bord: 'rgba(196,94,70,0.38)' },
    profond: { halo: 'rgba(104,26,26,0.60)',  fond: '#1a060b', bord: 'rgba(168,70,58,0.36)' },
  },
  vert: {
    clair:   { halo: 'rgba(62,124,84,0.50)',  fond: '#0d1f16', bord: 'rgba(122,186,140,0.38)' },
    moyen:   { halo: 'rgba(42,98,68,0.52)',   fond: '#091810', bord: 'rgba(96,158,116,0.36)' },
    profond: { halo: 'rgba(28,74,54,0.58)',   fond: '#06110c', bord: 'rgba(78,132,98,0.34)' },
  },
  cuivre: {
    clair:   { halo: 'rgba(154,96,44,0.50)',  fond: '#241407', bord: 'rgba(216,176,90,0.38)' },
    moyen:   { halo: 'rgba(132,80,36,0.52)',  fond: '#1d1006', bord: 'rgba(200,158,78,0.36)' },
    profond: { halo: 'rgba(110,64,28,0.55)',  fond: '#160c05', bord: 'rgba(184,142,66,0.34)' },
  },
};

/** Fond dégradé d'une carte, selon sa teinte et sa nuance. */
export function carteFond(b: Billet, recto = false): { background: string; borderColor: string } {
  const p = PALETTE[b.teinte][b.nuance];
  const pos = recto ? '50% 0%' : '50% 32%';
  return {
    background:
      `radial-gradient(ellipse 72% 52% at ${pos}, ${p.halo} 0%, transparent 62%),` +
      `linear-gradient(168deg, ${p.fond} 0%, #100309 62%, #070205 100%)`,
    borderColor: p.bord,
  };
}

/** Montant à afficher sur la carte, selon le drapeau `showBeforeTax`. */
export function displayAmount(b: Billet): number {
  return showBeforeTax ? b.zeffyAmount / (1 + TAX_RATE) : b.zeffyAmount;
}

/** « 30,44 $ » en français, « $30.44 » en anglais. */
export function formatAmount(n: number, lang: 'FR' | 'EN'): string {
  const v = n.toFixed(2).replace(/\.00$/, '');
  return lang === 'FR' ? `${v.replace('.', ',')} $` : `$${v}`;
}
