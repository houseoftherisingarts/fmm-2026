// ─── L'heure du festival ─────────────────────────────────────────────
// Alex, 2026-08-24 : une campagne programmée pour « le 2 septembre à
// 9 h » doit partir à 9 h à Montréal. Pas à Londres, pas à Bogotá, pas
// à l'heure du portable qui a servi à la programmer.
//
// Le problème est réel et il n'est pas théorique. Le navigateur d'Alex
// n'est pas toujours dans le même fuseau que le festival, et Firestore
// ne range que des instants absolus. Entre les deux, il faut quelqu'un
// qui traduise, et c'est ce fichier.
//
// LA MÉTHODE. Nous cherchons l'instant absolu dont l'affichage à
// Montréal donne exactement la date et l'heure demandées. Intl sait
// afficher un instant dans un fuseau donné, alors nous partons d'une
// première approximation et nous corrigeons deux fois. Le premier tour
// rattrape le décalage ordinaire, le second rattrape la nuit du
// changement d'heure, où ce décalage saute d'une heure au milieu de la
// journée. Aucune librairie, aucune table de fuseaux à tenir à jour :
// celle du système fait le travail, et elle est corrigée par les mises
// à jour de Node et du navigateur.
//
// ponytail: une heure qui n'existe pas (2 h 30 la nuit où l'horloge
// saute de 2 h à 3 h en mars) se règle sur l'heure précédente plutôt
// que de lever une erreur. Une infolettre du festival ne part jamais à
// cette heure-là, et le jour où ça compterait, la voie serait de
// refuser la saisie à l'écran plutôt que de compliquer ce calcul.

/** Le fuseau du festival, écrit une seule fois, lu partout. */
export const FUSEAU_FESTIVAL = 'America/Montreal';

/** Le lecteur d'horloge. `hourCycle: 'h23'` plutôt que `hour12: false`,
 *  parce que le second rend « 24 » à minuit dans certains
 *  environnements, et minuit deviendrait alors le lendemain. */
const LECTEUR = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU_FESTIVAL,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});

/**
 * L'heure qu'affiche une horloge de Montréal à cet instant, rendue
 * comme si elle était en temps universel. C'est une valeur de travail,
 * jamais un vrai instant : elle sert uniquement à mesurer le décalage.
 */
function murDeMontreal(instant: number): number {
  const p: Record<string, string> = {};
  for (const m of LECTEUR.formatToParts(instant)) p[m.type] = m.value;
  return Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour), Number(p.minute), Number(p.second),
  );
}

/**
 * L'instant absolu d'une date et d'une heure lues à Montréal.
 *
 * @param date  « 2026-09-02 », telle que la rend un champ de type date.
 * @param heure « 09:00 », telle que la rend un champ de type time.
 */
export function instantDepuisMontreal(date: string, heure: string): Date {
  const [an, mois, jour] = date.split('-').map(Number);
  const [h, min] = heure.split(':').map(Number);
  if (![an, mois, jour, h, min].every(Number.isFinite)) {
    throw new Error('La date ou l’heure est illisible.');
  }

  // Ce que l'horloge de Montréal doit afficher, écrit dans la même
  // monnaie que `murDeMontreal` pour que les deux se comparent.
  const vise = Date.UTC(an, mois - 1, jour, h, min, 0);

  let t = vise;
  for (let tour = 0; tour < 2; tour += 1) t = vise - (murDeMontreal(t) - t);
  return new Date(t);
}

/**
 * Le chemin du retour : un instant absolu redevient la date et l'heure
 * qu'une horloge de Montréal affiche. C'est ce qui remplit les champs
 * quand la page relit une campagne déjà programmée.
 */
export function montrealDepuisInstant(instant: Date): { date: string; heure: string } {
  const mur = new Date(murDeMontreal(instant.getTime())).toISOString();
  return { date: mur.slice(0, 10), heure: mur.slice(11, 16) };
}

/** La même chose, écrite pour être lue : « 2 septembre 2026 à 9 h 00 ». */
export function ecrireHeureMontreal(instant: Date): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: FUSEAU_FESTIVAL,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(instant);
}
