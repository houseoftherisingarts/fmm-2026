// ─── Les tableaux du rapport ────────────────────────────────────────
// Une fonction par section, et rien d'autre. Chacune reçoit le bilan
// entier et rend un morceau de markdown. Le fil du rapport, lui, se
// tient dans ./rapport.

import type { Niveau } from '../../src/games/moteur/niveaux';
import {
  NOM_CAUSE, NOM_EVENEMENT, NOM_PATHOLOGIE_DES, PLAFOND_REFLEXION, SEUIL_DESEQUILIBRE,
  ms, n1, pct, tableau, traduire, trier,
  type Bilan,
} from './bilan';

export function sectionProtocole(b: Bilan): string {
  const marches = (Object.keys(b.noeuds) as unknown as Niveau[])
    .map((k) => Number(k) as Niveau)
    .sort((x, y) => x - y);
  return [
    '## Comment le banc a tourné',
    '',
    `Le banc a joué ${b.partiesTotal} parties de machine contre machine, `
    + `en ${n1(b.dureeMs / 60000)} minutes, sur une graine fixe. `
    + 'Relancé sans rien changer au moteur, il rend exactement les mêmes chiffres.',
    '',
    'Chaque marche joue sous un plafond de nœuds, et non sous son horloge. '
    + 'C\'est ce qui rend le banc reproductible : une horloge donne un résultat '
    + 'différent selon la charge de la machine, et deux tournois ne seraient plus '
    + 'comparables. Le temps de réflexion réel se mesure à part, plus bas, sans plafond.',
    '',
    tableau(
      ['Marche', ...marches.map((m) => String(m))],
      [['Nœuds', ...marches.map((m) => b.noeuds[m].toLocaleString('fr-CA'))]],
    ),
    '',
    'Le grand damier du hnefatafl coûte huit fois le nœud du Renard, parce qu\'il '
    + 'relit cent vingt et une cases et dresse une centaine de coups à chaque nœud. '
    + 'Son budget est donc divisé par trois et un tiers. La comparaison de deux '
    + 'marches reste juste, puisqu\'elle se fait toujours à l\'intérieur d\'une même table.',
    b.reductions.length > 0
      ? `\n${b.reductions.map((r) => `- ${r}`).join('\n')}`
      : '',
  ].join('\n');
}

export function sectionControle(b: Bilan): string {
  const lignes = b.controle.map((c) => [
    c.table,
    `${c.finiesSansQuiescence} sur ${c.notes} (profondeur ${c.profondeurSans})`,
    `${c.finiesAvecQuiescence} sur ${c.notes} (profondeur ${c.profondeurAvec})`,
  ]);
  return [
    '## Le contrôle du moteur',
    '',
    'Le banc juge la machine avec le moteur de la machine. Il vérifie donc d\'abord que '
    + 'ce moteur rend des notes qui veulent dire quelque chose, plutôt que de bâtir mille '
    + 'parties de statistiques sur une note qui vaut l\'infini.',
    '',
    'Le réglage `notesExactes` de `src/games/moteur/recherche.ts` demande la note juste '
    + 'de CHAQUE coup de la racine, et non seulement celle du meilleur. Ce sont les '
    + 'marches à fenêtre, de la première à la cinquième, qui en dépendent : sans lui, '
    + 'elles piochent au hasard parmi des coups qu\'elles croient équivalents. Le tableau '
    + 'dit combien de coups reçoivent une note finie dans les deux mélanges possibles.',
    '',
    tableau(
      ['Table', 'Fenêtre pleine, sans quiescence', 'Fenêtre pleine, avec quiescence'],
      lignes,
    ),
  ].join('\n');
}

