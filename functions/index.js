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
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 *   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
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
const functionsV1 = require('firebase-functions/v1');

const ZOHO_APP_PASSWORD = defineSecret('ZOHO_APP_PASSWORD');
const SQUARE_ACCESS_TOKEN = defineSecret('SQUARE_ACCESS_TOKEN');
const SQUARE_WEBHOOK_KEY = defineSecret('SQUARE_WEBHOOK_KEY');

// ZeptoMail, le service d'envoi en nombre de Zoho. Une boîte Zoho
// ordinaire refuse au-delà d'une poignée de lettres et rend
// « Unusual sending activity detected » : elle n'est pas faite pour
// une infolettre (constat du 2026-08-24, 25 lettres parties sur 126).
// Le jeton reste facultatif : sans lui, tout retombe sur la boîte Zoho.
const ZEPTO_TOKEN = defineSecret('ZEPTO_TOKEN');
const ZEPTO_HOST = 'smtp.zeptomail.ca';

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
const ARTICLE_SANS_PUB = 'sans publicité';
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
        // Le don « sans publicité à vie » (Alex, 2026-08-27) : l'uid
        // voyage dans les métadonnées de la commande, et le compte est
        // marqué pour toujours. Rien d'autre n'est écrit sur la personne.
        if (articles.includes(ARTICLE_SANS_PUB)) {
          const uidDon = String((commande.metadata && commande.metadata.uid) || '').slice(0, 128);
          if (uidDon) {
            const lot = db.batch();
            lot.set(db.collection('users').doc(uidDon), {
              sansPub: true,
              sansPubLe: admin.firestore.FieldValue.serverTimestamp(),
              sansPubPaymentId: paymentId,
            }, { merge: true });
            lot.set(ref, { statut: 'sans-pub', uid: uidDon, orderId: paiement.order_id }, { merge: true });
            await lot.commit();
            logger.info('Compte marqué sans publicité', { paymentId, uid: uidDon });
            return res.status(200).send('sans pub');
          }
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


// ─── Le don « sans publicité à vie » ─────────────────────────────────
// Alex, 2026-08-27 : depuis son profil, la personne soutient le festival
// d'un don unique (10 à 100 $) et son compte ne voit plus jamais de
// publicité. Même mécanique que le banquet : un lien de paiement Square,
// puis le webhook squareGrimoire marque users/{uid}.sansPub = true.
const DON_MIN = 1000, DON_MAX = 10000; // en cents
exports.sansPubLien = onRequest(
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
      if (TROP_D_APPELS(ip)) { res.status(429).json({ erreur: 'trop de demandes' }); return; }
      const uid = String((req.body && req.body.uid) || '').slice(0, 128);
      if (!uid) { res.status(401).json({ erreur: 'compte requis' }); return; }
      const dollars = Math.round(Number((req.body && req.body.montant) || 0));
      const montant = Math.min(DON_MAX, Math.max(DON_MIN, dollars * 100));
      const courriel = String((req.body && req.body.courriel) || '').slice(0, 160);
      const retour = String((req.body && req.body.retour) || 'https://www.festivalmedievaldemontpellier.org/compte');
      const NOTRE_MAISON = /^https:\/\/(www\.)?(festivalmedieval\.(web\.app|firebaseapp\.com)|festivalmedievaldemontpellier\.(org|com))(\/|$)/;
      const retourSur = NOTRE_MAISON.test(retour) ? retour : 'https://www.festivalmedievaldemontpellier.org/compte';

      const reponse = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
        method: 'POST',
        headers: {
          'Square-Version': '2025-01-23',
          Authorization: `Bearer ${SQUARE_ACCESS_TOKEN.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          description: `Don · sans publicité à vie · FMM · compte ${uid}${courriel ? ` · ${courriel}` : ''}`,
          order: {
            location_id: LOCATION_FMM,
            metadata: { uid, genre: 'sans-pub' },
            line_items: [
              {
                name: 'Don au festival · Sans publicité à vie',
                quantity: '1',
                base_price_money: { amount: montant, currency: 'CAD' },
              },
            ],
          },
          checkout_options: {
            allow_tipping: false,
            ask_for_shipping_address: false,
            redirect_url: `${retourSur}${retourSur.includes('?') ? '&' : '?'}sansPub=merci`,
            accepted_payment_methods: { apple_pay: true, google_pay: true, cash_app_pay: true, afterpay_clearpay: false },
          },
        }),
      });
      const data = await reponse.json();
      const url = data && data.payment_link && data.payment_link.url;
      if (!url) {
        logger.error('[sans-pub] Square a refusé', data);
        res.status(502).json({ erreur: 'paiement indisponible' });
        return;
      }
      res.status(200).json({ url });
    } catch (e) {
      logger.error('[sans-pub] erreur', e);
      res.status(500).json({ erreur: 'erreur interne' });
    }
  },
);


// ─── Le parrainage : le compte des filleuls et ses récompenses ───────
// Alex, 2026-08-28 : le badge au premier filleul, « Le Parrain » à
// cinq, le compte VIP à dix, un billet du festival à vingt. Le compteur
// vit ici et nulle part ailleurs : écrit depuis le navigateur, il
// s'offrirait un billet gratuit en quelques clics.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

exports.parrainageFilleul = onDocumentCreated(
  { document: 'parrainages/{filleulUid}', region: 'us-central1', memory: '256MiB' },
  async (evenement) => {
    const lien = evenement.data && evenement.data.data();
    if (!lien) return;
    const parrainUid = String(lien.parrainUid || '');
    const filleulUid = String(evenement.params.filleulUid || '');
    if (!parrainUid || !filleulUid || parrainUid === filleulUid) return;

    const fiche = db.collection('users').doc(parrainUid);
    const total = await db.runTransaction(async (tx) => {
      const snap = await tx.get(fiche);
      const avant = Number((snap.exists && snap.data().filleuls) || 0);
      const apres = avant + 1;
      const paquet = {
        filleuls: apres,
        filleulsMajLe: FieldValue.serverTimestamp(),
      };
      // Dix filleuls ouvrent le compte VIP, à vie, exactement comme le
      // don « sans publicité ».
      if (apres >= 10) { paquet.sansPub = true; paquet.sansPubRaison = 'parrainage'; }
      // Vingt filleuls valent un billet du festival : l'équipe le voit
      // dans l'admin et le remet, rien ne s'émet tout seul.
      if (apres >= 20) { paquet.billetOffert = true; }
      tx.set(fiche, paquet, { merge: true });
      return apres;
    });

    // Les badges du parrainage, posés sur le même document que les
    // autres (badges/{uid}.obtenus).
    const gagnes = {};
    if (total >= 1)  gagnes['obtenus.parrain'] = FieldValue.serverTimestamp();
    if (total >= 5)  gagnes['obtenus.le-parrain'] = FieldValue.serverTimestamp();
    if (Object.keys(gagnes).length) {
      const refBadges = db.collection('badges').doc(parrainUid);
      const dejaSnap = await refBadges.get();
      const deja = (dejaSnap.exists && dejaSnap.data().obtenus) || {};
      const aPoser = {};
      for (const cle of Object.keys(gagnes)) {
        const id = cle.split('.')[1];
        if (!deja[id]) aPoser[cle] = gagnes[cle];
      }
      if (Object.keys(aPoser).length) {
        await refBadges.set({ obtenus: {} }, { merge: true });
        await refBadges.update(aPoser);
      }
    }
    logger.info('[parrainage] filleul compté', { parrainUid, filleulUid, total });
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
// DEUX VOIX, ET LA DIFFÉRENCE EST VOULUE. Un mot à une seule personne
// part au nom de celle qui l'écrit, et la conversation est celle de
// deux personnes. Un envoi de groupe part au nom du festival : trois
// cents membres n'ont pas à recevoir une lettre signée d'un prénom
// qu'ils ne connaissent pas. Le SIÈGE du fil appartient dans les deux
// cas à la personne de l'équipe qui écrit, sinon la réponse du membre
// tomberait dans le compte de personne et se perdrait (corrigé le
// 2026-08-24).
//
// LES DEUX LIVRAISONS (Alex, 2026-09-01) : « quand on écrit à un
// membre, il faut que ça leur envoie un courriel ET un message dans
// son espace client. » Le même geste dépose donc les deux, et l'envoi
// à une seule personne passe par ici lui aussi, pour qu'il n'existe
// qu'un seul chemin, un seul gabarit de lettre et une seule trace.
//
// L'ORDRE COMPTE. Tous les fils s'écrivent d'abord, en quelques
// secondes; les lettres partent ensuite, au rythme du serveur de
// courriel. Une panne au milieu des lettres laisse donc le message
// dans l'espace de chacun, et la trace dit exactement combien de
// courriels étaient partis. L'inverse aurait perdu des messages pour
// gagner des lettres.

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
// Le pas des lettres. Vingt à la fois, comme les campagnes : c'est le
// transport qui tient le rythme réel, ce chiffre ne fait que découper
// l'avancement écrit dans la trace.
const LOT_LETTRES = 20;

const filId = (a, b) => [a, b].sort().join('__');

// ── La lettre qui double le message ─────────────────────────────────
// Le gabarit ne s'invente pas : ce sont les règles de l'infolettre
// (src/lib/courrielCampagne.ts), en plus court. Des tableaux imbriqués,
// un style écrit sur chaque cellule, une pile de polices que toutes les
// machines portent depuis vingt ans, aucune feuille de style externe,
// aucune image de fond, aucun dégradé. Outlook rend le courriel avec le
// moteur de Word, qui ne connaît rien d'autre.
//
// Les couleurs s'écrivent en hexadécimal plein, jamais en variable CSS :
// un client de courriel ne sait pas lire `var(--sk-brass-warm)`. Les
// valeurs descendent de la palette caravane de src/index.css.
const C_FOND = '#0B0509';       // le noir chaud, derrière la lettre
const C_CARTE = '#150A10';      // le parchemin sombre
const C_BANDE = '#100609';      // l'en-tête et le pied
const C_BORDURE = '#3B2A1B';    // le filet de laiton éteint
const C_TEXTE = '#EFE8DB';      // l'ivoire du corps
const C_MUET = '#8B8072';       // le pied de page
const C_OR = '#C9A85A';         // --sk-brass-warm, écrit en clair
const SERIF_COURRIEL = 'Georgia, \'Times New Roman\', Times, serif';
const SANS_COURRIEL = '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Arial, Helvetica, sans-serif';

const URL_MESSAGES = 'https://www.festivalmedievaldemontpellier.org/messages';
const URL_COMPTE = 'https://www.festivalmedievaldemontpellier.org/compte';

/** Le texte tapé dans l'admin devient des paragraphes. Les retours à la
 *  ligne comptent : l'équipe écrit dans une zone de texte, pas en HTML. */
function paragraphesDuMessage(texte) {
  return String(texte)
    .split(/\n{2,}/)
    .map((bloc) => bloc.trim())
    .filter(Boolean)
    .map((bloc) => `<p style="margin:0 0 18px 0;font-family:${SERIF_COURRIEL};font-size:17px;line-height:27px;color:${C_TEXTE};">${echapperHtml(bloc).split('\n').join('<br />')}</p>`)
    .join('');
}

/**
 * La lettre, dans les deux versions que nodemailer envoie ensemble.
 *
 * Elle ne recopie pas la conversation : elle porte le mot, l'identité du
 * festival, et un bouton qui ramène à l'espace client. C'est là que la
 * personne répond, dans le fil où le message l'attend déjà.
 *
 * Le cadre est bilingue, en une ligne chacun, parce que rien dans nos
 * fiches ne dit dans quelle langue la personne lit le site. Le corps,
 * lui, reste tel que l'équipe l'a écrit.
 */
function lettreDuMessage(surtitre, texte) {
  const titre = echapperHtml(surtitre);
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${titre}</title></head>
<body style="margin:0;padding:0;background-color:${C_FOND};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C_FOND};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${C_CARTE};border:1px solid ${C_BORDURE};">
      <tr><td align="center" bgcolor="${C_BANDE}" style="padding:26px 44px;border-bottom:1px solid ${C_BORDURE};">
        <p style="margin:0;font-family:${SANS_COURRIEL};font-size:10px;letter-spacing:2.6px;text-transform:uppercase;color:${C_OR};">Festival M&eacute;di&eacute;val de Montpellier</p>
      </td></tr>
      <tr><td style="padding:36px 44px 8px 44px;">
        <p style="margin:0 0 6px 0;font-family:${SANS_COURRIEL};font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:${C_OR};">${titre}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;"><tr><td width="56" height="2" style="width:56px;height:2px;line-height:2px;font-size:2px;background-color:${C_OR};">&nbsp;</td></tr></table>
        ${paragraphesDuMessage(texte)}
      </td></tr>
      <tr><td align="center" style="padding:6px 44px 38px 44px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" bgcolor="${C_OR}" style="border-radius:3px;">
            <a href="${URL_MESSAGES}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:${SANS_COURRIEL};font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${C_CARTE};text-decoration:none;border-radius:3px;">R&eacute;pondre dans votre espace</a>
          </td>
        </tr></table>
        <p style="margin:14px 0 0 0;font-family:${SANS_COURRIEL};font-size:11px;line-height:18px;color:${C_MUET};">Your reply waits for you in your account on the festival site.</p>
      </td></tr>
      <tr><td bgcolor="${C_BANDE}" style="padding:22px 44px;border-top:1px solid ${C_BORDURE};">
        <p style="margin:0;font-family:${SANS_COURRIEL};font-size:11px;line-height:19px;color:${C_MUET};">Vous recevez ce mot parce que vous avez un compte au festival, et vos alertes se r&egrave;glent dans <a href="${URL_COMPTE}" target="_blank" style="color:${C_OR};text-decoration:none;">votre espace</a>.<br />You get this note because you have an account with the festival, and your alerts live in your account.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const brut = `${surtitre}

${String(texte).trim()}

Répondez dans votre espace : ${URL_MESSAGES}
Your reply waits for you at the same address.

Vous recevez ce mot parce que vous avez un compte au festival, et vos alertes se règlent dans votre espace : ${URL_COMPTE}

Le Festival Médiéval de Montpellier
festivalmedievaldemontpellier.org`;

  return { html, texte: brut };
}

exports.messagerieDeMasse = onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 540,
    secrets: [ZOHO_APP_PASSWORD, ZEPTO_TOKEN],
  },
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
    const voix = donnees.voix === 'moi' ? 'moi' : 'festival';
    const cible = String(donnees.cible || 'Sans portée nommée').slice(0, 160);

    // L'identité affichée. À sa propre voix, la personne se relit dans
    // le registre plutôt que dans son jeton : le membre doit voir le nom
    // et la photo qu'il connaît, jamais une adresse de connexion.
    let auteurNom = FESTIVAL_NOM;
    let auteurTeinte = FESTIVAL_TEINTE;
    let auteurPhoto = FESTIVAL_PHOTO;
    let surtitre = 'Un mot du Festival Médiéval de Montpellier';
    if (voix === 'moi') {
      const fiche = await db.collection('membres').doc(expediteurUid).get();
      const f = fiche.exists ? fiche.data() : {};
      auteurNom = String(f.nom || '').trim()
        || String((auth.token && auth.token.name) || '').trim()
        || courriel.split('@')[0];
      auteurTeinte = Number(f.avatarHue) || 0;
      auteurPhoto = f.avatarUrl ? String(f.avatarUrl) : '';
      surtitre = `Un mot de ${auteurNom}`;
    }

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

    // L'ADRESSE vit dans users/{uid} et nulle part ailleurs : la fiche
    // publique du registre n'en porte aucune, pour qu'un membre ne
    // puisse pas lire le courriel des autres. La fonction, elle, y a
    // droit, et elle relit le registre par paquets de deux cents.
    //
    // Le drapeau d'alerte se lit au passage. Un mot à une seule personne
    // est un message privé, un envoi de groupe est une annonce, et seul
    // un `false` explicite retient la lettre (voir AlertesMembre dans
    // src/firebase/ordre.ts). Le message dans l'espace client, lui,
    // arrive dans tous les cas : ce réglage ne coupe que le courriel.
    const drapeau = voix === 'moi' ? 'messages' : 'annonces';
    for (let i = 0; i < vises.length; i += MEMBRES_PAR_LOT) {
      const tranche = vises.slice(i, i + MEMBRES_PAR_LOT);
      const lus = await db.getAll(...tranche.map((m) => db.collection('users').doc(m.uid)));
      for (let k = 0; k < lus.length; k += 1) {
        const d = lus[k].exists ? lus[k].data() : null;
        const adresse = normaliserCourriel(d && d.email);
        const alertes = (tranche[k].prefs && tranche[k].prefs.alertes) || {};
        if (COURRIEL_VALIDE.test(adresse) && alertes[drapeau] !== false) {
          tranche[k].courriel = adresse;
        }
      }
    }

    const aEcrire = vises.filter((m) => m.courriel);
    const sansLettre = vises.length - aEcrire.length;

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
      voix,
      texte,
      destinataires: vises.length,
      faits: 0,
      lettresPrevues: aEcrire.length,
      lettres: 0,
      lettresEchouees: 0,
      sansLettre,
      statut: 'en cours',
      envoyeLe: FieldValue.serverTimestamp(),
    });

    // ── Premier temps : les fils ──────────────────────────────────────
    // Le plus important, et le plus rapide. Une panne ici arrête tout
    // avant qu'une seule lettre ne parte : personne ne reçoit un
    // courriel qui renvoie à un message inexistant.
    let faits = 0;
    try {
      for (let i = 0; i < vises.length; i += MEMBRES_PAR_LOT) {
        const lot = db.batch();
        for (const m of vises.slice(i, i + MEMBRES_PAR_LOT)) {
          const id = filId(expediteurUid, m.uid);
          const fil = db.collection('dms').doc(id);
          const nom = String(m.nom || '').trim() || 'Membre';
          const photos = {};
          if (auteurPhoto) photos[expediteurUid] = auteurPhoto;
          if (m.avatarUrl) photos[m.uid] = String(m.avatarUrl);

          lot.set(fil, {
            participantUids:   [expediteurUid, m.uid].sort(),
            participantNames:  { [expediteurUid]: auteurNom, [m.uid]: nom },
            participantHues:   { [expediteurUid]: auteurTeinte, [m.uid]: Number(m.avatarHue) || 0 },
            ...(Object.keys(photos).length ? { participantPhotos: photos } : {}),
            lastMessage:   texte.slice(0, 140),
            lastMessageAt: FieldValue.serverTimestamp(),
            lastSenderUid: expediteurUid,
            unread:        { [m.uid]: FieldValue.increment(1) },
            annonce:       voix === 'festival',
          }, { merge: true });

          lot.set(fil.collection('messages').doc(), {
            senderUid:  expediteurUid,
            senderName: auteurNom,
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

    // ── Second temps : les lettres ────────────────────────────────────
    // Chacun reçoit la sienne, une seule adresse dans le champ `to`, ni
    // copie conforme ni copie invisible : personne ne découvre l'adresse
    // de son voisin, et une lettre adressée à trois cents personnes à la
    // fois tombe droit dans le pourriel. Le rythme et le choix du
    // serveur viennent d'`ouvrirTransport`, comme pour les campagnes.
    //
    // Une panne de courriel ne défait rien de ce qui précède : les
    // messages sont déjà posés, la trace note l'empêchement, et l'appel
    // rend quand même son compte au lieu de lever.
    //
    // ponytail: l'appel meurt à 540 secondes. La boîte Zoho pousse quatre
    // lettres par seconde, ce qui donne un plafond utile d'environ deux
    // mille adresses; avec le jeton ZeptoMail, dix par seconde, tout le
    // registre passe. Au-delà, la trace reste « en cours » avec le compte
    // exact des lettres parties, et la suite sera une file de tâches
    // (Cloud Tasks) plutôt qu'une boucle plus longue.
    let lettres = 0;
    let lettresEchouees = 0;
    let empechement = '';
    const adressesEchouees = [];

    if (aEcrire.length) {
      let transport = null;
      try {
        transport = ouvrirTransport(ZOHO_APP_PASSWORD.value(), jetonZeptoOuVide());
      } catch (err) {
        empechement = String((err && err.message) || err).slice(0, 200);
        logger.error('[messagerie] transport indisponible', { envoi: trace.id, empechement });
      }

      if (transport) {
        // Rien de ce qui suit ne doit défaire le premier temps. Une
        // panne au milieu des lettres se note et s'arrête là : les
        // messages restent posés, et la trace dit combien de lettres
        // étaient parties.
        try {
          const lettre = lettreDuMessage(surtitre, texte);
          // Le festival reste l'expéditeur, comme pour toute lettre du
          // site. La réponse, elle, revient à la personne qui a écrit :
          // « Répondre » dans un client de courriel doit tomber sur
          // quelqu'un, jamais dans le vide.
          const repondreA = voix === 'moi' ? courriel : ZOHO_EMAIL;

          for (let i = 0; i < aEcrire.length; i += LOT_LETTRES) {
            const tranche = aEcrire.slice(i, i + LOT_LETTRES);
            const resultats = await Promise.allSettled(
              tranche.map((m) => transport.sendMail({
                from: FROM,
                to: m.courriel,
                replyTo: repondreA,
                subject: surtitre,
                text: lettre.texte,
                html: lettre.html,
              })),
            );
            for (let k = 0; k < resultats.length; k += 1) {
              if (resultats[k].status === 'fulfilled') {
                lettres += 1;
              } else {
                lettresEchouees += 1;
                if (adressesEchouees.length < 25) {
                  adressesEchouees.push({
                    courriel: tranche[k].courriel,
                    raison: String(
                      (resultats[k].reason && resultats[k].reason.message) || resultats[k].reason,
                    ).slice(0, 200),
                  });
                }
              }
            }
            await trace.update({ lettres, lettresEchouees, adressesEchouees });
          }
        } catch (err) {
          empechement = String((err && err.message) || err).slice(0, 200);
          logger.error('[messagerie] les lettres se sont arrêtées', { envoi: trace.id, lettres, empechement });
        } finally {
          // Le bassin de connexions se referme, comme après une
          // campagne : des sockets laissées ouvertes retiennent
          // l'instance en vie et se font couper au tour suivant.
          try { transport.close(); } catch { /* le bassin était déjà tombé */ }
        }
      }
    }

    await trace.update({
      statut: 'terminé',
      faits,
      lettres,
      lettresEchouees,
      ...(empechement ? { erreurCourriel: empechement } : {}),
    });
    logger.info('[messagerie] envoi terminé', {
      envoi: trace.id, cible, voix, fils: faits, lettres, lettresEchouees, sansLettre,
    });
    return {
      fils: faits,
      ignores,
      envoiId: trace.id,
      lettres,
      lettresEchouees,
      sansLettre,
      ...(empechement ? { erreurCourriel: empechement } : {}),
    };
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

// ─── Les comptes importés de Zeffy ───────────────────────────────────
// Alex, 2026-08-27 : « tous les gens qui se sont inscrits sur Zeffy
// doivent avoir un compte par défaut; quand ils s'inscrivent, ils
// récupèrent le compte ». Le registre des clients (/clients, versé par
// tools/importer-clients.mjs) donne les courriels. Pour chacun : un
// compte Firebase Auth s'il n'existe pas déjà, une fiche users/{uid}
// marquée `origine: 'zeffy'`, et une entrée membres/{uid} avec
// l'étiquette « importé » pour que la messagerie de masse et le registre
// de l'Ordre les voient. La fusion se fait toute seule : Firebase Auth
// tient une seule identité par courriel, donc la personne qui arrive
// par Google ou par lien magique tombe sur ce compte, et le formulaire
// mot de passe la renvoie au lien magique quand le courriel existe déjà.
// Rejouable sans dégât : rien n'est recréé, rien n'est écrasé.
const IMPORT_PAR_LOT = 400;

exports.importerComptesZeffy = onCall(
  { region: 'us-central1', memory: '512MiB', timeoutSeconds: 540 },
  async (requete) => {
    const auth = requete.auth;
    const courriel = auth && auth.token && auth.token.email
      ? String(auth.token.email).toLowerCase()
      : null;
    if (!courriel || !COURRIELS_ADMIN.includes(courriel)) {
      throw new HttpsError('permission-denied', 'Cette fonction est réservée à l’équipe.');
    }

    const snap = await db.collection('clients').get();
    const parCourriel = new Map();
    for (const d of snap.docs) {
      const c = d.data();
      const mail = String(c.courriel || '').trim().toLowerCase();
      if (!mail || !mail.includes('@') || c.statut === 'annule') continue;
      const nom = String(c.nom || '').trim();
      const deja = parCourriel.get(mail);
      if (!deja || (!deja.nom && nom)) parCourriel.set(mail, { nom: nom || (deja && deja.nom) || '' });
    }

    let crees = 0, existants = 0, fiches = 0, erreurs = 0;
    const teinte = (nom) => { let h = 0; for (const ch of nom) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
    let lot = db.batch(); let dansLot = 0;
    const pousser = async () => { if (dansLot) { await lot.commit(); lot = db.batch(); dansLot = 0; } };

    for (const [mail, { nom }] of parCourriel) {
      let user;
      try {
        user = await admin.auth().getUserByEmail(mail);
        existants++;
      } catch (e) {
        if (e && e.code === 'auth/user-not-found') {
          try {
            user = await admin.auth().createUser({ email: mail, displayName: nom || undefined });
            crees++;
          } catch (e2) {
            erreurs++;
            logger.warn('[zeffy] création refusée', { mail, erreur: String(e2 && e2.message) });
            continue;
          }
        } else {
          erreurs++;
          logger.warn('[zeffy] lecture refusée', { mail, erreur: String(e && e.message) });
          continue;
        }
      }
      const uid = user.uid;
      const nomFinal = nom || user.displayName || mail.split('@')[0];
      lot.set(db.collection('users').doc(uid), {
        email: mail,
        displayName: nomFinal,
        origine: 'zeffy',
        importe: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      lot.set(db.collection('membres').doc(uid), {
        uid,
        nom: nomFinal,
        avatarHue: teinte(nomFinal),
        tags: FieldValue.arrayUnion('importé'),
        maj: FieldValue.serverTimestamp(),
      }, { merge: true });
      fiches++;
      dansLot += 2;
      if (dansLot >= IMPORT_PAR_LOT) await pousser();
    }
    await pousser();

    logger.info('[zeffy] import terminé', { courriels: parCourriel.size, crees, existants, fiches, erreurs });
    return { courriels: parCourriel.size, crees, existants, fiches, erreurs };
  },
);

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

// ─── Le mur social : voter façon Reddit ─────────────────────────────
//
// Alex, 2026-08-28 : le client n'écrit JAMAIS un compteur. Il écrit
// seulement son propre vote (mur/{postId}/votes/{voterUid} et son
// jumeau sous un commentaire), et ces trois fonctions recalculent
// pour/contre/score/chaleur — et nbCommentaires — à sa place. C'est ce
// qui ferme la faille de triche : personne ne peut forger un score en
// écrivant directement le billet, la règle Firestore le lui refuse.
//
// « chaleur » est le ballon d'hélium. FORMULE JUMELLE de
// calculerChaleur() dans src/firebase/mur.ts (et de sa copie dans
// tools/migrer-chaleur.mjs) : si l'une des trois change, les deux
// autres doivent suivre, sinon le tri du mur et celui de la migration
// divergent en silence.
const { onDocumentWritten } = require('firebase-functions/v2/firestore');

const DEMI_VIE_CHALEUR = 45_000; // 12,5 heures — jumeau de DEMI_VIE_CHALEUR dans src/firebase/mur.ts.

function calculerChaleur(score, creeLeMs) {
  const secondes = creeLeMs / 1000;
  return Math.log10(Math.max(Math.abs(score), 1)) * Math.sign(score) + secondes / DEMI_VIE_CHALEUR;
}

/**
 * Relit le vote avant/après l'écriture, en tire le delta (création,
 * changement de camp, ou suppression du vote), et recalcule
 * pour/contre/score/chaleur du document visé (billet ou commentaire)
 * dans une transaction — pour rester exact même si deux votes
 * arrivent dans la même seconde.
 */
async function traiterVote(event, docRef) {
  const avant = event.data && event.data.before && event.data.before.exists ? event.data.before.data() : null;
  const apres = event.data && event.data.after && event.data.after.exists ? event.data.after.data() : null;
  const valAvant = avant && (avant.valeur === 1 || avant.valeur === -1) ? avant.valeur : 0;
  const valApres = apres && (apres.valeur === 1 || apres.valeur === -1) ? apres.valeur : 0;
  if (valAvant === valApres) return;

  const deltaPour = (valApres === 1 ? 1 : 0) - (valAvant === 1 ? 1 : 0);
  const deltaContre = (valApres === -1 ? 1 : 0) - (valAvant === -1 ? 1 : 0);

  await db.runTransaction(async (t) => {
    const snap = await t.get(docRef);
    if (!snap.exists) return; // le billet ou le commentaire a été retiré entretemps
    const data = snap.data();
    const pour = (data.pour || 0) + deltaPour;
    const contre = (data.contre || 0) + deltaContre;
    const score = pour - contre;
    const creeLeMs = data.creeLe && data.creeLe.toMillis ? data.creeLe.toMillis() : Date.now();
    t.update(docRef, { pour, contre, score, chaleur: calculerChaleur(score, creeLeMs) });
  });
}

exports.murVoteBillet = onDocumentWritten(
  { document: 'mur/{postId}/votes/{voterUid}', region: 'us-central1', memory: '256MiB' },
  (event) => traiterVote(event, db.collection('mur').doc(event.params.postId)),
);

exports.murVoteCommentaire = onDocumentWritten(
  { document: 'mur/{postId}/commentaires/{cid}/votes/{voterUid}', region: 'us-central1', memory: '256MiB' },
  (event) => traiterVote(
    event,
    db.collection('mur').doc(event.params.postId).collection('commentaires').doc(event.params.cid),
  ),
);

/** Maintient nbCommentaires sur le billet : +1 à la création d'un
 *  commentaire, -1 à sa suppression. Une simple modification de texte
 *  ne touche à rien (existait avant == existe après). */
exports.murCommentaireCompte = onDocumentWritten(
  { document: 'mur/{postId}/commentaires/{cid}', region: 'us-central1', memory: '256MiB' },
  async (event) => {
    const existaitAvant = !!(event.data && event.data.before && event.data.before.exists);
    const existeApres = !!(event.data && event.data.after && event.data.after.exists);
    if (existaitAvant === existeApres) return;
    const delta = existeApres ? 1 : -1;
    await db.collection('mur').doc(event.params.postId).set(
      { nbCommentaires: FieldValue.increment(delta) },
      { merge: true },
    );
  },
);

// ─── L'aperçu d'un lien partagé sur le mur ──────────────────────────
// Alex, 2026-08-28 : « quand les gens partagent des liens à l'extérieur,
// il faut que ça génère un aperçu ». Le navigateur ne peut pas lire les
// métadonnées d'un site tiers — le partage d'origine croisée le bloque
// — alors cette fonction va les chercher à sa place : elle récupère la
// page et en tire les balises Open Graph, avec un repli sur <title> et
// la meta description quand le site n'en a pas.
//
// Bornée pour ne jamais devenir une porte vers un réseau privé : http(s)
// seulement, jamais une adresse locale, quinze secondes de délai, la
// réponse tronquée à 512 ko, et le même garde-fou de débit (TROP_D_APPELS,
// défini plus haut) que banquetLien et sansPubLien.
const ADRESSE_PRIVEE_APERCU = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[?::1\]?)/i;
const TAILLE_MAX_APERCU = 512 * 1024;

function extraireMeta(html, motif) {
  const m = html.match(motif);
  return m ? m[1].trim() : undefined;
}

/** og:xxx s'écrit property="og:xxx" ou name="og:xxx", contenu avant ou
 *  après selon l'ordre des attributs — les deux passent. */
function extraireOg(html, propriete) {
  const motifs = [
    new RegExp(`<meta[^>]+property=["']og:${propriete}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:${propriete}["']`, 'i'),
  ];
  for (const motif of motifs) {
    const r = extraireMeta(html, motif);
    if (r) return r;
  }
  return undefined;
}

exports.apercuLien = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
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
      if (TROP_D_APPELS(ip)) { res.status(429).json({ erreur: 'trop de demandes' }); return; }

      const brute = String((req.body && req.body.url) || req.query.url || '');
      let cible;
      try { cible = new URL(brute); } catch { res.status(400).json({ erreur: 'adresse invalide' }); return; }
      if (!['http:', 'https:'].includes(cible.protocol) || ADRESSE_PRIVEE_APERCU.test(cible.hostname)) {
        res.status(400).json({ erreur: 'adresse refusée' });
        return;
      }

      const controleur = new AbortController();
      const delai = setTimeout(() => controleur.abort(), 15000);
      let html = '';
      try {
        const reponse = await fetch(cible.toString(), {
          signal: controleur.signal,
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FMMApercu/1.0; +https://festivalmedievaldemontpellier.org)' },
        });
        const brut = Buffer.from(await reponse.arrayBuffer());
        html = brut.subarray(0, TAILLE_MAX_APERCU).toString('utf8');
      } finally {
        clearTimeout(delai);
      }

      let image = extraireOg(html, 'image');
      if (image) {
        try { image = new URL(image, cible).toString(); } catch { image = undefined; }
      }

      res.json({
        url: cible.toString(),
        titre: extraireOg(html, 'title') || extraireMeta(html, /<title[^>]*>([^<]*)<\/title>/i),
        description: extraireOg(html, 'description')
          || extraireMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
        image,
        site: extraireOg(html, 'site_name') || cible.hostname.replace(/^www\./, ''),
      });
    } catch (err) {
      logger.error('[apercuLien] échec', err);
      res.status(500).json({ erreur: 'aperçu indisponible' });
    }
  },
);

