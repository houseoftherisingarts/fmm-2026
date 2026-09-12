# Branchements du site FMM

Ce fichier tient la liste des clés et des comptes extérieurs dont le site a besoin pour fonctionner au complet, avec la marche à suivre pour chacun quand il manque. Il se lit avant de chercher pourquoi une section reste vide.

## Le fil Facebook de l'accueil (posé le 12 septembre 2026)

Chaque matin à six heures, la fonction `nouvellesFacebook` va lire les neuf dernières publications de la page Festival Médiéval Montpellier et les recopie dans le document Firestore `nouvelles/facebook`, que l'accueil épingle sur le tableau de bois sous les avis de la caravane. Le bouton « Nouvelles » de la barre descend jusque là.

Facebook ne laisse rien lire sans jeton, et c'est vérifié plutôt que supposé : le plugin public de la page ne rend plus que l'en-tête et le compte d'abonnés, la page elle-même renvoie un mur de connexion d'un kilo et demi, et l'API Graph refuse toute requête sans application. La seule porte fiable est donc un jeton de page tiré de l'API Graph, et il faut que ce soit toi qui le génères, parce que tu es administrateur de la page et que je ne le suis pas.

Tant que ce jeton n'est pas posé, la section montre une carte qui renvoie honnêtement à la page Facebook, et la fonction du matin écrit dans son journal qu'elle n'a rien à lire. Rien ne casse, mais rien ne se recopie non plus.

### Ce que tu fais, une seule fois, une dizaine de minutes

1. Va sur https://developers.facebook.com/apps et crée une application, en choisissant le type « Entreprise » (Business). Le nom importe peu, « Site FMM » fait l'affaire. L'application n'a pas besoin d'être publiée ni soumise à révision : une application en mode développement lit sans problème les pages dont tu es administrateur.
2. Ouvre l'explorateur de l'API Graph, https://developers.facebook.com/tools/explorer, choisis ton application en haut à droite, puis dans « Permissions » ajoute `pages_show_list`, `pages_read_engagement` et `pages_read_user_content`, et clique « Generate Access Token ». Facebook te demande de confirmer avec ton compte et de cocher la page du festival.
3. Le jeton qui apparaît est un jeton d'utilisateur qui meurt en une heure. Il faut le rendre long : dans la barre de l'explorateur, remplace la requête par `oauth/access_token?grant_type=fb_exchange_token&client_id=ID_APP&client_secret=SECRET_APP&fb_exchange_token=LE_JETON` (l'ID et le secret sont dans les réglages de base de l'application) et soumets, ce qui te rend un jeton valable soixante jours.
4. Colle ce jeton long dans le champ « Access Token » de l'explorateur, puis lance la requête `me/accounts`, qui liste tes pages avec, pour chacune, un champ `access_token` : celui de la page du festival est le jeton de page, et parce qu'il est tiré d'un jeton long, il n'expire pas.
5. Envoie-moi ce jeton de page (par message, jamais dans un fichier du dépôt), et je le pose dans le coffre du projet avec la commande ci-dessous. Si tu préfères le poser toi-même :

```bash
cd ~/Documents/Websites/FMM\ 2026
printf '%s' 'LE_JETON_DE_PAGE' > /tmp/jeton.txt
firebase functions:secrets:set FACEBOOK_PAGE_TOKEN --data-file /tmp/jeton.txt --project festivalmedieval
rm /tmp/jeton.txt
firebase deploy --only functions:nouvellesFacebook --project festivalmedieval
```

Le redéploiement est nécessaire parce qu'une fonction lit la version du secret qui existait au moment où elle a été déployée.

### Vérifier sans attendre demain matin

```bash
gcloud scheduler jobs run firebase-schedule-nouvellesFacebook-us-central1 --location us-central1 --project festivalmedieval
```

Trente secondes plus tard, l'accueil montre les publications. Si le tableau reste vide, le document `nouvelles/facebook` porte un champ `erreur` avec le message exact de Facebook, et le journal de la fonction dans la console Firebase dit la même chose.

### Ce que la fonction ne fait pas

Elle ne lit que ce que la page publie elle-même, jamais ce que des visiteurs écrivent sur son mur, et elle garde les publications d'hier si Facebook tombe en panne un matin, plutôt que de vider le tableau. Elle ne publie rien, ne commente rien et ne touche à aucun autre compte.
