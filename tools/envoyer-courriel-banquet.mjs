import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import 'dotenv/config'; // requires dotenv

// Script to send the banquet ticket retrieval email.
// Run with: node tools/envoyer-courriel-banquet.mjs "email@example.com" "Nom" "places"

const { ZOHO_APP_PASSWORD, ZOHO_SMTP_HOST } = process.env;

if (!ZOHO_APP_PASSWORD) {
  console.error("ZOHO_APP_PASSWORD is not set in environment.");
  process.exit(1);
}

const args = process.argv.slice(2);
const toEmail = args[0];
const nom = args[1] || '';

if (!toEmail) {
  console.error("Usage: node tools/envoyer-courriel-banquet.mjs <email> [nom]");
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host: ZOHO_SMTP_HOST || 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: 'admin@festivalmedievaldemontpellier.org',
    pass: ZOHO_APP_PASSWORD,
  },
});

const texte = `Bonjour${nom ? ' ' + nom : ''},

Votre place pour le banquet du Prince William est réservée.

Nous avons déposé un billet d'accès directement dans le coffre de votre Espace membre, sur le site du festival. C'est ce billet que vous présenterez à l'entrée du banquet le dimanche 27 septembre à 13h00. Notez que la présentation de votre reçu Stripe est aussi acceptée.

Pour récupérer votre billet, connectez-vous simplement avec cette adresse courriel sur :
https://www.festivalmedievaldemontpellier.org/compte

Au plaisir de vous voir à table,

L'équipe du Festival`;

async function main() {
  await transport.sendMail({
    from: '"Festival Médiéval de Montpellier" <admin@festivalmedievaldemontpellier.org>',
    to: toEmail,
    subject: 'Votre place au banquet du Prince William',
    text: texte,
  });
  console.log(`Courriel envoyé à ${toEmail}`);
}

main().catch(console.error);
