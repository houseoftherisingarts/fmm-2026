# Chantier des jeux — septembre 2026

Document de coordination. Il dit ce qui se construit, qui touche quoi, et
les décisions déjà prises. **À lire en entier avant d'écrire une ligne.**

Alex, 2026-09-01 : « L'IA qui contrôle les jeux est vraiment très
mauvaise. » Deux plaies nommées : des coups mauvais, et les oies du
Renard qui se cachent dans un coin, n'essaient même plus de gagner et
bloquent la partie pour ne pas perdre. Deux chantiers : l'adversaire, et
la recherche de partie en temps réel.

## 1. Le moteur commun (déjà écrit, ne pas récrire)

`src/games/moteur/` porte la recherche partagée par les trois plateaux.

| Fichier | Ce qu'il donne |
|---|---|
| `types.ts` | `Adaptateur<E,C>` : le contrat qu'un jeu remplit. `MAT`. |
| `recherche.ts` | `chercher(adaptateur, etat, options)` : negamax, alpha-bêta, table de transposition, approfondissement progressif, quiescence, coups tueurs. |
| `niveaux.ts` | `NIVEAUX` (dix marches nommées), `choisirAuNiveau(...)`, `reflechir(...)`, `nomNiveau(n, fr)`. |
| `hasard.ts` | `graine(n)` : un hasard qui se rejoue, pour le banc d'essai. |

**Convention negamax, à ne jamais oublier** : tout se compte du point de
vue du joueur qui a le trait. `evaluer` rend une note positive quand la
position est bonne pour celui qui doit jouer, `fini` rend `1` quand
CELUI QUI A LE TRAIT a gagné, `-1` quand il a perdu, `0` pour une nulle.
Un adaptateur qui se trompe de signe fait jouer la machine contre
elle-même, et cela ne se voit qu'au banc d'essai.

`cle(e)` doit inclure le trait ET les compteurs de règle (voir plus
bas) : deux positions identiques dont l'une est à un coup de la règle de
la basse-cour ne valent pas la même chose.

## 2. Les règles anti-blocage — un arbitre par jeu

Décision d'architecture : **`logic.ts` / `gameLogic.ts` ne changent
pas** (les parties en ligne rejouent la liste des coups avec ces
fonctions, et les tests existants doivent continuer de passer). Chaque
jeu reçoit un fichier neuf, `arbitre.ts`, qui empile la règle
anti-blocage par-dessus la règle du jeu.

L'arbitre est PUR et DÉTERMINISTE : les deux joueurs d'une partie en
ligne rejouent la même liste de coups et doivent tomber sur exactement
le même verdict, sans horloge, sans hasard, sans `Math.random`.

### Le Renard et les Oies — la règle de la basse-cour

Le vrai défaut : les oies se serrent dans un bras de la croix où le
renard ne peut pas sauter, et attendent. Elles ne gagnent pas, elles
empêchent de perdre.

Règle ajoutée, à écrire dans `src/games/renard/arbitre.ts` :

- L'**avance** du troupeau vaut la somme de `6 - rangée` sur toutes les
  oies. Elle monte quand les oies montent vers la tanière.
- L'arbitre garde le **record d'avance** de la partie. Un coup d'oie qui
  ne bat pas le record incrémente `sansProgres`. Une prise du renard, ou
  un record battu, remet le compteur à zéro.
- À **12 coups d'oies sans progrès**, la traînarde meurt : l'oie la plus
  basse (rangée la plus grande, puis le plus grand numéro de point pour
  départager) quitte le plateau, et le compteur repart à zéro.
- Le renard gagne toujours au seuil de la variante (5 oies ou moins) :
  une bande qui campe finit donc mangée, en une dizaine de coups.
- Répétition triple de la position (plateau + trait) : nulle.
- Plafond dur de 400 demi-coups : nulle.

Le verdict gagne `'nulle'`. Les textes à l'écran (FR et EN) disent ce
qui vient d'arriver : « La traînarde s'est fait croquer. » / « The
straggler was snapped up. »

### La Mérelle

- 50 demi-coups sans retrait ni pose : nulle.
- Répétition triple : nulle.
- `Etat` n'est pas touché; l'arbitre garde les compteurs à côté.

### Le Hnefatafl

- Répétition triple d'une position : le camp qui la provoque PERD
  (règle de Copenhague sur la répétition perpétuelle).
- 120 demi-coups sans prise : nulle.

## 3. Les dix niveaux

`choisirAuNiveau(adaptateur, etat, niveau, { alea, livre })` fait tout.
La faiblesse d'un petit niveau vient de la FENÊTRE (il pioche parmi les
coups proches du meilleur) et de la BÉVUE (une part de coups au hasard),
jamais d'une recherche cassée. Le niveau 10 n'a ni l'une ni l'autre.

Chaque jeu expose `adaptateur(...)` depuis son `cpu.ts` : le banc
d'essai, le travailleur et la page de jeu s'en servent tous les trois.

Les anciennes signatures (`choisirCoup`, `pickMove`, `evaluer`) restent
exportées et branchées sur le nouveau moteur : les tests et les pages
existantes ne cassent pas pendant le chantier.

## 4. Le banc d'essai

`tools/arene.ts`, lancé par `npm run arene`. Il joue au moins mille
parties, avec graine fixe, et rend un rapport chiffré :

- taux de victoire par camp, par variante et par couple de niveaux;
- longueur moyenne et longueur maximale;
- **pathologies** comptées : blocages (partie coupée par le plafond),
  répétitions, oies punies, coups perdants joués alors qu'un coup
  gagnant existait (bévue mesurée), temps de réflexion par coup.
- une échelle de force : le niveau 10 doit battre le niveau 5 dans plus
  de 90 % des parties, et le niveau 1 doit perdre contre le niveau 3.

Rapport écrit dans `docs/rapport-arene.md`.

Les fichiers TypeScript se lancent au terminal par esbuild, déjà
installé : `npx esbuild <fichier>.ts --bundle --platform=node
--format=esm --outfile=<sortie>.mjs && node <sortie>.mjs`.

## 5. La table ouverte (le multijoueur)

Aujourd'hui : on ne peut que défier un ami nommé, ou coller un lien.
Demain :

1. **Chercher un adversaire.** Un bouton, et le site cherche une
   chambre ouverte pour ce jeu. S'il en trouve une, il s'y assoit.
   Sinon il en ouvre une et attend.
2. **Soixante secondes.** Personne ne vient : la partie commence
   CONTRE L'ORDINATEUR, au niveau 10, sous un nom tiré au sort. Rien à
   demander au joueur, la partie part toute seule.
3. **Les chambres ouvertes se listent** : n'importe qui prend le siège.
4. **Un clavardage** vit à côté du plateau pendant toute la partie.

Réemploi, pas de collection neuve : une chambre est un document
`taflParties` (ou `desParties`) au statut `lobby` avec `public: true`.
Le lobby, les règles de sécurité et la prise de siège existent déjà.

## 6. Les règles de la maison

- Fichiers sous 500 lignes. Un fichier qui gonfle se coupe en deux.
- Commentaires en français, dans la voix du dépôt : des phrases
  entières qui disent POURQUOI, jamais un résumé de la ligne d'en
  dessous.
- **Jamais de tiret cadratin.** Jamais de phrase-liste faite de
  fragments empilés en virgules.
- Tout texte à l'écran existe en FR et en EN, dans le même patron que
  les pages voisines (`const FR = {...}` / `const EN = {...}`).
- Aucun `Math.random` dans ce qui doit se rejouer à l'identique.
- `npm run typecheck` passe avant de rendre.
