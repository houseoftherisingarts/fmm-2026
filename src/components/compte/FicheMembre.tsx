import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowUpRight, LogOut, Mail, User as UserIcon, Save, ShoppingBag,
  HandHeart, AlertCircle, ShieldCheck, Users, Eye, Award, Swords, Ticket,
  Megaphone, MessageCircle, MapPin, Dices, Check, Camera,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBadges } from '../../contexts/BadgesContext';
import { addLocale } from '../../lib/locale';
import { avancement, suivreBadges } from '../../firebase/badges';
import {
  lireFiche, publierFiche, suivreMesAmities, demanderAmitie, accepterAmitie,
  estAmi, amitieEnAttente, rolesAffiches, LIBELLE_ROLE,
  type Amitie, type Membre,
} from '../../firebase/ordre';
import { suivreMesParties } from '../../firebase/tafl';
import { suivreMesAvis } from '../../firebase/avis';
import { ANNONCES } from '../../content/annonces';
import {
  getUserProfile, upsertUserProfile, getBenevoleApp, getVendorApp,
  type AppStatus, type VendorStatus, type BenevoleApp, type VendorApp,
} from '../../firebase/applications';
import SEO from '../SEO';
import Brume from '../Brume';
import MessageThread from '../vendor/MessageThread';
import AnnoncesPanel from './AnnoncesPanel';
import CoffreBillets from './CoffreBillets';
import SoutienPanel from './SoutienPanel';
import AvatarUpload from './AvatarUpload';
import SalonDesJeux from './SalonDesJeux';
import MesBadges from './MesBadges';
import MaFiche from './MaFiche';
import PhotosPanel from './PhotosPanel';

// Le dé de la vie est un vrai d20 en trois dimensions : il tire three.js
// derrière lui, donc il arrive à part, quand l'onglet s'ouvre.
const DeDeLaVie = lazy(() => import('../ordre/DeDeLaVie'));

// ─── La fiche d'un membre, une seule fois ────────────────────────────
// Alex, 2026-08-23 : la version publique d'un profil n'était pas la même
// page que l'espace de la personne. Elle l'est maintenant. Un seul rendu
// sert les deux : le même bandeau, la même photo, les mêmes chiffres,
// les mêmes onglets.
//
// Ce que le mode public retire : le dé de la vie, les boutons qui ne
// regardent que la personne (candidature, registre, kiosque, réglages,
// déconnexion), l'onglet des billets et tout ce qui touche à l'argent.
// Ce qui reste : la photo, le nom, les fonctions, la description, les
// badges, les amis, les parties et les avis décrochés, en lecture seule.

export type ModeFiche = 'prive' | 'public';

const ONGLETS_PRIVE  = ['profil', 'badges', 'jeux', 'billets', 'photos', 'collection'] as const;
const ONGLETS_PUBLIC = ['profil', 'badges', 'jeux', 'collection'] as const;
type Onglet = typeof ONGLETS_PRIVE[number];

const ICONE_ONGLET: Record<Onglet, React.ComponentType<{ size?: number; className?: string }>> = {
  profil: UserIcon, badges: Award, jeux: Swords, billets: Ticket,
  photos: Camera, collection: Megaphone,
};

const STATUS_LABEL: Record<AppStatus | VendorStatus, { fr: string; en: string; tone: string }> = {
  pending:  { fr: 'En attente',      en: 'Pending',   tone: 'text-brass'       },
  accepted: { fr: 'Acceptée',        en: 'Accepted',  tone: 'text-emerald-400' },
  // Un refus ne se dit pas au candidat : il ne peut rien en faire, et
  // la porte reste ouverte pour une nouvelle candidature (Alex,
  // 2026-08-23). L'équipe, elle, voit le vrai statut dans l'admin.
  rejected: { fr: 'À revoir',        en: 'To revisit', tone: 'text-brass'      },
  waitlist: { fr: 'Liste d’attente', en: 'Wait list', tone: 'text-amber-300'   },
};

interface Props {
  mode: ModeFiche;
  /** La personne dont on regarde la fiche. */
  uid: string;
  lang: 'FR' | 'EN';
  /** Le compte connecté, en mode privé seulement. */
  compte?: { uid: string; email?: string | null; displayName?: string | null } | null;
}

