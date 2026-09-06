// ─── Le banc d'essai de la monnaie des guildes ──────────────────────
// Même patron que src/games/des/cpu.test.ts : pas de cadre de test, un
// fichier qui s'exécute et des assertions.
//
//   npx esbuild src/firebase/guildeMonnaie.test.ts --bundle --platform=browser \
//     --format=esm --external:node:assert --define:import.meta.env='{}' \
//     --outfile=/tmp/guilde-monnaie.mjs && node /tmp/guilde-monnaie.mjs
//
// La plateforme reste « browser » : c'est là que ce code tourne pour de
// vrai, et le build node du SDK Firebase traînerait grpc derrière lui.
//
// Il couvre ce qui casse vraiment quand on y touche : la formule du
// taux (qui doit rester la jumelle exacte de celle du serveur), le
// plafond du jour, l'arithmétique du change telle que l'aperçu la
// montre, et la fabrique d'adresses.

import assert from 'node:assert/strict';
import {
  tauxPour, resteAChanger, FRAIS_CHANGE, PLAFOND_CHANGE_JOUR,
} from './guildeMonnaie';
import { slugDeGuilde, nomMonnaie, formatPieces, SLUGS_RESERVES } from './guildes';

let essais = 0;
const essai = (nom: string, fn: () => void) => { fn(); essais += 1; console.log(`  ✓ ${nom}`); };

// ── Le taux ─────────────────────────────────────────────────────────
essai('les trois ancres du contrat tombent juste', () => {
  assert.equal(tauxPour(10), 0.5);
  assert.equal(tauxPour(40), 1);
  assert.equal(tauxPour(160), 2);
});

essai('le taux reste borné entre un demi et deux', () => {
  assert.equal(tauxPour(0), 0.5);
  assert.equal(tauxPour(1), 0.5);
  assert.equal(tauxPour(10000), 2);
  assert.equal(tauxPour(-5), 0.5);
});

essai('le taux monte avec le nombre d’actifs', () => {
  for (let n = 10; n < 160; n += 7) {
    assert.ok(tauxPour(n + 7) >= tauxPour(n), `le taux recule entre ${n} et ${n + 7}`);
  }
});

essai('le taux est arrondi à trois décimales', () => {
  const t = tauxPour(23);
  assert.equal(t, Math.round(t * 1000) / 1000);
});

// ── Le plafond du jour ──────────────────────────────────────────────
const jourCourant = new Date().toISOString().slice(0, 10);

essai('une bourse neuve a tout son plafond', () => {
  assert.equal(resteAChanger(null), PLAFOND_CHANGE_JOUR);
  assert.equal(resteAChanger({ solde: 0, gagne: 0, depense: 0 }), PLAFOND_CHANGE_JOUR);
});

essai('le compteur de la veille ne compte plus', () => {
  const b = { solde: 0, gagne: 0, depense: 0, changeJour: '2020-01-01', changeCumul: 200 };
  assert.equal(resteAChanger(b), PLAFOND_CHANGE_JOUR);
});

essai('le compteur du jour se retranche, sans jamais passer sous zéro', () => {
  assert.equal(
    resteAChanger({ solde: 0, gagne: 0, depense: 0, changeJour: jourCourant, changeCumul: 60 }),
    PLAFOND_CHANGE_JOUR - 60,
  );
  assert.equal(
    resteAChanger({ solde: 0, gagne: 0, depense: 0, changeJour: jourCourant, changeCumul: 999 }),
    0,
  );
});

// ── L'arithmétique du change ────────────────────────────────────────
// La jumelle de ce que le serveur applique, et de ce que l'aperçu du
// formulaire montre : pièces vers M, cinq pour cent au trésor puis
// arrondi vers le bas; M vers pièces, sans frais, arrondi vers le bas.
const piecesVersM = (montant: number, taux: number) => {
  const frais = Math.round(montant * FRAIS_CHANGE);
  return { frais, recu: Math.floor((montant - frais) * taux) };
};
const mVersPieces = (montant: number, taux: number) => Math.floor(montant / taux);

essai('cent pièces à parité laissent cinq au trésor', () => {
  assert.deepEqual(piecesVersM(100, 1), { frais: 5, recu: 95 });
});

essai('le change à un demi divise, l’arrondi va vers le bas', () => {
  assert.deepEqual(piecesVersM(100, 0.5), { frais: 5, recu: 47 });
  assert.deepEqual(piecesVersM(41, 0.5), { frais: 2, recu: 19 });
});

essai('le sens inverse ne prend rien et arrondit vers le bas', () => {
  assert.equal(mVersPieces(100, 0.5), 200);
  assert.equal(mVersPieces(7, 2), 3);
  assert.equal(mVersPieces(1, 2), 0);
});

essai('un montant qui ne rapporte rien se voit avant l’envoi', () => {
  assert.equal(piecesVersM(1, 0.5).recu, 0);
  assert.equal(mVersPieces(1, 2), 0);
});

// ── L'adresse du groupe ─────────────────────────────────────────────
essai('l’exemple du contrat tombe juste', () => {
  assert.equal(slugDeGuilde('Vestrvegir Vikingar', 'clan'), 'vestrvegirvikingarclan');
});

essai('les accents, les espaces et la ponctuation tombent', () => {
  assert.equal(slugDeGuilde('Confrérie de l’Épée', 'confrerie'), 'confreriedelepeeconfrerie');
  assert.equal(slugDeGuilde('  Les   Trois-Chênes  ', 'troupe'), 'lestroischenestroupe');
});

essai('une adresse sans nom garde au moins la forme', () => {
  assert.equal(slugDeGuilde('', undefined), 'guilde');
  assert.equal(slugDeGuilde('❦❦❦', 'ordre'), 'ordre');
});

essai('l’adresse ne dépasse jamais quatre-vingts caractères', () => {
  assert.ok(slugDeGuilde('a'.repeat(200), 'maisonnee').length <= 80);
});

essai('les adresses du festival sont réservées', () => {
  for (const reserve of ['guildes', 'boutique', 'en', 'admin', 'marche']) {
    assert.ok(SLUGS_RESERVES.includes(reserve), `${reserve} devrait être réservé`);
  }
});

// ── Le nom de la monnaie ────────────────────────────────────────────
essai('la monnaie par défaut prend le dernier mot du nom', () => {
  assert.equal(nomMonnaie({ nom: 'Vestrvegir Vikingar' }, 'EN'), 'Vikingar Coin');
  assert.equal(nomMonnaie({ nom: 'Vestrvegir Vikingar' }, 'FR'), 'Pièce Vikingar');
});

essai('une monnaie baptisée par les chefs se lit telle quelle', () => {
  const g = { nom: 'Peu importe', monnaie: { nom: 'Denier', sigle: 'DEN', glyphe: '✦' } };
  assert.equal(nomMonnaie(g, 'FR'), 'Denier');
  assert.equal(nomMonnaie(g, 'EN'), 'Denier');
});

essai('un montant porte le glyphe du groupe', () => {
  assert.equal(formatPieces(120, { monnaie: { nom: 'Denier', sigle: 'DEN', glyphe: '✦' } }), '120 ✦');
  assert.equal(formatPieces(0, {}), '0 ◎');
});

console.log(`\n${essais} essais passés.`);
