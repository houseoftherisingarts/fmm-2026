// ─── Le bottin des ressources, versé dans le carnet ──────────────────
// Alex, 2026-09-02 : « il faudrait rajouter dans l'admin du festival un
// genre de bottin téléphonique des ressources, notamment la
// municipalité de Montpellier ». Les fiches vivent dans la collection
// `carnetContacts`, celle que la section Bottin et contacts affiche.
//
//   node tools/bottin-seed.mjs             (essai : montre, n'écrit rien)
//   node tools/bottin-seed.mjs --ecrire    (écrit pour de vrai)
//
// L'essai est le comportement par défaut, à l'inverse des autres outils
// du dossier : un bottin faux coûte plus cher qu'un bottin vide, et
// personne ne doit pouvoir le remplir par accident.
//
// Rejouable sans dégât : chaque fiche porte un identifiant calculé sur
// son nom, et l'écriture se fait en fusion. Relancer l'outil corrige les
// fiches versées ici sans toucher à ce que l'équipe a écrit à la main
// dans les champs que le bottin ne connaît pas.
//
// ⚠️ RÈGLE DE VÉRITÉ. Aucune coordonnée de ce fichier n'est devinée.
// Chaque fiche porte sa source et la date où elle a été vérifiée. Une
// donnée qui n'a pas pu être vérifiée reste VIDE, et la note dit ce qui
// manque et où aller le chercher. Un numéro plausible mais jamais vu sur
// une page officielle est pire que pas de numéro du tout : il envoie
// quelqu'un ailleurs pendant une urgence.
//
// ⚠️ Ce bottin ne porte QUE des ressources et l'équipe d'organisation.
// Les marchands, les bénévoles et les musiciens ont leurs propres
// sections dans la régie : les verser ici mélangerait deux registres et
// noierait les numéros qu'on cherche en courant.

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');
const PROJET = 'festivalmedieval';
const COLLECTION = 'carnetContacts';

// La date où les ressources publiques ci-dessous ont été vérifiées sur
// les sites officiels. À changer le jour où quelqu'un les revérifie.
const VERIFIE_LE = '2026-09-02';

const SOURCE_EQUIPE = "Drive du festival, feuille « Equipe d'Organization 2023 - Info Contact »";

// ── L'équipe d'organisation ─────────────────────────────────────────
// Tirée telle quelle de la feuille de 2023. Trois éditions ont passé
// depuis : chaque fiche part donc sans date de vérification, ce que la
// régie affiche comme « À vérifier ».
const EQUIPE = [
  { name: 'Tristan Coté-Hotte', fonction: 'Chef du festival', phone: '819 428-1280',
    email: 'tristan_cote_hotte@hotmail.fr',
    notes: "Aussi connu sous le nom de Sergei Stanoffsky. Subventions, animation et thème narratif, comptabilité, tournois d'épée, coordination générale. Numéro de la maison." },
  { name: 'Océane Leclair', fonction: 'Coordination du village paysan', phone: '514 882-5023',
    email: 'oceaneleclair@gmail.com', notes: '' },
  { name: 'Jesse Dippy', fonction: 'Coordination du village paysan et de la foire locale', phone: '904 994-4072',
    email: 'jesse.dippy@gmail.com', notes: 'Cellulaire américain : prévoir les frais et le décalage.' },
  { name: 'Carilynn Proulx', fonction: 'Chevaux et clinique équestre', phone: '819 981-0838',
    email: 'carilynnlrouche@hotmail.com', notes: "S'occupe des chevaux de l'AMQ et coordonne la clinique à cheval." },
  { name: 'Samuelle Pilon', fonction: 'Coordination du village paysan', phone: '819 981-1645',
    email: 'samlpilon@outlook.com', notes: 'Aussi appelée Sam ou Sami.' },
  { name: 'Éric Pichette', fonction: 'Coordination du son, de la scène et des musiciens', phone: '819 983-8643',
    email: 'info@tanwen.qc.ca', notes: "Surnommé Pitch. Performe aussi dans le groupe l'Harfang." },
  { name: 'Alex St-Laurent', fonction: 'Site web, médias sociaux, vidéo', phone: '514 418-3450',
    email: 'alex@lesalondesinconnus.com', notes: '' },
  { name: 'Mikael Lamarche', fonction: 'Construction et planification du site', phone: '819 981-1631',
    email: 'lamarchemikael45@gmail.com', notes: 'Surnommé Mik.' },
  { name: "Nicolas l'Écuyer-Pilon", fonction: 'Restauration et bar', phone: '819 981-0604',
    email: 'nicolaslecuyerpilon@gmail.com', notes: 'Surnommé Nic.' },
  { name: 'Maïté Fournel', fonction: 'Gestion des bénévoles', phone: '438 530-4093',
    email: 'm.fournel11@gmail.com', notes: '' },
  { name: 'Arthur Adrien', fonction: 'Master bénévoles', phone: '514 651-9090',
    email: 'arthuradrien514@gmail.com', notes: '' },
].map((membre) => ({
  ...membre,
  role: 'organisateur',
  organisation: 'Festival Médiéval de Montpellier',
  adresse: '',
  urgence: false,
  verifieLe: '',
  source: SOURCE_EQUIPE,
  notes: [membre.notes, "Coordonnées de l'édition 2023, à reconfirmer auprès de la personne."]
    .filter(Boolean).join(' '),
}));

