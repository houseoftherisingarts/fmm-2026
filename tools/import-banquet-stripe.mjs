import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Run with: node tools/import-banquet-stripe.mjs <file.csv>
// Le CSV doit avoir les colonnes "Customer Email", "Customer Name", et "Quantity" (ou similiaire)

// Initialiser Firebase (vous devez avoir le service account config ou l'environnement prêt)
// Si le service account n'est pas chargé, on va avertir.
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS non défini.");
  process.exit(1);
}

initializeApp({
  credential: cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')))
});

const db = getFirestore();

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.log("Usage: node import-banquet-stripe.mjs <stripe-export.csv>");
    process.exit(1);
  }
  
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  
  const emailIdx = headers.findIndex(h => h.includes('email'));
  const nameIdx = headers.findIndex(h => h.includes('name'));
  const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty') || h.includes('quantité'));
  
  if (emailIdx === -1) {
    console.error("Colonne email introuvable dans le CSV.");
    process.exit(1);
  }

  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = line.split(','); // Simplified CSV parse
    const email = cols[emailIdx].replace(/"/g, '').trim().toLowerCase();
    const name = nameIdx !== -1 ? cols[nameIdx].replace(/"/g, '').trim() : '';
    const qty = qtyIdx !== -1 ? parseInt(cols[qtyIdx].replace(/"/g, '').trim(), 10) : 1;
    
    if (email) {
      await db.collection('banquetTickets').doc(email).set({
        nom: name,
        places: isNaN(qty) ? 1 : qty,
        source: 'stripe',
        importeLe: new Date()
      }, { merge: true });
      console.log(`Importé : ${email} (${qty} places)`);
      count++;
    }
  }
  
  console.log(`Terminé. ${count} billets importés.`);
}

main().catch(console.error);
