// ─── Le rapport du banc d'essai ─────────────────────────────────────
// Le banc mesure, ce fichier raconte. Rien n'est écrit à la main : les
// constats de la dernière section sortent des chiffres du tournoi, de
// sorte qu'un réglage changé dans `niveaux.ts` change aussi ce que le
// rapport reproche à la machine.

import { NIVEAUX, type Niveau } from '../../src/games/moteur/niveaux';
import {
  PLAFOND_REFLEXION, SEUIL_BEVUES, SEUIL_DESEQUILIBRE, ms, n2, pct,
  type Appariement, type Bilan,
} from './bilan';
import {
  sectionBevues, sectionChrono, sectionControle, sectionDes, sectionEchelle,
  sectionEquilibre, sectionPathologies, sectionProtocole, sectionTables,
} from './tableaux';

// ─── Ce qui reste bizarre ───────────────────────────────────────────
// Les constats sortent des chiffres, jamais d'une intuition. Un
// réglage changé dans `niveaux.ts` change donc aussi cette section.

function constats(b: Bilan): string[] {
  const out: string[] = [];

  // Un couple de marches se juge sur les huit tables à la fois. Une
  // ligne par table donnerait quarante puces où personne ne verrait
  // plus rien, et surtout elle cacherait la seule chose qui compte :
  // une marche qui flanche partout n'a pas le même défaut qu'une
  // marche qui flanche sur un seul jeu.
  const couples = new Map<string, { fort: Niveau; faible: Niveau; ratees: Appariement[]; total: number }>();
  for (const e of b.echelle) {
    if (e.fort === e.faible) continue;
    const k = `${e.fort}-${e.faible}`;
    const g = couples.get(k) ?? { fort: e.fort, faible: e.faible, ratees: [], total: 0 };
    g.total++;
    if (!(e.fortOuvre >= e.faibleOuvre && e.fortSuit >= e.faibleSuit)) g.ratees.push(e);
    couples.set(k, g);
  }
  for (const g of couples.values()) {
    if (g.ratees.length === 0) continue;
    const detail = g.ratees
      .map((e) => `${e.jeu} · ${e.variante} (${e.fortOuvre} contre ${e.faibleOuvre} en `
        + `ouvrant, ${e.fortSuit} contre ${e.faibleSuit} en répondant)`)
      .join(' ; ');
    out.push(
      `**La marche ${g.fort} ne domine pas la marche ${g.faible} sur ${g.ratees.length} `
      + `table${g.ratees.length > 1 ? 's' : ''} de ${g.total}.** ${detail}. Réglage à `
      + `revoir dans \`src/games/moteur/niveaux.ts\` : ${propositionEchelle(g.fort, g.faible)}`,
    );
  }

  const penchees = b.equilibre.filter(
    (e) => Math.max(e.a, e.b) / Math.max(1, e.parties) > SEUIL_DESEQUILIBRE,
  );
  if (penchees.length > 0) {
    const detail = penchees
      .map((e) => `${e.jeu} · ${e.variante} (${e.a >= e.b ? e.nomA : e.nomB}, `
        + `${pct(Math.max(e.a, e.b), e.parties)})`)
      .join(' ; ');
    out.push(
      `**${penchees.length} table${penchees.length > 1 ? 's penchent' : ' penche'} `
      + `franchement d'un côté à niveau égal : ${detail}.** Le jeu lui-même penche, et `
      + 'aucun réglage de marche n\'y changera rien. Ce qui se règle, c\'est le camp '
      + 'offert au joueur : lui donner le camp faible contre une marche haute, et le camp '
      + 'fort contre une marche basse, plutôt que de le laisser choisir à l\'aveugle.',
    );
  }

  const cassees = b.controle.filter((c) => c.finiesAvecQuiescence < c.notes);
  if (cassees.length > 0) {
    const c = cassees[0];
    out.push(
      '**Le réglage `notesExactes` de `src/games/moteur/recherche.ts` ne rend plus rien '
      + `d'utilisable dès que la quiescence l'accompagne : ${c.finiesAvecQuiescence} note `
      + `finie sur ${c.notes} coups de racine, et la recherche reste bloquée à la `
      + `profondeur ${c.profondeurAvec} au lieu de ${c.profondeurSans}. Mesuré sur `
      + `${cassees.length} table${cassees.length > 1 ? 's' : ''} sur ${b.controle.length}.** `
      + 'La cause tient en un signe. À la racine de `chercher`, la borne de la fenêtre '
      + 'pleine vaut `-Infinity` là où elle devrait valoir `+Infinity` : le fils reçoit un '
      + 'bêta de moins l\'infini, la quiescence répond aussitôt `beta` et remonte moins '
      + 'l\'infini, et la racine rend plus l\'infini pour tous les coups. Aucune marche '
      + 'n\'a aujourd\'hui la fenêtre ET la quiescence, puisque la quiescence commence à '
      + 'la profondeur quatre et la fenêtre s\'arrête à la marche cinq, donc rien ne se '
      + 'voit à l\'écran. Le jour où une marche du milieu recevra les deux, elle jouera '
      + 'au hasard : toutes les notes de racine étant égales, la fenêtre les accepte '
      + 'toutes et le tirage au sort choisit. Le banc mesure donc ses bévues avec deux '
      + 'recherches séparées, sans toucher à ce réglage.',
    );
  }

  const parMarche = [...b.des.global.actions.entries()].sort((x, y) => x[0] - y[0]);
  for (const [n, a] of parMarche) {
    if (a.exacts < 10 || a.exactsJustes / a.exacts >= 0.25) continue;
    out.push(
      `**Aux dés, la marche ${n} a crié « c'est exactement ça » ${a.exacts} fois et n'a `
      + `eu raison que ${a.exactsJustes} fois, soit ${pct(a.exactsJustes, a.exacts)}.** `
      + 'Chaque appel manqué coûte un dé, et le règlement de la maison plafonne le gain à '
      + 'un dé repris. Le calcul de `evExact` dans `src/games/des/cpu.ts` ne choisit '
      + 'l\'appel que lorsque le doute et la relance valent encore moins, ce qui revient '
      + 'à payer un dé pour éviter d\'en payer un. Le seuil de `appelleExact` mérite '
      + 'd\'être relevé, ou l\'appel réservé aux positions où la probabilité exacte '
      + 'dépasse vraiment le coût.',
    );
  }

  const doutants = parMarche.filter(([, a]) => a.doutes >= 50);
  if (doutants.length >= 2) {
    const justesse = ([, a]: [Niveau, { doutes: number; doutesJustes: number }]): number =>
      a.doutesJustes / a.doutes;
    const haute = doutants[doutants.length - 1];
    const meilleure = doutants.reduce((x, y) => (justesse(y) > justesse(x) ? y : x));
    if (meilleure[0] < haute[0] && justesse(meilleure) - justesse(haute) > 0.1) {
      out.push(
        `**Aux dés, la marche ${meilleure[0]} devine mieux le mensonge que la marche `
        + `${haute[0]} : ${pct(meilleure[1].doutesJustes, meilleure[1].doutes)} de doutes `
        + `justes contre ${pct(haute[1].doutesJustes, haute[1].doutes)}.** L'échelle de `
        + 'force n\'en souffre pas, puisque la marche haute gagne quand même plus de '
        + 'tables : elle doute simplement beaucoup plus souvent, et un doute de plus se '
        + 'prend toujours sur les positions les moins claires. Cela reste à surveiller, '
        + 'parce qu\'un connétable qui se trompe une fois sur deux en criant « menteur » '
        + 'a l\'air bête devant un joueur, même quand il finit par gagner.',
      );
    }
  }

  // La part de bévues graves doit descendre à mesure qu'on monte les
  // marches. Quand elle remonte, ou bien la marche haute cherche moins
  // bien qu'on ne le croit, ou bien la mesure manque d'échantillons, et
  // les deux méritent d'être dits plutôt que passés sous silence.
  const echelons = [...b.global.bevues.entries()]
    .filter(([, v]) => v.mesures >= 20)
    .sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < echelons.length; i++) {
    const [bas, vb] = echelons[i - 1];
    const [haut, vh] = echelons[i];
    const ecart = vh.graves / vh.mesures - vb.graves / vb.mesures;
    if (ecart <= 0.05) continue;
    out.push(
      `**La marche ${haut} joue plus de mauvais coups que la marche ${bas} : `
      + `${pct(vh.graves, vh.mesures)} de coups qui perdent plus d'un demi-point contre `
      + `${pct(vb.graves, vb.mesures)}.** La perte moyenne, elle, continue de descendre `
      + `(${n2(vh.perte / vh.mesures / 100)} point contre `
      + `${n2(vb.perte / vb.mesures / 100)}), donc la marche haute se trompe un peu plus `
      + 'souvent mais moins gravement. L\'écart tient peut-être dans le bruit de '
      + `${vh.mesures} mesures, et la façon de trancher est de relancer le banc avec `
      + 'une passe de bévues plus longue avant de toucher à quoi que ce soit.',
    );
  }

  for (const [n, c] of [...b.global.chrono.entries()].sort((x, y) => x[0] - y[0])) {
    if (c.coups === 0 || c.max <= PLAFOND_REFLEXION) continue;
    out.push(
      `**La marche ${n} a dépassé ${PLAFOND_REFLEXION / 1000} secondes sous plafond `
      + `de nœuds (${ms(c.max)} au pire).** Un plafond de nœuds n'est pas une horloge : `
      + 'il borne le travail, pas le temps. Sur la page de jeu, seule une horloge tient '
      + 'la promesse, et les marches un à cinq n\'en ont aucune dans `NIVEAUX`.',
    );
  }

  const sansHorloge = b.chrono
    .flatMap((l) => l.parNiveau.map(([n, c]) => ({ table: l.table, n, c })))
    .filter((x) => x.c.coups > 0 && x.c.max > PLAFOND_REFLEXION);
  if (sansHorloge.length > 0) {
    const pire = sansHorloge.reduce((a, x) => (x.c.max > a.c.max ? x : a));
    out.push(
      `**Sans plafond de nœuds, la marche ${pire.n} met jusqu'à ${ms(pire.c.max)} par `
      + `coup sur ${pire.table}.** Les marches un à cinq n'ont pas de \`tempsMs\` dans `
      + '`NIVEAUX`, donc rien ne les arrête avant le fond de leur profondeur. La page de '
      + 'jeu les borne aujourd\'hui par un plafond de nœuds passé à la main, chaque jeu '
      + 'de son côté. Le réglage à faire est de donner un `tempsMs` aux marches un à '
      + 'cinq, court, de l\'ordre de deux cents à six cents millisecondes.',
    );
  }

  for (const [n, v] of [...b.global.bevues.entries()].sort((x, y) => x[0] - y[0])) {
    if (v.mesures < 20) continue;
    const part = v.graves / v.mesures;
    if (n >= 8 && part > SEUIL_BEVUES) {
      out.push(
        `**La marche ${n} joue ${pct(v.graves, v.mesures)} de coups qui perdent plus `
        + 'd\'un demi-point.** Pour une marche haute, c\'est beaucoup. Sa `bevue` ne vaut '
        + `pourtant que ${n2(NIVEAUX[n].bevue * 100)} pour cent des coups : le reste vient `
        + 'de la recherche elle-même, donc de la profondeur ou du budget de nœuds, et non '
        + 'du tempérament qu\'on lui a donné.',
      );
    }
    if (v.renversements >= 2 && n === 10) {
      out.push(
        `**Le connétable a jeté ${v.renversements} positions gagnantes dans des positions `
        + `perdues, sur ${v.mesures} coups pesés.** À ce niveau, la fenêtre et la bévue `
        + 'valent zéro, donc la faute vient de l\'horizon de la recherche. Elle se corrige '
        + 'en profondeur, jamais en tempérament.',
      );
    }
  }

  const coupes = (b.global.causes['plafond-arene'] ?? 0);
  if (coupes > 0) {
    out.push(
      `**${coupes} parties ont été coupées par le plafond du banc.** Les arbitres n'ont `
      + 'donc pas tranché ces parties tout seuls, ce qui est exactement le blocage '
      + 'qu\'Alex a vu à l\'écran. Le plafond de l\'arbitre concerné est trop haut, ou '
      + 'son compteur de progrès ne mord pas.',
    );
  }
  const sansCoup = (b.global.causes['sans-coup'] ?? 0);
  if (sansCoup > 0) {
    out.push(
      `**${sansCoup} parties se sont arrêtées parce que la machine n'avait plus de coup `
      + 'alors que l\'arbitre n\'avait rien tranché.** C\'est un trou dans le règlement, '
      + 'et il se bouche du côté de l\'arbitre.',
    );
  }

  const nulles = b.global.nulles / Math.max(1, b.global.parties);
  if (nulles > 0.3) {
    out.push(
      `**${pct(b.global.nulles, b.global.parties)} des parties de plateau finissent `
      + 'nulles.** Une table qui annule une fois sur trois lasse le joueur avant de le '
      + 'battre. Les compteurs de l\'arbitre sont ce qui se resserre en premier.',
    );
  }

  const p = b.des.global.pathologies;
  if ((p['annonce-refusee'] ?? 0) > 0) {
    out.push(
      `**Aux dés, la maison a proposé ${p['annonce-refusee']} annonces que le règlement `
      + 'a refusées.** Une annonce illégale ne devrait jamais sortir de `choisirCoupDes`, '
      + 'et la faute est dans la liste des annonces légales, pas dans le tempérament.',
    );
  }
  if ((p['table-close-sans-vainqueur'] ?? 0) > 0) {
    out.push(
      `**${p['table-close-sans-vainqueur']} tables de dés se sont fermées sans `
      + 'vainqueur.** La règle de la maison arrête la partie dès que le premier siège '
      + 'tombe, parce qu\'un joueur humain ne regarde pas les autres finir sans lui. '
      + 'Entre machines, cela laisse des convives debout et personne de proclamé. La '
      + 'règle est juste devant un humain, et il faut seulement que le banc la connaisse.',
    );
  }
  return out;
}

