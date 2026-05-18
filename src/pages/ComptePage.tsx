import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, LogOut, Mail, User as UserIcon, Save, ShoppingBag, HandHeart, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import {
  getUserProfile, upsertUserProfile,
  getBenevoleApp, getVendorApp,
  type AppStatus, type VendorStatus, type BenevoleApp, type VendorApp,
} from '../firebase/applications';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import MessageThread from '../components/vendor/MessageThread';

const STATUS_LABEL: Record<AppStatus | VendorStatus, { fr: string; en: string; tone: string }> = {
  pending:  { fr: 'En attente',      en: 'Pending',   tone: 'text-brass'       },
  accepted: { fr: 'Acceptée',        en: 'Accepted',  tone: 'text-emerald-400' },
  rejected: { fr: 'Refusée',         en: 'Declined',  tone: 'text-blush'       },
  waitlist: { fr: 'Liste d’attente', en: 'Wait list', tone: 'text-amber-300'   },
};

const ComptePage: React.FC = () => {
  useCaravanPage();
  const { user, loading, openSignIn, signOut, signInWithGoogle } = useAuth();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleErr, setGoogleErr] = useState<string | null>(null);
  const handleGoogle = async () => {
    setGoogleBusy(true); setGoogleErr(null);
    try { await signInWithGoogle(); }
    catch (e) { setGoogleErr(e instanceof Error ? e.message : String(e)); }
    finally { setGoogleBusy(false); }
  };

  const [phone, setPhone]               = useState('');
  const [displayName, setDisplayName]   = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedAt, setSavedAt]           = useState<number | null>(null);

  const [bApp, setBApp] = useState<BenevoleApp | null>(null);
  const [vApp, setVApp] = useState<VendorApp | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);

  // Hydrate profile + apps when user signs in.
  useEffect(() => {
    if (!user) { setBApp(null); setVApp(null); return; }
    setLoadingApps(true);
    (async () => {
      const [p, b, v] = await Promise.all([
        getUserProfile(user.uid),
        getBenevoleApp(user.uid),
        getVendorApp(user.uid),  // defaults to CURRENT_YEAR
      ]);
      setDisplayName(p?.displayName || user.displayName || '');
      setPhone(p?.phone || '');
      setBApp(b); setVApp(v);
      setLoadingApps(false);
    })();
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await upsertUserProfile({
        uid:         user.uid,
        email:       user.email || '',
        displayName: displayName.trim(),
        phone:       phone.trim(),
        lang,
      });
      setSavedAt(Date.now());
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }

  // ── Not signed in: pitch + sign-in CTA ──
  if (!user) {
    return (
      <main className="min-h-screen text-ivory">
        <SEO title={t.title} />
        <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
          <img decoding="async" fetchPriority="low" src="/wix/home/scene-cinematic.jpg" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep/90 via-midnight/90 to-midnight-deep" />
          <Brume />
          <div className="relative max-w-2xl mx-auto px-4 md:px-8 text-center">
            <Link to={addLocale('/', lang)} className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass mb-8 transition">
              <ArrowLeft size={14} /> {t.home}
            </Link>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs md:text-sm mb-4">{t.eyebrow}</p>
            <h1 className="font-display title-medieval text-4xl md:text-6xl text-ivory mb-5">{t.title}</h1>
            <div className="divider-brass w-24 mx-auto mb-5" />
            <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-8 max-w-xl mx-auto">{t.signedOutLead}</p>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center max-w-md mx-auto">
              <button
                onClick={handleGoogle}
                disabled={googleBusy}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 bg-ivory text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.13 4.13 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.62z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.71H.96v2.33A8.99 8.99 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.95 10.71A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.17.29-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A8.99 8.99 0 0 0 .96 4.96l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
                </svg>
                {googleBusy ? (lang === 'FR' ? 'Connexion…' : 'Connecting…') : (lang === 'FR' ? 'Continuer avec Google' : 'Continue with Google')}
              </button>
              <button onClick={openSignIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                {lang === 'FR' ? 'Autres options' : 'More options'} <ArrowUpRight size={14} />
              </button>
            </div>
            {googleErr && <p className="text-xs text-blush font-editorial italic mt-4">{googleErr}</p>}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={t.title} />
      <section className="relative pt-28 pb-12 md:pt-32 md:pb-16 overflow-hidden">
        <img decoding="async" fetchPriority="low" src="/wix/home/scene-cinematic.jpg" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep/90 via-midnight/90 to-midnight-deep" />
        <Brume />
        <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">
          <Link to={addLocale('/', lang)} className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass mb-6 transition">
            <ArrowLeft size={14} /> {t.home}
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-2">{t.eyebrow}</p>
              <h1 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-2">{displayName || user.email}</h1>
              <p className="font-editorial italic text-sm text-ivory-soft flex items-center gap-2">
                <Mail size={14} className="text-brass" /> {user.email}
              </p>
            </div>
            <button onClick={signOut}
              className="inline-flex items-center gap-2 px-4 py-2 border border-stone text-ivory font-sans text-xs uppercase tracking-wider hover:bg-ivory hover:text-midnight-deep transition rounded-card">
              <LogOut size={14} /> {t.signOut}
            </button>
          </div>

          {/* Quick-access bar — always shows "Apply for a kiosk" for any
              signed-in client. Surfaces the bénévole space prominently
              when accepted. */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {bApp?.status === 'accepted' && (
              <>
                <Link to={addLocale('/espace-benevole', lang)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                  <HandHeart size={14} /> {t.benevoleOpenSpace} <ArrowUpRight size={12} />
                </Link>
                <Link to={addLocale('/communaute', lang)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                  {lang === 'FR' ? 'Communauté' : 'Community'}
                </Link>
                <Link to={addLocale('/messages', lang)}
                  className="inline-flex items-center gap-2 px-4 py-2 border text-ivory-soft hover:border-brass hover:text-brass font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                  {lang === 'FR' ? 'Messages' : 'Messages'}
                </Link>
              </>
            )}
            {/* Kiosk CTA — label adapts to vendor application state. */}
            <Link
              to={addLocale('/marche/inscription', lang)}
              className={
                vApp
                  ? 'inline-flex items-center gap-2 px-4 py-2 border border-amber-300/45 text-amber-200 hover:bg-amber-300/10 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card'
                  : 'inline-flex items-center gap-2 px-5 py-2.5 bg-amber-300/15 border border-amber-300/55 text-amber-200 hover:bg-amber-300/25 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card'
              }
            >
              <ShoppingBag size={14} />
              {vApp
                ? (vApp.status === 'accepted' ? t.vendorManageKiosk : t.vendorEdit)
                : t.vendorApplyQuick}
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative py-12 md:py-16 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-6 md:gap-8">

          {/* Profile */}
          <form onSubmit={saveProfile} className="lg:col-span-5 glass-light rounded-lg-card p-7 md:p-8 self-start">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-2">
              <UserIcon size={12} className="inline mr-1.5 -mt-0.5" />{t.profileEyebrow}
            </p>
            <h2 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-5">{t.profileTitle}</h2>
            <label className="block mb-4">
              <span className="block font-display title-medieval text-xs text-brass mb-1.5">{t.displayName}</span>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
            </label>
            <label className="block mb-5">
              <span className="block font-display title-medieval text-xs text-brass mb-1.5">{t.phone}</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </label>
            <button type="submit" disabled={savingProfile}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
              <Save size={14} /> {savingProfile ? t.saving : t.save}
            </button>
            {savedAt && (
              <p className="text-xs font-editorial italic text-brass mt-3 text-center">{t.saved}</p>
            )}
          </form>

          {/* Applications */}
          <div className="lg:col-span-7 space-y-6">
            <ApplicationCard
              icon={HandHeart}
              eyebrow={t.benevoleEyebrow}
              title={t.benevoleTitle}
              loading={loadingApps}
              app={bApp}
              ctaApply={t.benevoleApply}
              ctaEdit={t.benevoleEdit}
              href={addLocale('/benevole', lang)}
              acceptedCta={{ label: t.benevoleOpenSpace, href: addLocale('/espace-benevole', lang) }}
              statusLabel={(s) => STATUS_LABEL[s][lang === 'FR' ? 'fr' : 'en']}
              statusTone={(s) => STATUS_LABEL[s].tone}
              none={t.benevoleNone}
              lang={lang}
            />
            <ApplicationCard
              icon={ShoppingBag}
              eyebrow={t.vendorEyebrow}
              title={t.vendorTitle}
              loading={loadingApps}
              app={vApp}
              ctaApply={t.vendorApply}
              ctaEdit={t.vendorEdit}
              href={addLocale('/marche/inscription', lang)}
              acceptedCta={{ label: t.vendorManageKiosk, href: addLocale('/marche/inscription', lang) }}
              statusLabel={(s) => STATUS_LABEL[s][lang === 'FR' ? 'fr' : 'en']}
              statusTone={(s) => STATUS_LABEL[s].tone}
              none={t.vendorNone}
              lang={lang}
            />
          </div>

          {/* ── Marchand ↔ FMM messaging ── */}
          {user && vApp && (
            <div className="mt-10 glass-light rounded-lg-card p-6 md:p-7">
              <MessageThread
                vendorUid={user.uid}
                currentUid={user.uid}
                currentName={user.displayName || vApp.contact || 'Marchand'}
                currentRole="vendor"
                lang={lang}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

interface AppCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  eyebrow: string; title: string;
  loading: boolean;
  app: { status: AppStatus | VendorStatus; updatedAt?: any } | null;
  ctaApply: string; ctaEdit: string;
  href: string;
  /** Optional second CTA shown only when app.status === 'accepted' (e.g. open the bénévole space). */
  acceptedCta?: { label: string; href: string };
  statusLabel: (s: AppStatus | VendorStatus) => string;
  statusTone: (s: AppStatus | VendorStatus) => string;
  none: string;
  lang: 'FR' | 'EN';
}
const ApplicationCard: React.FC<AppCardProps> = ({ icon: Icon, eyebrow, title, loading, app, ctaApply, ctaEdit, href, acceptedCta, statusLabel, statusTone, none }) => (
  <motion.article
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
    className="glass-light rounded-lg-card p-6 md:p-7"
  >
    <div className="flex items-start gap-4">
      <div className="w-11 h-11 rounded-card bg-brass/15 border border-brass/40 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-brass" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-xs mb-1">{eyebrow}</p>
        <h3 className="font-display title-medieval text-xl text-ivory mb-2">{title}</h3>
        {loading ? (
          <p className="font-editorial italic text-sm text-ivory-soft">…</p>
        ) : app ? (
          <>
            <p className={`font-display title-medieval text-sm mb-3 ${statusTone(app.status)}`}>
              <AlertCircle size={12} className="inline mr-1.5 -mt-0.5" />
              {statusLabel(app.status)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {acceptedCta && app.status === 'accepted' && (
                <Link to={acceptedCta.href}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                  {acceptedCta.label} <ArrowUpRight size={14} />
                </Link>
              )}
              <Link to={href}
                className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-brass hover:text-brass-soft transition">
                {ctaEdit} <ArrowUpRight size={14} />
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="font-editorial italic text-sm text-ivory-soft mb-3">{none}</p>
            <Link to={href}
              className="inline-flex items-center gap-2 px-4 py-2 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
              {ctaApply} <ArrowUpRight size={14} />
            </Link>
          </>
        )}
      </div>
    </div>
  </motion.article>
);

const inputCls = 'w-full bg-midnight-deep/50 border border-ivory-soft/20 px-3.5 py-3 sm:py-2.5 text-base sm:text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card';

const FR = {
  home: 'Accueil', eyebrow: 'Mon compte', title: 'Mon espace FMM',
  signedOutLead: 'Connectez-vous pour postuler comme bénévole, marchand, ou suivre le statut de votre dossier.',
  signIn: 'Se connecter', signOut: 'Déconnexion',
  profileEyebrow: 'Profil', profileTitle: 'Vos informations',
  displayName: 'Nom affiché', phone: 'Téléphone',
  save: 'Enregistrer', saving: 'Enregistrement…', saved: 'Enregistré.',
  benevoleEyebrow: 'Application bénévole', benevoleTitle: 'Devenir bénévole',
  benevoleApply: 'Postuler', benevoleEdit: 'Voir / modifier ma candidature',
  benevoleOpenSpace: 'Ouvrir mon espace bénévole',
  benevoleNone: 'Aucune candidature pour le moment.',
  vendorEyebrow: 'Application kiosque', vendorTitle: 'Inscrire mon kiosque',
  vendorApply: 'S’inscrire', vendorEdit: 'Voir / modifier mon inscription',
  vendorApplyQuick: 'Postuler comme marchand',
  vendorManageKiosk: 'Gérer mon kiosque',
  vendorNone: 'Aucune inscription kiosque pour le moment.',
};
const EN = {
  home: 'Home', eyebrow: 'My account', title: 'My FMM space',
  signedOutLead: 'Sign in to apply as a volunteer or vendor, or to track your application status.',
  signIn: 'Sign in', signOut: 'Sign out',
  profileEyebrow: 'Profile', profileTitle: 'Your information',
  displayName: 'Display name', phone: 'Phone',
  save: 'Save', saving: 'Saving…', saved: 'Saved.',
  benevoleEyebrow: 'Volunteer application', benevoleTitle: 'Become a volunteer',
  benevoleApply: 'Apply', benevoleEdit: 'View / edit my application',
  benevoleOpenSpace: 'Open my volunteer space',
  benevoleNone: 'No application yet.',
  vendorEyebrow: 'Vendor application', vendorTitle: 'Register my kiosk',
  vendorApply: 'Sign up', vendorEdit: 'View / edit my registration',
  vendorApplyQuick: 'Apply as a merchant',
  vendorManageKiosk: 'Manage my kiosk',
  vendorNone: 'No vendor registration yet.',
};

export default ComptePage;
