import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Music, Palette, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import AtelierVitrine from '../components/vitrine/AtelierVitrine';
import { BoutonOr, classeChamp } from '../components/vitrine/primitives';
import {
  PRIX_BOUTIQUE_ANNUEL, creerVitrine, slugDisponible, slugLibreDeForme, suivreMesVitrines, versSlug,
  type TypeVitrine, type Vitrine,
} from '../firebase/vitrines';
import { VITRINE_APERCU } from '../content/vitrineApercu';

// ─── /ma-vitrine · l'atelier d'un musicien ou d'un artisan ───────────
// Sans compte : la porte, comme sur Mon espace. Avec un compte et sans
// vitrine : le formulaire de création (type, nom, adresse). Avec une
// vitrine : l'atelier complet. Alex, 2026-09-28.

const FR = {
  home: 'Accueil', eyebrow: 'Votre vitrine', titre: 'Une page à vous',
  lead: 'Musiciens et artisans sans site web : le festival vous prête une page que vous remplissez vous-même, avec vos pistes, vos créations et vos liens, et dont vous partagez l’adresse à qui vous voulez.',
  google: 'Continuer avec Google', autres: 'Autres façons d’entrer', connexion: 'Connexion…',
  creerEyebrow: 'Première pierre', creerTitre: 'Ouvrir votre vitrine',
  type: 'Vous êtes', musique: 'Musicien ou groupe', artisan: 'Artisan ou marchand',
  nom: 'Nom d’artiste ou d’atelier', adresse: 'Votre adresse', adresseAide: 'Lettres, chiffres et traits d’union. C’est ce que vos amis taperont.',
  prise: 'Cette adresse est déjà prise.', invalide: 'Trois caractères au moins, sans accent ni espace.',
  creer: 'Ouvrir ma vitrine', creation: 'Ouverture…',
  mesVitrines: 'Vos vitrines', nouvelle: 'Ouvrir une autre vitrine', voir: 'Voir la page',
  brouillon: 'Brouillon', enLigne: 'En ligne', monEspace: 'Mon espace',
  offreEyebrow: 'Ce que vous recevez', offreTitre: 'Une page, sans frais',
  offre: [
    ['Une adresse à vous,', 'que vous choisissez et que vos amis retiennent.'],
    ['Vos pistes et vos créations,', 'jusqu’à douze morceaux à écouter sur la page et trente objets ou services avec prix et photo.'],
    ['Vos liens de vente,', 'Square, Stripe ou tout autre, qui deviennent le bouton « Commander » de votre page.'],
    ['La boutique du festival,', `si vous la voulez : une place dans la page Boutiques du site pour un an, ${PRIX_BOUTIQUE_ANNUEL} $ réglés par le Square du festival.`],
  ] as [string, string][],
};
const EN: typeof FR = {
  home: 'Home', eyebrow: 'Your showcase', titre: 'A page of your own',
  lead: 'Musicians and artisans without a website: the festival lends you a page you fill in yourself, with your tracks, your creations and your links, and whose address you share with anyone you like.',
  google: 'Continue with Google', autres: 'Other ways in', connexion: 'Signing in…',
  creerEyebrow: 'First stone', creerTitre: 'Open your showcase',
  type: 'You are', musique: 'Musician or band', artisan: 'Artisan or merchant',
  nom: 'Artist or workshop name', adresse: 'Your address', adresseAide: 'Letters, digits and hyphens. This is what your friends will type.',
  prise: 'This address is already taken.', invalide: 'At least three characters, no accents or spaces.',
  creer: 'Open my showcase', creation: 'Opening…',
  mesVitrines: 'Your showcases', nouvelle: 'Open another showcase', voir: 'See the page',
  brouillon: 'Draft', enLigne: 'Online', monEspace: 'My space',
  offreEyebrow: 'What you get', offreTitre: 'A page, free of charge',
  offre: [
    ['An address of your own,', 'one you choose and your friends remember.'],
    ['Your tracks and creations,', 'up to twelve songs to play on the page and thirty items or services with price and photo.'],
    ['Your selling links,', 'Square, Stripe or any other, which become the “Order” button on your page.'],
    ['The festival shop,', `if you want it: a place on the site’s Shops page for a year, $${PRIX_BOUTIQUE_ANNUEL} paid through the festival’s Square.`],
  ] as [string, string][],
};