// ── Montpellois : la monnaie du site (Alex, 2026-08-28) ──────────────
const SOLDE_DEPART = 10;
const GAIN_PAR_BADGE = 5;
const GAIN_QUOTIDIEN = 1;
// Prix alignés sur src/firebase/montpellois.ts (Alex, 2026-08-28 : bleu offert,
// vert 1, doré 5). Le 31 août, le serveur débitait encore 20 et 40 : un
// joueur a vu « 5 » et payé 40. Les deux tables doivent rester identiques.
const PRIX_SKIN = { bleu: 0, vert: 1, dore: 5 };
// Les dos de carte du tarot vendus à la boutique (Alex, 2026-08-30) : le
// dos du Salon des Inconnus est offert; les autres viennent des
// récompenses quotidiennes (caravane, William), jamais de la boutique.
const PRIX_DOS = { salon: 0 };
const PRIX_ALBUM = 30;
// Alex, 2026-08-28 : les ambiances achetables de src/lib/ambiances.ts
// (celles marquées `gratuite: false`) — un seul palier pour l'instant.
const PRIX_AMBIANCE = 1;
const AMBIANCES_ACHETABLES = ['menestrel'];

const RANGS_FORTUNE = [
  { seuil: 100,        badgeId: 'fortune-100' },
  { seuil: 1000,       badgeId: 'fortune-1000' },
  { seuil: 10000,      badgeId: 'fortune-10000' },
  { seuil: 100000,     badgeId: 'fortune-100000' },
  { seuil: 1000000,    badgeId: 'fortune-1000000' },
  { seuil: 1000000000, badgeId: 'fortune-1000000000' },
];

