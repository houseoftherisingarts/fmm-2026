import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowUpRight, LogOut, Mail, User as UserIcon, Save, ShoppingBag,
  HandHeart, AlertCircle, ShieldCheck, Users, Award, Swords,
  MessageCircle, MapPin, Dices, Check, Bug, Tag, Store, Shield,
  Sparkles, Crown, BadgeCheck, Plus, Music, Palette,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBadges } from '../../contexts/BadgesContext';
import { addLocale } from '../../lib/locale';
import { avancement, gagner, suivreBadges, suivreExposes } from '../../firebase/badges';
import { EVENEMENTS_MEDIEVAUX, CATEGORIES_EVENEMENTS } from '../../content/evenementsMedievaux';
import { listerMesGuildes, type Guilde } from '../../firebase/guildes';
import {
  lireFiche, publierFiche, definirPref, suivreMesAmities, demanderAmitie, accepterAmitie,
  estAmi, amitieEnAttente, rolesAffiches, LIBELLE_ROLE, definirVerifie,
  type Amitie, type Membre, type PrefsMembre, type PositionBanniere,
} from '../../firebase/ordre';
import { suivreMesParties } from '../../firebase/tafl';
import { suivreMesAvis } from '../../firebase/avis';
import { ANNONCES } from '../../content/annonces';
import {
  getUserProfile, upsertUserProfile, getBenevoleApp, getVendorApp,
  type AppStatus, type VendorStatus, type BenevoleApp, type VendorApp,
} from '../../firebase/applications';
import { getMusicianApp, type MusicianApp } from '../../firebase/musicians';
import { suivreSansPub } from '../../firebase/sansPub';
import SEO from '../SEO';
import Brume from '../Brume';
import MessageThread from '../vendor/MessageThread';
import AnnoncesPanel from './AnnoncesPanel';
import CoffreBillets from './CoffreBillets';
import SoutienPanel from './SoutienPanel';
import ParrainagePanel from './ParrainagePanel';
import MusiquePanel from './MusiquePanel';
import BoursePanel from './BoursePanel';
import BoutiqueMontpellois from '../boutique/BoutiqueMontpellois';
import PorteAdmin from './PorteAdmin';
import DonnerRoleAdmin from './DonnerRoleAdmin';
import AvatarUpload from './AvatarUpload';
import SalonDesJeux from './SalonDesJeux';
import DefisTafl from './DefisTafl';
import MesBadges from './MesBadges';
import Coffre from './Coffre';
import MaFiche from './MaFiche';
import ConcoursPanel from './ConcoursPanel';
import PhotosPanel from './PhotosPanel';
import PhotosDe from './PhotosDe';
import PhotosAvecMoi from './PhotosAvecMoi';
import Vitrine from './Vitrine';
import Cloche from './Cloche';
import Banniere, { metalDe } from './Banniere';
import MurSocial from '../mur/MurSocial';
import SoukDe from '../souk/SoukDe';
import CommerceDe from '../souk/CommerceDe';
import BugReportModal from '../layout/BugReportModal';
import BoiteReception from './BoiteReception';
import BadgeVerifie from './BadgeVerifie';
import ReglagesProfil from './ReglagesProfil';
import EspaceVip from './EspaceVip';
import AlertesPanel from './AlertesPanel';

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

// Alex, 2026-08-28 : « Profil » absorbe le fil et les photos, « Badges »
// absorbe la collection. Les anciens paramètres d'URL restent valides,
// voir REDIRECTIONS_ONGLET plus bas.
const ONGLETS_PRIVE  = ['profil', 'souk', 'commerce', 'badges', 'jeux', 'messages', 'boutique'] as const;
const ONGLETS_PUBLIC = ['profil', 'souk', 'commerce', 'badges', 'jeux'] as const;
type Onglet = typeof ONGLETS_PRIVE[number];

const ICONE_ONGLET: Record<Onglet, React.ComponentType<{ size?: number; className?: string }>> = {
  profil: UserIcon, souk: Tag, commerce: Store, badges: Award, jeux: Swords,
  messages: MessageCircle, boutique: ShoppingBag,
};

