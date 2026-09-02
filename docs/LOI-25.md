# Loi 25 : état de conformité du site et plan de travail

**Festival Médiéval de Montpellier**
Version 1, arrêtée le 2 septembre 2026.
Document interne, destiné au conseil et à l'équipe. Il tient lieu de preuve de diligence et de liste de travail.

---

## Pourquoi ce document existe

La Loi 25 est le nom courant de la loi québécoise qui a modernisé la protection des renseignements personnels. Pour un organisme comme le nôtre, elle s'applique par la *Loi sur la protection des renseignements personnels dans le secteur privé* (RLRQ c. P-39.1). Le fait d'être un organisme sans but lucratif ne change rien : l'article 96 précise qu'une association qui exploite une entreprise a les mêmes droits et les mêmes obligations que toute autre personne qui en exploite une. Nous vendons des billets, nous tenons une base de mille membres et nous recueillons des renseignements de santé auprès de nos bénévoles. La loi nous vise.

Cinq auditeurs ont passé le site au crible en septembre 2026, chacun sur une dimension distincte : les témoins et le consentement, la politique de confidentialité, les règles de sécurité des données, les droits des personnes, et les obligations d'organisation. Le présent document trie leurs constats, écarte les doublons, tranche les contradictions et range le tout par risque réel pour un festival tenu par des bénévoles.

La bonne nouvelle tient en une phrase : le site est techniquement bien bâti et personne n'a été négligent. La mauvaise tient en une autre : le dossier d'entreprise est vide, et le site affiche une promesse de conformité qu'il ne tient pas.

---

## Ce qui a été vérifié, et par qui

Les cinq rapports d'audit ont été relus, puis les trois constats les plus graves ont été revérifiés directement dans le code du dépôt, ligne par ligne, avant d'être retenus ici. Voici ce que cette contre-vérification a donné.

**Le script publicitaire de Google se charge avant tout consentement : confirmé.** La balise se trouve bien dans `index.html`, dans le `<head>`, sans aucune condition, et elle est présente à l'identique dans le fichier construit (`dist/index.html`, ligne 42). Le commentaire qui la précède dit explicitement de ne pas la déplacer, au motif que le robot de vérification de Google ne clique pas sur la bannière. La bannière de consentement, elle, est un composant React chargé en différé et monté bien après. Le constat est exact.

**Le bouton « Refuser » ne bloque rien : confirmé.** La fonction `choose()` de `src/components/layout/ConsentBanner.tsx` écrit la décision dans le stockage local du navigateur, met à jour l'état de l'écran, et n'appelle `applyAcceptedDecision()` que si la réponse est « accepted ». Il n'existe aucune branche pour le refus. La seule conséquence visible d'un refus est la disparition de la bannière.

**Le registre des membres se lit par n'importe quel compte connecté, et les fiches importées y figurent : confirmé.** La règle de `firestore.rules` dit bien `allow read: if signedIn();` sur `/membres/{uid}`, et la suppression y est réservée à l'équipe. Les deux chemins d'import, l'outil `tools/importer-profils-zeffy.mjs` et la fonction `importerComptesZeffy` de `functions/index.js`, créent un compte d'authentification à partir d'une adresse lue dans le registre des acheteurs, puis écrivent une fiche `users` marquée `origine: 'zeffy'` et une fiche `membres` portant le vrai nom de la personne avec l'étiquette « importé ». Aucune de ces personnes n'a posé de geste.

Deux vérifications supplémentaires ont été faites au passage, parce qu'un constat faux coûte plus cher qu'un constat manquant. Le premier grep sur `storage.rules` n'a d'abord rien trouvé, ce qui laissait croire à une erreur d'auditeur ; la relecture a montré que la règle s'écrit avec un espacement différent et que le constat était juste. Le second portait sur la phrase « Conforme à la Loi 25 du Québec » : elle est bien présente aux lignes 249 et 254 de `src/content.ts`, en français et en anglais.

**Ce qui n'a pas pu être revérifié.** Les comptages de la base de production (1 028 comptes, dont environ 965 importés, 297 fiches de clients, 13 dossiers de bénévoles, 35 abonnés à l'infolettre) proviennent des lectures en seule lecture faites par les auditeurs le 2 septembre 2026. La contre-vérification n'a pas pu les rejouer, faute d'identifiants d'accès dans la session de relecture. Ces chiffres sont cohérents entre trois rapports indépendants, mais ils devraient être reconfirmés d'un seul comptage avant que ce document ne soit déposé au dossier.

---

## Ce qui est déjà conforme, et qu'il ne faut pas casser

Il vaut la peine de commencer par là, parce que le travail déjà fait est réel et qu'une correction maladroite pourrait le défaire.

**Les règles d'accès aux données sensibles sont écrites avec soin.** La fiche de compte d'un membre n'est lisible que par lui et par l'équipe. Le dossier d'un bénévole range les notes de l'équipe dans une sous-collection fermée, pour que le candidat ne lise pas ce qui s'écrit sur lui. Le registre des clients, le carnet de contacts et les documents financiers sont fermés des deux côtés. Les messages privés ne se lisent que par leurs deux participants et ne se réécrivent jamais. Le blocage d'une personne est vérifié dans la règle elle-même, pas seulement dans l'écran. Chaque règle porte un commentaire qui explique qui voit quoi et pourquoi, ce qui est rare et ce qui servira directement à rédiger la politique de gouvernance.

