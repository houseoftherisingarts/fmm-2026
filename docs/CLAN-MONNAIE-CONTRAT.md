# Contrat : monnaie de groupe, salon, événements et marché des guildes (6 sept 2026)

Décision d'Alex. Tout agent qui travaille sur ce chantier lit ce fichier en premier et s'y tient. Les noms ci-dessous sont définitifs, côté serveur comme côté client.

## Vocabulaire
- Montpellois (M) = monnaie de base du site, `bourses/{uid}.solde`, écrite par `crediter/debiter` dans `functions/index.js`.
- Pièces de guilde = monnaie interne d'une guilde, valable seulement dans cette guilde.
- Chef = un uid dans `guildes/{id}.admins`. Le mot affiché dépend de `forme` : clan → Jarl, guilde → Maître, compagnie → Capitaine, confrérie → Prieur, troupe → Chef de troupe, maisonnée → Seigneur, ordre → Grand Maître (EN : Jarl, Master, Captain, Prior, Troupe leader, Lord, Grand Master).

## Schéma
`guildes/{id}` (existant + nouveaux champs) :
- `monnaie: { nom: string, sigle: string (2-4 lettres), glyphe: string (un emoji ou caractère) }` : défaut à la création = dernier mot du nom + « Coin » (FR affiche « Pièce » + nom), sigle = 3 premières lettres en majuscules, glyphe ◎. Modifiable par les chefs.
- `taux: number` (Montpellois pour 1 pièce), `nbActifs: number`, `tauxHistorique: Array<{ jour: 'AAAA-MM-JJ', taux: number, nbActifs: number }>` (30 derniers), `tresor: number` (pièces du trésor commun). SERVEUR SEULEMENT.
- `codeInvitation: string` (8 caractères, majuscules sans O/0/I/1), généré par le serveur à la création. Lisible par tout membre connecté (la fiche l'est déjà); les chefs peuvent demander un nouveau code (`guildeNouveauCode`).
- `membresFondateurs: Array<{ nom: string, chef: boolean, uid?: string }>` : les noms des fondateurs attendus (ceux qui n'ont pas encore de compte). Un chef peut rattacher un uid à un nom.

`guildes/{id}/bourses/{uid}` : `{ solde, gagne, depense, maj }` en pièces. SERVEUR SEULEMENT. Lecture : le membre lui-même, les chefs, l'équipe.
`guildes/{id}/registre/{txId}` : `{ type: 'entree'|'fondation'|'change'|'virement'|'tresor'|'souk'|'evenement', de?: uid|'tresor'|'monnaie', a?: uid|'tresor'|'monnaie', pieces?: number, montpellois?: number, taux?: number, note?: string, creeLe }`. SERVEUR SEULEMENT. Lecture : membres de la guilde.
`guildes/{id}/evenements/{evId}` : `{ titre, description, lieu, debut: Timestamp, fin: Timestamp, creePar, prixPieces?: number (0 = gratuit), rsvp: { [uid]: 'oui'|'non'|'peut-etre' }, nbOui, creeLe, maj }`. Création/modif/suppression : chefs (et équipe). RSVP : un membre ne touche que sa propre clé de `rsvp` (diff().affectedKeys hasOnly ['rsvp','maj'] + seule sa clé change). `nbOui` est recalculé par déclencheur serveur.
`guildes/{id}/clavardage/{msgId}` : `{ uid, nom, avatarUrl?, texte (1-500), creeLe }`. Création : membres de la guilde, `uid == auth.uid`. Suppression : l'auteur ou un chef. Pas de modification.
`souk/{objetId}` gagne `guildeId?: string` et `prixPieces?: number`. Une annonce avec `guildeId` ne paraît que dans le marché de cette guilde (page Souk publique : filtrer `guildeId` absent).
`membres/{uid}.vuLe: Timestamp` : écrit par le client au plus une fois par jour au chargement (propriétaire seulement). Sert à compter les actifs.
`mur/{postId}.guildeId` existe déjà (annonces de la guilde).

## Règles d'argent (serveur, `functions/guildes.js`, câblé par une ligne dans index.js)
- Fondation : à la création de `guildes/{id}`, `crediter(creePar, 10, 'guilde-fondee:'+id)` ; pièces : +100 au fondateur (registre `fondation`, id de doc `entree:{uid}` pour l'idempotence) ; `monnaie`, `codeInvitation`, `taux`, `nbActifs`, `tauxHistorique`, `tresor: 0` posés si absents. Un membre ne peut fonder qu'UNE guilde (la callable `guildeVerifierFondation` n'est pas nécessaire : le déclencheur refuse le bonus M si `bourses/{uid}.badgesCredites` contient déjà une clé `guilde-fondee:*`, et la règle client interdit la création si `guildesFondees >= 1` sur `membres/{uid}`; le déclencheur pose `membres/{uid}.guildesFondees` +1).
- Entrée : quand `membres[]` gagne un uid (accepté par un chef, ou `guildeRejoindreParCode`), `crediter(uid, 10, 'guilde-rejointe:'+id+':'+uid)` (jamais deux fois, même s'il part et revient) + 100 pièces si `registre/entree:{uid}` n'existe pas encore.
- Taux : `taux = clamp(0.5 * sqrt(nbActifs / 10), 0.5, 2)`, arrondi à 3 décimales. Actif = membre dont `membres/{uid}.vuLe` (ou à défaut `bourses/{uid}.maj`) date de moins de 30 jours. Recalculé par `guildeRecalculerTaux` (planifiée chaque nuit 4 h America/Toronto) et à chaque changement de `membres[]`. À 10 actifs : 0,5 (2 pièces = 1 M). À 40 : parité. À 160 : 2.
- Change (`guildeChanger({ guildeId, sens: 'piecesVersM' | 'mVersPieces', montant })`) : pièces → M au `taux` courant, 5 % des pièces vont au `tresor`, plafond 200 pièces par membre et par jour (compteur dans `bourses/{uid}` de la guilde : `changeJour: 'AAAA-MM-JJ', changeCumul`). M → pièces sans frais, même plafond en équivalent. Montants entiers, M arrondi vers le bas. Retour `{ soldeM, soldePieces, taux }`.
- Virement (`guildeVirement({ guildeId, aUid, montant, note? })`) : membre → membre de la même guilde, sans frais. Trésor (`guildeTresorVerser({ guildeId, aUid, montant, note? })`) : chef → membre, depuis `tresor`.
- Marché (`guildeAcheterAuSouk({ objetId })`) : l'objet doit porter `guildeId` et `prixPieces`; acheteur et vendeur membres de la guilde; pièces acheteur → vendeur en transaction; objet passe `statut: 'vendu'`. Réutilise le patron d'`acheterAuSouk` (ne pas modifier cette fonction).
- Événement payant : `guildeRsvpPayant({ guildeId, evId })` débite `prixPieces` vers `tresor` puis pose le rsvp `oui`. Les événements gratuits gardent le rsvp client direct.
- Entrée par code (`guildeRejoindreParCode({ code })`) : cherche `codeInvitation == code`, ajoute directement à `membres[]` (pas de file d'attente), rend `{ guildeId }`. `guildeNouveauCode({ guildeId })` : chef seulement.
- Fondateurs attendus : `guildeRattacherFondateur({ guildeId, nom, uid })` : chef seulement; pose `uid` sur l'entrée de `membresFondateurs` et, si `chef: true`, ajoute uid à `admins[]`.
- Agenda ICS : `guildeIcs` (onRequest, GET `?guilde={id}&cle={codeInvitation}`) rend `text/calendar` avec tous les événements à venir et passés de 90 jours, `X-WR-CALNAME` = nom de la guilde. Le client affiche `webcal://` + hôte de la fonction, et un lien « Ajouter à Google Agenda » par événement (URL `calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&location=...`, aucun OAuth).
- Toutes les callables : mêmes région et options que les fonctions existantes de `index.js`; `HttpsError` avec messages FR courts; transactions Firestore partout où deux soldes bougent.

## Client (`src/firebase/guildeMonnaie.ts`, `guildeEvenements.ts`, `guildeClavardage.ts`, `guildes.ts`)
- `guildes.ts` : étendre `Guilde` avec les nouveaux champs, `motDuChef(forme, lang)`, `nomMonnaie(g, lang)`, `formatPieces(n, g)`.
- `guildeMonnaie.ts` : `suivreMaBourseGuilde(guildeId, uid, cb)`, `suivreRegistre(guildeId, cb, max=50)`, wrappers httpsCallable pour chaque callable ci-dessus, `tauxPour(nbActifs)` (même formule que le serveur, exportée pour la courbe), `PLAFOND_CHANGE_JOUR = 200`, `FRAIS_CHANGE = 0.05`.
- `guildeEvenements.ts` : CRUD + `suivreEvenements`, `repondre(guildeId, evId, uid, reponse)`, `lienGoogleAgenda(ev)`, `lienWebcal(guildeId, code)`.
- `guildeClavardage.ts` : `envoyer`, `suivre` (patron de `clavardage.ts` : limite 500, anti-spam 1 message / 2 s).
- `vuLe` : dans `AuthContext` ou au montage de l'app, `setDoc(membres/{uid}, { vuLe: serverTimestamp() }, { merge: true })` au plus une fois par jour (garde en localStorage `fmm:vuLe`).

## Page de la guilde (`src/pages/GuildePage.tsx` + `src/components/guilde/*`)
Onglets : Mur (MurGuilde existant) · Salon · Événements · Marché · Trésor · Membres. Solde en pièces à côté du solde M dans l'en-tête de la page quand on est membre. Trésor : ma bourse de pièces, le taux du jour avec la courbe `tauxHistorique`, change dans les deux sens, virement, registre, trésor commun (chef : verser). Membres : chefs en tête avec le mot de la forme, fondateurs attendus (grisés, « en attente »), code d'invitation (chef : copier, régénérer), demandes en attente. Canon visuel = celui déjà mesuré dans GuildePage, MurGuilde et BoursePanel (jetons `--sk-*`, PageHeader, Brume, cartes du site). Bilingue FR/EN inline comme le reste du site. Jamais d'italique.

## Vérification
`npm run typecheck` puis `npx vite build --mode development` et `npx vite preview --strictPort --port 5177`. Tests fonctions : `node functions/test-guildes.js` (auto-vérification à base d'assert avec un faux Firestore en mémoire pour taux, plafond, frais, idempotence). Déploiement seulement par la session principale, jamais par un agent.

## Adresse de la guilde (Alex, 6 sept : « all under /groupnameclan »)
- `guildes/{id}.slug: string` = nom en minuscules sans accents ni espaces + la forme, ex. « Vestrvegir Vikingar » (clan) → `vestrvegirvikingarclan`. Posé à la création par le client (`slugDeGuilde(nom, forme)` dans `guildes.ts`), unicité vérifiée par `where('slug','==')` avant `setDoc`; la règle exige `slug` string 3-80 chars `[a-z0-9-]+`. Un chef peut le changer (même vérification). Réservés (jamais permis) : tout slug égal à un premier segment de route existant de `App.tsx` (liste `SLUGS_RESERVES` exportée de `guildes.ts`, générée en lisant les `<Route path>` de `App.tsx`).
- Routes : `/:slug` et `/:slug/:onglet` (`salon` · `evenements` · `marche` · `tresor` · `membres`, EN : `chat` · `events` · `market` · `treasury` · `members`) résolus par un composant `GuildeParSlug` placé APRÈS toutes les routes nommées et AVANT la 404 : il cherche `where('slug','==', slug)` et rend `GuildePage` avec l'onglet demandé; slug inconnu → 404 existante. `/guildes/:id` reste valide et redirige vers `/{slug}` quand la guilde en a un. `/en/{slug}/...` suit `locale.ts` (les slugs de guilde ne sont pas traduits, seuls les onglets le sont).
- Partage : le lien d'invitation = `https://festivalmedievaldemontpellier.org/{slug}?code={codeInvitation}`; la page, si l'utilisateur est connecté et pas encore membre, propose « Rejoindre » qui appelle `guildeRejoindreParCode`.
