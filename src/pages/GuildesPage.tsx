import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Users, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PageHeader from '../components/layout/PageHeader';
import { addLocale } from '../lib/locale';
import {
  creerGuilde, demanderAdhesion, retirerDemande, suivreGuildes,
  slugDeGuilde, slugDisponible, LONGUEUR_NOM_MAX, type Guilde,
  FORMES_GUILDE, motDeLaForme, type FormeGuilde,
} from '../firebase/guildes';

// ─── Les guildes ───────────────────────────────────────────────────
// La liste des sous-groupes de l'Ordre et le formulaire pour en
// fonder un (Alex, 2026-08-27).
const GuildesPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const navigate = useNavigate();
  const { user, openSignIn } = useAuth();
  const fr = lang === 'FR';

  const [guildes, setGuildes] = useState<Guilde[]>([]);
  useEffect(() => suivreGuildes(setGuildes), []);

  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [forme, setForme] = useState<FormeGuilde>('guilde');
  const [creation, setCreation] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // L'adresse du groupe se lit pendant qu'on tape le nom, et sa
  // disponibilité se vérifie une fois la frappe retombée : personne ne
  // remplit le formulaire au complet pour se faire dire à la fin que
  // l'adresse est prise (Alex, 2026-09-06).
  const adresse = slugDeGuilde(nom, forme);
  const [libre, setLibre] = useState<boolean | null>(null);
  useEffect(() => {
    if (nom.trim().length < 2) { setLibre(null); return; }
    setLibre(null);
    const t = window.setTimeout(() => {
      void slugDisponible(adresse).then(setLibre).catch(() => setLibre(null));
    }, 400);
    return () => window.clearTimeout(t);
  }, [adresse, nom]);

  const fonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreation(true); setErreur(null);
    try {
      const { slug } = await creerGuilde({ uid: user.uid, nom, description, forme });
      navigate(addLocale(`/${slug}`, lang));
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally { setCreation(false); }
  };

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={fr ? 'Guildes' : 'Guilds'} noindex />
      <PageHeader
        eyebrow={fr ? 'L’Ordre' : 'The Order'}
        titleA={fr ? 'Guildes' : 'Guilds'}
        intro={fr
          ? 'Des sous-groupes fondés par les membres. N’importe qui en crée une; les autres demandent à joindre.'
          : 'Sub-groups founded by members. Anyone can create one; others ask to join.'}
        orbImage="/histoire/archives/lievre/2022-e9ed2ea5.webp"
      />
      <section className="relative caravan-stage bleed-edges pt-4 pb-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 space-y-5">
          {!user ? (
            <div className="glass-light rounded-lg-card p-8 text-center">
              <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-5">
                {fr ? 'Les guildes se lisent entre membres. Connectez-vous pour les ouvrir.' : 'Guilds are read among members. Sign in to open them.'}
              </p>
              <button type="button" onClick={openSignIn}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                {fr ? 'Se connecter' : 'Sign in'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="font-editorial italic text-sm text-ivory-soft">
                  <span className="text-brass tabular-nums font-medium">{guildes.length}</span>{' '}
                  {fr ? (guildes.length > 1 ? 'guildes' : 'guilde') : (guildes.length > 1 ? 'guilds' : 'guild')}
                </p>
                <button type="button" onClick={() => setOuvert((v) => !v)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                  <Plus size={13} /> {fr ? 'Fonder' : 'Found'}
                </button>
              </div>

              {ouvert && (
                <form onSubmit={fonder} className="glass-light rounded-lg-card p-5 md:p-6 space-y-3">
                  <div>
                    <span className="block witcher-stat-label mb-1.5">{fr ? 'Quel mot vous ressemble ?' : 'Which word suits you?'}</span>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={fr ? 'La forme du groupe' : 'The kind of group'}>
                      {FORMES_GUILDE.map((f) => {
                        const actif = forme === f.id;
                        return (
                          <button key={f.id} type="button" role="radio" aria-checked={actif} onClick={() => setForme(f.id)}
                            className="px-3 py-1.5 rounded-full font-sans uppercase tracking-[0.16em] text-[10px] transition-colors"
                            style={{ border: `1px solid ${actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.2)'}`, background: actif ? 'rgba(var(--sk-gilt-rgb),0.16)' : 'transparent', color: actif ? 'var(--sk-parchment)' : 'rgba(var(--sk-parchment-rgb),0.55)' }}>
                            {fr ? f.FR : f.EN}
                          </button>
                        );
                      })}
                    </div>
                    <p className="font-sans text-[10px] mt-1.5" style={{ color: 'rgba(var(--sk-parchment-rgb),0.45)' }}>
                      {fr ? 'Le mot change, le fonctionnement reste le même.' : 'The word changes, everything else stays the same.'}
                    </p>
                  </div>
                  <label className="block">
                    <span className="block witcher-stat-label mb-1.5">{fr ? 'Nom' : 'Name'}</span>
                    <input value={nom} onChange={(e) => setNom(e.target.value.slice(0, LONGUEUR_NOM_MAX))} required autoFocus
                      placeholder={fr ? `Le nom ${['clan','ordre'].includes(forme) ? 'du' : 'de la'} ${motDeLaForme(forme, 'FR').toLowerCase()}` : `The ${motDeLaForme(forme, 'EN').toLowerCase()}’s name`}
                      className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40"
                      style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(var(--sk-glow-rgb),0.22)' }} />
                  </label>
                  <label className="block">
                    <span className="block witcher-stat-label mb-1.5">{fr ? 'Description' : 'Description'}</span>
                    <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder={fr ? `Ce qui rassemble ${['clan','ordre'].includes(forme) ? 'le' : 'la'} ${motDeLaForme(forme, 'FR').toLowerCase()}` : `What brings the ${motDeLaForme(forme, 'EN').toLowerCase()} together`}
                      className="w-full px-3.5 py-2.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40 resize-y"
                      style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(var(--sk-glow-rgb),0.22)' }} />
                  </label>
                  {nom.trim().length >= 2 && (
                    <p className="font-sans text-[11px] leading-relaxed" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                      {fr ? 'Votre adresse : ' : 'Your address: '}
                      <span style={{ color: 'var(--sk-gilt)' }}>festivalmedievaldemontpellier.org/{adresse}</span>
                      {libre === false && (
                        <span className="block mt-1" style={{ color: '#E08A6E' }}>
                          {fr ? 'Cette adresse est prise. Changez un mot du nom.' : 'That address is taken. Change a word of the name.'}
                        </span>
                      )}
                    </p>
                  )}
                  {erreur && <p className="font-sans text-xs" style={{ color: '#E08A6E' }}>{erreur}</p>}
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setOuvert(false)}
                      className="px-4 py-2 font-sans uppercase tracking-wider text-xs text-ivory-soft hover:text-brass transition">
                      {fr ? 'Annuler' : 'Cancel'}
                    </button>
                    <button type="submit" disabled={creation || nom.trim().length < 2 || libre === false}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50">
                      {creation ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />} {fr ? 'Fonder' : 'Found'}
                    </button>
                  </div>
                </form>
              )}

              {guildes.length === 0 ? (
                <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
                  {fr ? 'Aucune guilde encore. Fondez la première.' : 'No guild yet. Found the first one.'}
                </p>
              ) : guildes.map((g) => (
                <CarteGuilde key={g.id} guilde={g} uid={user.uid} lang={lang} />
              ))}
            </>
          )}
        </div>
      </section>
    </main>
  );
};

