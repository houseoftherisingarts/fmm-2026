import React, { useEffect, useRef, useState } from 'react';
import { useBadges } from '../contexts/BadgesContext';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Users, Pencil, Trash2, Save, LogOut, Loader2, Camera, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PageHeader from '../components/layout/PageHeader';
import { addLocale } from '../lib/locale';
import { lireFiche, type Membre } from '../firebase/ordre';
import {
  suivreGuilde, demanderAdhesion, retirerDemande, quitterGuilde,
  modifierGuilde, supprimerGuilde, slugDeGuilde, slugDisponible,
  LONGUEUR_NOM_MAX, type Guilde, type MonnaieGuilde,
  changerBlason, changerBanniereGuilde, motDeLaForme, motDuChef,
  nomMonnaie, FORMES_GUILDE, type FormeGuilde,
} from '../firebase/guildes';
import { guildeRejoindreParCode } from '../firebase/guildeMonnaie';
import MurGuilde from '../components/mur/MurGuilde';
import Onglets, { cheminGuilde, type OngletGuilde } from '../components/guilde/Onglets';
import SoldePieces from '../components/guilde/SoldePieces';
import Tresor from '../components/guilde/Tresor';
import Membres from '../components/guilde/Membres';
import Salon from '../components/guilde/Salon';
import Evenements from '../components/guilde/Evenements';
import Marche from '../components/guilde/Marche';

// ─── La fiche d'un groupe ────────────────────────────────────────────
// Alex, 2026-08-27 : l'en-tête, les membres et la file des demandes.
// Depuis le 6 septembre 2026 la page vit sous l'adresse du groupe
// (/vestrvegirvikingarclan) et se lit en six panneaux : le mur, le
// salon, les événements, le marché, le trésor et les membres. Le
// composant accepte la guilde déjà résolue par GuildeParSlug, pour ne
// pas la relire une seconde fois au montage.

const champ = {
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(var(--sk-glow-rgb),0.22)',
};

