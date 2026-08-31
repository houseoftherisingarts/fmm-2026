import React, { useState } from 'react';
import { EDITIONS_FESTIVAL, retenirLesAnnees, anneesRetenues } from '../../firebase/ordre';
import { retenirLeCode, codeRetenu } from '../../firebase/parrainage';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Check, KeyRound, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { messageAuth, codeAuth, CODES_COMPTE_EXISTANT } from '../../lib/authErreurs';

// Multi-provider sign-in / sign-up modal: Google + email/password
// (login OR account creation) + magic link. Triggered via
// useAuth().openSignIn(). Closes on successful authentication.
// Les phrases qui rapportent un résultat à la personne. Les libellés du
// formulaire restent en français pour l'instant; ce qui suit une erreur
// ou un envoi, non : c'est exactement là qu'une inscription se perd.
const TEXTES = {
  FR: {
    errCourriel: 'Ce courriel n’est pas valide.',
    errCourt: 'Le mot de passe doit contenir au moins huit caractères.',
    errPasPareil: 'Les deux mots de passe ne sont pas les mêmes.',
    errCourrielDabord: 'Entrez d’abord votre courriel.',
    lienTitre: 'Lien envoyé',
    lienEnvoyeA: 'Un lien de connexion vient de partir vers',
    lienConsigne: 'Ouvrez votre boîte de courriel et cliquez sur le lien. Il vaut une heure.',
    resetEnvoye: 'Courriel de réinitialisation envoyé à',
    aideCompte: 'Le lien de connexion ouvre ce compte sans mot de passe, même s’il a été créé avec Google ou à l’achat d’un billet. Vous pourrez poser un mot de passe ensuite, depuis votre fiche.',
    lienRecevoir: 'Recevoir un lien de connexion',
    lienEnvoi: 'Envoi…',
    avecGoogle: 'Se connecter avec Google',
    courrielEnvoye: 'Courriel envoyé',
    definirMdp: 'Définir un mot de passe',
  },
  EN: {
    errCourriel: 'That email address is not valid.',
    errCourt: 'The password needs at least eight characters.',
    errPasPareil: 'The two passwords are not the same.',
    errCourrielDabord: 'Enter your email address first.',
    lienTitre: 'Link sent',
    lienEnvoyeA: 'A sign-in link has just gone out to',
    lienConsigne: 'Open your inbox and click the link. It is good for one hour.',
    resetEnvoye: 'Reset email sent to',
    aideCompte: 'The sign-in link opens this account without a password, even if it was created with Google or when a ticket was bought. You can set a password afterwards, from your profile.',
    lienRecevoir: 'Get a sign-in link',
    lienEnvoi: 'Sending…',
    avecGoogle: 'Sign in with Google',
    courrielEnvoye: 'Email sent',
    definirMdp: 'Set a password',
  },
} as const;