// L'adresse d'un groupe, avec le repli sur l'ancienne forme tant que
// les groupes fondés avant le 6 septembre 2026 n'en ont pas.
const cheminDuGroupe = (g: Guilde, lang: 'FR' | 'EN'): string =>
  g.slug ? addLocale(`/${g.slug}`, lang) : `${addLocale('/guildes', lang)}/${g.id}`;

const CarteGuilde: React.FC<{ guilde: Guilde; uid: string; lang: 'FR' | 'EN' }> = ({ guilde, uid, lang }) => {
  const fr = lang === 'FR';
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const estMembre = guilde.membres.includes(uid);
  const enAttente = guilde.demandes.includes(uid);

  const demander = async () => {
    setBusy(true);
    try { await (enAttente ? retirerDemande(guilde.id, uid) : demanderAdhesion(guilde.id, uid)); }
    finally { setBusy(false); }
  };

  return (
    <div className="glass-light rounded-lg-card p-5 md:p-6 flex items-center gap-4">
      {guilde.blason ? (
        <span className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-brass/40">
          <img src={guilde.blason} alt="" className="w-full h-full object-cover" loading="lazy" />
        </span>
      ) : (
        <span className="witcher-tile shrink-0" style={{ width: 48, height: 48 }}>
          <span className="witcher-tile-inner" style={{ color: 'var(--sk-gilt)' }}><Shield size={18} /></span>
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Link to={cheminDuGroupe(guilde, lang)} className="block">
          <h3 className="font-display title-medieval text-lg text-ivory truncate hover:text-brass transition-colors">{guilde.nom}</h3>
        </Link>
        <span className="inline-block font-sans uppercase tracking-[0.2em] text-[9px] mb-0.5" style={{ color: 'var(--sk-gilt)' }}>
          {motDeLaForme(guilde.forme, lang)}
        </span>
        {guilde.description && (
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed line-clamp-2 mt-0.5">{guilde.description}</p>
        )}
        <p className="font-sans text-[11px] text-ivory-soft/55 mt-1 inline-flex items-center gap-1.5">
          <Users size={11} /> {guilde.nbMembres} {fr ? (guilde.nbMembres > 1 ? 'membres' : 'membre') : (guilde.nbMembres > 1 ? 'members' : 'member')}
        </p>
      </div>
      {estMembre ? (
        <button type="button" onClick={() => navigate(cheminDuGroupe(guilde, lang))}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-xs uppercase tracking-wider transition rounded-card">
          {fr ? 'Ouvrir' : 'Open'}
        </button>
      ) : (
        <button type="button" onClick={demander} disabled={busy}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 font-sans text-xs uppercase tracking-wider transition rounded-card disabled:opacity-50 ${
                  enAttente ? 'border border-ivory-soft/25 text-ivory-soft hover:text-brass' : 'bg-brass text-midnight-deep hover:bg-brass-soft'
                }`}>
          {enAttente ? (fr ? 'Demande envoyée' : 'Request sent') : (fr ? 'Demander à joindre' : 'Ask to join')}
        </button>
      )}
    </div>
  );
};

export default GuildesPage;
