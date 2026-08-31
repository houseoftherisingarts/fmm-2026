# La Mérelle · ce qu'il reste à brancher

Le jeu est complet et se compile. Rien en dehors de `src/games/merelle/` n'a
été touché : les quatre gestes ci-dessous sont pour le chef.

---

## 1. Les deux routes, dans `src/App.tsx`

Avec les autres jeux, vers la ligne 90 :

```tsx
const MerelleGame              = lazy(() => import('./games/merelle'));
```

Dans le bloc des `<Route>`, avec les six autres jeux (vers la ligne 483) :

```tsx
<Route path="/jeux/merelle"         element={<PorteDuJeu><MerelleGame /></PorteDuJeu>} />
<Route path="/en/games/merelle"     element={<PorteDuJeu><MerelleGame /></PorteDuJeu>} />
```

Et dans la liste `SANS_PIED` (vers la ligne 279), pour que le pied de page
ne se dresse pas sous la table :

```tsx
'/jeux/merelle', '/en/games/merelle',
```

## 2. L'entrée `seigneur`, dans `src/pages/JeuxEnLignePage.tsx`

Dans `ANNEES`, remplacer l'entrée existante (vers la ligne 35) par :

```tsx
{
  id: 'seigneur',
  chiffre: 'II',
  nomFR: 'L’année du Seigneur', nomEN: 'The Year of the Lord',
  texteFR: 'Le seigneur prend sa dîme, tient son donjon et fait asseoir ses gens à la table haute. Le jeu de cette année-là se prépare.',
  texteEN: 'The lord takes his tithe, holds his keep and seats his people at the high table. That year’s game is in the making.',
  jeuFR: 'La Mérelle', jeuEN: 'Nine Men’s Morris',
  image: '/jeux/tuile-merelle.webp',
  href: { fr: '/jeux/merelle', en: '/en/games/merelle' },
},
```

Le texte `texteFR` / `texteEN` se termine sur « le jeu se prépare » : à
réécrire une fois le jeu en ligne, puisqu'il ne se prépare plus.

## 3. L'image `/jeux/tuile-merelle.webp`

Elle sert à trois endroits et n'existe pas encore : l'orbe du hero
(`orbImage` dans `index.tsx`), le fond flouté derrière l'écran de
préparation, et la vignette de la table des jeux.

## 4. Les badges, dans `src/firebase/badges.ts` et `BadgesContext.tsx`

Deux identifiants sont appelés par la page et n'existent pas encore. Tant
qu'ils manquent, `gagnerBadge` sort sans rien faire : aucune casse, mais
aucun badge non plus.

Dans la collection `joueur` de `src/firebase/badges.ts`, à côté de `tafl`,
`tarot` et `des` :

```ts
{ id: 'merelle', glyphe: '⊞', nomFR: 'Meunier',  nomEN: 'Miller',
  /* … même forme que les voisins : texteFR, texteEN, etc. */ },
{ id: 'merelle-victoire', glyphe: '⊟', nomFR: 'Trois d’affilée', nomEN: 'Three in a row',
  /* … */ },
```

Dans `src/contexts/BadgesContext.tsx`, élargir l'union de `useBadgeJeu` :

```ts
export function useBadgeJeu(jeu: 'tafl' | 'tarot' | 'des' | 'merelle') {
```

et, si la mérelle doit compter dans le badge `joueur`, ajouter `'merelle'`
au tableau `['tafl', 'tarot', 'des']` de la dernière ligne. Attention : les
comptes déjà ouverts qui ont fait les trois premiers jeux perdraient alors
leur badge tant qu'ils n'auront pas joué à la mérelle. À trancher par Alex.

Une fois l'union élargie, retirer le transtypage dans `index.tsx` :

```tsx
useBadgeJeu('merelle' as unknown as 'des');   // devient useBadgeJeu('merelle')
```

## 5. La pub, dans `src/components/jeux/PubDebutPartie.tsx`

Même histoire : le champ `jeu` est typé `'des' | 'hnefatafl' | 'tarot'`.
Ajouter `| 'merelle'` à l'union, puis retirer le transtypage dans
`index.tsx` :

```tsx
jeu={'merelle' as unknown as 'des'}   // devient jeu="merelle"
```

Le compteur Firestore (`bumpPubJeuxView`) prend déjà une chaîne libre : la
répartition par jeu dans l'admin fonctionne dès maintenant, le
transtypage ne fausse rien.

---

## Ce qui est vérifié

- `npx tsc -b --noEmit` : rien à signaler dans `src/games/merelle/`. Le
  dépôt sort quinze erreurs dans `src/components/compte/Coffre.tsx`
  (`chancesWJW`, `jeuOuvert`, `choixJeu`, `equiperPlateau`,
  `equiperPieces` introuvables) : elles préexistent à ce travail et
  appartiennent à un chantier ouvert ailleurs.
- `npx tsx src/games/merelle/logic.test.ts` : vingt et un essais passés.
  Ils couvrent la géométrie du plateau, le moulin, le pion protégé, le vol
  à trois pions, le blocage, les deux façons de perdre, et l'ordinateur.
- Rendu 3D vérifié en Playwright headless (SwiftShader), en 1280 × 800 et
  en 390 × 760 : le plateau tient dans le cadre dans les deux formats,
  aucune erreur de console, et l'aller-retour point → écran → point est
  exact sur les vingt-quatre points.

## Ce qui reste ouvert, volontairement

- **Pas de mode en ligne.** Ni `jeuDefiable.ts`, ni `PanneauAmis`, ni
  document Firestore. Le hnefatafl et les dés les portent, la mérelle non,
  comme demandé.
- **Pas de coffre d'apparences.** Un seul jeu de pions, deux teintes. Si
  la mérelle doit entrer dans la boutique, la voie est la même qu'au
  hnefatafl : un `assets.ts` local et les teintes lues dans `scene.ts`
  (constante `TEINTES`).
- **Le minimax n'a ni table de transposition ni tri des coups.** Profondeur
  3 pendant la pose, 4 en déplacement, ce qui reste sous la barre des
  100 ms. Si « Difficile » paraît mou, la première marche est d'ordonner
  les coups par évaluation immédiate avant de descendre (noté en
  commentaire `ponytail:` dans `cpu.ts`).
