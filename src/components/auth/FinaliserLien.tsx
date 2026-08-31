import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Check, Loader2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { messagePourCode, messageAuth } from '../../lib/authErreurs';

// L'écran d'atterrissage du lien de connexion reçu par courriel.
//
// Il paraît par-dessus tout le site dès que l'adresse porte un lien
// Firebase (`?mode=signIn&oobCode=…`), et il ne disparaît qu'une fois la
// session ouverte. Il remplace le `window.prompt` d'avant, que les
// navigateurs de téléphone et les fureteurs intégrés aux applications de
// courriel avalaient sans rien afficher : la personne cliquait sur son
// lien, revenait sur le site, et restait déconnectée sans un mot
// d'explication.
//
// Trois moments : la vérification, la demande de l'adresse quand le lien
// s'ouvre ailleurs que là où il a été demandé, et l'erreur, avec de quoi
// s'en faire envoyer un neuf sans quitter la page.

const T = {
  FR: {
    titreVerif: 'Nous ouvrons votre compte',
    sousVerif: 'Un instant, le lien se vérifie.',
    titreCourriel: 'Confirmez votre courriel',
    sousCourriel: 'Ce lien s’ouvre sur un autre appareil ou un autre navigateur que celui d’où il a été demandé. Retapez l’adresse qui l’a reçu et vous entrez.',
    titreErreur: 'Ce lien ne s’ouvre plus',
    champ: 'Courriel',
    place: 'vous@exemple.ca',
    valider: 'Terminer la connexion',
    valideEnCours: 'Vérification…',
    renvoyer: 'M’envoyer un nouveau lien',
    renvoiEnCours: 'Envoi…',
    titreRenvoye: 'Lien envoyé',
    sousRenvoye: 'Ouvrez votre boîte de courriel et cliquez sur le lien. Il vaut une heure.',
    fermer: 'Fermer',
    aria: 'Fermer',
  },
  EN: {
    titreVerif: 'Opening your account',
    sousVerif: 'One moment, the link is being checked.',
    titreCourriel: 'Confirm your email',
    sousCourriel: 'This link is opening on a different device or browser than the one it was asked from. Type the address that received it and you are in.',
    titreErreur: 'This link no longer opens',
    champ: 'Email',
    place: 'you@example.com',
    valider: 'Finish signing in',
    valideEnCours: 'Checking…',
    renvoyer: 'Send me a new link',
    renvoiEnCours: 'Sending…',
    titreRenvoye: 'Link sent',
    sousRenvoye: 'Open your inbox and click the link. It is good for one hour.',
    fermer: 'Close',
    aria: 'Close',
  },
} as const;

const FinaliserLien: React.FC = () => {
  const { lienEtat, lienCode, finaliserLien, abandonnerLien, sendMagicLink } = useAuth();
  const { lang } = useUI();
  const t = T[lang];
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [renvoye, setRenvoye] = useState(false);
  const [erreurLocale, setErreurLocale] = useState('');

  const ouvert = lienEtat !== 'aucun';
  const message = lienCode ? messagePourCode(lienCode, lang) : '';

  const onValider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErreurLocale('');
    await finaliserLien(email);
    setBusy(false);
  };

  const onRenvoyer = async () => {
    if (busy) return;
    if (!email.includes('@')) { setErreurLocale(messagePourCode('auth/missing-email', lang)); return; }
    setBusy(true); setErreurLocale('');
    try { await sendMagicLink(email); setRenvoye(true); }
    catch (e2) { setErreurLocale(messageAuth(e2, lang)); }
    setBusy(false);
  };

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[106] flex items-start justify-center px-4 py-6 overflow-y-auto bg-midnight-deep/90 backdrop-blur-md"
          role="dialog" aria-modal="true"
        >
          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="relative my-auto glass-deep rounded-lg-card p-7 md:p-9 w-full max-w-md text-ivory text-center"
          >
            {lienEtat !== 'verification' && (
              <button type="button" onClick={abandonnerLien} aria-label={t.aria}
                className="absolute top-4 right-4 text-ivory-soft hover:text-brass transition">
                <X size={20} />
              </button>
            )}

            {renvoye ? (
              <>
                <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mx-auto mb-5">
                  <Check size={26} className="text-brass" />
                </div>
                <h2 className="font-display title-medieval text-2xl text-ivory mb-2">{t.titreRenvoye}</h2>
                <p className="font-editorial text-ivory-soft">{t.sousRenvoye}</p>
                <p className="font-editorial text-brass mt-1">{email}</p>
              </>
            ) : lienEtat === 'verification' ? (
              <>
                <Loader2 size={30} className="text-brass mx-auto mb-5 animate-spin" />
                <h2 className="font-display title-medieval text-2xl text-ivory mb-2">{t.titreVerif}</h2>
                <p className="font-editorial italic text-sm text-ivory-soft">{t.sousVerif}</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mx-auto mb-5">
                  <Mail size={24} className="text-brass" />
                </div>
                <h2 className="font-display title-medieval text-2xl text-ivory mb-2">
                  {lienEtat === 'erreur' ? t.titreErreur : t.titreCourriel}
                </h2>
                <p className="font-editorial text-sm text-ivory-soft mb-5">
                  {lienEtat === 'erreur' ? message : t.sousCourriel}
                </p>

                <form onSubmit={onValider} className="text-left">
                  <label htmlFor="fmm-lien-courriel" className="block font-display title-medieval text-xs text-brass mb-1.5">
                    {t.champ}
                  </label>
                  <input id="fmm-lien-courriel" type="email" required autoFocus
                    value={email} onChange={(ev) => setEmail(ev.target.value)}
                    placeholder={t.place} autoComplete="email" inputMode="email"
                    className="w-full mb-3 bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />

                  {lienEtat === 'courrielRequis' && (
                    <button type="submit" disabled={busy}
                      className="w-full px-5 py-2.5 mb-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
                      {busy ? t.valideEnCours : t.valider}
                    </button>
                  )}

                  <button type="button" onClick={onRenvoyer} disabled={busy}
                    className="w-full px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                    {busy ? t.renvoiEnCours : t.renvoyer}
                  </button>
                </form>

                {(erreurLocale || (lienEtat === 'courrielRequis' && message)) && (
                  <p className="mt-4 text-sm text-blush font-sans text-left">{erreurLocale || message}</p>
                )}

                <button type="button" onClick={abandonnerLien}
                  className="mt-5 text-[11px] font-sans uppercase tracking-widest text-ivory-soft hover:text-brass transition">
                  {t.fermer}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FinaliserLien;