// Sous-ensemble de src/chantier/objets.ts nécessaire côté serveur.
// À TENIR EN PHASE si le catalogue bouge.
const CATALOGUE_BOUTIQUE = [
  { id: 'casque_corbeau', prix: 15 },
  { id: 'couronne_fleurs', prix: 12 },
  { id: 'cape_etoilee', prix: 25 },
];
const CATALOGUE_TROUVAILLE = [
  { id: 'casque_cuir', rarete: 'commune' }, { id: 'jambes_cuir', rarete: 'commune' },
  { id: 'bottes_cuir', rarete: 'commune' }, { id: 'bouclier_bois', rarete: 'commune' },
  { id: 'casque_mailles', rarete: 'rare' }, { id: 'torse_mailles', rarete: 'rare' },
  { id: 'torse_troubadour', rarete: 'rare' }, { id: 'jambes_mailles', rarete: 'rare' },
  { id: 'bottes_ferrees', rarete: 'rare' }, { id: 'hache', rarete: 'rare' },
  { id: 'epee_errant', rarete: 'rare' }, { id: 'bouclier_fer', rarete: 'rare' },
  { id: 'cape_ordre', rarete: 'rare' }, { id: 'amulette_lievre', rarete: 'rare' },
  { id: 'anneau_brume', rarete: 'rare' },
  { id: 'casque_heaume', rarete: 'legendaire' }, { id: 'torse_plates', rarete: 'legendaire' },
  { id: 'bottes_ailees', rarete: 'legendaire' }, { id: 'epee_lune', rarete: 'legendaire' },
];
const OBJET_PAR_BADGE = {
  'le-parrain': 'casque_couronne_parrain',
  benevole: 'cape_benevole',
  photographe: 'amulette_oeil',
};