export function sectionTables(b: Bilan): string {
  const lignes = b.bancs.map((l) => {
    const j = l.journal;
    return [
      `${l.jeu} · ${l.variante}`,
      String(j.parties),
      n1(j.demiCoups / Math.max(1, j.parties)),
      String(j.demiCoupsMax),
      `${pct(j.victoiresA, j.parties)} / ${pct(j.victoiresB, j.parties)}`,
      pct(j.nulles, j.parties),
    ];
  });
  return [
    '## Ce que chaque table a donné',
    '',
    'Les taux de victoire de cette colonne mélangent tous les couples de marches, '
    + 'y compris ceux qui opposent un connétable à un palefrenier. Ils ne disent donc '
    + 'rien de l\'équilibre du jeu, seulement de la vie de la table. L\'équilibre se '
    + 'lit plus bas, sur les parties à niveau égal.',
    '',
    tableau(
      ['Table', 'Parties', 'Longueur moyenne', 'Longueur max', 'Victoires (ouvre / répond)', 'Nulles'],
      lignes,
    ),
  ].join('\n');
}

export function sectionEquilibre(b: Bilan): string {
  const lignes = b.equilibre.map((e) => {
    const part = Math.max(e.a, e.b) / Math.max(1, e.parties);
    const dominant = e.a >= e.b ? e.nomA : e.nomB;
    return [
      `${e.jeu} · ${e.variante}`,
      String(e.parties),
      `${e.a} (${e.nomA})`,
      `${e.b} (${e.nomB})`,
      String(e.nulles),
      part > SEUIL_DESEQUILIBRE ? `**déséquilibré, ${dominant}**` : 'tenable',
    ];
  });
  return [
    '## L\'équilibre des camps, à niveau égal',
    '',
    'Deux connétables l\'un contre l\'autre, chaque partie sur sa propre graine. '
    + 'Un camp qui passe les trois quarts des parties est signalé.',
    '',
    tableau(['Table', 'Parties', 'Camp qui ouvre', 'Camp qui répond', 'Nulles', 'Verdict'], lignes),
  ].join('\n');
}

export function sectionEchelle(b: Bilan): string {
  const lignes = b.echelle
    .filter((e) => e.fort !== e.faible)
    .map((e) => {
      const ouvre = e.fortOuvre >= e.faibleOuvre;
      const suit = e.fortSuit >= e.faibleSuit;
      return [
        `${e.jeu} · ${e.variante}`,
        `${e.fort} contre ${e.faible}`,
        String(e.parties),
        `${e.fortOuvre} contre ${e.faibleOuvre} (${e.nomA})`,
        `${e.fortSuit} contre ${e.faibleSuit} (${e.nomB})`,
        String(e.nulles),
        ouvre && suit ? 'tient' : ouvre || suit ? '**tient à moitié**' : '**cassée**',
      ];
    });
  const tiennent = b.echelle.filter(
    (e) => e.fort !== e.faible && e.fortOuvre >= e.faibleOuvre && e.fortSuit >= e.faibleSuit,
  ).length;
  return [
    '## L\'échelle de force, mesurée par paires',
    '',
    'La méthode compte autant que le chiffre. Ces jeux sont déséquilibrés par camp : '
    + 'au Renard à treize oies, deux connétables donnent la victoire aux oies presque à '
    + 'tous les coups, ce qui est historiquement juste. Comparer deux marches en '
    + 'alternant les camps ne mesurerait donc que le déséquilibre du jeu.',
    '',
    'Le banc joue chaque position deux fois, avec la même graine : une fois avec la '
    + 'marche forte du côté qui ouvre, une fois avec la marche faible à la même place. '
    + 'Les deux colonnes du milieu se lisent alors comme un duel honnête. La marche '
    + 'forte doit gagner au moins autant que la faible dans CHACUN des deux camps.',
    '',
    tableau(
      ['Table', 'Couple', 'Parties', 'Victoires en ouvrant', 'Victoires en répondant', 'Nulles', 'Verdict'],
      lignes,
    ),
    '',
    `L'échelle tient sur ${tiennent} des ${lignes.length} couples mesurés. Ce qui `
    + 'flanche est nommé, avec ses chiffres, dans la dernière section.',
  ].join('\n');
}

