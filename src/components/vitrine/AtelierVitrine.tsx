import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Camera, Check, Copy, Eye, EyeOff, Link2, Store, Trash2, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addLocale } from '../../lib/locale';
import { sendMessage } from '../../firebase/mail';
import {
  PRIX_BOUTIQUE_ANNUEL, demanderBoutique, majVitrine, supprimerFichiers, supprimerVitrine,
  televerserPhotoVitrine, urlPublique, type Liens, type Vitrine,
} from '../../firebase/vitrines';
import { AtelierGalerie, AtelierPistes, AtelierProduits, urlPropre } from './AtelierMedias';
import { BoutonOr, BoutonSobre, Carte, Champ, classeChamp } from './primitives';

// ─── L'atelier d'une vitrine : tout ce que la personne édite ─────────
// Identité, bannière et portrait, pistes ou créations, galerie, liens,
// puis la publication, le partage et la demande de boutique. Chaque
// carte écrit dès qu'un champ est quitté (onBlur), sans bouton global.

const COURRIEL_EQUIPE = 'admin@festivalmedievaldemontpellier.org';

const T = {
  FR: {
    identiteEyebrow: 'Qui vous êtes', identiteTitre: 'Votre carte',
    nom: 'Nom d’artiste ou d’atelier', accroche: 'Accroche', accrocheAide: 'Une ligne, cent quarante signes au plus, qui dit ce que vous faites.',
    ville: 'Ville ou village', bio: 'Votre histoire', bioAide: 'Quelques paragraphes sur vous, votre musique ou votre métier. Vous pouvez laisser vide.',
    visuelEyebrow: 'Le décor', visuelTitre: 'Bannière et portrait',
    visuelAide: 'La bannière remplit le haut de votre page, le portrait se pose dessus en médaillon.',
    banniere: 'Changer la bannière', portrait: 'Changer le portrait', envoi: 'Envoi…',
    liensEyebrow: 'Vous joindre', liensTitre: 'Vos liens',
    liensAide: 'Ce que vous remplissez apparaît en boutons sur votre page. Un lien Square ou Stripe devient le bouton « Commander en ligne ».',
    site: 'Site web', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', spotify: 'Spotify', bandcamp: 'Bandcamp', tiktok: 'TikTok',
    courriel: 'Courriel de contact', square: 'Lien de commande Square', stripe: 'Lien de paiement Stripe',
    publierEyebrow: 'En ligne', publierTitre: 'Publier et partager',
    brouillon: 'Votre vitrine est en brouillon. Vous seul la voyez pour l’instant.',
    enLigne: 'Votre vitrine est en ligne. Partagez l’adresse à qui vous voulez.',
    publier: 'Publier ma vitrine', depublier: 'Repasser en brouillon', voir: 'Voir ma page',
    copier: 'Copier l’adresse', copie: 'Adresse copiée',
    boutiqueEyebrow: 'Aller plus loin', boutiqueTitre: 'Une boutique du festival',
    boutiqueAide: `Votre vitrine est offerte. La boutique du festival, elle, vous place dans la page Boutiques du site pour un an, avec le sceau du festival sur votre page, pour ${PRIX_BOUTIQUE_ANNUEL} $ par année. L’équipe reçoit votre demande, vous écrit avec le lien de paiement, puis active la boutique dès la réception.`,
    demander: 'Demander ma boutique', demandeEnvoyee: 'Demande envoyée',
    statutDemandee: 'Votre demande est entre les mains de l’équipe. Vous recevrez le lien de paiement par courriel.',
    statutActive: 'Votre boutique est active jusqu’au', statutRefusee: 'La demande n’a pas été retenue cette fois. Vous pouvez en faire une nouvelle.',
    payer: 'Régler l’année', redemander: 'Refaire une demande',
    dangerEyebrow: 'Fin de partie', dangerTitre: 'Retirer cette vitrine',
    dangerAide: 'La page, ses photos et ses pistes disparaissent pour de bon. Cliquez deux fois pour confirmer.',
    supprimer: 'Retirer ma vitrine', confirmer: 'Oui, retirer pour de bon', suppression: 'Retrait…',
    erreur: 'Cela n’a pas fonctionné. Réessayez.',
  },
  EN: {
    identiteEyebrow: 'Who you are', identiteTitre: 'Your card',
    nom: 'Artist or workshop name', accroche: 'Tagline', accrocheAide: 'One line, 140 characters at most, saying what you do.',
    ville: 'Town or village', bio: 'Your story', bioAide: 'A few paragraphs about you, your music or your craft. You may leave it empty.',
    visuelEyebrow: 'The setting', visuelTitre: 'Banner and portrait',
    visuelAide: 'The banner fills the top of your page, the portrait sits on it as a medallion.',
    banniere: 'Change banner', portrait: 'Change portrait', envoi: 'Uploading…',
    liensEyebrow: 'Reach you', liensTitre: 'Your links',
    liensAide: 'Whatever you fill in shows up as buttons on your page. A Square or Stripe link becomes the “Order online” button.',
    site: 'Website', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', spotify: 'Spotify', bandcamp: 'Bandcamp', tiktok: 'TikTok',
    courriel: 'Contact email', square: 'Square order link', stripe: 'Stripe payment link',
    publierEyebrow: 'Online', publierTitre: 'Publish and share',
    brouillon: 'Your showcase is a draft. Only you can see it for now.',
    enLigne: 'Your showcase is online. Share the address with anyone you like.',
    publier: 'Publish my showcase', depublier: 'Back to draft', voir: 'See my page',
    copier: 'Copy address', copie: 'Address copied',
    boutiqueEyebrow: 'Go further', boutiqueTitre: 'A festival shop',
    boutiqueAide: `Your showcase is free. The festival shop places you on the site’s Shops page for a year, with the festival seal on your page, for $${PRIX_BOUTIQUE_ANNUEL} a year. The team receives your request, writes to you with the payment link, then activates the shop on receipt.`,
    demander: 'Request my shop', demandeEnvoyee: 'Request sent',
    statutDemandee: 'Your request is with the team. You will receive the payment link by email.',
    statutActive: 'Your shop is active until', statutRefusee: 'The request was not accepted this time. You may send a new one.',
    payer: 'Pay for the year', redemander: 'Request again',
    dangerEyebrow: 'End of the road', dangerTitre: 'Remove this showcase',
    dangerAide: 'The page, its photos and its tracks disappear for good. Click twice to confirm.',
    supprimer: 'Remove my showcase', confirmer: 'Yes, remove for good', suppression: 'Removing…',
    erreur: 'That did not work. Try again.',
  },
};