// La bourse telle que le serveur la lit : les valeurs de départ comblent
// un document absent ou partiel (créé par un set merge sans solde).
const BOURSE_VIDE = () => ({ solde: SOLDE_DEPART, gagne: SOLDE_DEPART, depense: 0, dernierQuotidien: null, albums: [] });
function bourseDe(snap) { return { ...BOURSE_VIDE(), ...(snap.exists ? snap.data() : {}) }; }

/** LECTURE seule pour les appelants : la création passe par create(),
 *  jamais par un set nu qui écraserait une bourse née entre-temps. */
async function assurerBourse(uid) {
  const ref = db.collection('bourses').doc(uid);
  const snap = await ref.get();
  if (snap.exists) return { ref, data: bourseDe(snap) };
  const vide = { ...BOURSE_VIDE(), maj: FieldValue.serverTimestamp() };
  try { await ref.create(vide); } catch (e) {
    if (e.code !== 6 && e.code !== 'already-exists') throw e;
    return { ref, data: bourseDe(await ref.get()) };
  }
  return { ref, data: vide };
}

// Les identifiants de badges que le serveur connaît. Le déclencheur ne
// paie que ceux-là; le client ne peut réclamer que BADGES_CLIENT, tout
// le reste se pose ici même. Doit rester en phase avec src/firebase/badges.ts.
const BADGES_SERVEUR = new Set([
  'defi-gagne', 'guilde-fondee', 'souk-vendu', 'souk-donne', 'parrain', 'le-parrain', 'amitie-1', 'amis-dix',
  'paon', 'premiere-depense', 'premier-achat-boutique', 'audiophile', 'collectionneur', 'quotidien-sept',
  'fortune-100', 'fortune-1000', 'fortune-10000', 'fortune-100000', 'fortune-1000000', 'fortune-1000000000',
  'verifie', 'vip', 'beta-testeur',
]);
const BADGES_CLIENT = new Set([
  'visiteur', 'programme', 'histoire', 'marche', 'village',
  'petit-joueur', 'joueur', 'tafl', 'tarot', 'renard', 'renard-victoire', 'merelle', 'merelle-victoire', 'des',
  'banquet', 'livre', 'billets',
  'benevole', 'kiosque', 'commanditaire', 'veteran', 'membre', 'photographe', 'profil-complet',
  'mur-premier', 'commentaire', 'guilde', 'souk', 'commerce', 'banniere', 'banniere-et-portrait',
  'billet-1', 'billet-2', 'billet-3', 'billet-4',
]);
const BADGES_CONNUS = new Set([...BADGES_SERVEUR, ...BADGES_CLIENT]);

/** Rend true seulement quand le badge vient d'être posé. */
async function poserBadge(uid, badgeId, options = {}) {
  const ref = db.collection('badges').doc(uid);
  const snap = await ref.get();
  const obtenus = (snap.exists ? snap.data().obtenus : {}) || {};
  if (badgeId in obtenus) return false;
  const patch = { obtenus: { ...obtenus, [badgeId]: FieldValue.serverTimestamp() } };
  // Un badge décerné par l'équipe (vérifié, VIP, bêta-testeur) s'annonce
  // à la prochaine visite : le client lit `aAnnoncer`, fait sonner le
  // succès une seule fois, puis efface la clé (Alex, 2026-08-31).
  if (options.annoncer) patch.aAnnoncer = { [badgeId]: true };
  await ref.set(patch, { merge: true });
  return true;
}

// Le client ne touche plus badges/{uid}.obtenus (chaque clé vaut des
// Montpellois) : il demande ici, le serveur valide l'identifiant et pose.
exports.poserBadgeClient = onCall({ region: 'us-central1' }, async (requete) => {
  const uid = requete.auth && requete.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous d’abord.');
  const badgeId = String((requete.data || {}).badgeId || '');
  if (!BADGES_CLIENT.has(badgeId)) throw new HttpsError('invalid-argument', 'Badge inconnu.');
  return { neuf: await poserBadge(uid, badgeId) };
});