const SignInModal: React.FC = () => {
  const {
    signInModalOpen, closeSignIn,
    signInWithGoogle, signInWithPassword, signUpWithPassword,
    sendMagicLink, resetPassword,
  } = useAuth();
  const { lang } = useUI();
  const t = TEXTES[lang];
  // Top-level mode: log-in vs create-new-account.
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  // Inside sign-in mode, the user picks password or magic-link.
  const [tab, setTab]   = useState<'password' | 'magic'>('password');
  // Form fields, shared between modes where it makes sense.
  const [displayName, setDisplayName] = useState('');
  // Le code de parrainage, saisi à l'inscription ou reçu dans le lien
  // (?parrain=CODE). Il attend dans la session jusqu'à la création du
  // compte (Alex, 2026-08-28).
  // Les éditions où la personne était présente (Alex, 2026-08-28) :
  // cochées à l'inscription, elles valent le badge du vétéran à partir
  // de deux.
  const [annees, setAnnees] = useState<number[]>(() => anneesRetenues());
  const basculerAnnee = (an: number) => {
    setAnnees((liste) => {
      const suite = liste.includes(an) ? liste.filter((x) => x !== an) : [...liste, an];
      retenirLesAnnees(suite);
      return suite;
    });
  };

  const [codeParrain, setCodeParrain] = useState(() => {
    const url = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('parrain') : null;
    if (url) { retenirLeCode(url); return url.toUpperCase().slice(0, 8); }
    return codeRetenu();
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);
  // Error state holds both the user-facing message AND the raw Firebase
  // code, so the modal can branch on specific scenarios (e.g. show a
  // "this account uses Google, sign in with Google or reset password"
  // helper when the signup hits email-already-in-use or sign-in hits
  // invalid-credential).
  const [err, setErr] = useState<{ message: string; code: string } | null>(null);

  const reset = () => {
    setDisplayName(''); setEmail(''); setPassword(''); setConfirm(''); setShowPw(false);
    setLinkSent(false); setResetSent(false); setErr(null); setBusy(false);
    setTab('password'); setMode('signin');
  };

  const setErrFromException = (e: unknown) => {
    setErr({ message: messageAuth(e, lang), code: codeAuth(e) });
  };
  const setLocalErr = (message: string) => setErr({ message, code: '' });

  const onGoogle = async () => {
    setBusy(true); setErr(null);
    try { await signInWithGoogle(); reset(); }
    catch (e) { setErrFromException(e); setBusy(false); }
  };

  const onPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || password.length === 0) return;
    setBusy(true); setErr(null);
    try { await signInWithPassword(email, password); reset(); }
    catch (e2) { setErrFromException(e2); setBusy(false); }
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setLocalErr(t.errCourriel); return; }
    if (password.length < 8)  { setLocalErr(t.errCourt); return; }
    if (password !== confirm) { setLocalErr(t.errPasPareil); return; }
    setBusy(true); setErr(null);
    try { await signUpWithPassword(email, password, displayName); reset(); }
    catch (e2) { setErrFromException(e2); setBusy(false); }
  };

  const onMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setBusy(true); setErr(null);
    try { await sendMagicLink(email); setLinkSent(true); }
    catch (e2) { setErrFromException(e2); }
    setBusy(false);
  };

  const onReset = async () => {
    if (!email.includes('@')) { setLocalErr(t.errCourrielDabord); return; }
    setBusy(true); setErr(null);
    try { await resetPassword(email); setResetSent(true); }
    catch (e2) { setErrFromException(e2); }
    setBusy(false);
  };

  // Le compte existe, mais pas par le chemin que la personne vient
  // d'essayer : compte Google, ou compte ouvert d'office lors d'un achat
  // de billet, qui n'a aucun mot de passe. Le lien de connexion est la
  // seule porte qui marche dans tous ces cas, donc il passe en premier.
  const showRecoveryHelp = !!err && CODES_COMPTE_EXISTANT.has(err.code);

  // Le lien de connexion, demandé depuis le panneau de récupération.
  const onLienDepuisErreur = async () => {
    if (!email.includes('@')) { setLocalErr(t.errCourrielDabord); return; }
    setBusy(true);
    try { await sendMagicLink(email); setErr(null); setLinkSent(true); }
    catch (e2) { setErrFromException(e2); }
    setBusy(false);
  };

  // Switching modes resets the form-level error/state but keeps email
  // typed (so users don't re-enter it when bouncing between flows).
  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setErr(null); setLinkSent(false); setResetSent(false);
    setPassword(''); setConfirm(''); setShowPw(false);
    setTab('password');
  };

  return (
    <AnimatePresence>
      {signInModalOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          // `overflow-y-auto` + `items-start` + `my-auto` sur le panneau : le
          // formulaire d'inscription fait 923 px de haut, un téléphone en a 844.
          // Sans ça le haut de la fenêtre sortait de l'écran, sans moyen de
          // remonter, et les boutons du bas passaient sous le bandeau de
          // témoins (z-100), qui les rendait tout simplement incliquables.
          className="fixed inset-0 z-[105] flex items-start justify-center px-4 py-6 overflow-y-auto bg-midnight-deep/80 backdrop-blur-md"
          onClick={() => { closeSignIn(); reset(); }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="relative my-auto glass-deep rounded-lg-card p-7 md:p-9 w-full max-w-md text-ivory"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { closeSignIn(); reset(); }}
              className="absolute top-4 right-4 text-ivory-soft hover:text-brass transition" aria-label="Close">
              <X size={20} />
            </button>

            {linkSent ? (
              <div className="text-center pt-3">
                <div className="w-14 h-14 rounded-full bg-brass/15 border border-brass/40 flex items-center justify-center mx-auto mb-5">
                  <Check size={26} className="text-brass" />
                </div>
                <h2 className="font-display title-medieval text-2xl text-ivory mb-2">{t.lienTitre}</h2>
                <p className="font-editorial text-ivory-soft mb-2">
                  {t.lienEnvoyeA} <span className="text-brass">{email}</span>.
                </p>
                <p className="font-editorial italic text-sm text-ivory-soft">
                  {t.lienConsigne}
                </p>
              </div>
            ) : (
              <>
                {/* Mode toggle: Connexion ⟷ Inscription */}
                <div className="flex gap-1 mb-5 p-1 bg-midnight-deep/60 border border-ivory-soft/15 rounded-card">
                  {([
                    ['signin', 'Connexion'],
                    ['signup', 'Inscription'],
                  ] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => switchMode(k)}
                      className={`flex-1 px-3 py-2 font-sans uppercase tracking-wider text-[11px] font-semibold rounded-card transition ${mode === k ? 'bg-brass text-midnight-deep' : 'text-ivory-soft hover:text-ivory'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-2">
                  {mode === 'signup' ? 'Inscription' : 'Connexion'}
                </p>
                <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-2">
                  {mode === 'signup' ? 'Rejoindre la cour' : 'Bienvenue à la cour'}
                </h2>
                <p className="font-editorial italic text-sm text-ivory-soft mb-6">
                  {mode === 'signup'
                    ? 'Créez votre compte pour postuler comme bénévole, marchand, ou suivre votre dossier.'
                    : 'Connectez-vous pour postuler comme bénévole, marchand, ou consulter votre dossier.'}
                </p>

                {/* Google: shared between both modes */}
                <button
                  onClick={onGoogle}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-3 px-5 py-3 mb-5 bg-ivory text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.13 4.13 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.62z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.71H.96v2.33A8.99 8.99 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.95 10.71A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.17.29-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A8.99 8.99 0 0 0 .96 4.96l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
                  </svg>
                  {mode === 'signup' ? 'S’inscrire avec Google' : 'Continuer avec Google'}
                </button>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-ivory-soft/15" />
                  <span className="font-editorial italic text-xs text-stone uppercase tracking-widest">ou</span>
                  <div className="flex-1 h-px bg-ivory-soft/15" />
                </div>

                {mode === 'signin' ? (
                  <>
                    {/* Tabs: Password | Magic link */}
                    <div className="flex gap-1 mb-4 p-1 bg-midnight-deep/60 border border-ivory-soft/15 rounded-card">
                      {([
                        ['password', 'Mot de passe', KeyRound],
                        ['magic',    'Lien magique', Mail],
                      ] as const).map(([k, label, Icon]) => (
                        <button key={k} type="button" onClick={() => { setTab(k); setErr(null); }}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 font-sans uppercase tracking-wider text-[11px] font-semibold rounded-card transition ${tab === k ? 'bg-brass text-midnight-deep' : 'text-ivory-soft hover:text-ivory'}`}
                        >
                          <Icon size={12} /> {label}
                        </button>
                      ))}
                    </div>

                    {tab === 'password' ? (
                      <form onSubmit={onPassword}>
                        <label className="block font-display title-medieval text-xs text-brass mb-1.5">Courriel</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ca"
                          autoComplete="email"
                          className="w-full mb-3 bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />

                        <label className="block font-display title-medieval text-xs text-brass mb-1.5">Mot de passe</label>
                        <div className="relative mb-2">
                          <input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                            autoComplete="current-password"
                            className="w-full bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 pr-10 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />
                          <button type="button" onClick={() => setShowPw(!showPw)}
                            aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-ivory-soft hover:text-brass transition">
                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>

                        {resetSent ? (
                          <p className="text-xs font-editorial italic text-emerald-300 mb-3">
                            {t.resetEnvoye} {email}.
                          </p>
                        ) : (
                          <button type="button" onClick={onReset} disabled={busy}
                            className="text-[11px] font-sans uppercase tracking-widest text-ivory-soft hover:text-brass transition mb-3">
                            Mot de passe oublié ?
                          </button>
                        )}

                        <button type="submit" disabled={busy}
                          className="w-full mt-1 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
                          {busy ? 'Connexion…' : 'Se connecter'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={onMagic}>
                        <label className="block font-display title-medieval text-xs text-brass mb-1.5">
                          <Mail size={12} className="inline mr-1.5 -mt-0.5" />Lien magique par courriel
                        </label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ca"
                          autoComplete="email"
                          className="w-full mb-3 bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />
                        <button type="submit" disabled={busy}
                          className="w-full px-5 py-2.5 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                          {busy ? 'Envoi…' : 'Envoyer le lien'}
                        </button>
                      </form>
                    )}
                  </>
                ) : (
                  /* SIGN-UP FORM */
                  <form onSubmit={onSignUp}>
                    <span className="block font-display title-medieval text-xs text-brass mb-1.5">Vous étiez là en…</span>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {EDITIONS_FESTIVAL.map((an) => {
                        const coche = annees.includes(an);
                        return (
                          <button key={an} type="button" role="checkbox" aria-checked={coche} onClick={() => basculerAnnee(an)}
                            className="px-3 py-1.5 rounded-full font-sans text-[11px] tracking-[0.14em] transition-colors"
                            style={{ border: `1px solid ${coche ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.2)'}`, background: coche ? 'rgba(var(--sk-gilt-rgb),0.16)' : 'transparent', color: coche ? 'var(--sk-parchment)' : 'rgba(var(--sk-parchment-rgb),0.55)' }}>
                            {an}
                          </button>
                        );
                      })}
                    </div>

                    <label className="block font-display title-medieval text-xs text-brass mb-1.5">Code de parrainage</label>
                    <input type="text" value={codeParrain}
                      onChange={(e) => { const v = e.target.value.toUpperCase().slice(0, 8); setCodeParrain(v); retenirLeCode(v); }}
                      placeholder="Le code d’un ami (facultatif)"
                      autoComplete="off" spellCheck={false}
                      className="w-full mb-3 bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 text-sm font-sans tracking-[0.3em] text-ivory placeholder:text-stone placeholder:tracking-normal focus:border-brass focus:outline-none rounded-card" />

                    <label className="block font-display title-medieval text-xs text-brass mb-1.5">Nom affiché</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Votre nom (optionnel)"
                      autoComplete="name"
                      className="w-full mb-3 bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />

                    <label className="block font-display title-medieval text-xs text-brass mb-1.5">Courriel</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ca"
                      autoComplete="email"
                      className="w-full mb-3 bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />

                    <label className="block font-display title-medieval text-xs text-brass mb-1.5">Mot de passe</label>
                    <div className="relative mb-3">
                      <input type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Au moins 8 caractères"
                        autoComplete="new-password" minLength={8}
                        className="w-full bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 pr-10 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-ivory-soft hover:text-brass transition">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    <label className="block font-display title-medieval text-xs text-brass mb-1.5">Confirmer le mot de passe</label>
                    <input type={showPw ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Retapez votre mot de passe"
                      autoComplete="new-password"
                      className="w-full mb-4 bg-midnight-deep/60 border border-ivory-soft/20 px-3.5 py-2.5 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card" />

                    <button type="submit" disabled={busy}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
                      <UserPlus size={13} /> {busy ? 'Création…' : 'Créer mon compte'}
                    </button>
                  </form>
                )}

                {err && (
                  <div className="mt-4">
                    <p className="text-sm text-blush font-sans">{err.message}</p>
                    {showRecoveryHelp && (
                      <div
                        className="mt-3 p-3.5 rounded-card border"
                        style={{
                          background: 'rgba(var(--sk-glow-rgb), 0.06)',
                          borderColor: 'rgba(var(--sk-glow-rgb), 0.30)',
                        }}
                      >
                        <p className="font-editorial italic text-[12px] text-ivory-soft leading-snug mb-3">
                          {t.aideCompte}
                        </p>
                        <button
                          type="button"
                          onClick={onLienDepuisErreur}
                          disabled={busy}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 mb-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50"
                        >
                          <Mail size={11} />
                          {busy ? t.lienEnvoi : t.lienRecevoir}
                        </button>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={onGoogle}
                            disabled={busy}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-ivory text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50"
                          >
                            <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden>
                              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.13 4.13 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.62z"/>
                              <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.71H.96v2.33A8.99 8.99 0 0 0 9 18z"/>
                              <path fill="#FBBC05" d="M3.95 10.71A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.17.29-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z"/>
                              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A8.99 8.99 0 0 0 .96 4.96l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
                            </svg>
                            {t.avecGoogle}
                          </button>
                          <button
                            type="button"
                            onClick={onReset}
                            disabled={busy || resetSent}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold transition rounded-card disabled:opacity-50"
                          >
                            <Mail size={11} />
                            {resetSent ? t.courrielEnvoye : t.definirMdp}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom switch: quick "already have an account?" affordance */}
                <p className="mt-5 text-center font-editorial italic text-xs text-ivory-soft">
                  {mode === 'signup' ? (
                    <>Déjà un compte ?{' '}
                      <button type="button" onClick={() => switchMode('signin')}
                        className="text-brass hover:underline">Se connecter</button>
                    </>
                  ) : (
                    <>Pas encore de compte ?{' '}
                      <button type="button" onClick={() => switchMode('signup')}
                        className="text-brass hover:underline">S’inscrire</button>
                    </>
                  )}
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SignInModal;