**Aucun secret ne traîne dans le code.** Les clés et les mots de passe vivent dans le gestionnaire de secrets de Google et sont déclarés par `defineSecret`. Le fichier d'environnement local n'a jamais été suivi par le dépôt. Les sondages faits sur l'historique des commits n'ont rien trouvé. La seule clé visible dans le code livré au navigateur est la clé web de Firebase, qui est publique par conception et qui identifie le projet sans rien autoriser par elle-même.

**Les stockages du site sur l'appareil du visiteur sont fonctionnels et n'exigent aucun consentement.** Ce que le site écrit dans le navigateur relève de l'usage : le choix de consentement lui-même, l'état des drapeaux d'ouverture de la billetterie, l'avancement dans les jeux, la session d'authentification. Rien de tout cela ne sert à suivre ni à profiler. Il reste seulement à les décrire dans la politique, ce que l'article 8.2 demande.

**Le site ne demande jamais la position de l'appareil, et aucune décision concernant une personne n'est rendue par calcul.** Les statuts de candidature des bénévoles, des marchands et des groupes musicaux sont posés à la main par l'équipe. L'article 12.1, qui encadre les décisions automatisées, ne mord donc pas aujourd'hui. Il mordrait dès le jour où un tri automatique départagerait des candidatures.

**Quatre droits fonctionnent déjà sans écrire à personne.** Le nom, le téléphone, la photo et l'adresse de contact publique se corrigent depuis les réglages du compte. La candidature de bénévole se rouvre préremplie et se met à jour. Un billet du mur se retire par son auteur. Une personne identifiée sur la photo de quelqu'un d'autre peut décrocher son propre repère, et la règle vérifie champ par champ que rien d'autre ne bouge. Enfin, chaque infolettre porte un lien de désabonnement signé qui répond même au bouton à un clic des clients de courriel. Ce sont des fondations, pas des détails.

**Le courriel reste au Canada.** Les envois passent par les serveurs de la zone canadienne de Zoho et de ZeptoMail. C'est le seul flux qui ne sort pas du pays, et c'est un point à porter au crédit du dossier.

---

## Ce qui doit être corrigé tout de suite, et pourquoi

Sept corrections sont bloquantes. Elles sont rangées ici dans l'ordre où il faut les faire, du geste le plus court au chantier le plus long, et non par gravité pure. Ce classement tient compte de ce qu'un organisme de notre taille peut réellement livrer.

### 1. Retirer la phrase « Conforme à la Loi 25 du Québec » de la bannière

**Le fait.** La bannière de témoins affiche, en français et en anglais, une déclaration de conformité. La politique de confidentialité affirme de son côté que le festival « respecte la Loi 25 ». Aucune des cinq obligations d'organisation de la loi n'est remplie aujourd'hui, et le script publicitaire tourne avant que la personne ait répondu quoi que ce soit.

**L'exigence.** Les articles 8 et 8.2 exigent une information exacte au moment de la collecte et une politique publiée en termes simples et clairs. Une déclaration écrite de conformité qui ne se soutient pas devient une pièce que la Commission peut produire contre nous, et elle transforme une lacune ordinaire en promesse trompeuse.
Texte de loi : <https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-39.1>

**La correction.** Remplacer la phrase par un renvoi à la politique, et ajouter dans la bannière un lien cliquable vers `/politique-de-confidentialite`, qui n'existe pas aujourd'hui. La mention de conformité pourra revenir le jour où les cinq pièces du dossier existeront. Elle deviendra alors un atout plutôt qu'un risque.

**Le coût.** Dix minutes. C'est la correction la moins chère et la plus rentable du document.

### 2. Ne plus charger la publicité de Google avant le consentement

**Le fait.** Le script d'AdSense est posé dans le `<head>` du fichier `index.html`, sans condition, et il est servi sur toutes les pages, y compris l'aire d'administration. Les mesures faites en navigateur neuf montrent des appels vers `pagead2.googlesyndication.com`, `googleads.g.doubleclick.net` et `adtrafficquality.google` avant tout clic, et un témoin déposé par `doubleclick.net`.

**L'exigence.** L'article 8.1 impose d'informer la personne *au préalable* du recours à une technologie qui permet de l'identifier, de la localiser ou de la profiler, et de lui offrir les moyens d'activer ces fonctions. La Commission d'accès à l'information écrit dans ses lignes directrices sur le consentement que ces fonctions « doivent être désactivées par défaut » et que « la personne concernée doit donc poser un geste positif ». La publicité comportementale est du profilage au sens plein du terme.
Lignes directrices : <https://www.cai.gouv.qc.ca/uploads/pdfs/CAI_Criteres_Validite_Consentement.pdf>

**La correction.** Retirer la balise du fichier `index.html` et injecter le script par code au moment où la finalité « publicité » est acceptée. Le commentaire laissé dans le fichier soutient l'inverse, au motif que le robot de vérification de Google ne cliquerait pas sur la bannière. Cette justification ne tient plus : le fichier `public/ads.txt` contient déjà la ligne d'autorisation de notre compte éditeur, et Google reconnaît la vérification par balise meta `google-adsense-account`, qui ne dépose rien. Il faut confirmer la méthode dans le compte AdSense avant de retirer le script, puis retirer aussi le commentaire, qui est devenu une consigne fautive.

**La contradiction tranchée.** Un des rapports proposait de brancher une plateforme de gestion du consentement certifiée par Google plutôt que de bloquer le script nous-mêmes. Cette exigence de Google vise l'Espace économique européen, le Royaume-Uni et la Suisse. Elle ne couvre pas le Québec, et rien du côté de Google ne nous décharge de l'article 8.1. Le blocage se fait donc chez nous.

### 3. Faire que « Refuser » refuse réellement

