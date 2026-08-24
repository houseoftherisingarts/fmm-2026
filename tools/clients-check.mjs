// Vérification du registre des clients (aucun cadre de test installé).
//   node tools/clients-check.mjs
//
// Ce que le script protège : la clé d'unicité. Un courriel mal rangé
// fabrique deux fiches pour la même personne, et le jour où Alex écrit
// à sa liste, quelqu'un reçoit le message en double pendant qu'un autre
// ne le reçoit jamais. Le compte des billets et le classement par
// catégorie tiennent la même corde : douze billets doivent donner une
// fiche à douze, pas douze fiches à un.
//
// Aucune donnée réelle ici. Les personnes de ce fichier sont inventées.

import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = join(mkdtempSync(join(tmpdir(), 'clients-')), 'clients.mjs');
await build({
  entryPoints: ['src/firebase/clients.ts'],
  bundle: true, format: 'esm', outfile: out, logLevel: 'warning',
  // Le module tire la configuration de Vite : hors du navigateur, elle
  // est vide et Firebase reste endormi.
  define: { 'import.meta.env': '{}' },
});
const C = await import(out);

let ko = 0;
const ok = (cond, msg) => { if (!cond) { console.log('KO', msg); ko++; } };

// ── Le courriel se range avant de servir de clé ─────────────────────
ok(C.normaliserCourriel('  Jean.Tremblay@GMAIL.com ') === 'jean.tremblay@gmail.com',
  'la casse et les espaces de bout tombent');
ok(C.normaliserCourriel('jean @ exemple.com') === 'jean@exemple.com',
  'les espaces du milieu tombent aussi');
for (const mauvais of ['', '   ', 'None', 'pas-une-adresse', 'jean@exemple', '@exemple.com', null, undefined, 42]) {
  ok(C.normaliserCourriel(mauvais) === '', `une adresse douteuse (${JSON.stringify(mauvais)}) ne devient jamais une clé`);
}

// ── L'identifiant tient l'unicité ───────────────────────────────────
ok(C.identifiantClient(2026, 'billets', 'Jean@Exemple.COM') === '2026__billets__jean@exemple.com',
  'l’identifiant range le courriel au passage');
ok(C.identifiantClient(2026, 'billets', 'jean@exemple.com')
   === C.identifiantClient(2026, 'billets', ' JEAN@exemple.com '),
  'deux écritures de la même adresse donnent le même identifiant');
ok(C.identifiantClient(2025, 'billets', 'jean@exemple.com')
   !== C.identifiantClient(2026, 'billets', 'jean@exemple.com'),
  'la même personne se range à part d’une année à l’autre');
ok(C.identifiantClient(2026, 'camping', 'jean@exemple.com')
   !== C.identifiantClient(2026, 'billets', 'jean@exemple.com'),
  'la même personne se range à part d’une catégorie à l’autre');
ok(C.identifiantClient(C.ANNEE_PRESUMEE, 'camping', 'jean@exemple.com') === '2024__camping__jean@exemple.com',
  'l’année présumée range la fiche comme n’importe quelle autre');

// ── Les articles se lisent ──────────────────────────────────────────
ok(C.analyserArticle('3 × Prévente').quantite === 3, 'trois préventes se comptent trois');
ok(C.analyserArticle('3 × Prévente').libelle === 'Prévente', 'le libellé perd son compteur');
ok(C.analyserArticle('1 × 10x20').quantite === 1 && C.analyserArticle('1 × 10x20').libelle === '10x20',
  'un kiosque 10x20 reste un kiosque 10x20, pas dix fois vingt');
ok(C.analyserArticle('10x20').quantite === 1 && C.analyserArticle('10x20').libelle === '10x20',
  'un libellé sans compteur vaut un');
ok(C.analyserArticle('Adulte Passe Weekend').quantite === 1, 'un type de billet vaut un billet');

// ── Le classement par catégorie et par année ────────────────────────
const classe = (nom) => {
  const r = C.categorieEtAnnee(nom);
  return `${r.categorie}/${r.annee ?? 'null'}`;
};
ok(classe('FMM 2026_8-24-2026.xlsx') === 'billets/2026', 'l’export des billets tombe dans billets 2026');
ok(classe('Camping 2026_8-24-2026.xlsx') === 'camping/2026', 'le camping tombe dans camping');
ok(classe('Kiosques 2026_8-24-2026.xlsx') === 'kiosques/2026', 'les kiosques tombent dans kiosques');
ok(classe('Kiosques 2025_8-24-2026.xlsx') === 'kiosques/2025',
  'la date d’export ne se confond pas avec l’année des ventes');
ok(classe('Prévente Festival Medieval de Montpellier 2025_8-24-2026.xlsx') === 'billets/2025',
  'une prévente reste des billets');
ok(classe('Bal Folk du 24 Mai 2024_8-24-2026.xlsx') === 'bal-folk/2024', 'le bal folk a sa catégorie');
ok(classe('Mécènes du Festival_8-24-2026.xlsx') === 'mecenes/null',
  'les mécènes n’ont pas d’année dans leur nom de fichier, l’import ira la lire dans les dates');
