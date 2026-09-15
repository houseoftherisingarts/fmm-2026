// ─── Une seule liste d'équipe, recopiée partout ─────────────────────
// Alex, 2026-08-24 : « Est-ce que c'est possible de consolider les
// deux ? Je ne comprends pas ce que je dois faire. »
//
// La réponse : il n'a rien à faire. La liste vit dans
// config/equipe-admin.json, et ce script la recopie dans les trois
// endroits qui en ont besoin. Il tourne tout seul avant chaque
// déploiement, donc les copies ne peuvent plus diverger.
//
//   1. firestore.rules      · la base refuse les autres
//   2. functions/index.js   · l'envoi de masse refuse les autres
//   3. .env.local           · le site montre l'espace admin
//
// Lancement manuel : npm run equipe

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '..');

const source = path.join(racine, 'config', 'equipe-admin.json');
const { equipe, cuisine = [] } = JSON.parse(fs.readFileSync(source, 'utf8'));
const courriels = equipe
  .map((m) => String(m.courriel || '').trim().toLowerCase())
  .filter(Boolean);

// Qui est super-admin dans le navigateur. Les autres membres de
// l'équipe gardent l'accès aux données (les règles ci-dessous les
// reconnaissent toujours) mais leur rôle vient de adminRoles, ce qui
// permet de donner le CA à quelqu'un sans lui donner les clés des rôles.
// Le rôle doit être écrit noir sur blanc : une fiche qui l'oublie tombe
// au CA, jamais au super-admin, pour qu'un ajout distrait n'ouvre pas la
// gestion des rôles à quelqu'un qui ne l'a pas demandée. Si plus personne
// n'est super, le script refuse de recopier quoi que ce soit.
const courrielsSuper = equipe
  .filter((m) => m.role === 'super')
  .map((m) => String(m.courriel || '').trim().toLowerCase())
  .filter(Boolean);

// Le coin Nourriture et Bar s'ouvre à des personnes nommées, jamais à
// un rôle : Alex l'a demandé le 15 septembre 2026, après avoir constaté
// que l'inventaire du container était ouvert à tout porteur de rôle.
const courrielsCuisine = cuisine
  .map((m) => String(m.courriel || '').trim().toLowerCase())
  .filter(Boolean);

if (courriels.length === 0) {
  console.error('[equipe] La liste est vide. Rien n’a été recopié, par prudence.');
  process.exit(1);
}
if (courrielsSuper.length === 0) {
  console.error('[equipe] Aucun super-admin. Rien n’a été recopié : personne ne pourrait plus donner un rôle.');
  process.exit(1);
}

/** Remplace ce qui se trouve entre deux repères, repères compris. */
function entreLesReperes(texte, debut, fin, contenu, fichier) {
  const i = texte.indexOf(debut);
  const j = texte.indexOf(fin);
  if (i === -1 || j === -1) {
    console.error(`[equipe] Repères introuvables dans ${fichier}. Rien n’a bougé.`);
    process.exit(1);
  }
  return texte.slice(0, i + debut.length) + contenu + texte.slice(j);
}

let touches = 0;
const ecrire = (chemin, avant, apres) => {
  if (avant === apres) return;
  fs.writeFileSync(chemin, apres, 'utf8');
  touches += 1;
};

// ── 1. Les règles Firestore ───────────────────────────────────────
{
  const chemin = path.join(racine, 'firestore.rules');
  const avant = fs.readFileSync(chemin, 'utf8');
  const lignes = equipe
    .map((m) => `          '${m.courriel.trim().toLowerCase()}',${m.qui ? ` // ${m.qui}` : ''}`)
    .join('\n');
  const apres = entreLesReperes(
    avant,
    '// ÉQUIPE:DÉBUT (écrit par scripts/sync-equipe.mjs)\n',
    '          // ÉQUIPE:FIN',
    `${lignes}\n`,
    'firestore.rules',
  );
  const lignesCuisine = cuisine
    .map((m) => `          '${m.courriel.trim().toLowerCase()}',${m.qui ? ` // ${m.qui}` : ''}`)
    .join('\n');
  const apres2 = entreLesReperes(
    apres,
    '// CUISINE:DÉBUT (écrit par scripts/sync-equipe.mjs)\n',
    '          // CUISINE:FIN',
    `${lignesCuisine}\n`,
    'firestore.rules',
  );
  ecrire(chemin, avant, apres2);
}

// ── 2. La fonction d'envoi ────────────────────────────────────────
{
  const chemin = path.join(racine, 'functions', 'index.js');
  const avant = fs.readFileSync(chemin, 'utf8');
  const lignes = equipe
    .map((m) => `  '${m.courriel.trim().toLowerCase()}',${m.qui ? ` // ${m.qui}` : ''}`)
    .join('\n');
  const apres = entreLesReperes(
    avant,
    '// ÉQUIPE:DÉBUT (écrit par scripts/sync-equipe.mjs)\n',
    '  // ÉQUIPE:FIN',
    `${lignes}\n`,
    'functions/index.js',
  );
  ecrire(chemin, avant, apres);
}

// ── 3. Le site ────────────────────────────────────────────────────
// VITE_ADMIN_EMAILS décide qui voit l'espace admin dans le navigateur.
// Le fichier n'est pas versionné : s'il manque, nous le disons sans
// bloquer, parce qu'un déploiement depuis une autre machine reste
// possible avec la variable posée autrement.
{
  const chemin = path.join(racine, '.env.local');
  const ligne = `VITE_ADMIN_EMAILS=${courrielsSuper.join(',')}`;
  const ligneCuisine = `VITE_CUISINE_EMAILS=${courrielsCuisine.join(',')}`;
  if (!fs.existsSync(chemin)) {
    console.warn(`[equipe] .env.local est absent. Posez ces lignes où vous bâtissez :\n${ligne}\n${ligneCuisine}`);
  } else {
    const avant = fs.readFileSync(chemin, 'utf8');
    const poser = (texte, cle, valeur) => (texte.match(new RegExp(`^${cle}=.*$`, 'm'))
      ? texte.replace(new RegExp(`^${cle}=.*$`, 'm'), valeur)
      : `${texte.replace(/\s*$/, '')}\n${valeur}\n`);
    let apres = poser(avant, 'VITE_ADMIN_EMAILS', ligne);
    apres = poser(apres, 'VITE_CUISINE_EMAILS', ligneCuisine);
    ecrire(chemin, avant, apres);
  }
}

const noms = equipe.map((m) => m.qui || m.courriel).join(', ');
console.log(`[equipe] ${courriels.length} membres recopiés (${noms}), dont ${courrielsSuper.length} super-admins.`);
console.log(`[equipe] Cuisine : ${courrielsCuisine.length} personnes (${cuisine.map((m) => m.qui || m.courriel).join(', ')}). Fichiers modifiés : ${touches}.`);