**Le fait.** Le refus n'écrit qu'une clé dans le navigateur. Après avoir cliqué sur « Refuser », la page d'accueil appelle les mêmes hôtes tiers qu'avant, et la page des commanditaires charge quarante hôtes tiers et dépose dix-sept témoins, dont certains expirent en 2027.

**L'exigence.** L'article 14 pose qu'un consentement doit être manifeste, libre et éclairé, et qu'un consentement donné autrement est sans effet. Un refus qui ne produit aucun effet vide la bannière de son sens et rend l'ensemble du dispositif inopérant.

**La correction.** Inverser la logique. Rien de non essentiel ne se charge tant que la finalité visée n'a pas été acceptée. En pratique, sortir l'état de consentement du composant de bannière vers un petit module lisible par tout le site, et y accrocher l'injection de la publicité, l'activation de la mesure d'audience, le chargement du pixel de Meta et le montage des cadres tiers. Sur un refus qui suit une acceptation, recharger la page, puisqu'un script déjà en mémoire ne se décharge pas et qu'un témoin tiers déjà posé ne peut pas être effacé depuis notre domaine.

### 4. Retirer le cadre de dons intégré à la page des commanditaires

**Le fait.** La page `/commanditaires` monte un cadre Zeffy dès son affichage, sans clic et sans consentement. Ce cadre embarque sa propre pile de mesure et de publicité : HubSpot, Microsoft Clarity qui enregistre les sessions, Amplitude, la régie de Microsoft, l'outil de LinkedIn, Stripe et hCaptcha. C'est la plus grosse fuite du site, et elle est involontaire.

**L'exigence.** L'article 8.1 pour l'information préalable, l'article 8 pour la mention des tiers et de la possibilité d'une communication hors Québec, et l'article 17 pour l'évaluation écrite qui doit précéder toute sortie de renseignements du territoire.

**La correction la plus courte.** Supprimer le cadre. Un lien vers le formulaire de dons existe déjà quelques lignes plus haut sur la même page, et il ne charge rien tant que personne ne clique. Si le cadre doit rester, il faut le passer derrière un bouton, avec une phrase qui nomme Zeffy et ses fournisseurs, et produire l'évaluation prévue à l'article 17.

### 5. Sortir du registre public les fiches créées par import

**Le fait.** Environ 965 des 1 028 comptes du site ont été fabriqués par script à partir du registre des acheteurs de billets. Pour chacun, une fiche portant le vrai nom de la personne a été posée au registre de l'Ordre. Ce registre se lit par n'importe quel compte connecté, et l'inscription au site n'exige aucune vérification de l'adresse courriel. Une adresse jetable suffit donc, en une minute, à lire un millier de noms dont l'immense majorité n'a jamais demandé à y figurer. Les auditeurs relèvent que près de 960 de ces comptes ne se sont jamais connectés une seule fois.

**L'exigence.** L'article 4 impose de déterminer les fins d'une collecte avant de la faire. L'article 14 exige un consentement manifeste, libre et éclairé, demandé pour chaque finalité. L'article 13 interdit de communiquer les renseignements d'une personne à un tiers sans son consentement, et l'affichage d'un nom devant un millier de comptes en est une. L'article 9.1 exige enfin que les paramètres de confidentialité d'un service technologique assurent par défaut le plus haut niveau de confidentialité, sans intervention de la personne.

**La correction.** Trois gestes, dans cet ordre. Masquer immédiatement les fiches marquées « importé » dans la règle de lecture et dans la fonction qui liste le registre. Poser ensuite sur la fiche un réglage de visibilité éteint par défaut, que la personne allume elle-même depuis ses réglages. Puis décider du sort des comptes eux-mêmes, ce qui est une décision d'Alex et figure plus bas.

**Pourquoi c'est le constat le plus lourd du rapport.** Les autres manquements exposent le festival à une sanction. Celui-là expose des personnes réelles, nommément, à la vue d'inconnus, et il est le seul dont un festivalier pourrait se plaindre en ayant tout à fait raison.

### 6. Récrire la politique de confidentialité au complet

**Le fait.** La politique tient en trois paragraphes et annonce une seule collecte, l'adresse courriel de l'infolettre, plus des données de navigation présentées comme anonymisées. La réalité est d'un autre ordre de grandeur. Le site recueille des noms, des téléphones, des tranches d'âge, des pronoms, des allergies et des notes alimentaires, des contacts d'urgence, des signatures manuscrites, des photos où des personnes sont identifiées par leurs coordonnées dans l'image, des messages privés, des comptes Discord liés, des adresses IP, et il suit l'ouverture de chaque infolettre adresse par adresse. Le mot « anonymisées » est faux au sens de l'article 23 : un identifiant publicitaire sert précisément à reconnaître un appareil.

**L'exigence.** L'article 8 énumère l'information due lors de la collecte, dont les fins, les moyens, les droits, le nom des tiers ou de leurs catégories, et la possibilité que les renseignements sortent du Québec. L'article 8.2 impose de publier une politique en termes simples et clairs, et de donner avis de toute modification. Le guide de rédaction de la Commission donne le gabarit à remplir.
Guide : <https://www.cai.gouv.qc.ca/uploads/pdfs/CAI_GU_POL_Confidentialite.pdf>

**La correction.** Repartir du gabarit de la Commission et bâtir la politique sur un tableau de catégories : identification, coordonnées, renseignements techniques, renseignements de santé, renseignements financiers, contenus publiés, communications privées. Pour chaque ligne, dire ce qui est recueilli, à quelle fin, par quel formulaire, qui y a accès dans l'équipe et combien de temps c'est gardé. Ajouter une section sur les destinataires, une sur la sortie hors Québec, une sur les jeunes, une sur les droits, et la date d'entrée en vigueur avec celle de la dernière mise à jour. Retirer le mot « anonymisées ».