ok(classe('Camping Médiéval de Montpellier_8-24-2026.xlsx') === 'camping/null',
  'un nom sans année rend null plutôt qu’un chiffre tiré de la date d’export');
ok(C.categorieEtAnnee('Prévente - Festival Medieval de Montpellier - Edition Nouvelle France_8-24-2026.xlsx').edition
   === 'Nouvelle France',
  'l’édition thématique se retient');

// ── Les trois formes de colonnes ────────────────────────────────────
ok(C.formeDuFichier(["Nom de l'acheteur", 'Articles', 'Statut de traitement']) === 'boutique',
  'une colonne Articles annonce la forme boutique');
ok(C.formeDuFichier(["Nom de l'invité", 'Type de billet', 'Statut']) === 'billets',
  'une colonne Type de billet annonce la forme billets');
ok(C.formeDuFichier(['Date du paiement', 'Montant total', 'Courriel']) === 'dons',
  'une colonne Montant total annonce la forme dons');

// ── La fusion : douze billets, une seule fiche ──────────────────────
const billet = (courriel, type, extra = {}) => ({
  courriel, nom: 'Aliénor de Bretagne', annee: 2026, categorie: 'billets',
  articles: [{ libelle: type, quantite: 1 }], ...extra,
});

const douze = Array.from({ length: 12 }, () => billet('alienor@exemple.com', 'Adulte Passe Weekend'));
const [fiche] = C.fusionnerClients(douze);
ok(C.fusionnerClients(douze).length === 1, 'douze billets ne font qu’une seule personne');
ok(fiche.quantite === 12, 'les douze billets se comptent');
ok(fiche.lignes === 12, 'la fiche se souvient des douze lignes fondues');
ok(fiche.detail === '12 × Adulte Passe Weekend', 'le détail dit ce qu’elle a pris');
ok(fiche.statut === 'confirme', 'une commande valide est confirmée');

// Deux lignes de la même personne écrites différemment : une fiche.
const deuxEcritures = C.fusionnerClients([
  billet('Alienor@Exemple.com', 'Adulte Passe Weekend'),
  billet('  alienor@exemple.com  ', 'Enfant Passe Weekend'),
]);
ok(deuxEcritures.length === 1, 'deux écritures du même courriel ne font qu’une fiche');
ok(deuxEcritures[0].quantite === 2, 'les deux billets se comptent quand même');
ok(deuxEcritures[0].detail.includes('1 × Adulte Passe Weekend')
   && deuxEcritures[0].detail.includes('1 × Enfant Passe Weekend'),
  'le détail garde les deux types');

// Le plus gros type passe devant dans le résumé.
const melange = C.fusionnerClients([
  ...Array.from({ length: 3 }, () => billet('alienor@exemple.com', 'Adulte Passe Weekend')),
  billet('alienor@exemple.com', 'Enfant Passe Weekend'),
]);
ok(melange[0].detail === '3 × Adulte Passe Weekend · 1 × Enfant Passe Weekend',
  'le résumé va du plus gros au plus petit');

// ── La même personne, deux catégories ───────────────────────────────
const deuxCategories = C.fusionnerClients([
  billet('alienor@exemple.com', 'Adulte Passe Weekend'),
  { courriel: 'alienor@exemple.com', nom: 'Aliénor de Bretagne', annee: 2026, categorie: 'camping',
    articles: [{ libelle: 'Espace Caravane (VR)', quantite: 1 }] },
]);
ok(deuxCategories.length === 2, 'billets et camping restent deux fiches distinctes');
ok(new Set(deuxCategories.map((f) => f.categorie)).size === 2, 'chacune garde sa catégorie');

// ── Les annulations ─────────────────────────────────────────────────
const avecAnnule = C.fusionnerClients([
  billet('alienor@exemple.com', 'Adulte Passe Weekend'),
  billet('alienor@exemple.com', 'Adulte Passe Weekend', { annule: true }),
]);
ok(avecAnnule[0].quantite === 1, 'un billet annulé ne se compte pas');
ok(avecAnnule[0].statut === 'confirme', 'une seule ligne valide suffit à confirmer la personne');

const toutAnnule = C.fusionnerClients([billet('alienor@exemple.com', 'Adulte Passe Weekend', { annule: true })]);
ok(toutAnnule.length === 1, 'une personne entièrement annulée garde une trace');
ok(toutAnnule[0].statut === 'annule', 'et elle est marquée annulée');
ok(toutAnnule[0].quantite === 0, 'sans rien au compteur');

// ── Sans courriel, pas de fiche ─────────────────────────────────────
ok(C.fusionnerClients([billet('', 'Adulte Passe Weekend'), billet('None', 'Adulte Passe Weekend')]).length === 0,
  'une ligne sans courriel ne fabrique pas de fiche fantôme');

