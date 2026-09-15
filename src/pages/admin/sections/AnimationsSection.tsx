import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Download, ChevronDown, ChevronRight, Sparkles, TentTree, Inbox,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  suivreAnimations, semerAnimations, nouvelIdAnimation, nouvelleFicheVide,
  creerAnimation, majAnimation, supprimerAnimation,
  publierAlHoraire, retirerDeLHoraire, compterPubliees,
  coutTransport, coutTotal, enDollars,
  STATUTS, TYPES_ANIMATION, JOURS,
  type Animation, type AnimationInput, type StatutAnimation,
} from '../../../firebase/animations';
import {
  suivreCandidatures, importerCandidature, marquerCandidature,
  type CandidatureAnimation,
} from '../../../firebase/candidaturesAnimation';
import { listUsers, type AppUser } from '../../../firebase/users';
import { ANIMATIONS_DE_BASE } from '../../../content/animationsDeBase';
import { CURRENT_YEAR } from '../../../firebase/applications';
import {
  Card, Badge, EmptyState, PrimaryButton, GhostButton, Input, downloadCsv, fmtDate,
} from '../primitives';
import AnimationFiche from './AnimationFiche';

// ─── Le dossier des animations, porté par Tristan Côté-Hotte ────────
// Tout ce qui n'est pas la musique : troupes, artistes, démonstrations,
// jouteurs. Deux onglets : les fiches en cours de montage, et les
// candidatures reçues par le formulaire public qui attendent qu'on en
// fasse une fiche ou qu'on les écarte.

interface Props { devBypass?: boolean }