const CLES_LIENS: (keyof Liens)[] = ['site', 'instagram', 'facebook', 'youtube', 'spotify', 'bandcamp', 'tiktok', 'courriel', 'square', 'stripe'];

interface Props { v: Vitrine; lang: 'FR' | 'EN'; onSupprimee: () => void }

const AtelierVitrine: React.FC<Props> = ({ v, lang, onSupprimee }) => {
  const t = T[lang];
  const musique = v.type === 'musique';
  return (
    <div className="space-y-6 md:space-y-8">
      <Identite v={v} lang={lang} />
      <Visuels v={v} lang={lang} />
      {musique ? <AtelierPistes v={v} lang={lang} /> : <AtelierProduits v={v} lang={lang} />}
      {musique ? <AtelierProduits v={v} lang={lang} /> : <AtelierPistes v={v} lang={lang} />}
      <AtelierGalerie v={v} lang={lang} />
      <LiensCarte v={v} lang={lang} />
      <Publication v={v} lang={lang} />
      <BoutiqueCarte v={v} lang={lang} />
      <Danger v={v} lang={lang} onSupprimee={onSupprimee} />
      <p className="sr-only">{t.erreur}</p>
    </div>
  );
};

export default AtelierVitrine;

// ─── Identité ────────────────────────────────────────────────────────
const Identite: React.FC<{ v: Vitrine; lang: 'FR' | 'EN' }> = ({ v, lang }) => {
  const t = T[lang];
  const poser = (champs: Parameters<typeof majVitrine>[1]) => majVitrine(v.slug, champs).catch(() => {});
  return (
    <Carte icone={User} eyebrow={t.identiteEyebrow} titre={t.identiteTitre}>
      <div className="grid md:grid-cols-2 gap-4">
        <Champ label={t.nom}>
          <input defaultValue={v.nom} maxLength={60} className={classeChamp}
                 onBlur={(e) => { const n = e.target.value.trim(); if (n.length >= 2) poser({ nom: n }); }} />
        </Champ>
        <Champ label={t.ville}>
          <input defaultValue={v.ville ?? ''} maxLength={80} className={classeChamp}
                 onBlur={(e) => poser({ ville: e.target.value.trim() })} />
        </Champ>
      </div>
      <div className="mt-4">
        <Champ label={t.accroche} aide={t.accrocheAide}>
          <input defaultValue={v.accroche ?? ''} maxLength={140} className={classeChamp}
                 onBlur={(e) => poser({ accroche: e.target.value.trim() })} />
        </Champ>
      </div>
      <div className="mt-4">
        <Champ label={t.bio} aide={t.bioAide}>
          <textarea defaultValue={v.bio ?? ''} maxLength={4000} rows={6} className={classeChamp}
                    onBlur={(e) => poser({ bio: e.target.value.trim() })} />
        </Champ>
      </div>
    </Carte>
  );
};

