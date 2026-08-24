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
          description: `Banquet de l'Équinoxe · ${places} place${places > 1 ? 's' : ''} · FMM 2026`
            + ` · compte ${uid}${courrielAcheteur ? ` · ${courrielAcheteur}` : ''}`
            + `${nomAcheteur ? ` · ${nomAcheteur}` : ''}`,
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

exports.envoyerCampagne = onCall(
  {
    region: 'us-central1',
    secrets: [ZOHO_APP_PASSWORD, CAMPAGNE_CLE],
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
    const sujet = String(d.sujet || '').trim().slice(0, SUJET_MAX);
    const html = String(d.html || '');
    const texte = String(d.texte || '');

    if (!sujet) throw new HttpsError('invalid-argument', 'La lettre n’a pas d’objet.');
    if (!html || !texte) throw new HttpsError('invalid-argument', 'La lettre est vide.');
    if (html.length > CORPS_MAX || texte.length > CORPS_MAX) {
      throw new HttpsError('invalid-argument', 'La lettre dépasse la taille permise.');
    }
    // Le garde-fou qui compte le plus : une campagne sans lien de
    // désabonnement est illégale au Canada (LCAP) et fait basculer le
    // domaine du festival en pourriel chez Gmail. Rien ne part sans lui,
    // dans les deux versions de la lettre.
    if (!html.includes(JETON_DESABONNEMENT) || !texte.includes(JETON_DESABONNEMENT)) {
      throw new HttpsError(
        'invalid-argument',
        'La lettre n’a pas de lien de désabonnement.',
      );
    }

    const cle = CAMPAGNE_CLE.value();

    const transport = nodemailer.createTransport({
      host: ZOHO_SMTP_HOST,
      port: 465,
      secure: true,
      auth: { user: ZOHO_EMAIL, pass: ZOHO_APP_PASSWORD.value() },
      // Le rythme : deux connexions, cinquante messages par connexion
      // avant renouvellement, quatre messages par seconde au plus.
      pool: true,
      maxConnections: 2,
      maxMessages: 50,
      rateDelta: 1000,
      rateLimit: 4,
    });

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
          html: personnaliser(html, auth.token.name || '', lien, true),
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

    let envoyes = 0;
    let echecs = 0;
    const adressesEchouees = [];

    try {
      for (let i = 0; i < vises.length; i += LOT_CAMPAGNE) {
        const lot = vises.slice(i, i + LOT_CAMPAGNE);
        const resultats = await Promise.allSettled(
          lot.map((personne) => {
            const lien = lienDesabonnement(personne.courriel, cle);
            return transport.sendMail({
              from: FROM,
              // Une seule adresse, celle de la personne. Jamais de cc,
              // jamais de bcc, jamais de liste.
              to: personne.courriel,
              subject: sujet,
              text: personnaliser(texte, personne.nom, lien, false),
              html: personnaliser(html, personne.nom, lien, true),
              headers: {
                // Le désabonnement d'un seul geste, depuis le bandeau
                // du client de courriel. Gmail l'exige des expéditeurs
                // en nombre depuis 2024, et son absence coûte cher en
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

        // L'avancement, lot par lot : la page le lit en direct.
        await trace.update({ envoyes, echecs });
      }
    } catch (err) {
      logger.error('[campagne] envoi interrompu', { campagne: trace.id, envoyes, echecs, err });
      await trace.update({
        statut: 'échoué',
        envoyes,
        echecs,
        adressesEchouees,
        erreur: String((err && err.message) || err),
      });
      throw new HttpsError('internal', `L’envoi s’est arrêté après ${envoyes} courriels.`);
    } finally {
      transport.close();
    }

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
