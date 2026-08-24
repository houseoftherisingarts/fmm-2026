import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Mail, Search, Send, TriangleAlert, Loader2, CircleCheck, History,
  Users, FlaskConical, Feather, Filter,
} from 'lucide-react';
import { Card, Input, Label, PrimaryButton, GhostButton, EmptyState, Badge, fmtDate } from '../primitives';
import { useAuth } from '../../../contexts/AuthContext';
import { MODELES_CAMPAGNE, type LangueCampagne, type ModeleCampagne } from '../../../content/campagnes';
import { rendreCampagne, JETON_NOM, JETON_DESABONNEMENT } from '../../../lib/courrielCampagne';
import {
  lireClients, filtrerClients, destinatairesDepuis, anneesDuRegistre,
  suivreCampagnes, envoyerCampagne, CATEGORIES_CLIENT, FILTRE_VIDE,
  ANNEE_COURANTE, PLAFOND_CAMPAGNE,
  type Client, type CategorieClient, type FiltreCampagne, type Campagne, type Destinataire,
} from '../../../firebase/campagnes';

// ─── Les campagnes de courriels ──────────────────────────────────────
// Alex, 2026-08-24 : d'ici, l'équipe écrit aux gens des listes de
// clients. Quatre gestes, dans l'ordre où ils se posent.
//
//   1. Choisir la lettre parmi les neuf modèles, en français ou en
//      anglais.
//   2. Choisir à qui elle part : par année, par catégorie, par le
//      filtre « n'a rien acheté cette année », ou en cochant des noms.
//   3. S'en envoyer un exemplaire d'essai et le lire dans sa propre
//      boîte, avec la mise en page réelle.
//   4. Lancer l'envoi derrière un panneau qui redit le nombre exact.
//
// Aucune boîte du navigateur, ni `confirm()` ni `alert()` : le garde-fou
// est un panneau dans la page, qui écrit le compte noir sur or.
//
// La lettre part au nom du festival, depuis
// `admin@festivalmedievaldemontpellier.org`. Le nom d'Alex ne paraît
// qu'à la signature, comme directeur des communications.

type ModeDestinataires = 'filtre' | 'coches';