export function sectionBevues(b: Bilan): string {
  const marches = [...b.global.bevues.keys()].sort((x, y) => x - y);
  const lignes = marches.map((n) => {
    const v = b.global.bevues.get(n)!;
    return [
      String(n),
      String(v.mesures),
      n1(v.perte / Math.max(1, v.mesures) / 100),
      `${v.graves} (${pct(v.graves, v.mesures)})`,
      `${v.renversements} (${pct(v.renversements, v.mesures)})`,
    ];
  });
  return [
    '## Les bévues, marche par marche',
    '',
    `Tous les ${b.refBevue.pas} demi-coups d'une passe réservée à cette mesure, le banc `
    + 'arrête la partie et la repèse avec une recherche de référence : profondeur '
    + `${b.refBevue.profondeur}, ${b.refBevue.noeuds.toLocaleString('fr-CA')} nœuds et la `
    + 'quiescence. Le pas est impair pour que la mesure tombe alternativement sur l\'un et '
    + 'l\'autre camp. La perte du coup joué est la différence entre sa note et celle du '
    + 'meilleur coup, jamais négative. Une référence coupée avant sa deuxième profondeur '
    + 'est jetée sans être comptée : une recherche qui n\'a pas vu la réponse de '
    + 'l\'adversaire ne juge personne. La référence dispose de '
    + `${n1(b.refBevue.noeuds / b.noeuds[10])} fois le budget du connétable, et de bien `
    + 'davantage face aux marches basses.',
    '',
    'La mesure coûte deux recherches et non une. Le moteur sait rendre la note de tous '
    + 'les coups de la racine d\'un seul geste, par `notesExactes`, mais ce réglage mêlé '
    + 'à la quiescence ne donne que l\'infini, comme le dit le contrôle plus haut. La '
    + 'référence pèse donc la position, puis repèse celle d\'après quand le coup joué '
    + 'n\'est pas celui qu\'elle avait choisi, une marche moins profond pour que les deux '
    + 'notes se comparent.',
    '',
    'Une bévue grave coûte plus d\'un demi-point. Un renversement jette une position '
    + 'gagnante d\'au moins une pièce dans une position perdue d\'autant.',
    '',
    tableau(
      ['Marche', 'Coups pesés', 'Perte moyenne (points)', 'Bévues graves', 'Renversements'],
      lignes,
    ),
  ].join('\n');
}

export function sectionChrono(b: Bilan): string {
  const marches = new Set<Niveau>();
  for (const l of b.chrono) for (const [n] of l.parNiveau) marches.add(n);
  const ordre = [...marches].sort((x, y) => x - y);
  const lignes = ordre.map((n) => [
    String(n),
    ...b.chrono.map((l) => {
      const c = l.parNiveau.find(([m]) => m === n)?.[1];
      if (!c || c.coups === 0) return 'x';
      return `${ms(c.total / c.coups)} · max ${ms(c.max)}`;
    }),
  ]);
  return [
    '## Le temps de réflexion, sans plafond de nœuds',
    '',
    'Cette passe joue quelques coups en laissant chaque marche prendre son propre '
    + 'temps, comme devant un joueur. Un filet de sûreté à '
    + `${b.filetChrono.toLocaleString('fr-CA')} nœuds évite qu'une marche sans horloge `
    + 'ne bloque le banc, et il mord seulement là où le rapport le dit.',
    '',
    tableau(['Marche', ...b.chrono.map((l) => l.table)], lignes),
    '',
    `La promesse faite au joueur est une réponse en moins de ${PLAFOND_REFLEXION / 1000} secondes.`,
  ].join('\n');
}

