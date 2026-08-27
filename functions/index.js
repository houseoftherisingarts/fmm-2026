/**
 * Fonctions du Festival Médiéval de Montpellier.
 *
 * Livraison du livre de recettes (Alex, 2026-08-22) : quand quelqu'un
 * achète le livre par le lien Square, il doit recevoir le PDF par
 * courriel, sans intervention humaine.
 *
 * Le même webhook compte les places du banquet (Alex, 2026-08-23) :
 * Square nous envoie tous les paiements du compte, alors les commandes
 * de banquet arrivent ici aussi. Elles n'ajoutent qu'un nombre au
 * document `banquetPlaces/compteur`, le seul que le site lit pour dire
 * combien de places restent sur les cinquante.
 *
 * Le chemin complet :
 *   1. Square encaisse le paiement du lien du grimoire.
 *   2. Square appelle le webhook `squareGrimoire` (événement
 *      `payment.updated`, statut COMPLETED).
 *   3. On vérifie la signature HMAC de Square : sans elle, n'importe qui
 *      pourrait réclamer un livre gratuit en forgeant une requête.
 *   4. On récupère la commande pour confirmer que c'est bien le grimoire
 *      et pour lire le courriel de l'acheteur.
 *   5. On envoie le PDF en pièce jointe par le SMTP Zoho du festival.
 *   6. On journalise dans Firestore (`grimoireLivraisons/{paymentId}`),
 *      ce qui sert aussi de garde-fou : Square rejoue ses webhooks, et
 *      personne ne doit recevoir le livre deux fois.
 *
 * Secrets à poser avant le déploiement (une seule fois) :
 *   firebase functions:secrets:set ZOHO_APP_PASSWORD
 *   firebase functions:secrets:set SQUARE_ACCESS_TOKEN
 *   firebase functions:secrets:set SQUARE_WEBHOOK_KEY
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

const ZOHO_APP_PASSWORD = defineSecret('ZOHO_APP_PASSWORD');
const SQUARE_ACCESS_TOKEN = defineSecret('SQUARE_ACCESS_TOKEN');
const SQUARE_WEBHOOK_KEY = defineSecret('SQUARE_WEBHOOK_KEY');

// Boîte du festival, centre de données canadien de Zoho.
const ZOHO_EMAIL = 'admin@festivalmedievaldemontpellier.org';
const ZOHO_SMTP_HOST = 'smtp.zohocloud.ca';
const FROM = `Festival Médiéval de Montpellier <${ZOHO_EMAIL}>`;

const PDF = path.join(__dirname, 'grimoire-fmm-2026.pdf');
// Les noms possibles de l'article dans Square. Une commande qui n'en
// porte aucun n'est pas le livre de recettes : rien ne part par la poste.
//
// Deux noms plutôt qu'un, parce que l'article s'appelle encore « Le
// Grimoire du Festival · FMM 2026 » dans Square, et que c'est ce nom-là
// que l'acheteur lit sur son reçu. Le jour où Alex le renomme « Livre de
// recettes », la livraison continue sans qu'une ligne change ici
// (vérifié le 2026-08-23 sur le lien MLF6PYFFDJHMX6VW).
const ARTICLES_LIVRE = ['grimoire', 'livre de recettes'];
// Square envoie au même webhook TOUS les paiements du compte. Les
// commandes de banquet passent donc ici, et c'est là que se compte le
// nombre de places vendues.
const ARTICLE_BANQUET = 'banquet';
const COMPTEUR_BANQUET = 'banquetPlaces/compteur';

/**
 * Vérifie la signature HMAC-SHA256 que Square pose sur chaque webhook.
 * Square signe l'URL de notification concaténée au corps brut. On
 * reconstruit l'URL depuis la requête plutôt que de la coder en dur :
 * l'adresse Cloud Run change au premier redéploiement de région.
 */
