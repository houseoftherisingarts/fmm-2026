import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPinned, Store, Fuel, Coffee, ShoppingBasket, Dices, Landmark, GraduationCap,
  Hammer, Info, Scissors, Signpost, Star, Check, X, Plus, Search, Download, Compass,
  ShieldAlert, UserPlus, History, Pencil, Trash2, ChevronDown, Footprints,
} from 'lucide-react';
import { Card, EmptyState, GhostButton, PrimaryButton, DangerButton, Label, downloadCsv } from '../primitives';
import { useAuth } from '../../../contexts/AuthContext';
import VisiteGuidee, { type Etape } from './inventaire/VisiteGuidee';
import {
  watchAffichage, confier, confierRoute, poserStatut, modifierLieu, ajouterLieu, retirerLieu,
  semerAffichage, ANNEE_AFFICHAGE, ORDRE_ROUTES, GRAINES_AFFICHAGE,
  STATUTS, LIBELLE_STATUT, TON_STATUT, TYPES, LIBELLE_TYPE, PORTEURS,
  type Lieu, type Statut, type TypeLieu, type Geste,
} from '../../../firebase/affichage';

// ─── L'affichage ─────────────────────────────────────────────────────
// Alex, 2026-09-08 : « une version de ce genre de spreadsheet, en plus
// convivial ». La tournée se lit donc en routes, pas en colonnes : une
// carte par secteur, une tuile par commerce, la note de pertinence en
// étoiles, et le nom de la personne qui le porte écrit dessus. Confier
// une route entière tient en un geste. Ce qui a été fait l'an dernier
// reste écrit sur chaque tuile pour que personne ne reparte de zéro.

const ICONE: Record<TypeLieu, React.ComponentType<{ size?: number; className?: string }>> = {
  epicerie: ShoppingBasket, station: Fuel, cafe: Coffee, depanneur: Store, jeux: Dices,
  antiquaire: Landmark, communautaire: Landmark, ecole: GraduationCap, touristique: Info,
  quincaillerie: Hammer, service: Scissors, village: Signpost,
};

const champ = 'admin-input';

const Etoiles: React.FC<{ n: number; onChange?: (v: number) => void }> = ({ n, onChange }) => (
  <span className="inline-flex items-center gap-0.5" title={`Pertinence ${n} sur 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        size={12}
        onClick={onChange ? (e) => { e.stopPropagation(); onChange(i); } : undefined}
        className={onChange ? 'cursor-pointer' : ''}
        style={{ color: i <= n ? 'var(--admin-accent)' : 'var(--admin-line)', fill: i <= n ? 'var(--admin-accent)' : 'transparent' }}
      />
    ))}
  </span>
);

const Pastille: React.FC<{ statut: Statut }> = ({ statut }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.14em] whitespace-nowrap"
    style={{ border: `1px solid ${TON_STATUT[statut]}55`, color: TON_STATUT[statut], background: `${TON_STATUT[statut]}12` }}
  >
    <span className="h-1.5 w-1.5 rounded-full" style={{ background: TON_STATUT[statut] }} />
    {LIBELLE_STATUT[statut]}
  </span>
);

const Barre: React.FC<{ posees: number; total: number }> = ({ posees, total }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(196, 214, 230, 0.10)' }}>
    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${total ? (posees / total) * 100 : 0}%`, background: TON_STATUT.pose }} />
  </div>
);

function texteGeste(g: Geste): string {
  const d = g.quand?.toDate?.();
  const q = d ? d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  if (g.type === 'assignation') return `${q} · confié à ${g.vers} par ${g.par}`;
  if (g.type === 'statut')      return `${q} · ${g.vers?.toLowerCase()} par ${g.par}${g.note ? ` (${g.note})` : ''}`;
  return `${q} · ajouté par ${g.par}`;
}

