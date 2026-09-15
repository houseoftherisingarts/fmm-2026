// ─── Le passage d'une animation vers l'horaire public ───────────────
// Le calcul pur, sorti de `src/firebase/animations.ts` pour qu'il
// s'exécute et se vérifie sans Firestore. Ce qui se joue ici n'est pas
// anodin : l'horaire est la page que les visiteurs regardent, et une
// ligne posée deux fois ou effacée par erreur se voit tout de suite.
//
// Le banc d'essai : src/lib/horaireAnimations.test.ts
//
// Les types sont décrits ici en structure plutôt qu'importés, pour que
// le fichier ne tire aucune dépendance : ils correspondent trait pour
// trait à ScheduleItem, ScheduleDay et CreneauAnimation.

export interface LigneHoraire {
  time: string;
  label: string;
  where: string;
  source?: string;
}

export interface JourneeHoraire {
  id: string;
  dateFR: string;
  dateEN: string;
  items: LigneHoraire[];
}

export interface PassageAnimation {
  id: string;
  jour: string;
  heure: string;
  titre: string;
  lieu: string;
  publieLe?: unknown;
}

// Les trois journées de l'édition, telles qu'elles sont créées au
// premier passage. La section Horaire s'en sert pour son squelette et
// la publication d'une animation pour une journée qui n'existe pas
// encore : une seule source, sinon les deux écrans finissent par se
// contredire sur une date.
export function joursParDefaut(): JourneeHoraire[] {
  return [
    { id: 'vendredi', dateFR: 'Vendredi 25 septembre', dateEN: 'Friday September 25',   items: [] },
    { id: 'samedi',   dateFR: 'Samedi 26 septembre',   dateEN: 'Saturday September 26', items: [] },
    { id: 'dimanche', dateFR: 'Dimanche 27 septembre', dateEN: 'Sunday September 27',   items: [] },
  ];
}

// « 14h00 », « 14 h 00 », « 9h », « 14h00–15h30 » : rend les minutes
// depuis minuit de l'heure de DÉPART, ou null quand la ligne n'a pas
// d'heure lisible, auquel cas elle garde sa place d'origine.
export function minutesDeLHeure(heure: string): number | null {
  const m = /(\d{1,2})\s*[h:]\s*(\d{2})?/.exec(heure.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (!Number.isFinite(h) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** La ligne d'horaire que donne un passage. Le titre vide reprend le nom. */
export function ligneDuPassage(nom: string, id: string, c: PassageAnimation): LigneHoraire {
  return {
    time: c.heure.trim(),
    label: c.titre.trim() || nom.trim(),
    where: c.lieu.trim(),
    source: id,
  };
}

/** Deux lignes sont la même quand l'heure, le libellé et le lieu coïncident. */
export function cleDeLigne(it: { time: string; label: string; where: string }): string {
  return `${it.time.trim()}|${it.label.trim()}|${it.where.trim()}`.toLowerCase();
}

/** Insère la ligne à sa place dans l'heure plutôt qu'au bout de la journée. */
export function insererLigne(items: LigneHoraire[], ligne: LigneHoraire): LigneHoraire[] {
  const m = minutesDeLHeure(ligne.time);
  if (m === null) return [...items, ligne];
  const i = items.findIndex((it) => {
    const mi = minutesDeLHeure(it.time);
    return mi !== null && mi > m;
  });
  if (i === -1) return [...items, ligne];
  return [...items.slice(0, i), ligne, ...items.slice(i)];
}

/** Complète l'horaire : jamais vide, et jamais amputé d'une journée. */
export function journeesCompletes(days: JourneeHoraire[] | undefined): JourneeHoraire[] {
  const base = days && days.length > 0
    ? days.map((d) => ({ ...d, items: [...d.items] }))
    : joursParDefaut();
  for (const modele of joursParDefaut()) {
    if (!base.some((d) => d.id === modele.id)) base.push(modele);
  }
  return base;
}

export interface Fusion {
  jours: JourneeHoraire[];
  ajoutees: number;
  deja: number;
}

/**
 * Pose les passages d'une animation dans l'horaire. Rejouable : une
 * ligne déjà présente est comptée, pas réécrite. Un passage sans heure
 * ou sans libellé est ignoré, parce qu'une ligne vide à l'horaire ne
 * dit rien à personne.
 */
export function fusionnerAlHoraire(
  days: JourneeHoraire[] | undefined,
  animation: { id: string; nom: string; creneaux: PassageAnimation[] },
): Fusion {
  const jours = journeesCompletes(days);
  let ajoutees = 0;
  let deja = 0;
  for (const c of animation.creneaux) {
    const jour = jours.find((d) => d.id === c.jour);
    if (!jour) continue;
    const ligne = ligneDuPassage(animation.nom, animation.id, c);
    if (!ligne.time || !ligne.label) continue;
    const cle = cleDeLigne(ligne);
    if (jour.items.some((it) => cleDeLigne(it) === cle)) { deja += 1; continue; }
    jour.items = insererLigne(jour.items, ligne);
    ajoutees += 1;
  }
  return { jours, ajoutees, deja };
}

export interface Retrait {
  jours: JourneeHoraire[];
  retirees: number;
}

/**
 * Enlève de l'horaire les lignes qui viennent d'une animation, qu'elles
 * portent encore sa signature ou qu'elles aient été recopiées à la main
 * depuis la section Horaire (qui efface le champ `source` au passage).
 */
export function retirerDeLHoraireJours(
  days: JourneeHoraire[] | undefined,
  animation: { id: string; nom: string; creneaux: PassageAnimation[] },
): Retrait {
  if (!days || days.length === 0) return { jours: [], retirees: 0 };
  const cles = new Set(animation.creneaux.map((c) => cleDeLigne(ligneDuPassage(animation.nom, animation.id, c))));
  let retirees = 0;
  const jours = days.map((d) => ({
    ...d,
    items: d.items.filter((it) => {
      const aRetirer = cles.has(cleDeLigne(it)) || it.source === animation.id;
      if (aRetirer) retirees += 1;
      return !aRetirer;
    }),
  }));
  return { jours, retirees };
}

/** Combien des passages de chaque animation figurent déjà à l'horaire. */
export function compterDansJours(
  days: JourneeHoraire[] | undefined,
  liste: { id: string; nom: string; creneaux: PassageAnimation[] }[],
): Record<string, number> {
  const vide = Object.fromEntries(liste.map((a) => [a.id, 0]));
  if (!days || days.length === 0) return vide;
  const presentes = new Set<string>();
  for (const d of days) for (const it of d.items) presentes.add(cleDeLigne(it));
  return Object.fromEntries(liste.map((a) => [
    a.id,
    a.creneaux.filter((c) => presentes.has(cleDeLigne(ligneDuPassage(a.nom, a.id, c)))).length,
  ]));
}