// ─── Bannière et portrait ────────────────────────────────────────────
const Visuels: React.FC<{ v: Vitrine; lang: 'FR' | 'EN' }> = ({ v, lang }) => {
  const t = T[lang];
  const [busy, setBusy] = useState<'banniere' | 'avatar' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function changer(quoi: 'banniere' | 'avatar', file: File | undefined) {
    if (!file) return;
    setBusy(quoi); setErr(null);
    try {
      const f = await televerserPhotoVitrine(v.slug, quoi, file, quoi === 'banniere' ? 2400 : 800);
      const ancien = v[quoi]?.chemin;
      await majVitrine(v.slug, { [quoi]: f });
      if (ancien) await supprimerFichiers([ancien]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.erreur);
    } finally { setBusy(null); }
  }

  return (
    <Carte icone={Camera} eyebrow={t.visuelEyebrow} titre={t.visuelTitre} aide={t.visuelAide}>
      <div className="relative rounded-lg-card overflow-hidden border border-white/10 bg-black/30 aspect-[21/9] md:aspect-[3/1]">
        {v.banniere ? <img src={v.banniere.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    : <img src="/wix/home/scene-cinematic.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-deep/90 via-transparent to-transparent" />
        <label className="absolute bottom-3 right-3 md:bottom-4 md:right-4 cursor-pointer">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md border border-white/15 text-ivory font-sans uppercase tracking-wider text-[11px] rounded-card hover:border-brass/60 transition">
            <Camera size={13} /> {busy === 'banniere' ? t.envoi : t.banniere}
          </span>
          <input type="file" accept="image/*" hidden onChange={(e) => changer('banniere', e.target.files?.[0])} />
        </label>
        <label className="absolute bottom-3 left-3 md:bottom-4 md:left-4 cursor-pointer group">
          <span className="block w-20 h-20 md:w-28 md:h-28 rounded-full border-2 border-brass overflow-hidden bg-midnight-deep shadow-[0_0_30px_rgba(0,0,0,0.6)]">
            {v.avatar ? <img src={v.avatar.url} alt="" className="w-full h-full object-cover" />
                      : <span className="w-full h-full flex items-center justify-center text-brass"><User size={28} /></span>}
          </span>
          <span className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center text-ivory font-sans text-[10px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition text-center px-2">
            {busy === 'avatar' ? t.envoi : t.portrait}
          </span>
          <input type="file" accept="image/*" hidden onChange={(e) => changer('avatar', e.target.files?.[0])} />
        </label>
      </div>
      {err && <p className="font-sans text-xs text-blush mt-3">{err}</p>}
    </Carte>
  );
};

// ─── Liens ───────────────────────────────────────────────────────────
const LiensCarte: React.FC<{ v: Vitrine; lang: 'FR' | 'EN' }> = ({ v, lang }) => {
  const t = T[lang];
  function poser(cle: keyof Liens, brut: string) {
    const val = cle === 'courriel' ? (brut.trim().slice(0, 120) || undefined) : urlPropre(brut);
    const liens: Liens = { ...v.liens };
    if (val) liens[cle] = val; else delete liens[cle];
    majVitrine(v.slug, { liens }).catch(() => {});
  }
  return (
    <Carte icone={Link2} eyebrow={t.liensEyebrow} titre={t.liensTitre} aide={t.liensAide}>
      <div className="grid md:grid-cols-2 gap-4">
        {CLES_LIENS.map((cle) => (
          <Champ key={cle} label={t[cle]}>
            <input defaultValue={v.liens?.[cle] ?? ''} inputMode={cle === 'courriel' ? 'email' : 'url'}
                   placeholder={cle === 'courriel' ? 'vous@exemple.com' : 'https://'}
                   className={`${classeChamp} ${cle === 'square' || cle === 'stripe' ? 'border-brass/40' : ''}`}
                   onBlur={(e) => poser(cle, e.target.value)} />
          </Champ>
        ))}
      </div>
    </Carte>
  );
};

// ─── Publication et partage ──────────────────────────────────────────
const Publication: React.FC<{ v: Vitrine; lang: 'FR' | 'EN' }> = ({ v, lang }) => {
  const t = T[lang];
  const [copie, setCopie] = useState(false);
  const url = urlPublique(v.slug);
  async function copier() {
    try { await navigator.clipboard.writeText(url); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* sans presse-papiers */ }
  }
  return (
    <Carte icone={v.publie ? Eye : EyeOff} eyebrow={t.publierEyebrow} titre={t.publierTitre}>
      <p className={`font-editorial text-sm leading-relaxed mb-4 ${v.publie ? 'text-brass' : 'text-ivory-soft'}`}>{v.publie ? t.enLigne : t.brouillon}</p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-5">
        <code className="flex-1 min-w-0 truncate rounded-card border border-white/15 bg-black/30 px-3 py-2.5 font-sans text-sm text-ivory">{url}</code>
        <BoutonSobre onClick={copier}>{copie ? <Check size={14} /> : <Copy size={14} />} {copie ? t.copie : t.copier}</BoutonSobre>
      </div>
      <div className="flex flex-wrap gap-3">
        <BoutonOr onClick={() => majVitrine(v.slug, { publie: !v.publie })}>{v.publie ? t.depublier : t.publier}</BoutonOr>
        <Link to={addLocale(`/vitrine/${v.slug}`, lang)} className="inline-flex items-center gap-2 px-5 py-2.5 font-sans uppercase tracking-wider text-xs text-ivory-soft hover:text-brass transition">
          {t.voir} <ArrowUpRight size={14} />
        </Link>
      </div>
    </Carte>
  );
};

// ─── Boutique du festival ────────────────────────────────────────────
const BoutiqueCarte: React.FC<{ v: Vitrine; lang: 'FR' | 'EN' }> = ({ v, lang }) => {
  const t = T[lang];
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const b = v.boutique ?? { statut: 'aucune' as const };

  async function demander() {
    if (!user) return;
    setBusy(true); setErr(null);
    try {
      await demanderBoutique(v.slug);
      await sendMessage({
        recipient: { type: 'admin', adminEmail: COURRIEL_EQUIPE },
        fromEmail: user.email ?? '', fromName: user.displayName ?? v.nom,
        subject: `Demande de boutique : ${v.nom}`,
        body: `${user.displayName ?? user.email ?? 'Une personne'} demande une boutique du festival pour la vitrine « ${v.nom} » (${urlPublique(v.slug)}), au tarif annuel de ${PRIX_BOUTIQUE_ANNUEL} $.\n\nÀ traiter dans l’admin, section Vitrines : poser le lien de paiement, puis activer la boutique une fois l’année réglée.`,
      }).catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.erreur);
    } finally { setBusy(false); }
  }

  const expire = b.expireLe?.toDate?.();
  return (
    <Carte icone={Store} eyebrow={t.boutiqueEyebrow} titre={t.boutiqueTitre} aide={t.boutiqueAide}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-display text-3xl text-brass">{PRIX_BOUTIQUE_ANNUEL} $<span className="font-sans text-xs text-ivory-soft uppercase tracking-wider ml-2">{lang === 'FR' ? 'par année' : 'a year'}</span></span>
        {b.statut === 'aucune' && <BoutonOr onClick={demander} disabled={busy}><Store size={14} /> {t.demander}</BoutonOr>}
        {b.statut === 'refusee' && <BoutonSobre onClick={demander} disabled={busy}>{t.redemander}</BoutonSobre>}
      </div>
      {b.statut === 'demandee' && (
        <div className="mt-4 space-y-3">
          <p className="font-editorial text-sm text-brass">{t.demandeEnvoyee}. {t.statutDemandee}</p>
          {b.lienPaiement && (
            <a href={b.lienPaiement} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold rounded-card hover:bg-brass-soft transition">
              {t.payer} <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      )}
      {b.statut === 'active' && (
        <p className="mt-4 font-editorial text-sm text-brass inline-flex items-center gap-2">
          <Check size={14} /> {t.statutActive} {expire ? expire.toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}.
        </p>
      )}
      {b.statut === 'refusee' && <p className="mt-4 font-editorial text-sm text-ivory-soft">{t.statutRefusee}</p>}
      {err && <p className="font-sans text-xs text-blush mt-3">{err}</p>}
    </Carte>
  );
};

// ─── Retirer ─────────────────────────────────────────────────────────
const Danger: React.FC<{ v: Vitrine; lang: 'FR' | 'EN'; onSupprimee: () => void }> = ({ v, lang, onSupprimee }) => {
  const t = T[lang];
  const [arme, setArme] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  async function cliquer() {
    if (!arme) { setArme(true); timer.current = window.setTimeout(() => setArme(false), 5000); return; }
    window.clearTimeout(timer.current);
    setBusy(true);
    try { await supprimerVitrine(v); onSupprimee(); } finally { setBusy(false); setArme(false); }
  }
  return (
    <Carte icone={Trash2} eyebrow={t.dangerEyebrow} titre={t.dangerTitre} aide={t.dangerAide}>
      <button type="button" onClick={cliquer} disabled={busy}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-card font-sans uppercase tracking-wider text-xs font-semibold transition border ${arme ? 'bg-blush text-midnight-deep border-blush' : 'border-white/20 text-ivory-soft hover:border-blush hover:text-blush'} disabled:opacity-50`}>
        <Trash2 size={14} /> {busy ? t.suppression : arme ? t.confirmer : t.supprimer}
      </button>
    </Carte>
  );
};