// Les anciens onglets fusionnés (et l'ancien nom de « collection »)
// mènent vers le bon onglet, pour que les liens déjà envoyés restent bons.
// Billets a rejoint Badges le 2026-08-28 : le coffre à billets et le
// soutien y vivent maintenant, sous les badges et le coffre.
const REDIRECTIONS_ONGLET: Record<string, Onglet> = {
  caravane: 'badges', collection: 'badges', fil: 'profil', photos: 'profil', billets: 'badges',
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
  const brutOnglet = params.get('onglet') || '';
  const demande = REDIRECTIONS_ONGLET[brutOnglet] || brutOnglet;
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
    // L'aperçu sans compte (?apercu=1, dev seulement) : une fiche témoin
    // pour vérifier à l'écran les trois positions de bannière et le
    // badge vérifié, sans passer par Firestore (?position=haut|bas|droite).
    if (import.meta.env.DEV && uid === 'apercu') {
      const pos = (new URLSearchParams(window.location.search).get('position') as PositionBanniere) || 'bas';
      setFiche({
        uid: 'apercu', nom: 'Dame Aperçu', verifie: true, vip: true,
        banniereUrl: '/wix/home/scene-cinematic.jpg',
        roles: ['membre'],
        prefs: { positionBanniere: pos, parallaxe: true, animationsFond: true, cadrage: { x: 50, y: 50 } },
      });
      setChargement(false);
      return () => { vivant = false; };
    }
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

  // La vitrine se lit sur le même document, pour soi comme pour un autre.
  const [exposes, setExposes] = useState<string[]>([]);
  const [bugOuvert, setBugOuvert] = useState(false);
  // Les guildes de la personne, pour la pastille bleue sous le nom (Alex, 2026-08-28).
  const [guildes, setGuildes] = useState<Guilde[]>([]);
  useEffect(() => { if (uid) void listerMesGuildes(uid).then(setGuildes).catch(() => setGuildes([])); }, [uid]);
  useEffect(() => { if (uid) return suivreExposes(uid, setExposes); }, [uid]);
  // L'aperçu sans compte (?apercu=1, dev seulement) montre une vitrine
  // témoin pour juger le rendu.
  const idsVitrine = (import.meta.env.DEV && uid === 'apercu')
    ? ['photographe', 'benevole', 'tafl', 'banquet', 'visiteur'] : exposes;

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
  const [mApp, setMApp] = useState<MusicianApp | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    if (!prive || !compte) { setBApp(null); setVApp(null); setMApp(null); return; }
    let vivant = true;
    setLoadingApps(true);
    (async () => {
      const [p, b, v, mus] = await Promise.all([
        getUserProfile(compte.uid),
        getBenevoleApp(compte.uid),
        getVendorApp(compte.uid),  // l'année en cours par défaut
        getMusicianApp(compte.uid),
      ]);
      if (!vivant) return;
      setNomForm(p?.displayName || compte.displayName || '');
      setPhone(p?.phone || '');
      setAvatarUrl(p?.avatarUrl || undefined);
      setBApp(b); setVApp(v); setMApp(mus);
      setLoadingApps(false);
    })();
    return () => { vivant = false; };
  }, [prive, compte]);

  // ── VIP : un don sans-publicité à vie (users/{uid}.sansPub) ──
  const [sansPub, setSansPub] = useState(false);
  useEffect(() => {
    if (!prive || !compte) { setSansPub(false); return; }
    return suivreSansPub(compte.uid, setSansPub);
  }, [prive, compte]);
  // `users` n'est lisible que par son propriétaire : la personne recopie
  // elle-même le VIP sur sa fiche publique en le constatant ici.
  useEffect(() => {
    if (!prive || !uid || chargement || !fiche) return;
    if (sansPub && !fiche.vip) {
      setFiche((f) => (f ? { ...f, vip: true } : f));
      void publierFiche(uid, { vip: true }).catch(() => { /* hors ligne */ });
    }
  }, [prive, uid, chargement, sansPub, fiche]);
  const vip = prive ? sansPub : !!fiche?.vip;

  // Deux badges qui se constatent plutôt qu'ils ne se déclenchent : la
  // bannière et le portrait posés ensemble, puis le profil au grand
  // complet (nom, ville, description, portrait, bannière). Vérifiés à
  // chaque chargement de la fiche; `gagner` ignore un badge déjà posé
  // (Alex, 2026-08-28).
  useEffect(() => {
    if (!prive || !uid || chargement || !fiche) return;
    if (fiche.banniereUrl && avatarUrl) void gagner('banniere-et-portrait', uid);
    if (fiche.nom?.trim() && fiche.ville?.trim() && fiche.devise?.trim() && fiche.banniereUrl && avatarUrl) {
      void gagner('profil-complet', uid);
    }
  }, [prive, uid, chargement, fiche, avatarUrl]);

  // ── Les réglages personnels (prefs) : un seul point d'écriture,
  //    utilisé par Réglages, la bannière et l'Espace VIP.
  //
  // Alex, 2026-08-28 : c'était la cause exacte des interrupteurs
  // brisés. `publierFiche(uid, { prefs: patch })` passe par un
  // setDoc+merge, qui REMPLACE tout le sous-objet `prefs` par le
  // seul `patch` reçu au lieu de le compléter (le même piège que le
  // commentaire de `definirPref` documente déjà). Chaque clic sur un
  // interrupteur effaçait donc en silence tous les autres réglages
  // (skin, position, musique…) dans Firestore, et `usePrefsFond`
  // (qui écoute le document, pas cet état local) les voyait revenir
  // à leur valeur par défaut au premier réglage suivant. On écrit
  // maintenant chaque clé en chemin pointé, comme `definirPref`.
  const majPrefs = (patch: Partial<PrefsMembre>) => {
    setFiche((f) => (f ? { ...f, prefs: { ...f.prefs, ...patch } } : f));
    for (const cle of Object.keys(patch) as (keyof PrefsMembre)[]) {
      void definirPref(uid, cle, patch[cle]).catch(() => { /* hors ligne */ });
    }
  };
  const allerVersSansPub = () => {
    // Le paiement « sans publicité » vit maintenant dans la boutique
    // (Alex, 2026-08-28), plus dans l'ancien onglet Billets.
    ouvrir('boutique');
    setTimeout(() => document.getElementById('don-sans-pub')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const allerVersCoffre = () => {
    ouvrir('badges');
    setTimeout(() => document.getElementById('coffre')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // ── Le badge bleu vérifié : décerné par l'équipe depuis la fiche
  //    publique du membre (Alex, 2026-08-28). ──
  const [verifBusy, setVerifBusy] = useState(false);
  const basculerVerifieAdmin = async () => {
    if (!fiche) return;
    setVerifBusy(true);
    try {
      const v = !fiche.verifie;
      await definirVerifie(uid, v);
      setFiche((f) => (f ? { ...f, verifie: v } : f));
    } finally { setVerifBusy(false); }
  };

  // ── Déplacer la bannière par glisser-déposer : trois zones de dépôt
  //    qui débordent du cadre de la bannière, tenues par la fiche
  //    (Alex, 2026-08-28). ──
  const zoneHautRef = useRef<HTMLDivElement>(null);
  const zoneBasRef = useRef<HTMLDivElement>(null);
  const zoneDroiteRef = useRef<HTMLDivElement>(null);
  const [enDeplacement, setEnDeplacement] = useState(false);
  const [zoneSurvolee, setZoneSurvolee] = useState<PositionBanniere | null>(null);
  const zoneSurvoleeRef = useRef<PositionBanniere | null>(null);

  useEffect(() => {
    if (!enDeplacement) return;
    const zones: [PositionBanniere, React.RefObject<HTMLDivElement | null>][] = [
      ['haut', zoneHautRef], ['bas', zoneBasRef], ['droite', zoneDroiteRef],
    ];
    const surPointeur = (e: PointerEvent) => {
      let trouvee: PositionBanniere | null = null;
      for (const [pos, ref] of zones) {
        const r = ref.current?.getBoundingClientRect();
        if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { trouvee = pos; break; }
      }
      zoneSurvoleeRef.current = trouvee;
      setZoneSurvolee(trouvee);
    };
    const surRelache = () => {
      setEnDeplacement(false);
      if (zoneSurvoleeRef.current) majPrefs({ positionBanniere: zoneSurvoleeRef.current });
      zoneSurvoleeRef.current = null;
      setZoneSurvolee(null);
    };
    window.addEventListener('pointermove', surPointeur);
    window.addEventListener('pointerup', surRelache);
    return () => {
      window.removeEventListener('pointermove', surPointeur);
      window.removeEventListener('pointerup', surRelache);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enDeplacement]);

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
          <div className="flex items-start justify-between gap-4">
          <Link to={addLocale(prive ? '/' : '/ordre', lang)}
            className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass mb-8 transition">
            <ArrowLeft size={14} /> {prive ? t.accueil : t.retour}
          </Link>
            {/* La cloche et les messages, en haut à droite de l'espace. */}
            {prive && <Cloche uid={uid} lang={lang} />}
          </div>

          {(() => {
            const posBanniere = fiche?.prefs?.positionBanniere || 'bas';
            const metal = metalDe({ roles: fiche?.roles, nbBadges: etatBadges.obtenus, estAdmin: prive && isAdmin });
            const banniereProps = {
              uid, url: fiche?.banniereUrl, metal, lang,
              editable: prive,
              onChange: (lien: string) => setFiche((f) => (f ? { ...f, banniereUrl: lien } : f)),
              vip,
              prefs: fiche?.prefs,
              onPrefsChange: majPrefs,
              onCommencerDeplacement: prive ? () => setEnDeplacement(true) : undefined,
            };
            return (
              <div className={posBanniere === 'droite' ? 'flex flex-col md:flex-row gap-8 md:gap-10 md:items-stretch' : 'flex flex-col gap-8'}>
                {posBanniere === 'haut' && <Banniere {...banniereProps} variante="horizontale" />}

                <div className={posBanniere === 'droite' ? 'relative flex-1 min-w-0' : 'relative'}>
                  <div className="flex flex-col items-center text-center gap-8 md:flex-row md:items-center md:text-left md:gap-12">
                    <AvatarUpload
                      uid={uid}
                      email={compte?.email || ''}
                      displayName={nom}
                      lang={lang}
                      avatarUrl={photo}
                      onChange={setAvatarUrl}
                      lecture={!prive}
                                  lienProfilPublic={prive ? `${addLocale('/profil', lang)}/${uid}` : undefined}
/>

                    <div className="flex-1 min-w-0 w-full">
                      <h1 className="font-display title-medieval text-3xl md:text-5xl lg:text-6xl text-ivory leading-tight break-words inline-flex items-center gap-2 md:gap-3 flex-wrap justify-center md:justify-start">
                        <span>{nom}</span>
                        {fiche?.verifie && <BadgeVerifie size={18} titre={t.membreVerifie} />}
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
                        {/* Les cinq badges favoris, à côté de la fonction. */}
                        <Vitrine ids={idsVitrine} lang={lang} />
                        {/* La guilde, en bleu; sinon, les portes vers les guildes (Alex, 2026-08-28). */}
                        {guildes.map((g) => (
                          <li key={g.id}>
                            <Link to={`${addLocale('/guildes', lang)}/${g.id}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card font-sans uppercase tracking-[0.18em] text-[10px] hover:brightness-125 transition"
                                  style={{ color: '#9fb0e6', background: 'rgba(120,130,190,0.12)', border: '1px solid rgba(120,130,190,0.4)' }}>
                              <Shield size={11} /> {g.nom}
                            </Link>
                          </li>
                        ))}
                        {prive && (
                          <li>
                            <Link to={addLocale('/guildes', lang)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card font-sans uppercase tracking-[0.18em] text-[10px] hover:brightness-125 transition"
                                  style={{ color: '#9fb0e6', background: 'rgba(120,130,190,0.08)', border: '1px dashed rgba(120,130,190,0.45)' }}>
                              <Shield size={11} /> {guildes.length ? t.autreGuilde : t.creerOuRejoindre}
                            </Link>
                          </li>
                        )}
                        {/* VIP (partout) ou l'invitation à le devenir (privé seulement). */}
                        {vip ? (
                          <li className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card font-sans uppercase tracking-[0.18em] text-[10px]"
                              style={{ color: '#241505', background: 'linear-gradient(135deg, #F4E5B6, #D8B05A)', border: '1px solid rgba(216,176,90,0.6)' }}>
                            <Crown size={11} /> VIP
                          </li>
                        ) : prive && (
                          <li>
                            <button type="button" onClick={allerVersSansPub}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-card font-sans uppercase tracking-[0.18em] text-[10px] hover:brightness-110 transition"
                                    style={{ color: '#241505', background: 'linear-gradient(135deg, #F4E5B6, #D8B05A)', border: '1px solid rgba(216,176,90,0.6)' }}>
                              <Sparkles size={11} /> {t.upgrade}
                            </button>
                          </li>
                        )}
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
                        <Chiffre n={avisPris.length} label={t.statAvis} onClick={() => ouvrir('badges')} />
                      </div>
                    </div>
                  </div>

                  {/* Les trois zones de dépôt, montrées seulement pendant qu'on
                      saisit la bannière (Alex, 2026-08-28). */}
                  {prive && enDeplacement && (
                    <>
                      <div ref={zoneHautRef}
                           className="absolute inset-x-0 bottom-full mb-3 h-28 md:h-32 rounded-2xl border-2 border-dashed flex items-center justify-center z-30 pointer-events-none transition-colors"
                           style={{ borderColor: zoneSurvolee === 'haut' ? '#D8B05A' : 'rgba(216,176,90,0.4)', background: zoneSurvolee === 'haut' ? 'rgba(216,176,90,0.16)' : 'rgba(10,2,7,0.6)' }}>
                        <Plus size={28} style={{ color: '#D8B05A' }} />
                      </div>
                      <div ref={zoneBasRef}
                           className="absolute inset-x-0 top-full mt-3 h-28 md:h-32 rounded-2xl border-2 border-dashed flex items-center justify-center z-30 pointer-events-none transition-colors"
                           style={{ borderColor: zoneSurvolee === 'bas' ? '#D8B05A' : 'rgba(216,176,90,0.4)', background: zoneSurvolee === 'bas' ? 'rgba(216,176,90,0.16)' : 'rgba(10,2,7,0.6)' }}>
                        <Plus size={28} style={{ color: '#D8B05A' }} />
                      </div>
                      <div ref={zoneDroiteRef}
                           className="hidden md:flex absolute top-0 bottom-0 left-full ml-3 w-[220px] rounded-2xl border-2 border-dashed items-center justify-center z-30 pointer-events-none transition-colors"
                           style={{ borderColor: zoneSurvolee === 'droite' ? '#D8B05A' : 'rgba(216,176,90,0.4)', background: zoneSurvolee === 'droite' ? 'rgba(216,176,90,0.16)' : 'rgba(10,2,7,0.6)' }}>
                        <Plus size={28} style={{ color: '#D8B05A' }} />
                      </div>
                    </>
                  )}
                </div>

                {posBanniere === 'droite' && <Banniere {...banniereProps} variante="verticale" />}
                {posBanniere === 'bas' && <Banniere {...banniereProps} variante="horizontale" />}
              </div>
            );
          })()}

          {/* ── La bande d'actions ──
              En mode public, la personne qui regarde peut écrire au
              membre et l'ajouter comme ami. Rien d'autre. */}
          <div className="mt-9 pt-7 flex flex-wrap items-center justify-center md:justify-start gap-2"
               style={{ borderTop: '1px solid rgba(244, 239, 227, 0.10)' }}>
            {prive ? (
              <>
                {/* Alex, 2026-08-28 : la bande ne garde que le registre et
                    la porte de l'équipe. Le profil public s'ouvre par la
                    pastille à l'oeil sous le portrait, et les deux
                    candidatures vivent maintenant dans l'onglet Profil. */}
                <Link to={addLocale('/ordre', lang)} className={cta}>
                  <Users size={14} /> {t.registre}
                </Link>
                {/* Ouvre l'onglet Badges et descend jusqu'au coffre :
                    c'est là qu'on change de skin, de musique, etc.
                    (Alex, 2026-08-28). */}
                <button type="button" onClick={allerVersCoffre} className={secondair}>
                  <Palette size={14} /> {t.personnaliser}
                </button>
                {bApp?.status === 'accepted' && (
                  <Link to={addLocale('/espace-benevole', lang)} className={secondair}>
                    <HandHeart size={14} /> {t.benevoleOpenSpace} <ArrowUpRight size={12} />
                  </Link>
                )}

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
                {/* Décerner ou retirer le badge bleu : réservé à l'équipe (Alex, 2026-08-28). */}
                {isAdmin && (
                  <button type="button" onClick={() => void basculerVerifieAdmin()} disabled={verifBusy} className={`${discret} disabled:opacity-50`}>
                    <BadgeCheck size={14} /> {fiche?.verifie ? t.retirerVerification : t.verifierMembre}
                  </button>
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
            className="flex flex-wrap items-center gap-1.5 pb-3 mb-8"
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
                  className="witcher-tab inline-flex items-center gap-2 rounded-card"
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
              // Alex, 2026-08-28 : disposition revue à plat, dans l'ordre
              // d'importance qu'Alex a dicté (infos+bourse, fil, photos,
              // candidatures, fiche de l'Ordre, réglages). Deux colonnes
              // inégales (5/7) empilaient tout dans la colonne étroite
              // pendant que la large restait courte : ça creusait le grand
              // vide à droite qu'il signale, et enterrait MaFiche (longue)
              // en tête de colonne. Ici, chaque section est pleine largeur
              // ou une grille de cartes de même hauteur (jamais deux
              // colonnes de contenus de longueurs très différentes), donc
              // rien ne peut plus laisser un trou. Sur mobile, tout
              // s'empile déjà dans cet ordre : aucune règle séparée à
              // écrire.
              <div className="space-y-8 md:space-y-10">
                <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-start">
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
                  {compte && <BoursePanel uid={compte.uid} lang={lang} prive />}
                </div>

                <div>
                  <p className="witcher-stat-label mb-4">{t.filDeLaPersonne}</p>
                  <MurSocial lang={lang} uid={uid} avecAnnonces={false} />
                </div>

                {compte && (
                  <div className="space-y-6 md:space-y-8">
                    <PhotosPanel uid={compte.uid} nomMembre={nom} lang={lang} />
                    {/* Les photos où quelqu'un d'autre m'a identifié (Alex, 2026-08-28). */}
                    <PhotosAvecMoi uid={compte.uid} nom={nom} lang={lang} />
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-start">
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
                  <ApplicationCard
                    icon={Music}
                    eyebrow={t.musicianEyebrow}
                    title={t.musicianTitle}
                    loading={loadingApps}
                    app={mApp}
                    ctaApply={t.musicianApply}
                    ctaEdit={t.musicianEdit}
                    href={addLocale('/musique/inscription', lang)}
                    statusLabel={(s) => STATUS_LABEL[s][lang === 'FR' ? 'fr' : 'en']}
                    statusTone={(s) => STATUS_LABEL[s].tone}
                    none={t.musicianNone}
                  />
                </div>

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

                {/* La fiche de l'Ordre et son questionnaire : plus basse,
                    elle n'occupe plus toute la colonne de gauche. */}
                <MaFiche lang={lang} />

                {/* Réglages, musique, parrainage et le reste : des
                    cartes de même gabarit, deux par ligne sur bureau. */}
                <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-start">
                  <div className="space-y-6 md:space-y-8">
                    <ReglagesProfil prefs={fiche?.prefs} onChange={majPrefs} lang={lang} />
                    <EspaceVip vip={vip} prefs={fiche?.prefs} onChange={majPrefs} onDevenirVip={allerVersSansPub} lang={lang} />
                    {compte && <AlertesPanel uid={compte.uid} lang={lang} />}
                    {compte?.email && <ConcoursPanel email={compte.email} />}
                  </div>
                  <div className="space-y-6 md:space-y-8">
                    {compte && <MusiquePanel uid={compte.uid} lang={lang} />}
                    {compte && <ParrainagePanel uid={compte.uid} lang={lang} />}
                    {/* Le dé de la vie reste dans l'espace de la personne :
                        il n'a rien à faire sur la fiche d'un autre. */}
                    <Suspense fallback={null}>
                      <DeDeLaVie lang={lang} />
                    </Suspense>
                  </div>
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
                  <BoursePanel uid={uid} lang={lang} prive={false} />
                  {/* L'équipe ouvre les portes de l'admin à ce membre
                      (Alex, 2026-08-28). */}
                  {isAdmin && !prive && (
                    <DonnerRoleAdmin uid={uid} nom={nom} lang={lang} />
                  )}
                  {/* Les autres rendez-vous médiévaux que la personne
                      fréquente, groupés par genre (Alex, 2026-08-27). */}
                  {((fiche?.evenements?.length ?? 0) > 0 || fiche?.evenementsAutre?.trim()) && (
                    <section className="glass-light rounded-lg-card p-7 md:p-8">
                      <p className="witcher-stat-label mb-4">{t.evenements}</p>
                      <div className="space-y-4">
                        {CATEGORIES_EVENEMENTS.map((cat) => {
                          const siens = EVENEMENTS_MEDIEVAUX.filter((e) => e.categorie === cat.id && fiche!.evenements!.includes(e.id));
                          if (!siens.length) return null;
                          return (
                            <div key={cat.id}>
                              <p className="font-sans uppercase tracking-[0.2em] text-[10px] text-brass mb-2">{lang === 'FR' ? cat.nomFR : cat.nomEN}</p>
                              <ul className="flex flex-wrap gap-2">
                                {siens.map((e) => (
                                  <li key={e.id} className="px-3 py-1.5 rounded-full font-sans text-xs text-ivory"
                                      style={{ border: '1px solid rgba(232,177,74,0.3)', background: 'rgba(232,177,74,0.08)' }}>
                                    {e.nom}{e.lieu ? <span className="text-ivory-soft/55"> · {e.lieu}</span> : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                        {fiche?.evenementsAutre?.trim() && (
                          <p className="font-editorial text-sm text-ivory-soft leading-relaxed">{fiche.evenementsAutre}</p>
                        )}
                      </div>
                    </section>
                  )}
                </div>
                <div className="lg:col-span-5 space-y-6 md:space-y-8">
                  <PhotosDe uid={uid} lang={lang} titre={t.photosVedette} vedette />
                {fiche?.stats && (
                  <div>
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
              </div>
            ))}

            {/* ── Le fil de la personne, puis ses photos : le Profil absorbe
                les anciens onglets Fil et Photos (Alex, 2026-08-28). Côté
                privé, ce bloc vit maintenant plus haut, dans l'ordre
                d'importance dicté par Alex : voir la branche `prive`
                ci-dessus. Ici, seulement la vue publique. ── */}
            {onglet === 'profil' && !prive && (
              <div className="mt-8 md:mt-10 space-y-6 md:space-y-8">
                <div>
                  <p className="witcher-stat-label mb-4">{t.filDeLaPersonne}</p>
                  <MurSocial lang={lang} uid={uid} avecAnnonces={false} />
                </div>
                <PhotosDe uid={uid} lang={lang} titre={t.sesPhotos} />
              </div>
            )}

            {/* ── Sous le profil, pour tout le monde (Alex, 2026-08-27) :
                signaler un bug, puis le babillard des annonces. */}
            {onglet === 'profil' && (
              <div className="mt-8 md:mt-10 space-y-6 md:space-y-8">
                <div className="flex justify-end">
                  <button type="button" onClick={() => setBugOuvert(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-stone text-ivory-soft hover:border-brass hover:text-brass font-sans text-xs uppercase tracking-wider transition rounded-card">
                    <Bug size={13} /> {t.signalerBug}
                  </button>
                </div>
                <AnnoncesPanel lang={lang} />
              </div>
            )}

            {/* Badges absorbe l'ancienne Collection : les avis décrochés
                paraissent sous les badges (Alex, 2026-08-28). */}
            {onglet === 'badges' && (
              <div className="space-y-6 md:space-y-8">
                {prive
                  ? <MesBadges lang={lang} />
                  : <MesBadges lang={lang} obtenus={badgesVus} titre={t.sesBadges} />}
                {/* Le coffre : les skins, ambiances et albums achetés,
                    équipés d'un clic (Alex, 2026-08-28). */}
                {prive && compte && <div id="coffre"><Coffre uid={compte.uid} lang={lang} /></div>}
                {prive ? (
                  <>
                    {/* Billets a rejoint Badges : le coffre à billets et
                        le soutien descendent sous les badges et le
                        coffre (Alex, 2026-08-28). */}
                    {compte && (
                      <div className="grid lg:grid-cols-12 gap-6 md:gap-8 items-start">
                        <div className="lg:col-span-7"><CoffreBillets uid={compte.uid} lang={lang} /></div>
                        <div className="lg:col-span-5">
                          <SoutienPanel lang={lang} userEmail={compte.email || ''} userName={nom} />
                          <PorteAdmin lang={lang} />
                        </div>
                      </div>
                    )}
                    <AnnoncesPanel lang={lang} />
                  </>
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
                )}
              </div>
            )}

            {onglet === 'jeux' && (prive ? (
              <div className="space-y-6 md:space-y-8">
                {/* Les défis reçus, envoyés et les parties en cours : la
                    vue persistante qui manquait (vérification du 27 août). */}
                <DefisTafl lang={lang} />
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

            {/* Les photos qu'une personne envoie aux archives du festival :
                son affaire à elle, jamais celle d'un visiteur. */}
            {/* Le Souk et le Commerce de la personne (Alex, 2026-08-27). */}
            {onglet === 'boutique' && prive && compte && (
              <BoutiqueMontpellois lang={lang} />
            )}

            {onglet === 'souk' && (
              <SoukDe uid={uid} lang={lang} editable={prive} />
            )}
            {onglet === 'commerce' && (
              <CommerceDe uid={uid} lang={lang} editable={prive} />
            )}

            {/* Le courrier du membre, dans son espace (Alex, 2026-08-24). */}
            {onglet === 'messages' && prive && compte && (
              <BoiteReception uid={compte.uid} lang={lang} />
            )}
          </motion.div>
        </div>
      </section>
      <BugReportModal open={bugOuvert} onClose={() => setBugOuvert(false)} />
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
  statBadges: 'Badges', statAmis: 'Amis', statParties: 'Joutes', statAvis: 'Avis',
  voirProfil: 'Voir mon profil public', retourEspace: 'Revenir à mon espace',
  ecrire: 'Écrire à ce membre', ajouterAmi: 'Ajouter comme ami',
  demandeEnvoyee: 'Demande envoyée', accepterAmi: 'Accepter l’amitié', dejaAmi: 'Ami',
  onglets: 'Les sections de la fiche', retour: 'Retour',
  // Alex, 2026-08-28 : Profil absorbe le fil et les photos, Badges
  // absorbe la collection. Plus de possessif nulle part : les mots
  // tiennent sur une ligne, en bureau comme en mobile.
  onglet: {
    profil: 'Profil', souk: 'Souk', commerce: 'Commerce', badges: 'Badges et coffre', jeux: 'Jeux',
    messages: 'Boîte de réception', boutique: 'Boutique',
  } as Record<Onglet, string>,
  ongletPublic: {
    profil: 'Profil', souk: 'Souk', commerce: 'Commerce', badges: 'Badges', jeux: 'Jeux',
  } as Record<Onglet, string>,
  presentation: 'Sa présentation',
  evenements: 'Où le croiser ailleurs',
  sesPhotos: 'Ses photos',
  filDeLaPersonne: 'Le fil',
  photosVedette: 'Photos en vedette',
  signalerBug: 'Signaler un bug',
  creerOuRejoindre: 'Créer ou rejoindre une guilde',
  autreGuilde: 'Joindre une autre guilde',
  photosVedetteVide: 'Choisissez vos photos en vedette plus bas dans l’onglet Profil : elles paraissent ici, pour tous.',
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
  benevoleEyebrow: 'Application bénévole', benevoleTitle: 'Postuler comme bénévole',
  benevoleApply: 'Postuler', benevoleEdit: 'Voir / modifier ma candidature',
  benevoleOpenSpace: 'Ouvrir mon espace bénévole',
  benevoleNone: 'Aucune candidature pour le moment.',
  vendorEyebrow: 'Application kiosque', vendorTitle: 'Inscrire mon kiosque',
  vendorApply: 'S’inscrire', vendorEdit: 'Voir / modifier mon inscription',
  vendorApplyQuick: 'Postuler comme marchand',
  vendorManageKiosk: 'Gérer mon kiosque',
  vendorNone: 'Aucune inscription kiosque pour le moment.',
  musicianEyebrow: 'Application groupe de musique', musicianTitle: 'Inscrire mon groupe',
  musicianApply: 'S’inscrire', musicianEdit: 'Voir / modifier mon inscription',
  musicianNone: 'Aucune inscription de groupe pour le moment.',
  membreVerifie: 'Membre vérifié', upgrade: 'Devenir VIP',
  verifierMembre: 'Vérifier ce membre', retirerVerification: 'Retirer la vérification',
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
    profil: 'Profile', souk: 'Souk', commerce: 'Business', badges: 'Badges and vault', jeux: 'Games',
    messages: 'Inbox', boutique: 'Shop',
  } as Record<Onglet, string>,
  ongletPublic: {
    profil: 'Profile', souk: 'Souk', commerce: 'Business', badges: 'Badges', jeux: 'Games',
  } as Record<Onglet, string>,
  presentation: 'Their introduction',
  evenements: 'Where else to meet them',
  sesPhotos: 'Their photos',
  filDeLaPersonne: 'The feed',
  photosVedette: 'Featured photos',
  signalerBug: 'Report a bug',
  creerOuRejoindre: 'Create or join a guild',
  autreGuilde: 'Join another guild',
  photosVedetteVide: 'Pick your featured photos further down the Profile tab: they show here, for everyone.',
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
  benevoleEyebrow: 'Volunteer application', benevoleTitle: 'Apply as a volunteer',
  benevoleApply: 'Apply', benevoleEdit: 'View / edit my application',
  benevoleOpenSpace: 'Open my volunteer space',
  benevoleNone: 'No application yet.',
  vendorEyebrow: 'Vendor application', vendorTitle: 'Register my kiosk',
  vendorApply: 'Sign up', vendorEdit: 'View / edit my registration',
  vendorApplyQuick: 'Apply as a merchant',
  vendorManageKiosk: 'Manage my kiosk',
  vendorNone: 'No vendor registration yet.',
  musicianEyebrow: 'Music group application', musicianTitle: 'Register my band',
  musicianApply: 'Apply', musicianEdit: 'View / edit my application',
  musicianNone: 'No band application yet.',
  membreVerifie: 'Verified member', upgrade: 'Become VIP',
  verifierMembre: 'Verify this member', retirerVerification: 'Remove verification',
};

export default FicheMembre;
