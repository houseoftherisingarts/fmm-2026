"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vhCollecter = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const zlib_1 = require("zlib");
const commun_1 = require("./commun");
// ─── La collecte : lots d'événements et morceaux d'enregistrement ───────────
// Voir commun.ts pour la vue d'ensemble du module.
// La cadence se compte par instance et par adresse (240 lots la minute); la
// borne ferme reste maxInstances × 240. Le compteur se vide de ses entrées
// mortes dès qu'il grossit, pour que la mémoire ne suive pas le nombre
// d'adresses vues dans la journée.
const cadence = new Map();
function tropVite(ip) {
    const cle = (0, commun_1.hash)((ip || 'inconnue') + (0, commun_1.jourDe)(Date.now()));
    const now = Date.now();
    if (cadence.size > 5000) {
        for (const [k, v] of cadence)
            if (now - v.t > 60000)
                cadence.delete(k);
    }
    const e = cadence.get(cle);
    if (!e || now - e.t > 60000) {
        cadence.set(cle, { n: 1, t: now });
        return false;
    }
    e.n += 1;
    return e.n > 240;
}
// Débit global de l'instance, toutes adresses confondues, en lots et en
// octets bruts, compté avant de décompresser quoi que ce soit : l'adresse IP
// derrière l'hébergement se lit à sa place dans x-forwarded-for, mais un
// appel direct à l'URL run.app de la fonction (que l'hébergement doit pouvoir
// appeler sans jeton) peut forger une adresse et un sid par requête et
// contourner les cadences; ce plafond borne ce qu'un tel appel peut écrire
// (1 200 lots et 30 Mo par minute et par instance, six instances au plus).
// Le vrai trafic reste loin dessous (un lot par visiteuse toutes les huit
// secondes); en cas de déluge, les vraies visiteuses de l'instance inondée
// reçoivent aussi 429 et leurs lots de la minute tombent, c'est le prix.
const DEBIT_GLOBAL_PAR_MIN = 1200;
const OCTETS_GLOBAL_PAR_MIN = 30 * 1024 * 1024;
let debit = { n: 0, o: 0, t: 0 };
function tropDeMonde(octets) {
    const now = Date.now();
    if (now - debit.t > 60000)
        debit = { n: 0, o: 0, t: now };
    debit.n += 1;
    debit.o += octets;
    return debit.n > DEBIT_GLOBAL_PAR_MIN || debit.o > OCTETS_GLOBAL_PAR_MIN;
}
// L'hôte annoncé par le navigateur (Origin, sinon Referer) doit être le site.
function hotePermis(req) {
    const hote = (0, commun_1.hoteDe)(req.get('origin') || req.get('referer') || '');
    return commun_1.HOTES_PERMIS.includes(hote);
}
// Le corps se borne avant d'être décompressé et relu : la taille brute, puis
// la taille décompressée (un petit gzip peut cacher des gigaoctets).
function corpsDe(req) {
    let buf = req.rawBody;
    if (!buf || !buf.length) {
        if (typeof req.body === 'string')
            buf = Buffer.from(req.body);
        else if (req.body && typeof req.body === 'object')
            return req.body;
        else
            return null;
    }
    if (buf.length > commun_1.TAILLE_MAX_REPLAY)
        throw new Error('corps trop gros');
    if (buf[0] === 0x1f && buf[1] === 0x8b)
        buf = (0, zlib_1.gunzipSync)(buf, { maxOutputLength: commun_1.TAILLE_MAX_REPLAY });
    return JSON.parse(buf.toString('utf8'));
}
let reglages = { actif: true, exclure: [], ips: new Set(), t: 0 };
async function lireReglages(db) {
    if (Date.now() - reglages.t < commun_1.CACHE_REGLAGES_MS)
        return reglages;
    try {
        const [r, x] = await Promise.all([
            db.collection(commun_1.DOC_REGLAGES[0]).doc(commun_1.DOC_REGLAGES[1]).get(),
            db.collection(commun_1.DOC_EXCLUSIONS[0]).doc(commun_1.DOC_EXCLUSIONS[1]).get(),
        ]);
        const liste = (x.data()?.ips || []);
        const exclure = (Array.isArray(r.data()?.exclure) ? r.data().exclure : []);
        reglages = {
            actif: r.exists ? r.data().actif !== false : true,
            exclure: exclure.map(c => (0, commun_1.texte)(c, 200)).filter(c => c.startsWith('/')),
            ips: new Set(liste.map(e => String(e?.ip || '').trim()).filter(Boolean)),
            t: Date.now(),
        };
    }
    catch (e) {
        console.error('[vexelhotjar] réglages illisibles', e.message);
        reglages = { ...reglages, t: Date.now() };
    }
    return reglages;
}
const cheminIgnore = (path, exclure) => exclure.some(p => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'));
// ─── vhCollecter : la porte d'entrée du script ──────────────────────────────
exports.vhCollecter = (0, https_1.onRequest)({ region: 'us-central1', memory: '256MiB', maxInstances: 6, timeoutSeconds: 30 }, async (req, res) => {
    const origine = req.get('origin') || '';
    if (commun_1.ORIGINES_DEV.includes(origine)) {
        res.set('Access-Control-Allow-Origin', origine);
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    // GET /api/vh?moi : l'adresse de qui appelle, vue d'ici, par le même
    // chemin que les lots (l'hébergement, puis cette fonction), pour que le
    // bouton « Exclure cette adresse » de l'admin pose la bonne.
    if (req.method === 'GET') {
        if (!('moi' in req.query)) {
            res.status(404).send('');
            return;
        }
        res.set('Cache-Control', 'no-store');
        res.json({ ip: (0, commun_1.adresseDe)(req), chaine: (0, commun_1.chaineDe)(req), pays: (0, commun_1.texte)(req.get('x-country-code') || '', 2) || null });
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('');
        return;
    }
    if (!hotePermis(req)) {
        res.status(403).send('');
        return;
    }
    const ip = (0, commun_1.adresseDe)(req);
    if (tropVite(ip) || tropDeMonde(req.rawBody?.length || 0)) {
        res.status(429).send('');
        return;
    }
    let d;
    try {
        d = corpsDe(req);
    }
    catch {
        res.status(400).send('');
        return;
    }
    if (!d || typeof d !== 'object' || d.v !== 1) {
        res.status(400).send('');
        return;
    }
    const site = (0, commun_1.texte)(d.site, 40);
    const sid = (0, commun_1.texte)(d.sid, 64);
    if (tropVite('sid:' + sid)) {
        res.status(429).send('');
        return;
    }
    if (!commun_1.SITES_PERMIS.includes(site) || !/^[a-z0-9-]{8,64}$/.test(sid)) {
        res.status(400).send('');
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    const r = await lireReglages(db);
    if (!r.actif || (ip && r.ips.has(ip))) {
        res.status(204).send('');
        return;
    }
    const pays = (0, commun_1.texte)(req.get('x-country-code') || req.get('cf-ipcountry') || '', 2).toUpperCase() || undefined;
    const recu = Date.now();
    try {
        if (d.t === 'replay') {
            await recevoirReplay(db, site, sid, d, recu);
        }
        else {
            await recevoirLot(db, site, sid, d, recu, pays, r.exclure);
        }
    }
    catch (e) {
        console.error('[vexelhotjar] lot refusé', e.message);
        res.status(400).send('');
        return;
    }
    res.status(204).send('');
});
async function recevoirLot(db, site, sid, d, recu, pays, exclure = []) {
    const ev = Array.isArray(d.ev) ? d.ev.slice(0, commun_1.EVENEMENTS_MAX) : [];
    if (!ev.length)
        return;
    if (Buffer.byteLength(JSON.stringify(ev)) > commun_1.TAILLE_MAX_LOT)
        throw new Error('lot trop gros');
    const parcours = Array.isArray(d.parcours) ? d.parcours.slice(0, 60).map((p) => (0, commun_1.texte)(p, 200)) : [];
    const vid = (0, commun_1.texte)(d.vid, 64) || undefined;
    // Les événements sont nettoyés champ par champ : rien d'autre que ce que
    // le script est censé envoyer n'entre dans la base.
    const propres = ev.map((e) => nettoyer(e)).filter(Boolean).filter(e => !cheminIgnore(e.path, exclure));
    if (!propres.length)
        return;
    const premier = propres.find(e => e.t === 'vue');
    const sorties = propres.filter(e => e.t === 'sortie');
    const nbClics = propres.filter(e => e.t === 'clic').length;
    const rage = propres.filter(e => e.t === 'clic' && e.r).length;
    const mort = propres.filter(e => e.t === 'clic' && e.m).length;
    const erreurs = propres.filter(e => e.t === 'erreur').length;
    const dureeMs = sorties.reduce((s, e) => s + (e.duree || 0), 0);
    const debut = Math.min(...propres.map(e => e.ts));
    const fin = Math.max(...propres.map(e => e.ts));
    const lot = db.collection('vh_lots').doc();
    const session = db.collection('vh_sessions').doc(sid);
    const existante = await session.get();
    const batch = db.batch();
    batch.set(lot, { site, sid, vid: vid || null, nouveau: !!d.nouveau, recu: firestore_1.Timestamp.fromMillis(recu), jour: (0, commun_1.jourDe)(recu), ev: propres, agrege: false });
    const fiche = {
        site, sid,
        fin: firestore_1.Timestamp.fromMillis(fin),
        nbClics: firestore_1.FieldValue.increment(nbClics),
        rage: firestore_1.FieldValue.increment(rage),
        mort: firestore_1.FieldValue.increment(mort),
        erreurs: firestore_1.FieldValue.increment(erreurs),
        dureeMs: firestore_1.FieldValue.increment(dureeMs),
    };
    if (parcours.length) {
        fiche.parcours = parcours;
        fiche.nbPages = parcours.length;
    }
    if (vid)
        fiche.vid = vid;
    if (pays)
        fiche.pays = pays;
    if (premier) {
        if (premier.premier) {
            fiche.debut = firestore_1.Timestamp.fromMillis(premier.ts);
            fiche.jour = (0, commun_1.jourDe)(premier.ts);
            fiche.device = premier.device;
            fiche.vw = premier.vw;
            fiche.lang = premier.lang || null;
            fiche.ref = premier.ref || null;
            fiche.utm = premier.utm || null;
            fiche.nouveau = !!d.nouveau;
            fiche.entree = premier.path;
        }
        const derniere = propres.filter(e => e.t === 'vue').pop();
        if (derniere)
            fiche.derniere = derniere.path;
    }
    // Une session dont la première vue s'est perdue garde tout de même une
    // date de début, posée une seule fois et jamais reculée ni avancée.
    if (!existante.exists || !existante.get('debut')) {
        fiche.debut = fiche.debut || firestore_1.Timestamp.fromMillis(debut);
        fiche.jour = fiche.jour || (0, commun_1.jourDe)(debut);
    }
    batch.set(session, fiche, { merge: true });
    await batch.commit();
}
function nettoyer(e) {
    if (!e || typeof e !== 'object')
        return null;
    const t = (0, commun_1.texte)(e.t, 10);
    const ts = (0, commun_1.nombre)(e.ts, 1600000000000, 4000000000000, 0);
    const path = (0, commun_1.cheminSur)(e.path);
    const pv = (0, commun_1.texte)(e.pv, 40);
    if (!ts || !pv)
        return null;
    const base = { t, ts, path, pv };
    switch (t) {
        case 'vue': {
            const vw = (0, commun_1.nombre)(e.vw, 200, 10000, 1280);
            const utm = e.utm && typeof e.utm === 'object'
                ? Object.fromEntries(Object.entries(e.utm).slice(0, 5).map(([k, v]) => [(0, commun_1.texte)(k, 20), (0, commun_1.texte)(v, 80)]))
                : null;
            return {
                ...base,
                titre: (0, commun_1.texte)(e.titre, 120),
                ref: (0, commun_1.texte)(e.ref, 300),
                vw, vh: (0, commun_1.nombre)(e.vh, 200, 10000, 800),
                device: (0, commun_1.deviceDe)(vw),
                lang: (0, commun_1.texte)(e.lang, 8),
                premier: !!e.premier,
                utm: utm && Object.keys(utm).length ? utm : null,
            };
        }
        case 'sortie':
            return {
                ...base,
                duree: (0, commun_1.nombre)(e.duree, 0, 6 * 3600000),
                scrollMax: (0, commun_1.nombre)(e.scrollMax, 0, 100),
                // 1 : la vue de page est close (changement de page ou fermeture); 0 : l'onglet
                // passe à l'arrière-plan. Un traceur d'avant ce champ (pages statiques en
                // cache) n'envoie que fin : clos vaut alors fin, comme avant.
                clos: e.clos === undefined ? (e.fin ? 1 : 0) : (e.clos ? 1 : 0),
                pages: (0, commun_1.nombre)(e.pages, 0, 1000),
                fin: !!e.fin,
                vw: (0, commun_1.nombre)(e.vw, 200, 10000, 1280),
            };
        case 'clic':
            return {
                ...base,
                s: (0, commun_1.texte)(e.s, 300),
                tx: (0, commun_1.texte)(e.tx, 60),
                href: (0, commun_1.texte)(e.href, 300),
                tg: (0, commun_1.texte)(e.tg, 12),
                ex: (0, commun_1.nombre)(e.ex, 0, 1), ey: (0, commun_1.nombre)(e.ey, 0, 1),
                vx: (0, commun_1.nombre)(e.vx, 0, 1), dy: (0, commun_1.nombre)(e.dy, 0, 200000), hd: (0, commun_1.nombre)(e.hd, 0, 200000),
                vw: (0, commun_1.nombre)(e.vw, 200, 10000, 1280),
                r: !!e.r, m: !!e.m, ia: !!e.ia,
                obj: (0, commun_1.texte)(e.obj, 40) || null,
                niv: e.niv === 'gros' ? 'gros' : 'petit',
            };
        case 'mouv': {
            const pts = Array.isArray(e.pts) ? e.pts.slice(0, 800).map((n) => (0, commun_1.nombre)(n, 0, 200000)) : [];
            // nrm: 1 quand le traceur a déjà mis y en dix-millièmes de la hauteur
            // du document au moment de chaque point; sinon hd sert à le faire ici.
            return { ...base, vw: (0, commun_1.nombre)(e.vw, 200, 10000, 1280), hd: (0, commun_1.nombre)(e.hd, 0, 200000), nrm: e.nrm ? 1 : 0, pts };
        }
        case 'erreur':
            return { ...base, msg: (0, commun_1.texte)(e.msg, 200), src: (0, commun_1.texte)(e.src, 200), ligne: (0, commun_1.nombre)(e.ligne, 0, 1e6) };
        case 'form':
            return { ...base, s: (0, commun_1.texte)(e.s, 300), etat: (0, commun_1.texte)(e.etat, 10), champ: (0, commun_1.texte)(e.champ, 80) };
        case 'objectif':
            return { ...base, nom: (0, commun_1.texte)(e.nom, 40), niv: e.niv === 'gros' ? 'gros' : 'petit' };
        default:
            return null;
    }
}
async function recevoirReplay(db, site, sid, d, recu) {
    const seq = (0, commun_1.nombre)(d.seq, 0, 100000);
    const events = d.events;
    if (!Array.isArray(events) || !events.length)
        return;
    const json = JSON.stringify(events);
    if (json.length > commun_1.TAILLE_MAX_REPLAY)
        throw new Error('morceau trop gros');
    const gz = (0, zlib_1.gzipSync)(Buffer.from(json));
    const fichier = (0, storage_1.getStorage)().bucket().file(`vh/replays/${sid}/${String(seq).padStart(5, '0')}.json.gz`);
    await fichier.save(gz, { contentType: 'application/gzip', resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
    const ref = db.collection('vh_sessions').doc(sid);
    const fiche = await ref.get();
    const maj = {
        site, sid,
        enregistre: true,
        chunks: firestore_1.FieldValue.increment(1),
        octets: firestore_1.FieldValue.increment(gz.length),
        replayMaj: firestore_1.Timestamp.fromMillis(recu),
    };
    // La date de début vient du premier lot d'événements; si l'enregistrement
    // arrive avant lui, elle se pose ici et le lot ne la déplacera pas.
    if (!fiche.exists || !fiche.get('debut')) {
        maj.debut = firestore_1.Timestamp.fromMillis(recu);
        maj.jour = (0, commun_1.jourDe)(recu);
    }
    await ref.set(maj, { merge: true });
}