// ── Les badges de la cour : décernés, jamais gagnés ──────────────────
// Le badge bleu vérifié suit membres/{uid}.verifie (posé par l'équipe
// depuis la fiche), le badge VIP suit users/{uid}.sansPub (Square ou
// l'équipe). Les deux s'annoncent à la prochaine connexion.
exports.badgeVerifie = onDocumentWritten(
  { document: 'membres/{uid}', region: 'us-central1', memory: '256MiB' },
  async (event) => {
    const avant = event.data && event.data.before && event.data.before.exists ? event.data.before.data() : {};
    const apres = event.data && event.data.after && event.data.after.exists ? event.data.after.data() : {};
    if (apres.verifie && !avant.verifie) await poserBadge(event.params.uid, 'verifie', { annoncer: true });
  },
);
exports.badgeVip = onDocumentWritten(
  { document: 'users/{uid}', region: 'us-central1', memory: '256MiB' },
  async (event) => {
    const avant = event.data && event.data.before && event.data.before.exists ? event.data.before.data() : {};
    const apres = event.data && event.data.after && event.data.after.exists ? event.data.after.data() : {};
    if (apres.sansPub && !avant.sansPub) {
      await poserBadge(event.params.uid, 'vip', { annoncer: true });
      await db.collection('membres').doc(event.params.uid).set({ vip: true, maj: FieldValue.serverTimestamp() }, { merge: true });
    }
  },
);

