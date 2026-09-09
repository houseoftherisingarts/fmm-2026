# App mobile interne — FMM Inventaire

Coquille mobile pour l'inventaire du festival, usage interne seulement (pas de magasin d'applications). Elle ne contient aucune page : elle ouvre le site en ligne directement sur la section inventaire de l'admin (`https://www.festivalmedievaldemontpellier.org/admin/inventaire`), qui roule déjà en temps réel (Firestore `onSnapshot`). Un changement fait sur le site apparaît donc au téléphone sans rien reconstruire, pareil dans l'autre sens.

La connexion par courriel et mot de passe fonctionne dans la coquille. La connexion Google, qui ouvre normalement une fenêtre surgissante, peut ne pas fonctionner dans une WebView (Android) ou se comporter différemment sur iOS : prévoir le courriel/mot de passe comme méthode de secours pour l'équipe qui utilisera l'app.

## Installer sur Android

1. Sur le téléphone, ouvrir `https://www.festivalmedievaldemontpellier.org/app/fmm-inventaire.apk` et télécharger le fichier.
2. Android va demander d'autoriser l'installation depuis cette source (« sources inconnues » ou « installer des apps inconnues », selon la version) : accepter, l'app n'est pas sur le Play Store.
3. Ouvrir le fichier téléchargé pour installer. L'icône « FMM Inventaire » apparaît dans le tiroir d'applications.

C'est une signature de debug (pas de compte développeur Google Play) : Android peut avertir que l'app n'est pas vérifiée, c'est normal pour un usage interne.

## Installer sur iPhone (PWA, pas d'App Store)

Cette machine n'a pas Xcode (seulement les Command Line Tools) et un `.ipa` hors App Store demande un compte développeur Apple et une signature : impossible à produire ici. La solution qui marche sans rien installer :

1. Ouvrir `https://www.festivalmedievaldemontpellier.org/admin/inventaire` dans **Safari** sur l'iPhone (pas Chrome : le bouton n'existe que dans Safari).
2. Bouton **Partager** (le carré avec la flèche vers le haut).
3. **Sur l'écran d'accueil**.

L'icône « Inventaire » s'ajoute à l'écran d'accueil, s'ouvre plein écran (pas de barre d'adresse Safari) et pointe sur la même page en temps réel. C'est le fichier `public/manifest.webmanifest` (nom, icônes, couleurs) qui pilote cet écran.

## Rebâtir l'APK

```bash
export JAVA_HOME=/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME=/Users/lesalondesinconnus/Library/Android/sdk
export ANDROID_SDK_ROOT=/Users/lesalondesinconnus/Library/Android/sdk

npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
```

Le fichier sort à `android/app/build/outputs/apk/debug/app-debug.apk`. Copier ensuite vers `public/app/fmm-inventaire.apk` (c'est ce fichier que le lien de téléchargement du site sert) et vers le Bureau si Alex veut l'envoyer directement.

L'app pointe sur l'URL en ligne (`capacitor.config.ts`, `server.url`), pas sur un bundle local : rebâtir l'APK n'est nécessaire que si le nom, l'icône ou l'URL de la coquille changent, jamais pour un changement de contenu sur le site.

## Pour un vrai `.ipa` iPhone (hors PWA)

Il faudrait, en plus de ce qui est déjà prêt (`ios/` généré par Capacitor) :

- **Xcode** installé (pas seulement les Command Line Tools) sur une machine Mac.
- **CocoaPods** (`pod install` dans `ios/App/`) — absent sur cette machine, le dossier `ios/` existe mais ses dépendances natives n'ont pas été installées.
- Un **compte développeur Apple** (99 $ US/an) pour signer l'app.
- Une distribution par **TestFlight** (interne, jusqu'à 100 testeurs sans revue Apple) ou **ad hoc** (liste d'appareils enregistrés par UDID, sans passer par TestFlight).

D'ici là, la PWA (section précédente) couvre le besoin iPhone sans aucun de ces prérequis.
