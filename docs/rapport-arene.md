# Le banc d'essai des jeux

*Rapport généré par `tools/arene.ts` le 2026-09-01. Ce fichier est écrit par la machine et se refait à chaque `npm run arene`.*

Alex, le 2026-09-01 : « simule peut-être mille parties et vois les genres de choses qui font en sorte que le AI peut être un peu bizarre. » Voici ce que mille parties ont donné.

Le moteur a été corrigé deux fois le jour même. Les notes de racine se pèsent désormais à fenêtre pleine quand la marche en a besoin, la recherche se rabat sur l'évaluation statique quand l'horloge tombe avant la première profondeur, et les marches six à neuf ne tirent plus leur faiblesse d'une fenêtre mais de la profondeur. Ce rapport est la première mesure qui les juge. Il commence par un contrôle de l'instrument, parce que la première de ces deux corrections porte un défaut que rien ne montre encore à l'écran.

## Comment le banc a tourné

Le banc a joué 1198 parties de machine contre machine, en 22,6 minutes, sur une graine fixe. Relancé sans rien changer au moteur, il rend exactement les mêmes chiffres.

Chaque marche joue sous un plafond de nœuds, et non sous son horloge. C'est ce qui rend le banc reproductible : une horloge donne un résultat différent selon la charge de la machine, et deux tournois ne seraient plus comparables. Le temps de réflexion réel se mesure à part, plus bas, sans plafond.

| Marche | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Nœuds | 200 | 350 | 700 | 1 200 | 2 000 | 3 000 | 4 200 | 5 500 | 7 000 | 9 000 |

Le grand damier du hnefatafl coûte huit fois le nœud du Renard, parce qu'il relit cent vingt et une cases et dresse une centaine de coups à chaque nœud. Son budget est donc divisé par trois et un tiers. La comparaison de deux marches reste juste, puisqu'elle se fait toujours à l'intérieur d'une même table.

- Les couples qui font réfléchir un connétable coûtent dix fois le temps des autres. Ils sont donc joués sur 2 graines et les couples légers sur 3, ce qui donne 4 et 6 parties par table. Le couple du connétable contre lui-même en reçoit 12, parce que c'est lui qui porte le verdict sur l'équilibre des camps.
- La passe des bévues joue 40 parties de plus, arrêtées à cinquante demi-coups, et la passe du chronomètre 30 parties de trois demi-coups. Les dés portent le gros du volume, parce qu'une table de dés se joue en quelques millisecondes.

## Le contrôle du moteur

Le banc juge la machine avec le moteur de la machine. Il vérifie donc d'abord que ce moteur rend des notes qui veulent dire quelque chose, plutôt que de bâtir mille parties de statistiques sur une note qui vaut l'infini.

Le réglage `notesExactes` de `src/games/moteur/recherche.ts` demande la note juste de CHAQUE coup de la racine, et non seulement celle du meilleur. Ce sont les marches à fenêtre, de la première à la cinquième, qui en dépendent : sans lui, elles piochent au hasard parmi des coups qu'elles croient équivalents. Le tableau dit combien de coups reçoivent une note finie dans les deux mélanges possibles.

| Table | Fenêtre pleine, sans quiescence | Fenêtre pleine, avec quiescence |
|---|---|---|
| Renard et Oies · 13 oies | 9 sur 9 (profondeur 4) | 9 sur 9 (profondeur 4) |
| Renard et Oies · 17 oies | 11 sur 11 (profondeur 4) | 11 sur 11 (profondeur 4) |
| Mérelle · avec le vol | 20 sur 20 (profondeur 4) | 20 sur 20 (profondeur 4) |
| Mérelle · sans le vol | 20 sur 20 (profondeur 4) | 20 sur 20 (profondeur 4) |
| Hnefatafl · Copenhague | 115 sur 115 (profondeur 3) | 115 sur 115 (profondeur 2) |
| Hnefatafl · Fetlar | 115 sur 115 (profondeur 3) | 115 sur 115 (profondeur 2) |
| Hnefatafl · Tawlbwrdd | 115 sur 115 (profondeur 3) | 115 sur 115 (profondeur 2) |
| Hnefatafl · Brandubh | 40 sur 40 (profondeur 3) | 40 sur 40 (profondeur 3) |

## Ce que chaque table a donné

