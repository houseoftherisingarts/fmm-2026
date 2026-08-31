# Brancher Le Renard et les Oies

Le jeu est complet et isolé dans `src/games/renard/`. Rien d'autre n'a été touché. Voici les cinq gestes qui restent, avec les lignes exactes.

## 1. `src/App.tsx` : l'import paresseux

À côté des trois autres jeux (aujourd'hui vers la ligne 88) :

```tsx
const RenardGame              = lazy(() => import('./games/renard'));
```

## 2. `src/App.tsx` : les deux routes

Dans le bloc des `<Route>` des jeux (aujourd'hui vers les lignes 478 à 483) :

```tsx
<Route path="/jeux/renard"          element={<PorteDuJeu><RenardGame /></PorteDuJeu>} />
<Route path="/en/games/fox-and-geese" element={<PorteDuJeu><RenardGame /></PorteDuJeu>} />
```

## 3. `src/App.tsx` : le tableau `SANS_PIED`

Le jeu prend l'écran d'un bord à l'autre, donc pas de pied de page dessous. Ajouter la ligne dans `SANS_PIED` (aujourd'hui vers la ligne 278) :

```tsx
  '/jeux/renard', '/en/games/fox-and-geese',
```

## 4. `src/pages/JeuxEnLignePage.tsx` : l'entrée `revolte`

Remplacer l'entrée actuelle (aujourd'hui les lignes 43 à 50) par celle-ci. Le texte cesse d'annoncer un jeu à venir et raconte celui qui est là.

```tsx
  {
    id: 'revolte',
    chiffre: 'III',
    nomFR: 'L’année de la Révolte paysanne', nomEN: 'The Year of the Peasants’ Revolt',
    texteFR: 'Une basse-cour n’a que le nombre pour se défendre. Les oies montent en bloc vers la tanière et cherchent à y coincer le renard, qui n’a besoin que d’un saut par-dessus l’une d’elles pour éclaircir le troupeau. Deux formes du jeu sont offertes, la plus ancienne à treize oies et la plus tardive à dix-sept, contre l’ordinateur ou à deux sur le même écran.',
    texteEN: 'A farmyard has nothing but numbers to defend itself. The geese climb together toward the den and try to pin the fox there, while the fox needs a single leap over one of them to thin the flock. Two forms of the game are offered, the older one with thirteen geese and the later one with seventeen, against the computer or with two players on one screen.',
    jeuFR: 'Le Renard et les Oies', jeuEN: 'Fox and Geese',
    image: '/jeux/tuile-renard.webp',
    href: { fr: '/jeux/renard', en: '/en/games/fox-and-geese' },
  },
```

## 5. L'image de la tuile

Le jeu appelle `/jeux/tuile-renard.webp` à deux endroits : l'orbe du hero (`orbImage` dans `src/games/renard/index.tsx`) et la carte de la table des jeux. Le fichier n'existe pas encore dans `public/jeux/`, c'est vous qui le fournissez.

---

## Ce que je n'ai pas modifié, et qui demande votre main

Trois unions de types n'acceptent pas encore l'identifiant `renard`. Le jeu tourne quand même, avec un transtypage commenté à chaque endroit, et la bonne valeur passe bien à l'exécution. Le jour où vous ouvrez ces trois portes, les transtypages sautent.

### `src/contexts/BadgesContext.tsx`, ligne 170

```tsx
export function useBadgeJeu(jeu: 'tafl' | 'tarot' | 'des' | 'renard') {
```

et, deux lignes plus bas, la table des jeux joués qui décerne le badge `joueur` :

```tsx
    if (['tafl', 'tarot', 'des', 'renard'].every((j) => joues.includes(j))) gagnerBadge('joueur');
```

Attention : ce second changement rend le badge `joueur` plus difficile à obtenir (quatre jeux au lieu de trois) et repousse d'autant les personnes qui l'ont déjà en cours. C'est votre appel, pas le mien. Sans ce changement, le premier suffit et le badge `joueur` continue de se gagner sur les trois jeux d'origine.

Dans `src/games/renard/index.tsx`, remplacer alors :

```tsx
  useBadgeJeu('renard' as unknown as 'tafl');
```

par

```tsx
  useBadgeJeu('renard');
```

### `src/components/jeux/PubDebutPartie.tsx`, ligne 24

```tsx
  jeu: 'des' | 'hnefatafl' | 'tarot' | 'renard';
```

Dans `src/games/renard/index.tsx`, remplacer alors `jeu={'renard' as unknown as 'des'}` par `jeu="renard"`.

### `src/firebase/badges.ts` : deux badges à créer

Le jeu appelle `useGagnerBadge('renard-victoire', ...)` quand la partie contre l'ordinateur est gagnée, et `useBadgeJeu('renard')` à l'ouverture. Aucun de ces deux identifiants n'existe dans le catalogue. Tant qu'ils n'y sont pas, `gagnerBadge` sort tout de suite et rien ne casse : le badge n'est simplement jamais décerné. Deux entrées à ajouter dans la collection `joueur` si vous les voulez :

- `renard`, le badge de visite du jeu, dans la même veine que `tafl`, `tarot` et `des`.
- `renard-victoire`, la victoire contre l'ordinateur, avec son sceau dans `public/badges/`.

Je ne les ai pas créés : le glyphe, le nom bilingue et le sceau sont des choix d'Alex, pas des miens.

---

## Vérifications faites

- `npx tsx "src/games/renard/logic.test.ts"` : 15 contrôles, tous verts, cinq exécutions de suite sans variation.
- `npx tsc -b --noEmit` : zéro erreur dans `src/games/renard/`. Le dépôt en compte 14 qui existaient avant ce chantier, toutes dans `src/components/compte/Coffre.tsx` (`chancesWJW`, `jeuOuvert`, `choixJeu`, `equiperPlateau`, `equiperPieces` introuvables, plus deux imports inutilisés). Ce fichier n'a pas été touché ici.

## Deux détails à trancher

- La musique du plateau réutilise `/audio/nordic-wist.mp3`, la piste du hnefatafl. Elle est déjà licenciée et gratuite, et l'attribution est portée par l'infobulle du bouton. Si vous voulez une piste propre au jeu, `Pippin the Hunchback` collerait mieux au registre paysan, mais elle se vend en Montpellois dans la boutique : je ne l'ai pas prise sans votre accord.
- Les oies ouvrent la partie. Aucune source consultée ne fixe qui commence; c'est le troupeau qui se met en marche et le renard qui réagit.