// ── Le registre des membres : une fiche par compte, toujours ─────────
// Alex, 2026-08-31 : « Purazar Médiéval » avait un compte mais aucune
// fiche visible dans le registre. Chaque compte Auth doit avoir sa fiche
// users/{uid} (le registre de l'admin) et membres/{uid} (la fiche
// publique), créées au moment où le compte naît, et rattrapables en lot.
function teinteDeNom(nom) { let h = 0; for (const ch of String(nom)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }

async function assurerFicheCompte(u) {
  const uid = u.uid;
  const mail = String(u.email || '').toLowerCase();
  const nom = u.displayName || (mail ? mail.split('@')[0] : 'Membre');
  const userRef = db.collection('users').doc(uid);
  const membreRef = db.collection('membres').doc(uid);
  const [us, ms] = await Promise.all([userRef.get(), membreRef.get()]);
  const ud = us.exists ? us.data() : {};
  const md = ms.exists ? ms.data() : {};
  const lot = db.batch();
  let touche = 0;
  const patchU = {};
  if (!ud.email && mail) patchU.email = mail;
  if (!ud.displayName) patchU.displayName = nom;
  if (!ud.createdAt) patchU.createdAt = u.creeLe ? admin.firestore.Timestamp.fromMillis(u.creeLe) : FieldValue.serverTimestamp();
  if (!us.exists) patchU.origine = 'site';
  if (Object.keys(patchU).length) { patchU.updatedAt = FieldValue.serverTimestamp(); lot.set(userRef, patchU, { merge: true }); touche++; }
  const patchM = {};
  if (!md.uid) patchM.uid = uid;
  if (!md.nom) patchM.nom = nom;
  if (md.avatarHue === undefined) patchM.avatarHue = teinteDeNom(nom);
  if (!md.avatarUrl && u.photoURL) patchM.avatarUrl = u.photoURL;
  if (Object.keys(patchM).length) { patchM.maj = FieldValue.serverTimestamp(); lot.set(membreRef, patchM, { merge: true }); touche++; }
  if (touche) await lot.commit();
  return touche > 0;
}

exports.compteCree = functionsV1.region('us-central1').auth.user().onCreate((user) => assurerFicheCompte({
  uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL,
  creeLe: user.metadata && user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : 0,
}));

exports.synchroniserRegistre = onCall(
  { region: 'us-central1', memory: '512MiB', timeoutSeconds: 540 },
  async (requete) => {
    const courriel = requete.auth && requete.auth.token && requete.auth.token.email
      ? String(requete.auth.token.email).toLowerCase() : null;
    if (!courriel || !COURRIELS_ADMIN.includes(courriel)) {
      throw new HttpsError('permission-denied', 'Cette fonction est réservée à l’équipe.');
    }
    let comptes = 0, corriges = 0, jeton;
    do {
      const page = await admin.auth().listUsers(1000, jeton);
      for (const user of page.users) {
        comptes++;
        if (await assurerFicheCompte({
          uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL,
          creeLe: user.metadata && user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : 0,
        })) corriges++;
      }
      jeton = page.pageToken;
    } while (jeton);
    logger.info('[registre] synchronisation', { comptes, corriges });
    return { comptes, corriges };
  },
);

async function verifierRangsFortune(uid, gagneAvant, gagneApres) {
  for (const rang of RANGS_FORTUNE) {
    if (gagneAvant < rang.seuil && gagneApres >= rang.seuil) await poserBadge(uid, rang.badgeId);
  }
}

/** Le seul chemin qui AJOUTE des Montpellois. Tout se passe dans une
 *  transaction : deux crédits en même temps ne se perdent plus. `cle`
 *  (l'identifiant du badge) rend le crédit idempotent : la bourse note
 *  dans `badgesCredites` ce qui a déjà payé, et une relivraison du
 *  déclencheur ou un badge retiré puis remis ne repaie pas. */
async function crediter(uid, montant, cle) {
  const ref = db.collection('bourses').doc(uid);
  const r = await db.runTransaction(async (tx) => {
    const data = bourseDe(await tx.get(ref));
    if (cle && data.badgesCredites && data.badgesCredites[cle]) return null;
    const gagneAvant = data.gagne;
    const patch = { solde: data.solde + montant, gagne: gagneAvant + montant, depense: data.depense, maj: FieldValue.serverTimestamp() };
    if (cle) patch.badgesCredites = { [cle]: true };
    tx.set(ref, patch, { merge: true });
    return { solde: patch.solde, gagneAvant, gagneApres: patch.gagne };
  });
  if (!r) return null;
  await verifierRangsFortune(uid, r.gagneAvant, r.gagneApres);
  return r.solde;
}

/** Le seul chemin qui RETIRE des Montpellois : pose 'premiere-depense'
 *  à la toute première fois, quel que soit l'achat. C'est aussi le
 *  seul chemin de tout achat À LA BOUTIQUE (cosmétique, skin, album,
 *  ambiance — le Souk a sa propre transaction plus bas), donc 'premier-
 *  achat-boutique' se pose ici même, une seule fois pour tous les
 *  appelants (Alex, 2026-08-28). */
async function debiter(uid, montant, extra = {}) {
  const ref = db.collection('bourses').doc(uid);
  // Garde et écriture dans la même transaction : deux achats lancés coup
  // sur coup ne passent plus tous deux avec un seul solde.
  const r = await db.runTransaction(async (tx) => {
    const data = bourseDe(await tx.get(ref));
    if (data.solde < montant) throw new HttpsError('failed-precondition', 'Pas assez de Montpellois.');
    const patch = { solde: data.solde - montant, gagne: data.gagne, depense: data.depense + montant, maj: FieldValue.serverTimestamp(), ...extra };
    tx.set(ref, patch, { merge: true });
    return { solde: patch.solde, premiereFois: data.depense === 0 };
  });
  if (r.premiereFois) {
    await poserBadge(uid, 'premiere-depense');
    await poserBadge(uid, 'premier-achat-boutique');
  }
  return r.solde;
}

/** L'audiophile : cinq ambiances ou albums achetés, peu importe le
 *  mélange (Alex, 2026-08-28). */
async function verifierAudiophile(uid) {
  const snap = await db.collection('bourses').doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  const total = (data.ambiances || []).length + (data.albums || []).length;
  if (total >= 5) await poserBadge(uid, 'audiophile');
}

function tirerRarete() {
  const r = Math.random() * 100;
  if (r < 5) return 'legendaire';
  if (r < 30) return 'rare';
  return 'commune';
}

// ── La journée du festival (Alex, 2026-09-02) ────────────────────────
// La roue compte par JOURNÉE CIVILE dans le fuseau du festival, jamais
// par fenêtre de 24 heures glissantes. La fenêtre repoussait l'heure
// d'ouverture un peu plus tard chaque jour : qui réclamait à 21 h un
// soir se faisait refuser à 13 h le lendemain, revenait le surlendemain,
// et l'écart dépassait alors 48 heures, ce qui remettait la roue au jour
// 1 alors que la personne était venue tous les jours. Relevé le
// 2026-09-02 sur les trente-quatre bourses qui avaient déjà réclamé :
// trente étaient au jour 1, quatre au jour 2, aucune plus loin. Personne
// n'avait jamais vu le troisième jour de la roue. Le fuseau règle du
// même coup ce qui avait fait poser la fenêtre le 2026-08-30 : minuit
// UTC tombait à 20 h au Québec et servait deux récompenses le même soir.
//
// JUMELLES des fonctions du même nom dans src/firebase/montpellois.ts,
// dont se sert le panneau pour annoncer ce que le serveur va donner. Si
// l'une des deux moitiés change, l'autre doit suivre le jour même.
// Le banc tools/roue-quotidienne.test.mjs rejoue les deux.
const FUSEAU_FESTIVAL = 'America/Toronto';

// formatToParts plutôt que format : les parties sont nommées, donc le
// résultat tient même là où la locale « en-CA » n'est pas installée.
const JOURNEE_FESTIVAL = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU_FESTIVAL, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** La journée civile du festival, en « AAAA-MM-JJ », pour un instant donné. */
function journeeFestival(ms) {
  const p = {};
  for (const m of JOURNEE_FESTIVAL.formatToParts(new Date(ms))) p[m.type] = m.value;
  return `${p.year}-${p.month}-${p.day}`;
}

/** La journée d'avant. La chaîne est une date pure, donc le calcul se
 *  fait en UTC : ni le fuseau ni l'heure d'été n'y changent rien. */
function veilleDe(journee) {
  return new Date(Date.parse(`${journee}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
}

// ── La roue des sept jours (Alex, 2026-08-30, sur le modèle Gwent) ──
// Chaque visite quotidienne réclame la récompense du jour de la roue :
// jour 1 = 5 Montpellois, jour 2 = 10, jour 3 = le hnefatafl de la
// caravane (pièces + plateau), jour 4 = le tarot de la caravane (dos de
// carte), jour 5 = 15, jour 6
// = 20, jour 7 = une seconde chance au concours William J. Walter.
// Passé le jour 7, la roue recommence. Un jour sauté remet au jour 1.
// Doit rester en phase avec RECOMPENSES_QUOTIDIEN (src/firebase/montpellois.ts).
// Deux semaines (Alex, 2026-08-31) : la première donne le plateau de la
// caravane au jour 3, la seconde donne les PIÈCES de la caravane au jour
// 8, sans Montpellois à payer. Passé le jour 14, la roue recommence; un
// objet déjà possédé se remplace par des Montpellois (MONTPELLOIS_DE_REMPLACEMENT).
const ROUE_QUOTIDIENNE = [
  { montpellois: 5 },
  { montpellois: 10 },
  { taflPlateaux: 'caravane' },
  { dosTarot: 'caravane' },
  { montpellois: 15 },
  { montpellois: 20 },
  { chanceWJW: 1, dosTarot: 'william' },
  { taflPieces: 'caravane' },
  { montpellois: 10 },
  { montpellois: 15 },
  { montpellois: 20 },
  { montpellois: 25 },
  { montpellois: 30 },
  { chanceWJW: 1 },
];
const MONTPELLOIS_DE_REMPLACEMENT = 10;

exports.reclamerQuotidien = onCall({ region: 'us-central1' }, async (requete) => {
  const uid = requete.auth && requete.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous pour réclamer votre récompense du jour.');
  const ref = db.collection('bourses').doc(uid);
  const { solde, gagneAvant, gagneApres, suite, jour } = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : { solde: SOLDE_DEPART, gagne: SOLDE_DEPART, depense: 0 };
    // Une réclamation par journée civile du festival (voir plus haut).
    const dernierMs = data.dernierQuotidien && data.dernierQuotidien.toMillis ? data.dernierQuotidien.toMillis() : 0;
    const aujourdhui = journeeFestival(Date.now());
    const derniereJournee = dernierMs ? journeeFestival(dernierMs) : null;
    if (derniereJournee === aujourdhui) throw new HttpsError('failed-precondition', 'Déjà réclamée : la prochaine récompense vous attend demain.');
    // La suite (Alex, 2026-08-28, badge 'quotidien-sept') : elle continue
    // si la dernière réclamation date d'hier, elle repart à un jour sinon
    // (première réclamation, ou une journée entière sautée). Une vieille
    // bourse qui porte une date sans compteur valait déjà un jour : sans
    // ce garde-fou, sa deuxième journée d'affilée retomberait au jour 1.
    const suiteAvant = data.quotidienSuite || (derniereJournee ? 1 : 0);
    const suite = derniereJournee === veilleDe(aujourdhui) ? suiteAvant + 1 : 1;
    const jour = ((suite - 1) % ROUE_QUOTIDIENNE.length) + 1;
    const don = ROUE_QUOTIDIENNE[jour - 1];
    // Un objet déjà au coffre (deuxième tour de roue, ou reçu autrement)
    // ne se donne pas deux fois : des Montpellois le remplacent.
    const dejaAu = (champ, valeur) => Array.isArray(data[champ]) && data[champ].includes(valeur);
    const dejaPossede = (don.taflPieces && dejaAu('taflPieces', don.taflPieces))
      || (don.taflPlateaux && dejaAu('taflPlateaux', don.taflPlateaux))
      || (don.dosTarot && dejaAu('dosTarot', don.dosTarot));
    const gain = (don.montpellois || 0) + (dejaPossede ? MONTPELLOIS_DE_REMPLACEMENT : 0);
    const gagneAvant = data.gagne || 0;
    const gagneApres = gagneAvant + gain;
    const solde = (data.solde || 0) + gain;
    const maj = { solde, gagne: gagneApres, dernierQuotidien: FieldValue.serverTimestamp(), quotidienSuite: suite, maj: FieldValue.serverTimestamp() };
    if (don.taflPieces) maj.taflPieces = FieldValue.arrayUnion(don.taflPieces);
    if (don.taflPlateaux) maj.taflPlateaux = FieldValue.arrayUnion(don.taflPlateaux);
    if (don.dosTarot) maj.dosTarot = FieldValue.arrayUnion(don.dosTarot);
    if (don.chanceWJW) maj.chancesWJW = FieldValue.increment(don.chanceWJW);
    tx.set(ref, maj, { merge: true });
    return { solde, gagneAvant, gagneApres, suite, jour };
  });
  await verifierRangsFortune(uid, gagneAvant, gagneApres); // ponytail : hors transaction, badge cosmétique
  if (suite >= 7) await poserBadge(uid, 'quotidien-sept');
  // Le jour 7 inscrit la personne au registre du concours William J.
  // Walter d'office, et lui compte une chance de plus (Alex, 2026-08-30).
  if (ROUE_QUOTIDIENNE[jour - 1].chanceWJW) {
    await inscrireAuConcoursWJW(uid, requete.auth.token && requete.auth.token.email, { viaRecompense: true, chances: 1 });
  }
  return { solde, suite, jour };
});

// ── Le registre du concours William J. Walter ────────────────────────
// Un document par courriel (concoursWJW/{courriel}), le même que le
// formulaire public. Ici le serveur écrit pour le compte de la personne
// connectée : nom de sa fiche, courriel de son compte, téléphone si elle
// l'a donné. `chances` compte les entrées dans le chapeau (1 à
// l'inscription, +1 par récompense du jour 7). `consentementPartage`
// n'est vrai que si la personne a cliqué elle-même pour participer.
async function inscrireAuConcoursWJW(uid, courriel, options) {
  const email = String(courriel || '').trim().toLowerCase();
  if (!email) return null;
  const membre = await db.collection('membres').doc(uid).get();
  const nom = (membre.exists && membre.data().nom) || '';
  const ref = db.collection('concoursWJW').doc(email);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existant = snap.exists ? snap.data() : null;
    const maj = {
      courriel: email,
      uid,
      nom: (existant && existant.nom) || nom || email,
      telephone: options.telephone || (existant && existant.telephone) || '',
      chances: FieldValue.increment(options.chances || 0),
      majLe: FieldValue.serverTimestamp(),
    };
    if (!existant) {
      maj.inscritLe = FieldValue.serverTimestamp();
      maj.consentementPartage = !!options.consentement;
      maj.chances = FieldValue.increment((options.chances || 0) + 1);
    } else if (options.consentement) {
      maj.consentementPartage = true;
    }
    if (options.viaRecompense) maj.viaRecompense = true;
    if (options.viaCompte) maj.viaCompte = true;
    tx.set(ref, maj, { merge: true });
  });
  return email;
}

exports.participerConcoursAvecCompte = onCall({ region: 'us-central1' }, async (requete) => {
  const uid = requete.auth && requete.auth.uid;
  const email = requete.auth && requete.auth.token && requete.auth.token.email;
  if (!uid || !email) throw new HttpsError('unauthenticated', 'Connectez-vous pour participer avec votre compte.');
  const telephone = String((requete.data || {}).telephone || '').trim().slice(0, 40);
  await inscrireAuConcoursWJW(uid, email, { viaCompte: true, consentement: true, telephone });
  return { courriel: email.toLowerCase() };
});

exports.tenterUneTrouvaille = onCall({ region: 'us-central1' }, async (requete) => {
  const uid = requete.auth && requete.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous pour tenter votre chance.');
  const ref = db.collection('avatars').doc(uid);
  const snap = await ref.get();
  const avatar = snap.exists ? snap.data() : { sac: [], equipe: {} };
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const dernier = avatar.dernierTirage && avatar.dernierTirage.toDate ? avatar.dernierTirage.toDate().toISOString().slice(0, 10) : null;
  if (dernier === aujourdhui) return { objetId: null, dejaFaiteAujourdhui: true };

  const possedes = new Set([...(avatar.sac || []), ...Object.values(avatar.equipe || {}).filter(Boolean)]);
  const rarete = tirerRarete();
  let pool = CATALOGUE_TROUVAILLE.filter((o) => o.rarete === rarete && !possedes.has(o.id));
  if (pool.length === 0) pool = CATALOGUE_TROUVAILLE.filter((o) => !possedes.has(o.id));
  if (pool.length === 0) {
    await ref.set({ dernierTirage: FieldValue.serverTimestamp() }, { merge: true });
    return { objetId: null, dejaFaiteAujourdhui: false };
  }
  const objet = pool[Math.floor(Math.random() * pool.length)];
  await ref.set({
    sac: FieldValue.arrayUnion(objet.id), dernierTirage: FieldValue.serverTimestamp(),
    ...(snap.exists ? {} : { corps: 'A', peau: 0, coiffure: 0, equipe: {} }),
  }, { merge: true });
  return { objetId: objet.id, dejaFaiteAujourdhui: false };
});

exports.acheterCosmetique = onCall({ region: 'us-central1' }, async (requete) => {
  const uid = requete.auth && requete.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter.');
  const objetId = String((requete.data || {}).objetId || '');

  if (objetId.startsWith('skin_')) {
    const skin = objetId.slice(5);
    if (!(skin in PRIX_SKIN)) throw new HttpsError('invalid-argument', 'Skin inconnu.');
    const userSnap = await db.collection('users').doc(uid).get();
    const vip = !!(userSnap.exists && userSnap.data().sansPub);
    const avatarRef = db.collection('avatars').doc(uid);
    const avatarSnap = await avatarRef.get();
    const deja = avatarSnap.exists && (avatarSnap.data().skinsDebloques || []).includes(skin);
    if (deja) throw new HttpsError('failed-precondition', 'Déjà à vous.');
    let solde;
    if (vip || PRIX_SKIN[skin] === 0) { const b = await assurerBourse(uid); solde = b.data.solde || 0; }
    else solde = await debiter(uid, PRIX_SKIN[skin]);
    await avatarRef.set({ skinsDebloques: FieldValue.arrayUnion(skin) }, { merge: true });
    return { solde };
  }

  if (objetId.startsWith('dos_')) {
    const dos = objetId.slice(4);
    if (!(dos in PRIX_DOS)) throw new HttpsError('invalid-argument', 'Dos de carte inconnu.');
    const { ref, data } = await assurerBourse(uid);
    if ((data.dosTarot || []).includes(dos)) throw new HttpsError('failed-precondition', 'Déjà à vous.');
    const solde = PRIX_DOS[dos] > 0 ? await debiter(uid, PRIX_DOS[dos]) : (data.solde || 0);
    await ref.set({ dosTarot: FieldValue.arrayUnion(dos), maj: FieldValue.serverTimestamp() }, { merge: true });
    return { solde };
  }

  const objet = CATALOGUE_BOUTIQUE.find((o) => o.id === objetId);
  if (!objet) throw new HttpsError('invalid-argument', 'Objet inconnu.');
  const avatarRef = db.collection('avatars').doc(uid);
  const avatarSnap = await avatarRef.get();
  const avatar = avatarSnap.exists ? avatarSnap.data() : { sac: [], equipe: {} };
  const possede = (avatar.sac || []).includes(objetId) || Object.values(avatar.equipe || {}).includes(objetId);
  if (possede) throw new HttpsError('failed-precondition', 'Déjà à vous.');
  const solde = await debiter(uid, objet.prix);
  await avatarRef.set({ sac: FieldValue.arrayUnion(objetId) }, { merge: true });
  return { solde };
});

exports.acheterAlbum = onCall({ region: 'us-central1' }, async (requete) => {
  const uid = requete.auth && requete.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter.');
  const groupeId = String((requete.data || {}).groupeId || '');
  const groupeSnap = await db.collection('groupesMusicaux').doc(groupeId).get();
  if (!groupeSnap.exists) throw new HttpsError('invalid-argument', 'Groupe inconnu.');
  const { data: bourse } = await assurerBourse(uid);
  if ((bourse.albums || []).includes(groupeId)) throw new HttpsError('failed-precondition', 'Déjà à vous.');
  const solde = await debiter(uid, PRIX_ALBUM, { albums: FieldValue.arrayUnion(groupeId) });
  await verifierAudiophile(uid);
  return { solde };
});

// Alex, 2026-08-28 : sur le patron exact d'acheterAlbum, pour tester
// l'achat d'une ambiance en Montpellois (voir src/lib/ambiances.ts).
exports.acheterAmbiance = onCall({ region: 'us-central1' }, async (requete) => {
  const uid = requete.auth && requete.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter.');
  const ambianceId = String((requete.data || {}).ambianceId || '');
  if (!AMBIANCES_ACHETABLES.includes(ambianceId)) throw new HttpsError('invalid-argument', 'Ambiance inconnue.');
  const { data: bourse } = await assurerBourse(uid);
  if ((bourse.ambiances || []).includes(ambianceId)) throw new HttpsError('failed-precondition', 'Déjà à vous.');
  const solde = await debiter(uid, PRIX_AMBIANCE, { ambiances: FieldValue.arrayUnion(ambianceId) });
  await verifierAudiophile(uid);
  return { solde };
});

exports.acheterAuSouk = onCall({ region: 'us-central1' }, async (requete) => {
  const acheteurUid = requete.auth && requete.auth.uid;
  if (!acheteurUid) throw new HttpsError('unauthenticated', 'Connectez-vous pour acheter.');
  const objetSoukId = String((requete.data || {}).objetSoukId || '');
  const soukRef = db.collection('souk').doc(objetSoukId);
  const acheteurRef = db.collection('bourses').doc(acheteurUid);

  const resultat = await db.runTransaction(async (tx) => {
    const soukSnap = await tx.get(soukRef);
    if (!soukSnap.exists) throw new HttpsError('not-found', 'Cet objet n’existe plus.');
    const objet = soukSnap.data();
    if (objet.statut !== 'disponible') throw new HttpsError('failed-precondition', 'Cet objet n’est plus disponible.');
    // Un entier strictement positif, rien d'autre : un prix négatif ou une
    // chaîne renverserait le transfert entre les deux bourses.
    const prix = objet.prixMontpellois;
    if (!Number.isInteger(prix) || prix <= 0) throw new HttpsError('failed-precondition', 'Cet objet ne se vend pas en Montpellois.');
    if (objet.uid === acheteurUid) throw new HttpsError('failed-precondition', 'Vous ne pouvez pas vous acheter vous-même.');
    const vendeurRef = db.collection('bourses').doc(objet.uid);
    const [acheteurSnap, vendeurSnap] = await Promise.all([tx.get(acheteurRef), tx.get(vendeurRef)]);
    const acheteurData = bourseDe(acheteurSnap);
    const vendeurData = bourseDe(vendeurSnap);
    if ((acheteurData.solde || 0) < prix) throw new HttpsError('failed-precondition', 'Pas assez de Montpellois.');

    const premiereFois = (acheteurData.depense || 0) === 0;
    const soldeAcheteurApres = (acheteurData.solde || 0) - prix;
    const gagneVendeurAvant = vendeurData.gagne || 0;
    const gagneVendeurApres = gagneVendeurAvant + prix;

    tx.set(acheteurRef, { solde: soldeAcheteurApres, depense: (acheteurData.depense || 0) + prix, maj: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(vendeurRef, { solde: (vendeurData.solde || 0) + prix, gagne: gagneVendeurApres, maj: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(soukRef, { statut: 'vendu', maj: FieldValue.serverTimestamp() }, { merge: true });

    return { solde: soldeAcheteurApres, vendeurUid: objet.uid, titre: objet.titre, prix, premiereFois, gagneVendeurAvant, gagneVendeurApres };
  });

  if (resultat.premiereFois) await poserBadge(acheteurUid, 'premiere-depense');
  await verifierRangsFortune(resultat.vendeurUid, resultat.gagneVendeurAvant, resultat.gagneVendeurApres);

  // Ouvre le fil de messagerie (même patron que ensureThread côté client, src/firebase/dms.ts)
  const [acheteurMembre, vendeurMembre] = await Promise.all([
    db.collection('membres').doc(acheteurUid).get(),
    db.collection('membres').doc(resultat.vendeurUid).get(),
  ]);
  const nomAcheteur = (acheteurMembre.exists && acheteurMembre.data().nom) || 'Un membre';
  const nomVendeur  = (vendeurMembre.exists && vendeurMembre.data().nom) || 'Un membre';
  const filId = [acheteurUid, resultat.vendeurUid].sort().join('__');
  const filRef = db.collection('dms').doc(filId);
  await filRef.set({
    participantUids: [acheteurUid, resultat.vendeurUid].sort(),
    participantNames: { [acheteurUid]: nomAcheteur, [resultat.vendeurUid]: nomVendeur },
  }, { merge: true });
  await filRef.collection('messages').add({
    senderUid: acheteurUid, senderName: nomAcheteur,
    body: `${nomAcheteur} a acheté « ${resultat.titre} » pour ${resultat.prix} Montpellois.`,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { solde: resultat.solde, filId };
});

// Un défi de tafl gagné (src/firebase/tafl.ts, taflParties) : le badge
// du camp vainqueur, à la première partie finie par une victoire
// (Alex, 2026-08-28).
exports.defiGagneBadge = onDocumentWritten(
  { document: 'taflParties/{id}', region: 'us-central1', memory: '256MiB' },
  async (event) => {
    const avant = (event.data && event.data.before && event.data.before.exists) ? event.data.before.data() : null;
    const apres = (event.data && event.data.after && event.data.after.exists) ? event.data.after.data() : null;
    if (!apres || apres.statut !== 'fini' || !apres.gagnant || (avant && avant.statut === 'fini')) return;
    const vainqueurUid = apres.camps && apres.camps[apres.gagnant];
    if (vainqueurUid) await poserBadge(vainqueurUid, 'defi-gagne');
  },
);

// Une guilde fondée (src/firebase/guildes.ts, creerGuilde) : le badge
// du fondateur, posé ici plutôt que dans guildes.ts pour rester dans
// les fichiers qui m'appartiennent (Alex, 2026-08-28).
exports.guildeFondeeBadge = onDocumentCreated(
  { document: 'guildes/{id}', region: 'us-central1', memory: '256MiB' },
  async (event) => {
    const data = event.data && event.data.data();
    if (data && data.creePar) await poserBadge(data.creePar, 'guilde-fondee');
  },
);

// Une amitié qui devient réciproque : le badge des deux côtés, peu
// importe qui a cliqué « accepter » (src/firebase/ordre.ts,
// accepterAmitie). Une requête de comptage donne aussi le badge des
// dix amitiés, sans dupliquer la logique côté client (Alex, 2026-08-28).
exports.amitieBadge = onDocumentWritten(
  { document: 'amities/{id}', region: 'us-central1', memory: '256MiB' },
  async (event) => {
    const avant = (event.data && event.data.before && event.data.before.exists) ? event.data.before.data() : null;
    const apres = (event.data && event.data.after && event.data.after.exists) ? event.data.after.data() : null;
    if (!apres || apres.statut !== 'amis' || (avant && avant.statut === 'amis')) return;
    for (const uid of apres.paire || []) {
      await poserBadge(uid, 'amitie-1');
      const compte = await db.collection('amities').where('paire', 'array-contains', uid).where('statut', '==', 'amis').count().get();
      if (compte.data().count >= 10) await poserBadge(uid, 'amis-dix');
    }
  },
);

// Un objet du Souk qui passe à 'vendu' : le badge du vendeur, qu'il
// soit passé par acheterAuSouk (paiement en Montpellois) ou par un
// arrangement en dehors du site que le vendeur marque lui-même
// (majObjetSouk, src/firebase/souk.ts — territoire d'un autre agent,
// mais toute écriture retombe ici quel que soit le chemin emprunté).
// Prix et prixMontpellois absents ou à zéro = objet donné, pas vendu
// (même règle qu'estGratuit côté client). Alex, 2026-08-28.
exports.soukVenduBadge = onDocumentWritten(
  { document: 'souk/{id}', region: 'us-central1', memory: '256MiB' },
  async (event) => {
    const avant = (event.data && event.data.before && event.data.before.exists) ? event.data.before.data() : null;
    const apres = (event.data && event.data.after && event.data.after.exists) ? event.data.after.data() : null;
    if (!apres || apres.statut !== 'vendu' || (avant && avant.statut === 'vendu')) return;
    const gratuit = !apres.prix && !apres.prixMontpellois;
    await poserBadge(apres.uid, gratuit ? 'souk-donne' : 'souk-vendu');
  },
);

// Gain de Montpellois par badge + objet lié à un badge, dans la même
// fonction (Alex l'a demandé) : réagit à TOUT écrit sur badges/{uid},
// y compris ceux posés par poserBadge() elle-même (fortune, premiere-
// depense) — c'est voulu, gagner un badge de rang donne aussi sa
// piécette.
exports.badgeMontpelloisEtTrouvaille = onDocumentWritten(
  { document: 'badges/{uid}', region: 'us-central1', memory: '256MiB' },
  async (event) => {
    const uid = event.params.uid;
    const avant = (event.data && event.data.before && event.data.before.exists) ? (event.data.before.data().obtenus || {}) : {};
    const apres = (event.data && event.data.after && event.data.after.exists) ? (event.data.after.data().obtenus || {}) : {};
    // Seuls les identifiants connus paient, et chaque crédit porte la clé
    // du badge : crediter refuse de payer deux fois la même clé.
    const nouveaux = Object.keys(apres).filter((id) => !(id in avant) && BADGES_CONNUS.has(id));
    for (const badgeId of nouveaux) {
      // Un badge de fortune vient d'un gain : le recréditer ferait
      // tourner la fonction en rond (Alex, 2026-08-28).
      if (badgeId.startsWith('fortune-') || badgeId === 'premiere-depense') {
        const objetSeul = OBJET_PAR_BADGE[badgeId];
        if (objetSeul) await db.collection('avatars').doc(uid).set({ sac: FieldValue.arrayUnion(objetSeul) }, { merge: true });
        continue;
      }
      // Le collectionneur (Alex, 2026-08-30) vaut vingt Montpellois, pas cinq.
      if (badgeId === 'collectionneur') { await crediter(uid, 20, 'collectionneur'); continue; }
      await crediter(uid, GAIN_PAR_BADGE, badgeId);
      const objetId = OBJET_PAR_BADGE[badgeId];
      if (objetId) await db.collection('avatars').doc(uid).set({ sac: FieldValue.arrayUnion(objetId) }, { merge: true });
    }
    // Dix badges réunis : le badge du collectionneur se pose, et sa
    // prime part par le tour suivant de cette même fonction.
    const connus = Object.keys(apres).filter((id) => BADGES_CONNUS.has(id)).length;
    if (connus >= 10 && !('collectionneur' in apres)) await poserBadge(uid, 'collectionneur');
  },
);

// ── Votez avec votre portefeuille (Alex, 2026-09-06) ─────────────────
// « Où voulez-vous voir votre argent travailler l'an prochain ? » Le
// membre mise des Montpellois sur une des six enveloppes; le serveur
// débite sa bourse et tient les compteurs. Les dollars, eux, passent
// par Zeffy et ne touchent pas ce chemin.
//
// La liste doit rester la JUMELLE de CATEGORIES_BUDGET dans
// src/content/budgetVotes.ts : une case ajoutée d'un seul côté est une
// case morte de l'autre.
const CATEGORIES_BUDGET = ['pourboires', 'musique', 'animations', 'village', 'bouffe', 'reseau'];
/** Le plafond d'une mise, pour qu'une faute de frappe ne vide pas une bourse. */
const MISE_BUDGET_MAX = 1000;

exports.voterBudget = onCall({ region: 'us-central1' }, async (requete) => {
  const uid = requete.auth && requete.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous pour miser.');
  const categorie = String((requete.data || {}).categorie || '');
  const montant = Math.floor(Number((requete.data || {}).montant));
  if (!CATEGORIES_BUDGET.includes(categorie)) throw new HttpsError('invalid-argument', 'Enveloppe inconnue.');
  if (!Number.isFinite(montant) || montant < 1 || montant > MISE_BUDGET_MAX) {
    throw new HttpsError('invalid-argument', 'Montant hors barème.');
  }
  // ponytail : le débit passe d'abord, les compteurs ensuite, comme
  // pour tous les achats de la boutique. Si l'écriture des compteurs
  // échouait, les pièces seraient parties sans que la mise paraisse.
  // Une transaction qui tiendrait les trois documents réglerait ça le
  // jour où le volume le justifie.
  const solde = await debiter(uid, montant);
  const totauxRef = db.collection('votesBudget').doc('totaux');
  await totauxRef.set({
    montpellois: { [categorie]: FieldValue.increment(montant) },
    mises:       { [categorie]: FieldValue.increment(1) },
    maj: FieldValue.serverTimestamp(),
  }, { merge: true });
  await totauxRef.collection('membres').doc(uid).set({
    [categorie]: FieldValue.increment(montant),
    maj: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { solde };
});

// ── La bourse publique (Alex, 2026-08-28) ────────────────────────────
// « La personne peut choisir si elle met sa bourse publique ou privée.
// Quand elle la montre, elle gagne un badge rigolo. » Le drapeau passe
// par ici parce que la bourse ne s'écrit jamais depuis le navigateur.
exports.boursePubliqueBascule = onCall({ region: 'us-central1' }, async (requete) => {
  const uid = requete.auth && requete.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous d’abord.');
  const publique = !!(requete.data || {}).publique;
  const { ref } = await assurerBourse(uid);
  await ref.set({ publique, maj: FieldValue.serverTimestamp() }, { merge: true });
  if (publique) await poserBadge(uid, 'paon');
  return { publique };
});


// ─── Recharger sa bourse en Montpellois, par Stripe ──────────────────
// Alex, 2026-08-31 : les Montpellois se gagnent en explorant le
// festival, et depuis la boutique ils s'achètent aussi en argent réel.
// Trois lots, en dollars canadiens : 5 $ pour cent pièces, 10 $ pour
// trois cents, 15 $ pour cinq cents.
//
// Le chemin est celui du grimoire, avec Stripe à la place de Square :
//   1. La boutique appelle `acheterMontpelloisLien` avec l'identifiant
//      du lot. La fonction bâtit une session Stripe Checkout et rend
//      son adresse; le navigateur s'y rend.
//   2. Stripe encaisse, puis appelle le webhook `stripeMontpellois`
//      (événement checkout.session.completed).
//   3. La signature de Stripe est vérifiée avant tout : sans elle,
//      n'importe qui se paierait cinq cents Montpellois en forgeant
//      une requête.
//   4. `crediter` pose les pièces dans la bourse sous la clé
//      `stripe_<session>`. Stripe rejoue ses webhooks, et cette clé
//      fait que le second passage ne paie rien.
//
// Le PRIX et le NOMBRE de pièces vivent ici et nulle part ailleurs. La
// table de src/firebase/montpellois.ts n'en est que le miroir
// d'affichage : une retouche se fait des deux côtés, sinon la boutique
// annonce un prix que la caisse ne demande pas.
//
// Secrets à poser avant le déploiement (une seule fois) :
//   firebase functions:secrets:set STRIPE_SECRET_KEY
//   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
const Stripe = require('stripe');
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

/** Les lots vendus, montants en cents canadiens. */
const PACKS_MONTPELLOIS = {
  p100: { cad: 500, montpellois: 100 },
  p300: { cad: 1000, montpellois: 300 },
  p500: { cad: 1500, montpellois: 500 },
};

const RETOUR_BOUTIQUE = 'https://www.festivalmedievaldemontpellier.org/boutique';

exports.acheterMontpelloisLien = onCall(
  { region: 'us-central1', secrets: [STRIPE_SECRET_KEY] },
  async (requete) => {
    const uid = requete.auth && requete.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Connectez-vous pour recharger votre bourse.');
    const packId = String((requete.data || {}).packId || '');
    const pack = PACKS_MONTPELLOIS[packId];
    if (!pack) throw new HttpsError('invalid-argument', 'Ce lot de Montpellois n’existe pas.');
    // Tant que la clé n'est pas posée, la boutique le dit poliment
    // plutôt que de rendre une erreur de serveur.
    const cleStripe = STRIPE_SECRET_KEY.value();
    // Une vraie clé commence par sk_ ou rk_ : le jeton d'attente posé
    // pour permettre le déploiement ne compte pas comme une clé.
    if (!cleStripe || !/^(sk|rk)_/.test(cleStripe)) throw new HttpsError('failed-precondition', 'La recharge arrive bientôt.');

    let session;
    try {
      session = await Stripe(cleStripe).checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'cad',
            unit_amount: pack.cad,
            product_data: { name: `${pack.montpellois} Montpellois` },
          },
        }],
        // L'uid voyage dans les métadonnées : le webhook n'a que ça
        // pour savoir quelle bourse remplir. `entite` sépare la
        // comptabilité : la caisse Stripe est celle du Salon des
        // Inconnus, et ces encaissements-ci appartiennent au festival.
        metadata: { uid, packId, entite: 'fmm' },
        // La métadonnée de la session ne suit pas jusqu'au paiement, et
        // c'est le paiement que lit l'export comptable. Elle se repose
        // donc sur le paiement lui-même.
        payment_intent_data: { metadata: { uid, packId, entite: 'fmm' } },
        client_reference_id: uid,
        success_url: `${RETOUR_BOUTIQUE}?recharge=ok`,
        cancel_url: `${RETOUR_BOUTIQUE}?recharge=annulee`,
      });
    } catch (e) {
      logger.error('[stripe] session refusée', e);
      throw new HttpsError('internal', 'Le paiement est indisponible pour le moment.');
    }
    if (!session || !session.url) {
      logger.error('[stripe] session sans adresse', { packId });
      throw new HttpsError('internal', 'Le paiement est indisponible pour le moment.');
    }
    logger.info('[stripe] session ouverte', { uid, packId, sessionId: session.id });
    return { url: session.url };
  },
);

exports.stripeMontpellois = onRequest(
  {
    region: 'us-central1',
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('POST seulement'); return; }

    let evenement;
    try {
      // La vérification tient sur le corps BRUT : req.body a déjà été
      // relu par le cadre, et son sérialisé ne signe plus pareil.
      evenement = Stripe(STRIPE_SECRET_KEY.value() || 'sk_absente').webhooks.constructEvent(
        req.rawBody,
        req.get('stripe-signature'),
        STRIPE_WEBHOOK_SECRET.value(),
      );
    } catch (e) {
      logger.warn('[stripe] signature invalide, requête rejetée', e && e.message);
      res.status(400).send('signature invalide');
      return;
    }

    if (evenement.type !== 'checkout.session.completed') {
      res.status(200).send('événement ignoré');
      return;
    }
    const session = (evenement.data && evenement.data.object) || {};
    if (session.payment_status !== 'paid') {
      logger.info('[stripe] session non réglée', { sessionId: session.id, statut: session.payment_status });
      res.status(200).send('paiement non réglé');
      return;
    }

    const uid = String((session.metadata && session.metadata.uid) || '').slice(0, 128);
    const packId = String((session.metadata && session.metadata.packId) || '');
    const pack = PACKS_MONTPELLOIS[packId];
    if (!uid || !pack) {
      logger.warn('[stripe] session sans compte ni lot connu', { sessionId: session.id, uid, packId });
      res.status(200).send('rien à créditer');
      return;
    }

    try {
      // La clé de session absorbe les rejeux : crediter rend null quand
      // ce paiement a déjà rempli la bourse.
      const solde = await crediter(uid, pack.montpellois, `stripe_${session.id}`);
      logger.info('[stripe] bourse rechargée', {
        uid, packId, montpellois: pack.montpellois, sessionId: session.id,
        rejeu: solde === null, solde,
      });
      res.status(200).send(solde === null ? 'déjà crédité' : 'crédité');
    } catch (e) {
      // Un 500 laisse Stripe réessayer, et la clé empêchera le double crédit.
      logger.error('[stripe] crédit impossible', e);
      res.status(500).send('crédit impossible');
    }
  },
);
