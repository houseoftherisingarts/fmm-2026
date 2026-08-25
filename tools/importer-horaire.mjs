// ─── L'horaire du festival, versé dans Firestore ─────────────────────
// Écrit le document `schedule/2026`, celui que la page publique écoute
// et que la section Horaire de l'admin modifie ensuite.
//
//   node tools/importer-horaire.mjs            (écrit)
//   node tools/importer-horaire.mjs --essai    (affiche, n'écrit rien)
//
// La source est la programmation qu'Alex tient dans son document Google
// « 2026 prog complete ». Elle est recopiée ici à la main, avec les
// fautes corrigées et les lieux normalisés sur le vocabulaire du site.
// Dès que ce document existe, la page Activités quitte le souvenir de
// 2025 et affiche l'horaire officiel.
//
// Rejouable sans dégât : le document porte toujours le même identifiant,
// donc relancer l'outil réécrit le même endroit.

import { createRequire } from 'node:module';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');
const PROJET = 'festivalmedieval';
const ANNEE = 2026;

// ── La programmation ────────────────────────────────────────────────
const JOURS = [
  {
    id: 'vendredi',
    dateFR: 'Vendredi 25 septembre',
    dateEN: 'Friday September 25',
    items: [
      { time: '17h00',       label: 'Ouverture des portes',                                   where: 'Accueil' },
      { time: '17h30–18h30', label: 'Spectacle de Fuego Bohemio par la Troupe Caravane',      where: 'Scène' },
      { time: '18h30–18h45', label: 'Allumage du feu',                                        where: 'Pit à feu principal' },
      { time: '18h45–19h45', label: 'Spectacle de Skarazula',                                 where: 'Scène' },
      { time: '19h45',       label: 'Spectacle de l’Ensemble Klezmer de Sainte-Nigoune',      where: 'Scène' },
      { time: '20h00–20h45', label: 'Danse aérienne',                                         where: 'Scène' },
    ],
  },
  {
    id: 'samedi',
    dateFR: 'Samedi 26 septembre',
    dateEN: 'Saturday September 26',
    items: [
      { time: '10h00',       label: 'Ouverture des portes',                                   where: 'Accueil' },
      { time: '10h30–11h30', label: 'Jeu des Chevaliers par l’AMQ',                           where: 'Arène' },
      { time: '10h30–11h15', label: 'Danse aérienne',                                         where: 'Arène' },
      { time: '11h00–11h30', label: 'BicOasis en déambulatoire',                              where: 'Déambulatoire' },
      { time: '11h00–11h30', label: 'Marionnette géante par la Troupe Caravane',              where: 'Déambulatoire' },
      { time: '11h45–12h30', label: 'Concours de cerfs-volants',                              where: 'Arène' },
      { time: '12h30–13h15', label: 'Danse aérienne',                                         where: 'Scène' },
      { time: '12h45–13h30', label: 'Conférence Découverte culturelle : qui sont les Roma, par la Troupe Caravane', where: 'Village paysan' },
      { time: '12h45–13h30', label: 'Parcours d’herboristerie par Morgane la Sage',           where: 'Camp viking' },
      { time: '12h45–13h45', label: 'Combats vikings',                                        where: 'Arène' },
      { time: '14h00–15h00', label: 'Hobby Horse',                                            where: 'Arène' },
      { time: '14h00–14h30', label: 'Démonstration de forge',                                 where: 'Village paysan' },
      { time: '14h30–15h15', label: 'Danse aérienne',                                         where: 'Scène' },
      { time: '15h00–15h30', label: 'Marionnette géante par la Troupe Caravane',              where: 'Déambulatoire' },
      { time: '15h30–16h30', label: 'Spectacle de joute par l’AMQ',                           where: 'Arène' },
      { time: '16h30–17h30', label: 'Spectacle de BicOasis',                                  where: 'Scène' },
      { time: '17h00–18h00', label: 'Concours culinaire',                                     where: 'Camp viking' },
      { time: '17h45',       label: 'Allumage du feu',                                        where: 'Pit à feu principal' },
      { time: '18h00–19h00', label: 'Spectacle de Trifolys et Kateya',                        where: 'Scène' },
      { time: '19h15–20h45', label: 'Spectacle de L’Harfang',                                 where: 'Scène' },
      { time: '21h00–21h30', label: 'Spectacle de feu par l’AMQ et les Enfants du Brasier',   where: 'Arène' },
      { time: '21h35',       label: 'Spectacle de Svarica',                                   where: 'Scène' },
      { time: 'Après',       label: 'Spectacle de burlesque par la Crimson Court et ses invitées', where: 'Taverne' },
    ],
  },
  {
    id: 'dimanche',
    dateFR: 'Dimanche 27 septembre',
    dateEN: 'Sunday September 27',
    items: [
      { time: '10h00',       label: 'Ouverture des portes',                                   where: 'Accueil' },
      { time: '10h45–11h15', label: 'Marionnette géante par la Troupe Caravane',              where: 'Déambulatoire' },
      { time: '10h45–11h15', label: 'BicOasis en déambulatoire',                              where: 'Déambulatoire' },
      { time: '10h45–11h45', label: 'Chevaliers de l’AMQ : jeu du peuple',                    where: 'Arène' },
      { time: '11h15–12h15', label: 'Spectacle de Las Noches Bohemias',                       where: 'Carrousel' },
      { time: '11h15–12h00', label: 'Danse aérienne',                                         where: 'Scène' },
      { time: '11h45–12h15', label: 'Parcours d’herboristerie par Morgane la Sage',           where: 'Village paysan' },
      { time: '11h45–12h15', label: 'Vente aux enchères de la Forge',                         where: 'Village paysan' },
      { time: '12h30–13h30', label: 'Spectacle d’Alhambra',                                   where: 'Carrousel' },
      { time: '13h00–14h00', label: 'Conférence : qui sont les Roma, par la Troupe Caravane', where: 'Village paysan' },
      { time: '13h00–14h00', label: 'Tournoi de « boat fight » : combat viking',              where: 'Arène' },
      { time: '13h30–15h00', label: 'Banquet de l’Équinoxe',                                  where: 'Scène' },
      { time: '14h00–15h00', label: 'Finale de joute par l’AMQ',                              where: 'Arène' },
    ],
  },
];