**Le corollaire.** Huit points de collecte sur dix ne portent aucune mention aujourd'hui. Le texte du formulaire de bénévolat est le meilleur du site et sert de patron : il suffit d'en faire un petit composant réutilisable, une phrase et un lien, posé sous chaque bouton d'envoi.

### 7. Nommer le responsable de la protection des renseignements personnels et publier ses coordonnées

**Le fait.** L'expression n'apparaît nulle part dans le dépôt. La politique renvoie à une adresse générique, sans nom ni titre, tandis que la page de bénévolat renvoie les mêmes droits vers une adresse Gmail personnelle. Une personne qui veut exercer un droit ne sait ni à qui écrire, ni quand elle aura une réponse, ni quoi faire si elle n'en a pas.

**L'exigence.** L'article 3.1 prévoit que la personne ayant la plus haute autorité exerce d'office la fonction, qu'elle peut la déléguer par écrit, et que « le titre et les coordonnées du responsable de la protection des renseignements personnels sont publiés sur le site Internet de l'entreprise ». Cette obligation est en vigueur depuis le 22 septembre 2022, soit quatre ans. Les articles 32 et 34 confient ensuite à ce responsable la réponse écrite dans les trente jours et la motivation de tout refus.

**La correction.** Nommer la personne, ouvrir une adresse dédiée du domaine du festival plutôt qu'un Gmail personnel, et publier le titre et les coordonnées dans la politique et dans le pied de page. Aligner ensuite tous les formulaires sur cette même adresse. Le Gmail d'une bénévole est aujourd'hui un lieu d'entreposage de renseignements de santé, hors de tout contrôle du festival.

---

## Ce qui vient ensuite, sans être bloquant

Ces corrections comptent, mais elles peuvent attendre que les sept précédentes soient livrées.

**Séparer les finalités dans la bannière.** Un seul clic ouvre aujourd'hui deux finalités distinctes, la mesure d'audience et la publicité, et le texte n'annonce que la première. Le pixel de Meta est donc accepté sans avoir jamais été nommé. La correction consiste à offrir trois interrupteurs éteints par défaut, pour la mesure, pour la publicité et pour les contenus tiers embarqués, avec deux boutons de même poids visuel. Fondement : article 14, et la section du guide de la Commission sur la granularité.

**Rendre le retrait du consentement possible.** Une fois le choix posé, la bannière ne revient jamais et aucun écran ne permet d'y revenir. Pour se rétracter, il faut aujourd'hui vider les données du site dans son navigateur. La Commission écrit qu'il doit être aussi facile de retirer un consentement que de le donner. Il faut un lien « Témoins et vie privée » dans le pied de page, qui rouvre la bannière avec les choix courants. Fondement : article 8, quatrième paragraphe.

**Aligner les règles du stockage de fichiers sur celles de la base.** Les photos, les billets du mur, les objets du Souk et les fiches de commerce sont lisibles par le monde entier au niveau du fichier, alors que la base réserve certains d'entre eux à leur auteur ou aux membres d'une guilde. Le nom du fichier n'est pas devinable et l'énumération du dossier est bloquée, ce qui limite la portée, mais une adresse obtenue une fois reste valable pour toujours, même après que la photo est repassée en privé. Fondement : article 10.

**Corriger le défaut de partage des photos.** La fonction d'envoi a le bon défaut, « privée », mais l'écran qui l'appelle l'écrase avec « publique ». Une personne qui téléverse sans toucher au sélecteur rend sa photo visible à tous les membres. La collection est vide aujourd'hui, donc la correction est gratuite et personne n'a été exposé. Fondement : article 9.1.

**Ouvrir un chemin pour supprimer son compte et pour exporter ses renseignements.** Aucun de ces deux gestes n'existe. La suppression est réservée à l'équipe sur toutes les collections concernées. Quant à la portabilité, elle est en vigueur depuis le 22 septembre 2024 et n'a jamais été bâtie, alors même que le site est né après cette date. L'article 3.3 exige d'ailleurs que tout nouveau système soit conçu pour permettre cet export dès le départ. Fondements : articles 23, 27 troisième alinéa, 28 et 35.

**Demander l'âge à l'inscription.** Le site porte un Village Jeunesse, des jeux qui exigent un compte, un mur social, une messagerie privée et une monnaie virtuelle rechargeable. L'âge n'est demandé nulle part, sauf dans le formulaire de bénévolat, et le seul palier prévu est « moins de 18 ans » alors que la loi place la charnière à 14 ans. Rien n'empêche aujourd'hui un enfant de dix ans d'ouvrir un compte. La voie la plus courte est de fixer l'âge minimal du compte à 14 ans et de le vérifier à l'inscription, en gardant la page Jeunesse comme page d'information sans collecte, ce qu'elle est déjà. Fondements : articles 4.1 et 14, deuxième alinéa.

**Activer la vérification de l'adresse courriel à l'inscription.** Le code note explicitement que les comptes sont utilisables dès leur création, sans courriel de vérification. Tant que le registre des membres est lisible par tout compte connecté, cette porte reste grande ouverte.