Les taux de victoire de cette colonne mélangent tous les couples de marches, y compris ceux qui opposent un connétable à un palefrenier. Ils ne disent donc rien de l'équilibre du jeu, seulement de la vie de la table. L'équilibre se lit plus bas, sur les parties à niveau égal.

| Table | Parties | Longueur moyenne | Longueur max | Victoires (ouvre / répond) | Nulles |
|---|---|---|---|---|---|
| Renard et Oies · 13 oies | 36 | 98,6 | 216 | 55,6 % / 41,7 % | 2,8 % |
| Renard et Oies · 17 oies | 36 | 95,9 | 211 | 58,3 % / 36,1 % | 5,6 % |
| Mérelle · avec le vol | 36 | 51,5 | 155 | 75,0 % / 25,0 % | 0,0 % |
| Mérelle · sans le vol | 36 | 46,3 | 78 | 75,0 % / 25,0 % | 0,0 % |
| Hnefatafl · Copenhague | 36 | 50,9 | 160 | 16,7 % / 83,3 % | 0,0 % |
| Hnefatafl · Fetlar | 36 | 54,7 | 184 | 25,0 % / 75,0 % | 0,0 % |
| Hnefatafl · Tawlbwrdd | 36 | 62,2 | 103 | 77,8 % / 22,2 % | 0,0 % |
| Hnefatafl · Brandubh | 36 | 22,3 | 56 | 30,6 % / 69,4 % | 0,0 % |

## L'équilibre des camps, à niveau égal

Deux connétables l'un contre l'autre, chaque partie sur sa propre graine. Un camp qui passe les trois quarts des parties est signalé.

| Table | Parties | Camp qui ouvre | Camp qui répond | Nulles | Verdict |
|---|---|---|---|---|---|
| Renard et Oies · 13 oies | 12 | 12 (oies) | 0 (renard) | 0 | **déséquilibré, oies** |
| Renard et Oies · 17 oies | 12 | 12 (oies) | 0 (renard) | 0 | **déséquilibré, oies** |
| Mérelle · avec le vol | 12 | 12 (chêne clair) | 0 (bois teint) | 0 | **déséquilibré, chêne clair** |
| Mérelle · sans le vol | 12 | 12 (chêne clair) | 0 (bois teint) | 0 | **déséquilibré, chêne clair** |
| Hnefatafl · Copenhague | 12 | 0 (assaillants) | 12 (défenseurs) | 0 | **déséquilibré, défenseurs** |
| Hnefatafl · Fetlar | 12 | 0 (assaillants) | 12 (défenseurs) | 0 | **déséquilibré, défenseurs** |
| Hnefatafl · Tawlbwrdd | 12 | 12 (assaillants) | 0 (défenseurs) | 0 | **déséquilibré, assaillants** |
| Hnefatafl · Brandubh | 12 | 0 (assaillants) | 12 (défenseurs) | 0 | **déséquilibré, défenseurs** |

## L'échelle de force, mesurée par paires

La méthode compte autant que le chiffre. Ces jeux sont déséquilibrés par camp : au Renard à treize oies, deux connétables donnent la victoire aux oies presque à tous les coups, ce qui est historiquement juste. Comparer deux marches en alternant les camps ne mesurerait donc que le déséquilibre du jeu.

Le banc joue chaque position deux fois, avec la même graine : une fois avec la marche forte du côté qui ouvre, une fois avec la marche faible à la même place. Les deux colonnes du milieu se lisent alors comme un duel honnête. La marche forte doit gagner au moins autant que la faible dans CHACUN des deux camps.

