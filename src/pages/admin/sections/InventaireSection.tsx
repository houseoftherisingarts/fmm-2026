import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  Boxes, Search, Plus, X, Check, Undo2, MoveRight, Pencil, Trash2, History,
  ShieldAlert, AlertTriangle, Box, LayoutGrid, Download,
} from 'lucide-react';
import { Card, EmptyState, GhostButton, PrimaryButton, DangerButton, Label, downloadCsv } from '../primitives';
import { useAuth } from '../../../contexts/AuthContext';
import {
  watchInventaire, sortirObjet, retournerObjet, deplacerObjet, creerObjet, modifierObjet, supprimerObjet,
  semerInventaire, codeDe, lireCode, libelleEmplacement,
  SECTIONS, NIVEAUX, PROFONDEURS, LIBELLE_SECTION, LIBELLE_NIVEAU, LIBELLE_PROFONDEUR, DESTINATIONS, GRAINES,
  type Objet, type Emplacement, type Section, type Niveau, type Profondeur, type Mouvement,
} from '../../../firebase/inventaire';

const Container3D = lazy(() => import('./inventaire/Container3D'));

// ─── Inventaire du container ─────────────────────────────────────────
// Alex, 2026-09-08 : « comme une bibliothèque où on emprunte des
// choses ». À gauche, le container (plan ou 3D) : chaque case dit
// combien d'objets y dorment, on clique pour filtrer. À droite, la
// liste par emplacement : une case à cocher quand quelqu'un prend
// l'objet (qui, vers où, une note), un bouton pour le déplacer d'une
// tablette à l'autre, et le journal de chaque objet.

const champ = 'admin-input';
const dateCourte = (ts: { toDate?: () => Date } | undefined) => {
  const d = ts?.toDate?.();
  return d ? d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
};

const ordreCode = (a: string, b: string) => {
  const rang = (c: string) => `${{ CG: 0, CF: 1, CD: 2 }[c.slice(0, 2)] ?? 9}${c.slice(2).padEnd(2, '0')}`;
  return rang(a).localeCompare(rang(b));
};

