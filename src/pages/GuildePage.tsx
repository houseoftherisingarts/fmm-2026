import React, { useEffect, useRef, useState } from 'react';
import { useBadges } from '../contexts/BadgesContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Check, X, Pencil, Trash2, Save, LogOut, Loader2, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PageHeader from '../components/layout/PageHeader';
import { addLocale } from '../lib/locale';
import { lireFiche, type Membre } from '../firebase/ordre';
import {
  suivreGuilde, accepterMembre, refuserMembre, quitterGuilde,
  modifierGuilde, supprimerGuilde, LONGUEUR_NOM_MAX, type Guilde,
  changerBlason,
} from '../firebase/guildes';
import MurGuilde from '../components/mur/MurGuilde';

// ─── La fiche d'une guilde ───────────────────────────────────────────
// En-tête, membres, la file des demandes pour l'admin de la guilde
// (le fondateur) ou l'équipe, et le mur propre à la guilde
// (Alex, 2026-08-27).
const GuildePage: React.FC = () => {
  useCaravanPage();
  const { id } = useParams<{ id: string }>();
  const { lang } = useUI();
  const navigate = useNavigate();
  const { user, isAdmin, openSignIn } = useAuth();
  const fr = lang === 'FR';

  const [guilde, setGuilde] = useState<Guilde | null | undefined>(undefined);
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

  const [editEnCours, setEditEnCours] = useState(false);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const ouvrirEdition = () => {
    if (!guilde) return;
    setNom(guilde.nom); setDescription(guilde.description || '');
    setEditEnCours(true);
  };
  const enregistrer = async () => {
    if (!guilde) return;
    setBusy(true);
    try { await modifierGuilde(guilde.id, { nom, description }); setEditEnCours(false); }
    finally { setBusy(false); }
  };
  const detruire = async () => {
    if (!guilde) return;
    if (!confirm(fr ? 'Détruire cette guilde ? C’est irréversible.' : 'Destroy this guild? This cannot be undone.')) return;
    await supprimerGuilde(guilde.id);
    navigate(addLocale('/guildes', lang));
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
              {fr ? 'Cette guilde n’existe pas ou plus.' : 'This guild no longer exists.'}
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

  const estMembre = guilde.membres.includes(user.uid);
  const estAdminGuilde = guilde.admins.includes(user.uid);
  // Le badge de la guilde tombe dès que la personne s'y voit membre
  // (Alex, 2026-08-28).
  const { gagnerBadge } = useBadges();
  useEffect(() => {
    if (user && guilde.membres.includes(user.uid)) gagnerBadge('guilde');
  }, [user, guilde.membres, gagnerBadge]);
  const peutGerer = isAdmin || estAdminGuilde;
  // Le blason (Alex, 2026-08-28).
  const [blasonEnvoi, setBlasonEnvoi] = useState(false);
  const fichierBlason = useRef<HTMLInputElement>(null);
  const choisirBlason = async (f: File | undefined) => {
    if (!f) return;
    setBlasonEnvoi(true);
    try { await changerBlason(guilde.id, f); } finally { setBlasonEnvoi(false); }
  };

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={guilde.nom} noindex />
      <PageHeader
        eyebrow={fr ? 'Guilde' : 'Guild'}
        titleA={guilde.nom}
        intro={guilde.description || (fr ? 'Une guilde de l’Ordre.' : 'A guild of the Order.')}
        orbImage="/histoire/archives/lievre/2022-e9ed2ea5.webp"
      />
      <section className="relative caravan-stage bleed-edges pt-4 pb-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 space-y-6">

          {/* ── Le blason, en tête ── */}
          {(guilde.blason || peutGerer) && (
            <div className="flex items-center gap-4">
              <span className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden shrink-0 border border-brass/40 flex items-center justify-center"
                    style={{ background: 'rgba(26,5,11,0.6)', boxShadow: '0 0 28px -8px rgba(216,176,90,0.5)' }}>
                {guilde.blason
                  ? <img src={guilde.blason} alt="" className="w-full h-full object-cover" />
                  : <Users size={28} className="text-brass" />}
              </span>
              {peutGerer && (
                <>
                  <button type="button" onClick={() => fichierBlason.current?.click()} disabled={blasonEnvoi}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-xs uppercase tracking-wider transition rounded-card disabled:opacity-50">
                    {blasonEnvoi ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                    {guilde.blason ? (fr ? 'Changer la photo de la guilde' : 'Change the guild photo') : (fr ? 'Ajouter une photo de guilde' : 'Add a guild photo')}
                  </button>
                  <input ref={fichierBlason} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only"
                         onChange={(e) => { void choisirBlason(e.target.files?.[0]); e.target.value = ''; }} />
                </>
              )}
            </div>
          )}

          {/* ── Gestion (admin de la guilde ou équipe) ── */}
          {peutGerer && (
            <section className="glass-light rounded-lg-card p-5 md:p-6 space-y-4">
              {editEnCours ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="block witcher-stat-label mb-1.5">{fr ? 'Nom' : 'Name'}</span>
                    <input value={nom} onChange={(e) => setNom(e.target.value.slice(0, LONGUEUR_NOM_MAX))}
                      className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory"
                      style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(232,177,74,0.22)' }} />
                  </label>
                  <label className="block">
                    <span className="block witcher-stat-label mb-1.5">{fr ? 'Description' : 'Description'}</span>
                    <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory resize-y"
                      style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(232,177,74,0.22)' }} />
                  </label>
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
                  <p className="witcher-stat-label">{fr ? 'Gestion de la guilde' : 'Guild management'}</p>
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

              {/* Demandes en attente */}
              {guilde.demandes.length > 0 && (
                <div className="pt-3" style={{ borderTop: '1px solid rgba(244,239,227,0.1)' }}>
                  <p className="witcher-stat-label mb-2.5">
                    {fr ? 'Demandes en attente' : 'Pending requests'} ({guilde.demandes.length})
                  </p>
                  <div className="space-y-2">
                    {guilde.demandes.map((uid) => (
                      <DemandeLigne key={uid} uid={uid} fiche={fichesRef.current[uid]} lang={lang}
                        onAccepter={() => accepterMembre(guilde.id, uid)}
                        onRefuser={() => refuserMembre(guilde.id, uid)} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Membres ── */}
          <section className="glass-light rounded-lg-card p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="witcher-stat-label inline-flex items-center gap-1.5">
                <Users size={12} /> {fr ? 'Membres' : 'Members'} ({guilde.nbMembres})
              </p>
              {estMembre && (
                <button type="button"
                  onClick={() => { void quitterGuilde(guilde.id, user.uid); navigate(addLocale('/guildes', lang)); }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 font-sans text-[11px] uppercase tracking-wider text-ivory-soft hover:text-[#E08A6E] transition">
                  <LogOut size={12} /> {fr ? 'Quitter' : 'Leave'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {guilde.membres.map((uid) => (
                <MembreLigne key={uid} uid={uid} fiche={fichesRef.current[uid]} lang={lang}
                             admin={guilde.admins.includes(uid)} />
              ))}
            </div>
          </section>

          {/* ── Le mur de la guilde ── */}
          <section>
            <p className="witcher-stat-label mb-3">{fr ? 'Le mur de la guilde' : 'The guild wall'}</p>
            <MurGuilde lang={lang} guildeId={guilde.id} peutEcrire={estMembre} />
          </section>
        </div>
      </section>
    </main>
  );
};

const Medaillon: React.FC<{ nom: string; url?: string; hue?: number }> = ({ nom, url, hue }) => (
  <span className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-sm text-ivory/85"
        style={{ background: `hsl(${hue ?? 30} 40% 22%)` }}>
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (nom || '?').slice(0, 1).toUpperCase()}
  </span>
);

const MembreLigne: React.FC<{ uid: string; fiche: Membre | null | undefined; lang: 'FR' | 'EN'; admin: boolean }> = ({
  uid, fiche, lang, admin,
}) => {
  const fr = lang === 'FR';
  const nom = fiche?.nom || (fr ? 'Un inconnu' : 'A stranger');
  return (
    <Link to={`${addLocale('/profil', lang)}/${uid}`}
          className="flex items-center gap-2.5 px-3 py-2 rounded-card hover:bg-brass/5 transition"
          style={{ border: '1px solid rgba(244,239,227,0.1)' }}>
      <Medaillon nom={nom} url={fiche?.avatarUrl} hue={fiche?.avatarHue} />
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-sm text-ivory truncate">{nom}</span>
        {admin && <span className="block font-sans text-[10px] uppercase tracking-widest text-brass">{fr ? 'Admin' : 'Admin'}</span>}
      </span>
    </Link>
  );
};

const DemandeLigne: React.FC<{
  uid: string; fiche: Membre | null | undefined; lang: 'FR' | 'EN';
  onAccepter: () => void; onRefuser: () => void;
}> = ({ uid, fiche, lang, onAccepter, onRefuser }) => {
  const fr = lang === 'FR';
  const nom = fiche?.nom || (fr ? 'Un inconnu' : 'A stranger');
  const [busy, setBusy] = useState(false);
  const agir = async (fn: () => void) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-card" style={{ border: '1px solid rgba(244,239,227,0.1)' }}>
      <Link to={`${addLocale('/profil', lang)}/${uid}`} className="flex items-center gap-2.5 min-w-0 flex-1">
        <Medaillon nom={nom} url={fiche?.avatarUrl} hue={fiche?.avatarHue} />
        <span className="font-sans text-sm text-ivory truncate">{nom}</span>
      </Link>
      <div className="shrink-0 flex items-center gap-1.5">
        <button type="button" disabled={busy} onClick={() => agir(onAccepter)} aria-label={fr ? 'Accepter' : 'Accept'}
          className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/70 hover:text-emerald-400 hover:bg-emerald-400/10 transition disabled:opacity-50">
          <Check size={14} />
        </button>
        <button type="button" disabled={busy} onClick={() => agir(onRefuser)} aria-label={fr ? 'Refuser' : 'Decline'}
          className="w-8 h-8 rounded-full flex items-center justify-center text-ivory-soft/70 hover:text-[#E08A6E] hover:bg-[#E08A6E]/10 transition disabled:opacity-50">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default GuildePage;