const CampagnesSection: React.FC = () => {
  const { user } = useAuth();

  const [clients, setClients]     = useState<Client[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurLecture, setErreurLecture] = useState<string | null>(null);

  const [modeleId, setModeleId] = useState<string>(MODELES_CAMPAGNE[0].id);
  const [langue, setLangue]     = useState<LangueCampagne>('FR');

  const [filtre, setFiltre] = useState<FiltreCampagne>(FILTRE_VIDE);
  const [mode, setMode]     = useState<ModeDestinataires>('filtre');
  const [terme, setTerme]   = useState('');
  const [coches, setCoches] = useState<Set<string>>(new Set());

  const [confirme, setConfirme] = useState(false);
  const [envoi, setEnvoi]       = useState(false);
  const [essai, setEssai]       = useState(false);
  const [message, setMessage]   = useState<string | null>(null);
  const [erreur, setErreur]     = useState<string | null>(null);

  const [historique, setHistorique] = useState<Campagne[]>([]);

  // Le focus se pose par identifiant plutôt que par `ref` : le bouton
  // partagé de `primitives.tsx` n'expose pas de ref, et le corriger
  // là-bas toucherait toutes les sections de l'admin pour un besoin
  // qui n'existe qu'ici.
  const ID_CONFIRMER = 'campagne-confirmer';

  // ── Le registre ──
  useEffect(() => {
    let vivant = true;
    lireClients()
      .then((liste) => { if (vivant) { setClients(liste); setErreurLecture(null); } })
      .catch((e: unknown) => {
        if (vivant) setErreurLecture(e instanceof Error ? e.message : 'Le registre des clients n’a pas répondu.');
      })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, []);

  // ── L'historique, en direct ──
  useEffect(() => suivreCampagnes(setHistorique), []);

  const modele: ModeleCampagne = useMemo(
    () => MODELES_CAMPAGNE.find((m) => m.id === modeleId) ?? MODELES_CAMPAGNE[0],
    [modeleId],
  );

  // Deux rendus, et la différence tient à l'adresse des images.
  // Celui qui PART pointe vers le site public : c'est la seule adresse
  // qu'un client de courriel saura joindre. Celui de l'APERÇU pointe
  // vers le site en cours, pour que les images se voient à l'écran même
  // avant que la production ait reçu les nouveaux fichiers.
  const rendu = useMemo(() => rendreCampagne(modele, langue), [modele, langue]);
  const renduApercu = useMemo(
    () => rendreCampagne(modele, langue, window.location.origin),
    [modele, langue],
  );

  const annees = useMemo(() => anneesDuRegistre(clients), [clients]);

  const retenus = useMemo(() => filtrerClients(clients, filtre), [clients, filtre]);

  /** Les personnes que le filtre retient, une ligne par adresse. C'est
   *  cette liste qui s'affiche et qui se coche. */
  const personnes: Destinataire[] = useMemo(() => {
    const liste = destinatairesDepuis(retenus);
    liste.sort((a, b) => (a.nom || a.courriel).localeCompare(b.nom || b.courriel, 'fr'));
    return liste;
  }, [retenus]);

  const personnesVues = useMemo(() => {
    const t = terme.trim().toLowerCase();
    if (!t) return personnes;
    return personnes.filter((p) => p.nom.toLowerCase().includes(t) || p.courriel.includes(t));
  }, [personnes, terme]);

  const destinataires: Destinataire[] = useMemo(
    () => (mode === 'coches' ? personnes.filter((p) => coches.has(p.courriel)) : personnes),
    [mode, personnes, coches],
  );

  const nombre = destinataires.length;
  const tropDeMonde = nombre > PLAFOND_CAMPAGNE;

  /** La phrase qui décrira la cible dans l'historique. */
  const cible = useMemo(() => {
    if (mode === 'coches') return `${nombre} personne${nombre > 1 ? 's' : ''} cochée${nombre > 1 ? 's' : ''}`;
    const bouts: string[] = [];
    if (filtre.annees.length) bouts.push(`années ${[...filtre.annees].sort().join(', ')}`);
    if (filtre.categories.length) {
      const noms = CATEGORIES_CLIENT.filter((c) => filtre.categories.includes(c.id)).map((c) => c.libelle);
      bouts.push(noms.join(', ').toLowerCase());
    }
    if (filtre.sansAchatCetteAnnee) bouts.push(`sans achat en ${ANNEE_COURANTE}`);
    return bouts.length ? bouts.join(' · ') : 'tout le registre';
  }, [mode, nombre, filtre]);

  /** L'aperçu affiché dans le cadre : les deux jetons se remplacent par
   *  un exemple, pour que la lettre se lise comme le destinataire la
   *  verra. Le vrai remplissage se fait dans la Cloud Function. */
  const apercuHtml = useMemo(
    () => renduApercu.html
      .split(JETON_NOM).join(langue === 'FR' ? ' Marguerite' : ' Margaret')
      .split(JETON_DESABONNEMENT).join('#'),
    [renduApercu.html, langue],
  );

  // Le panneau de confirmation appelle le regard : le geste suivant
  // est celui qui envoie, et il reçoit le focus du clavier.
  useEffect(() => {
    if (confirme) boutonConfirmer.current?.focus();
  }, [confirme]);

  // Changer de modèle, de langue ou de cible annule une confirmation en
  // attente : le nombre affiché dans le panneau doit toujours être le
  // nombre réel.
  useEffect(() => { setConfirme(false); }, [modeleId, langue, mode, filtre, coches]);

  const basculer = <T,>(liste: T[], valeur: T): T[] =>
    (liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur]);

  const cocher = (courriel: string) => {
    setCoches((avant) => {
      const apres = new Set(avant);
      if (apres.has(courriel)) apres.delete(courriel); else apres.add(courriel);
      return apres;
    });
  };

  const cocherTout = () => setCoches(new Set(personnesVues.map((p) => p.courriel)));
  const toutDecocher = () => setCoches(new Set());

  const envoyerEssai = async () => {
    setEssai(true); setErreur(null); setMessage(null);
    try {
      const r = await envoyerCampagne({
        modele: modele.id, modeleNom: modele.nom, langue, cible: 'Essai',
        sujet: rendu.sujet, html: rendu.html, texte: rendu.texte,
        destinataires: [], essai: true,
      });
      setMessage(`L’exemplaire d’essai est parti à ${r.courriel ?? 'ton adresse'}.`);
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : 'L’essai n’est pas parti.');
    } finally {
      setEssai(false);
    }
  };

  const lancer = async () => {
    setEnvoi(true); setErreur(null); setMessage(null);
    try {
      const r = await envoyerCampagne({
        modele: modele.id, modeleNom: modele.nom, langue, cible,
        sujet: rendu.sujet, html: rendu.html, texte: rendu.texte,
        destinataires,
      });
      const bouts = [`${r.envoyes ?? 0} courriel${(r.envoyes ?? 0) > 1 ? 's' : ''} parti${(r.envoyes ?? 0) > 1 ? 's' : ''}`];
      if (r.echecs) bouts.push(`${r.echecs} échec${r.echecs > 1 ? 's' : ''}`);
      if (r.desabonnesIgnores) bouts.push(`${r.desabonnesIgnores} adresse${r.desabonnesIgnores > 1 ? 's' : ''} désabonnée${r.desabonnesIgnores > 1 ? 's' : ''} épargnée${r.desabonnesIgnores > 1 ? 's' : ''}`);
      if (r.adressesInvalides) bouts.push(`${r.adressesInvalides} adresse${r.adressesInvalides > 1 ? 's' : ''} illisible${r.adressesInvalides > 1 ? 's' : ''}`);
      setMessage(`${bouts.join(' · ')}.`);
      setConfirme(false);
      setCoches(new Set());
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : 'L’envoi s’est arrêté.');
    } finally {
      setEnvoi(false);
    }
  };

  const enCours = historique.find((c) => c.statut === 'en cours');

  const pastilleStyle = (actif: boolean): React.CSSProperties => ({
    borderRadius: 15,
    border: `1px solid ${actif ? 'var(--admin-accent-line)' : 'var(--admin-line)'}`,
    background: actif
      ? 'color-mix(in oklab, var(--admin-accent), transparent 88%)'
      : 'rgba(196, 214, 230, 0.03)',
    color: actif ? 'var(--admin-brass-hi)' : 'var(--admin-text-soft)',
    boxShadow: actif ? 'inset 0 1px 0 var(--admin-sheen)' : 'none',
  });

  return (
    <div className="space-y-7">

      {/* ── L'entrée en matière ── */}
      <div className="max-w-[68ch]">
        <p className="admin-prose">
          D’ici, tu écris aux gens des listes de clients. Choisis la lettre, choisis à qui
          elle part, envoie-t’en un exemplaire pour la lire dans ta propre boîte, puis lance
          l’envoi.
        </p>
        <p className="admin-prose mt-3">
          Chaque personne reçoit sa propre lettre, jamais une copie conforme, et un lien de
          désabonnement figure au bas de chaque message. Une adresse qui s’est retirée n’est
          plus jamais réécrite. La lettre part au nom du festival, depuis
          {' '}admin@festivalmedievaldemontpellier.org, et la signature au bas est celle
          d’Alex comme directeur des communications.
        </p>
      </div>

      {/* ── 1 · La lettre ── */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-1">
          <h3 className="font-display title-medieval text-lg" style={{ color: 'var(--admin-text)' }}>
            La lettre
          </h3>
          <div className="flex gap-2" role="group" aria-label="Langue de la lettre">
            {(['FR', 'EN'] as LangueCampagne[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLangue(l)}
                aria-pressed={langue === l}
                className="px-3.5 py-1.5 font-sans uppercase tracking-[0.2em] text-[10px] transition-colors"
                style={pastilleStyle(langue === l)}
              >
                {l === 'FR' ? 'Français' : 'English'}
              </button>
            ))}
          </div>
        </div>
        <p className="admin-prose mb-5">
          Neuf modèles. Cinq portent les mots d’Alex, mot pour mot, et ils sont marqués.
        </p>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Modèle de courriel">
          {MODELES_CAMPAGNE.map((m) => {
            const actif = m.id === modeleId;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => setModeleId(m.id)}
                className="text-left p-4 transition-colors"
                style={pastilleStyle(actif)}
              >
                <span className="flex items-start gap-2.5">
                  <Feather size={15} className="shrink-0 mt-1" aria-hidden />
                  <span className="min-w-0">
                    <span
                      className="block font-display text-[0.98rem] leading-snug"
                      style={{ color: actif ? 'var(--admin-text)' : 'var(--admin-text-soft)' }}
                    >
                      {m.nom}
                    </span>
                    <span
                      className="block font-sans text-[11px] leading-relaxed mt-1.5"
                      style={{ color: 'var(--admin-text-mute)' }}
                    >
                      {m.pourQui}
                    </span>
                    {m.motsDAlex && (
                      <span className="inline-block mt-2">
                        <Badge tone="info">Ses mots</Badge>
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── 2 · Les destinataires ── */}
      <Card className="p-5 md:p-6">
        <h3 className="font-display title-medieval text-lg mb-1" style={{ color: 'var(--admin-text)' }}>
          Les destinataires
        </h3>
        <p className="admin-prose mb-5">
          Le filtre taille la liste. Les cases servent quand tu veux écrire à quelques
          personnes précises plutôt qu’à un groupe entier.
        </p>

        {erreurLecture && (
          <p className="admin-prose mb-4" style={{ color: '#FCA5B0' }}>
            {erreurLecture} La collection des clients se bâtit dans un autre chantier : la
            section s’allumera toute seule quand elle existera.
          </p>
        )}

        {/* Les années */}
        <div className="mb-5">
          <Label>Années</Label>
          <div className="flex flex-wrap gap-2">
            {annees.length === 0 && (
              <span className="font-sans text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                {chargement ? 'Lecture du registre…' : 'Aucune année dans le registre.'}
              </span>
            )}
            {annees.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setFiltre((f) => ({ ...f, annees: basculer(f.annees, a) }))}
                aria-pressed={filtre.annees.includes(a)}
                className="px-3.5 py-1.5 font-sans tracking-[0.14em] text-[11px] transition-colors"
                style={pastilleStyle(filtre.annees.includes(a))}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Les catégories */}
        <div className="mb-5">
          <Label>Catégories</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES_CLIENT.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFiltre((f) => ({
                  ...f,
                  categories: basculer<CategorieClient>(f.categories, c.id),
                }))}
                aria-pressed={filtre.categories.includes(c.id)}
                className="px-3.5 py-1.5 font-sans tracking-[0.14em] text-[11px] transition-colors"
                style={pastilleStyle(filtre.categories.includes(c.id))}
              >
                {c.libelle}
              </button>
            ))}
          </div>
        </div>

        {/* Le filtre de l'invitation */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setFiltre((f) => ({ ...f, sansAchatCetteAnnee: !f.sansAchatCetteAnnee }))}
            aria-pressed={filtre.sansAchatCetteAnnee}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 font-sans text-[11px] tracking-[0.14em] transition-colors"
            style={pastilleStyle(filtre.sansAchatCetteAnnee)}
          >
            <Filter size={14} aria-hidden />
            N’a rien acheté en {ANNEE_COURANTE}
          </button>
        </div>

        <div className="admin-seam mb-5" />

        {/* La portée */}
        <div className="flex flex-wrap items-center gap-2 mb-4" role="group" aria-label="Portée de l’envoi">
          <button
            type="button"
            onClick={() => setMode('filtre')}
            aria-pressed={mode === 'filtre'}
            className="inline-flex items-center gap-2 px-4 py-2.5 font-sans uppercase tracking-[0.2em] text-[10px] transition-colors"
            style={pastilleStyle(mode === 'filtre')}
          >
            <Users size={14} aria-hidden />
            Tout ce que le filtre retient
          </button>
          <button
            type="button"
            onClick={() => setMode('coches')}
            aria-pressed={mode === 'coches'}
            className="inline-flex items-center gap-2 px-4 py-2.5 font-sans uppercase tracking-[0.2em] text-[10px] transition-colors"
            style={pastilleStyle(mode === 'coches')}
          >
            <CircleCheck size={14} aria-hidden />
            Les personnes cochées
          </button>
        </div>

        {/* La recherche + la liste */}
        <div className="relative mb-4">
          <Search
            size={15}
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--admin-text-mute)' }}
          />
          <Input
            type="search"
            value={terme}
            onChange={(e) => setTerme(e.target.value)}
            placeholder="Chercher un nom ou une adresse"
            aria-label="Chercher un nom ou une adresse"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="font-sans text-xs" style={{ color: 'var(--admin-text-soft)' }}>
            {personnes.length} personne{personnes.length > 1 ? 's' : ''} dans le filtre
            {terme.trim() && ` · ${personnesVues.length} à l’écran`}
          </p>
          {mode === 'coches' && (
            <div className="flex items-center gap-2">
              <GhostButton type="button" onClick={cocherTout}>Tout cocher</GhostButton>
              <GhostButton type="button" onClick={toutDecocher}>Tout décocher</GhostButton>
            </div>
          )}
        </div>

        {personnesVues.length === 0 ? (
          <EmptyState icon={Users}>
            {chargement ? 'Lecture du registre…' : 'Le filtre ne retient personne.'}
          </EmptyState>
        ) : (
          <ul
            className="space-y-1 overflow-y-auto admin-nav-scroll"
            style={{ maxHeight: 330 }}
          >
            {personnesVues.slice(0, 400).map((p) => {
              const coche = coches.has(p.courriel);
              return (
                <li key={p.courriel}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={mode === 'coches' ? coche : true}
                    disabled={mode !== 'coches'}
                    onClick={() => cocher(p.courriel)}
                    className="w-full flex items-center gap-3.5 px-3.5 py-2 text-left transition-colors"
                    style={{
                      borderRadius: 15,
                      background: mode === 'coches' && coche
                        ? 'color-mix(in oklab, var(--admin-accent), transparent 90%)'
                        : 'transparent',
                      cursor: mode === 'coches' ? 'pointer' : 'default',
                    }}
                  >
                    <span
                      aria-hidden
                      className="shrink-0 flex items-center justify-center"
                      style={{
                        width: 17, height: 17, borderRadius: 5,
                        border: `1px solid ${mode === 'coches' && coche ? 'var(--admin-accent-line)' : 'var(--admin-line)'}`,
                        background: mode === 'coches' && coche
                          ? 'var(--admin-brass-hi)'
                          : 'transparent',
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[0.95rem] truncate" style={{ color: 'var(--admin-text)' }}>
                        {p.nom || p.courriel}
                      </span>
                      {p.nom && (
                        <span className="block font-sans text-[10px] tracking-[0.1em] truncate mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                          {p.courriel}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {personnesVues.length > 400 && (
          <p className="font-sans text-[11px] mt-3" style={{ color: 'var(--admin-text-mute)' }}>
            Les 400 premières sont affichées. L’envoi porte sur les {nombre} retenues.
          </p>
        )}
      </Card>

      {/* ── 3 · L'aperçu et l'envoi ── */}
      <Card className="p-5 md:p-6">
        <h3 className="font-display title-medieval text-lg mb-1" style={{ color: 'var(--admin-text)' }}>
          L’aperçu
        </h3>
        <p className="admin-prose mb-4">
          Voici la lettre telle qu’elle arrivera. L’objet est&nbsp;: «&nbsp;{rendu.sujet}&nbsp;»
        </p>

        <div
          style={{
            borderRadius: 15,
            overflow: 'hidden',
            border: '1px solid var(--admin-line)',
            boxShadow: 'inset 0 1px 0 var(--admin-sheen)',
          }}
        >
          <iframe
            title={`Aperçu de la lettre : ${modele.nom}`}
            srcDoc={apercuHtml}
            sandbox=""
            style={{ width: '100%', height: 520, border: 0, display: 'block', background: '#0B0508' }}
          />
        </div>

        <div className="admin-seam my-6" />

        {/* Le compte, en gros. C'est le chiffre qui compte. */}
        <div className="flex flex-wrap items-baseline gap-3 mb-5">
          <span className="font-display" style={{ fontSize: '2.4rem', lineHeight: 1, color: 'var(--admin-brass-hi)' }}>
            {nombre}
          </span>
          <span className="font-sans text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--admin-text-soft)' }}>
            destinataire{nombre > 1 ? 's' : ''} · {cible}
          </span>
        </div>

        {tropDeMonde && (
          <p className="admin-prose mb-4" style={{ color: '#FCA5B0' }}>
            Une campagne ne peut pas dépasser {PLAFOND_CAMPAGNE} adresses d’un coup. Resserre
            le filtre, et envoie la suite juste après.
          </p>
        )}

        {/* ── Le garde-fou ──
            Un panneau dans la page, jamais une boîte du navigateur : le
            compte exact est écrit noir sur or, et le geste se redemande. */}
        {confirme ? (
          <div
            role="group"
            aria-labelledby="campagne-confirmation"
            className="p-5"
            style={{
              borderRadius: 15,
              background: 'color-mix(in oklab, var(--admin-accent), transparent 93%)',
              border: '1px solid var(--admin-accent-line)',
              boxShadow: 'inset 0 1px 0 var(--admin-sheen)',
            }}
          >
            <div className="flex items-start gap-3.5">
              <TriangleAlert size={18} style={{ color: 'var(--admin-brass-hi)' }} className="shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0">
                <p id="campagne-confirmation" className="font-display title-medieval text-lg" style={{ color: 'var(--admin-text)' }}>
                  {nombre} personne{nombre > 1 ? 's' : ''} vont recevoir cette lettre
                </p>
                <p className="admin-prose mt-1.5">
                  Elle part de admin@festivalmedievaldemontpellier.org, au nom du festival,
                  et chacune reçoit la sienne. La portée retenue est : {cible}. Rien ne la
                  rappellera une fois partie.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <PrimaryButton
                    id={ID_CONFIRMER}
                    type="button"
                    onClick={() => void lancer()}
                    disabled={envoi}
                  >
                    <Send size={13} className="inline mr-1.5 -mt-0.5" aria-hidden />
                    Envoyer aux {nombre} personnes
                  </PrimaryButton>
                  <GhostButton type="button" onClick={() => setConfirme(false)}>
                    Annuler
                  </GhostButton>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton
              type="button"
              onClick={() => setConfirme(true)}
              disabled={envoi || nombre === 0 || tropDeMonde}
            >
              {envoi
                ? <><Loader2 size={13} className="inline mr-1.5 -mt-0.5 animate-spin" aria-hidden /> Envoi en cours</>
                : <><Send size={13} className="inline mr-1.5 -mt-0.5" aria-hidden /> Envoyer la campagne</>}
            </PrimaryButton>
            <GhostButton type="button" onClick={() => void envoyerEssai()} disabled={essai || envoi}>
              {essai
                ? <><Loader2 size={13} className="inline mr-1.5 -mt-0.5 animate-spin" aria-hidden /> Essai en route</>
                : <><FlaskConical size={13} className="inline mr-1.5 -mt-0.5" aria-hidden /> M’envoyer un exemplaire</>}
            </GhostButton>
            {user?.email && (
              <span className="font-sans text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                L’essai part à {user.email}.
              </span>
            )}
          </div>
        )}

        {/* L'avancement, tiré du document d'historique que la fonction
            met à jour à chaque lot. */}
        {enCours && (
          <div className="mt-5">
            <p className="font-sans text-[11px] uppercase tracking-[0.24em] mb-2" style={{ color: 'var(--admin-text-soft)' }}>
              {enCours.envoyes} courriel{enCours.envoyes > 1 ? 's' : ''} sur {enCours.destinataires}
            </p>
            <div style={{ height: 4, borderRadius: 999, background: 'rgba(4, 8, 12, 0.62)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round((enCours.envoyes / Math.max(1, enCours.destinataires)) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--admin-brass-lo), var(--admin-brass-hi))',
                  transition: 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </div>
          </div>
        )}

        {/* Ce que la page a à dire, annoncé aux lecteurs d'écran. */}
        <div role="status" aria-live="polite">
          {erreur && <p className="admin-prose mt-4" style={{ color: '#FCA5B0' }}>{erreur}</p>}
          {message && (
            <p className="admin-prose mt-4 inline-flex items-start gap-2" style={{ color: '#5FD3A2' }}>
              <CircleCheck size={15} className="shrink-0 mt-0.5" aria-hidden />
              {message}
            </p>
          )}
        </div>
      </Card>

      {/* ── 4 · L'historique ── */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2 mb-1">
          <History size={16} style={{ color: 'var(--admin-accent)' }} aria-hidden />
          <h3 className="font-display title-medieval text-lg" style={{ color: 'var(--admin-text)' }}>
            Les campagnes passées
          </h3>
        </div>
        <p className="admin-prose mb-5">
          Qui a écrit, quand, quelle lettre, combien sont partis et combien ont échoué.
        </p>

        {historique.length === 0 ? (
          <EmptyState icon={Mail}>Aucune campagne n’est encore partie.</EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {historique.map((c) => (
              <li
                key={c.id}
                className="p-4"
                style={{
                  borderRadius: 15,
                  border: '1px solid var(--admin-line)',
                  background: 'rgba(196, 214, 230, 0.02)',
                }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
                  <span className="font-display text-[1rem]" style={{ color: 'var(--admin-text)' }}>
                    {c.modeleNom || c.modele}
                  </span>
                  <span className="font-sans text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                    {fmtDate(c.envoyeLe)}
                  </span>
                </div>
                <p className="admin-prose mt-1.5">
                  {c.sujet}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge tone={c.statut === 'terminé' ? 'accepted' : c.statut === 'échoué' ? 'rejected' : 'pending'}>
                    {c.statut}
                  </Badge>
                  <Badge tone="info">{c.langue}</Badge>
                  <Badge tone="neutral">{c.envoyes} sur {c.destinataires}</Badge>
                  {c.echecs > 0 && <Badge tone="rejected">{c.echecs} échec{c.echecs > 1 ? 's' : ''}</Badge>}
                  {!!c.desabonnesIgnores && (
                    <Badge tone="neutral">{c.desabonnesIgnores} désabonnée{c.desabonnesIgnores > 1 ? 's' : ''}</Badge>
                  )}
                </div>
                <p className="font-sans text-[11px] mt-3" style={{ color: 'var(--admin-text-mute)' }}>
                  {c.parNom} · {c.cible}
                </p>
                {c.erreur && (
                  <p className="admin-prose mt-2" style={{ color: '#FCA5B0' }}>{c.erreur}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

    </div>
  );
};

export default CampagnesSection;