/** Ce qu'il faudrait toucher pour qu'une marche reprenne le dessus. */
function propositionEchelle(fort: Niveau, faible: Niveau): string {
  if (fort >= 9) {
    return 'monter `profondeurMax` de la marche forte, ou lui donner un `tempsMs` plus '
      + 'large, puisqu\'elle n\'a déjà ni fenêtre ni bévue à réduire.';
  }
  if (fort >= 6) {
    return `descendre la \`bevue\` de la marche ${fort} et monter son \`tempsMs\`, `
      + `ou remonter la \`bevue\` de la marche ${faible}.`;
  }
  return `creuser l'écart de \`fenetre\` et de \`bevue\` entre les marches ${faible} et `
    + `${fort}, ou donner une profondeur de plus à la marche ${fort}.`;
}

// ─── Le rapport entier ──────────────────────────────────────────────

export function rapport(b: Bilan): string {
  const liste = constats(b);
  return [
    '# Le banc d\'essai des jeux',
    '',
    `*Rapport généré par \`tools/arene.ts\` le ${b.date}. Ce fichier est écrit par la `
    + 'machine et se refait à chaque `npm run arene`.*',
    '',
    'Alex, le 2026-09-01 : « simule peut-être mille parties et vois les genres de choses '
    + 'qui font en sorte que le AI peut être un peu bizarre. » Voici ce que mille parties '
    + 'ont donné.',
    '',
    'Le moteur a été corrigé deux fois le jour même. Les notes de racine se pèsent '
    + 'désormais à fenêtre pleine quand la marche en a besoin, la recherche se rabat sur '
    + 'l\'évaluation statique quand l\'horloge tombe avant la première profondeur, et les '
    + 'marches six à neuf ne tirent plus leur faiblesse d\'une fenêtre mais de la '
    + 'profondeur. Ce rapport est la première mesure qui les juge. Il commence par un '
    + 'contrôle de l\'instrument, parce que la première de ces deux corrections porte un '
    + 'défaut que rien ne montre encore à l\'écran.',
    '',
    sectionProtocole(b), '',
    sectionControle(b), '',
    sectionTables(b), '',
    sectionEquilibre(b), '',
    sectionEchelle(b), '',
    sectionBevues(b), '',
    sectionChrono(b), '',
    sectionPathologies(b), '',
    sectionDes(b), '',
    '## Ce qui reste bizarre',
    '',
    liste.length === 0
      ? 'Rien de ce que le banc sait mesurer. Ce qui ne veut pas dire que tout va bien : '
        + 'il ne mesure ni le plaisir de jouer ni la variété des parties.'
      : liste.map((c) => `- ${c}`).join('\n\n'),
    '',
  ].join('\n');
}