| Table | Couple | Parties | Victoires en ouvrant | Victoires en répondant | Nulles | Verdict |
|---|---|---|---|---|---|---|
| Renard et Oies · 13 oies | 3 contre 1 | 6 | 0 contre 0 (oies) | 2 contre 3 (renard) | 1 | **tient à moitié** |
| Renard et Oies · 13 oies | 5 contre 3 | 6 | 0 contre 0 (oies) | 3 contre 3 (renard) | 0 | tient |
| Renard et Oies · 13 oies | 8 contre 5 | 4 | 2 contre 0 (oies) | 2 contre 0 (renard) | 0 | tient |
| Renard et Oies · 13 oies | 10 contre 8 | 4 | 2 contre 2 (oies) | 0 contre 0 (renard) | 0 | tient |
| Renard et Oies · 13 oies | 10 contre 5 | 4 | 2 contre 0 (oies) | 2 contre 0 (renard) | 0 | tient |
| Renard et Oies · 17 oies | 3 contre 1 | 6 | 0 contre 0 (oies) | 3 contre 2 (renard) | 1 | tient |
| Renard et Oies · 17 oies | 5 contre 3 | 6 | 1 contre 0 (oies) | 3 contre 1 (renard) | 1 | tient |
| Renard et Oies · 17 oies | 8 contre 5 | 4 | 2 contre 0 (oies) | 2 contre 0 (renard) | 0 | tient |
| Renard et Oies · 17 oies | 10 contre 8 | 4 | 2 contre 2 (oies) | 0 contre 0 (renard) | 0 | tient |
| Renard et Oies · 17 oies | 10 contre 5 | 4 | 2 contre 0 (oies) | 2 contre 0 (renard) | 0 | tient |
| Mérelle · avec le vol | 3 contre 1 | 6 | 3 contre 2 (chêne clair) | 1 contre 0 (bois teint) | 0 | tient |
| Mérelle · avec le vol | 5 contre 3 | 6 | 3 contre 0 (chêne clair) | 3 contre 0 (bois teint) | 0 | tient |
| Mérelle · avec le vol | 8 contre 5 | 4 | 2 contre 0 (chêne clair) | 2 contre 0 (bois teint) | 0 | tient |
| Mérelle · avec le vol | 10 contre 8 | 4 | 2 contre 1 (chêne clair) | 1 contre 0 (bois teint) | 0 | tient |
| Mérelle · avec le vol | 10 contre 5 | 4 | 2 contre 0 (chêne clair) | 2 contre 0 (bois teint) | 0 | tient |
| Mérelle · sans le vol | 3 contre 1 | 6 | 3 contre 1 (chêne clair) | 2 contre 0 (bois teint) | 0 | tient |
| Mérelle · sans le vol | 5 contre 3 | 6 | 3 contre 0 (chêne clair) | 3 contre 0 (bois teint) | 0 | tient |
| Mérelle · sans le vol | 8 contre 5 | 4 | 2 contre 0 (chêne clair) | 2 contre 0 (bois teint) | 0 | tient |
| Mérelle · sans le vol | 10 contre 8 | 4 | 2 contre 2 (chêne clair) | 0 contre 0 (bois teint) | 0 | tient |
| Mérelle · sans le vol | 10 contre 5 | 4 | 2 contre 0 (chêne clair) | 2 contre 0 (bois teint) | 0 | tient |
| Hnefatafl · Copenhague | 3 contre 1 | 6 | 2 contre 0 (assaillants) | 3 contre 1 (défenseurs) | 0 | tient |
| Hnefatafl · Copenhague | 5 contre 3 | 6 | 1 contre 0 (assaillants) | 3 contre 2 (défenseurs) | 0 | tient |
| Hnefatafl · Copenhague | 8 contre 5 | 4 | 1 contre 0 (assaillants) | 2 contre 1 (défenseurs) | 0 | tient |
| Hnefatafl · Copenhague | 10 contre 8 | 4 | 0 contre 0 (assaillants) | 2 contre 2 (défenseurs) | 0 | tient |
| Hnefatafl · Copenhague | 10 contre 5 | 4 | 2 contre 0 (assaillants) | 2 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Fetlar | 3 contre 1 | 6 | 3 contre 0 (assaillants) | 3 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Fetlar | 5 contre 3 | 6 | 2 contre 0 (assaillants) | 3 contre 1 (défenseurs) | 0 | tient |
| Hnefatafl · Fetlar | 8 contre 5 | 4 | 1 contre 1 (assaillants) | 1 contre 1 (défenseurs) | 0 | tient |
| Hnefatafl · Fetlar | 10 contre 8 | 4 | 0 contre 0 (assaillants) | 2 contre 2 (défenseurs) | 0 | tient |
| Hnefatafl · Fetlar | 10 contre 5 | 4 | 2 contre 0 (assaillants) | 2 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Tawlbwrdd | 3 contre 1 | 6 | 3 contre 0 (assaillants) | 3 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Tawlbwrdd | 5 contre 3 | 6 | 3 contre 1 (assaillants) | 2 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Tawlbwrdd | 8 contre 5 | 4 | 2 contre 1 (assaillants) | 1 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Tawlbwrdd | 10 contre 8 | 4 | 2 contre 1 (assaillants) | 1 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Tawlbwrdd | 10 contre 5 | 4 | 2 contre 1 (assaillants) | 1 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Brandubh | 3 contre 1 | 6 | 3 contre 1 (assaillants) | 2 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Brandubh | 5 contre 3 | 6 | 3 contre 0 (assaillants) | 3 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Brandubh | 8 contre 5 | 4 | 2 contre 0 (assaillants) | 2 contre 0 (défenseurs) | 0 | tient |
| Hnefatafl · Brandubh | 10 contre 8 | 4 | 0 contre 0 (assaillants) | 2 contre 2 (défenseurs) | 0 | tient |
| Hnefatafl · Brandubh | 10 contre 5 | 4 | 2 contre 0 (assaillants) | 2 contre 0 (défenseurs) | 0 | tient |