// ── Les ressources publiques du secteur ─────────────────────────────
// Vérifiées une à une sur les sites officiels le 2026-09-02. Chaque
// fiche porte l'adresse de la page consultée dans son champ `source`.
const RESSOURCES = [
  // ── Les urgences, celles qui montent dans le bandeau ──────────────
  {
    name: 'Urgence 911', role: 'service-public', urgence: true,
    fonction: 'Police, incendie et ambulance',
    organisation: '', phone: '911', email: '', adresse: '',
    notes: "Le seul numéro à composer quand quelqu'un est blessé, qu'un feu prend ou qu'une personne devient menaçante. Donner l'adresse du site : 4, rue du Bosquet, Montpellier.",
    verifieLe: VERIFIE_LE,
    source: 'https://mrcpapineau.com/services/surete-du-quebec/',
  },
  {
    name: 'Info-Santé et Info-Social 811', role: 'service-public', urgence: true,
    fonction: 'Conseil d’une infirmière ou d’un intervenant social',
    organisation: 'CISSS de l’Outaouais', phone: '811', email: '', adresse: '',
    notes: "Ouvert jour et nuit. À appeler pour une blessure ou un malaise qui ne justifie pas le 911, avant d'envoyer quelqu'un à l'urgence.",
    verifieLe: VERIFIE_LE,
    source: 'https://cisss-outaouais.gouv.qc.ca/language/en/my-cisss/contact-us/',
  },
  {
    name: 'Sûreté du Québec, poste de la MRC de Papineau', role: 'service-public', urgence: true,
    fonction: 'Michel Pageau, responsable de poste',
    organisation: 'Sûreté du Québec', phone: '819 427-6269',
    email: 'poste.mrc.papineau@surete.qc.ca',
    adresse: '380, rue Papineau, Papineauville (Québec) J0V 1R0',
    notes: "Administration du lundi au vendredi, de 8 h 30 à 16 h 30. La couverture policière des vingt-cinq municipalités de la MRC, Montpellier comprise, tient jour et nuit. Une urgence se signale au 911, jamais à ce numéro.",
    verifieLe: VERIFIE_LE,
    source: 'https://mrcpapineau.com/services/surete-du-quebec/',
  },
  {
    name: 'Hôpital et CHSLD de Papineau', role: 'service-public', urgence: true,
    fonction: 'Urgence régionale, ouverte jour et nuit',
    organisation: 'CISSS de l’Outaouais', phone: '819 986-3341', email: '',
    adresse: '155, rue Maclaren Est, Gatineau (Québec) J8L 2M4',
    notes: "L'urgence la plus proche du site, dans le secteur Buckingham. Compter environ une heure de route depuis Montpellier.",
    verifieLe: VERIFIE_LE,
    source: 'https://cisss-outaouais.gouv.qc.ca/language/en/list-of-hospitals/papineau-hospital-and-chsld/',
  },
  {
    name: 'Hydro-Québec, pannes et urgences', role: 'service-public', urgence: true,
    fonction: 'Interruptions de service', organisation: 'Hydro-Québec',
    phone: '1 800 790-2424', email: '', adresse: '',
    notes: "Ouvert jour et nuit. Suivi des pannes sur pannes.hydroquebec.com. Un fil tombé ou un poteau accroché est un danger immédiat : composer le 911 d'abord.",
    verifieLe: VERIFIE_LE,
    source: 'https://www.hydroquebec.com/contact-us/',
  },

  // ── La municipalité et les services publics ───────────────────────
  {
    name: 'Municipalité de Montpellier', role: 'service-public',
    fonction: 'Denis Tassé, maire · Manon Lanthier, directrice générale',
    organisation: '', phone: '819 428-3663', email: 'reception@montpellier.ca',
    adresse: '4, rue du Bosquet, Montpellier (Québec) J0V 1M0',
    notes: "Ouvert le lundi de 8 h à 12 h et de 13 h à 16 h, fermé le mardi, puis du mercredi au vendredi aux mêmes heures. À VÉRIFIER PAR UN APPEL : deux sources se contredisent sur lequel du 819 428-3663 et du 819 428-1221 est le téléphone et lequel est le télécopieur. La fiche officielle de la MRC donne le 819 428-3663 comme téléphone.",
    verifieLe: VERIFIE_LE,
    source: 'https://mrcpapineau.com/portrait-de-la-mrc/montpellier/',
  },
  {
    name: 'MRC de Papineau', role: 'service-public',
    fonction: 'Roxanne Lauzon, directrice générale et greffière-trésorière',
    organisation: '', phone: '819 427-6243 poste 1301', email: 'info@mrc-papineau.com',
    adresse: '266, rue Viger, Papineauville (Québec) J0V 1R0',
    notes: "Ouvert du lundi au jeudi de 8 h à 12 h et de 13 h à 16 h, le vendredi de 8 h à 12 h. Le poste 1301 est l'accueil. Rémy Laprise, directeur général adjoint, se joint au poste 1327.",
    verifieLe: VERIFIE_LE,
    source: 'https://mrcpapineau.com/equipe/',
  },
  {
    name: 'Service de sécurité incendie de Montpellier', role: 'service-public',
    fonction: '', organisation: 'Municipalité de Montpellier',
    phone: '', email: '',
    adresse: '4, rue du Bosquet, Montpellier (Québec)',
    notes: "TÉLÉPHONE MANQUANT. La caserne numéro 14 partage le bâtiment du bureau municipal, et aucun document officiel ne publie de ligne administrative distincte de celle de la municipalité. Une urgence se signale au 911. Pour joindre la caserne autrement, passer par le bureau municipal au 819 428-3663 et faire inscrire le numéro ici.",
    verifieLe: VERIFIE_LE,
    source: 'https://mrcpapineau.com/wp-content/uploads/2023/05/scri-version-finale-amendee-2022v2.pdf, schéma de couverture de risques, tableau 6, page 15',
  },
  {
    name: 'Service régional de prévention incendie de la MRC de Papineau', role: 'service-public',
    fonction: 'Éric Lacasse, coordonnateur',
    organisation: 'MRC de Papineau', phone: '819 427-6243 poste 1309', email: '',
    adresse: '266, rue Viger, Papineauville (Québec) J0V 1R0',
    notes: "L'interlocuteur pour tout ce qui touche la prévention sur le site : plan de sécurité, feux ouverts, foyers, chapiteaux, extincteurs. À appeler bien avant le montage, pas la veille.",
    verifieLe: VERIFIE_LE,
    source: 'https://mrcpapineau.com/wp-content/uploads/2023/05/scri-version-finale-amendee-2022v2.pdf',
  },
  {
    name: 'CLSC de la Petite-Nation', role: 'service-public',
    fonction: 'Services courants et prélèvements',
    organisation: 'CISSS de l’Outaouais', phone: '819 983-7341', email: '',
    adresse: '14, rue Saint-André, Saint-André-Avellin (Québec) J0V 1W0',
    notes: "Ouvert du lundi au vendredi de 8 h à 21 h, fermé de 11 h 30 à 13 h 15. Ce n'est pas une salle d'urgence : une blessure sérieuse va au 911 ou à l'Hôpital de Papineau. C'est le point de service le plus proche du site.",
    verifieLe: VERIFIE_LE,
    source: 'https://cisss-outaouais.gouv.qc.ca/language/en/clsc-list/petite-nation-clsc/',
  },
  {
    name: 'CISSS de l’Outaouais', role: 'service-public',
    fonction: 'Information générale', organisation: '',
    phone: '819 966-6000', email: '', adresse: '',
    notes: "Composer le 0 après l'accueil pour parler à quelqu'un. ADRESSE MANQUANTE : la page officielle Nous joindre renvoie à une carte des installations plutôt qu'à une adresse écrite, et les annuaires tiers n'ont pas valeur de source. Pour une question de santé, le 811 répond plus vite.",
    verifieLe: VERIFIE_LE,
    source: 'https://cisss-outaouais.gouv.qc.ca/language/en/my-cisss/contact-us/',
  },
  {
    name: 'Coopérative des paramédics de l’Outaouais', role: 'service-public',
    fonction: 'Service préhospitalier d’urgence de la région',
    organisation: '', phone: '819 643-5005', email: 'info@paramedic.coop',
    adresse: '505, boulevard des Affaires, Gatineau (Québec) J8R 0B2',
    notes: "Numéro administratif du siège, à utiliser pour préparer une présence ambulancière sur le site. Une urgence passe toujours par le 911. La caserne satellite de Saint-André-Avellin dessert la Petite-Nation, mais son adresse et son numéro directs ne sont publiés nulle part : les demander en appelant le siège.",
    verifieLe: VERIFIE_LE,
    source: 'https://www.paramedic.coop/a-propos/notre-cooperative/',
  },
  {
    name: 'Info-Excavation', role: 'service-public',
    fonction: 'Demandes de localisation avant de creuser',
    organisation: '', phone: '1 800 663-9228', email: '', adresse: '',
    notes: "À appeler avant de planter un piquet de chapiteau, de creuser une tranchée ou d'ancrer une structure. Ouvert jour et nuit. ADRESSE MANQUANTE : le site info-ex.com bloque la lecture automatisée, et le numéro vient de la page d'Hydro-Québec qui le cite.",
    verifieLe: VERIFIE_LE,
    source: 'https://www.hydroquebec.com/quartiersansfil/devez-creuser.html',
  },
  {
    name: 'Régie du bâtiment du Québec', role: 'service-public',
    fonction: 'Ligne générale', organisation: '',
    phone: '1 800 361-0761', email: '',
    adresse: '255, boulevard Crémazie Est, rez-de-chaussée local 040, Montréal (Québec) H2M 1L5',
    notes: "Ouvert les lundi, mardi, jeudi et vendredi de 8 h 30 à 16 h 30, le mercredi de 10 h à 16 h 30. L'interlocuteur pour les installations temporaires, les estrades et les appareils sous pression.",
    verifieLe: VERIFIE_LE,
    source: 'https://www.rbq.gouv.qc.ca/en/contact-us/',
  },
  {
    name: 'MAPAQ, direction régionale de l’Outaouais', role: 'service-public',
    fonction: 'Permis d’exploitation d’un établissement alimentaire',
    organisation: 'Ministère de l’Agriculture, des Pêcheries et de l’Alimentation',
    phone: '819 986-8544', email: 'outaouais@mapaq.gouv.qc.ca',
    adresse: '117, avenue Lépine, local 104, Gatineau (Québec) J8L 3G1',
    notes: "Le festival sert de la nourriture, donc ce permis le vise. Sans frais : 1 888 536-2720. La ligne provinciale dédiée aux permis est le 1 800 463-5023. Prendre rendez-vous avant de se présenter au bureau.",
    verifieLe: VERIFIE_LE,
    source: 'https://www.quebec.ca/gouvernement/ministeres-organismes/agriculture-pecheries-alimentation/coordonnees-structure/bureaux-regionaux',
  },
  {
    name: 'Régie des alcools, des courses et des jeux', role: 'service-public',
    fonction: 'Permis de réunion', organisation: '',
    phone: '1 800 363-0320', email: 'demande.permisalcool@racj.gouv.qc.ca',
    adresse: '200, chemin Sainte-Foy, bureau 400, Québec (Québec) G1R 1T3',
    notes: "La demande doit leur parvenir au moins quinze jours avant l'événement. Aucun bureau régional en Outaouais : la ligne sans frais est la voie. Pour une question générale, racj.quebec@racj.gouv.qc.ca.",
    verifieLe: VERIFIE_LE,
    source: 'https://www.racj.gouv.qc.ca/nous-joindre/coordonnees-a-utiliser-pour-nous-transmettre-des-documents-ou-nous-joindre/permis-de-reunion.html',
  },
  {
    name: 'Croix-Rouge canadienne, Québec', role: 'service-public',
    fonction: 'Services aux sinistrés', organisation: '',
    phone: '', email: '', adresse: '',
    notes: "TÉLÉPHONE MANQUANT. Le site croixrouge.ca bloque la lecture automatisée : un numéro provincial circule (1 800 363-7305) mais il n'a pas pu être lu sur une page officielle, donc il n'est pas inscrit ici. À ouvrir dans un navigateur ordinaire, puis à compléter.",
    verifieLe: '',
    source: 'croixrouge.ca, page inaccessible le 2026-09-02',
  },
];