**Les petites choses, qui se règlent en une soirée.** Héberger les quatre familles de polices en local plutôt que de les tirer de chez Google à chaque visite, ce qui supprime un transfert hors Québec et fait gagner deux connexions réseau au premier rendu. Passer le lecteur du film sur le domaine sans témoins de YouTube. Sortir la bannière de consentement du pied de page pour qu'elle couvre aussi l'aire d'administration. Retirer les deux adresses courriel écrites dans la console du navigateur et remplacer les adresses en clair des journaux serveur par une empreinte tronquée, puis régler la rétention des journaux à trente jours. Supprimer la clé d'accès nommée « drive-lecture-temporaire », créée le 25 août et toujours vivante sans aucune restriction. Restreindre la clé de navigateur de Firebase aux domaines du festival, puis activer App Check, ce qui transforme les règles de la base d'unique rempart en second rempart. Fermer l'écriture non authentifiée des compteurs de visites. Faire remonter le désabonnement dans la fiche de l'abonné, pour que le compteur de l'équipe cesse d'annoncer des abonnés qui se sont retirés.

---

## Ce qui demande une décision d'Alex

Rien de ce qui suit ne peut être tranché par l'équipe technique. Ce sont des choix d'organisation, et le reste du plan attend qu'ils soient faits.

**Qui est le responsable de la protection des renseignements personnels.** La fonction revient d'office à la personne ayant la plus haute autorité. Alex peut la garder ou la déléguer, mais la délégation doit être écrite, datée et conservée. Il faut aussi ouvrir l'adresse dédiée qui paraîtra sur le site.

**Quelle est l'entité juridique qui exploite le festival, et quel est son numéro d'entreprise du Québec.** La politique actuelle affirme que le FMM est « opéré par Le Salon des Inconnus », et rien d'autre dans le dépôt ne confirme cette mention. Ce numéro sera exigé dans tout avis à la Commission en cas d'incident. La question doit être réglée avant la réécriture de la politique.

**Le sort des 965 comptes créés par import.** Trois voies existent. Masquer les fiches et laisser les comptes dormants, ce qui règle l'exposition mais laisse des comptes que personne n'a demandés. Détruire les fiches et les comptes jamais utilisés, ce qui est la voie la plus propre et la plus défendable. Ou aviser les personnes, leur expliquer ce que nous détenons et leur offrir un lien qui efface tout en un clic, ce qui est la voie la plus respectueuse et la plus coûteuse en temps. Le masquage immédiat se fait de toute façon, quelle que soit la suite.

**Les durées de conservation.** La loi n'impose pas de durée, elle impose d'en fixer une, de la publier et de l'appliquer. Voici une grille de départ, à ajuster puis à approuver. Les dossiers de bénévoles, y compris les allergies et les notes alimentaires, se détruisent douze mois après l'édition concernée, puisqu'ils ne servent qu'à la sécurité sur le site. Les candidatures refusées se détruisent douze mois après la décision. Le registre des clients se garde le temps que la loi fiscale impose, soit six ans après la fin de l'exercice, réduit aux seules données de facturation. Les comptes de membres vivent tant qu'ils servent, puis se détruisent vingt-quatre mois après la dernière connexion. Les messages privés et les billets du mur se gardent vingt-quatre mois. Les traces d'ouverture des infolettres se détruisent à quatre-vingt-dix jours. Les signalements de bogue se détruisent à leur résolution. Les journaux techniques portant une adresse se gardent trente jours. Le registre des incidents se garde cinq ans, ce délai-là étant imposé par règlement.

**Garder ou non la publicité de Google.** Une fois le script bloqué avant consentement, les annonces ne s'afficheront plus que pour les personnes qui acceptent, et le revenu suivra ce taux d'acceptation. Alex doit savoir que la correction a un prix, et décider s'il maintient la régie, s'il la passe en annonces non personnalisées, ou s'il la retire.

**Garder ou non le cadre de dons intégré.** Le supprimer est la voie la plus simple et la moins chère. Le maintenir derrière un clic demande d'écrire une évaluation des facteurs relatifs à la vie privée pour Zeffy et d'obtenir une entente écrite.

**Déplacer ou non les traitements vers Montréal.** Les fonctions infonuagiques et le stockage de fichiers se redéploient dans la région canadienne sans grand chantier, ce qui retire les journaux et les adresses IP du territoire américain. La base de données, elle, ne se déplace pas : la région d'une base est définitive et il faudrait en créer une seconde et migrer les collections. La réponse raisonnable pour cette année est de déplacer les fonctions et le stockage, et de consigner honnêtement dans l'évaluation la décision de laisser la base où elle est.

---

## Ce qui est organisationnel plutôt que technique

Aucune ligne de code ne réglera cette partie, et c'est pourtant elle qui manque le plus. Quatre pièces composent le dossier d'entreprise que la Commission demande en premier quand une plainte arrive.

**La politique de gouvernance, exigée par l'article 3.2.** Elle est distincte de la politique de confidentialité et doit contenir trois choses nommées par la loi : l'encadrement de la conservation et de la destruction des renseignements, les rôles et les responsabilités des membres de l'équipe tout au long du cycle de vie de ces renseignements, et un processus de traitement des plaintes. Le second alinéa ajoute que des informations détaillées à son sujet doivent être publiées sur le site, en termes simples et clairs. Le travail est plus court qu'il n'en a l'air, parce que les commentaires déjà écrits dans les règles de la base décrivent déjà qui voit quoi et pourquoi. Il ne reste qu'à les sortir du fichier technique et à les mettre en français ordinaire, puis à y ajouter la grille de conservation approuvée et la marche à suivre pour une plainte.

**Les évaluations des facteurs relatifs à la vie privée, exigées par les articles 3.3 et 17.** La loi demande une évaluation proportionnée à la sensibilité et à la quantité des renseignements. Pour un festival de notre taille, une dizaine de pages suffit. Deux évaluations sont prioritaires. La première porte sur le système principal, c'est-à-dire le compte de membre, le registre de l'Ordre et le dossier de bénévole avec ses renseignements de santé. La seconde porte sur la sortie des renseignements hors du Québec, et elle doit peser les quatre éléments que l'article 17 nomme : la sensibilité, la finalité, les mesures de protection, y compris contractuelles, et le régime juridique du pays destinataire. Cette seconde évaluation doit nommer honnêtement le cadre juridique américain plutôt que de le contourner.