function signatureValide(req, cleSignature) {
  const recue = req.get('x-square-hmacsha256-signature');
  if (!recue) return false;
  // Square signe l'URL EXACTE enregistrée dans l'abonnement. Reconstruire
  // depuis l'en-tête Host échoue quand Google achemine l'appel de
  // cloudfunctions.net vers Cloud Run : l'hôte vu ici n'est plus celui
  // que Square a signé. On garde donc l'URL enregistrée, en clair.
  // Abonnement : wbhk_7e251fc4c85e42c79d4d2a888346bc24.
  const url =
    process.env.GRIMOIRE_WEBHOOK_URL ||
    'https://us-central1-festivalmedieval.cloudfunctions.net/squareGrimoire';
  const charge = url + req.rawBody.toString('utf8');
  const attendue = crypto
    .createHmac('sha256', cleSignature)
    .update(charge)
    .digest('base64');
  const a = Buffer.from(recue);
  const b = Buffer.from(attendue);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function lireCommande(orderId, jeton) {
  const r = await fetch(`https://connect.squareup.com/v2/orders/${orderId}`, {
    headers: {
      'Square-Version': '2025-06-18',
      Authorization: `Bearer ${jeton}`,
    },
  });
  if (!r.ok) throw new Error(`Square orders ${r.status}`);
  const d = await r.json();
  return d.order || {};
}

const CORPS_FR = (nom) => `Bonjour${nom ? ' ' + nom : ''},

Merci d'avoir acheté le livre de recettes du festival. Il est en pièce jointe, en format PDF : vingt-sept recettes de la cuisine du festival, du pain viking à l'hypocras, telles qu'elles sortent des marmites.

Les quantités ont été ramenées à cinq personnes, pour une table ordinaire un mardi soir. Vous n'avez rien à diviser, et les temps de cuisson n'ont pas bougé d'une minute. Goûtez souvent, et salez un peu plus que vous ne croyez devoir le faire.

Au plaisir de festoyer ensemble,

Le Festival Médiéval de Montpellier
25, 26 et 27 septembre 2026
festivalmedievaldemontpellier.org`;

exports.squareGrimoire = onRequest(
  {
    region: 'us-central1',
    secrets: [ZOHO_APP_PASSWORD, SQUARE_ACCESS_TOKEN, SQUARE_WEBHOOK_KEY],
    // Le PDF pèse ~5 Mo : on lui laisse de la mémoire et du temps.
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('POST seulement');

    if (!signatureValide(req, SQUARE_WEBHOOK_KEY.value())) {
      logger.warn('Signature Square invalide, requête rejetée');
      return res.status(401).send('signature invalide');
    }

    const corps = req.body || {};
    const paiement = corps?.data?.object?.payment;
    if (!paiement) return res.status(200).send('sans paiement');
    if (paiement.status !== 'COMPLETED') {
      return res.status(200).send('paiement non complété');
    }

    const paymentId = paiement.id;
    const ref = db.collection('grimoireLivraisons').doc(paymentId);

    // Garde-fou : Square rejoue ses webhooks. Une transaction pose le
    // verrou avant tout envoi, donc deux appels simultanés ne peuvent
    // pas expédier le livre deux fois.
    // Un échec passager (SMTP, Square) laissait le document en place et
    // le rejeu de Square repartait aussitôt : l'acheteur ne recevait
    // jamais rien, en silence. Un statut d'échec redonne donc le droit
    // de réessayer (défaut confirmé par la vérification du 23 août).
    const REJOUABLES = ['erreur', 'sans courriel'];
    const aFaire = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists && !REJOUABLES.includes(snap.data()?.statut)) return false;
      tx.set(ref, {
        statut: 'en cours',
        paymentId,
        recuLe: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!aFaire) {
      logger.info('Livraison déjà traitée', { paymentId });
      return res.status(200).send('déjà livré');
    }

    try {
      const commande = await lireCommande(
        paiement.order_id,
        SQUARE_ACCESS_TOKEN.value(),
      );
      const articles = (commande.line_items || [])
        .map((l) => (l.name || '').toLowerCase())
        .join(' | ');
      if (!ARTICLES_LIVRE.some((nom) => articles.includes(nom))) {
        // Les places du banquet se comptent ici. La salle en a cinquante,
        // et le site affiche ce qu'il en reste, alors le chiffre doit
        // venir des ventes réelles et de rien d'autre (Alex, 2026-08-23).
        //
        // Le compteur public ne reçoit QUE le nombre : ni le nom, ni le
        // courriel, ni le montant de l'acheteur ne le touchent jamais.
        //
        // L'incrément et le statut partent dans le même lot d'écriture.
        // Firestore le commet d'un seul bloc, donc une panne au milieu ne
        // peut pas laisser une place comptée sans sa trace, et le rejeu
        // de Square retombe alors sur le verrou posé plus haut.
        const places = (commande.line_items || [])
          .filter((l) => (l.name || '').toLowerCase().includes(ARTICLE_BANQUET))
          .reduce((n, l) => n + (parseInt(l.quantity, 10) || 0), 0);
        if (places > 0) {
          const lot = db.batch();
          lot.set(
            db.doc(COMPTEUR_BANQUET),
            {
              vendues: admin.firestore.FieldValue.increment(places),
              majLe: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          lot.set(ref, { statut: 'banquet', places, orderId: paiement.order_id }, { merge: true });
          await lot.commit();
          logger.info('Places de banquet comptées', { paymentId, places });
          return res.status(200).send('banquet compté');
        }
        await ref.set({ statut: 'ignoré', articles }, { merge: true });
        return res.status(200).send('ni livre ni banquet');
      }

      // Le courriel de l'acheteur : Square le range à des endroits
      // différents selon le mode de paiement.
      const courriel =
        paiement.buyer_email_address ||
        commande.fulfillments?.[0]?.shipment_details?.recipient?.email_address ||
        commande.fulfillments?.[0]?.pickup_details?.recipient?.email_address ||
        null;
      const nom =
        commande.fulfillments?.[0]?.shipment_details?.recipient?.display_name ||
        commande.fulfillments?.[0]?.pickup_details?.recipient?.display_name ||
        '';

      if (!courriel) {
        // Sans adresse, on ne peut rien envoyer. On laisse une trace
        // pour qu'Alex livre à la main plutôt que de perdre la vente.
        await ref.set(
          { statut: 'sans courriel', orderId: paiement.order_id },
          { merge: true },
        );
        logger.error('Achat du grimoire sans adresse courriel', { paymentId });
        return res.status(200).send('sans courriel');
      }

      const transport = nodemailer.createTransport({
        host: ZOHO_SMTP_HOST,
        port: 465,
        secure: true,
        auth: { user: ZOHO_EMAIL, pass: ZOHO_APP_PASSWORD.value() },
      });

      await transport.sendMail({
        from: FROM,
        to: courriel,
        subject: 'Votre livre de recettes du festival',
        text: CORPS_FR(nom),
        attachments: [
          { filename: 'Livre-de-recettes-du-festival-FMM-2026.pdf', content: fs.createReadStream(PDF) },
        ],
      });

      await ref.set(
        {
          statut: 'livré',
          courriel,
          nom,
          orderId: paiement.order_id,
          livreLe: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      logger.info('Grimoire livré', { paymentId, courriel });
      return res.status(200).send('livré');
    } catch (e) {
      // On efface le verrou : Square réessaiera, et une panne SMTP
      // passagère ne doit pas priver l'acheteur de son livre.
      await ref.set(
        { statut: 'erreur', erreur: String(e && e.message ? e.message : e) },
        { merge: true },
      );
      logger.error('Livraison du grimoire échouée', { paymentId, e });
      return res.status(500).send('erreur');
    }
  },
);

/**
 * Lien de paiement du banquet, créé à la volée.
 *
 * Alex, 2026-08-23 : impossible d'acheter deux places. Le lien Square
 * fixe (square.link/u/g0UOU5L3) ne porte qu'une place, et quand un
 * acheteur y revient pour en prendre une deuxième, Square lui remontre
 * le reçu de la première : la commande est déjà attachée à ce lien.
 *
 * Le remède tient en deux gestes : on demande le NOMBRE de places sur
 * le site, et on crée un lien NEUF pour chaque réservation. Un lien
 * neuf ne peut pas retomber sur un vieux reçu, et la quantité est dans
 * la commande, donc quelqu'un qui vient à six paie une seule fois.
 *
 * La commande reprend exactement celle du lien d'origine : 65 $ la
 * place, TPS 5 % et TVQ 9,975 % à l'échelle de la commande.
 */
const PLACE_BANQUET = 6500;          // 65,00 $ avant taxes
const LOCATION_FMM = 'LHR5KAPF4HM1J';
const MAX_PLACES = 12;

// Mémoire courte des appels, par adresse : la fonction crée de vraies
// commandes Square, elle ne doit pas servir de robinet.
const APPELS = new Map();
const TROP_D_APPELS = (ip) => {
  const maintenant = Date.now();
  const fenetre = 60 * 1000;
  const liste = (APPELS.get(ip) || []).filter((t) => maintenant - t < fenetre);
  liste.push(maintenant);
  APPELS.set(ip, liste);
  if (APPELS.size > 500) APPELS.clear();
  return liste.length > 8;
};

exports.banquetLien = onRequest(
  {
    secrets: [SQUARE_ACCESS_TOKEN],
    region: 'us-central1',
    cors: [
      /festivalmedieval\.web\.app$/,
      /festivalmedieval\.firebaseapp\.com$/,
      /festivalmedievaldemontpellier\.(org|com)$/,
      /localhost:\d+$/,
    ],
  },
  async (req, res) => {
    try {
      const ip = String(req.headers['x-forwarded-for'] || req.ip || 'inconnu').split(',')[0].trim();
      if (TROP_D_APPELS(ip)) {
        logger.warn('[banquet] trop d\'appels', { ip });
        res.status(429).json({ erreur: 'trop de demandes' });
        return;
      }
      const places = Math.min(
        MAX_PLACES,
        Math.max(1, parseInt(String((req.body && req.body.places) || req.query.places || '1'), 10) || 1),
      );
      const retour = String(
        (req.body && req.body.retour) || req.query.retour || 'https://festivalmedieval.web.app/nourriture',
      );
      // Le banquet passe désormais par un compte : quatre places
      // avaient été vendues sans qu'une seule fiche apparaisse au
      // registre (Alex, 2026-08-24). Le navigateur envoie l'identifiant
      // de la personne connectée, et il voyage jusqu'au webhook de
      // Square pour que l'achat se raccroche à son compte.
      const uid = String((req.body && req.body.uid) || '').slice(0, 128);
      const courrielAcheteur = String((req.body && req.body.courriel) || '').slice(0, 160);
      const nomAcheteur = String((req.body && req.body.nom) || '').slice(0, 160);
      if (!uid) {
        res.status(401).json({ erreur: 'compte requis' });
        return;
      }
      // On n'accepte de renvoyer l'acheteur que chez nous.
      // Nos domaines, www compris : sans le www, l'acheteur qui vient de
      // payer était renvoyé ailleurs que chez lui.
      const NOTRE_MAISON = /^https:\/\/(www\.)?(festivalmedieval\.(web\.app|firebaseapp\.com)|festivalmedievaldemontpellier\.(org|com))(\/|$)/;
      const retourSur = NOTRE_MAISON.test(retour)
        ? retour
        : 'https://festivalmedieval.web.app/nourriture';

      const reponse = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
        method: 'POST',
        headers: {
          'Square-Version': '2025-01-23',
          Authorization: `Bearer ${SQUARE_ACCESS_TOKEN.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          description: `Banquet du Prince William · ${places} place${places > 1 ? 's' : ''} · FMM 2026`
            + ` · compte ${uid}${courrielAcheteur ? ` · ${courrielAcheteur}` : ''}`
            + `${nomAcheteur ? ` · ${nomAcheteur}` : ''}`,
          order: {
            location_id: LOCATION_FMM,
            line_items: [
              {
                name: 'Banquet du Prince William · FMM 2026',
                quantity: String(places),
                base_price_money: { amount: PLACE_BANQUET, currency: 'CAD' },
              },
            ],
            taxes: [
              { uid: 'tps', name: 'TPS', percentage: '5', scope: 'ORDER' },
              { uid: 'tvq', name: 'TVQ', percentage: '9.975', scope: 'ORDER' },
            ],
          },
          checkout_options: {
            allow_tipping: false,
            ask_for_shipping_address: false,
            redirect_url: `${retourSur}${retourSur.includes('?') ? '&' : '?'}banquet=merci`,
            accepted_payment_methods: {
              apple_pay: true, google_pay: true, cash_app_pay: true, afterpay_clearpay: false,
            },
          },
        }),
      });

      const data = await reponse.json();
      const url = data && data.payment_link && data.payment_link.url;
      if (!url) {
        // Le détail de Square reste dans les journaux : le renvoyer à
        // un appelant anonyme exposerait la mécanique du compte.
        logger.error('[banquet] Square a refusé', data);
        res.status(502).json({ erreur: 'paiement indisponible' });
        return;
      }
      logger.info('[banquet] lien créé', { places, url });
      res.json({ url, places, total: (PLACE_BANQUET * places * 1.14975) / 100 });
    } catch (err) {
      logger.error('[banquet] échec', err);
      res.status(500).json({ erreur: 'paiement indisponible' });
    }
  },
);

// ─── La messagerie de l'équipe vers les membres ──────────────────────
// Alex, 2026-08-24 : depuis l'espace admin, l'équipe écrit dans la
// boîte de réception d'une poignée de membres cochés, ou de tout le
// registre d'un seul coup. Le navigateur ne peut pas s'en charger :
// trois cents membres font six cents écritures, un onglet fermé au
// milieu laisse la moitié du travail derrière, et rien ne dit ensuite
// ce qui est parti. La fonction fait le tour par lots de deux cents
// membres et rend le compte exact des fils touchés.
//
// Le message s'affiche au nom du festival, jamais au nom d'une
// personne : un membre qui reçoit une annonce doit reconnaître d'où
// elle vient. Le SIÈGE du fil, lui, appartient à la personne de
// l'équipe qui écrit, sinon la réponse du membre tomberait dans le
// compte de personne et se perdrait (corrigé le 2026-08-24). Le membre
// lit « Le Festival Médiéval de Montpellier », et sa réponse arrive
// dans la boîte de celle ou celui qui a lancé l'envoi.
//
// L'envoi à une seule personne ne passe PAS par ici : il part du
// navigateur, au nom de la personne qui écrit, dans le fil ordinaire.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');

// N'ÉCRIVEZ RIEN ICI À LA MAIN. La liste de l'équipe vit dans
// config/equipe-admin.json, et scripts/sync-equipe.mjs la recopie ici,
// dans firestore.rules et dans .env.local avant chaque déploiement.
const COURRIELS_ADMIN = [
  // ÉQUIPE:DÉBUT (écrit par scripts/sync-equipe.mjs)
  'admin@festivalmedievaldemontpellier.org', // Boîte du festival
  'alex@lesalondesinconnus.com', // Alex
  'houseoftherisingarts@gmail.com', // Alex, second courriel
  'm.fournel11@gmail.com', // Maïté, Master Bénévole
  'benevoles.medievalmontpellier@gmail.com', // Maïté, courriel de fonction
  // ÉQUIPE:FIN
];

const FESTIVAL_NOM = 'Le Festival Médiéval de Montpellier';
const FESTIVAL_TEINTE = 38;
const FESTIVAL_PHOTO = '/fmm-logo-embossed-silver.webp';

const LONGUEUR_MAX = 2000;      // le même plafond que firestore.rules
const MEMBRES_PAR_LOT = 200;    // 200 membres font 400 écritures, sous le plafond de 500
const PLAFOND_REGISTRE = 3000;  // au-delà, l'envoi se refuse plutôt que de ramper

const filId = (a, b) => [a, b].sort().join('__');

exports.messagerieDeMasse = onCall(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 540 },
  async (requete) => {
    const auth = requete.auth;
    const courriel = auth && auth.token && auth.token.email
      ? String(auth.token.email).toLowerCase()
      : null;
    if (!courriel || !COURRIELS_ADMIN.includes(courriel)) {
      logger.warn('[messagerie] appel refusé', { courriel });
      throw new HttpsError('permission-denied', 'Cette fonction est réservée à l’équipe.');
    }

    // Le siège du fil appartient à la personne de l'équipe qui écrit.
    const expediteurUid = auth.uid;

    const donnees = requete.data || {};
    const texte = String(donnees.texte || '').trim().slice(0, LONGUEUR_MAX);
    if (!texte) throw new HttpsError('invalid-argument', 'Le message est vide.');

    const portee = donnees.portee === 'tous' ? 'tous' : 'selection';
    const cible = String(donnees.cible || 'Sans portée nommée').slice(0, 160);

    // Les destinataires : soit le registre entier, soit la liste cochée.
    // La liste cochée se relit dans le registre plutôt que d'être crue
    // sur parole, pour qu'un uid inventé côté navigateur n'ouvre aucun
    // fil et que les noms viennent de la base.
    let membres = [];
    if (portee === 'tous') {
      const snap = await db.collection('membres').limit(PLAFOND_REGISTRE).get();
      membres = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    } else {
      const demandes = Array.isArray(donnees.uids) ? donnees.uids.map(String) : [];
      if (!demandes.length) {
        throw new HttpsError('invalid-argument', 'Aucun destinataire n’est coché.');
      }
      if (demandes.length > PLAFOND_REGISTRE) {
        throw new HttpsError('invalid-argument', 'Trop de destinataires d’un coup.');
      }
      // getAll() par paquets de 200 : une seule lecture par membre.
      for (let i = 0; i < demandes.length; i += MEMBRES_PAR_LOT) {
        const refs = demandes.slice(i, i + MEMBRES_PAR_LOT)
          .map((uid) => db.collection('membres').doc(uid));
        const lus = await db.getAll(...refs);
        for (const d of lus) if (d.exists) membres.push({ uid: d.id, ...d.data() });
      }
    }

    const vises = membres.filter((m) => m.uid && m.uid !== expediteurUid);
    const ignores = membres.length - vises.length;
    if (!vises.length) {
      throw new HttpsError('not-found', 'Personne dans le registre ne correspond.');
    }

    // La trace s'ouvre AVANT le premier lot : si la fonction meurt en
    // route, Alex voit quand même qu'un envoi a commencé, ce qui est
    // parti, et où il s'est arrêté. C'est aussi ce document que la page
    // regarde pour montrer l'avancement.
    const trace = db.collection('envoisMasse').doc();
    const parNom = (auth.token && (auth.token.name || auth.token.email)) || 'Équipe';
    await trace.set({
      parUid: auth.uid,
      parNom: String(parNom),
      parCourriel: courriel,
      cible,
      portee,
      texte,
      destinataires: vises.length,
      faits: 0,
      statut: 'en cours',
      envoyeLe: FieldValue.serverTimestamp(),
    });

    let faits = 0;
    try {
      for (let i = 0; i < vises.length; i += MEMBRES_PAR_LOT) {
        const lot = db.batch();
        for (const m of vises.slice(i, i + MEMBRES_PAR_LOT)) {
          const id = filId(expediteurUid, m.uid);
          const fil = db.collection('dms').doc(id);
          const nom = String(m.nom || '').trim() || 'Membre';
          const photos = { [expediteurUid]: FESTIVAL_PHOTO };
          if (m.avatarUrl) photos[m.uid] = String(m.avatarUrl);

          lot.set(fil, {
            participantUids:   [expediteurUid, m.uid].sort(),
            participantNames:  { [expediteurUid]: FESTIVAL_NOM, [m.uid]: nom },
            participantHues:   { [expediteurUid]: FESTIVAL_TEINTE, [m.uid]: Number(m.avatarHue) || 0 },
            participantPhotos: photos,
            lastMessage:   texte.slice(0, 140),
            lastMessageAt: FieldValue.serverTimestamp(),
            lastSenderUid: expediteurUid,
            unread:        { [m.uid]: FieldValue.increment(1) },
            annonce:       true,
          }, { merge: true });

          lot.set(fil.collection('messages').doc(), {
            senderUid:  expediteurUid,
            senderName: FESTIVAL_NOM,
            body:       texte,
            createdAt:  FieldValue.serverTimestamp(),
            envoiId:    trace.id,
          });
        }
        await lot.commit();
        faits += Math.min(MEMBRES_PAR_LOT, vises.length - i);
        // L'avancement, lot par lot : la page le lit en direct.
        await trace.update({ faits });
      }
    } catch (err) {
      logger.error('[messagerie] envoi interrompu', { envoi: trace.id, faits, err });
      await trace.update({ statut: 'échoué', faits, erreur: String((err && err.message) || err) });
      throw new HttpsError('internal', `L’envoi s’est arrêté après ${faits} fils.`);
    }

    await trace.update({ statut: 'terminé', faits });
    logger.info('[messagerie] envoi terminé', { envoi: trace.id, cible, fils: faits });
    return { fils: faits, ignores, envoiId: trace.id };
  },
);

// ─── Les campagnes de courriels ──────────────────────────────────────
// Alex, 2026-08-24 : depuis l'espace admin, l'équipe écrit aux gens des
// listes de clients. Une lettre, une liste de destinataires, et le
// compte exact de ce qui est parti.
//
// L'IDENTITÉ DE L'EXPÉDITEUR, la règle qui prime sur tout le reste. La
// lettre part de `admin@festivalmedievaldemontpellier.org` et s'affiche
// « Festival Médiéval de Montpellier » dans la boîte du destinataire.
// Le nom d'Alex ne paraît qu'à la signature, au bas du texte, comme
// directeur des communications. Jamais l'inverse. La constante FROM en
// haut de ce fichier est la seule adresse d'expédition du festival, et
// aucune autre ne se fabrique ici.
//
// CHACUN REÇOIT SA LETTRE. Un `sendMail` par destinataire, avec une
// seule adresse dans le champ `to`. Ni copie conforme, ni copie
// invisible, ni liste entassée dans un même champ : personne ne doit
// découvrir l'adresse de son voisin, et un courriel adressé à trois
// cents personnes à la fois tombe droit dans le pourriel.
//
// LE RYTHME. Le transport tourne en mode « pool » avec la limite de
// débit de nodemailer, quatre messages par seconde au plus, sur deux
// connexions. Zoho coupe une session qui pousse trop fort, et le
// festival y perdrait sa boîte pour la journée. Le plafond réel reste
// celui du forfait Zoho : un refus de sa part se retrouve compté dans
// les échecs de la campagne, avec l'adresse en cause.
//
// ponytail: une campagne tient dans un seul appel, et l'appel meurt à
// 540 secondes. À quatre messages par seconde, le plafond utile tourne
// autour de mille cinq cents adresses, d'où PLAFOND_CAMPAGNE. Le jour
// où une liste dépasse ce chiffre, la suite est une file de tâches
// (Cloud Tasks) plutôt qu'une boucle plus longue.

const CAMPAGNE_CLE = defineSecret('CAMPAGNE_CLE');
// ZeptoMail, le service d'envoi en nombre de Zoho. Une boîte Zoho
// ordinaire refuse au-delà d'une poignée de lettres et rend
// « Unusual sending activity detected » : elle n'est pas faite pour
// une infolettre (constat du 2026-08-24, 25 lettres parties sur 126).
// Le jeton reste facultatif : sans lui, tout retombe sur la boîte Zoho.
const ZEPTO_TOKEN = defineSecret('ZEPTO_TOKEN');
const ZEPTO_HOST = 'smtp.zeptomail.ca';

const CAMPAGNES = 'campagnes';
const DESABONNEMENTS = 'desabonnements';

const LOT_CAMPAGNE = 20;        // le pas d'avancement écrit dans la trace
const PLAFOND_CAMPAGNE = 1500;  // au-delà, l'envoi se refuse plutôt que de mourir à mi-course
const SUJET_MAX = 200;
const CORPS_MAX = 200000;       // une lettre rendue pèse environ 8 ko

// Les deux jetons que le navigateur laisse dans le gabarit. Les mêmes
// chaînes vivent dans src/lib/courrielCampagne.ts. Si l'une des deux
// change d'un côté, le lien de désabonnement part en toutes lettres
// dans la boîte du destinataire.
const JETON_NOM = '{{nom}}';
const JETON_DESABONNEMENT = '{{desabonnement}}';

// L'adresse publique de la fonction de désabonnement. Elle se pose en
// clair, comme l'URL du webhook Square plus haut : l'hôte vu depuis
// Cloud Run n'est pas celui que le destinataire a sous les yeux.
const URL_DESABONNEMENT =
  process.env.DESABONNEMENT_URL ||
  'https://us-central1-festivalmedieval.cloudfunctions.net/desabonnement';

const COURRIEL_VALIDE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-zA-Z]{2,}$/;
const normaliserCourriel = (c) => String(c || '').trim().toLowerCase();

function echapperHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Le jeton qui signe un lien de désabonnement. Sans lui, l'adresse
 *  suffirait à retirer n'importe qui de la liste, et l'endroit
 *  deviendrait un robinet ouvert sur notre base de données. */
function jetonDesabonnement(courriel, cle) {
  return crypto
    .createHmac('sha256', cle)
    .update(normaliserCourriel(courriel))
    .digest('hex')
    .slice(0, 32);
}

function lienDesabonnement(courriel, cle) {
  const adresse = encodeURIComponent(normaliserCourriel(courriel));
  return `${URL_DESABONNEMENT}?e=${adresse}&j=${jetonDesabonnement(courriel, cle)}`;
}

/** Pose le prénom et le lien dans un gabarit. Le nom passe par
 *  l'échappement quand il entre dans du HTML : une apostrophe ou un
 *  chevron dans un nom ne doit pas pouvoir casser la lettre. */
/** Les images distantes n'apparaissent pas : Gmail, Apple Mail et
 *  Outlook les bloquent tant que la personne ne clique pas « afficher
 *  les images », et une infolettre arrive alors vide (Alex,
 *  2026-08-24). Chaque image est donc jointe au courriel et référencée
 *  par un identifiant interne, ce qui la fait paraître partout, sans
 *  permission et sans réseau. Nodemailer va chercher le fichier lui-même
 *  à partir de son adresse. */
function incorporerImages(html) {
  const pieces = [];
  const vues = new Map();
  const neuf = html.replace(/src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|gif))"/gi, (tout, url) => {
    let cid = vues.get(url);
    if (!cid) {
      cid = `img${vues.size}@fmm`;
      vues.set(url, cid);
      pieces.push({ path: url, cid, filename: url.split('/').pop() });
    }
    return `src="cid:${cid}"`;
  });
  return { html: neuf, pieces };
}

function personnaliser(gabarit, nom, lien, pourHtml) {
  const propre = String(nom || '').trim().slice(0, 60);
  const morceau = propre ? ` ${pourHtml ? echapperHtml(propre) : propre}` : '';
  return gabarit.split(JETON_NOM).join(morceau).split(JETON_DESABONNEMENT).join(lien);
}

/** Les adresses qui ont demandé à ne plus rien recevoir. Elles sont
 *  relues à chaque campagne, jamais mises en cache : une personne qui
 *  se retire pendant qu'un envoi tourne doit être épargnée par le
 *  suivant, sans redéploiement. */
async function lireDesabonnes() {
  const snap = await db.collection(DESABONNEMENTS).get();
  return new Set(snap.docs.map((d) => normaliserCourriel(d.id)));
}

/**
 * Le transport Zoho, ouvert de la même façon pour les deux chemins :
 * l'envoi immédiat lancé depuis la page d'admin, et la minuterie des
 * campagnes programmées. Une seule définition du rythme, donc, et pas
 * deux réglages qui se mettent à diverger.
 */
/** Le jeton ZeptoMail s'il est posé. Un secret jamais défini fait
 *  lever `.value()`, et une infolettre ne doit pas tomber pour ça. */
function jetonZeptoOuVide() {
  // Le secret existe toujours, sinon le déploiement refuse. Tant qu'il
  // porte la sentinelle, ZeptoMail dort et tout passe par Zoho.
  try {
    const v = String(ZEPTO_TOKEN.value() || '').trim();
    return v && v !== 'non-configure' && v.length > 20 ? v : '';
  } catch { return ''; }
}

function ouvrirTransport(motDePasse, jetonZepto) {
  // ZeptoMail quand son jeton est posé, la boîte Zoho sinon. L'adresse
  // d'expéditeur ne change pas : les deux partent de admin@ et le
  // destinataire ne voit aucune différence.
  if (jetonZepto) {
    return nodemailer.createTransport({
      host: ZEPTO_HOST,
      port: 465,
      secure: true,
      auth: { user: 'emailapikey', pass: jetonZepto },
      pool: true,
      maxConnections: 5,
      maxMessages: 200,
      rateDelta: 1000,
      rateLimit: 10,
    });
  }
  return nodemailer.createTransport({
    host: ZOHO_SMTP_HOST,
    port: 465,
    secure: true,
    auth: { user: ZOHO_EMAIL, pass: motDePasse },
    // Le rythme : deux connexions, cinquante messages par connexion
    // avant renouvellement, quatre messages par seconde au plus.
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    rateDelta: 1000,
    rateLimit: 4,
  });
}

/**
 * Les garde-fous de la lettre, au même endroit pour les deux chemins.
 *
 * Celui qui compte le plus est le dernier : une campagne sans lien de
 * désabonnement est illégale au Canada (LCAP) et fait basculer le
 * domaine du festival en pourriel chez Gmail. Une campagne programmée
 * est écrite dans Firestore par le navigateur, alors elle repasse ici
 * au moment de partir, des semaines plus tard. Ce qui vient du
 * navigateur se revérifie toujours, même quand c'est l'équipe qui l'a
 * écrit.
 *
 * @returns la lettre taillée, ou `{ erreur }` avec la phrase à montrer.
 */
function verifierLettre(d) {
  const sujet = String((d && d.sujet) || '').trim().slice(0, SUJET_MAX);
  const html = String((d && d.html) || '');
  const texte = String((d && d.texte) || '');

  if (!sujet) return { erreur: 'La lettre n’a pas d’objet.' };
  if (!html || !texte) return { erreur: 'La lettre est vide.' };
  if (html.length > CORPS_MAX || texte.length > CORPS_MAX) {
    return { erreur: 'La lettre dépasse la taille permise.' };
  }
  if (!html.includes(JETON_DESABONNEMENT) || !texte.includes(JETON_DESABONNEMENT)) {
    return { erreur: 'La lettre n’a pas de lien de désabonnement.' };
  }
  return { sujet, html, texte };
}

/**
 * La boucle d'envoi, partagée par l'envoi immédiat et par la minuterie.
 *
 * Chacun reçoit sa lettre : un `sendMail` par personne, une seule
 * adresse dans le champ `to`, jamais de copie conforme ni de copie
 * invisible.
 *
 * `avancer` est rappelée après chaque lot. C'est par là que la trace
 * de l'historique monte à l'écran, et c'est aussi par là que la
 * campagne programmée retient où elle est rendue.
 *
 * ponytail: le curseur de reprise (`derniere`) s'écrit une fois le lot
 * fini, pas courriel par courriel. Une exécution qui meurt entre le
 * dernier envoi d'un lot et l'écriture du curseur peut donc faire
 * repartir jusqu'à vingt courriels au tour suivant. Le prix à payer
 * pour l'éviter serait une écriture Firestore par destinataire, et
 * vingt doublons valent mieux que quinze cents.
 */
async function expedierLettre({ transport, cle, campagneId, sujet, html, texte, vises, avancer }) {
  let envoyes = 0;
  let echecs = 0;
  let derniere = '';
  const adressesEchouees = [];

  for (let i = 0; i < vises.length; i += LOT_CAMPAGNE) {
    const lot = vises.slice(i, i + LOT_CAMPAGNE);
    const resultats = await Promise.allSettled(
      lot.map((personne) => {
        const lien = lienDesabonnement(personne.courriel, cle);
        // Un seul passage d'incorporation par personne. La lettre est
        // personnalisée d'abord, puis ses images sont jointes.
        const corps = incorporerImages(personnaliser(html, personne.nom, lien, true));
        return transport.sendMail({
          from: FROM,
          to: personne.courriel,
          subject: sujet,
          text: personnaliser(texte, personne.nom, lien, false),
          // Le pixel de mesure se pose ICI, après l'incorporation des
          // images : il doit rester une image distante, sans quoi il ne
          // mesure plus rien. Voir poserPixel, au bas de ce fichier.
          html: poserPixel(corps.html, campagneId, personne.courriel, cle),
          attachments: corps.pieces,
          headers: {
            // Le désabonnement d'un seul geste, depuis le bandeau du
            // client de courriel. Gmail l'exige des expéditeurs en
            // nombre depuis 2024, et son absence coûte cher en
            // délivrabilité.
            'List-Unsubscribe': `<${lien}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });
      }),
    );

    for (let k = 0; k < resultats.length; k += 1) {
      if (resultats[k].status === 'fulfilled') {
        envoyes += 1;
      } else {
        echecs += 1;
        if (adressesEchouees.length < 25) {
          adressesEchouees.push({
            courriel: lot[k].courriel,
            raison: String(
              (resultats[k].reason && resultats[k].reason.message) || resultats[k].reason,
            ).slice(0, 200),
          });
        }
      }
    }

    derniere = lot[lot.length - 1].courriel;
    if (avancer) await avancer({ envoyes, echecs, derniere, adressesEchouees });
  }

  return { envoyes, echecs, adressesEchouees, derniere };
}

exports.envoyerCampagne = onCall(
  {
    region: 'us-central1',
    secrets: [ZOHO_APP_PASSWORD, CAMPAGNE_CLE, ZEPTO_TOKEN],
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (requete) => {
    const auth = requete.auth;
    const courrielAppelant = auth && auth.token && auth.token.email
      ? normaliserCourriel(auth.token.email)
      : null;
    if (!courrielAppelant || !COURRIELS_ADMIN.includes(courrielAppelant)) {
      logger.warn('[campagne] appel refusé', { courriel: courrielAppelant });
      throw new HttpsError('permission-denied', 'Cette fonction est réservée à l’équipe.');
    }

    const d = requete.data || {};
    const lettre = verifierLettre(d);
    if (lettre.erreur) throw new HttpsError('invalid-argument', lettre.erreur);
    const { sujet, html, texte } = lettre;

    const cle = CAMPAGNE_CLE.value();

    const transport = ouvrirTransport(ZOHO_APP_PASSWORD.value(), jetonZeptoOuVide());

    // ── L'exemplaire d'essai ──
    // Il part à l'adresse de la personne qui appelle, jamais à une
    // adresse fournie par le navigateur : un essai ne doit pas pouvoir
    // servir à écrire à quelqu'un d'autre sans passer par la campagne
    // et sa trace.
    if (d.essai) {
      const lien = lienDesabonnement(courrielAppelant, cle);
      try {
        await transport.sendMail({
          from: FROM,
          to: courrielAppelant,
          subject: `[Essai] ${sujet}`,
          text: personnaliser(texte, auth.token.name || '', lien, false),
          // Un essai ne se mesure pas : `poserPixel` sans campagne
          // efface simplement le jeton, qui paraîtrait autrement en
          // toutes lettres au bas de la lettre d'essai.
          html: poserPixel(personnaliser(html, auth.token.name || '', lien, true), null, courrielAppelant, cle),
        });
      } finally {
        transport.close();
      }
      logger.info('[campagne] essai envoyé', { courriel: courrielAppelant });
      return { essai: true, courriel: courrielAppelant };
    }

    // ── Les destinataires ──
    // La liste vient du navigateur, parce que le filtre qui la produit
    // (l'année, la catégorie, « rien acheté en 2026 ») se calcule à
    // l'écran, sous les yeux de la personne qui envoie. Le garde-fou
    // n'est donc pas la provenance de la liste, c'est l'allocation :
    // seule l'équipe appelle, chaque campagne laisse sa trace signée du
    // courriel de l'appelant, et le plafond par appel est ferme.
    const bruts = Array.isArray(d.destinataires) ? d.destinataires : [];
    if (!bruts.length) throw new HttpsError('invalid-argument', 'Aucun destinataire n’est retenu.');
    if (bruts.length > PLAFOND_CAMPAGNE) {
      throw new HttpsError(
        'invalid-argument',
        `Une campagne ne peut pas dépasser ${PLAFOND_CAMPAGNE} adresses d’un coup.`,
      );
    }

    // Dédoublonnage par adresse : une même personne inscrite deux
    // années de suite ne reçoit pas la lettre en double.
    const parAdresse = new Map();
    let invalides = 0;
    for (const b of bruts) {
      const adresse = normaliserCourriel(b && b.courriel);
      if (!adresse || !COURRIEL_VALIDE.test(adresse)) { invalides += 1; continue; }
      if (!parAdresse.has(adresse)) {
        parAdresse.set(adresse, String((b && b.nom) || '').trim().slice(0, 60));
      }
    }

    const desabonnes = await lireDesabonnes();
    const vises = [];
    let retires = 0;
    for (const [adresse, nom] of parAdresse) {
      if (desabonnes.has(adresse)) { retires += 1; continue; }
      vises.push({ courriel: adresse, nom });
    }

    if (!vises.length) {
      transport.close();
      throw new HttpsError('not-found', 'Toutes les adresses retenues sont désabonnées ou invalides.');
    }

    // La trace s'ouvre AVANT le premier envoi. Si la fonction meurt en
    // route, Alex voit quand même qu'une campagne a commencé, ce qui
    // est parti et où elle s'est arrêtée. C'est aussi ce document que
    // la page regarde pour montrer l'avancement.
    const trace = db.collection(CAMPAGNES).doc();
    await trace.set({
      parUid: auth.uid,
      parNom: String((auth.token && (auth.token.name || auth.token.email)) || 'Équipe'),
      parCourriel: courrielAppelant,
      modele: String(d.modele || 'inconnu').slice(0, 60),
      modeleNom: String(d.modeleNom || '').slice(0, 120),
      langue: d.langue === 'EN' ? 'EN' : 'FR',
      cible: String(d.cible || 'Sans portée nommée').slice(0, 200),
      sujet,
      destinataires: vises.length,
      envoyes: 0,
      echecs: 0,
      desabonnesIgnores: retires,
      adressesInvalides: invalides,
      statut: 'en cours',
      envoyeLe: FieldValue.serverTimestamp(),
    });

    // L'état vit ici pour que le bloc de rattrapage sache combien de
    // courriels étaient partis avant l'interruption. `avancer` le
    // remplit à chaque lot, en même temps qu'il fait monter la barre
    // d'avancement à l'écran.
    const etat = { envoyes: 0, echecs: 0, adressesEchouees: [] };

    try {
      await expedierLettre({
        transport, cle, sujet, html, texte, vises,
        campagneId: trace.id,
        avancer: async (a) => {
          etat.envoyes = a.envoyes;
          etat.echecs = a.echecs;
          etat.adressesEchouees = a.adressesEchouees;
          // L'avancement, lot par lot : la page le lit en direct.
          await trace.update({ envoyes: a.envoyes, echecs: a.echecs });
        },
      });
    } catch (err) {
      logger.error('[campagne] envoi interrompu', {
        campagne: trace.id, envoyes: etat.envoyes, echecs: etat.echecs, err,
      });
      await trace.update({
        statut: 'échoué',
        envoyes: etat.envoyes,
        echecs: etat.echecs,
        adressesEchouees: etat.adressesEchouees,
        erreur: String((err && err.message) || err),
      });
      throw new HttpsError('internal', `L’envoi s’est arrêté après ${etat.envoyes} courriels.`);
    } finally {
      transport.close();
    }

    const { envoyes, echecs, adressesEchouees } = etat;
    await trace.update({ statut: 'terminé', envoyes, echecs, adressesEchouees });
    logger.info('[campagne] terminée', {
      campagne: trace.id, modele: d.modele, envoyes, echecs, retires,
    });
    return {
      campagneId: trace.id,
      envoyes,
      echecs,
      desabonnesIgnores: retires,
      adressesInvalides: invalides,
    };
  },
);

// ─── La minuterie des campagnes ──────────────────────────────────────
// Alex, 2026-08-24 : « Tu peux les programmer à être envoyées. » Les
// dix infolettres doivent pouvoir partir à des dates choisies d'avance,
// sans que personne soit devant l'écran au bon moment.
//
// LE CHEMIN COMPLET.
//   1. Depuis la page d'admin, quelqu'un choisit la lettre, la portée
//      et le moment. Le navigateur écrit un document dans
//      `campagnesProgrammees`, avec l'instant d'envoi calculé à
//      l'heure de Montréal (voir src/lib/heureMontreal.ts).
//   2. Toutes les quinze minutes, cette fonction regarde les campagnes
//      qui attendent.
//   3. Celle dont l'heure est venue passe à « en cours » DANS UNE
//      TRANSACTION, avant le premier courriel.
//   4. La liste des destinataires se résout à ce moment-là, jamais au
//      moment de la programmation.
//   5. L'envoi passe par `expedierLettre`, exactement le même code que
//      l'envoi immédiat, et laisse la même trace dans `campagnes`.
//
// LE DOUBLE ENVOI, la faute qu'on ne rattrape pas. Deux exécutions
// peuvent se chevaucher : Cloud Scheduler ne promet pas qu'un tour
// finisse avant que le suivant commence, et une infolettre reçue en
// double par trois cents personnes coûte des désabonnements et de la
// réputation d'expéditeur. La transaction est le verrou : elle relit
// l'état, refuse si la campagne n'est plus « prévue », et écrit
// « en cours » dans le même geste. Firestore rejoue la transaction
// quand deux exécutions se disputent le document, et la perdante relit
// « en cours » et s'en va.
//
// L'INTERRUPTION. Une exécution meurt à 540 secondes, et Cloud Run peut
// la couper avant. La campagne retient alors la dernière adresse
// traitée, dans `reprisA`. Comme la liste est toujours triée par
// adresse, le tour suivant écarte tout ce qui vient avant elle et
// reprend la suite. Rien ne recommence du début.
//
// ponytail: une campagne par tour. À quatre courriels par seconde, les
// quinze cents adresses du plafond prennent un peu plus de six minutes,
// et la fonction meurt à neuf. Deux campagnes dans le même tour la
// feraient mourir à mi-course. La deuxième part au tour suivant, quinze
// minutes plus tard, et personne ne s'en aperçoit.

const { onSchedule } = require('firebase-functions/v2/scheduler');
const prog = require('./programmation');

const CAMPAGNES_PROGRAMMEES = 'campagnesProgrammees';

/** L'édition en cours, celle qui définit « n'a rien acheté cette
 *  année ». Le jumeau vit dans src/firebase/campagnes.ts. */
const ANNEE_COURANTE = 2026;

/** Combien de fois une campagne se reprend toute seule avant d'être
 *  laissée à Alex. Trois tours ratés veulent dire que le problème n'est
 *  pas passager, et continuer à cogner sur Zoho ferait plus de mal que
 *  de bien. */
const MAX_TENTATIVES = 3;

/** Les destinataires d'une campagne programmée, résolus au moment de
 *  l'envoi. Le registre et les comptes se relisent à chaque fois : une
 *  lettre écrite il y a trois semaines doit toucher les gens inscrits
 *  entre les deux. */
async function destinatairesProgrammes(portee) {
  const [snapClients, snapComptes] = await Promise.all([
    db.collection('clients').limit(PLAFOND_REGISTRE).get(),
    portee && portee.sansCompte
      ? db.collection('users').limit(PLAFOND_REGISTRE).get()
      : Promise.resolve({ docs: [] }),
  ]);

  const clients = snapClients.docs.map((doc) => doc.data());
  const comptes = new Set();
  for (const doc of snapComptes.docs) {
    const adresse = normaliserCourriel((doc.data() || {}).email);
    if (adresse) comptes.add(adresse);
  }

  return prog.destinatairesDuFiltre(clients, comptes, portee, ANNEE_COURANTE);
}

exports.minuterieCampagnes = onSchedule(
  {
    region: 'us-central1',
    schedule: 'every 15 minutes',
    // Le festival vit à l'heure de Montréal. Le rythme de quinze
    // minutes s'en moque, mais le fuseau est écrit ici pour que le
    // journal de Cloud Scheduler parle la même heure que la page
    // d'admin et que les documents de `campagnesProgrammees`.
    timeZone: prog.FUSEAU_FESTIVAL,
    secrets: [ZOHO_APP_PASSWORD, CAMPAGNE_CLE, ZEPTO_TOKEN],
    memory: '512MiB',
    timeoutSeconds: 540,
    // Aucune reprise automatique par Cloud Scheduler : la reprise est
    // gérée ici, avec son curseur, et une deuxième exécution lancée par
    // la plateforme irait se cogner au verrou pour rien.
    retryCount: 0,
  },
  async () => {
    // Les campagnes qui attendent quelque chose. Une seule condition,
    // sur un seul champ, donc aucun index composite à tenir : les
    // documents dans ces deux états se comptent sur les doigts, et
    // l'heure se juge ensuite, dans `estAPrendre`.
    const attente = await db
      .collection(CAMPAGNES_PROGRAMMEES)
      .where('statut', 'in', ['prevue', 'en cours'])
      .limit(25)
      .get();

    if (attente.empty) return;

    // Ce qui est dû, la plus vieille d'abord. Le verdict rendu ici est
    // pris sur une lecture ordinaire : il dit quoi essayer, et c'est la
    // transaction juste en dessous qui tranche pour de bon.
    const dues = prog.campagnesDues(
      attente.docs.map((doc) => ({ id: doc.id, ref: doc.ref, data: doc.data() })),
      Date.now(),
    );

    for (const candidate of dues) {
      const ref = candidate.ref;

      // ── Le verrou ──
      // Relire et écrire dans le même geste. C'est le seul endroit qui
      // décide qu'une campagne part, et il ne peut pas dire oui deux
      // fois pour le même document.
      const verdict = await db.runTransaction(async (tx) => {
        const frais = await tx.get(ref);
        const decision = prog.estAPrendre(frais.data(), Date.now(), prog.VERROU_MS);
        if (!decision.prendre) return decision;
        tx.update(ref, {
          statut: 'en cours',
          demarreeLe: FieldValue.serverTimestamp(),
          tentatives: FieldValue.increment(1),
        });
        return decision;
      });

      if (!verdict.prendre) continue;

      const d = candidate.data || {};
      const tentatives = Number(d.tentatives || 0) + 1;
      logger.info('[minuterie] campagne prise', {
        campagne: ref.id, raison: verdict.raison, tentatives, reprisA: verdict.reprisA,
      });

      try {
        await envoyerCampagneProgrammee(ref, d, verdict);
      } catch (err) {
        // Deux tours de rattrapage, puis la campagne est laissée à
        // Alex. `demarreeLe` retombe à zéro pour que le verrou soit
        // libre tout de suite plutôt que dans vingt minutes.
        const abandonne = tentatives >= MAX_TENTATIVES;
        logger.error('[minuterie] envoi interrompu', {
          campagne: ref.id, tentatives, abandonne, err,
        });
        await ref.update({
          statut: abandonne ? 'echouee' : 'en cours',
          demarreeLe: null,
          erreur: String((err && err.message) || err).slice(0, 500),
        });
      }

      // Une seule campagne par tour. La suivante part dans quinze
      // minutes, et la fonction ne risque pas de mourir à mi-course.
      return;
    }
  },
);

/**
 * L'envoi d'une campagne programmée, une fois le verrou pris.
 *
 * Séparée de la minuterie pour que le rattrapage d'erreur reste lisible
 * là-haut : tout ce qui lève ici retombe dans le `catch` du tour.
 */
async function envoyerCampagneProgrammee(ref, d, verdict) {
  // La lettre a été écrite dans Firestore par le navigateur, il y a
  // peut-être des semaines. Elle repasse les mêmes garde-fous que
  // l'envoi immédiat, le lien de désabonnement en tête.
  const lettre = verifierLettre(d);
  if (lettre.erreur) {
    await ref.update({
      statut: 'echouee',
      erreur: lettre.erreur,
      termineeLe: FieldValue.serverTimestamp(),
    });
    logger.warn('[minuterie] lettre refusée', { campagne: ref.id, raison: lettre.erreur });
    return;
  }

  const cle = CAMPAGNE_CLE.value();
  const portee = d.portee || {};

  // ── Les destinataires, résolus maintenant ──
  const tous = await destinatairesProgrammes(portee);

  const desabonnes = await lireDesabonnes();
  const complets = [];
  let retires = 0;
  let invalides = 0;
  for (const personne of tous) {
    if (!COURRIEL_VALIDE.test(personne.courriel)) { invalides += 1; continue; }
    if (desabonnes.has(personne.courriel)) { retires += 1; continue; }
    complets.push(personne);
  }

  if (complets.length > PLAFOND_CAMPAGNE) {
    await ref.update({
      statut: 'echouee',
      erreur: `La portée retient ${complets.length} adresses, au-delà du plafond de ${PLAFOND_CAMPAGNE}.`,
      termineeLe: FieldValue.serverTimestamp(),
    });
    logger.warn('[minuterie] portée trop large', { campagne: ref.id, nombre: complets.length });
    return;
  }

  // Ce qui reste à faire après une interruption. La liste est triée par
  // adresse, alors tout ce qui vient avant le curseur est déjà parti.
  const vises = prog.resteAFaire(complets, verdict.reprisA);

  if (!vises.length) {
    await ref.update({
      statut: 'envoyee',
      termineeLe: FieldValue.serverTimestamp(),
      resultat: {
        destinataires: complets.length,
        envoyes: Number(d.envoyesTotal || 0),
        echecs: 0,
        desabonnesIgnores: retires,
        adressesInvalides: invalides,
      },
    });
    logger.info('[minuterie] rien à envoyer', { campagne: ref.id, retires, invalides });
    return;
  }

  // ── La trace dans l'historique ──
  // Une campagne programmée laisse exactement la même trace qu'un envoi
  // lancé à la main, et paraît donc dans la même liste, à la même
  // place. Une reprise réécrit la trace ouverte au premier tour plutôt
  // que d'en ouvrir une deuxième.
  const reprend = Boolean(d.campagneId);
  const trace = reprend
    ? db.collection(CAMPAGNES).doc(d.campagneId)
    : db.collection(CAMPAGNES).doc();

  await trace.set({
    parUid: String(d.parUid || ''),
    parNom: String(d.parNom || 'Équipe'),
    parCourriel: String(d.parCourriel || ''),
    modele: String(d.modele || 'inconnu').slice(0, 60),
    modeleNom: String(d.modeleNom || '').slice(0, 120),
    langue: d.langue === 'EN' ? 'EN' : 'FR',
    cible: `${String(d.cible || 'Sans portée nommée').slice(0, 180)} (programmée)`,
    sujet: lettre.sujet,
    destinataires: complets.length,
    envoyes: Number(d.envoyesTotal || 0),
    echecs: 0,
    desabonnesIgnores: retires,
    adressesInvalides: invalides,
    statut: 'en cours',
    programmee: true,
    // La date de la trace est celle du PREMIER départ. Une reprise ne
    // la repousse pas : la campagne resterait sinon en tête de
    // l'historique à chaque tour, comme si elle venait de partir.
    ...(reprend ? {} : { envoyeLe: FieldValue.serverTimestamp() }),
  }, { merge: true });

  await ref.update({ campagneId: trace.id });

  const transport = ouvrirTransport(ZOHO_APP_PASSWORD.value(), jetonZeptoOuVide());
  // Deux compteurs, et ils ne disent pas la même chose. `faits` est le
  // nombre d'adresses TRAITÉES, celui qui fait avancer le curseur.
  // `envoyesTotal` est le nombre de lettres réellement parties. Les
  // confondre ferait mentir l'historique dès qu'une adresse échoue au
  // premier tour et que la campagne reprend au second.
  const dejaFaits = Number(d.faits || 0);
  const dejaEnvoyes = Number(d.envoyesTotal || 0);
  const etat = { envoyes: 0, echecs: 0, adressesEchouees: [], derniere: verdict.reprisA };

  try {
    await expedierLettre({
      transport,
      cle,
      // Le pixel d'ouverture vise la même trace que l’envoi immédiat.
      campagneId: trace.id,
      sujet: lettre.sujet,
      html: lettre.html,
      texte: lettre.texte,
      vises,
      avancer: async (a) => {
        etat.envoyes = a.envoyes;
        etat.echecs = a.echecs;
        etat.adressesEchouees = a.adressesEchouees;
        etat.derniere = a.derniere;
        // Le curseur de reprise s'écrit AVANT tout le reste : c'est lui
        // qui empêche un redémarrage de tout recommencer.
        await Promise.all([
          ref.update({
            reprisA: a.derniere,
            faits: dejaFaits + a.envoyes + a.echecs,
            envoyesTotal: dejaEnvoyes + a.envoyes,
          }),
          trace.update({ envoyes: dejaEnvoyes + a.envoyes, echecs: a.echecs }),
        ]);
      },
    });
  } finally {
    transport.close();
  }

  const envoyes = dejaEnvoyes + etat.envoyes;
  await trace.update({
    statut: 'terminé',
    envoyes,
    echecs: etat.echecs,
    adressesEchouees: etat.adressesEchouees,
  });
  await ref.update({
    statut: 'envoyee',
    termineeLe: FieldValue.serverTimestamp(),
    faits: dejaFaits + etat.envoyes + etat.echecs,
    envoyesTotal: envoyes,
    reprisA: etat.derniere,
    erreur: FieldValue.delete(),
    resultat: {
      campagneId: trace.id,
      destinataires: complets.length,
      envoyes,
      echecs: etat.echecs,
      desabonnesIgnores: retires,
      adressesInvalides: invalides,
      adressesEchouees: etat.adressesEchouees,
    },
  });

  logger.info('[minuterie] campagne partie', {
    campagne: ref.id, trace: trace.id, envoyes, echecs: etat.echecs, retires, invalides,
  });
}

// ─── Le désabonnement ────────────────────────────────────────────────
// Le lien au bas de chaque lettre aboutit ici. Il doit fonctionner sans
// compte, sans mot de passe et sans que la personne ait à chercher quoi
// que ce soit : elle clique, son adresse sort de la liste, et une page
// le lui confirme dans sa langue.
//
// Deux façons d'arriver, et les deux mènent au même geste. Le clic
// ordinaire est un GET et rend la page de confirmation. Le bandeau
// « Se désabonner » de Gmail et d'Apple Mail envoie un POST silencieux
// (RFC 8058), auquel il suffit de répondre 200.
//
// La signature protège l'endroit : sans le jeton, connaître l'adresse
// de quelqu'un suffirait à le retirer de nos listes, et la fonction
// deviendrait un robinet ouvert sur la base de données.

const PAGE_DESABO = (fr, adresse) => `<!DOCTYPE html>
<html lang="${fr ? 'fr' : 'en'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${fr ? 'Votre adresse est retirée' : 'Your address has been removed'}</title>
</head>
<body style="margin:0;padding:0;background:#0B0508;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:520px;margin:0 auto;padding:72px 24px;text-align:center;">
    <p style="margin:0;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#C9A85A;">Festival Médiéval de Montpellier</p>
    <h1 style="margin:26px 0 0 0;font-size:27px;line-height:38px;font-weight:400;color:#EDE6D9;">
      ${fr ? 'Votre adresse est retirée de nos listes.' : 'Your address has been removed from our lists.'}
    </h1>
    <p style="margin:20px 0 0 0;font-size:16px;line-height:27px;color:#BDB3A2;">
      ${fr
        ? `Nous n’écrirons plus à ${echapperHtml(adresse)}. Les confirmations liées à un achat continueront de vous parvenir, parce qu’elles vous appartiennent.`
        : `We will no longer write to ${echapperHtml(adresse)}. Confirmations tied to a purchase will still reach you, because they belong to you.`}
    </p>
    <p style="margin:34px 0 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">
      <a href="https://festivalmedievaldemontpellier.org" style="color:#C9A85A;text-decoration:none;">${fr ? 'Retour au village' : 'Back to the village'}</a>
    </p>
  </div>
</body>
</html>`;

exports.desabonnement = onRequest(
  { region: 'us-central1', secrets: [CAMPAGNE_CLE], memory: '256MiB' },
  async (req, res) => {
    const fr = String(req.query.l || 'fr').toLowerCase() !== 'en';
    const adresse = normaliserCourriel(req.query.e);
    const jeton = String(req.query.j || '');

    if (!adresse || !COURRIEL_VALIDE.test(adresse) || !jeton) {
      return res.status(400).send(fr ? 'Lien incomplet.' : 'Incomplete link.');
    }

    const attendu = jetonDesabonnement(adresse, CAMPAGNE_CLE.value());
    const a = Buffer.from(jeton);
    const b = Buffer.from(attendu);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      logger.warn('[désabonnement] jeton invalide', { adresse });
      return res.status(403).send(fr ? 'Lien invalide.' : 'Invalid link.');
    }

    // La clé du document EST l'adresse : deux clics sur le même lien
    // écrivent le même document, et la liste ne peut pas contenir deux
    // fois la même personne.
    await db.collection(DESABONNEMENTS).doc(adresse).set(
      {
        courriel: adresse,
        source: 'lien-courriel',
        desabonneLe: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    logger.info('[désabonnement] adresse retirée', { adresse });

    // Le POST vient du bandeau du client de courriel : il n'affiche
    // aucune page, il attend seulement un 200.
    if (req.method === 'POST') return res.status(200).send('ok');

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(PAGE_DESABO(fr, adresse));
  },
);

// ─── Le pixel d'ouverture ────────────────────────────────────────────
// Alex, 2026-08-24 : « Je dois pouvoir tracker qui ouvre les
// infolettres. » Chaque lettre porte au bas du HTML une image d'un
// pixel, transparente, servie par cette fonction. Le client de courriel
// va la chercher quand la personne ouvre le message, et c'est cet
// appel-là qui se note.
//
// L'IMAGE PASSE TOUJOURS, même quand le jeton est faux, absent ou
// tordu. Une image cassée dans la boîte de quelqu'un se voit, alors
// qu'une statistique manquée ne se voit pas : entre les deux, la lettre
// intacte gagne à tous les coups. Un appel sans jeton valable reçoit
// donc le même pixel que les autres et n'écrit rien.
//
// AUCUNE MISE EN CACHE. Gmail et Apple relaient nos images par leur
// propre serveur, et une réponse mise en cache ferait disparaître
// toutes les ouvertures suivantes derrière la première. Les en-têtes
// ci-dessous ferment les trois caches qui comptent : celui du client,
// celui du relais et celui du navigateur.
//
// CE QUE LA MESURE VAUT VRAIMENT. Elle sous-compte : une personne qui
// lit avec les images bloquées ne paraîtra jamais ici. Elle sur-compte
// aussi : Apple charge les images de ses usagers avant même qu'ils
// ouvrent quoi que ce soit. Le nombre affiché dans l'admin est une
// tendance d'une infolettre à l'autre, jamais une vérité. C'est écrit
// noir sur blanc sous le tableau, dans CampagnesSection.tsx.
//
// ponytail: une écriture Firestore par ouverture, sans regroupement.
// À quinze cents destinataires par campagne, cela reste quelques
// milliers d'écritures par mois, très loin du premier dollar. Le jour
// où le festival écrit à cent mille personnes, le regroupement se fait
// par une file de tâches plutôt qu'ici.

const ouv = require('./ouvertures');

const OUVERTURES = 'campagnesOuvertures';

// L'adresse publique de la fonction, posée en clair comme celle du
// désabonnement : l'hôte vu depuis Cloud Run n'est pas celui que le
// destinataire a sous les yeux.
const URL_PIXEL =
  process.env.PIXEL_URL ||
  'https://us-central1-festivalmedieval.cloudfunctions.net/pixel';

// Le troisième jeton du gabarit. Le jumeau vit dans
// src/lib/courrielCampagne.ts sous JETON_PIXEL. Si l'une des deux
// chaînes change, l'autre doit suivre, sinon le pixel part en toutes
// lettres dans la boîte du destinataire.
const JETON_PIXEL = '{{pixel}}';

/**
 * Pose le pixel de mesure dans une lettre déjà personnalisée.
 *
 * L'ORDRE COMPTE, et c'est la seule chose à retenir ici. Cette
 * fonction s'applique APRÈS `incorporerImages`, jamais avant. Les
 * images de la lettre sont jointes au message pour paraître sans
 * permission, et un pixel joint au message ne mesurerait plus rien du
 * tout : il faut qu'il reste une image distante, allée chercher sur
 * notre serveur au moment de la lecture. Le passer après l'incorporation
 * est ce qui l'en exclut.
 *
 * Une lettre sans le jeton (une campagne programmée écrite avant ce
 * jour) ressort inchangée : rien ne casse, elle n'est simplement pas
 * mesurée.
 */
function poserPixel(html, campagneId, courriel, cle) {
  if (!campagneId || !html.includes(JETON_PIXEL)) {
    return html.split(JETON_PIXEL).join('');
  }
  const adresse = ouv.normaliserCourriel(courriel);
  const url =
    `${URL_PIXEL}?c=${encodeURIComponent(campagneId)}` +
    `&e=${encodeURIComponent(adresse)}` +
    `&j=${ouv.jetonPixel(campagneId, adresse, cle)}`;
  // La hauteur de ligne et la taille de police à un pixel empêchent le
  // trou blanc qu'une image seule laisse au bas de la lettre chez
  // Outlook.
  const balise =
    `<div style="line-height:1px;font-size:1px;">` +
    `<img src="${echapperHtml(url)}" width="1" height="1" alt="" border="0" ` +
    `style="width:1px;height:1px;display:block;border:0;outline:none;" /></div>`;
  return html.split(JETON_PIXEL).join(balise);
}

/**
 * Écrit l'ouverture, et fait monter le compte de la campagne une seule
 * fois par personne.
 *
 * La transaction n'est pas décorative. Un téléphone qui ouvre la lettre
 * pendant qu'un ordinateur fait la même chose lance deux appels dans la
 * même seconde, et une lecture suivie d'une écriture hors transaction
 * compterait deux personnes là où il n'y en a qu'une. Le taux affiché à
 * Alex se mettrait à monter tout seul.
 *
 * La fiche de campagne s'écrit en fusion plutôt qu'en mise à jour : une
 * trace effacée à la main ne doit pas faire échouer l'écriture de
 * l'ouverture elle-même.
 */
async function noterOuverture(campagneId, courriel) {
  const cle = ouv.cleOuverture(campagneId, courriel);
  if (!cle) return;

  const ligne = db.collection(OUVERTURES).doc(cle);
  const fiche = db.collection(CAMPAGNES).doc(String(campagneId));

  await db.runTransaction(async (t) => {
    const avant = await t.get(ligne);
    const suite = ouv.fusionnerOuverture(avant.exists ? avant.data() : null);

    const champs = {
      campagne: String(campagneId),
      courriel: ouv.normaliserCourriel(courriel),
      fois: suite.fois,
      derniereLe: FieldValue.serverTimestamp(),
    };
    if (suite.unique) champs.premiereLe = FieldValue.serverTimestamp();

    t.set(ligne, champs, { merge: true });
    if (suite.unique) {
      t.set(fiche, { ouvertures: FieldValue.increment(1) }, { merge: true });
    }
  });
}

exports.pixel = onRequest(
  { region: 'us-central1', secrets: [CAMPAGNE_CLE], memory: '256MiB' },
  async (req, res) => {
    const campagneId = String(req.query.c || '').slice(0, 60);
    const adresse = normaliserCourriel(req.query.e);
    const jeton = String(req.query.j || '');

    const signe =
      campagneId &&
      adresse &&
      COURRIEL_VALIDE.test(adresse) &&
      ouv.jetonValide(campagneId, adresse, jeton, CAMPAGNE_CLE.value());

    if (signe) {
      // Une panne d'écriture ne prive personne de son image. Elle part
      // au journal et la lettre reste intacte.
      try {
        await noterOuverture(campagneId, adresse);
      } catch (err) {
        logger.error('[ouverture] écriture manquée', { campagne: campagneId, err });
      }
    } else if (campagneId || jeton) {
      logger.warn('[ouverture] appel non signé', { campagne: campagneId });
    }

    res.set('Content-Type', 'image/gif');
    res.set('Content-Length', String(ouv.PIXEL_GIF.length));
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.status(200).end(ouv.PIXEL_GIF);
  },
);