const GuildePage: React.FC<{ guildeInitiale?: Guilde; onglet?: OngletGuilde }> = ({
  guildeInitiale, onglet: ongletRoute,
}) => {
  useCaravanPage();
  const { id: idRoute } = useParams<{ id: string }>();
  const { lang } = useUI();
  const navigate = useNavigate();
  const { user, isAdmin, openSignIn } = useAuth();
  const { gagnerBadge } = useBadges();
  const [params] = useSearchParams();
  const fr = lang === 'FR';

  const id = guildeInitiale?.id || idRoute;
  const [guilde, setGuilde] = useState<Guilde | null | undefined>(guildeInitiale);
  useEffect(() => {
    if (!id) return;
    return suivreGuilde(id, setGuilde);
  }, [id]);

  // Les fiches des membres et des personnes en attente, chargées à la
  // volée et gardées dans une ref pour ne jamais relire ce qu'on a
  // déjà (pas de dépendance sur un état qui bouclerait sur lui-même).
  const fichesRef = useRef<Record<string, Membre | null>>({});
  const [, tick] = useState(0);
  useEffect(() => {
    if (!guilde) return;
    const uids = Array.from(new Set([...guilde.membres, ...guilde.demandes]));
    const manquants = uids.filter((u) => !(u in fichesRef.current));
    if (manquants.length === 0) return;
    (async () => {
      const entries = await Promise.all(
        manquants.map(async (u) => [u, await lireFiche(u).catch(() => null)] as const),
      );
      for (const [u, f] of entries) fichesRef.current[u] = f;
      tick((n) => n + 1);
    })();
  }, [guilde]);

  // Le badge du groupe tombe dès que la personne s'y voit membre
  // (Alex, 2026-08-28).
  const estMembre = Boolean(user && guilde?.membres.includes(user.uid));
  useEffect(() => {
    if (estMembre) gagnerBadge('guilde');
  }, [estMembre, gagnerBadge]);

  // L'ancienne adresse /guildes/{id} mène toujours quelque part : elle
  // renvoie sur celle du groupe dès qu'il en a une.
  const slug = guilde?.slug;
  useEffect(() => {
    if (!guildeInitiale && slug) {
      navigate(cheminGuilde(slug, ongletRoute || 'mur', lang), { replace: true });
    }
  }, [guildeInitiale, slug, ongletRoute, lang, navigate]);

  // Sans adresse (les groupes fondés avant le 6 septembre), l'onglet
  // reste dans la page plutôt que dans l'URL.
  const [ongletLocal, setOngletLocal] = useState<OngletGuilde>('mur');
  const onglet = ongletRoute || ongletLocal;
  const allerA = (o: OngletGuilde) => {
    if (slug) navigate(cheminGuilde(slug, o, lang));
    else setOngletLocal(o);
  };

  const [editEnCours, setEditEnCours] = useState(false);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [monnaie, setMonnaie] = useState<MonnaieGuilde>({ nom: '', sigle: '', glyphe: '◎' });
  const [adresse, setAdresse] = useState('');
  const [busy, setBusy] = useState(false);
  const [erreurEdition, setErreurEdition] = useState<string | null>(null);

  const [blasonEnvoi, setBlasonEnvoi] = useState(false);
  const [banniereEnvoi, setBanniereEnvoi] = useState(false);
  const [adhesion, setAdhesion] = useState(false);
  const [erreurAdhesion, setErreurAdhesion] = useState<string | null>(null);
  const fichierBanniere = useRef<HTMLInputElement>(null);
  const fichierBlason = useRef<HTMLInputElement>(null);

  const ouvrirEdition = () => {
    if (!guilde) return;
    setNom(guilde.nom);
    setDescription(guilde.description || '');
    setMonnaie({
      nom: guilde.monnaie?.nom || '',
      sigle: guilde.monnaie?.sigle || '',
      glyphe: guilde.monnaie?.glyphe || '◎',
    });
    setAdresse(guilde.slug || slugDeGuilde(guilde.nom, guilde.forme));
    setErreurEdition(null);
    setEditEnCours(true);
  };

  const enregistrer = async () => {
    if (!guilde) return;
    setBusy(true); setErreurEdition(null);
    try {
      const patch: Parameters<typeof modifierGuilde>[1] = { nom, description };
      if (monnaie.nom.trim() && monnaie.sigle.trim()) {
        patch.monnaie = {
          nom: monnaie.nom.trim().slice(0, 40),
          sigle: monnaie.sigle.trim().toUpperCase().slice(0, 4),
          glyphe: monnaie.glyphe.trim().slice(0, 4) || '◎',
        };
        if (patch.monnaie.sigle.length < 2) {
          setErreurEdition(fr ? 'Le sigle tient en deux à quatre lettres.' : 'The ticker holds two to four letters.');
          return;
        }
      }
      const voulue = adresse.trim().toLowerCase();
      if (voulue && voulue !== guilde.slug) {
        if (!(await slugDisponible(voulue, guilde.id))) {
          setErreurEdition(fr ? 'Cette adresse est prise ou réservée.' : 'That address is taken or reserved.');
          return;
        }
        patch.slug = voulue;
      }
      await modifierGuilde(guilde.id, patch);
      setEditEnCours(false);
      if (patch.slug) navigate(cheminGuilde(patch.slug, onglet, lang), { replace: true });
    } catch (e) {
      setErreurEdition(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const detruire = async () => {
    if (!guilde) return;
    if (!confirm(fr ? 'Détruire ce groupe ? C’est irréversible.' : 'Destroy this group? This cannot be undone.')) return;
    await supprimerGuilde(guilde.id);
    navigate(addLocale('/guildes', lang));
  };

  const choisirBanniere = async (f: File | undefined) => {
    if (!f || !guilde) return;
    setBanniereEnvoi(true);
    try { await changerBanniereGuilde(guilde.id, f); } finally { setBanniereEnvoi(false); }
  };
  const choisirBlason = async (f: File | undefined) => {
    if (!f || !guilde) return;
    setBlasonEnvoi(true);
    try { await changerBlason(guilde.id, f); } finally { setBlasonEnvoi(false); }
  };

  const code = params.get('code') || '';
  const rejoindreParCode = async () => {
    setAdhesion(true); setErreurAdhesion(null);
    try { await guildeRejoindreParCode({ code }); }
    catch (e) {
      const c = (e as { code?: string })?.code || '';
      setErreurAdhesion(/(not-found|internal|unavailable)$/.test(c)
        ? (fr ? 'Ce code ne mène à rien. Demandez-en un neuf.' : 'That code leads nowhere. Ask for a fresh one.')
        : (e instanceof Error ? e.message : String(e)));
    }
    finally { setAdhesion(false); }
  };

  if (!user) {
    return (
      <main className="min-h-screen text-ivory">
        <SEO title={fr ? 'Guilde' : 'Guild'} noindex />
        <section className="relative caravan-stage bleed-edges pt-24 pb-20 overflow-hidden">
          <Brume />
          <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8">
            <div className="glass-light rounded-lg-card p-8 text-center">
              <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-5">
                {fr ? 'Les guildes se lisent entre membres. Connectez-vous pour les ouvrir.' : 'Guilds are read among members. Sign in to open them.'}
              </p>
              <button type="button" onClick={openSignIn}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                {fr ? 'Se connecter' : 'Sign in'}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (guilde === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }

  if (guilde === null) {
    return (
      <main className="min-h-screen text-ivory">
        <SEO title={fr ? 'Guilde' : 'Guild'} noindex />
        <section className="relative caravan-stage bleed-edges pt-24 pb-20 overflow-hidden">
          <Brume />
          <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 text-center">
            <p className="font-editorial text-base text-ivory-soft mb-5">
              {fr ? 'Ce groupe n’existe pas ou plus.' : 'This group no longer exists.'}
            </p>
            <Link to={addLocale('/guildes', lang)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
              {fr ? 'Retour aux guildes' : 'Back to guilds'}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const estAdminGuilde = guilde.admins.includes(user.uid);
  const peutGerer = isAdmin || estAdminGuilde;
  const enAttente = guilde.demandes.includes(user.uid);
  const mot = motDeLaForme(guilde.forme, lang);

  const reserve = (
    <section className="glass-light rounded-lg-card p-8 text-center">
      <p className="font-editorial text-base text-ivory-soft leading-relaxed">
        {fr
          ? `Ce panneau se lit entre membres. Entrez dans ${mot.toLowerCase()} pour l’ouvrir.`
          : 'This panel is read among members. Join the group to open it.'}
      </p>
    </section>
  );

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={guilde.nom} noindex />
      <PageHeader
        eyebrow={mot}
        titleA={guilde.nom}
        intro={guilde.description || (fr
          ? `${['clan', 'ordre'].includes(guilde.forme || 'guilde') ? 'Un' : 'Une'} ${mot.toLowerCase()} de l’Ordre.`
          : `A ${mot.toLowerCase()} of the Order.`)}
        orbImage="/histoire/archives/lievre/2022-e9ed2ea5.webp"
      />
      <section className="relative caravan-stage bleed-edges pt-4 pb-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 space-y-6">

          {/* ── La bannière du groupe (Alex, 2026-08-28) ── */}
          {(guilde.banniereUrl || peutGerer) && (
            <div className="relative rounded-[16px] p-[3px]"
                 style={{ background: 'linear-gradient(135deg, var(--sk-gilt-pale) 0%, var(--color-brass) 40%, var(--sk-brass-deep) 70%, var(--sk-gilt-pale) 100%)',
                          boxShadow: '0 0 0 1px rgba(var(--sk-wood-rgb),0.85), 0 20px 50px -30px rgba(0,0,0,0.9)' }}>
              <div className="relative overflow-hidden rounded-[13px] aspect-[16/5]"
                   style={{ background: guilde.banniereUrl ? undefined : 'url(/textures/black-linen.png), rgba(var(--sk-ink-rgb),0.9)' }}>
                {guilde.banniereUrl && <img src={guilde.banniereUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <div className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                     style={{ background: 'linear-gradient(to top, rgba(var(--sk-ink-rgb),0.6), transparent)' }} />
                {peutGerer && (
                  <>
                    <button type="button" onClick={() => fichierBanniere.current?.click()} disabled={banniereEnvoi}
                            className="absolute bottom-3 right-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-full font-sans uppercase tracking-[0.18em] text-[10px]"
                            style={{ background: 'rgba(var(--sk-ink-rgb),0.75)', border: '1px solid rgba(var(--sk-parchment-rgb),0.25)', color: 'rgba(var(--sk-parchment-rgb),0.9)' }}>
                      {banniereEnvoi ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                      {guilde.banniereUrl ? (fr ? 'Changer la bannière' : 'Change the banner') : (fr ? 'Ajouter une bannière' : 'Add a banner')}
                    </button>
                    <input ref={fichierBanniere} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only"
                           onChange={(e) => { void choisirBanniere(e.target.files?.[0]); e.target.value = ''; }} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Le blason, le compte des membres, mes deux bourses ── */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden shrink-0 border border-brass/40 flex items-center justify-center"
                  style={{ background: 'rgba(var(--sk-deep-rgb),0.6)', boxShadow: '0 0 28px -8px rgba(var(--sk-gilt-rgb),0.5)' }}>
              {guilde.blason
                ? <img src={guilde.blason} alt="" className="w-full h-full object-cover" />
                : <Users size={26} className="text-brass" />}
            </span>
            <div className="min-w-0">
              <p className="font-sans uppercase tracking-[0.22em] text-[10px]" style={{ color: 'var(--sk-gilt)' }}>{mot}</p>
              <p className="font-sans text-sm text-ivory-soft mt-1 inline-flex items-center gap-1.5">
                <Users size={12} /> {guilde.nbMembres} {fr ? (guilde.nbMembres > 1 ? 'membres' : 'membre') : (guilde.nbMembres > 1 ? 'members' : 'member')}
                {guilde.monnaie && <span className="text-ivory-soft/50"> · {nomMonnaie(guilde, lang)}</span>}
              </p>
            </div>
            {peutGerer && (
              <>
                <button type="button" onClick={() => fichierBlason.current?.click()} disabled={blasonEnvoi}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-xs uppercase tracking-wider transition rounded-card disabled:opacity-50">
                  {blasonEnvoi ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                  {guilde.blason ? (fr ? 'Changer la photo' : 'Change the photo') : (fr ? 'Ajouter une photo' : 'Add a photo')}
                </button>
                <input ref={fichierBlason} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only"
                       onChange={(e) => { void choisirBlason(e.target.files?.[0]); e.target.value = ''; }} />
              </>
            )}
            {estMembre && (
              <div className="w-full sm:w-auto sm:ml-auto">
                <SoldePieces guilde={guilde} uid={user.uid} lang={lang} />
              </div>
            )}
          </div>

          {/* ── Entrer dans le groupe ── */}
          {!estMembre && (
            <section className="glass-light rounded-lg-card p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
              <p className="font-editorial text-sm text-ivory-soft leading-relaxed min-w-0 flex-1">
                {code
                  ? (fr ? 'Vous arrivez avec une invitation. La porte s’ouvre sans attendre.' : 'You arrive with an invitation. The door opens right away.')
                  : (fr ? 'Demandez à joindre. Un chef du groupe répondra.' : 'Ask to join. A leader of the group will answer.')}
              </p>
              {code ? (
                <button type="button" onClick={rejoindreParCode} disabled={adhesion}
                        className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
                  {adhesion ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                  {fr ? 'Rejoindre' : 'Join'}
                </button>
              ) : (
                <button type="button" disabled={adhesion}
                        onClick={async () => {
                          setAdhesion(true);
                          try { await (enAttente ? retirerDemande(guilde.id, user.uid) : demanderAdhesion(guilde.id, user.uid)); }
                          finally { setAdhesion(false); }
                        }}
                        className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50 ${
                          enAttente ? 'border border-ivory-soft/25 text-ivory-soft hover:text-brass' : 'bg-brass text-midnight-deep hover:bg-brass-soft'
                        }`}>
                  {enAttente ? (fr ? 'Demande envoyée' : 'Request sent') : (fr ? 'Demander à joindre' : 'Ask to join')}
                </button>
              )}
              {erreurAdhesion && <p role="alert" className="w-full font-sans text-xs" style={{ color: '#E08A6E' }}>{erreurAdhesion}</p>}
            </section>
          )}

          {/* ── Gestion (chef du groupe ou équipe) ── */}
          {peutGerer && (
            <section className="glass-light rounded-lg-card p-5 md:p-6">
              {editEnCours ? (
                <div className="space-y-3">
                  <div>
                    <span className="block witcher-stat-label mb-1.5">{fr ? 'La forme du groupe' : 'The kind of group'}</span>
                    <div className="flex flex-wrap gap-1.5 mb-3" role="radiogroup">
                      {FORMES_GUILDE.map((f) => {
                        const actif = (guilde.forme || 'guilde') === f.id;
                        return (
                          <button key={f.id} type="button" role="radio" aria-checked={actif}
                            onClick={() => { void modifierGuilde(guilde.id, { forme: f.id as FormeGuilde }); }}
                            className="px-3 py-1.5 rounded-full font-sans uppercase tracking-[0.16em] text-[10px] transition-colors"
                            style={{ border: `1px solid ${actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.2)'}`, background: actif ? 'rgba(var(--sk-gilt-rgb),0.16)' : 'transparent', color: actif ? 'var(--sk-parchment)' : 'rgba(var(--sk-parchment-rgb),0.55)' }}>
                            {fr ? f.FR : f.EN}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="block">
                    <span className="block witcher-stat-label mb-1.5">{fr ? 'Nom' : 'Name'}</span>
                    <input value={nom} onChange={(e) => setNom(e.target.value.slice(0, LONGUEUR_NOM_MAX))}
                      className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory" style={champ} />
                  </label>
                  <label className="block">
                    <span className="block witcher-stat-label mb-1.5">{fr ? 'Description' : 'Description'}</span>
                    <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory resize-y" style={champ} />
                  </label>

                  {/* L'adresse du groupe */}
                  <label className="block">
                    <span className="block witcher-stat-label mb-1.5">{fr ? 'L’adresse du groupe' : 'The group address'}</span>
                    <input value={adresse}
                      onChange={(e) => setAdresse(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory" style={champ} />
                    <span className="block font-sans text-[11px] mt-1.5" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                      festivalmedievaldemontpellier.org/{adresse || '…'}
                    </span>
                  </label>

                  {/* La monnaie du groupe */}
                  <div>
                    <span className="block witcher-stat-label mb-1.5">{fr ? 'La monnaie du groupe' : 'The group currency'}</span>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <input value={monnaie.nom} onChange={(e) => setMonnaie((m) => ({ ...m, nom: e.target.value.slice(0, 40) }))}
                        placeholder={fr ? 'Vikingar Coin' : 'Vikingar Coin'}
                        aria-label={fr ? 'Le nom de la monnaie' : 'The currency name'}
                        className="px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40" style={champ} />
                      <input value={monnaie.sigle} onChange={(e) => setMonnaie((m) => ({ ...m, sigle: e.target.value.toUpperCase().slice(0, 4) }))}
                        placeholder="VIK" size={5}
                        aria-label={fr ? 'Le sigle, deux à quatre lettres' : 'The ticker, two to four letters'}
                        className="px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory text-center tracking-widest placeholder:text-ivory-soft/40" style={champ} />
                      <input value={monnaie.glyphe} onChange={(e) => setMonnaie((m) => ({ ...m, glyphe: e.target.value.slice(0, 4) }))}
                        placeholder="◎" size={3}
                        aria-label={fr ? 'Le glyphe' : 'The glyph'}
                        className="px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory text-center placeholder:text-ivory-soft/40" style={champ} />
                    </div>
                  </div>

                  {erreurEdition && <p role="alert" className="font-sans text-xs" style={{ color: '#E08A6E' }}>{erreurEdition}</p>}

                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setEditEnCours(false)}
                      className="px-4 py-2 font-sans uppercase tracking-wider text-xs text-ivory-soft hover:text-brass transition">
                      {fr ? 'Annuler' : 'Cancel'}
                    </button>
                    <button type="button" onClick={enregistrer} disabled={busy || nom.trim().length < 2}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {fr ? 'Enregistrer' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="witcher-stat-label">
                    {fr ? `Gestion · ${motDuChef(guilde.forme, lang)}` : `Management · ${motDuChef(guilde.forme, lang)}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={ouvrirEdition}
                      className="inline-flex items-center gap-2 px-3.5 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-[11px] uppercase tracking-wider transition rounded-card">
                      <Pencil size={12} /> {fr ? 'Modifier' : 'Edit'}
                    </button>
                    <button type="button" onClick={detruire}
                      className="inline-flex items-center gap-2 px-3.5 py-2 border border-[#E08A6E]/40 text-[#E08A6E] hover:bg-[#E08A6E]/10 font-sans text-[11px] uppercase tracking-wider transition rounded-card">
                      <Trash2 size={12} /> {fr ? 'Détruire' : 'Destroy'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Les six panneaux ── */}
          <Onglets actif={onglet} lang={lang} onChoisir={allerA} />

          <div id={`panneau-guilde-${onglet}`} role="tabpanel" aria-labelledby={`onglet-guilde-${onglet}`}>
            {onglet === 'mur' && <MurGuilde lang={lang} guildeId={guilde.id} peutEcrire={estMembre} />}
            {onglet === 'salon' && (estMembre ? <Salon guilde={guilde} uid={user.uid} estChef={estAdminGuilde} /> : reserve)}
            {onglet === 'evenements' && (estMembre ? <Evenements guilde={guilde} uid={user.uid} estChef={estAdminGuilde} /> : reserve)}
            {onglet === 'marche' && (estMembre ? <Marche guilde={guilde} uid={user.uid} estChef={estAdminGuilde} /> : reserve)}
            {onglet === 'tresor' && (estMembre
              ? <Tresor guilde={guilde} uid={user.uid} estChef={estAdminGuilde} lang={lang} fiches={fichesRef.current} />
              : reserve)}
            {onglet === 'membres' && (
              <Membres guilde={guilde} uid={user.uid} estChef={estAdminGuilde}
                       peutGerer={peutGerer} lang={lang} fiches={fichesRef.current} />
            )}
          </div>

          {estMembre && (
            <div className="flex justify-end">
              <button type="button"
                onClick={() => { void quitterGuilde(guilde.id, user.uid); navigate(addLocale('/guildes', lang)); }}
                className="inline-flex items-center gap-2 px-3.5 py-2 font-sans text-[11px] uppercase tracking-wider text-ivory-soft hover:text-[#E08A6E] transition">
                <LogOut size={12} /> {fr ? 'Quitter' : 'Leave'}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default GuildePage;