// ── Les identifiants ────────────────────────────────────────────────
// Ce que gcloud a déjà déposé sur cette machine suffit.
function preparerIdentifiants() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return 'GOOGLE_APPLICATION_CREDENTIALS';

  const defaut = path.join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  if (existsSync(defaut)) return 'identifiants par défaut de gcloud';

  const dossier = path.join(homedir(), '.config', 'gcloud', 'legacy_credentials');
  if (existsSync(dossier)) {
    for (const compte of readdirSync(dossier)) {
      const adc = path.join(dossier, compte, 'adc.json');
      if (existsSync(adc)) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = adc;
        return `compte gcloud ${compte}`;
      }
    }
  }
  return null;
}

const essai = process.argv.includes('--essai');
const total = JOURS.reduce((n, j) => n + j.items.length, 0);

for (const j of JOURS) {
  console.log(`\n${j.dateFR}  (${j.items.length})`);
  for (const it of j.items) console.log(`  ${it.time.padEnd(14)} ${it.label}  ·  ${it.where}`);
}
console.log(`\n${total} entrées sur ${JOURS.length} jours.`);

if (essai) {
  console.log('Essai : rien n’a été écrit.');
  process.exit(0);
}

const source = preparerIdentifiants();
if (!source) {
  console.error(`
Firestore refuse de s’ouvrir : aucun identifiant sur cette machine.

Lance ceci une seule fois, puis relance l’import :
  gcloud auth application-default login --project ${PROJET}
`);
  process.exit(1);
}

const requireFonctions = createRequire(path.join(racine, 'functions', 'package.json'));
const admin = requireFonctions('firebase-admin');
admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault() });
const db = admin.firestore();

await db.collection('schedule').doc(String(ANNEE)).set({
  year: ANNEE,
  days: JOURS,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedBy: 'outil-horaire',
  updatedByEmail: 'admin@festivalmedievaldemontpellier.org',
});

console.log(`Écrit dans schedule/${ANNEE} (${source}).`);
process.exit(0);