L'échelle tient sur 39 des 40 couples mesurés. Ce qui flanche est nommé, avec ses chiffres, dans la dernière section.

## Les bévues, marche par marche

Tous les 7 demi-coups d'une passe réservée à cette mesure, le banc arrête la partie et la repèse avec une recherche de référence : profondeur 12, 40 000 nœuds et la quiescence. Le pas est impair pour que la mesure tombe alternativement sur l'un et l'autre camp. La perte du coup joué est la différence entre sa note et celle du meilleur coup, jamais négative. Une référence coupée avant sa deuxième profondeur est jetée sans être comptée : une recherche qui n'a pas vu la réponse de l'adversaire ne juge personne. La référence dispose de 4,4 fois le budget du connétable, et de bien davantage face aux marches basses.

La mesure coûte deux recherches et non une. Le moteur sait rendre la note de tous les coups de la racine d'un seul geste, par `notesExactes`, mais ce réglage mêlé à la quiescence ne donne que l'infini, comme le dit le contrôle plus haut. La référence pèse donc la position, puis repèse celle d'après quand le coup joué n'est pas celui qu'elle avait choisi, une marche moins profond pour que les deux notes se comparent.

Une bévue grave coûte plus d'un demi-point. Un renversement jette une position gagnante d'au moins une pièce dans une position perdue d'autant.

| Marche | Coups pesés | Perte moyenne (points) | Bévues graves | Renversements |
|---|---|---|---|---|
| 1 | 59 | 2,5 | 40 (67,8 %) | 4 (6,8 %) |
| 3 | 55 | 1,9 | 29 (52,7 %) | 1 (1,8 %) |
| 5 | 52 | 1,0 | 19 (36,5 %) | 1 (1,9 %) |
| 8 | 50 | 0,5 | 8 (16,0 %) | 1 (2,0 %) |
| 10 | 56 | 0,4 | 12 (21,4 %) | 1 (1,8 %) |

## Le temps de réflexion, sans plafond de nœuds

Cette passe joue quelques coups en laissant chaque marche prendre son propre temps, comme devant un joueur. Un filet de sûreté à 400 000 nœuds évite qu'une marche sans horloge ne bloque le banc, et il mord seulement là où le rapport le dit.

| Marche | Renard et Oies · 13 oies | Mérelle · avec le vol | Hnefatafl · Copenhague |
|---|---|---|---|
| 1 | 0,1 ms · max 0,2 ms | 0,2 ms · max 0,3 ms | 13 ms · max 17 ms |
| 2 | 0,1 ms · max 0,1 ms | 0,2 ms · max 0,2 ms | 12 ms · max 16 ms |
| 3 | 0,3 ms · max 0,5 ms | 2,1 ms · max 2,2 ms | 435 ms · max 465 ms |
| 4 | 0,3 ms · max 0,5 ms | 3,7 ms · max 5,8 ms | 401 ms · max 443 ms |
| 5 | 1,5 ms · max 2,1 ms | 28 ms · max 29 ms | 5,60 s · max 8,68 s |
| 6 | 2,3 ms · max 2,8 ms | 47 ms · max 62 ms | 379 ms · max 393 ms |
| 7 | 8,1 ms · max 11 ms | 235 ms · max 308 ms | 615 ms · max 616 ms |
| 8 | 20 ms · max 28 ms | 638 ms · max 681 ms | 1,02 s · max 1,02 s |
| 9 | 159 ms · max 243 ms | 1,60 s · max 1,60 s | 1,63 s · max 1,64 s |
| 10 | 1,89 s · max 2,14 s | 2,55 s · max 2,62 s | 2,65 s · max 2,69 s |

La promesse faite au joueur est une réponse en moins de 3 secondes.