// ── L'assemblage ────────────────────────────────────────────────────

const FICHE_VIDE = {
  name: '', role: 'autre', allegiance: 'neutre', fonction: '', organisation: '',
  email: '', phone: '', notes: '', lastContactAt: '',
  adresse: '', urgence: false, verifieLe: '', source: '',
  photoUrl: '', photoPath: '', archived: false, order: 0,
};

/** L'identifiant d'une fiche se calcule sur son nom, pour qu'une
 *  deuxième exécution corrige la fiche existante au lieu d'en créer une
 *  jumelle. Préfixé, pour qu'on voie d'un coup d'œil dans la base ce qui
 *  vient de cet outil et ce que l'équipe a saisi elle-même. */
function identifiant(nom) {
  const cle = nom
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `bottin-${cle}`;
}

const fiches = [...EQUIPE, ...RESSOURCES].map((f) => ({ ...FICHE_VIDE, ...f }));

// Un doublon d'identifiant ferait qu'une fiche en écraserait une autre
// en silence. Mieux vaut refuser de tourner.
const vus = new Set();
for (const f of fiches) {
  const id = identifiant(f.name);
  if (vus.has(id)) throw new Error(`Deux fiches portent le même identifiant « ${id} ». Distinguez leurs noms.`);
  vus.add(id);
}