**Les ententes écrites avec les fournisseurs, exigées par le même article 17.** Google, Stripe, Square, Zeffy et Meta publient tous un addenda contractuel de protection des données qui tient lieu d'entente écrite. Il faut les accepter formellement sur nos comptes, en conserver la preuve datée, et ranger les pièces au dossier de gouvernance plutôt que dans le dépôt de code.

**Le registre des incidents de confidentialité, exigé par l'article 3.8.** Son gabarit et sa procédure sont fournis à la section suivante, prêts à l'emploi. Ce registre s'ouvre aujourd'hui, vide, et se remplit le jour où quelque chose arrive.

Un dernier point mérite d'être dit clairement au conseil : ces quatre pièces auraient dû exister depuis 2022 et 2023 selon les échéances de la loi. Les produire maintenant, datées d'aujourd'hui et accompagnées du présent document, est la meilleure démonstration de diligence que nous puissions faire. Une organisation qui a trouvé ses manquements elle-même, les a écrits et les a corrigés dans l'ordre n'est pas dans la même position qu'une organisation qui découvre les siens le jour d'une plainte.

---

## Le registre des incidents de confidentialité

Le registre se tient hors du dépôt de code, dans un fichier privé sous la garde du responsable, par exemple un tableur du Drive du festival ou une collection fermée de la base. Il doit pouvoir être transmis à la Commission sur demande, et chaque entrée se conserve au moins cinq ans à compter du moment où le festival a pris connaissance de l'incident.

Un point souvent mal compris mérite d'être souligné : **tout incident s'inscrit au registre, même celui qui ne présente aucun risque de préjudice sérieux.** Le règlement exige justement que le registre explique les éléments qui amènent à conclure qu'il existe ou non un tel risque.

### Les colonnes du registre

| Colonne | Ce qu'on y écrit |
| --- | --- |
| 1. Numéro | Un identifiant séquentiel jamais réutilisé, par exemple INC-2026-001. |
| 2. Renseignements visés | La nature exacte de ce qui est touché : courriels, noms, téléphones, allergies et notes médicales, montants de bourse, contenu de messages privés. Si l'information n'est pas connue, écrire la raison qui empêche de la décrire. |
| 3. Circonstances | Une brève description de ce qui s'est passé, et la cause si elle est connue. |
| 4. Date de l'incident | La date ou la période où il a eu lieu, ou une approximation. |
| 5. Date de la découverte | La date ou la période où le festival en a pris connaissance. C'est de cette date que courent les cinq ans de conservation. |
| 6. Personnes touchées | Le nombre, ou une approximation, en distinguant celles qui résident au Québec. |
| 7. Évaluation du risque | Les éléments qui amènent à conclure qu'il existe ou non un risque de préjudice sérieux : sensibilité des renseignements, utilisations malveillantes possibles, conséquences appréhendées, probabilité d'utilisation préjudiciable. |
| 8. Avis donnés | Si le risque est sérieux : la date de l'avis à la Commission, la date des avis aux personnes concernées, et la mention de tout avis public avec sa raison. |
| 9. Mesures prises | Ce qui a été fait pour diminuer le risque de préjudice et pour éviter que la même chose se reproduise. |
| 10. Suivi interne | Hors règlement, mais utile : le responsable du dossier, la date de clôture et la date de destruction prévue du dossier. |

### La procédure, en six gestes

**Premier geste, l'alerte.** Toute personne de l'équipe qui soupçonne un accès, une utilisation ou une communication non autorisés, ou une perte de données, écrit dans l'heure au responsable de la protection. Le soupçon suffit : la loi parle de motifs de croire, pas de certitude.

**Deuxième geste, la limitation.** Le responsable prend sans attendre les mesures raisonnables pour diminuer le risque et empêcher que de nouveaux incidents de même nature se produisent. Selon le cas, il coupe l'accès compromis, il révoque les jetons et les clés, et il resserre la règle fautive.

**Troisième geste, l'inscription.** L'incident entre au registre dans les vingt-quatre heures, avec les colonnes 1 à 7 remplies, même si l'évaluation conclut à l'absence de préjudice sérieux.

**Quatrième geste, l'évaluation du risque.** Le responsable pèse la sensibilité du renseignement, les conséquences appréhendées de son utilisation et la probabilité qu'il serve à des fins préjudiciables. Les allergies et les notes médicales de nos bénévoles sont des renseignements sensibles au sens de l'article 12 : leur fuite fait présumer le préjudice sérieux.

**Cinquième geste, les avis.** Si le préjudice sérieux est plausible, deux avis partent avec diligence. Celui à la Commission se fait par écrit et contient les éléments prévus au règlement, dont le nom du festival, son numéro d'entreprise du Québec, les coordonnées de la personne à contacter et le nombre de personnes concernées qui résident au Québec. Celui aux personnes touchées contient notamment les mesures qu'elles devraient prendre pour se protéger et l'endroit où se renseigner davantage. Tout renseignement nouveau appris ensuite se transmet à la Commission.

**Sixième geste, la clôture.** Les colonnes 8 et 9 se remplissent, le dossier se garde cinq ans, et la mesure corrective entre au plan de sécurité pour que la même porte ne se rouvre pas.

