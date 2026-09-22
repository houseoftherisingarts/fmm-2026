"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vhPurger = exports.vhEffacerSession = exports.vhAgregerMaintenant = exports.vhAgreger = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const admin_1 = require("./admin");
const commun_1 = require("./commun");
function inc(j, chemin, n = 1) { j.compteurs[chemin] = (j.compteurs[chemin] || 0) + n; }
// Un document de journée ne grossit pas sans fin : au-delà du plafond d'une
// famille (pages, sources, campagnes, erreurs, formulaires, objectifs, et
// les éléments cliqués d'une page), les nouvelles clés du jour se laissent
// tomber; ce qui est déjà dans le document continue de se compter.
function borner(J, existant) {
    const admis = new Map();
    const garde = (famille, cle, max, initial) => {
        let s = admis.get(famille);
        if (!s) {
            s = new Set(initial());
            admis.set(famille, s);
        }
        if (s.has(cle))
            return true;
        if (s.size >= max)
            return false;
        s.add(cle);
        return true;
    };
    const ok = (chemin) => {
        const seg = chemin.split('.');
        const max = commun_1.PLAFONDS_JOURNEE[seg[0]];
        if (max !== undefined && seg.length >= 2 && !garde(seg[0], seg[1], max, () => Object.keys(existant[seg[0]] || {})))
            return false;
        if (seg[0] === 'pages' && seg[2] === 'elements' && seg.length >= 4) {
            const famille = `pages.${seg[1]}.elements`;
            if (!garde(famille, seg[3], commun_1.ELEMENTS_PAR_PAGE_MAX, () => Object.keys(existant.pages?.[seg[1]]?.elements || {})))
                return false;
        }
        return true;
    };
    for (const k of Object.keys(J.compteurs))
        if (!ok(k))
            delete J.compteurs[k];
    for (const k of Object.keys(J.textes))
        if (!ok(k))
            delete J.textes[k];
}
// Les plafonds par famille ne suffisent pas à garantir le mégaoctet de
// Firestore (cent pages de trente éléments aux longs sélecteurs le dépassent) :
// on mesure, et les éléments cliqués des pages les moins vues tombent d'abord,
// puis la liste d'erreurs. Les compteurs de la journée s'écrivent toujours.
function alleger(J, existant) {
    const base = Buffer.byteLength(JSON.stringify(existant));
    const taille = () => base + Buffer.byteLength(JSON.stringify(J.compteurs)) + Buffer.byteLength(JSON.stringify(J.textes));
    if (taille() <= commun_1.TAILLE_MAX_JOUR)
        return;
    const vues = new Map();
    for (const k of Object.keys(J.compteurs)) {
        const m = /^pages\.([^.]+)\.elements\./.exec(k);
        if (m && !vues.has(m[1]))
            vues.set(m[1], (J.compteurs[`pages.${m[1]}.vues`] || 0) + (existant.pages?.[m[1]]?.vues || 0));
    }
    const ordre = [...vues.entries()].sort((a, b) => a[1] - b[1]).map(([p]) => p);
    for (const p of ordre) {
        if (taille() <= commun_1.TAILLE_MAX_JOUR)
            break;
        const prefixe = `pages.${p}.elements.`;
        for (const k of Object.keys(J.compteurs))
            if (k.startsWith(prefixe))
                delete J.compteurs[k];
        for (const k of Object.keys(J.textes))
            if (k.startsWith(prefixe))
                delete J.textes[k];
    }
    if (taille() > commun_1.TAILLE_MAX_JOUR) {
        for (const k of Object.keys(J.textes))
            if (k.startsWith('erreursListe.'))
                delete J.textes[k];
        for (const k of Object.keys(J.compteurs))
            if (k.startsWith('erreursListe.'))
                delete J.compteurs[k];
    }
    if (taille() > commun_1.TAILLE_MAX_JOUR)
        console.warn(`[vexelhotjar] journée au plafond : ${taille()} octets, seuls les compteurs passent`);
}
async function agreger(db, maxLots = commun_1.LOTS_PAR_TOUR) {
    // Les lots frais d'abord; sinon ceux qu'un tour précédent a réclamés sans
    // jamais les marquer (fonction tuée en route), passé trente minutes.
    let docs = (await db.collection('vh_lots').where('agrege', '==', false).orderBy('recu').limit(maxLots).get()).docs;
    if (!docs.length) {
        const oublies = await db.collection('vh_lots').where('agrege', '==', 'encours').orderBy('recu').limit(maxLots).get();
        const limite = Date.now() - commun_1.RECLAMATION_MS;
        docs = oublies.docs.filter(d => { const r = d.get('reclame'); return !(r instanceof firestore_1.Timestamp) || r.toMillis() < limite; });
    }
    if (!docs.length)
        return 0;
    // Réclamer avant de fondre : un lot n'entre qu'une fois dans les chiffres,
    // même si le tour meurt en route (il se reprendra, voir plus haut).
    const reclame = firestore_1.Timestamp.now();
    for (let i = 0; i < docs.length; i += 450) {
        const b = db.batch();
        // set + merge plutôt qu'update : un lot effacé entre-temps (vhEffacerSession)
        // ne fait pas échouer tout le lot d'écritures, il renaît en souche avec sa
        // date et la purge l'emporte plus tard.
        for (const d of docs.slice(i, i + 450))
            b.set(d.ref, { agrege: 'encours', reclame, recu: d.get('recu') }, { merge: true });
        await b.commit();
    }
    const journees = new Map();
    const cartes = new Map();
    const journee = (cle) => {
        let j = journees.get(cle);
        if (!j) {
            j = { compteurs: {}, textes: {} };
            journees.set(cle, j);
        }
        return j;
    };
    const carte = (cle) => {
        let c = cartes.get(cle);
        if (!c) {
            c = { clics: [], mouv: [], vues: 0, scroll: {} };
            cartes.set(cle, c);
        }
        return c;
    };
    for (const doc of docs) {
        const lot = doc.data();
        const site = lot.site;
        const recuMs = lot.recu instanceof firestore_1.Timestamp ? lot.recu.toMillis() : Date.now();
        for (const e of lot.ev || []) {
            // L'horloge du visiteur date l'événement, sauf quand elle est décalée
            // de plus de six heures : l'heure de réception prend alors le relais.
            const ts = Math.abs(Number(e.ts) - recuMs) > commun_1.DERIVE_HORLOGE_MS ? recuMs : Number(e.ts);
            const jour = (0, commun_1.jourDe)(ts);
            const J = journee(`${site}_${jour}`);
            const page = (0, commun_1.clePage)(e.path);
            J.textes[`pages.${page}.path`] = e.path;
            const device = e.device || (0, commun_1.deviceDe)(e.vw || 1280);
            const cleCarte = `${site}_${jour}_${device}_${page}`;
            switch (e.t) {
                case 'vue': {
                    inc(J, 'vues');
                    inc(J, `pages.${page}.vues`);
                    inc(J, `heures.h${(0, commun_1.heureDe)(ts)}`);
                    inc(J, `appareils.${device}`);
                    if (e.titre)
                        J.textes[`pages.${page}.titre`] = e.titre;
                    if (e.premier) {
                        inc(J, 'sessions');
                        if (lot.nouveau)
                            inc(J, 'nouveaux');
                        inc(J, `entrees.${page}`);
                        const hote = (0, commun_1.hoteDe)(e.ref);
                        inc(J, `sources.${hote ? (0, commun_1.hash)(hote) : 'direct'}.n`);
                        J.textes[`sources.${hote ? (0, commun_1.hash)(hote) : 'direct'}.nom`] = hote || 'Accès direct';
                        if (e.utm?.utm_source) {
                            const k = (0, commun_1.hash)(e.utm.utm_source + '|' + (e.utm.utm_campaign || ''));
                            inc(J, `campagnes.${k}.n`);
                            J.textes[`campagnes.${k}.source`] = e.utm.utm_source;
                            J.textes[`campagnes.${k}.campagne`] = e.utm.utm_campaign || '';
                        }
                    }
                    carte(cleCarte).vues += 1;
                    break;
                }
                case 'sortie': {
                    inc(J, 'dureeMs', e.duree);
                    inc(J, `pages.${page}.dureeMs`, e.duree);
                    // Une vue peut sortir plusieurs fois (l'onglet passe à l'arrière-plan,
                    // puis revient) : seule la sortie qui clôt la vue (clos : changement
                    // de page dans l'application ou fermeture) compte pour le défilement,
                    // en paliers de 5 % atteints, une fois par vue; fin (la visite quitte
                    // le site) compte pour les rebonds. Les lots d'avant le champ clos
                    // n'ont que fin. La carte de défilement lit ensuite « 62 % des
                    // visites ont vu ce palier ».
                    const clos = 'clos' in e ? !!e.clos : !!e.fin;
                    if (e.fin) {
                        inc(J, 'fins');
                        if (e.pages <= 1)
                            inc(J, 'rebonds');
                    }
                    if (!clos)
                        break;
                    inc(J, `pages.${page}.sorties`);
                    const C = carte(cleCarte);
                    for (let b = 0; b <= 100; b += 5) {
                        if (e.scrollMax >= b) {
                            inc(J, `pages.${page}.scroll.b${b}`);
                            C.scroll[`b${b}`] = (C.scroll[`b${b}`] || 0) + 1;
                        }
                    }
                    inc(J, `pages.${page}.scrollN`);
                    break;
                }
                case 'clic': {
                    inc(J, 'clics');
                    inc(J, `pages.${page}.clics`);
                    if (e.r) {
                        inc(J, 'rage');
                        inc(J, `pages.${page}.rage`);
                    }
                    if (e.m) {
                        inc(J, 'morts');
                        inc(J, `pages.${page}.morts`);
                    }
                    if (e.obj) {
                        inc(J, `objectifs.${(0, commun_1.hash)(e.obj)}.n`);
                        J.textes[`objectifs.${(0, commun_1.hash)(e.obj)}.nom`] = e.obj;
                        J.textes[`objectifs.${(0, commun_1.hash)(e.obj)}.niv`] = e.niv === 'gros' ? 'gros' : 'petit';
                    }
                    // Le palmarès des éléments ne retient que ce qui se clique pour
                    // vrai (liens, boutons, champs, rôles de bouton, objectifs) : la
                    // carte garde tous les points, mais un document par jour ne peut
                    // pas grossir avec chaque paragraphe qu'une visiteuse a effleuré.
                    if (e.ia || commun_1.TAGS_INTERACTIFS.has(e.tg) || e.obj) {
                        const k = (0, commun_1.hash)(e.s);
                        inc(J, `pages.${page}.elements.${k}.n`);
                        if (e.r)
                            inc(J, `pages.${page}.elements.${k}.r`);
                        if (e.m)
                            inc(J, `pages.${page}.elements.${k}.m`);
                        J.textes[`pages.${page}.elements.${k}.s`] = e.s;
                        J.textes[`pages.${page}.elements.${k}.tx`] = e.tx || '';
                        if (e.href)
                            J.textes[`pages.${page}.elements.${k}.href`] = e.href;
                    }
                    carte(cleCarte).clics.push({ s: e.s, tx: e.tx || '', ex: +e.ex.toFixed(3), ey: +e.ey.toFixed(3), vx: +e.vx.toFixed(3), dy: Math.round(e.dy), hd: Math.round(e.hd), r: e.r, m: e.m });
                    break;
                }
                case 'mouv': {
                    // Les points de souris se gardent en fraction de la page (x en
                    // millièmes de la largeur, y en dix-millièmes de la hauteur du
                    // document), pour se reposer sur la page vivante quelle que soit
                    // sa hauteur au moment de regarder la carte. Le traceur normalise
                    // y au moment de chaque point (nrm: 1); un lot ancien, en pixels,
                    // se divise par la hauteur envoyée avec lui.
                    if (!e.nrm && !(e.hd > 0))
                        break;
                    const C = carte(cleCarte);
                    const pts = e.pts;
                    for (let i = 0; i + 1 < pts.length && C.mouv.length < commun_1.POINTS_MOUV_MAX * 2; i += 2) {
                        const y = e.nrm ? pts[i + 1] : Math.round((pts[i + 1] / e.hd) * 10000);
                        C.mouv.push(pts[i], Math.max(0, Math.min(10000, y)));
                    }
                    break;
                }
                case 'erreur': {
                    const k = (0, commun_1.hash)(e.msg + '|' + e.src);
                    inc(J, 'erreurs');
                    inc(J, `erreursListe.${k}.n`);
                    J.textes[`erreursListe.${k}.msg`] = e.msg;
                    J.textes[`erreursListe.${k}.src`] = e.src;
                    J.textes[`erreursListe.${k}.path`] = e.path;
                    break;
                }
                case 'form': {
                    const k = (0, commun_1.hash)(e.path + '|' + e.s);
                    const etat = e.etat === 'debut' ? 'debuts' : e.etat === 'soumis' ? 'soumis' : 'abandons';
                    inc(J, `formulaires.${k}.${etat}`);
                    J.textes[`formulaires.${k}.s`] = e.s;
                    J.textes[`formulaires.${k}.path`] = e.path;
                    if (etat === 'abandons' && e.champ)
                        J.textes[`formulaires.${k}.dernierChamp`] = e.champ;
                    break;
                }
                case 'objectif': {
                    inc(J, `objectifs.${(0, commun_1.hash)(e.nom)}.n`);
                    J.textes[`objectifs.${(0, commun_1.hash)(e.nom)}.nom`] = e.nom;
                    J.textes[`objectifs.${(0, commun_1.hash)(e.nom)}.niv`] = e.niv === 'gros' ? 'gros' : 'petit';
                    break;
                }
            }
        }
    }
    // Les journées s'écrivent par mise à jour pointée (update avec chemins),
    // ce qui laisse Firestore incrémenter sans relire les compteurs; le
    // document se lit une fois pour connaître les clés déjà là (plafonds).
    // Une journée qui refuse l'écriture ne bloque ni les autres ni les lots :
    // l'erreur se consigne et le tour continue.
    for (const [cle, J] of journees) {
        const ref = db.collection('vh_jours').doc(cle);
        const [site, jour] = [cle.slice(0, cle.indexOf('_')), cle.slice(cle.indexOf('_') + 1)];
        try {
            const existant = (await ref.get()).data() || {};
            borner(J, existant);
            alleger(J, existant);
            await ref.set({ site, jour }, { merge: true });
            const maj = {};
            for (const [chemin, n] of Object.entries(J.compteurs))
                maj[chemin] = firestore_1.FieldValue.increment(n);
            for (const [chemin, t] of Object.entries(J.textes))
                maj[chemin] = t;
            maj.maj = firestore_1.Timestamp.now();
            // Firestore plafonne un update à 500 champs : on découpe.
            const entrees = Object.entries(maj);
            for (let i = 0; i < entrees.length; i += 450) {
                await ref.update(Object.fromEntries(entrees.slice(i, i + 450)));
            }
        }
        catch (e) {
            console.error(`[vexelhotjar] journée ${cle} non écrite`, e.message);
        }
    }
    for (const [cle, C] of cartes) {
        const ref = db.collection('vh_cartes').doc(cle);
        try {
            const actuel = await ref.get();
            const d = actuel.exists ? actuel.data() : {};
            const [site, jour, device] = cle.split('_');
            const anciens = d.clics || [];
            let clics = anciens.concat(C.clics).slice(-commun_1.POINTS_CLICS_MAX);
            const mouv = (d.mouvV === 2 ? d.mouv || [] : []).concat(C.mouv).slice(-commun_1.POINTS_MOUV_MAX * 2);
            const scroll = { ...(d.scroll || {}) };
            for (const [b, n] of Object.entries(C.scroll))
                scroll[b] = (scroll[b] || 0) + n;
            const fiche = () => ({
                site, jour, device, page: cle.split('_').slice(3).join('_'),
                clics, mouv, mouvV: 2, scroll,
                vues: (d.vues || 0) + C.vues,
                nClics: (d.nClics || 0) + C.clics.length,
                // Une carte d'avant ces compteurs part des points qu'elle gardait.
                nRage: (typeof d.nRage === 'number' ? d.nRage : anciens.filter(p => p.r).length) + C.clics.filter(p => p.r).length,
                nMorts: (typeof d.nMorts === 'number' ? d.nMorts : anciens.filter(p => p.m).length) + C.clics.filter(p => p.m).length,
                maj: firestore_1.Timestamp.now(),
            });
            // La carte reste sous le mégaoctet de Firestore : les points les plus
            // anciens tombent tant qu'il le faut (nClics garde le vrai compte).
            let doc = fiche();
            while (clics.length > 100 && Buffer.byteLength(JSON.stringify(doc)) > commun_1.TAILLE_MAX_CARTE) {
                clics = clics.slice(Math.ceil(clics.length / 4));
                doc = fiche();
            }
            await ref.set(doc);
        }
        catch (e) {
            console.error(`[vexelhotjar] carte ${cle} non écrite`, e.message);
        }
    }
    for (let i = 0; i < docs.length; i += 450) {
        const b = db.batch();
        for (const d of docs.slice(i, i + 450))
            b.set(d.ref, { agrege: true, recu: d.get('recu') }, { merge: true });
        await b.commit();
    }
    return docs.length;
}
// Un seul tour à la fois : l'horloge et le bouton « Rafraîchir » se partagent
// un verrou (vh_prive/verrou) tenu neuf minutes au plus, pour qu'un même lot
// ne soit jamais fondu deux fois par deux tours qui se chevauchent.
async function verrouiller(db, par) {
    const ref = db.collection(commun_1.DOC_VERROU[0]).doc(commun_1.DOC_VERROU[1]);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (Number(snap.data()?.jusqua || 0) > Date.now())
            return false;
        tx.set(ref, { jusqua: Date.now() + commun_1.VERROU_MS, par, depuis: firestore_1.Timestamp.now() });
        return true;
    });
}
async function liberer(db) {
    await db.collection(commun_1.DOC_VERROU[0]).doc(commun_1.DOC_VERROU[1]).set({ jusqua: 0 }, { merge: true }).catch(() => { });
}
async function agregerTout(db, tours, par) {
    if (!(await verrouiller(db, par)))
        return { lots: 0, occupe: true };
    let total = 0;
    try {
        for (let i = 0; i < tours; i += 1) {
            const n = await agreger(db);
            total += n;
            if (n < commun_1.LOTS_PAR_TOUR)
                break;
        }
    }
    finally {
        await liberer(db);
    }
    return { lots: total, occupe: false };
}
exports.vhAgreger = (0, scheduler_1.onSchedule)({ schedule: 'every 15 minutes', timeZone: 'America/Toronto', memory: '512MiB', timeoutSeconds: 300 }, async () => {
    const { lots, occupe } = await agregerTout((0, firestore_1.getFirestore)(), 8, 'horloge');
    if (occupe)
        console.log('[vexelhotjar] agrégation déjà en cours, tour sauté');
    else if (lots)
        console.log(`[vexelhotjar] ${lots} lots agrégés`);
});
// La même liste d'admins que le reste des fonctions (newsletter, envois) :
// l'adresse suffit, comme pour elles.
function exigerAdmin(req) {
    const email = String(req.auth?.token.email || '').toLowerCase();
    if (!req.auth || !admin_1.ADMIN_EMAILS.includes(email)) {
        throw new https_1.HttpsError('permission-denied', "Réservé à l'admin.");
    }
}
exports.vhAgregerMaintenant = (0, https_1.onCall)({ region: 'us-central1', memory: '512MiB', timeoutSeconds: 300, cors: true }, async (req) => {
    exigerAdmin(req);
    return agregerTout((0, firestore_1.getFirestore)(), 6, 'admin');
});
exports.vhEffacerSession = (0, https_1.onCall)({ region: 'us-central1', cors: true }, async (req) => {
    exigerAdmin(req);
    const sid = (0, commun_1.texte)((req.data || {}).sid, 64);
    if (!/^[a-z0-9-]{8,64}$/.test(sid))
        throw new https_1.HttpsError('invalid-argument', 'Session inconnue.');
    const db = (0, firestore_1.getFirestore)();
    await (0, storage_1.getStorage)().bucket().deleteFiles({ prefix: `vh/replays/${sid}/` }).catch(() => { });
    await effacerRequete(db.collection('vh_lots').where('sid', '==', sid));
    await db.collection('vh_sessions').doc(sid).delete();
    return { ok: true };
});
// ─── La purge : chaque donnée a sa durée de vie ─────────────────────────────
async function effacerRequete(q, apres) {
    let total = 0;
    for (;;) {
        const snap = await q.limit(300).get();
        if (snap.empty)
            return total;
        if (apres)
            for (const d of snap.docs)
                await apres(d);
        const batch = q.firestore.batch();
        for (const d of snap.docs)
            batch.delete(d.ref);
        await batch.commit();
        total += snap.size;
        if (snap.size < 300)
            return total;
    }
}
exports.vhPurger = (0, scheduler_1.onSchedule)({ schedule: 'every day 04:10', timeZone: 'America/Toronto', memory: '512MiB', timeoutSeconds: 540 }, async () => {
    const db = (0, firestore_1.getFirestore)();
    const bucket = (0, storage_1.getStorage)().bucket();
    const limite = (jours) => firestore_1.Timestamp.fromMillis(Date.now() - jours * 86400000);
    const lots = await effacerRequete(db.collection('vh_lots').where('agrege', 'in', [true, 'encours']).where('recu', '<', limite(commun_1.RETENTION_LOTS_JOURS)));
    const sessions = await effacerRequete(db.collection('vh_sessions').where('debut', '<', limite(commun_1.RETENTION_SESSIONS_JOURS)), async (d) => { if (d.get('enregistre'))
        await bucket.deleteFiles({ prefix: `vh/replays/${d.id}/` }).catch(() => { }); });
    const jours = await effacerRequete(db.collection('vh_jours').where('jour', '<', (0, commun_1.jourDe)(Date.now() - commun_1.RETENTION_JOURS_JOURS * 86400000)));
    const cartes = await effacerRequete(db.collection('vh_cartes').where('jour', '<', (0, commun_1.jourDe)(Date.now() - commun_1.RETENTION_JOURS_JOURS * 86400000)));
    console.log(`[vexelhotjar] purge : ${lots} lots, ${sessions} sessions, ${jours} journées, ${cartes} cartes`);
});