## Les pathologies comptées

La cause de fin de chaque partie de plateau du tournoi, tous couples confondus. Le banc coupe une partie qui passe 500 demi-coups, par-dessus les plafonds que les arbitres portent déjà. Cette coupure-là est la pathologie qu'Alex a vue à l'écran : elle est arrivée 0 fois. Les arbitres ferment donc toutes leurs parties eux-mêmes, et la règle de la basse-cour, celle des cinquante demi-coups et celle de la répétition font chacune leur travail.

| Cause | Parties | Part |
|---|---|---|
| le roi a gagné le coin | 90 | 31,3 % |
| un camp est tombé à deux pions ou n’avait plus un coup | 72 | 25,0 % |
| les lances se sont refermées sur le roi | 51 | 17,7 % |
| le renard était enfermé | 41 | 14,2 % |
| le renard a croqué assez d’oies pour passer le seuil | 28 | 9,7 % |
| nulle, la même position pour la troisième fois | 3 | 1,0 % |
| l’anneau s’est fermé et le camp du roi ne respirait plus | 2 | 0,7 % |
| le camp au trait n’avait plus un seul coup | 1 | 0,3 % |

Ce que les arbitres ont eu à faire en cours de route. Une position répétée est comptée la deuxième fois qu'elle paraît, avant même qu'elle ne close quoi que ce soit : c'est le premier signe qu'un camp tourne en rond.

| Événement | Occurrences |
|---|---|
| une position est revenue une deuxième fois | 272 |
| la traînarde s’est fait croquer, règle de la basse-cour | 44 |

## Les dés du menteur

840 tables jouées, 10 839 manches en tout. Le règlement lance ses dés avec le hasard ordinaire du navigateur, que le banc remplace par la graine du moteur le temps d'une table, puis remet en place.

| Table | Parties | Manches par partie | Manches max | Pathologies |
|---|---|---|---|---|
| 2 joueurs | 420 | 6,9 | 12 | aucune |
| 5 joueurs | 420 | 18,9 | 26 | la table s’est fermée sans vainqueur : 236 |

### Le tempérament de chaque marche

| Marche | Sièges | Victoires | Annonces | Doutes | Compte exact | Annonces refusées |
|---|---|---|---|---|---|---|
| 1 | 245 | 2,0 % | 2301 | 270 (85,6 % justes) | 0 (0,0 % justes) | 0 |
| 3 | 490 | 21,2 % | 3780 | 1895 (82,2 % justes) | 0 (0,0 % justes) | 0 |
| 5 | 735 | 16,7 % | 5782 | 2373 (58,5 % justes) | 87 (34,5 % justes) | 0 |
| 8 | 490 | 23,9 % | 5142 | 1950 (49,8 % justes) | 42 (14,3 % justes) | 0 |
| 10 | 980 | 26,0 % | 14485 | 4120 (46,3 % justes) | 102 (9,8 % justes) | 0 |

### L'échelle de force aux dés

Les sièges alternent : une table porte la marche forte aux places paires, la table jumelle les inverse, à graine égale. Le siège zéro ouvre les annonces.

| Table | Couple | Tables | Victoires en ouvrant | Victoires en répondant | Sans vainqueur | Verdict |
|---|---|---|---|---|---|---|
| 2 joueurs | 3 contre 1 | 70 | 34 contre 1 | 34 contre 1 | 0 | tient |
| 2 joueurs | 5 contre 3 | 70 | 28 contre 4 | 31 contre 7 | 0 | tient |
| 2 joueurs | 8 contre 5 | 70 | 23 contre 5 | 30 contre 12 | 0 | tient |
| 2 joueurs | 10 contre 8 | 70 | 22 contre 11 | 24 contre 13 | 0 | tient |
| 2 joueurs | 10 contre 5 | 70 | 33 contre 8 | 27 contre 2 | 0 | tient |
| 5 joueurs | 3 contre 1 | 70 | 21 contre 1 | 2 contre 2 | 44 | tient |
| 5 joueurs | 5 contre 3 | 70 | 22 contre 2 | 3 contre 0 | 43 | tient |
| 5 joueurs | 8 contre 5 | 70 | 25 contre 7 | 4 contre 0 | 34 | tient |
| 5 joueurs | 10 contre 8 | 70 | 15 contre 7 | 1 contre 4 | 43 | **tient à moitié** |
| 5 joueurs | 10 contre 5 | 70 | 25 contre 4 | 4 contre 1 | 36 | tient |