Le formulaire de déclaration de la Commission se trouve sur son site. Il vaut la peine de le préparer une fois à blanc, avec le nom du festival et le numéro d'entreprise déjà remplis, pour ne pas avoir à le chercher un soir de crise.

Références : *Loi sur la protection des renseignements personnels dans le secteur privé*, articles 3.5 à 3.8 <https://www.legisquebec.gouv.qc.ca/fr/document/lc/P-39.1> et *Règlement sur les incidents de confidentialité* <https://www.legisquebec.gouv.qc.ca/fr/document/rc/A-2.1,%20r.%203.1>

---

## Les constats écartés, requalifiés ou fusionnés

Un rapport de conformité vaut par ce qu'il retire autant que par ce qu'il ajoute. Voici les arbitrages faits entre les cinq audits.

**Les doublons fusionnés.** Cinq constats revenaient dans trois ou quatre rapports à la fois : la politique de confidentialité incomplète, l'absence de responsable publié, la sortie des renseignements hors Québec, l'absence de durées de conservation, et les 965 comptes importés. Chacun n'apparaît qu'une fois ici, avec la meilleure preuve des cinq versions.

**La contradiction sur la publicité, tranchée.** Un rapport recommandait de s'en remettre à une plateforme de consentement certifiée par Google, un autre de bloquer le script nous-mêmes. L'exigence de plateforme certifiée de Google vise l'Europe, le Royaume-Uni et la Suisse, pas le Québec, et Google écrit lui-même que ses partenaires restent juridiquement responsables des outils qu'ils utilisent pour recueillir le consentement. Le blocage se fait donc chez nous, et il n'est délégable à personne.

**Une erreur de fondement juridique, corrigée.** Trois rapports invoquaient l'article 9.1, celui du plus haut niveau de confidentialité par défaut, à propos des témoins. Le deuxième alinéa de cet article exclut expressément les paramètres de confidentialité d'un témoin de connexion. Ce sont donc les articles 8, 8.1 et 14 qui gouvernent les témoins, et non l'article 9.1. Ce dernier reste parfaitement applicable là où un rapport l'a bien employé, c'est-à-dire à la visibilité par défaut de la fiche au registre et au défaut de partage des photos, qui sont de vrais paramètres de confidentialité d'un service.

**Une apparente contradiction sur les témoins, dissipée.** Un rapport écrit qu'un témoin est déposé avant tout clic, un autre que le site n'en dépose aucun avant consentement. Les deux disent vrai. Le témoin déposé avant tout clic vient du domaine `doubleclick.net`, donc d'un tiers, tandis que le site lui-même ne pose aucun témoin de son propre domaine avant consentement. La distinction compte pour la correction, puisqu'un témoin tiers déjà posé ne peut pas être effacé depuis notre domaine.

**Un écart de chiffres, arbitré.** Un rapport annonce 957 comptes jamais utilisés sur 1 028, un autre 929 sur les 1 000 premiers. Ce sont deux échantillons différents du même fait. Le document retient « environ 960 comptes sur 1 028 ».

**Un constat volontairement rétrogradé.** L'écriture non authentifiée des compteurs de visites a été signalée comme un trou de sécurité. Le contenu de cette collection est agrégé et ne contient aucun renseignement personnel, ce qui limite beaucoup la portée. Il reste une porte d'écriture ouverte dans la base qui porte, ailleurs, les mille comptes du site, et à ce titre elle se ferme, mais elle ne passe pas devant les corrections qui touchent des personnes.

---

## L'ordre de travail

**Cette semaine.** Retirer la phrase de conformité et ajouter le lien vers la politique. Masquer les fiches importées du registre. Retirer le cadre de dons de la page des commanditaires. Supprimer la clé d'accès temporaire. Corriger le défaut de partage des photos. Ces cinq gestes sont courts et retirent la plus grosse part du risque immédiat.

**Ce mois-ci.** Bloquer la publicité avant consentement et rendre le refus effectif. Séparer les finalités et ouvrir le retrait du consentement. Récrire la politique de confidentialité. Nommer et publier le responsable. Poser la mention de collecte sous chaque formulaire.

**Avant la prochaine édition.** Écrire la politique de gouvernance et la publier. Produire les deux évaluations des facteurs relatifs à la vie privée et classer les ententes écrites. Ouvrir le registre des incidents. Bâtir la suppression de compte et l'export des renseignements. Demander l'âge à l'inscription. Aligner les règles du stockage sur celles de la base. Restreindre la clé de navigateur et activer App Check. Appliquer la grille de conservation par une tâche mensuelle.

---

## Annexe : les corrections de code, dans l'ordre

Cette annexe reprend les corrections techniques seulement, rangées dans l'ordre où il faut les appliquer. Chaque ligne nomme le fichier et le geste. Le détail de chaque correction figure dans les sections précédentes.