const manquantes = fiches.filter((f) => !f.phone && !f.email);
const aVerifier = fiches.filter((f) => !f.verifieLe);

// ── Le mode essai ───────────────────────────────────────────────────

const ecrire = process.argv.includes('--ecrire');

if (!ecrire) {
  // --json rend les mêmes fiches en JSON, pour les relire ailleurs sans
  // toucher à la base : c'est ce qui a servi à regarder la section à
  // l'écran avant qu'une seule ligne ne soit écrite dans Firestore.
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(fiches.map((f) => ({ id: identifiant(f.name), ...f })), null, 2));
    process.exit(0);
  }
  console.log(`\nESSAI. Rien ne sera écrit. Ajoutez --ecrire pour verser dans ${COLLECTION}.\n`);
  let familleCourante = null;
  for (const f of fiches) {
    if (f.role !== familleCourante) {
      familleCourante = f.role;
      console.log(`\n── ${familleCourante} ──`);
    }
    const marques = [f.urgence ? 'URGENCE' : '', f.verifieLe ? `vérifié ${f.verifieLe}` : 'À VÉRIFIER']
      .filter(Boolean).join(', ');
    console.log(`  ${identifiant(f.name)}`);
    console.log(`    ${f.name}${f.fonction ? ` · ${f.fonction}` : ''}  [${marques}]`);
    console.log(`    tél. ${f.phone || '(vide)'}   courriel ${f.email || '(vide)'}`);
    if (f.adresse) console.log(`    ${f.adresse}`);
    if (f.notes) console.log(`    note : ${f.notes}`);
    if (f.source) console.log(`    source : ${f.source}`);
  }
  console.log(`\n${fiches.length} fiche(s) prêtes.`);
  console.log(`  ${aVerifier.length} sans date de vérification, affichées « À vérifier » dans la régie.`);
  if (manquantes.length) {
    console.log(`  ${manquantes.length} sans téléphone ni courriel : ${manquantes.map((f) => f.name).join(', ')}.`);
  }
  console.log('\nEssai terminé, la base n’a pas été touchée.\n');
  process.exit(0);
}

// ── L'écriture ──────────────────────────────────────────────────────
// Les identifiants : ce que gcloud a déjà déposé sur cette machine
// suffit. Patron repris de tools/migrer-chaleur.mjs.
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

const source = preparerIdentifiants();
if (!source) {
  console.error(`
Firestore refuse de s’ouvrir : aucun identifiant sur cette machine.

Lance ceci une seule fois, puis relance l’outil :
  gcloud auth application-default login --project ${PROJET}
`);
  process.exit(1);
}

const requireFonctions = createRequire(path.join(racine, 'functions', 'package.json'));
const admin = requireFonctions('firebase-admin');
admin.initializeApp({ projectId: PROJET, credential: admin.credential.applicationDefault() });
const db = admin.firestore();

console.log(`Identifiants : ${source}. Écriture de ${fiches.length} fiche(s) dans ${COLLECTION}…`);

const lot = db.batch();
for (const f of fiches) {
  lot.set(db.collection(COLLECTION).doc(identifiant(f.name)), {
    ...f,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}
await lot.commit();

console.log(`${fiches.length} fiche(s) versées. ${aVerifier.length} restent à vérifier dans la régie.`);
