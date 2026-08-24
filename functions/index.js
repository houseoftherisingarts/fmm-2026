/**
 * Fonctions du Festival Médiéval de Montpellier.
 *
 * Livraison du Grimoire (Alex, 2026-08-22) : quand quelqu'un achète le
 * livre de recettes par le lien Square, il doit recevoir le PDF par
 * courriel, sans intervention humaine.
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
// Le nom de l'article dans Square. Toute commande qui ne le contient pas
// n'est pas le livre de recettes : rien ne part par la poste.
// Le fichier et la clé gardent le mot « grimoire », qui était l'ancien
// nom du livre; seul le texte lu par les gens a changé (Alex, 2026-08-23).
const ARTICLE = 'grimoire';
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

Merci d'avoir acheté le Grimoire du Festival. Il est en pièce jointe, en format PDF : vingt-sept recettes de la cuisine du festival, du pain viking à l'hypocras, telles qu'elles sortent des marmites.

Les quantités sont celles des vraies marmites, celles qui nourrissent cinquante personnes. Divisez par dix pour une tablée, et goûtez souvent.

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
      if (!articles.includes(ARTICLE)) {
        await ref.set({ statut: 'ignoré', articles }, { merge: true });
        return res.status(200).send('pas un grimoire');
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
        subject: 'Votre Grimoire du Festival',
        text: CORPS_FR(nom),
        attachments: [
          { filename: 'Grimoire-du-Festival-FMM-2026.pdf', content: fs.createReadStream(PDF) },
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
      // On n'accepte de renvoyer l'acheteur que chez nous.
      // Nos domaines, www compris : sans le www, l'acheteur qui vient de
      // payer était renvoyé ailleurs que chez lui.
      const NOTRE_MAISON = /^https:\/\/(www\.)?(festivalmedieval\.(web\.app|firebaseapp\.com)|festivalmedievaldemontpellier\.(org|com))(\/|$)/;
      const retourSur = NOTRE_MAISON.test(retour)
        ? retour
        : 'https://festivalmedieval.web.app/marche';

      const reponse = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
        method: 'POST',
        headers: {
          'Square-Version': '2025-01-23',
          Authorization: `Bearer ${SQUARE_ACCESS_TOKEN.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          description: `Banquet de l'Équinoxe · ${places} place${places > 1 ? 's' : ''} · FMM 2026`,
          order: {
            location_id: LOCATION_FMM,
            line_items: [
              {
                name: 'Banquet de l’Équinoxe · FMM 2026',
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
