// Les messages d'erreur de la connexion, en français et en anglais.
//
// Firebase renvoie des codes (`auth/invalid-credential`) et des phrases
// anglaises destinées aux développeurs. Une personne qui essaie d'ouvrir
// son compte n'a rien à faire de « Firebase: Error (auth/…) ». Chaque
// code utile est donc traduit ici, une seule fois, et les deux écrans de
// connexion (la fenêtre et la page d'atterrissage du lien) y puisent.

export type Lang = 'FR' | 'EN';

/** Le code d'erreur de Firebase Auth, qu'il arrive par la propriété
 *  `code` ou noyé dans le message. */
export function codeAuth(e: unknown): string {
  const brut = e as { code?: string; message?: string } | null;
  return brut?.code || brut?.message?.match(/auth\/[a-z-]+/)?.[0] || '';
}

const MESSAGES: Record<string, { FR: string; EN: string }> = {
  'auth/invalid-credential': {
    FR: 'Ce mot de passe ne correspond pas. Votre compte a peut-être été ouvert avec Google, ou lors d’un achat de billet : demandez un lien de connexion.',
    EN: 'That password does not match. Your account may have been opened with Google, or when you bought a ticket: ask for a sign-in link.',
  },
  'auth/wrong-password': {
    FR: 'Ce mot de passe ne correspond pas. Demandez un lien de connexion et vous entrerez sans mot de passe.',
    EN: 'That password does not match. Ask for a sign-in link and you will get in without a password.',
  },
  'auth/user-not-found': {
    FR: 'Aucun compte ne porte ce courriel.',
    EN: 'No account carries that email address.',
  },
  'auth/email-already-in-use': {
    FR: 'Un compte existe déjà pour ce courriel. Demandez un lien de connexion : il vous ouvrira ce compte, et vous pourrez ensuite y poser un mot de passe.',
    EN: 'An account already exists for that email. Ask for a sign-in link: it opens that account, and you can set a password afterwards.',
  },
  'auth/weak-password': {
    FR: 'Mot de passe trop court : il faut au moins huit caractères.',
    EN: 'That password is too short: eight characters at least.',
  },
  'auth/invalid-email': {
    FR: 'Ce courriel n’est pas valide.',
    EN: 'That email address is not valid.',
  },
  // Firebase rend `auth/invalid-email` quand l'adresse retapée ne
  // correspond pas à celle qui a reçu le lien. Dire « courriel invalide »
  // envoie la personne corriger une faute de frappe qui n'existe pas.
  'lien/adresse-differente': {
    FR: 'Cette adresse n’est pas celle qui a reçu le lien. Retapez exactement l’adresse où le courriel est arrivé, ou faites-vous en envoyer un neuf.',
    EN: 'That is not the address the link was sent to. Type exactly the address where the email arrived, or have a fresh link sent.',
  },
  'auth/missing-email': {
    FR: 'Entrez d’abord votre courriel.',
    EN: 'Enter your email address first.',
  },
  'auth/user-disabled': {
    FR: 'Ce compte a été suspendu. Écrivez-nous et nous le rouvrirons.',
    EN: 'This account has been suspended. Write to us and we will reopen it.',
  },
  'auth/too-many-requests': {
    FR: 'Trop d’essais de suite. Attendez quelques minutes et recommencez.',
    EN: 'Too many attempts in a row. Wait a few minutes and try again.',
  },
  'auth/quota-exceeded': {
    FR: 'Le service est saturé pour l’instant. Réessayez dans quelques minutes.',
    EN: 'The service is saturated right now. Try again in a few minutes.',
  },
  'auth/network-request-failed': {
    FR: 'La connexion au réseau a échoué. Vérifiez votre lien internet et réessayez.',
    EN: 'The network request failed. Check your connection and try again.',
  },
  'auth/popup-closed-by-user': {
    FR: 'La fenêtre Google a été fermée avant la fin.',
    EN: 'The Google window was closed before it finished.',
  },
  'auth/popup-blocked': {
    FR: 'Votre navigateur a bloqué la fenêtre Google. Autorisez les fenêtres pour ce site, ou passez par le lien de connexion.',
    EN: 'Your browser blocked the Google window. Allow pop-ups for this site, or use the sign-in link instead.',
  },
  'auth/cancelled-popup-request': {
    FR: 'La fenêtre Google a été interrompue. Réessayez.',
    EN: 'The Google window was interrupted. Try again.',
  },
  'auth/operation-not-allowed': {
    FR: 'Cette méthode de connexion est fermée pour l’instant. Passez par Google, ou écrivez-nous.',
    EN: 'That sign-in method is closed for now. Use Google instead, or write to us.',
  },
  'auth/unauthorized-continue-uri': {
    FR: 'Le lien ne peut pas revenir sur cette adresse de site. Écrivez-nous, nous ouvrirons le passage.',
    EN: 'The link cannot return to this site address. Write to us and we will open the way.',
  },
  'auth/invalid-action-code': {
    FR: 'Ce lien a déjà servi ou il a expiré. Demandez-en un neuf, il arrive en une minute.',
    EN: 'This link has already been used, or it has expired. Ask for a fresh one, it arrives within a minute.',
  },
  'auth/expired-action-code': {
    FR: 'Ce lien a expiré. Demandez-en un neuf, il arrive en une minute.',
    EN: 'This link has expired. Ask for a fresh one, it arrives within a minute.',
  },
  'auth/invalid-continue-uri': {
    FR: 'L’adresse de retour du lien est invalide. Écrivez-nous.',
    EN: 'The link’s return address is invalid. Write to us.',
  },
};

const DEFAUT = {
  FR: 'La connexion n’a pas abouti. Réessayez, et écrivez-nous si ça persiste.',
  EN: 'Sign-in did not go through. Try again, and write to us if it persists.',
};

/** Le message à montrer pour une exception de Firebase Auth. */
export function messageAuth(e: unknown, lang: Lang): string {
  return (MESSAGES[codeAuth(e)] || DEFAUT)[lang];
}

/** Le message à montrer pour un code déjà extrait. */
export function messagePourCode(code: string, lang: Lang): string {
  return (MESSAGES[code] || DEFAUT)[lang];
}

/** Les codes qui veulent dire « ce compte existe, mais pas par ce
 *  chemin-là ». Le lien de connexion est alors la bonne porte : il
 *  marche pour un compte Google comme pour un compte importé de la
 *  billetterie, qui n'a aucun mot de passe. */
export const CODES_COMPTE_EXISTANT = new Set([
  'auth/email-already-in-use',
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/invalid-login-credentials',
  'auth/user-not-found',
]);