## Ce qui reste bizarre

- **La marche 3 ne domine pas la marche 1 sur 1 table de 8.** Renard et Oies · 13 oies (0 contre 0 en ouvrant, 2 contre 3 en répondant). Réglage à revoir dans `src/games/moteur/niveaux.ts` : creuser l'écart de `fenetre` et de `bevue` entre les marches 1 et 3, ou donner une profondeur de plus à la marche 3.

- **8 tables penchent franchement d'un côté à niveau égal : Renard et Oies · 13 oies (oies, 100,0 %) ; Renard et Oies · 17 oies (oies, 100,0 %) ; Mérelle · avec le vol (chêne clair, 100,0 %) ; Mérelle · sans le vol (chêne clair, 100,0 %) ; Hnefatafl · Copenhague (défenseurs, 100,0 %) ; Hnefatafl · Fetlar (défenseurs, 100,0 %) ; Hnefatafl · Tawlbwrdd (assaillants, 100,0 %) ; Hnefatafl · Brandubh (défenseurs, 100,0 %).** Le jeu lui-même penche, et aucun réglage de marche n'y changera rien. Ce qui se règle, c'est le camp offert au joueur : lui donner le camp faible contre une marche haute, et le camp fort contre une marche basse, plutôt que de le laisser choisir à l'aveugle.

- **Aux dés, la marche 8 a crié « c'est exactement ça » 42 fois et n'a eu raison que 6 fois, soit 14,3 %.** Chaque appel manqué coûte un dé, et le règlement de la maison plafonne le gain à un dé repris. Le calcul de `evExact` dans `src/games/des/cpu.ts` ne choisit l'appel que lorsque le doute et la relance valent encore moins, ce qui revient à payer un dé pour éviter d'en payer un. Le seuil de `appelleExact` mérite d'être relevé, ou l'appel réservé aux positions où la probabilité exacte dépasse vraiment le coût.

- **Aux dés, la marche 10 a crié « c'est exactement ça » 102 fois et n'a eu raison que 10 fois, soit 9,8 %.** Chaque appel manqué coûte un dé, et le règlement de la maison plafonne le gain à un dé repris. Le calcul de `evExact` dans `src/games/des/cpu.ts` ne choisit l'appel que lorsque le doute et la relance valent encore moins, ce qui revient à payer un dé pour éviter d'en payer un. Le seuil de `appelleExact` mérite d'être relevé, ou l'appel réservé aux positions où la probabilité exacte dépasse vraiment le coût.

- **Aux dés, la marche 1 devine mieux le mensonge que la marche 10 : 85,6 % de doutes justes contre 46,3 %.** L'échelle de force n'en souffre pas, puisque la marche haute gagne quand même plus de tables : elle doute simplement beaucoup plus souvent, et un doute de plus se prend toujours sur les positions les moins claires. Cela reste à surveiller, parce qu'un connétable qui se trompe une fois sur deux en criant « menteur » a l'air bête devant un joueur, même quand il finit par gagner.

- **La marche 10 joue plus de mauvais coups que la marche 8 : 21,4 % de coups qui perdent plus d'un demi-point contre 16,0 %.** La perte moyenne, elle, continue de descendre (0,39 point contre 0,50), donc la marche haute se trompe un peu plus souvent mais moins gravement. L'écart tient peut-être dans le bruit de 56 mesures, et la façon de trancher est de relancer le banc avec une passe de bévues plus longue avant de toucher à quoi que ce soit.

- **Sans plafond de nœuds, la marche 5 met jusqu'à 8,68 s par coup sur Hnefatafl · Copenhague.** Les marches un à cinq n'ont pas de `tempsMs` dans `NIVEAUX`, donc rien ne les arrête avant le fond de leur profondeur. La page de jeu les borne aujourd'hui par un plafond de nœuds passé à la main, chaque jeu de son côté. Le réglage à faire est de donner un `tempsMs` aux marches un à cinq, court, de l'ordre de deux cents à six cents millisecondes.

- **236 tables de dés se sont fermées sans vainqueur.** La règle de la maison arrête la partie dès que le premier siège tombe, parce qu'un joueur humain ne regarde pas les autres finir sans lui. Entre machines, cela laisse des convives debout et personne de proclamé. La règle est juste devant un humain, et il faut seulement que le banc la connaisse.