const MaVitrinePage: React.FC = () => {
  useCaravanPage();
  const { user: compte, loading, openSignIn, signInWithGoogle } = useAuth();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  // Échappatoire de développement, comme sur Mon espace : `?apercu=1`
  // montre l'atelier rempli, sans compte, pour vérifier le rendu.
  const apercu = new URLSearchParams(window.location.search).get('apercu') === '1';
  const user = compte ?? (apercu ? ({ uid: VITRINE_APERCU.uid, email: 'apercu@fmm.test', displayName: 'Dame Aperçu' } as unknown as typeof compte) : null);

  const [vitrines, setVitrines] = useState<Vitrine[] | null>(apercu ? [VITRINE_APERCU] : null);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);
  useEffect(() => {
    if (!user || apercu) return;
    return suivreMesVitrines(user.uid, setVitrines);
  }, [user?.uid, apercu]); // eslint-disable-line react-hooks/exhaustive-deps

  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleErr, setGoogleErr] = useState<string | null>(null);
  const handleGoogle = async () => {
    setGoogleBusy(true); setGoogleErr(null);
    try { await signInWithGoogle(); }
    catch (e) { setGoogleErr(e instanceof Error ? e.message : String(e)); }
    finally { setGoogleBusy(false); }
  };

  if (loading || (user && vitrines === null)) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }

  const liste = vitrines ?? [];
  const courante = liste.find((v) => v.slug === ouverte) ?? (liste.length === 1 && !creation ? liste[0] : null);
  const montrerCreation = !!user && (creation || liste.length === 0);

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={t.titre} description={t.lead} noindex />
      <section className="relative caravan-stage bleed-edges pt-28 pb-12 md:pt-36 md:pb-16 overflow-hidden">
        <img decoding="async" fetchPriority="low" src="/wix/home/scene-cinematic.jpg" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-midnight-deep/90 via-midnight/90 to-midnight-deep" />
        <Brume />
        <div className="relative w-full px-4 md:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7">
          <Link to={addLocale(user ? '/compte' : '/', lang)} className="inline-flex items-center gap-2 font-sans text-[13px] uppercase tracking-widest text-ivory-soft hover:text-brass mb-8 transition">
            <ArrowLeft size={14} /> {user ? t.monEspace : t.home}
          </Link>
          <p className="font-editorial text-brass uppercase tracking-[0.3em] text-[13px] md:text-sm mb-4">{t.eyebrow}</p>
          <h1 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-5">{courante ? courante.nom : t.titre}</h1>
          <div className="divider-brass w-24 mb-5" />
          {!courante && <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed max-w-2xl">{t.lead}</p>}
          </div>

          {!user && (
            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 items-stretch lg:items-end xl:items-center lg:justify-end">
              <button onClick={handleGoogle} disabled={googleBusy}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 bg-ivory text-midnight-deep font-sans uppercase tracking-wider text-[13px] font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.13 4.13 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.62z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.71H.96v2.33A8.99 8.99 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.95 10.71A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.17.29-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A8.99 8.99 0 0 0 .96 4.96l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
                </svg>
                {googleBusy ? t.connexion : t.google}
              </button>
              <button onClick={openSignIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-brass text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-[13px] font-semibold transition rounded-card">
                {t.autres} <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          {googleErr && <p className="lg:col-span-12 text-[13px] text-blush font-editorial">{googleErr}</p>}
        </div>
      </section>

      {user && (
        <section className="relative w-full px-4 md:px-8 lg:px-12 pb-24">
          {liste.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="font-sans text-[13px] uppercase tracking-wider text-ivory-soft mr-2">{t.mesVitrines}</span>
              {liste.map((v) => (
                <button key={v.slug} type="button" onClick={() => { setOuverte(v.slug); setCreation(false); }}
                        className={`px-4 py-2 rounded-card font-sans text-[13px] uppercase tracking-wider border transition ${courante?.slug === v.slug ? 'bg-brass text-midnight-deep border-brass' : 'border-white/15 text-ivory-soft hover:border-brass/60'}`}>
                  {v.nom}
                </button>
              ))}
              <button type="button" onClick={() => { setCreation(true); setOuverte(null); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-card font-sans text-[13px] uppercase tracking-wider border border-white/15 text-ivory-soft hover:border-brass/60 transition">
                <Plus size={12} /> {t.nouvelle}
              </button>
            </div>
          )}

          {montrerCreation && !courante && (
            <Creation uid={user.uid} lang={lang} onCreee={(slug) => { setOuverte(slug); setCreation(false); }} />
          )}
          {courante && (
            <AtelierVitrine v={courante} lang={lang} onSupprimee={() => { setOuverte(null); setCreation(false); }} />
          )}
          {liste.length === 1 && !courante && !creation && null}
          {liste.length >= 1 && liste.length < 2 && courante && (
            <div className="mt-8 text-center">
              <button type="button" onClick={() => { setCreation(true); setOuverte(null); }} className="inline-flex items-center gap-1.5 font-sans text-[13px] uppercase tracking-wider text-ivory-soft/70 hover:text-brass transition">
                <Plus size={12} /> {t.nouvelle}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
};

export default MaVitrinePage;

// ─── Création ────────────────────────────────────────────────────────
const Creation: React.FC<{ uid: string; lang: 'FR' | 'EN'; onCreee: (slug: string) => void }> = ({ uid, lang, onCreee }) => {
  const t = lang === 'FR' ? FR : EN;
  const [type, setType] = useState<TypeVitrine>('musique');
  const [nom, setNom] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouche, setSlugTouche] = useState(false);
  const [dispo, setDispo] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const slugEffectif = slugTouche ? slug : versSlug(nom);
  const forme = slugLibreDeForme(slugEffectif);

  useEffect(() => {
    if (!forme) { setDispo(null); return; }
    let vivant = true;
    const id = window.setTimeout(() => slugDisponible(slugEffectif).then((d) => { if (vivant) setDispo(d); }), 350);
    return () => { vivant = false; window.clearTimeout(id); };
  }, [slugEffectif, forme]);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    if (nom.trim().length < 2 || !forme || dispo === false) return;
    setBusy(true); setErr(null);
    try { await creerVitrine({ slug: slugEffectif, uid, type, nom }); onCreee(slugEffectif); }
    catch (er) { setErr(er instanceof Error ? er.message : String(er)); }
    finally { setBusy(false); }
  }

  const Type = ({ val, icone: Icone, label }: { val: TypeVitrine; icone: typeof Music; label: string }) => (
    <button type="button" onClick={() => setType(val)}
            className={`flex-1 flex items-center gap-3 rounded-lg-card border px-4 py-4 text-left transition ${type === val ? 'border-brass bg-brass/10' : 'border-white/15 bg-black/25 hover:border-brass/50'}`}>
      <span className={`w-10 h-10 rounded-card flex items-center justify-center ${type === val ? 'bg-brass text-midnight-deep' : 'bg-white/5 text-brass'}`}><Icone size={18} /></span>
      <span className="font-editorial text-base text-ivory">{label}</span>
    </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
    <form onSubmit={creer} className="lg:col-span-7 glass-light rounded-lg-card p-6 md:p-8">
      <p className="font-editorial text-brass uppercase tracking-[0.3em] text-[13px] mb-1">{t.creerEyebrow}</p>
      <h2 className="font-display title-medieval text-2xl text-ivory mb-6">{t.creerTitre}</h2>
      <p className="font-sans text-[13px] uppercase tracking-wider text-ivory-soft mb-2">{t.type}</p>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Type val="musique" icone={Music} label={t.musique} />
        <Type val="artisan" icone={Palette} label={t.artisan} />
      </div>
      <label className="block mb-4">
        <span className="block font-sans text-[13px] uppercase tracking-wider text-ivory-soft mb-1.5">{t.nom}</span>
        <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} required className={classeChamp} />
      </label>
      <label className="block mb-6">
        <span className="block font-sans text-[13px] uppercase tracking-wider text-ivory-soft mb-1.5">{t.adresse}</span>
        <div className="flex items-center rounded-card border border-white/15 bg-black/30 focus-within:border-brass/70 transition overflow-hidden">
          <span className="pl-3 font-sans text-sm text-ivory-soft/60 shrink-0">/vitrine/</span>
          <input value={slugEffectif} onChange={(e) => { setSlugTouche(true); setSlug(versSlug(e.target.value)); }} maxLength={40}
                 className="flex-1 min-w-0 bg-transparent px-1 py-2 font-sans text-sm text-ivory outline-none" />
        </div>
        <span className={`block font-editorial text-[13px] mt-1 ${dispo === false ? 'text-blush' : slugEffectif && !forme ? 'text-blush' : 'text-ivory-soft/70'}`}>
          {dispo === false ? t.prise : slugEffectif && !forme ? t.invalide : t.adresseAide}
        </span>
      </label>
      <BoutonOr type="submit" disabled={busy || nom.trim().length < 2 || !forme || dispo === false}>{busy ? t.creation : t.creer}</BoutonOr>
      {err && <p className="font-sans text-[13px] text-blush mt-3">{err}</p>}
    </form>
    <aside className="lg:col-span-5 glass-light rounded-lg-card p-6 md:p-8">
      <p className="font-editorial text-brass uppercase tracking-[0.3em] text-[13px] mb-1">{t.offreEyebrow}</p>
      <h2 className="font-display title-medieval text-2xl text-ivory mb-5">{t.offreTitre}</h2>
      <ul className="space-y-4">
        {t.offre.map(([titre, texte]) => (
          <li key={titre} className="flex gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-brass mt-2.5 shrink-0" />
            <p className="font-editorial text-sm md:text-base text-ivory-soft leading-relaxed"><span className="text-ivory">{titre}</span> {texte}</p>
          </li>
        ))}
      </ul>
    </aside>
    </div>
  );
};