const JOUR_ABBR: Record<Animation['jours'][number], string> = { vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim' };
const STATUT_TONE: Record<StatutAnimation, 'pending' | 'accepted' | 'rejected' | 'neutral' | 'info'> = {
  piste: 'neutral', discussion: 'pending', confirmee: 'info', publiee: 'accepted', refusee: 'rejected', archivee: 'neutral',
};
const MOTS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
const motNombre = (n: number) => (n >= 0 && n <= 10 ? MOTS[n] : String(n));
const capitaliser = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function phraseDePublication(ajoutees: number, deja: number): string {
  if (ajoutees === 0 && deja === 0) return 'Il n’y a rien à publier : ajoutez d’abord un passage à la fiche.';
  const segments: string[] = [];
  if (ajoutees > 0) segments.push(ajoutees === 1 ? 'un passage est monté à l’horaire' : `${motNombre(ajoutees)} passages sont montés à l’horaire`);
  if (deja > 0) segments.push(deja === 1 ? 'un y était déjà' : `${motNombre(deja)} y étaient déjà`);
  return `${capitaliser(segments.join(', '))}.`;
}

function badgeCompte(courriel: string, comptes: Map<string, AppUser> | null): React.ReactNode {
  if (!comptes) return null;
  const c = courriel.trim().toLowerCase();
  if (!c) return null;
  const compte = comptes.get(c);
  return compte
    ? <Badge tone="accepted">Compte FMM · {compte.displayName || compte.email}</Badge>
    : <Badge tone="neutral">Pas de compte</Badge>;
}

function seedLocale(): Animation[] {
  return ANIMATIONS_DE_BASE.map((f, i) => ({
    ...f,
    id: `local-${i}`,
    confirmations: { ...f.confirmations },
    creneaux: f.creneaux.map((c) => ({ ...c })),
  }));
}

const AnimationsSection: React.FC<Props> = ({ devBypass = false }) => {
  const { user } = useAuth();

  const [tab, setTab] = useState<'animations' | 'candidatures'>('animations');
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [loadingAnimations, setLoadingAnimations] = useState(true);
  const [localAnimations, setLocalAnimations] = useState<Animation[]>([]);
  const seedFaite = useRef(false);
  const localCounter = useRef(0);

  const [brouillon, setBrouillon] = useState<Animation | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filtreStatut, setFiltreStatut] = useState<StatutAnimation | 'toutes'>('toutes');
  const [recherche, setRecherche] = useState('');
  const [pubMap, setPubMap] = useState<Record<string, number>>({});
  const [semis, setSemis] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [comptes, setComptes] = useState<Map<string, AppUser> | null>(null);
  const [candidatures, setCandidatures] = useState<CandidatureAnimation[]>([]);
  const [loadingCandidatures, setLoadingCandidatures] = useState(true);
  const [busyCandidatureId, setBusyCandidatureId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = suivreAnimations((rows) => { setAnimations(rows); setLoadingAnimations(false); });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = suivreCandidatures((rows) => { setCandidatures(rows); setLoadingCandidatures(false); });
    return unsub;
  }, []);

  useEffect(() => {
    listUsers()
      .then((rows) => setComptes(new Map(rows.map((u) => [u.email.toLowerCase(), u]))))
      .catch((e) => console.warn('[AnimationsSection] listUsers a échoué', e));
  }, []);

  // Mode développement : Firestore ne rend rien, on montre les trois
  // fiches de départ depuis un petit état en mémoire. ponytail : pas de
  // faux Firestore, juste un tableau local que les écritures modifient.
  useEffect(() => {
    if (!devBypass || loadingAnimations || animations.length > 0 || seedFaite.current) return;
    seedFaite.current = true;
    setLocalAnimations(seedLocale());
  }, [devBypass, loadingAnimations, animations.length]);

  const enLocal = devBypass && !loadingAnimations && animations.length === 0;
  const liste = enLocal ? localAnimations : animations;

  useEffect(() => {
    let vivant = true;
    Promise.all(liste.map(async (a) => [a.id, await compterPubliees(a)] as const))
      .then((pairs) => { if (vivant) setPubMap(Object.fromEntries(pairs)); })
      .catch(() => {});
    return () => { vivant = false; };
  }, [liste]);

  const filtered = useMemo(() => {
    let l = liste;
    if (filtreStatut !== 'toutes') l = l.filter((a) => a.statut === filtreStatut);
    if (recherche.trim()) {
      const q = recherche.trim().toLowerCase();
      l = l.filter((a) => a.nom.toLowerCase().includes(q) || a.contactNom.toLowerCase().includes(q) || a.courriel.toLowerCase().includes(q));
    }
    return l;
  }, [liste, filtreStatut, recherche]);

  const confirmees = liste.filter((a) => a.statut === 'confirmee' || a.statut === 'publiee').length;
  const nonCaduques = liste.filter((a) => a.statut !== 'refusee' && a.statut !== 'archivee');
  const coutEngage = nonCaduques.reduce((s, a) => s + coutTotal(a), 0);
  const partTransport = nonCaduques.reduce((s, a) => s + coutTransport(a), 0);

  // ── Écritures : Firestore normalement, l'état local en mode dev ────
  const onSaveAnimation = async (a: Animation, patch: AnimationInput) => {
    try {
      if (enLocal) {
        setLocalAnimations((cur) => {
          const fiche: Animation = { ...a, ...patch };
          return cur.some((x) => x.id === a.id) ? cur.map((x) => (x.id === a.id ? fiche : x)) : [...cur, fiche];
        });
      } else if (brouillon?.id === a.id) {
        await creerAnimation(a.id, patch);
      } else {
        await majAnimation(a.id, patch);
      }
      if (brouillon?.id === a.id) setBrouillon(null);
      setErreur(null);
    } catch (e) {
      console.warn('[AnimationsSection] enregistrement échoué', e);
      setErreur('Échec de l’enregistrement d’une fiche.');
      throw e;
    }
  };

  const onDeleteAnimation = async (a: Animation) => {
    try {
      if (enLocal) setLocalAnimations((cur) => cur.filter((x) => x.id !== a.id));
      else await supprimerAnimation(a.id);
      setExpanded(null);
      setErreur(null);
    } catch (e) {
      console.warn('[AnimationsSection] suppression échouée', e);
      setErreur('Échec de la suppression d’une fiche.');
      throw e;
    }
  };

  const onPublierAnimation = async (a: Animation): Promise<string> => {
    if (enLocal) {
      setLocalAnimations((cur) => cur.map((x) => (x.id === a.id ? { ...a, statut: 'publiee' } : x)));
      return phraseDePublication(a.creneaux.length, 0);
    }
    if (!user) throw new Error('Vous devez être connecté pour publier.');
    const res = await publierAlHoraire(a, { uid: user.uid, email: user.email ?? '' });
    return phraseDePublication(res.ajoutees, res.deja);
  };

  const onRetirerAnimation = async (a: Animation): Promise<string> => {
    if (enLocal) {
      setLocalAnimations((cur) => cur.map((x) => (x.id === a.id ? { ...a, statut: 'confirmee' } : x)));
      return 'Les passages de cette animation sont retirés de l’horaire.';
    }
    if (!user) throw new Error('Vous devez être connecté pour retirer un passage.');
    const n = await retirerDeLHoraire(a, { uid: user.uid, email: user.email ?? '' });
    if (n === 0) return 'Aucun passage de cette fiche n’était encore à l’horaire.';
    return n === 1 ? 'Un passage est retiré de l’horaire.' : `${capitaliser(motNombre(n))} passages sont retirés de l’horaire.`;
  };

  const commencerNouvelle = () => {
    const id = enLocal ? `local-new-${localCounter.current++}` : nouvelIdAnimation();
    const fiche: Animation = { id, ...nouvelleFicheVide() };
    setBrouillon(fiche);
    setExpanded(id);
    setFiltreStatut('toutes');
  };

  const semer = async () => {
    setSemis(true);
    try {
      await semerAnimations(ANIMATIONS_DE_BASE);
      setErreur(null);
    } catch (e) {
      console.warn('[AnimationsSection] semis échoué', e);
      setErreur('Échec du semis des fiches de départ.');
    } finally {
      setSemis(false);
    }
  };

  const exporterAnimations = () => {
    const rows = filtered.map((a) => ({
      nom: a.nom,
      type: TYPES_ANIMATION.find((t) => t.id === a.type)?.FR ?? a.type,
      statut: STATUTS.find((s) => s.id === a.statut)?.FR ?? a.statut,
      contact: a.contactNom,
      courriel: a.courriel,
      telephone: a.telephone,
      jours: a.jours.map((j) => JOUR_ABBR[j]).join('|'),
      cachet: a.cachet ?? '',
      transportMode: a.transportMode,
      coutTransport: coutTransport(a),
      coutTotal: coutTotal(a),
      passagesPublies: pubMap[a.id] ?? 0,
      passagesTotal: a.creneaux.length,
    }));
    downloadCsv(`animations-${CURRENT_YEAR}.csv`, rows);
  };

  const irALaFiche = (animationId: string) => {
    setTab('animations');
    setFiltreStatut('toutes');
    setExpanded(animationId);
  };

  const importer = async (c: CandidatureAnimation) => {
    setBusyCandidatureId(c.id);
    try {
      const id = await importerCandidature(c);
      irALaFiche(id);
      setErreur(null);
    } catch (e) {
      console.warn('[AnimationsSection] import de candidature échoué', e);
      setErreur('Échec de l’import de cette candidature.');
    } finally {
      setBusyCandidatureId(null);
    }
  };

  const ecarter = async (c: CandidatureAnimation) => {
    setBusyCandidatureId(c.id);
    try {
      await marquerCandidature(c.id, 'ecartee');
      setErreur(null);
    } catch (e) {
      console.warn('[AnimationsSection] écarter une candidature a échoué', e);
      setErreur('Échec : la candidature n’a pas pu être écartée.');
    } finally {
      setBusyCandidatureId(null);
    }
  };

  const exporterCandidatures = () => {
    const rows = candidatures.map((c) => ({
      nom: c.nom,
      type: TYPES_ANIMATION.find((t) => t.id === c.type)?.FR ?? c.type,
      contact: c.contactNom,
      courriel: c.courriel,
      telephone: c.telephone,
      provenance: c.provenance ?? '',
      jours: c.jours.map((j) => JOUR_ABBR[j]).join('|'),
      dejaVenu: c.dejaVenu ? 'oui' : 'non',
      lang: c.lang,
      statut: c.statut,
      recue: fmtDate(c.createdAt),
    }));
    downloadCsv(`candidatures-animation-${CURRENT_YEAR}.csv`, rows);
  };

  // ── En-tête personnalisé pour Tristan ───────────────────────────────
  const adminEmail = (user?.email || '').toLowerCase();
  const adminName = user?.displayName || '';
  const estTristan = adminEmail.includes('tristan') || adminEmail.includes('cote-hotte') || /tristan/i.test(adminName);

  return (
    <div className="space-y-6">
      {erreur && (
        <Card className="p-4 border border-blush/40 bg-blush/8">
          <p className="font-sans text-sm text-blush">{erreur}</p>
        </Card>
      )}

      <Card className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-card bg-brass/15 border border-brass/40 text-brass flex items-center justify-center shrink-0">
            <TentTree size={20} />
          </div>
          <div className="flex-1">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] font-semibold mb-1">
              {estTristan ? 'Console de Tristan' : 'Animations · responsable Tristan Côté-Hotte'}
            </p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-1">
              {estTristan ? `Bienvenue, ${adminName || 'Tristan'}` : 'Le dossier des animations'}
            </h2>
            <p className="font-editorial italic text-sm text-ivory-soft">
              {estTristan
                ? 'Chaque troupe, artiste ou jouteur a son dossier ici : qui vient, ce que ça demande sur le terrain et ce que ça coûte, avec un bouton qui pousse les passages confirmés vers l’horaire public dès que tout est réglé.'
                : 'Cette section réunit les animations du festival, tout sauf la musique qui reste dans l’onglet de Pitch : troupes, artistes, démonstrations et jouteurs y ont chacun leur dossier. Le pilotage opérationnel appartient à Tristan Côté-Hotte.'}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-1">
        <button onClick={() => setTab('animations')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill border text-xs font-sans uppercase tracking-widest transition ${
            tab === 'animations' ? 'bg-brass/25 border-brass text-brass' : 'bg-midnight-deep/40 border-ivory-soft/25 text-ivory-soft hover:border-ivory-soft/50'
          }`}>
          <TentTree size={13} /> Animations
        </button>
        <button onClick={() => setTab('candidatures')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill border text-xs font-sans uppercase tracking-widest transition ${
            tab === 'candidatures' ? 'bg-brass/25 border-brass text-brass' : 'bg-midnight-deep/40 border-ivory-soft/25 text-ivory-soft hover:border-ivory-soft/50'
          }`}>
          <Inbox size={13} /> Candidatures
          {candidatures.filter((c) => c.statut === 'nouvelle').length > 0 && (
            <span className="ml-1 tabular-nums">({candidatures.filter((c) => c.statut === 'nouvelle').length})</span>
          )}
        </button>
      </div>

      {tab === 'animations' ? (
        <>
          <p className="font-editorial italic text-sm text-ivory-soft">
            <span className="text-brass tabular-nums font-medium">{confirmees}</span> confirmée{confirmees === 1 ? '' : 's'} ·
            <span className="text-ivory-soft/60 ml-1 tabular-nums font-medium">{enDollars(coutEngage)}</span> engagés au total ·
            <span className="text-ivory-soft/60 ml-1 tabular-nums font-medium">{enDollars(partTransport)}</span> en transport
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1">
              <button onClick={() => setFiltreStatut('toutes')}
                className={`px-3 py-1.5 rounded-pill border text-xs font-sans uppercase tracking-widest transition ${
                  filtreStatut === 'toutes' ? 'bg-brass/25 border-brass text-brass' : 'bg-midnight-deep/40 border-ivory-soft/25 text-ivory-soft hover:border-ivory-soft/50'
                }`}>
                Toutes
              </button>
              {STATUTS.map((s) => (
                <button key={s.id} onClick={() => setFiltreStatut(s.id)}
                  className={`px-3 py-1.5 rounded-pill border text-xs font-sans uppercase tracking-widest transition ${
                    filtreStatut === s.id ? 'bg-brass/25 border-brass text-brass' : 'bg-midnight-deep/40 border-ivory-soft/25 text-ivory-soft hover:border-ivory-soft/50'
                  }`}>
                  {s.FR}
                </button>
              ))}
            </div>
            <Input placeholder="Rechercher un nom, un contact, un courriel…" value={recherche} onChange={(e) => setRecherche(e.target.value)}
              className="flex-1 min-w-[220px]" />
            <PrimaryButton onClick={commencerNouvelle}><Plus size={12} /> Nouvelle animation</PrimaryButton>
            <GhostButton onClick={exporterAnimations}><Download size={14} className="inline mr-1.5 -mt-0.5" />CSV</GhostButton>
          </div>

          {brouillon && (
            <Card className="p-0 overflow-hidden border border-brass/40">
              <div className="px-5 pt-4">
                <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold" style={{ color: 'var(--admin-accent)' }}>Nouvelle fiche</p>
              </div>
              <div className="px-5 pb-5 pt-2">
                <AnimationFiche
                  animation={brouillon}
                  isNew
                  comptes={comptes}
                  onSave={(patch) => onSaveAnimation(brouillon, patch)}
                  onDelete={() => onDeleteAnimation(brouillon)}
                  onPublier={onPublierAnimation}
                  onRetirer={onRetirerAnimation}
                  onCancel={() => { setBrouillon(null); setExpanded(null); }}
                />
              </div>
            </Card>
          )}

          {loadingAnimations && !enLocal ? (
            <EmptyState>Chargement…</EmptyState>
          ) : !enLocal && animations.length === 0 ? (
            <Card>
              <EmptyState icon={TentTree}>
                Aucune animation pour l’instant.
                <div className="mt-4">
                  <PrimaryButton onClick={semer} disabled={semis}>
                    <Sparkles size={12} /> {semis ? 'Semis…' : 'Semer les trois premières fiches'}
                  </PrimaryButton>
                </div>
              </EmptyState>
            </Card>
          ) : filtered.length === 0 ? (
            <Card><EmptyState icon={TentTree}>Aucune animation ne correspond à ce filtre.</EmptyState></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <AnimationCard
                  key={a.id}
                  animation={a}
                  open={expanded === a.id}
                  onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
                  publiees={pubMap[a.id]}
                  comptes={comptes}
                  onSave={(patch) => onSaveAnimation(a, patch)}
                  onDelete={() => onDeleteAnimation(a)}
                  onPublier={onPublierAnimation}
                  onRetirer={onRetirerAnimation}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-end">
            <GhostButton onClick={exporterCandidatures}><Download size={14} className="inline mr-1.5 -mt-0.5" />CSV</GhostButton>
          </div>
          {loadingCandidatures ? (
            <EmptyState>Chargement…</EmptyState>
          ) : candidatures.length === 0 ? (
            <Card><EmptyState icon={Inbox}>Aucune candidature reçue pour l’instant.</EmptyState></Card>
          ) : (
            <div className="space-y-3">
              {candidatures.map((c) => (
                <CandidatureCard
                  key={c.id}
                  candidature={c}
                  comptes={comptes}
                  busy={busyCandidatureId === c.id}
                  onImporter={() => importer(c)}
                  onEcarter={() => ecarter(c)}
                  onVoirFiche={c.animationId ? () => irALaFiche(c.animationId!) : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Une fiche repliée dans la liste ─────────────────────────────────
const AnimationCard: React.FC<{
  animation: Animation;
  open: boolean;
  onToggle: () => void;
  publiees?: number;
  comptes: Map<string, AppUser> | null;
  onSave: (patch: AnimationInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onPublier: (a: Animation) => Promise<string>;
  onRetirer: (a: Animation) => Promise<string>;
}> = ({ animation, open, onToggle, publiees, comptes, onSave, onDelete, onPublier, onRetirer }) => {
  const typeLabel = TYPES_ANIMATION.find((t) => t.id === animation.type)?.FR ?? animation.type;
  const statutLabel = STATUTS.find((s) => s.id === animation.statut)?.FR ?? animation.statut;

  return (
    <Card className="p-0 overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown size={16} className="text-ivory-soft shrink-0" /> : <ChevronRight size={16} className="text-ivory-soft shrink-0" />}
          <div className="min-w-0">
            <p className="font-display title-medieval text-base md:text-lg text-ivory truncate">{animation.nom || 'Sans nom'}</p>
            <p className="font-editorial italic text-xs text-ivory-soft truncate">
              {typeLabel}{animation.jours.length > 0 ? ` · ${animation.jours.map((j) => JOUR_ABBR[j]).join(' · ')}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Badge tone={STATUT_TONE[animation.statut]}>{statutLabel}</Badge>
          {badgeCompte(animation.courriel, comptes)}
          <span className="hidden sm:inline font-sans text-xs uppercase tracking-wider text-ivory-soft/60">{enDollars(coutTotal(animation))}</span>
          <span className="hidden md:inline font-sans text-[10px] uppercase tracking-wider text-ivory-soft/50">
            {publiees ?? 0}/{animation.creneaux.length} passages
          </span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-ivory-soft/15">
          <AnimationFiche
            animation={animation}
            comptes={comptes}
            onSave={onSave}
            onDelete={onDelete}
            onPublier={onPublier}
            onRetirer={onRetirer}
          />
        </div>
      )}
    </Card>
  );
};

// ─── Une candidature reçue ────────────────────────────────────────────
const CandidatureCard: React.FC<{
  candidature: CandidatureAnimation;
  comptes: Map<string, AppUser> | null;
  busy: boolean;
  onImporter: () => void;
  onEcarter: () => void;
  onVoirFiche?: () => void;
}> = ({ candidature: c, comptes, busy, onImporter, onEcarter, onVoirFiche }) => {
  const typeLabel = TYPES_ANIMATION.find((t) => t.id === c.type)?.FR ?? c.type;

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-display title-medieval text-base text-ivory truncate">{c.nom}</p>
          <p className="font-editorial italic text-xs text-ivory-soft">
            {typeLabel} · {c.contactNom} · {c.courriel}{c.provenance ? ` · ${c.provenance}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {c.statut === 'importee' && <Badge tone="accepted">Importée</Badge>}
          {c.statut === 'ecartee' && <Badge tone="neutral">Écartée</Badge>}
          {badgeCompte(c.courriel, comptes)}
          <span className="font-sans text-[10px] uppercase tracking-wider text-ivory-soft/50">{fmtDate(c.createdAt)}</span>
        </div>
      </div>

      <p className="text-sm whitespace-pre-line" style={{ color: 'var(--admin-text)' }}>{c.description}</p>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs" style={{ color: 'var(--admin-text-mute)' }}>
        {c.jours.length > 0 && <p>Jours souhaités : {c.jours.map((j) => JOURS.find((d) => d.id === j)?.FR ?? j).join(', ')}</p>}
        {c.duree && <p>Durée d’une prestation : {c.duree}</p>}
        {c.nbPassages !== undefined && <p>Passages souhaités : {c.nbPassages}</p>}
        {c.cachetDemande && <p>Cachet demandé : {c.cachetDemande}</p>}
        {c.transport && <p>Transport : {c.transport}</p>}
        <p>Hébergement demandé : {c.hebergement ? 'oui' : 'non'} · Déjà venue au festival : {c.dejaVenu ? 'oui' : 'non'}</p>
        {c.besoins && <p>Besoins : {c.besoins}</p>}
      </div>

      {c.message && (
        <p className="text-sm italic border-l-2 pl-3" style={{ borderColor: 'var(--admin-accent-line)', color: 'var(--admin-text-mute)' }}>
          {c.message}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap pt-1">
        {c.statut === 'nouvelle' && (
          <>
            <PrimaryButton type="button" onClick={onImporter} disabled={busy}>{busy ? 'Import…' : 'Importer'}</PrimaryButton>
            <GhostButton type="button" onClick={onEcarter} disabled={busy}>Écarter</GhostButton>
          </>
        )}
        {onVoirFiche && <GhostButton type="button" onClick={onVoirFiche}>Voir la fiche</GhostButton>}
      </div>
    </Card>
  );
};

export default AnimationsSection;
