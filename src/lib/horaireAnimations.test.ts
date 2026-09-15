// ─── Le banc d'essai du passage à l'horaire ──────────────────────────
// Même patron que planMarche.test.ts : pas de cadre de test, un fichier
// qui s'exécute et des assertions.
//
//   npx esbuild src/lib/horaireAnimations.test.ts --bundle --platform=node \
//     --format=esm --external:node:assert --outfile=/tmp/horaire-animations.mjs \
//     && node /tmp/horaire-animations.mjs
//
// Il couvre les seules choses qui feraient du tort si elles dérivaient :
// une ligne posée deux fois à l'horaire public, un passage qui atterrit
// à la mauvaise place dans la journée, un retrait qui emporte la ligne
// du voisin, et la journée qui manque au document.

import assert from 'node:assert/strict';
import {
  minutesDeLHeure, cleDeLigne, insererLigne, journeesCompletes,
  fusionnerAlHoraire, retirerDeLHoraireJours, compterDansJours,
  joursParDefaut,
  type JourneeHoraire,
} from './horaireAnimations';

const AMQ = {
  id: 'amq',
  nom: 'AMQ',
  creneaux: [
    { id: 'c1', jour: 'samedi',   heure: '14h00', titre: 'La Joute AMQ',    lieu: 'Arène' },
    { id: 'c2', jour: 'dimanche', heure: '11h00', titre: 'Finale de joute', lieu: 'Arène' },
  ],
};

// ── La lecture de l'heure ────────────────────────────────────────────
assert.equal(minutesDeLHeure('14h00'), 14 * 60);
assert.equal(minutesDeLHeure('9h'), 9 * 60);
assert.equal(minutesDeLHeure('14 h 30'), 14 * 60 + 30);
assert.equal(minutesDeLHeure('14h00–15h30'), 14 * 60, 'une plage se range sur son heure de départ');
assert.equal(minutesDeLHeure('en soirée'), null, 'une ligne sans heure garde sa place');
assert.equal(minutesDeLHeure('27h00'), null, 'une heure impossible ne se range pas');

// ── L'insertion se fait dans l'heure, pas au bout ────────────────────
const journee = [
  { time: '10h00', label: 'Ouverture', where: 'Site' },
  { time: '16h00', label: 'Tournoi',   where: 'Arène' },
];
const apres = insererLigne(journee, { time: '14h00', label: 'Joute', where: 'Arène' });
assert.deepEqual(apres.map((l) => l.time), ['10h00', '14h00', '16h00']);

const sansHeure = insererLigne(journee, { time: '', label: 'Au crépuscule', where: 'Feu' });
assert.equal(sansHeure[sansHeure.length - 1].label, 'Au crépuscule', 'sans heure, la ligne va au bout');

// ── La publication ───────────────────────────────────────────────────
const vide = fusionnerAlHoraire(undefined, AMQ);
assert.equal(vide.ajoutees, 2);
assert.equal(vide.deja, 0);
assert.equal(vide.jours.length, 3, 'un horaire absent se crée avec ses trois journées');
assert.equal(vide.jours.find((d) => d.id === 'samedi')!.items.length, 1);
assert.equal(vide.jours.find((d) => d.id === 'dimanche')!.items[0].label, 'Finale de joute');
assert.equal(vide.jours.find((d) => d.id === 'vendredi')!.items.length, 0);

// Rejouable : publier deux fois n'écrit pas la ligne deux fois.
const encore = fusionnerAlHoraire(vide.jours, AMQ);
assert.equal(encore.ajoutees, 0);
assert.equal(encore.deja, 2);
assert.equal(encore.jours.find((d) => d.id === 'samedi')!.items.length, 1);

// Un passage sans heure ne monte pas à l'horaire.
const bancal = fusionnerAlHoraire(undefined, {
  id: 'x', nom: 'Troupe X',
  creneaux: [{ id: 'c', jour: 'samedi', heure: '', titre: 'Sans heure', lieu: 'Scène' }],
});
assert.equal(bancal.ajoutees, 0, 'une ligne sans heure ne part pas vers la page publique');

// Le titre vide reprend le nom de l'animation.
const anonyme = fusionnerAlHoraire(undefined, {
  id: 'h', nom: 'Hullsborg',
  creneaux: [{ id: 'c', jour: 'samedi', heure: '13h00', titre: '', lieu: 'Camp' }],
});
assert.equal(anonyme.jours.find((d) => d.id === 'samedi')!.items[0].label, 'Hullsborg');

// Une journée manquante du document se rajoute au lieu d'avaler le passage.
const deuxJours: JourneeHoraire[] = [
  { id: 'vendredi', dateFR: 'Vendredi', dateEN: 'Friday',   items: [] },
  { id: 'samedi',   dateFR: 'Samedi',   dateEN: 'Saturday', items: [] },
];
const complete = fusionnerAlHoraire(deuxJours, AMQ);
assert.equal(complete.ajoutees, 2);
assert.ok(complete.jours.some((d) => d.id === 'dimanche'), 'le dimanche manquant revient');

// ── Le retrait ───────────────────────────────────────────────────────
// Le voisin reste, y compris quand il partage l'heure et le lieu.
const avecVoisin = fusionnerAlHoraire(vide.jours, {
  id: 'autre', nom: 'Autre troupe',
  creneaux: [{ id: 'v', jour: 'samedi', heure: '14h00', titre: 'Démonstration de forge', lieu: 'Arène' }],
});
const retrait = retirerDeLHoraireJours(avecVoisin.jours, AMQ);
assert.equal(retrait.retirees, 2);
const samediApres = retrait.jours.find((d) => d.id === 'samedi')!;
assert.equal(samediApres.items.length, 1);
assert.equal(samediApres.items[0].label, 'Démonstration de forge');

// Une ligne recopiée à la main perd sa signature : elle se reconnaît
// quand même à l'heure, au libellé et au lieu.
const sansSignature = vide.jours.map((d) => ({
  ...d,
  items: d.items.map(({ source: _source, ...reste }) => reste),
}));
assert.equal(retirerDeLHoraireJours(sansSignature, AMQ).retirees, 2);

// Une ligne renommée à la main garde sa signature : elle part aussi.
const renommee = vide.jours.map((d) => ({
  ...d,
  items: d.items.map((it) => ({ ...it, label: `${it.label} (reporté)` })),
}));
assert.equal(retirerDeLHoraireJours(renommee, AMQ).retirees, 2);

// ── Le compte ────────────────────────────────────────────────────────
assert.deepEqual(compterDansJours(vide.jours, [AMQ]), { amq: 2 });
assert.deepEqual(compterDansJours(undefined, [AMQ]), { amq: 0 });
assert.deepEqual(compterDansJours(retrait.jours, [AMQ]), { amq: 0 });

// ── Les garde-fous de base ───────────────────────────────────────────
assert.equal(cleDeLigne({ time: ' 14h00 ', label: 'Joute', where: 'Arène' }),
             cleDeLigne({ time: '14h00', label: ' joute ', where: 'arène' }),
             'la comparaison ignore la casse et les espaces');
assert.equal(journeesCompletes([]).length, 3);
assert.equal(joursParDefaut().every((d) => d.items.length === 0), true);

console.log('Horaire des animations : toutes les vérifications passent.');
