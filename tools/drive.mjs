// ─── Le Drive du festival, depuis le terminal ───────────────────────
// Alex, 2026-09-02 : « j'ai plusieurs clients, ils sont tous
// INDÉPENDANTS et je travaille dessus par terminal ». Le connecteur de
// claude.ai est global au compte et reste donc sur un seul client. Cet
// outil-ci vit dans le dépôt du festival, avec les identifiants du
// festival, et ne connaît aucun autre client. Le même fichier se copie
// tel quel dans un autre dépôt, avec d'autres identifiants.
//
//   node tools/drive.mjs connexion            une seule fois
//   node tools/drive.mjs inventaire [dossier] parcourt tout et range le résultat
//   node tools/drive.mjs deplacer <fichier> <dossier>
//   node tools/drive.mjs dossier <nom> <parent>
//
// Les identifiants se lisent dans .env.local :
//   FMM_DRIVE_CLIENT_ID=...
//   FMM_DRIVE_CLIENT_SECRET=...
// Le jeton se dépose dans .drive-token.json, jamais versionné.

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireF = createRequire(path.join(racine, 'functions', 'package.json'));
const { OAuth2Client } = requireF('google-auth-library');

const PORTE = 53682;
const REDIRECTION = `http://127.0.0.1:${PORTE}`;
const PORTEE = 'https://www.googleapis.com/auth/drive';
const JETON = path.join(racine, '.drive-token.json');
const DOSSIER_RACINE = '1n_9ep-iECXTwxBM89fGR5_tQsvjVnhLL'; // Medieval PRIMARY FOLDER

// ── Les identifiants ────────────────────────────────────────────────
function lireEnv() {
  const f = path.join(racine, '.env.local');
  if (!existsSync(f)) return {};
  const out = {};
  for (const ligne of readFileSync(f, 'utf8').split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function client() {
  const env = { ...lireEnv(), ...process.env };
  const id = env.FMM_DRIVE_CLIENT_ID;
  const secret = env.FMM_DRIVE_CLIENT_SECRET;
  if (!id || !secret) {
    console.error(`
Il manque les identifiants du festival.

Dans la console Google Cloud du projet festivalmedieval, crée un
identifiant client OAuth de type « Application de bureau », publie
l'écran de consentement en production avec la portée Drive, puis pose
ces deux lignes dans .env.local :

  FMM_DRIVE_CLIENT_ID=...
  FMM_DRIVE_CLIENT_SECRET=...
`);
    process.exit(1);
  }
  const c = new OAuth2Client({ clientId: id, clientSecret: secret, redirectUri: REDIRECTION });
  if (existsSync(JETON)) c.setCredentials(JSON.parse(readFileSync(JETON, 'utf8')));
  return c;
}

// ── La connexion, une seule fois ────────────────────────────────────
async function connexion() {
  const c = client();
  const url = c.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: [PORTEE] });
  console.log(`\nOuvre cette adresse dans le navigateur du compte QUI POSSÈDE le Drive du festival :\n\n${url}\n`);
  const code = await new Promise((resolve, reject) => {
    const s = createServer((req, res) => {
      const u = new URL(req.url, REDIRECTION);
      const c2 = u.searchParams.get('code');
      res.end(c2 ? 'C’est fait. Tu peux fermer cet onglet.' : 'Aucun code reçu.');
      s.close();
      c2 ? resolve(c2) : reject(new Error('aucun code'));
    });
    s.listen(PORTE);
  });
  const { tokens } = await c.getToken(code);
  writeFileSync(JETON, JSON.stringify(tokens, null, 2));
  console.log(`Jeton déposé dans ${JETON}. Il n'est pas versionné.`);
}

// ── L'appel à l'API ─────────────────────────────────────────────────
async function api(c, chemin, params = {}, methode = 'GET', corps) {
  const u = new URL(`https://www.googleapis.com/drive/v3/${chemin}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) u.searchParams.set(k, String(v));
  const r = await c.request({ url: u.toString(), method: methode, data: corps });
  return r.data;
}

const CHAMPS = 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, parents, owners(emailAddress), webViewLink, trashed)';

async function enfants(c, dossier) {
  const out = [];
  let page;
  do {
    const d = await api(c, 'files', {
      q: `'${dossier}' in parents and trashed = false`,
      fields: CHAMPS, pageSize: 1000, pageToken: page,
      supportsAllDrives: true, includeItemsFromAllDrives: true,
    });
    out.push(...(d.files ?? []));
    page = d.nextPageToken;
  } while (page);
  return out;
}

const DOSSIER = 'application/vnd.google-apps.folder';

async function inventaire(depart = DOSSIER_RACINE) {
  const c = client();
  const tout = [];
  const file = [{ id: depart, chemin: '' }];
  let vus = 0;
  while (file.length) {
    const { id, chemin } = file.shift();
    const liste = await enfants(c, id);
    for (const f of liste) {
      const ici = `${chemin}/${f.name}`;
      tout.push({
        id: f.id, nom: f.nom ?? f.name, chemin: ici, type: f.mimeType,
        taille: Number(f.size ?? 0), modifie: f.modifiedTime, cree: f.createdTime,
        proprietaire: f.owners?.[0]?.emailAddress ?? '', lien: f.webViewLink,
        dossier: f.mimeType === DOSSIER,
      });
      if (f.mimeType === DOSSIER) file.push({ id: f.id, chemin: ici });
    }
    vus += liste.length;
    process.stderr.write(`\r${vus} entrées parcourues, ${file.length} dossiers en attente…`);
  }
  process.stderr.write('\n');
  mkdirSync(path.join(racine, 'docs'), { recursive: true });
  const sortie = path.join(racine, 'docs', 'drive-inventaire.json');
  writeFileSync(sortie, JSON.stringify(tout, null, 1));
  const dossiers = tout.filter((f) => f.dossier).length;
  const poids = tout.reduce((n, f) => n + f.taille, 0);
  console.log(`${tout.length} entrées, dont ${dossiers} dossiers, ${(poids / 1e9).toFixed(2)} Go. Inventaire dans ${sortie}`);
}

async function deplacer(fichier, versDossier) {
  const c = client();
  const avant = await api(c, `files/${fichier}`, { fields: 'id, name, parents', supportsAllDrives: true });
  await api(c, `files/${fichier}`, {
    addParents: versDossier, removeParents: (avant.parents ?? []).join(','),
    fields: 'id, parents', supportsAllDrives: true,
  }, 'PATCH', {});
  console.log(`« ${avant.name} » déplacé. Ancien parent : ${(avant.parents ?? []).join(',')}`);
}

async function creerDossier(nom, parent = DOSSIER_RACINE) {
  const c = client();
  const d = await api(c, 'files', { fields: 'id, name', supportsAllDrives: true }, 'POST', {
    name: nom, mimeType: DOSSIER, parents: [parent],
  });
  console.log(`Dossier « ${d.name} » créé : ${d.id}`);
}

const [, , commande, a, b] = process.argv;
if (commande === 'connexion') await connexion();
else if (commande === 'inventaire') await inventaire(a);
else if (commande === 'deplacer') await deplacer(a, b);
else if (commande === 'dossier') await creerDossier(a, b);
else console.log('Commandes : connexion · inventaire [dossier] · deplacer <fichier> <dossier> · dossier <nom> [parent]');