export function sectionDes(b: Bilan): string {
  const g = b.des.global;
  const marches = [...g.actions.keys()].sort((x, y) => x - y);
  const actions = marches.map((n) => {
    const a = g.actions.get(n)!;
    return [
      String(n),
      String(g.sieges.get(n) ?? 0),
      pct(g.victoires.get(n) ?? 0, g.sieges.get(n) ?? 0),
      String(a.annonces),
      `${a.doutes} (${pct(a.doutesJustes, a.doutes)} justes)`,
      `${a.exacts} (${pct(a.exactsJustes, a.exacts)} justes)`,
      String(a.refusees),
    ];
  });
  const echelle = b.des.echelle.filter((e) => e.fort !== e.faible).map((e) => [
    `${e.taille} joueurs`,
    `${e.fort} contre ${e.faible}`,
    String(e.tables),
    `${e.fortOuvre} contre ${e.faibleOuvre}`,
    `${e.fortSuit} contre ${e.faibleSuit}`,
    String(e.sansVainqueur),
    e.fortOuvre >= e.faibleOuvre && e.fortSuit >= e.faibleSuit
      ? 'tient'
      : e.fortOuvre >= e.faibleOuvre || e.fortSuit >= e.faibleSuit
        ? '**tient à moitié**' : '**cassée**',
  ]);
  const tailles = b.des.parTaille.map((t) => [
    `${t.taille} joueurs`,
    String(t.journal.parties),
    n1(t.journal.manches / Math.max(1, t.journal.parties)),
    String(t.journal.manchesMax),
    trier(t.journal.pathologies)
      .map(([c, k]) => `${traduire(NOM_PATHOLOGIE_DES, c)} : ${k}`)
      .join(' · ') || 'aucune',
  ]);
  return [
    '## Les dés du menteur',
    '',
    `${g.parties} tables jouées, ${g.manches.toLocaleString('fr-CA')} manches en tout. `
    + 'Le règlement lance '
    + 'ses dés avec le hasard ordinaire du navigateur, que le banc remplace par la '
    + 'graine du moteur le temps d\'une table, puis remet en place.',
    '',
    tableau(['Table', 'Parties', 'Manches par partie', 'Manches max', 'Pathologies'], tailles),
    '',
    '### Le tempérament de chaque marche',
    '',
    tableau(
      ['Marche', 'Sièges', 'Victoires', 'Annonces', 'Doutes', 'Compte exact', 'Annonces refusées'],
      actions,
    ),
    '',
    '### L\'échelle de force aux dés',
    '',
    'Les sièges alternent : une table porte la marche forte aux places paires, la '
    + 'table jumelle les inverse, à graine égale. Le siège zéro ouvre les annonces.',
    '',
    tableau(
      ['Table', 'Couple', 'Tables', 'Victoires en ouvrant', 'Victoires en répondant', 'Sans vainqueur', 'Verdict'],
      echelle,
    ),
  ].join('\n');
}

export function sectionPathologies(b: Bilan): string {
  const coupees = (b.global.causes['plafond-arene'] ?? 0) + (b.global.causes['sans-coup'] ?? 0);
  const causes = trier(b.global.causes).map(([c, k]) => [
    traduire(NOM_CAUSE, c), String(k), pct(k, b.global.parties),
  ]);
  const evs = trier(b.global.evenements).map(([c, k]) => [
    traduire(NOM_EVENEMENT, c), String(k),
  ]);
  return [
    '## Les pathologies comptées',
    '',
    'La cause de fin de chaque partie de plateau du tournoi, tous couples confondus. '
    + `Le banc coupe une partie qui passe ${b.plafondArene} demi-coups, par-dessus les `
    + 'plafonds que les arbitres portent déjà. Cette coupure-là est la pathologie '
    + `qu'Alex a vue à l'écran : elle est arrivée ${coupees} fois.`
    + (coupees === 0
      ? ' Les arbitres ferment donc toutes leurs parties eux-mêmes, et la règle de la '
        + 'basse-cour, celle des cinquante demi-coups et celle de la répétition font '
        + 'chacune leur travail.'
      : ''),
    '',
    tableau(['Cause', 'Parties', 'Part'], causes),
    '',
    'Ce que les arbitres ont eu à faire en cours de route. Une position répétée est '
    + 'comptée la deuxième fois qu\'elle paraît, avant même qu\'elle ne close quoi que '
    + 'ce soit : c\'est le premier signe qu\'un camp tourne en rond.',
    '',
    evs.length > 0 ? tableau(['Événement', 'Occurrences'], evs) : 'Aucun.',
  ].join('\n');
}