// ── D'où vient l'année ──────────────────────────────────────────────
// Alex a tranché le 24 août : un export qui ne date rien vient des
// années où le festival ne datait pas ses fichiers, donc 2024. La fiche
// doit dire d'où sort son année, sans quoi le présumé et le certain se
// confondent au premier coup d'œil.
ok(C.ANNEE_PRESUMEE === 2024, 'l’année présumée est 2024');

const presumee = C.fusionnerClients([
  { courriel: 'alienor@exemple.com', nom: 'Aliénor', annee: C.ANNEE_PRESUMEE,
    anneeSource: 'defaut-2024', categorie: 'camping',
    articles: [{ libelle: 'Caravane', quantite: 1 }] },
]);
ok(presumee[0].annee === 2024, 'la fiche porte bien 2024');
ok(presumee[0].anneeSource === 'defaut-2024', 'et elle dit que l’année est présumée');
ok(C.anneesPresumees(presumee).length === 1, 'les fiches présumées se retrouvent d’un geste');

const datee = C.fusionnerClients([
  { courriel: 'mecene@exemple.com', nom: 'Guillaume', annee: 2023, anneeSource: 'donnees',
    categorie: 'mecenes', montant: 5 },
]);
ok(datee[0].anneeSource === 'donnees', 'une année lue dans une date le dit aussi');
ok(C.anneesPresumees(datee).length === 0, 'et elle ne se compte pas parmi les présumées');

// ── Les dons ────────────────────────────────────────────────────────
const dons = C.fusionnerClients([
  { courriel: 'mecene@exemple.com', nom: 'Guillaume', annee: 2023, categorie: 'mecenes', montant: 25 },
  { courriel: 'mecene@exemple.com', nom: 'Guillaume', annee: 2023, categorie: 'mecenes', montant: 5 },
  { courriel: 'mecene@exemple.com', nom: 'Guillaume', annee: 2023, categorie: 'mecenes', montant: 100, annule: true },
]);
ok(dons.length === 1, 'trois paiements du même mécène font une fiche');
ok(dons[0].montant === 30, 'les montants s’additionnent, l’incomplet reste dehors');
ok(dons[0].quantite === 2, 'deux paiements aboutis se comptent');
ok(dons[0].detail === '2 dons · 30,00 $', 'le détail dit le nombre et la somme');

// ── Déjà venu au festival ───────────────────────────────────────────
const venu = C.fusionnerClients([
  billet('alienor@exemple.com', 'Adulte Passe Weekend', { dejaVenu: null }),
  billet('alienor@exemple.com', 'Adulte Passe Weekend', { dejaVenu: true }),
]);
ok(venu[0].dejaVenu === true, 'un oui quelque part vaut déjà venue');
const jamais = C.fusionnerClients([billet('alienor@exemple.com', 'Adulte Passe Weekend', { dejaVenu: false })]);
ok(jamais[0].dejaVenu === false, 'un non reste un non');

// ── Qui n'a rien acheté cette année ─────────────────────────────────
// La question qu'Alex pose avant d'inviter les gens des années passées.
const registre = [
  ...C.fusionnerClients([billet('revenu@exemple.com', 'Adulte Passe Weekend')]),
  ...C.fusionnerClients([billet('parti@exemple.com', 'Adulte Passe Weekend', { annee: 2025 })]),
  ...C.fusionnerClients([billet('revenu@exemple.com', 'Adulte Passe Weekend', { annee: 2025 })]),
  ...C.fusionnerClients([billet('annule2026@exemple.com', 'Adulte Passe Weekend', { annule: true })]),
];
const de2026 = C.courrielsDeLAnnee(registre, 2026);
ok(de2026.has('revenu@exemple.com'), 'qui a acheté en 2026 est dans le groupe de 2026');
ok(!de2026.has('parti@exemple.com'), 'qui n’a acheté qu’en 2025 n’y est pas');
ok(!de2026.has('annule2026@exemple.com'), 'une commande annulée ne compte pas comme un achat');
const aRelancer = registre.filter((c) => c.annee === 2025 && !de2026.has(c.courriel));
ok(aRelancer.length === 1 && aRelancer[0].courriel === 'parti@exemple.com',
  'une seule personne de 2025 est à relancer');

// ── Les années du registre ──────────────────────────────────────────
ok(C.anneesDuRegistre(registre).join() === '2026,2025', 'les années se rangent de la plus récente à la plus vieille');

// ── La recherche ────────────────────────────────────────────────────
ok(C.filtrerClients(registre, 'ALIÉNOR').length === registre.length, 'la casse et les accents ne changent rien');
ok(C.filtrerClients(registre, 'alienor').length === registre.length, 'chercher sans accent trouve quand même');
ok(C.filtrerClients(registre, 'parti@').length === 1, 'la recherche par courriel trouve une personne');
ok(C.filtrerClients(registre, '  ').length === registre.length, 'une recherche vide ne retranche personne');
ok(C.filtrerClients(registre, 'saltimbanque').length === 0, 'un terme que personne ne porte ne trouve rien');

console.log(ko ? `${ko} vérification(s) en échec` : 'clients : tout passe');
process.exit(ko ? 1 : 0);