1. `src/content.ts`, lignes 249 et 254. Retirer « Conforme à la Loi 25 du Québec » et « Quebec Law 25 compliant », et nommer Google, Meta et Zeffy dans le texte de la bannière.
2. `src/components/layout/ConsentBanner.tsx`, autour de la ligne 54. Ajouter un lien vers `/politique-de-confidentialite` dans le corps de la bannière.
3. `src/firebase/ordre.ts`, fonction `listerMembres`, et `firestore.rules`, règle de lecture de `/membres/{uid}`. Exclure les fiches portant l'étiquette « importé », ou le champ `importe`, tant que la personne ne s'est pas connectée elle-même.
4. `src/pages/CommanditairesPage.tsx`, ligne 306. Retirer l'iframe Zeffy, ou la passer derrière un bouton. Le lien externe de la ligne 295 reste.
5. `src/components/compte/PhotosPanel.tsx`, ligne 87. Remplacer la valeur initiale `'publique'` par `'privee'`.
6. Nouveau fichier `src/lib/consentement.ts`. Sortir la décision de consentement du composant de bannière, avec un objet `{ mesure, publicite, tiers }`, un horodatage et la version du texte accepté, et exposer une fonction de lecture, une d'écriture et une d'effacement.
7. `index.html`, lignes 30 à 41. Retirer la balise du script AdSense et le commentaire qui interdit le blocage maison. Ajouter la balise meta `google-adsense-account` après avoir confirmé la méthode de vérification dans le compte AdSense.
8. `src/components/layout/ConsentBanner.tsx`, fonction `choose`. Faire dépendre du nouveau module l'injection d'AdSense, l'appel à `enableAnalytics()` et celui à `loadMetaPixel()`, et recharger la page sur un refus qui suit une acceptation.
9. `src/components/mur/PubMur.tsx` et `src/components/jeux/PubDebutPartie.tsx`. Ne monter les blocs d'annonces que si la finalité « publicité » est acceptée.
10. `src/components/layout/ConsentBanner.tsx`, corps de la bannière. Trois interrupteurs éteints par défaut, deux boutons de même graisse et de même contraste, et le nouveau format de stockage.
11. `src/components/layout/Footer.tsx`. Ajouter un lien « Témoins et vie privée » qui rouvre la bannière avec les choix courants, et retirer la ligne 79 qui écrit une adresse courriel dans la console.
12. `src/pages/PrivacyPage.tsx`. Récrire la page au complet à partir du gabarit de la Commission, avec le tableau des catégories, les destinataires, la sortie hors Québec, les jeunes, les cinq droits réels, le responsable, la date d'entrée en vigueur et celle de la dernière mise à jour.
13. Créer un composant de mention de collecte, qui affiche une phrase et un lien, et le poser sous le bouton d'envoi de `src/pages/MariagesPage.tsx`, `src/pages/ChevauxPage.tsx`, `src/pages/GroupesPage.tsx`, `src/pages/MusicianApplicationPage.tsx`, `src/pages/VendorApplicationPage.tsx`, `src/pages/WelcomePage.tsx`, `src/pages/ComptePage.tsx`, `src/pages/AccueilPage.tsx` et `src/pages/SignerCuisinePage.tsx`.
14. `src/pages/BenevolePage.tsx`, lignes 790 et 857, et `src/content.ts` ligne 16. Remplacer l'adresse Gmail par l'adresse dédiée du domaine, et publier le titre et les coordonnées du responsable.
15. `src/App.tsx`, composant `Footing` lignes 296 à 309. Sortir `<ConsentBanner />` du pied de page et le monter au-dessus du routeur, pour qu'il couvre aussi `/admin`.
16. `storage.rules`, lignes 50, 64, 181 et 190. Remplacer `allow read: if true;` par une lecture qui suit la base : le propriétaire et l'équipe pour les photos privées, un compte connecté pour le mur, le Souk et le Commerce.
17. `src/contexts/AuthContext.tsx`, autour de la ligne 205. Envoyer le courriel de vérification à la création d'un compte par mot de passe, et demander l'âge avant la création du compte, avec un consentement parental sous quatorze ans.
18. `src/components/compte/ReglagesProfil.tsx`. Ajouter l'interrupteur « Paraître au registre de l'Ordre », éteint par défaut, écrit dans la fiche et lu par la règle de lecture.
19. `src/components/compte/FicheMembre.tsx` et une nouvelle fonction infonuagique. Ajouter « Télécharger mes renseignements » et « Fermer mon compte », avec l'attestation de suppression exigée par l'article 35.
20. `src/components/layout/Footer.tsx`, fonction d'envoi de l'infolettre. Séparer l'inscription à la liste de l'ouverture d'un compte, et enregistrer dans `src/firebase/newsletter.ts` la date du consentement, le texte exact affiché et la version de la politique, en élargissant la règle correspondante de `firestore.rules`.
21. `functions/index.js`, fonction de désabonnement autour de la ligne 1674. Passer `unsubscribed` à vrai sur la fiche de la collection `newsletter`, en plus de l'écriture dans la collection des désabonnements.
22. `index.html`, lignes 46 à 63, et `src/index.css`. Héberger les quatre familles de polices en local et supprimer les appels à Google Fonts.
23. `src/pages/OrbHomePage.tsx`, ligne 1382. Passer le lecteur du film sur `youtube-nocookie.com` et ajouter une ligne d'avertissement sous le lecteur.
24. `functions/index.js`, lignes 284, 621, 1072, 1077, 1122, 1156, 1667 et 1682, et `src/pages/BenevolePage.tsx` ligne 208. Retirer les adresses courriel en clair des journaux, et régler la rétention du seau de journaux à trente jours.
25. `firestore.rules`, règle de `siteStats` autour de la ligne 1013. Exiger au minimum un compte connecté et borner les incréments, ou faire passer l'écriture par une fonction serveur comme c'est déjà le cas pour les votes du mur.
26. `firestore.rules`, règles de lecture des parties de tafl et de dés, lignes 291 et 587. Permettre la lecture d'une partie par son identifiant sans permettre la requête de collection non authentifiée.
27. `src/pages/photosPubliques` et `firestore.rules` ligne 902. Ouvrir la suppression d'une photo à la personne qui l'a envoyée, par une fonction qui efface le document et le fichier ensemble.
28. Nouvelle fonction planifiée mensuelle dans `functions/index.js`. Appliquer la grille de conservation approuvée : destruction ou anonymisation de ce qui a dépassé sa date, avec un journal de ce qui a été détruit.

