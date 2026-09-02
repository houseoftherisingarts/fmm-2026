# La suite bureautique de la régie : la voie retenue et le plan de construction

Document d'architecture. Rédigé le 2 septembre 2026, à la suite des trois études commandées sur la question de Google, sur l'état réel de la régie et sur la direction artistique du parchemin. Destiné au conseil d'administration du Festival Médiéval de Montpellier.

---

## 1. La voie, en une phrase

**Les documents que l'équipe écrit vivent chez nous, dans la base du site, sous les mêmes règles de sécurité que le dossier d'un bénévole, et le Drive du festival devient une armoire de dépôt branchée par un seul bouton, jamais un lieu de travail.**

### Où passe exactement la frontière

La voie est mixte, et la frontière se décrit sans ambiguïté possible.

Tout ce que quelqu'un **tape** vit dans Firestore. Cela vaut pour le texte comme pour la grille, et cela vaut aussi pour les totaux, pour l'historique des versions et pour les permissions de chaque pièce. Rien de cela ne part chez Google autrement que par Firebase, qui est déjà notre hébergeur et déjà nommé au plan de conformité.

Tout ce que quelqu'un **importe ou dépose** traverse la frontière une seule fois, dans un sens ou dans l'autre, par le sélecteur de fichiers de Google. Une personne clique, choisit un fichier de son Drive, et le contenu entre dans notre format. Ou bien elle clique dans l'autre sens, et une copie figée s'en va dans le Drive pour être partagée hors de la régie.

Aucune page de Google ne s'affiche jamais dans la régie. Pas de cadre, pas de barre d'outils étrangère, pas de document Google embarqué sous un filtre sépia. La frontière est un bouton, jamais une fenêtre.

### La défense de cette voie