// ── Le panneau d'un commerce ─────────────────────────────────────────
const Panneau: React.FC<{ lieu: Lieu; qui: string; routes: string[]; onFermer: () => void; onErreur: (m: string) => void }> =
  ({ lieu, qui, routes, onFermer, onErreur }) => {
    const [porteurLibre, setPorteurLibre] = useState('');
    const [note, setNote] = useState(lieu.note);
    const [edition, setEdition] = useState(false);
    const [nom, setNom] = useState(lieu.nom);
    const [route, setRoute] = useState(lieu.route);
    const [type, setType] = useState<TypeLieu>(lieu.type);
    const [journal, setJournal] = useState(false);
    const [occupe, setOccupe] = useState(false);

    const faire = async (fn: () => Promise<void>) => {
      setOccupe(true);
      try { await fn(); }
      catch (e) { console.warn('[affichage]', e); onErreur('Firestore n’a pas pris le geste. Réessayez dans un instant.'); }
      finally { setOccupe(false); }
    };

    return (
      <div className="admin-card-strong mt-3 p-4 md:p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold" style={{ color: 'var(--admin-accent)' }}>{LIBELLE_TYPE[lieu.type]}</p>
            <p className="font-display text-lg" style={{ color: 'var(--admin-text)' }}>{lieu.nom}</p>
          </div>
          <button type="button" onClick={onFermer} className="admin-ghost" aria-label="Fermer"><X size={13} /></button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Label>Où ça en est</Label>
          <div className="flex flex-wrap gap-1.5">
            {STATUTS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={occupe}
                onClick={() => faire(() => poserStatut(lieu, s, qui))}
                className="rounded-full px-3 py-1 font-sans text-xs transition-colors"
                style={{
                  border: `1px solid ${lieu.statut === s ? TON_STATUT[s] : 'var(--admin-line)'}`,
                  background: lieu.statut === s ? `${TON_STATUT[s]}22` : 'transparent',
                  color: lieu.statut === s ? TON_STATUT[s] : 'var(--admin-text-soft)',
                }}
              >
                {LIBELLE_STATUT[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Qui s’en occupe</Label>
          <div className="flex flex-wrap gap-1.5">
            {PORTEURS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={occupe}
                onClick={() => faire(() => confier(lieu, lieu.porteur === p ? '' : p, qui))}
                className="rounded-full px-3 py-1 font-sans text-xs transition-colors"
                style={{
                  border: `1px solid ${lieu.porteur === p ? 'var(--admin-accent)' : 'var(--admin-line)'}`,
                  background: lieu.porteur === p ? 'rgba(176,141,58,0.18)' : 'transparent',
                  color: lieu.porteur === p ? 'var(--admin-accent)' : 'var(--admin-text-soft)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); if (porteurLibre.trim()) faire(() => confier(lieu, porteurLibre.trim(), qui)).then(() => setPorteurLibre('')); }}
          >
            <input className={champ} value={porteurLibre} onChange={(e) => setPorteurLibre(e.target.value)} placeholder="Quelqu’un d’autre…" />
            <PrimaryButton type="submit" disabled={occupe || !porteurLibre.trim()}><UserPlus size={13} /> Confier</PrimaryButton>
          </form>
        </div>
        </div>

        <div>
          <Label>Pertinence du commerce</Label>
          <Etoiles n={lieu.pertinence} onChange={(v) => faire(() => modifierLieu(lieu.id, { pertinence: v }))} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); faire(() => modifierLieu(lieu.id, { note: note.trim() })); }}
        >
          <Label>Note</Label>
          <div className="flex gap-2">
            <input className={champ} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Le nom de la personne à voir, l’endroit du babillard, un refus…" />
            <PrimaryButton type="submit" disabled={occupe || note === lieu.note}><Check size={13} /></PrimaryButton>
          </div>
        </form>

        <div className="flex flex-wrap gap-1">
          <GhostButton type="button" onClick={() => setEdition((v) => !v)}><Pencil size={13} /> Corriger la fiche</GhostButton>
          <GhostButton type="button" onClick={() => setJournal((v) => !v)}><History size={13} /> Journal{lieu.historique.length > 1 ? ` (${lieu.historique.length})` : ''}</GhostButton>
        </div>

        {edition && (
          <form
            className="space-y-3 rounded-card p-3"
            style={{ border: '1px solid var(--admin-line)' }}
            onSubmit={(e) => { e.preventDefault(); faire(() => modifierLieu(lieu.id, { nom: nom.trim(), route, type })).then(() => setEdition(false)); }}
          >
            <div><Label>Nom du commerce</Label><input className={champ} value={nom} onChange={(e) => setNom(e.target.value)} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label>Route</Label>
                <select className={champ} value={route} onChange={(e) => setRoute(e.target.value)}>
                  {routes.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label>Genre de commerce</Label>
                <select className={champ} value={type} onChange={(e) => setType(e.target.value as TypeLieu)}>
                  {TYPES.map((t) => <option key={t} value={t}>{LIBELLE_TYPE[t]}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <DangerButton type="button" onClick={() => { if (window.confirm(`Retirer « ${lieu.nom} » de la tournée ?`)) faire(() => retirerLieu(lieu.id)); }}><Trash2 size={13} /> Retirer</DangerButton>
              <PrimaryButton type="submit" disabled={occupe}><Check size={13} /> Enregistrer</PrimaryButton>
            </div>
          </form>
        )}

        {journal && (
          <ol className="space-y-1 font-sans text-xs" style={{ color: 'var(--admin-text-soft)' }}>
            {[...lieu.historique].reverse().map((g, i) => <li key={i}>{texteGeste(g)}</li>)}
          </ol>
        )}
      </div>
    );
  };

// ── Une tuile de commerce ────────────────────────────────────────────
const Tuile: React.FC<{ lieu: Lieu; ouvert: boolean; onOuvrir: () => void; premiere?: boolean }> =
  ({ lieu, ouvert, onOuvrir, premiere }) => {
    const Icone = ICONE[lieu.type];
    return (
      <button
        type="button"
        onClick={onOuvrir}
        data-visite={premiere ? 'commerce' : undefined}
        className="h-full w-full rounded-card p-3 text-left transition-colors"
        style={{
          border: `1px solid ${ouvert ? 'var(--admin-accent)' : 'var(--admin-line)'}`,
          background: ouvert ? 'rgba(176,141,58,0.10)' : 'rgba(4, 8, 12, 0.35)',
        }}
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0" style={{ color: TON_STATUT[lieu.statut] }}><Icone size={16} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-sans text-sm leading-snug" style={{ color: 'var(--admin-text)' }}>{lieu.nom}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <Etoiles n={lieu.pertinence} />
              <Pastille statut={lieu.statut} />
            </div>
            {lieu.porteur && (
              <p className="mt-1 font-sans text-xs" style={{ color: 'var(--admin-accent)' }}>{lieu.porteur}</p>
            )}
            {lieu.note && <p className="mt-1 font-sans text-xs" style={{ color: 'var(--admin-text-soft)' }}>{lieu.note}</p>}
            {lieu.precedent && (
              <p className="mt-1 font-sans text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                {lieu.precedent.annee} : {lieu.precedent.statut.toLowerCase()}{lieu.precedent.porteur ? `, par ${lieu.precedent.porteur}` : ''}
              </p>
            )}
          </div>
        </div>
      </button>
    );
  };

// ── Les étapes de la visite ──────────────────────────────────────────
const ETAPES: Etape[] = [
  { cible: 'avancement', titre: 'La tournée en un coup d’œil',
    texte: `Combien d’affiches sont posées pour l’édition ${ANNEE_AFFICHAGE}, combien de commerces attendent encore quelqu’un, et combien ont refusé.` },
  { cible: 'matournee', titre: 'Votre tournée à vous',
    texte: 'Tous les commerces qui vous sont confiés se rassemblent ici, peu importe la route. Un bouton pose l’affiche sans rien ouvrir d’autre.' },
  { cible: 'filtres', titre: 'Ne voir que ce qui compte',
    texte: 'Cherchez un village ou un commerce, gardez seulement ce qui reste à faire, ou montez la barre des étoiles pour ne garder que les meilleurs endroits.' },
  { cible: 'route', titre: 'Une carte par route',
    texte: 'Les commerces sont déjà groupés par secteur, dans l’ordre du tour. La barre verte montre où en est la route, et le bouton confie tout le secteur à une seule personne.' },
  { cible: 'commerce', titre: 'Un commerce, une tuile',
    texte: 'Les étoiles disent ce que le commerce vaut pour nous, la pastille dit où ça en est, et la ligne du bas rappelle ce qui s’est passé l’an dernier. Cliquez la tuile pour agir.' },
];

const CLE_VISITE = 'fmm.affichage.visite';

type Filtre = 'tous' | 'a-faire' | 'pose' | 'moi';

const AffichageSection: React.FC = () => {
  const { user } = useAuth();
  const qui = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Quelqu’un';
  const [lieux, setLieux] = useState<Lieu[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [minEtoiles, setMinEtoiles] = useState(1);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [replie, setReplie] = useState<Record<string, boolean>>({});
  const [ajout, setAjout] = useState(false);
  const [semis, setSemis] = useState(false);
  const [visite, setVisite] = useState(false);
  const [confieRoute, setConfieRoute] = useState<string | null>(null);

  useEffect(() => watchAffichage(setLieux, () => setErreur('Impossible de lire la tournée. Votre compte a-t-il un rôle admin ?')), []);

  useEffect(() => {
    if (!lieux || lieux.length === 0) return;
    let vue = false;
    try { vue = localStorage.getItem(CLE_VISITE) === '1'; } catch { /* stockage refusé */ }
    if (vue) return;
    const t = window.setTimeout(() => setVisite(true), 700);
    return () => window.clearTimeout(t);
  }, [lieux === null || lieux.length === 0]);
  const finVisite = () => { setVisite(false); try { localStorage.setItem(CLE_VISITE, '1'); } catch { /* stockage refusé */ } };

  const tous = lieux ?? [];
  const posees = tous.filter((l) => l.statut === 'pose').length;
  const refus = tous.filter((l) => l.statut === 'refus').length;
  const enChemin = tous.filter((l) => l.statut === 'en-cours' || l.statut === 'assigne').length;
  const aFaire = tous.filter((l) => l.statut === 'a-faire').length;
  const miens = tous.filter((l) => l.porteur === qui && l.statut !== 'pose' && l.statut !== 'refus');

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return tous.filter((l) => {
      if (l.pertinence < minEtoiles) return false;
      if (filtre === 'a-faire' && (l.statut === 'pose' || l.statut === 'refus')) return false;
      if (filtre === 'pose' && l.statut !== 'pose') return false;
      if (filtre === 'moi' && l.porteur !== qui) return false;
      if (q && !`${l.nom} ${l.route} ${l.porteur} ${l.note} ${LIBELLE_TYPE[l.type]}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tous, recherche, filtre, minEtoiles, qui]);

  const routes = useMemo(() => {
    const m = new Map<string, Lieu[]>();
    for (const l of visibles) { const k = l.route || 'Sans route'; (m.get(k) ?? m.set(k, []).get(k)!).push(l); }
    const rang = (r: string) => { const i = ORDRE_ROUTES.indexOf(r); return i === -1 ? 999 : i; };
    return Array.from(m.entries())
      .sort(([a], [b]) => rang(a) - rang(b) || a.localeCompare(b))
      .map(([nom, liste]) => [nom, liste.sort((x, y) => y.pertinence - x.pertinence || x.nom.localeCompare(y.nom))] as const);
  }, [visibles]);

  const toutesRoutes = useMemo(() => Array.from(new Set([...ORDRE_ROUTES, ...tous.map((l) => l.route)])).filter(Boolean), [tous]);

  const semer = async () => {
    setSemis(true);
    try { await semerAffichage(qui); }
    catch (e) { console.warn('[affichage] semis', e); setErreur('Le chargement de la route de départ a échoué.'); }
    finally { setSemis(false); }
  };

  const exporter = () => downloadCsv(`affichage-${ANNEE_AFFICHAGE}.csv`, tous.map((l) => ({
    route: l.route, commerce: l.nom, genre: LIBELLE_TYPE[l.type], pertinence: l.pertinence,
    etat: LIBELLE_STATUT[l.statut], qui: l.porteur, note: l.note,
    an_dernier: l.precedent ? `${l.precedent.statut}${l.precedent.porteur ? ` (${l.precedent.porteur})` : ''}` : '',
  })));

  const chip = (actif: boolean) => ({
    border: `1px solid ${actif ? 'var(--admin-accent)' : 'var(--admin-line)'}`,
    background: actif ? 'rgba(176,141,58,0.18)' : 'transparent',
    color: actif ? 'var(--admin-accent)' : 'var(--admin-text-soft)',
  });

  return (
    <div className="space-y-6">
      {visite && lieux && lieux.length > 0 && <VisiteGuidee etapes={ETAPES} onFin={finVisite} />}

      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold" style={{ color: 'var(--admin-accent)' }}>Comment ça marche</p>
          <GhostButton type="button" onClick={() => setVisite(true)}><Compass size={14} /> Visite guidée</GhostButton>
        </div>
        <p className="font-sans text-sm leading-relaxed" style={{ color: 'var(--admin-text)' }}>
          La tournée des affiches de l’édition {ANNEE_AFFICHAGE} suit la route déjà tracée l’an dernier, secteur par secteur, en partant de Chénéville.
          Chaque commerce porte une note de pertinence sur cinq, parce qu’un babillard de village au dépanneur ne vaut pas la même chose qu’une porte de grande surface à Gatineau.
          Vous confiez une route entière à quelqu’un d’un seul geste, ou vous prenez un commerce à la fois, et chaque tuile rappelle qui a posé l’affiche l’an dernier.
        </p>
      </Card>

      {erreur && <p className="flex items-center gap-2 font-sans text-xs" style={{ color: 'var(--color-blush)' }}><ShieldAlert size={13} className="shrink-0" /> {erreur}</p>}

      {/* L'avancement */}
      <div data-visite="avancement"><Card className="p-5 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
          <div>
            <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold mb-2" style={{ color: 'var(--admin-accent)' }}>Affiches posées pour {ANNEE_AFFICHAGE}</p>
            <p className="font-display text-5xl md:text-6xl leading-none tabular-nums" style={{ color: 'var(--admin-text)' }}>
              {lieux ? posees : '…'}
              <span className="text-3xl md:text-4xl" style={{ color: 'var(--admin-text-mute)' }}> / {tous.length}</span>
            </p>
            <div className="mt-4"><Barre posees={posees} total={tous.length} /></div>
          </div>
          <div className="grid grid-cols-3 gap-6 min-w-[260px]">
            {[['En chemin', enChemin], ['À faire', aFaire], ['Refus', refus]].map(([l, v]) => (
              <div key={l as string}>
                <p className="font-sans uppercase tracking-[0.2em] text-[10px] font-semibold mb-1" style={{ color: 'var(--admin-text-mute)' }}>{l}</p>
                <p className="font-display text-3xl leading-none tabular-nums" style={{ color: 'var(--admin-text)' }}>{lieux ? v : '…'}</p>
              </div>
            ))}
          </div>
        </div>
      </Card></div>

      {/* Ma tournée */}
      {miens.length > 0 && (
        <div data-visite="matournee"><Card className="p-4 md:p-5">
          <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold mb-3 inline-flex items-center gap-2" style={{ color: 'var(--admin-accent)' }}>
            <Footprints size={13} /> Votre tournée · {miens.length} commerce{miens.length > 1 ? 's' : ''}
          </p>
          <ul className="space-y-1.5">
            {miens.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2">
                <span className="font-sans text-sm" style={{ color: 'var(--admin-text)' }}>{l.nom}</span>
                <span className="font-sans text-xs" style={{ color: 'var(--admin-text-mute)' }}>{l.route}</span>
                <Etoiles n={l.pertinence} />
                <button
                  type="button"
                  className="ml-auto admin-ghost"
                  onClick={() => poserStatut(l, 'pose', qui).catch(() => setErreur('Firestore n’a pas pris le geste.'))}
                >
                  <Check size={13} /> Affiche posée
                </button>
              </li>
            ))}
          </ul>
        </Card></div>
      )}

      {/* Les filtres */}
      <Card className="p-4 md:p-5" data-visite="filtres">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-mute)' }} />
              <input className={`${champ} pl-9`} value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher un commerce, un village, une personne…" />
            </div>
            <GhostButton type="button" onClick={exporter} title="Exporter en CSV"><Download size={14} /> CSV</GhostButton>
            <PrimaryButton type="button" onClick={() => setAjout((v) => !v)}><Plus size={14} /> Nouveau commerce</PrimaryButton>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([['tous', 'Tous'], ['a-faire', `Reste à faire${aFaire + enChemin ? ` (${aFaire + enChemin})` : ''}`], ['pose', 'Posées'], ['moi', 'À moi']] as [Filtre, string][]).map(([f, l]) => (
              <button key={f} type="button" onClick={() => setFiltre(f)} className="rounded-full px-3 py-1 font-sans text-xs transition-colors" style={chip(filtre === f)}>{l}</button>
            ))}
            <span className="mx-1 h-4 w-px" style={{ background: 'var(--admin-line)' }} />
            <span className="font-sans text-xs" style={{ color: 'var(--admin-text-mute)' }}>Au moins</span>
            {[1, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setMinEtoiles(n)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-sans text-xs transition-colors" style={chip(minEtoiles === n)}>
                {n === 1 ? 'toutes' : <><Star size={11} style={{ fill: 'currentColor' }} /> {n}</>}
              </button>
            ))}
          </div>
        </div>

        {ajout && (
          <FormNouveau
            routes={toutesRoutes}
            onAnnuler={() => setAjout(false)}
            onEnvoyer={async (l) => { await ajouterLieu(l, qui); setAjout(false); }}
          />
        )}
      </Card>

      {/* Les routes */}
      {lieux === null ? (
        <Card className="p-4"><EmptyState icon={MapPinned}>Lecture de la tournée…</EmptyState></Card>
      ) : lieux.length === 0 ? (
        <Card className="p-4">
          <div className="py-10 text-center space-y-4">
            <EmptyState icon={MapPinned}>
              La tournée n’est pas encore en base. La route de l’an dernier compte {GRAINES_AFFICHAGE.length} commerces, groupés en {ORDRE_ROUTES.length} secteurs.
            </EmptyState>
            <PrimaryButton type="button" onClick={semer} disabled={semis}><MapPinned size={14} /> {semis ? 'Chargement…' : 'Charger la route de l’an dernier'}</PrimaryButton>
          </div>
        </Card>
      ) : routes.length === 0 ? (
        <Card className="p-4"><EmptyState icon={Search}>Aucun commerce ne répond à ce filtre.</EmptyState></Card>
      ) : (
        <div className="space-y-4">
          {routes.map(([nom, liste], ri) => {
            const posee = liste.filter((l) => l.statut === 'pose').length;
            const porteurs = Array.from(new Set(liste.map((l) => l.porteur).filter(Boolean)));
            const ferme = replie[nom];
            return (
              <Card key={nom} className="p-4 md:p-5">
                <div data-visite={ri === 0 ? 'route' : undefined}>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setReplie((r) => ({ ...r, [nom]: !r[nom] }))}
                      className="flex items-center gap-2 font-display text-xl"
                      style={{ color: 'var(--admin-text)' }}
                    >
                      <ChevronDown size={16} className="transition-transform" style={{ color: 'var(--admin-accent)', transform: ferme ? 'rotate(-90deg)' : 'none' }} />
                      {nom}
                    </button>
                    <span className="font-sans text-xs tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>{posee} / {liste.length}</span>
                    {porteurs.length > 0 && (
                      <span className="font-sans text-xs" style={{ color: 'var(--admin-accent)' }}>{porteurs.join(', ')}</span>
                    )}
                    <button
                      type="button"
                      className="ml-auto admin-ghost"
                      onClick={() => setConfieRoute(confieRoute === nom ? null : nom)}
                    >
                      <UserPlus size={13} /> Confier la route
                    </button>
                  </div>
                  <div className="mt-3"><Barre posees={posee} total={liste.length} /></div>

                  {confieRoute === nom && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {PORTEURS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className="rounded-full px-3 py-1 font-sans text-xs"
                          style={chip(false)}
                          onClick={() => confierRoute(liste, p, qui).then(() => setConfieRoute(null)).catch(() => setErreur('Firestore n’a pas pris le geste.'))}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!ferme && (
                  <>
                    <div className="mt-4 grid gap-2 items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                      {liste.map((l, i) => (
                        <Tuile key={l.id} lieu={l} ouvert={ouvert === l.id} onOuvrir={() => setOuvert(ouvert === l.id ? null : l.id)} premiere={ri === 0 && i === 0} />
                      ))}
                    </div>
                    {/* Le panneau se déplie sous la route, sur toute la largeur :
                        dans une colonne de la grille il serait à l'étroit. */}
                    {liste.some((l) => l.id === ouvert) && (
                      <Panneau
                        lieu={liste.find((l) => l.id === ouvert)!}
                        qui={qui}
                        routes={toutesRoutes}
                        onFermer={() => setOuvert(null)}
                        onErreur={setErreur}
                      />
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Ajouter un commerce ──────────────────────────────────────────────
const FormNouveau: React.FC<{
  routes: string[];
  onAnnuler: () => void;
  onEnvoyer: (l: { nom: string; route: string; type: TypeLieu; pertinence: number; note: string }) => Promise<void>;
}> = ({ routes, onAnnuler, onEnvoyer }) => {
  const [nom, setNom] = useState('');
  const [route, setRoute] = useState(routes[0] ?? '');
  const [type, setType] = useState<TypeLieu>('epicerie');
  const [pertinence, setPertinence] = useState(3);
  const [note, setNote] = useState('');
  const [occupe, setOccupe] = useState(false);
  return (
    <form
      className="admin-card-strong mt-4 p-4 space-y-3"
      onSubmit={async (e) => { e.preventDefault(); if (!nom.trim()) return; setOccupe(true); try { await onEnvoyer({ nom: nom.trim(), route, type, pertinence, note: note.trim() }); } finally { setOccupe(false); } }}
    >
      <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold" style={{ color: 'var(--admin-accent)' }}>Nouveau commerce</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><Label>Nom</Label><input className={champ} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. : Boulangerie de Ripon" autoFocus /></div>
        <div>
          <Label>Route</Label>
          <input className={champ} list="affichage-routes" value={route} onChange={(e) => setRoute(e.target.value)} placeholder="Un secteur" />
          <datalist id="affichage-routes">{routes.map((r) => <option key={r} value={r} />)}</datalist>
        </div>
        <div>
          <Label>Genre</Label>
          <select className={champ} value={type} onChange={(e) => setType(e.target.value as TypeLieu)}>
            {TYPES.map((t) => <option key={t} value={t}>{LIBELLE_TYPE[t]}</option>)}
          </select>
        </div>
      </div>
      <div><Label>Pertinence</Label><Etoiles n={pertinence} onChange={setPertinence} /></div>
      <div><Label>Note</Label><input className={champ} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qui voir, où est le babillard…" /></div>
      <div className="flex justify-end gap-2">
        <GhostButton type="button" onClick={onAnnuler}><X size={13} /> Annuler</GhostButton>
        <PrimaryButton type="submit" disabled={occupe || !nom.trim()}><Check size={13} /> Ajouter</PrimaryButton>
      </div>
    </form>
  );
};

export default AffichageSection;