const FicheMembre: React.FC<Props> = ({ mode, uid, lang, compte }) => {
  const prive = mode === 'prive';
  const t = lang === 'FR' ? FR : EN;
  const { user: visiteur, isAdmin, signOut } = useAuth();

  // ── Les onglets, gardés dans l'URL (?onglet=badges) pour que le
  //    retour arrière du navigateur fonctionne comme partout ailleurs.
  const onglets: readonly Onglet[] = prive ? ONGLETS_PRIVE : ONGLETS_PUBLIC;
  const [params, setParams] = useSearchParams();
  // `caravane` est l'ancien nom de la collection : un lien déjà partagé
  // ouvre encore le bon panneau.
  const demande = params.get('onglet') === 'caravane' ? 'collection' : (params.get('onglet') || '');
  const onglet: Onglet = (onglets as readonly string[]).includes(demande) ? (demande as Onglet) : 'profil';
  const ouvrir = (o: Onglet) => {
    const p = new URLSearchParams(params);
    if (o === 'profil') p.delete('onglet'); else p.set('onglet', o);
    setParams(p);
  };
  const flecher = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const pas = e.key === 'ArrowRight' ? 1 : onglets.length - 1;
    const suivant = onglets[(onglets.indexOf(onglet) + pas) % onglets.length];
    ouvrir(suivant);
    document.getElementById(`onglet-${suivant}`)?.focus();
  };

  // ── La fiche de l'Ordre : le nom, la photo, les fonctions, la
  //    description. C'est la seule source lisible par les autres.
  const [fiche, setFiche] = useState<Membre | null>(null);
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    let vivant = true;
    setChargement(true);
    lireFiche(uid)
      .then((m) => { if (vivant) { setFiche(m); setChargement(false); } })
      .catch(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [uid]);

  // ── Les chiffres du bandeau : badges, amis, parties, avis ──
  const { obtenus: mesBadges } = useBadges();
  const [badgesVus, setBadgesVus] = useState<string[]>([]);
  const [amis, setAmis]       = useState(0);
  const [parties, setParties] = useState(0);
  const [avisIds, setAvisIds] = useState<string[]>([]);

  useEffect(() => {
    if (!prive || !uid) return;
    const arrets = [
      suivreMesAmities(uid, (liens) => setAmis(liens.filter((l) => l.statut === 'amis').length)),
      suivreMesParties(uid, (ps) => setParties(ps.filter((p) => p.statut === 'encours' || p.statut === 'fini').length)),
      suivreMesAvis(uid, setAvisIds),
    ];
    return () => arrets.forEach((stop) => stop());
  }, [prive, uid]);

  // En mode public, les amitiés, les parties et les avis d'un autre
  // membre sont fermés à la lecture : la fiche porte les chiffres que
  // la personne y a recopiés en visitant son espace.
  useEffect(() => {
    if (prive || !uid) return;
    return suivreBadges(uid, setBadgesVus);
  }, [prive, uid]);

  const badges = prive ? mesBadges : badgesVus;
  const etatBadges = avancement(badges);
  const nbAmis    = prive ? amis    : (fiche?.amis ?? 0);
  const nbParties = prive ? parties : (fiche?.parties ?? 0);
  const avisPris  = prive ? avisIds : (fiche?.avisPris || []);

  // ── Le compte : nom affiché, téléphone, photo, candidatures ──
  const [nomForm, setNomForm]   = useState('');
  const [phone, setPhone]       = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [enregistre, setEnregistre] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [bApp, setBApp] = useState<BenevoleApp | null>(null);
  const [vApp, setVApp] = useState<VendorApp | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    if (!prive || !compte) { setBApp(null); setVApp(null); return; }
    let vivant = true;
    setLoadingApps(true);
    (async () => {
      const [p, b, v] = await Promise.all([
        getUserProfile(compte.uid),
        getBenevoleApp(compte.uid),
        getVendorApp(compte.uid),  // l'année en cours par défaut
      ]);
      if (!vivant) return;
      setNomForm(p?.displayName || compte.displayName || '');
      setPhone(p?.phone || '');
      setAvatarUrl(p?.avatarUrl || undefined);
      setBApp(b); setVApp(v);
      setLoadingApps(false);
    })();
    return () => { vivant = false; };
  }, [prive, compte]);

  // ── Le nom et les chiffres remontent dans la fiche publique ──
  // Sans ça, la page publique retomberait sur une vieille copie du nom,
  // ou sur zéro partout. Un seul envoi par changement réel.
  const dernierEnvoi = useRef('');
  useEffect(() => {
    if (!prive || !uid || chargement) return;
    const nomVoulu = (nomForm || compte?.displayName || '').trim();
    const changeNom = Boolean(nomVoulu) && nomVoulu !== fiche?.nom;
    const changePhoto = Boolean(avatarUrl) && avatarUrl !== fiche?.avatarUrl;
    const rien = !changeNom && !changePhoto
      && (fiche?.amis ?? 0) === amis
      && (fiche?.parties ?? 0) === parties
      && (fiche?.avisPris || []).join('|') === avisIds.join('|');
    if (rien) return;
    const paquet: Partial<Membre> = {
      ...(changeNom ? { nom: nomVoulu } : {}),
      ...(changePhoto ? { avatarUrl } : {}),
      amis, parties, avisPris: avisIds,
    };
    const signature = JSON.stringify(paquet);
    if (signature === dernierEnvoi.current) return;
    dernierEnvoi.current = signature;
    void publierFiche(uid, paquet).catch(() => { /* hors ligne */ });
  }, [prive, uid, chargement, fiche, nomForm, avatarUrl, compte, amis, parties, avisIds]);

  const enregistrerProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compte) return;
    setEnregistrement(true);
    try {
      const nomPropre = nomForm.trim();
      await upsertUserProfile({
        uid:         compte.uid,
        email:       compte.email || '',
        displayName: nomPropre,
        phone:       phone.trim(),
        lang,
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      // Le même nom des deux côtés : la fiche de l'Ordre est ce que les
      // autres membres lisent.
      if (nomPropre) {
        await publierFiche(compte.uid, { nom: nomPropre }).catch(() => { /* hors ligne */ });
        setFiche((f) => (f ? { ...f, nom: nomPropre } : f));
      }
      setEnregistre(true);
    } finally {
      setEnregistrement(false);
    }
  };

  // ── Les amitiés du visiteur, pour le bouton d'ajout en mode public ──
  const [liens, setLiens] = useState<Amitie[]>([]);
  useEffect(() => {
    if (prive || !visiteur?.uid) return;
    return suivreMesAmities(visiteur.uid, setLiens);
  }, [prive, visiteur?.uid]);

  if (!prive && chargement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </div>
    );
  }

  if (!prive && !fiche) {
    return (
      <div className="min-h-screen text-ivory flex items-center justify-center px-6">
        <div className="max-w-md text-center glass-light rounded-lg-card p-8">
          <h1 className="font-display title-medieval text-2xl text-ivory mb-3">{t.introuvable}</h1>
          <Link to={addLocale('/ordre', lang)}
            className="px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card inline-block">
            {t.registre}
          </Link>
        </div>
      </div>
    );
  }

  const nom = (prive
    ? (nomForm || fiche?.nom || compte?.displayName || (compte?.email || '').split('@')[0])
    : (fiche?.nom || '')
  ).trim() || t.sansNom;
  const photo = prive ? avatarUrl : (fiche?.avatarUrl || undefined);
  const fonctions = rolesAffiches(fiche?.roles);
  const moi = visiteur?.uid === uid;

  const cta       = 'inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card';
  const secondair = 'inline-flex items-center gap-2 px-4 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-xs uppercase tracking-wider transition rounded-card';
  const discret   = 'inline-flex items-center gap-2 px-4 py-2 border border-stone text-ivory-soft hover:border-brass hover:text-brass font-sans text-xs uppercase tracking-wider transition rounded-card';

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={prive ? t.titre : `${nom} · ${t.ficheDe}`} noindex />

      {/* ── Le bandeau de profil ────────────────────────────────────
          La grammaire que tout le monde connaît déjà : le portrait en
          grand, le nom à côté, les fonctions dessous, puis les chiffres
          qui mènent chacun à leur onglet (Alex, 2026-08-23). */}
      <section className="relative caravan-stage bleed-edges pt-28 pb-8 md:pt-32 md:pb-10 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Link to={addLocale(prive ? '/' : '/ordre', lang)}
            className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass mb-8 transition">
            <ArrowLeft size={14} /> {prive ? t.accueil : t.retour}
          </Link>

          <div className="flex flex-col items-center text-center gap-8 md:flex-row md:items-center md:text-left md:gap-12">
            <AvatarUpload
              uid={uid}
              email={compte?.email || ''}
              displayName={nom}
              lang={lang}
              avatarUrl={photo}
              onChange={setAvatarUrl}
              lecture={!prive}
            />

            <div className="flex-1 min-w-0 w-full">
              <h1 className="font-display title-medieval text-3xl md:text-5xl lg:text-6xl text-ivory leading-tight break-words">
                {nom}
              </h1>

              {/* Les fonctions portées au festival, en pastilles. */}
              <ul className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                {fonctions.map((r) => (
                  <li key={r}
                    className="inline-flex items-center px-2.5 py-1 rounded-card font-sans uppercase tracking-[0.18em] text-[10px]"
                    style={{
                      color: '#D8B05A',
                      background: 'rgba(216,176,90,0.10)',
                      border: '1px solid rgba(216,176,90,0.32)',
                    }}>
                    {LIBELLE_ROLE[r][lang]}
                  </li>
                ))}
              </ul>

              {fiche?.ville && (
                <p className="font-sans text-xs mt-3 flex items-center justify-center md:justify-start gap-2"
                   style={{ color: 'rgba(244,239,227,0.5)' }}>
                  <MapPin size={13} className="text-brass" /> {fiche.ville}
                </p>
              )}
              {prive && compte?.email && (
                <p className="font-sans text-xs mt-2 flex items-center justify-center md:justify-start gap-2"
                   style={{ color: 'rgba(244,239,227,0.5)' }}>
                  <Mail size={13} className="text-brass" /> {compte.email}
                </p>
              )}

              <div className="mt-7 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-9 sm:justify-center md:justify-start">
                <Chiffre n={etatBadges.obtenus} sur={etatBadges.total} label={t.statBadges} onClick={() => ouvrir('badges')} />
                <Chiffre n={nbAmis}    label={t.statAmis}    onClick={() => ouvrir('profil')} />
                <Chiffre n={nbParties} label={t.statParties} onClick={() => ouvrir('jeux')} />
                <Chiffre n={avisPris.length} label={t.statAvis} onClick={() => ouvrir('collection')} />
              </div>
            </div>
          </div>

          {/* ── La bande d'actions ──
              En mode public, la personne qui regarde peut écrire au
              membre et l'ajouter comme ami. Rien d'autre. */}
          <div className="mt-9 pt-7 flex flex-wrap items-center justify-center md:justify-start gap-2"
               style={{ borderTop: '1px solid rgba(244, 239, 227, 0.10)' }}>
            {prive ? (
              <>
                {bApp?.status === 'accepted' ? (
                  <>
                    <Link to={addLocale('/espace-benevole', lang)} className={cta}>
                      <HandHeart size={14} /> {t.benevoleOpenSpace} <ArrowUpRight size={12} />
                    </Link>
                    <Link to={`${addLocale('/profil', lang)}/${uid}`} className={secondair}>
                      <Eye size={14} /> {t.voirProfil}
                    </Link>
                    <Link to={addLocale('/communaute', lang)} className={discret}>
                      <Users size={14} /> {t.communaute}
                    </Link>
                    <Link to={addLocale('/messages', lang)} className={discret}>
                      <MessageCircle size={14} /> {t.messages}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to={`${addLocale('/profil', lang)}/${uid}`} className={cta}>
                      <Eye size={14} /> {t.voirProfil} <ArrowUpRight size={12} />
                    </Link>
                    <Link to={addLocale('/benevole', lang)} className={secondair}>
                      <HandHeart size={14} /> {bApp ? t.benevoleEdit : t.benevoleTitle}
                    </Link>
                  </>
                )}

                {/* Le registre de l'Ordre : chercher quelqu'un, l'ajouter
                    comme ami, le défier (Alex, 2026-08-23). */}
                <Link to={addLocale('/ordre', lang)} className={discret}>
                  <Users size={14} /> {t.registre}
                </Link>

                {/* Kiosque : l'intitulé suit l'état de l'inscription. */}
                <Link to={addLocale('/marche/inscription', lang)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-amber-300/45 text-amber-200 hover:bg-amber-300/10 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card">
                  <ShoppingBag size={14} />
                  {vApp ? (vApp.status === 'accepted' ? t.vendorManageKiosk : t.vendorEdit) : t.vendorApplyQuick}
                </Link>

                {/* Visible seulement pour les courriels autorisés : useAuth()
                    a déjà fait la vérification. */}
                {isAdmin && (
                  <Link to="/admin" className={secondair}>
                    <ShieldCheck size={14} /> {t.adminSpace}
                  </Link>
                )}

                <button onClick={signOut}
                  className="inline-flex items-center gap-2 px-4 py-2 font-sans text-xs uppercase tracking-wider text-ivory-soft/60 hover:text-ivory transition rounded-card md:ml-auto">
                  <LogOut size={14} /> {t.signOut}
                </button>
              </>
            ) : (
              <>
                {!moi && (
                  <Link to={addLocale(`/messages/${uid}`, lang)} className={cta}>
                    <MessageCircle size={14} /> {t.ecrire}
                  </Link>
                )}
                {visiteur && !moi && (
                  <button
                    type="button"
                    className={secondair}
                    onClick={() => {
                      const attente = amitieEnAttente(liens, visiteur.uid, uid);
                      if (attente && attente.de !== visiteur.uid) void accepterAmitie(visiteur.uid, uid);
                      else if (!attente && !estAmi(liens, visiteur.uid, uid)) void demanderAmitie(visiteur.uid, uid);
                    }}
                  >
                    <Users size={14} />
                    {estAmi(liens, visiteur.uid, uid)
                      ? t.dejaAmi
                      : amitieEnAttente(liens, visiteur.uid, uid)
                        ? (amitieEnAttente(liens, visiteur.uid, uid)!.de === visiteur.uid ? t.demandeEnvoyee : t.accepterAmi)
                        : t.ajouterAmi}
                  </button>
                )}
                {moi && (
                  <Link to={addLocale('/compte', lang)} className={discret}>
                    <UserIcon size={14} /> {t.retourEspace}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Les onglets ─────────────────────────────────────────────
          Un seul panneau à la fois, l'onglet retenu dans l'URL. */}
      <section className="relative caravan-stage bleed-edges pt-2 pb-16 md:pt-4 md:pb-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div
            role="tablist"
            aria-label={t.onglets}
            onKeyDown={flecher}
            className="fmm-rail flex items-center gap-1.5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-3 mb-8"
            style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}
          >
            {onglets.map((o) => {
              const Icone = ICONE_ONGLET[o];
              const actif = o === onglet;
              return (
                <button
                  key={o}
                  id={`onglet-${o}`}
                  role="tab"
                  type="button"
                  aria-selected={actif}
                  aria-controls={`panneau-${o}`}
                  tabIndex={actif ? 0 : -1}
                  data-active={actif}
                  onClick={() => ouvrir(o)}
                  className="witcher-tab shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-card"
                >
                  <Icone size={14} /> {(prive ? t.onglet : t.ongletPublic)[o]}
                </button>
              );
            })}
          </div>

          <motion.div
            key={onglet}
            id={`panneau-${onglet}`}
            role="tabpanel"
            aria-labelledby={`onglet-${onglet}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {onglet === 'profil' && (prive ? (
              <div className="grid lg:grid-cols-12 gap-6 md:gap-8 items-start">
                <div className="lg:col-span-5 space-y-6 md:space-y-8">
                  <form onSubmit={enregistrerProfil} className="glass-light rounded-lg-card p-7 md:p-8">
                    <p className="font-editorial text-brass uppercase tracking-[0.3em] text-xs mb-2">
                      <UserIcon size={12} className="inline mr-1.5 -mt-0.5" />{t.profileEyebrow}
                    </p>
                    <h2 className="font-display title-medieval text-xl md:text-2xl text-ivory mb-5">{t.profileTitle}</h2>
                    <label className="block mb-4">
                      <span className="block font-display title-medieval text-xs text-brass mb-1.5">{t.displayName}</span>
                      <input type="text" value={nomForm} maxLength={60}
                             onChange={(e) => { setNomForm(e.target.value); setEnregistre(false); }}
                             className={inputCls} />
                    </label>
                    <label className="block mb-5">
                      <span className="block font-display title-medieval text-xs text-brass mb-1.5">{t.phone}</span>
                      <input type="tel" value={phone}
                             onChange={(e) => { setPhone(e.target.value); setEnregistre(false); }}
                             className={inputCls} />
                    </label>
                    <button type="submit" disabled={enregistrement}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
                      <Save size={14} /> {enregistrement ? t.saving : t.save}
                    </button>
                    {enregistre && (
                      <p className="text-xs font-editorial text-brass mt-3 text-center">{t.saved}</p>
                    )}
                  </form>
                  <MaFiche lang={lang} />
                  {/* Le dé de la vie reste dans l'espace de la personne :
                      il n'a rien à faire sur la fiche d'un autre. */}
                  <Suspense fallback={null}>
                    <DeDeLaVie lang={lang} />
                  </Suspense>
                </div>

                <div className="lg:col-span-7 space-y-6 md:space-y-8">
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
                  />

                  {/* ── Le fil entre le marchand et le festival ── */}
                  {vApp && compte && (
                    <div className="glass-light rounded-lg-card p-6 md:p-7">
                      <MessageThread
                        vendorUid={compte.uid}
                        currentUid={compte.uid}
                        currentName={nom}
                        currentRole="vendor"
                        lang={lang}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-12 gap-6 md:gap-8 items-start">
                <div className="lg:col-span-7 space-y-6 md:space-y-8">
                  <section className="glass-light rounded-lg-card p-7 md:p-8">
                    <p className="witcher-stat-label mb-4">{t.presentation}</p>
                    <p className="font-editorial text-base text-ivory-soft leading-relaxed whitespace-pre-line">
                      {fiche?.devise?.trim() || t.sansDescription}
                    </p>
                  </section>
                </div>
                {fiche?.stats && (
                  <div className="lg:col-span-5">
                    <section className="rounded-lg-card border border-brass/25 p-7 md:p-8"
                             style={{ background: 'rgba(26, 5, 11, 0.45)' }}>
                      <p className="witcher-stat-label mb-4">{t.aptitudes}</p>
                      <ul className="space-y-2.5">
                        {APTITUDES.map(([cle, nomFR, nomEN]) => (
                          <li key={cle} className="flex items-center gap-3">
                            <span className="font-sans uppercase tracking-[0.16em] text-[10px] text-ivory-soft/60 w-24 shrink-0">
                              {lang === 'FR' ? nomFR : nomEN}
                            </span>
                            <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(244,239,227,0.1)' }}>
                              <span className="block h-full" style={{
                                width: `${Math.max(0, Math.min(20, fiche.stats![cle])) * 5}%`,
                                background: 'linear-gradient(90deg, rgba(232,177,74,0.5), var(--color-amber-glow))',
                              }} />
                            </span>
                            <span className="font-display text-sm text-ivory w-6 text-right">{fiche.stats![cle]}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                )}
              </div>
            ))}

            {onglet === 'badges' && (
              prive
                ? <MesBadges lang={lang} />
                : <MesBadges lang={lang} obtenus={badgesVus} titre={t.sesBadges} />
            )}

            {onglet === 'jeux' && (prive ? (
              <div className="space-y-6 md:space-y-8">
                <SalonDesJeux lang={lang} />
              </div>
            ) : (
              <section className="glass-light rounded-lg-card p-7 md:p-8">
                <div className="flex items-center gap-4 mb-5">
                  <span className="witcher-tile shrink-0" style={{ width: 46, height: 46 }}>
                    <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}><Dices size={16} /></span>
                  </span>
                  <div className="min-w-0">
                    <p className="witcher-stat-label mb-1">{t.statParties}</p>
                    <p className="font-display text-2xl md:text-3xl" style={{ color: 'var(--color-bone)', fontWeight: 400 }}>
                      {nbParties}
                    </p>
                  </div>
                </div>
                <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-6">
                  {nbParties > 0 ? t.partiesTexte : t.partiesVide}
                </p>
                <Link to={addLocale('/jeunesse/hnefatafl', lang)} className={secondair}>
                  <Swords size={14} /> {t.allerJouer} <ArrowUpRight size={12} />
                </Link>
              </section>
            ))}

            {onglet === 'billets' && prive && compte && (
              <div className="grid lg:grid-cols-12 gap-6 md:gap-8 items-start">
                <div className="lg:col-span-7"><CoffreBillets uid={compte.uid} lang={lang} /></div>
                <div className="lg:col-span-5">
                  <SoutienPanel lang={lang} userEmail={compte.email || ''} userName={nom} />
                </div>
              </div>
            )}

            {/* Les photos qu'une personne envoie aux archives du festival :
                son affaire à elle, jamais celle d'un visiteur. */}
            {onglet === 'photos' && prive && compte && (
              <PhotosPanel uid={compte.uid} nomMembre={nom} lang={lang} />
            )}

            {onglet === 'collection' && (prive ? (
              <AnnoncesPanel lang={lang} />
            ) : (
              <section className="glass-light rounded-lg-card p-7 md:p-8">
                <div className="flex items-center justify-between gap-4 mb-6 pb-2"
                     style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
                  <span className="witcher-stat-label">{t.saCollection}</span>
                  <span className="font-sans text-sm tracking-[0.2em]" style={{ color: '#D8B05A', fontWeight: 300 }}>
                    {avisPris.length} / {ANNONCES.length}
                  </span>
                </div>
                {avisPris.length > 0 ? (
                  <ul className="space-y-3">
                    {ANNONCES.filter((a) => avisPris.includes(a.id)).map((a) => (
                      <li key={a.id} className="font-editorial text-sm text-ivory-soft flex items-start gap-2.5">
                        <Check size={14} className="text-brass shrink-0 mt-0.5" />
                        <span>
                          <span className="text-ivory">{lang === 'FR' ? a.titleFR : a.titleEN}</span>
                          <span className="block text-[13px] text-ivory-soft/70">
                            {(lang === 'FR' ? a.bodyFR : a.bodyEN).split('\n\n')[0].slice(0, 120)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-editorial text-sm text-ivory-soft leading-relaxed">{t.collectionVide}</p>
                )}
              </section>
            ))}
          </motion.div>
        </div>
      </section>
    </main>
  );
};

// Les cinq aptitudes que la personne se donne elle-même, pour le plaisir.
const APTITUDES: Array<['force' | 'ruse' | 'chance' | 'verve' | 'endurance', string, string]> = [
  ['force', 'Force', 'Strength'],
  ['ruse', 'Ruse', 'Cunning'],
  ['chance', 'Chance', 'Luck'],
  ['verve', 'Verve', 'Verve'],
  ['endurance', 'Endurance', 'Endurance'],
];

// Un chiffre du bandeau : le nombre en gros, le mot en petit, et un
// clic qui ouvre l'onglet correspondant.
const Chiffre: React.FC<{ n: number; sur?: number; label: string; onClick: () => void }> = ({ n, sur, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex flex-col items-center md:items-start gap-1.5 px-2 py-1.5 rounded-card transition hover:bg-brass/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-brass"
  >
    <span className="witcher-stat-num text-2xl md:text-3xl transition group-hover:text-brass">
      {n}{sur != null && <span className="text-base opacity-40"> / {sur}</span>}
    </span>
    <span className="witcher-stat-label text-[9px] md:text-[10px]">{label}</span>
  </button>
);

interface AppCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  eyebrow: string; title: string;
  loading: boolean;
  app: { status: AppStatus | VendorStatus; updatedAt?: unknown } | null;
  ctaApply: string; ctaEdit: string;
  href: string;
  /** Second bouton, montré seulement quand la candidature est acceptée. */
  acceptedCta?: { label: string; href: string };
  statusLabel: (s: AppStatus | VendorStatus) => string;
  statusTone: (s: AppStatus | VendorStatus) => string;
  none: string;
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
        <p className="font-editorial text-brass uppercase tracking-[0.3em] text-xs mb-1">{eyebrow}</p>
        <h3 className="font-display title-medieval text-xl text-ivory mb-2">{title}</h3>
        {loading ? (
          <p className="font-editorial text-sm text-ivory-soft">…</p>
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
            <p className="font-editorial text-sm text-ivory-soft mb-3">{none}</p>
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
  accueil: 'Accueil', titre: 'Mon espace FMM', ficheDe: 'Fiche de membre',
  registre: 'Registre de l’Ordre', communaute: 'Communauté', messages: 'Messages',
  introuvable: 'Cette fiche est introuvable',
  sansNom: 'Membre de la caravane',
  signOut: 'Déconnexion', adminSpace: 'Espace admin',
  statBadges: 'Badges', statAmis: 'Amis', statParties: 'Parties', statAvis: 'Avis',
  voirProfil: 'Voir mon profil public', retourEspace: 'Revenir à mon espace',
  ecrire: 'Écrire à ce membre', ajouterAmi: 'Ajouter comme ami',
  demandeEnvoyee: 'Demande envoyée', accepterAmi: 'Accepter l’amitié', dejaAmi: 'Ami',
  onglets: 'Les sections de la fiche', retour: 'Retour',
  onglet: {
    profil: 'Mon profil', badges: 'Mes badges', jeux: 'Mes jeux',
    billets: 'Mes billets', collection: 'Ma collection',
  } as Record<Onglet, string>,
  ongletPublic: {
    profil: 'Sa fiche', badges: 'Ses badges', jeux: 'Ses parties',
    billets: 'Billets', collection: 'Sa collection',
  } as Record<Onglet, string>,
  presentation: 'Sa présentation',
  sansDescription: 'Ce membre n’a pas encore écrit sa présentation.',
  aptitudes: 'Ses aptitudes, à sa façon',
  sesBadges: 'Ses badges',
  saCollection: 'Ses avis décrochés',
  collectionVide: 'Ce membre n’a encore décroché aucun avis du babillard.',
  partiesTexte: 'Les parties se jouent au salon des jeux, et les défis se lancent depuis le registre de l’Ordre.',
  partiesVide: 'Aucune partie jouée pour le moment. La table reste ouverte.',
  allerJouer: 'Ouvrir le plateau',
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

const EN: typeof FR = {
  accueil: 'Home', titre: 'My FMM space', ficheDe: 'Member card',
  registre: 'Roll of the Order', communaute: 'Community', messages: 'Messages',
  introuvable: 'This member card cannot be found',
  sansNom: 'Member of the caravan',
  signOut: 'Sign out', adminSpace: 'Admin space',
  statBadges: 'Badges', statAmis: 'Friends', statParties: 'Games', statAvis: 'Notices',
  voirProfil: 'View my public profile', retourEspace: 'Back to my space',
  ecrire: 'Write to this member', ajouterAmi: 'Add as friend',
  demandeEnvoyee: 'Request sent', accepterAmi: 'Accept friendship', dejaAmi: 'Friend',
  onglets: 'Sections of the member card', retour: 'Back',
  onglet: {
    profil: 'My profile', badges: 'My badges', jeux: 'My games',
    billets: 'My tickets', collection: 'My collection',
  } as Record<Onglet, string>,
  ongletPublic: {
    profil: 'Their card', badges: 'Their badges', jeux: 'Their games',
    billets: 'Tickets', collection: 'Their collection',
  } as Record<Onglet, string>,
  presentation: 'Their introduction',
  sansDescription: 'This member has not written an introduction yet.',
  aptitudes: 'Their own stats',
  sesBadges: 'Their badges',
  saCollection: 'Notices they have taken',
  collectionVide: 'This member has not taken any notice from the board yet.',
  partiesTexte: 'Games are played in the games room, and challenges start from the roll of the Order.',
  partiesVide: 'No game played yet. The table stays open.',
  allerJouer: 'Open the board',
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

export default FicheMembre;