// ── Le plan en U, à plat ─────────────────────────────────────────────
const PlanContainer: React.FC<{ comptes: Record<string, { total: number; sortis: number }>; selection: string | null; onSelect: (c: string | null) => void }> =
  ({ comptes, selection, onSelect }) => {
    const Grille: React.FC<{ section: Section }> = ({ section }) => {
      const libre = comptes[section];
      return (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onSelect(selection === section ? null : section)}
            className="w-full text-left mb-2 font-sans uppercase tracking-[0.25em] text-[10px] font-semibold"
            style={{ color: selection === section ? 'var(--admin-accent)' : 'var(--admin-text-soft)' }}
          >
            {section} · {LIBELLE_SECTION[section].replace('Container ', '')}
            {libre?.total ? <span className="ml-2 normal-case tracking-normal" style={{ color: 'var(--admin-text-mute)' }}>({libre.total} sans tablette)</span> : null}
          </button>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(4, minmax(0, 1fr))' }}>
            <span />
            {PROFONDEURS.map((p) => <span key={p} className="text-center font-sans text-[10px]" style={{ color: 'var(--admin-text-mute)' }}>{p}</span>)}
            {NIVEAUX.map((n) => (
              <React.Fragment key={n}>
                <span className="self-center pr-1 font-sans text-[10px] tabular-nums" style={{ color: 'var(--admin-text-mute)' }} title={LIBELLE_NIVEAU[n]}>{n}</span>
                {PROFONDEURS.map((p) => {
                  const code = `${section}${n}${p}`;
                  const c = comptes[code];
                  const active = selection === code;
                  const dansSection = selection === section || selection === `${section}${n}`;
                  return (
                    <button
                      key={code}
                      type="button"
                      title={`${code} · ${LIBELLE_NIVEAU[n]}, ${LIBELLE_PROFONDEUR[p].toLowerCase()}`}
                      onClick={() => onSelect(active ? null : code)}
                      className="relative aspect-[5/4] rounded-md font-sans text-xs tabular-nums transition-all"
                      style={{
                        background: active
                          ? 'linear-gradient(180deg, var(--admin-brass-hi), var(--admin-accent))'
                          : c?.total ? 'rgba(176, 141, 58, 0.16)' : 'rgba(4, 8, 12, 0.5)',
                        border: `1px solid ${active ? 'var(--admin-accent)' : dansSection ? 'color-mix(in oklab, var(--admin-accent), transparent 45%)' : 'var(--admin-line)'}`,
                        color: active ? '#080D11' : c?.total ? 'var(--admin-text)' : 'var(--admin-text-mute)',
                        opacity: selection && !active && !dansSection ? 0.55 : 1,
                      }}
                    >
                      {c?.total ?? ''}
                      {c?.sortis ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-blush)' }} /> : null}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      );
    };
    return (
      <div className="rounded-card p-4" style={{ background: 'rgba(4, 8, 12, 0.35)', border: '1px solid var(--admin-line)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3">
          <Grille section="CG" />
          <Grille section="CF" />
          <Grille section="CD" />
        </div>
        <p className="mt-3 font-sans text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
          Colonnes A à D : de l’avant vers le fond. Lignes 1 à 3 : les tablettes du haut vers le bas; 4 : le sol. Le point rose signale un objet sorti.
        </p>
      </div>
    );
  };

// ── Choisir un emplacement ───────────────────────────────────────────
const ChoixEmplacement: React.FC<{ valeur: Emplacement; onChange: (e: Emplacement) => void }> = ({ valeur, onChange }) => (
  <div className="grid grid-cols-3 gap-2">
    <select className={champ} value={valeur.section} onChange={(e) => onChange({ ...valeur, section: e.target.value as Section })}>
      {SECTIONS.map((s) => <option key={s} value={s}>{s} · {LIBELLE_SECTION[s]}</option>)}
    </select>
    <select className={champ} value={valeur.niveau ?? ''} onChange={(e) => onChange({ ...valeur, niveau: e.target.value ? (Number(e.target.value) as Niveau) : null, profondeur: e.target.value ? valeur.profondeur : null })}>
      <option value="">Tablette ?</option>
      {NIVEAUX.map((n) => <option key={n} value={n}>{n} · {LIBELLE_NIVEAU[n]}</option>)}
    </select>
    <select className={champ} value={valeur.profondeur ?? ''} disabled={!valeur.niveau} onChange={(e) => onChange({ ...valeur, profondeur: (e.target.value || null) as Profondeur | null })}>
      <option value="">Profondeur ?</option>
      {PROFONDEURS.map((p) => <option key={p} value={p}>{p} · {LIBELLE_PROFONDEUR[p]}</option>)}
    </select>
  </div>
);

// ── Fiche d'un objet (création ou modification) ──────────────────────
type Champs = Pick<Objet, 'nom' | 'categorie' | 'quantite' | 'detail' | 'aVerifier'> & Emplacement;
const FicheObjet: React.FC<{ initial: Champs; categories: string[]; onSave: (c: Champs) => Promise<void>; onCancel: () => void; titre: string }> =
  ({ initial, categories, onSave, onCancel, titre }) => {
    const [c, setC] = useState<Champs>(initial);
    const [occupe, setOccupe] = useState(false);
    return (
      <form
        className="admin-card-strong p-5 space-y-4"
        onSubmit={async (e) => { e.preventDefault(); if (!c.nom.trim()) return; setOccupe(true); try { await onSave({ ...c, nom: c.nom.trim(), categorie: c.categorie.trim() }); } finally { setOccupe(false); } }}
      >
        <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold" style={{ color: 'var(--admin-accent)' }}>{titre}</p>
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3">
          <div><Label>Objet</Label><input className={champ} value={c.nom} onChange={(e) => setC({ ...c, nom: e.target.value })} placeholder="Ex. : Bacs Gastro 1/2" autoFocus /></div>
          <div><Label>Catégorie</Label><input className={champ} list="inv-categories" value={c.categorie} onChange={(e) => setC({ ...c, categorie: e.target.value })} placeholder="Ex. : Conserves" /></div>
          <div><Label>Quantité</Label><input className={champ} type="number" min={0} inputMode="numeric" value={c.quantite ?? ''} onChange={(e) => setC({ ...c, quantite: e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value))) })} placeholder="—" /></div>
        </div>
        <datalist id="inv-categories">{categories.map((x) => <option key={x} value={x} />)}</datalist>
        <div><Label>Détail</Label><input className={champ} value={c.detail} onChange={(e) => setC({ ...c, detail: e.target.value })} placeholder="Format, contenu, état…" /></div>
        <div><Label>Emplacement</Label><ChoixEmplacement valeur={c} onChange={(e) => setC({ ...c, ...e })} /></div>
        <label className="inline-flex items-center gap-2 font-sans text-sm" style={{ color: 'var(--admin-text)' }}>
          <input type="checkbox" checked={c.aVerifier} onChange={(e) => setC({ ...c, aVerifier: e.target.checked })} style={{ accentColor: 'var(--admin-accent)' }} />
          À inventorier en détail plus tard
        </label>
        <div className="flex gap-2 justify-end">
          <GhostButton type="button" onClick={onCancel}><X size={14} /> Annuler</GhostButton>
          <PrimaryButton type="submit" disabled={occupe || !c.nom.trim()}><Check size={14} /> Enregistrer</PrimaryButton>
        </div>
      </form>
    );
  };

// ── Une ligne de la liste ────────────────────────────────────────────
type Mode = null | 'sortie' | 'retour' | 'deplacer' | 'modifier' | 'journal';

const Ligne: React.FC<{ o: Objet; qui: string; categories: string[]; onError: (m: string) => void }> = ({ o, qui, categories, onError }) => {
  const [mode, setMode] = useState<Mode>(null);
  const [par, setPar] = useState(qui);
  const [vers, setVers] = useState<string>(DESTINATIONS[0]);
  const [autre, setAutre] = useState('');
  const [note, setNote] = useState('');
  const [cible, setCible] = useState<Emplacement>({ section: o.section, niveau: o.niveau, profondeur: o.profondeur });
  const [occupe, setOccupe] = useState(false);
  useEffect(() => { setPar(qui); }, [qui]);

  const sorti = o.statut === 'sorti';
  const faire = async (fn: () => Promise<void>) => {
    setOccupe(true);
    try { await fn(); setMode(null); setNote(''); setAutre(''); }
    catch (e) { console.warn('[inventaire]', e); onError('Firestore n’a pas pris le geste. Réessayez dans un instant.'); }
    finally { setOccupe(false); }
  };
  const destination = vers === 'Autre' ? autre.trim() : vers;
  const bouton = 'inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-sans text-[11px] transition-colors hover:bg-white/5';

  return (
    <li className="py-3 border-b last:border-b-0" style={{ borderColor: 'var(--admin-line-soft)' }}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          aria-label={sorti ? `Marquer « ${o.nom} » comme retourné` : `Sortir « ${o.nom} »`}
          checked={sorti}
          onChange={() => setMode(sorti ? 'retour' : 'sortie')}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer"
          style={{ accentColor: 'var(--color-blush)' }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-sans text-sm" style={{ color: sorti ? 'var(--admin-text-soft)' : 'var(--admin-text)', textDecoration: sorti ? 'line-through' : 'none', textDecorationColor: 'rgba(216,123,142,0.6)' }}>
              {o.nom}
            </span>
            {o.quantite !== null && <span className="font-sans text-xs tabular-nums" style={{ color: 'var(--admin-accent)' }}>× {o.quantite}</span>}
            {o.categorie && <span className="font-sans text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--admin-text-mute)' }}>{o.categorie}</span>}
            {o.aVerifier && <span className="inline-flex items-center gap-1 font-sans text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-blush)' }}><AlertTriangle size={10} /> à inventorier</span>}
          </div>
          {o.detail && <p className="font-sans text-xs mt-0.5" style={{ color: 'var(--admin-text-soft)' }}>{o.detail}</p>}
          {sorti && o.sorti && (
            <p className="font-sans text-xs mt-1" style={{ color: 'var(--color-blush)' }}>
              Sorti · {o.sorti.vers} · par {o.sorti.par}{o.sorti.quand ? ` · ${dateCourte(o.sorti.quand)}` : ''}{o.sorti.note ? ` · ${o.sorti.note}` : ''}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1 -ml-2" style={{ color: 'var(--admin-text-soft)' }}>
            <button type="button" className={bouton} onClick={() => setMode(mode === 'deplacer' ? null : 'deplacer')}><MoveRight size={12} /> Déplacer</button>
            <button type="button" className={bouton} onClick={() => setMode(mode === 'modifier' ? null : 'modifier')}><Pencil size={12} /> Modifier</button>
            <button type="button" className={bouton} onClick={() => setMode(mode === 'journal' ? null : 'journal')}><History size={12} /> Journal{o.historique.length > 1 ? ` (${o.historique.length})` : ''}</button>
          </div>
        </div>
      </div>

      {mode === 'sortie' && (
        <form className="mt-3 ml-7 admin-card-strong p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); if (!par.trim() || !destination) return; void faire(() => sortirObjet(o.id, par.trim(), destination, note.trim())); }}>
          <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold" style={{ color: 'var(--color-blush)' }}>Quelqu’un prend cet objet</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Qui</Label><input className={champ} value={par} onChange={(e) => setPar(e.target.value)} placeholder="Prénom" /></div>
            <div>
              <Label>Vers où</Label>
              <div className="flex flex-wrap gap-1.5">
                {DESTINATIONS.map((d) => (
                  <button key={d} type="button" onClick={() => setVers(d)} className="rounded-full px-3 py-1 font-sans text-xs transition-colors"
                    style={{ border: `1px solid ${vers === d ? 'var(--admin-accent)' : 'var(--admin-line)'}`, background: vers === d ? 'rgba(176,141,58,0.18)' : 'transparent', color: vers === d ? 'var(--admin-accent)' : 'var(--admin-text-soft)' }}>
                    {d}
                  </button>
                ))}
              </div>
              {vers === 'Autre' && <input className={`${champ} mt-2`} value={autre} onChange={(e) => setAutre(e.target.value)} placeholder="Où exactement ?" autoFocus />}
            </div>
          </div>
          <div><Label>Note</Label><input className={champ} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facultatif : pourquoi, jusqu’à quand…" /></div>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setMode(null)}>Annuler</GhostButton>
            <PrimaryButton type="submit" disabled={occupe || !par.trim() || !destination}><Check size={14} /> Sorti vers {destination || '…'}</PrimaryButton>
          </div>
        </form>
      )}

      {mode === 'retour' && (
        <form className="mt-3 ml-7 admin-card-strong p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); void faire(() => retournerObjet(o.id, par.trim() || qui, note.trim())); }}>
          <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold" style={{ color: 'var(--admin-accent)' }}>De retour dans le container</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Qui le rapporte</Label><input className={champ} value={par} onChange={(e) => setPar(e.target.value)} /></div>
            <div><Label>Note</Label><input className={champ} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facultatif" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setMode(null)}>Annuler</GhostButton>
            <PrimaryButton type="submit" disabled={occupe}><Undo2 size={14} /> Retourné à {codeDe(o)}</PrimaryButton>
          </div>
        </form>
      )}

      {mode === 'deplacer' && (
        <form className="mt-3 ml-7 admin-card-strong p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); void faire(() => deplacerObjet(o, cible, qui)); }}>
          <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold" style={{ color: 'var(--admin-accent)' }}>Déplacer de {codeDe(o)} vers…</p>
          <ChoixEmplacement valeur={cible} onChange={setCible} />
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setMode(null)}>Annuler</GhostButton>
            <PrimaryButton type="submit" disabled={occupe || codeDe(cible) === codeDe(o)}><MoveRight size={14} /> Déplacer vers {codeDe(cible)}</PrimaryButton>
          </div>
        </form>
      )}

      {mode === 'modifier' && (
        <div className="mt-3 ml-7 space-y-2">
          <FicheObjet
            titre="Modifier l’objet"
            initial={{ nom: o.nom, categorie: o.categorie, quantite: o.quantite, detail: o.detail, aVerifier: o.aVerifier, section: o.section, niveau: o.niveau, profondeur: o.profondeur }}
            categories={categories}
            onCancel={() => setMode(null)}
            onSave={(c) => faire(async () => {
              await modifierObjet(o.id, { nom: c.nom, categorie: c.categorie, quantite: c.quantite, detail: c.detail, aVerifier: c.aVerifier });
              await deplacerObjet(o, c, qui);
            })}
          />
          <div className="flex justify-end">
            <DangerButton type="button" disabled={occupe} onClick={() => { if (window.confirm(`Retirer « ${o.nom} » de l’inventaire ?`)) void faire(() => supprimerObjet(o.id)); }}><Trash2 size={14} /> Retirer de l’inventaire</DangerButton>
          </div>
        </div>
      )}

      {mode === 'journal' && (
        <ol className="mt-3 ml-7 space-y-1 font-sans text-xs" style={{ color: 'var(--admin-text-soft)' }}>
          {[...o.historique].reverse().map((m, i) => <li key={i}>{texteMouvement(m)}</li>)}
        </ol>
      )}
    </li>
  );
};

function texteMouvement(m: Mouvement): string {
  const q = dateCourte(m.quand);
  switch (m.type) {
    case 'sortie':      return `${q} · sorti vers ${m.vers} par ${m.par}${m.note ? ` (${m.note})` : ''}`;
    case 'retour':      return `${q} · retourné par ${m.par}${m.note ? ` (${m.note})` : ''}`;
    case 'deplacement': return `${q} · déplacé de ${m.de} à ${m.vers} par ${m.par}`;
    default:            return `${q} · ajouté par ${m.par}`;
  }
}

// ── La section ───────────────────────────────────────────────────────
type Filtre = 'tous' | 'ranges' | 'sortis' | 'aVerifier';

const InventaireSection: React.FC = () => {
  const { user } = useAuth();
  const qui = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Quelqu’un';
  const [objets, setObjets] = useState<Objet[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [selection, setSelection] = useState<string | null>(null);
  const [vue, setVue] = useState<'plan' | '3d'>('plan');
  const [ajout, setAjout] = useState(false);
  const [semis, setSemis] = useState(false);

  useEffect(() => watchInventaire(setObjets, () => setErreur('Impossible de lire l’inventaire. Votre compte a-t-il un rôle admin ?')), []);

  const comptes = useMemo(() => {
    const out: Record<string, { total: number; sortis: number }> = {};
    for (const o of objets ?? []) {
      const codes = [o.section, o.niveau ? `${o.section}${o.niveau}` : null, o.niveau && o.profondeur ? codeDe(o) : null];
      // Un objet sans tablette compte sur la section seule; un objet sans
      // profondeur compte sur la tablette seule; sinon sur la case.
      const cle = codes.filter(Boolean).pop() as string;
      const c = (out[cle] ??= { total: 0, sortis: 0 });
      c.total += 1;
      if (o.statut === 'sorti') c.sortis += 1;
    }
    return out;
  }, [objets]);

  const categories = useMemo(() => Array.from(new Set((objets ?? []).map((o) => o.categorie).filter(Boolean))).sort(), [objets]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return (objets ?? []).filter((o) => {
      if (selection && !codeDe(o).startsWith(selection)) return false;
      if (filtre === 'ranges' && o.statut !== 'range') return false;
      if (filtre === 'sortis' && o.statut !== 'sorti') return false;
      if (filtre === 'aVerifier' && !o.aVerifier) return false;
      if (q && !`${o.nom} ${o.categorie} ${o.detail} ${codeDe(o)} ${o.sorti?.vers ?? ''} ${o.sorti?.par ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [objets, selection, filtre, recherche]);

  const groupes = useMemo(() => {
    const m = new Map<string, Objet[]>();
    for (const o of visibles) { const k = codeDe(o); (m.get(k) ?? m.set(k, []).get(k)!).push(o); }
    return Array.from(m.entries()).sort(([a], [b]) => ordreCode(a, b)).map(([code, liste]) => [code, liste.sort((x, y) => x.categorie.localeCompare(y.categorie) || x.nom.localeCompare(y.nom))] as const);
  }, [visibles]);

  const derniers = useMemo(() => {
    const tout: { o: Objet; m: Mouvement }[] = [];
    for (const o of objets ?? []) for (const m of o.historique) if (m.type !== 'creation') tout.push({ o, m });
    return tout.sort((a, b) => (b.m.quand?.toMillis?.() ?? 0) - (a.m.quand?.toMillis?.() ?? 0)).slice(0, 8);
  }, [objets]);

  const total = objets?.length ?? 0;
  const sortis = (objets ?? []).filter((o) => o.statut === 'sorti').length;
  const aVerifier = (objets ?? []).filter((o) => o.aVerifier).length;

  const semer = async () => {
    setSemis(true);
    try { await semerInventaire(qui); }
    catch (e) { console.warn('[inventaire] semis', e); setErreur('Le chargement de l’inventaire de départ a échoué.'); }
    finally { setSemis(false); }
  };

  const exporter = () => downloadCsv('inventaire-container.csv', (objets ?? []).map((o) => ({
    emplacement: codeDe(o), objet: o.nom, categorie: o.categorie, quantite: o.quantite ?? '', detail: o.detail,
    statut: o.statut === 'sorti' ? 'sorti' : 'rangé', sorti_par: o.sorti?.par ?? '', sorti_vers: o.sorti?.vers ?? '', a_inventorier: o.aVerifier ? 'oui' : '',
  })));

  const chip = (actif: boolean) => ({
    border: `1px solid ${actif ? 'var(--admin-accent)' : 'var(--admin-line)'}`,
    background: actif ? 'rgba(176,141,58,0.18)' : 'transparent',
    color: actif ? 'var(--admin-accent)' : 'var(--admin-text-soft)',
  });

  return (
    <div className="space-y-6">
      <p className="font-editorial italic text-sm text-ivory-soft">
        Le container en U, tablette par tablette. Cochez un objet quand quelqu’un le prend, dites où il s’en va, et décochez-le quand il revient. Tout le monde voit la même chose, en direct.
      </p>

      {erreur && <p className="flex items-center gap-2 font-sans text-xs text-blush"><ShieldAlert size={13} className="shrink-0" /> {erreur}</p>}

      {/* En tête : les chiffres */}
      <Card className="p-5 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: 'Objets', v: total, c: 'var(--admin-text)' },
            { l: 'Sortis en ce moment', v: sortis, c: sortis ? 'var(--color-blush)' : 'var(--admin-text)' },
            { l: 'À inventorier', v: aVerifier, c: 'var(--admin-text)' },
            { l: 'Cases occupées', v: Object.keys(comptes).filter((k) => k.length === 4).length, c: 'var(--admin-text)' },
          ].map((s) => (
            <div key={s.l}>
              <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold mb-1" style={{ color: 'var(--admin-accent)' }}>{s.l}</p>
              <p className="font-display text-4xl leading-none tabular-nums" style={{ color: s.c }}>{objets ? s.v : '…'}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-start">
        {/* Le container */}
        <div className="space-y-4 xl:sticky xl:top-4">
          <Card className="p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold" style={{ color: 'var(--admin-accent)' }}>
                {selection ? <>Filtré sur <b>{selection}</b> · {libelleEmplacement(lireCode(selection))}</> : 'Tout le container'}
              </p>
              <div className="flex gap-1">
                <button type="button" onClick={() => setVue('plan')} className="rounded-md px-2 py-1 font-sans text-[11px] inline-flex items-center gap-1" style={chip(vue === 'plan')}><LayoutGrid size={12} /> Plan</button>
                <button type="button" onClick={() => setVue('3d')} className="rounded-md px-2 py-1 font-sans text-[11px] inline-flex items-center gap-1" style={chip(vue === '3d')}><Box size={12} /> 3D</button>
              </div>
            </div>
            {vue === 'plan'
              ? <PlanContainer comptes={comptes} selection={selection} onSelect={setSelection} />
              : (
                <Suspense fallback={<div className="rounded-card" style={{ height: 380, background: 'rgba(4,8,12,0.4)' }} />}>
                  <Container3D comptes={comptes} selection={selection} onSelect={setSelection} />
                </Suspense>
              )}
            {selection && <GhostButton type="button" onClick={() => setSelection(null)}><X size={13} /> Voir tout le container</GhostButton>}
          </Card>

          <Card className="p-4 md:p-5">
            <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold mb-3" style={{ color: 'var(--admin-accent)' }}>Derniers mouvements</p>
            {derniers.length === 0
              ? <p className="font-sans text-xs" style={{ color: 'var(--admin-text-mute)' }}>Rien n’a encore bougé.</p>
              : (
                <ol className="space-y-1.5 font-sans text-xs" style={{ color: 'var(--admin-text-soft)' }}>
                  {derniers.map(({ o, m }, i) => <li key={i}><span style={{ color: 'var(--admin-text)' }}>{o.nom}</span> · {texteMouvement(m)}</li>)}
                </ol>
              )}
          </Card>
        </div>

        {/* La liste */}
        <Card className="p-4 md:p-5">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-mute)' }} />
                <input className={`${champ} pl-9`} value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher un objet, une catégorie, un code (CG2A)…" />
              </div>
              <GhostButton type="button" onClick={exporter} title="Exporter en CSV"><Download size={14} /> CSV</GhostButton>
              <PrimaryButton type="button" onClick={() => setAjout((v) => !v)}><Plus size={14} /> Nouvel objet</PrimaryButton>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {([['tous', 'Tous'], ['ranges', 'Rangés'], ['sortis', `Sortis${sortis ? ` (${sortis})` : ''}`], ['aVerifier', 'À inventorier']] as [Filtre, string][]).map(([f, l]) => (
                <button key={f} type="button" onClick={() => setFiltre(f)} className="rounded-full px-3 py-1 font-sans text-xs transition-colors" style={chip(filtre === f)}>{l}</button>
              ))}
            </div>
          </div>

          {ajout && (
            <div className="mb-4">
              <FicheObjet
                titre="Nouvel objet"
                initial={{ nom: '', categorie: '', quantite: null, detail: '', aVerifier: false, ...lireCode(selection ?? 'CG1A') }}
                categories={categories}
                onCancel={() => setAjout(false)}
                onSave={async (c) => { await creerObjet(c, qui); setAjout(false); }}
              />
            </div>
          )}

          {objets === null ? (
            <EmptyState icon={Boxes}>Lecture du container…</EmptyState>
          ) : objets.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <EmptyState icon={Boxes}>Le container est vide dans la base. L’inventaire du 8 septembre 2026 compte {GRAINES.length} objets : chargez-le pour partir.</EmptyState>
              <PrimaryButton type="button" onClick={semer} disabled={semis}><Boxes size={14} /> {semis ? 'Chargement…' : 'Charger l’inventaire du 8 septembre'}</PrimaryButton>
            </div>
          ) : groupes.length === 0 ? (
            <EmptyState icon={Search}>Aucun objet ne répond à ce filtre.</EmptyState>
          ) : (
            <div className="space-y-5">
              {groupes.map(([code, liste]) => (
                <section key={code}>
                  <header className="sticky top-0 z-[2] flex items-baseline gap-2 py-1.5 -mx-1 px-1" style={{ background: 'rgba(11, 16, 21, 0.92)', backdropFilter: 'blur(8px)' }}>
                    <button type="button" onClick={() => setSelection(selection === code ? null : code)} className="font-display text-lg" style={{ color: 'var(--admin-accent)' }}>{code}</button>
                    <span className="font-sans text-xs" style={{ color: 'var(--admin-text-soft)' }}>{libelleEmplacement(lireCode(code))}</span>
                    <span className="ml-auto font-sans text-[10px] uppercase tracking-[0.2em] tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>{liste.length}</span>
                  </header>
                  <ul>{liste.map((o) => <Ligne key={o.id} o={o} qui={qui} categories={categories} onError={setErreur} />)}</ul>
                </section>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default InventaireSection;