Les trois études convergent sur un point que la seconde formule le mieux : nous possédons déjà les cinq sixièmes de cette suite et personne ne les a branchés. La peau parchemin dort dans la feuille de style depuis des semaines. L'Atelier de signature sait déjà poser une texture de vélin et un sceau de cire commutables sur un document réel, en production, tous les jours. Le Pupitre rend déjà une page format lettre avec un champ `paperStyle` à deux valeurs. La table de documents des Finances est déjà une armoire fonctionnelle adossée au stockage, avec sa catégorie, son année et sa suppression. Le créneau du conseil est déjà réservé dans le code des permissions, et son nom y est même proposé. Bâtir sur Google demanderait d'abandonner tout cela pour repartir d'un éditeur que nous ne pouvons ni habiller, ni régler, ni protéger par nos propres règles, et dont les quotas d'écriture (soixante par minute et par personne sur l'API des feuilles de calcul) interdisent de toute façon la frappe au clavier. La voie maison ne demande aucune dépendance nouvelle vers un service payant, aucun écran de consentement pour écrire une ligne de texte, aucune vérification par Google, et elle rend le temps réel gratuitement par les abonnements que la base offre déjà. Le décor médiéval, lui, n'existe que dans cette voie : le contenu d'un cadre étranger est hors de portée de notre feuille de style, et la seule chose qu'un filtre sépia produit sur un document de Google est un beige de photocopie qui teinte le texte autant que le fond.

### Ce que cette voie coûte

Elle coûte du temps de construction que la voie du cadre embarqué ne coûterait pas. Comptez huit à dix jours de travail répartis, dont deux pour la surface de document et son interrupteur, deux à trois pour l'éditeur de texte, deux pour le pont vers le Drive, et le reste pour les règles de sécurité, l'impression et la vérification. Elle coûte aussi une famille de polices supplémentaire, hébergée chez nous, pour que le corps de texte reste lisible huit heures d'affilée sur un fond chaud. En argent, elle ne coûte rien : les deux bibliothèques retenues sont sous licence libre, ce que nous avons vérifié directement au registre npm le 2 septembre 2026 (TipTap 3.31.0 sous MIT, publié la veille, et Univer 0.25.1 sous Apache 2.0). Elle nous prive enfin du confort de la collaboration simultanée de Google, celle où quatre personnes tapent dans le même paragraphe. La base rend le temps réel document par document, ce qui suffit pour un horaire et un procès-verbal, mais nous n'écrirons pas de fusion de curseurs cette année.

### Ce à quoi elle renonce, franchement

Elle renonce au cadre d'édition de Google restylé, définitivement, et le conseil doit l'entendre une fois pour toutes afin que la question ne revienne pas dans six mois. Le cadre s'affiche, c'est vrai, l'étude l'a mesuré. Il s'affiche en lecture seule, connecté à personne, et il casse dès qu'un fichier privé exige une session, parce que la page de connexion de Google, elle, refuse d'être encadrée. Il casse aussi chez tout bénévole qui travaille sous Safari, Firefox ou Brave, dont les réglages par défaut bloquent les témoins tiers. Rien de ce comportement n'est documenté par Google, donc rien ne garantit qu'il tienne l'an prochain.

Elle renonce également à faire du Drive le lieu de travail de l'équipe. Cela a une conséquence concrète que personne n'aimera au premier jour : l'horaire cessera d'être un fichier que Tristan tient de son côté et que quelqu'un recopie dans une zone de texte. Il deviendra un document de la régie. Le gain se mesure la semaine du festival, quand la version affichée au public et la version que l'équipe modifie sont enfin la même.

---

## 2. La vérification du point le plus risqué

Une architecture qui repose sur une hypothèse non vérifiée ne vaut rien. Le point le plus risqué de cette voie n'est pas l'éditeur, qui est du travail connu. C'est l'étape 1 nommée par Alex : ouvrir le Drive du festival depuis la régie sans déclencher une vérification de sécurité chez Google, sans plafond d'utilisateurs et sans jetons qui meurent tous les sept jours. Si cette promesse est fausse, l'étape 1 passe de deux jours à plusieurs semaines et sort de nos mains.

Nous l'avons donc mesurée nous-mêmes, par requête directe aux pages de Google, le 2 septembre 2026. Voici les trois réponses, dans les mots de Google.

**Le champ d'accès `drive.file` est bien classé non sensible.** La page d'autorisation de l'API Drive le range dans le tableau « Non-sensitive scopes », avec cette description : « Create new Drive files, or modify existing files, that you open with an app or that the user shares with an app while using the Google Picker API or the app's file picker. » Le sélecteur de fichiers de Google y est nommé explicitement, ce qui confirme que la combinaison retenue est celle que Google recommande, et non un détournement.

**Un champ non sensible ne déclenche aucune vérification.** La page d'aide de la console est sans détour : « An unverified app is an app or Apps Script that requests a sensitive or restricted OAuth scope, but hasn't gone through the Google verification process. » Une application qui ne demande que `drive.file` n'entre donc pas dans cette catégorie. Pas d'écran d'avertissement, pas de dossier à soumettre, pas d'évaluation de sécurité à repayer chaque année.

**Le piège des sept jours existe, et il ne nous touchera pas.** La page du protocole OAuth 2.0 dit ceci : « A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of "Testing" is issued a refresh token expiring in 7 days. » Le piège est réel, mais il porte sur les jetons de rafraîchissement, ceux qu'une application conserve pour agir sans personne devant l'écran. Notre pont n'en demandera aucun. Le sélecteur de fichiers travaille avec un jeton d'accès valide une heure, obtenu dans le navigateur au moment où la personne clique, gardé en mémoire vive et jamais écrit nulle part. Il n'y a donc aucun secret nouveau à conserver côté serveur, et le projet n'a pas à gérer une catégorie de secrets qu'il ne gère pas aujourd'hui.

**Une quatrième mesure, en prime, parce qu'elle décide de l'import.** La documentation de `files.export` liste les champs acceptés : `drive`, `drive.file`, `drive.meet.readonly` et `drive.readonly`. Notre champ étroit suffit donc à sortir un document Google en HTML ou une feuille en XLSX, ce qui est exactement le geste d'import. La même page fixe la limite : le contenu exporté ne dépasse pas 10 Mo.

**Conclusion de la vérification.** L'étape 1 tient, à une condition d'exploitation : le projet doit être passé en statut « In production » dans la console de Google plutôt que laissé en « Testing ». Ce passage est gratuit et immédiat pour une application qui ne demande que des champs non sensibles, et il évite d'avoir à inscrire chaque membre de l'équipe comme utilisateur de test à la main.

---

## 3. Le plan de construction

Sept étapes, dans l'ordre. Chacune livre quelque chose d'utilisable seule. Aucune ne dépend d'une décision qui n'aurait pas encore été prise, sauf là où c'est dit.

### Étape 0. L'accusé de réception, avant tout le reste

**Ce qu'elle livre.** Une bande de confirmation unique, partagée par toute la régie, qui dit « Enregistré » ou « Échec de l'écriture, réessayez ». Et le bloc `catch` qui manque aujourd'hui aux écritures, de sorte qu'un refus de la base cesse d'être invisible.

**Pourquoi elle passe en premier.** L'éditeur a besoin d'un indicateur de sauvegarde de toute façon. Autant l'écrire une fois pour les quarante sections plutôt que deux fois. Et une suite bureautique posée sur une régie qui n'accuse jamais réception produirait la même frustration qu'aujourd'hui, en plus gros : personne ne fait confiance à un traitement de texte qui ne dit pas s'il a sauvegardé.

**Fichiers touchés.** `src/pages/admin/primitives.tsx` pour le composant, `src/pages/admin/AdminShell.tsx` pour le contexte, puis `src/pages/admin/BenevoleProfilePage.tsx` (ligne 173) et `src/pages/admin/sections/MarchandsSection.tsx` (ligne 386) pour les deux écritures muettes. Le panneau de confirmation de `CampagnesSection.tsx` sert de modèle. Les vingt-neuf boîtes natives du navigateur réparties dans vingt-deux fichiers se remplacent ensuite au fil de l'eau, une section à la fois, sans urgence.

**Effort.** Une soirée pour le socle et les deux correctifs.

### Étape 1. Le Drive du festival s'ouvre dans la régie

C'est l'étape qu'Alex a nommée, et elle se livre avant l'éditeur, parce qu'elle répond à une question que le conseil se pose depuis un mois.

**Ce qu'elle livre.** Un bouton « Ouvrir le Drive du festival » dans la régie. La personne clique, l'écran de consentement de Google paraît une seule fois, elle choisit un fichier, et la régie affiche ce fichier : son nom, son type, sa date, et un bouton pour en récupérer le contenu. Rien de plus au premier tour. Pas d'édition, pas de synchronisation, pas de copie automatique.

**Comment.** Le sélecteur de fichiers de Google chargé à la demande, le champ d'accès `drive.file` et rien d'autre, un jeton d'accès obtenu dans le navigateur par la bibliothèque d'identité de Google et gardé en mémoire vive. Aucun jeton n'est écrit dans la base, aucun secret n'est ajouté aux fonctions infonuagiques.

**Fichiers touchés.** `src/firebase/drive.ts` (nouveau, environ cent vingt lignes), `.env.example` et `.env.local` pour l'identifiant client et la clé du sélecteur, `src/pages/admin/sections/DocumentsSection.tsx` (nouveau) pour l'écran.

**Ce qui demande un geste d'Alex.** Trois gestes dans la console de Google, décrits en détail à la section 5 : détruire la clé « drive-lecture-temporaire », créer un identifiant client web et une clé restreinte pour le sélecteur, et passer le projet en statut « In production ».

**Effort.** Deux jours, dont une bonne moitié dans la console plutôt que dans le code.

### Étape 2. La surface de document et son interrupteur

**Ce qu'elle livre.** Une page de document, format lettre, posée sur la scène sombre de la régie, avec son vélin, sa réglure, son filet d'or sous le titre, et l'interrupteur qui éteint le décor. Vide au départ, mais imprimable et complète.

**La règle qui gouverne tout le reste, et qui ne se négocie pas.** L'interrupteur agit sur le fond et sur l'ornement. Il ne touche ni à la fonte, ni au corps, ni à l'interligne, ni à la mesure, ni à la couleur de l'encre, ni à la pagination. Un document décoré et le même document sobre ont le même nombre de pages et coupent leurs lignes aux mêmes mots. Corollaire mécanique : le décor s'éteint, il ne se retire jamais du flux. Une lettrine sobre garde l'encombrement d'une capitale, un filet double devient un filet simple de même hauteur, un fleuron de coin devient un bloc vide de même taille.

**Une décision d'architecture que nous prenons ici, contre ce que suggérait la deuxième étude.** La peau `[data-admin-skin="parchment"]` qui dort dans `src/index.css` (lignes 236 à 275) ne sera pas branchée telle quelle. Elle repeint la régie entière en parchemin, ce qui poserait le sépia par-dessus les listes de bénévoles, les tableaux de finances et les pastilles d'alerte, là où la couleur d'accent porte du sens et où le canon de la régie dit lui-même « un outil de travail, pas un décor ». Nous gardons sa méthode et sa recette de grain, et l'interrupteur d'Alex vit sur le document, pas sur la coquille. Il n'existe qu'un seul interrupteur, et il pose un seul attribut, `data-decor`, sur la surface du document. Les quarante lignes de l'ancienne peau se suppriment quand les jetons du document sont en place.

**Le bloc de jetons** est fourni tel quel par la troisième étude, avec ses contrastes déjà mesurés (encre à 12,7 pour 1 sur le vélin, rubrique rouge à 7,44 pour 1, or réservé à l'ornement parce qu'il tombe à 3,72 pour 1). Il se pose sur `.doc-surface` et jamais sur `:root`. Attention au piège que le dépôt a déjà rencontré et documenté autour de la ligne 1275 de la feuille de style : une propriété personnalisée se résout là où elle est déclarée, donc toute valeur dérivée par `color-mix()` doit être redéclarée sur la surface elle-même, faute de quoi le mode sobre garde une arête dorée.

**L'impression abandonne l'ancien moteur.** Le Pupitre exporte aujourd'hui en fabriquant une image de la page, ce qui donne un PDF lourd, non sélectionnable et non cherchable. La suite imprime par la feuille `@media print` et l'export du navigateur, ce qui rend du texte vectoriel et de vraies coupures de page. Bénéfice secondaire mesurable : cela retire près de cinq cents kilooctets du paquet de la régie, chiffre déjà noté à la ligne 36 de `src/pages/AdminPage.tsx`.

**Fichiers touchés.** `src/index.css` (bloc de jetons et feuille d'impression), `src/pages/admin/documents/DocSurface.tsx` (nouveau), `src/components/ui/Interrupteur.tsx` (réemployé tel quel), les deux textures de `public/textures/` et `public/atelier-signature/` à convertir en WebP avec l'outil déjà installé.

**Effort.** Deux jours, incluant le test de non-régression décrit à l'étape 7.

### Étape 3. L'éditeur de texte

**Ce qu'elle livre.** Le traitement de texte. Titres, paragraphes, listes, tableaux simples, images tirées de la Médiathèque existante, et la sauvegarde continue dans la base.

**Comment.** TipTap pour le moteur, parce qu'il rend du HTML nu dans un conteneur que nous stylons entièrement, ce qui est la condition même du thème parchemin, et parce qu'il est sous licence MIT et publié presque tous les jours. Le contenu se range dans la base en blocs, un document par bloc de section, ce qui garde chaque document sous la limite d'un mébioctet que Firestore impose et qui correspond de toute façon au modèle interne de TipTap.

**Fichiers touchés.** `src/firebase/documents.ts` (nouveau), `src/pages/admin/documents/EditeurTexte.tsx` (nouveau), `firestore.rules` pour la nouvelle collection, `package.json` pour les deux paquets de TipTap.

**Effort.** Deux à trois jours.

### Étape 4. La grille

**Ce qu'elle livre.** Le tableur, sous la forme de deux vues et non de trois états. La vue registre, sobre par construction, réemploie la carte sombre et le patron de tableau déjà présents dans quarante sections : c'est là que vivent les trois cents lignes, avec l'en-tête figé, les chiffres alignés en chasse fixe et la hauteur de rang à trente-quatre pixels. La vue page, sur vélin, sert à lire et à imprimer, avec la réglure tracée d'avance, la bande de rubrique rouge qui ouvre un chapitre et les sommes poussées au bord droit de leur colonne. L'interrupteur commande la vue page. Il ne touche jamais à la vue registre, parce que trois cents lignes ne se lisent pas sur du parchemin.

**Une question ouverte qui change le coût du simple au triple.** Si l'équipe a besoin de formules, il faut Univer, sous licence Apache 2.0, et il faut compter trois à quatre jours avec la sérialisation et les règles. Si l'équipe a seulement besoin d'une grille à remplir, ce qui est le cas de l'horaire et de la matrice des rôles tels qu'ils fonctionnent aujourd'hui, une grille maison adossée au patron de tableau existant suffit et coûte une journée. La question est posée à Alex à la section 7. Handsontable est écarté sans appel : sa licence gratuite interdit explicitement l'usage commercial, et un festival qui vend des billets est un usage commercial, ce qui mettrait la facture à 999 $ US par développeur et par an.

**Fichiers touchés.** `src/pages/admin/documents/Grille.tsx` (nouveau), `src/firebase/documents.ts` (étendu), et le cas échéant `package.json`.

**Effort.** Une journée pour la grille simple, trois à quatre jours avec Univer.

### Étape 5. L'import et le dépôt

**Ce qu'elle livre.** Le pont, dans ses deux sens. À l'import, le fichier choisi au sélecteur entre dans notre format : l'API des documents rend la structure, celle des feuilles rend les cellules, et l'API Drive exporte en HTML ou en XLSX pour tout le reste. Au dépôt, une copie figée du document part dans le Drive quand quelqu'un veut la partager hors de la régie, en PDF ou en HTML.

**Une garde qui se code, pas qui se recommande.** Le dépôt refuse par construction les documents portant des renseignements de bénévoles, et l'écran le dit à la personne au moment où elle clique, en une phrase, sans jargon. Le motif est à la section 4 : le Drive du festival est un compte Gmail ordinaire, et un compte Gmail ordinaire ne peut pas être encadré par une entente écrite au sens de l'article 17.

**Fichiers touchés.** `src/firebase/drive.ts` (étendu), `src/pages/admin/documents/PontDrive.tsx` (nouveau).

**Effort.** Deux jours.

### Étape 6. Le Scriptorium prend sa place dans le rail, et le conseil ferme sa porte

**Ce qu'elle livre.** Un groupe neuf dans le rail de la régie, entre « Contenu » et « Régie », nommé selon le vocabulaire de la maison. Il porte deux identifiants : `documents` pour l'écriture ordinaire, ouvert au Super-Admin, au conseil et aux organisateurs, et `ca-board` pour les documents du conseil, ouvert au conseil et au Super-Admin seulement, exactement comme le commentaire des permissions le prévoit depuis le début.

**Le point dur, et il faut le dire au conseil.** Aujourd'hui, la matrice des rôles ne vit que dans l'écran. Les règles de sécurité de la base, elles, ne connaissent qu'une liste d'adresses courriel : la fonction `isAdmin()` accorde le même accès à tout le monde sur la liste, sans distinguer un membre du conseil d'un organisateur. Cacher l'onglet du conseil dans le rail ne le protégerait donc de personne qui saurait ouvrir la console de son navigateur. La correction est courte et elle se fait ici : une fonction `estCA()` dans `firestore.rules` qui lit le rôle dans la collection `adminRoles/{courriel}`, laquelle existe déjà et est déjà lisible par les règles. Dix lignes, et la porte du conseil devient vraie.

**Fichiers touchés.** `src/pages/admin/AdminShell.tsx` (le type des sections et le rail), `src/lib/adminPermissions.ts` (la matrice), `src/pages/AdminPage.tsx` (le chargement paresseux des deux écrans), `firestore.rules` (la fonction `estCA()` et la portée par document).

**Effort.** Une journée.

### Étape 7. La vérification qui reste derrière

**Ce qu'elle livre.** Un seul script Playwright, avec un document témoin de six pages. Il ouvre la page dans les deux états, compte les pages rendues et compare, paragraphe par paragraphe, le nombre de rectangles que le navigateur dessine. Si un seul chiffre bouge, le décor a touché au texte et la règle mère est cassée. Playwright est déjà installé comme dépendance de développement, donc ce test ne coûte rien d'autre que le temps de l'écrire.

**Fichiers touchés.** `scripts/verifier-pagination.mjs` (nouveau).

**Effort.** Une demi-journée.

---

## 4. La Loi 25 : ce qui part chez un tiers, et ce qu'il faut ajouter au plan

Trois faits d'abord, pour que le conseil sache exactement ce qui se déplace.

**Ce qui ne bouge pas.** Tout ce que l'équipe écrit dans la suite reste dans Firestore, chez Google, aux États-Unis, exactement là où vivent déjà le dossier de bénévole et le registre de l'Ordre. La région de cette base est définitive, le plan de conformité le dit déjà, et la suite n'ajoute donc aucun transfert nouveau. Les mêmes règles de sécurité, la même grille de conservation, la même évaluation.

**Ce qui bouge, et seulement quand quelqu'un clique.** Un fichier importé depuis le Drive traverse le navigateur de la personne et entre chez nous. Un document déposé dans le Drive sort de notre périmètre et entre dans un compte Google personnel. Ces deux gestes sont volontaires, tracés, et ils ne se déclenchent jamais tout seuls.

**Ce qui ne bouge jamais.** Aucun jeton, aucun mot de passe, aucune donnée de bénévole ne transite par nos serveurs vers Google. Le jeton d'accès du sélecteur naît dans le navigateur de la personne et meurt avec l'onglet.

### Le point juridique le plus dur, et il concerne le Drive

Le Drive du festival appartient aujourd'hui à `benevoles.medievalmontpellier@gmail.com`, un compte Gmail ordinaire. Cela a deux conséquences que l'article 17 rend sérieuses. La première est qu'un compte gratuit n'a aucun réglage de région de stockage, ce contrôle étant réservé aux éditions Google Workspace, dont les seules options sont d'ailleurs les États-Unis ou l'Europe, jamais le Canada. La seconde est plus lourde : l'addendum de protection des données de Google s'attache à un contrat Cloud ou Workspace, et un compte Gmail gratuit n'a pas de tel contrat. Il n'y a donc rien à signer, rien à dater et rien à ranger au dossier de gouvernance pour ce Drive. L'entente écrite que l'article 17 exige avant toute communication de renseignements personnels hors du Québec est, dans l'état actuel des choses, impossible à produire pour ce compte.

C'est pour cette raison que le pont refuse par construction d'exporter les documents portant des renseignements de bénévoles, et non par prudence excessive. La garde est technique parce que la garantie juridique n'existe pas.

### Les cinq ajouts à faire dans `docs/LOI-25.md`

1. **Dans « Les petites choses, qui se règlent en une soirée » (ligne 144).** Récrire la phrase sur la clé « drive-lecture-temporaire ». Elle ne se supprime pas seulement, elle se remplace : une clé de navigateur neuve, restreinte aux domaines du festival par référent HTTP et restreinte à la seule API du sélecteur de fichiers. L'ancienne clé, sans aucune restriction depuis le 25 août, se détruit le jour même où la nouvelle est créée.

2. **Dans « Ce qui demande une décision d'Alex ».** Ajouter une entrée nommée « Le pont vers le Drive du festival ». Elle expose le choix en trois lignes : brancher le pont en refusant les documents de bénévoles, ou ouvrir un compte Google Workspace pour le festival, ce qui rend possibles l'entente écrite, le disque partagé et le réglage de région, sans pour autant descendre jusqu'au Canada. Workspace règle la mécanique, jamais la question juridique de fond.

3. **Dans l'évaluation des facteurs relatifs à la vie privée portant sur la sortie hors Québec (article 17).** Ajouter la finalité du Drive comme deuxième flux, distinct de Firebase, et y peser honnêtement les quatre éléments que l'article nomme. Écrire noir sur blanc que ce second flux repose sur un compte personnel, sans journal d'administration, sans réglage de région et sans entente écrite possible en l'état, et que c'est précisément ce qui justifie la restriction technique posée dans le code.

4. **Dans la politique de confidentialité récrite (article 8).** Nommer Google Drive parmi les destinataires, à côté de Firebase, de Stripe et des autres, et dire en une phrase claire que des documents internes peuvent être déposés dans un espace de stockage situé hors du Québec.

5. **Dans la grille de conservation.** Ajouter une ligne pour les documents de la régie. Proposition de départ, à approuver par le conseil : les procès-verbaux et les documents du conseil se gardent sept ans, les horaires et les documents de production se détruisent douze mois après l'édition concernée, et les brouillons abandonnés se détruisent après six mois sans modification.

### Une correction déjà au plan que la suite rend urgente

Les quatre familles de polices du site sont aujourd'hui tirées de `fonts.googleapis.com` à chaque visite, y compris dans la régie, et une seconde fois en dur dans le Pupitre. Le plan de conformité demande déjà de les héberger localement (correction 22, ligne 278). Cette correction passe avant l'étape 2, parce que la fonte du document se choisit en même temps et parce qu'un document ouvert huit heures par jour multiplierait autrement le nombre de communications hors Québec. La famille retenue pour le corps de texte, environ cent kilooctets, s'héberge chez nous dès le premier jour et n'ajoute aucune ligne au registre.

---

## 5. Les gestes qui appartiennent à Alex

Rien de ce qui suit ne peut être fait par l'équipe technique. Ce sont des gestes dans des comptes qui lui appartiennent, et l'étape 1 attend les trois premiers.

**Dans la console Google Cloud du projet du festival.** Détruire la clé d'accès nommée « drive-lecture-temporaire », créée le 25 août et toujours vivante sans aucune restriction. Créer ensuite une clé de navigateur neuve, restreinte aux domaines du festival et à la seule API du sélecteur de fichiers, puis un identifiant client OAuth de type application web pour l'adresse de la régie.

**Sur l'écran de consentement.** Déclarer un seul champ d'accès, `drive.file`, et passer le statut de publication de « Testing » à « In production ». Ce passage est gratuit et n'exige aucune vérification tant que le seul champ demandé reste celui-là. Il évite d'avoir à inscrire chaque membre de l'équipe comme utilisateur de test à la main, et il écarte le piège des jetons de sept jours.

**Une fois, au premier usage.** Chaque personne de l'équipe verra l'écran de consentement de Google une seule fois, sur son propre compte, et devra accepter. Il est utile qu'Alex prévienne Maïté plutôt que de la laisser découvrir l'écran seule un dimanche soir.

**Le compte propriétaire.** Le Drive du festival appartient à une adresse Gmail personnelle. Tant qu'il en est ainsi, la personne qui détient ce compte détient les documents, et le festival n'a aucun recours administratif si l'accès se perd. C'est un risque d'organisation, pas un risque technique, et il se règle par une décision plutôt que par du code.

---

## 6. Ce que nous ne bâtissons pas

Le cadre d'édition de Google restylé, pour les raisons mesurées à la section 1. La collaboration simultanée avec fusion de curseurs, qui n'a aucun demandeur aujourd'hui. Un sixième dépôt de fichiers : la Médiathèque, les archives de photos et le carnet de contacts restent les sources, et la table de documents des Finances se généralise plutôt que de se réécrire. Un éditeur bâti sur les API de Google, dont le plafond de soixante écritures par minute et par personne interdit la frappe au clavier. Et un accès au Drive au nom du festival par compte de service, qui est impossible sans Workspace, puisque Google écrit qu'un compte de service ne dispose d'aucun espace de stockage et ne peut posséder aucun fichier.

---

## 7. Les trois questions posées à Alex

1. Est-ce que le festival ouvre un compte Google Workspace pour son Drive cette année ?
2. Est-ce que quelqu'un a besoin de vraies formules dans le tableur de la régie, ou seulement d'une grille à remplir ?
3. Est-ce que l'horaire du festival, celui que Tristan tient aujourd'hui hors du site, devient le premier document de la suite ?
