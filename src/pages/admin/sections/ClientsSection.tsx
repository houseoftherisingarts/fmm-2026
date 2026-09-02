import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Download, Users, UserPlus, CircleCheck, CircleSlash, MailQuestion,
  CalendarClock, Loader2, TriangleAlert, Phone, Sparkles,
} from 'lucide-react';
import { Card, Badge, EmptyState, GhostButton, downloadCsv } from '../primitives';
import {
  listerClients, listerComptes, filtrerClients, anneesDuRegistre, courrielsDeLAnnee,
  anneesPresumees, ANNEE_PRESUMEE,
  CATEGORIES_CLIENT, LIBELLE_CATEGORIE, UNITE_CATEGORIE,
  type Client, type CategorieClient,
} from '../../../firebase/clients';
import { listerMembres } from '../../../firebase/ordre';

// ─── Le registre des clients ─────────────────────────────────────────
// Alex, 2026-08-24 : « la liste des clients, regroupés par année et par
// catégorie ». Tout ce que le festival a vendu depuis 2023, versé ici
// par tools/importer-clients.mjs depuis les exports Zeffy.
//
// Une personne, une année, une catégorie : quelqu'un qui a pris douze
// billets tient sur une ligne, avec douze au compteur.
//
// La question qui commande la page : à qui écrire pour l'année qui
// vient. D'où le filtre « n'a rien pris cette année », qui compare les
// courriels d'une année à ceux de l'année de référence, et la marque de
// compte sur chaque ligne, qui dit qui reste à inviter.
//
// ⚠️ DONNÉES PERSONNELLES RÉELLES. Rien de cette page ne se recopie
// ailleurs que dans le CSV qu'un membre de l'équipe télécharge lui-même.

type FiltreAnnee = 'toutes' | number;
type FiltreCategorie = 'toutes' | CategorieClient;

/** L'état du client vis-à-vis du site.
 *
 *  `inconnu` existe pour une raison précise : quand la liste des comptes
 *  n'a pas pu se lire, dire « à inviter » à tout le monde ferait écrire
 *  à trois cents personnes qui ont déjà un compte. Tant que la lecture
 *  n'a pas abouti, la page l'avoue au lieu de deviner. */
type Lien = 'registre' | 'compte' | 'inviter' | 'inconnu';

const LIEN_LIBELLE: Record<Lien, string> = {
  registre: 'Compte',
  compte:   'Compte sans fiche',
  inviter:  'À inviter',
  inconnu:  'Non vérifié',
};

const LIEN_TON: Record<Lien, 'accepted' | 'waitlist' | 'neutral'> = {
  registre: 'accepted',
  compte:   'waitlist',
  inviter:  'neutral',
  inconnu:  'neutral',
};

/** Une pastille de compteur, posée sur la couture du bandeau. */
const Compteur: React.FC<{
  valeur: number | string;
  libelle: string;
  icone: React.ComponentType<{ size?: number }>;
  accent?: boolean;
}> = ({ valeur, libelle, icone: Icone, accent }) => (
  <div className="flex items-center gap-3 min-w-0">
    <span
      aria-hidden
      className="shrink-0 flex items-center justify-center"
      style={{
        width: 34, height: 34, borderRadius: 10,
        border: `1px solid ${accent ? 'var(--admin-accent-line)' : 'var(--admin-line)'}`,
        background: accent
          ? 'color-mix(in oklab, var(--admin-accent), transparent 90%)'
          : 'rgba(196, 214, 230, 0.03)',
        color: accent ? 'var(--admin-brass-hi)' : 'var(--admin-text-mute)',
        boxShadow: 'inset 0 1px 0 var(--admin-sheen)',
      }}
    >
      <Icone size={15} />
    </span>
    <span className="min-w-0">
      <span
        className="block font-sans tabular-nums leading-none"
        style={{ fontSize: 21, fontWeight: 600, color: 'var(--admin-text)' }}
      >
        {valeur}
      </span>
      <span
        className="block font-sans uppercase tracking-[0.24em] mt-1.5"
        style={{ fontSize: 9, color: 'var(--admin-text-mute)' }}
      >
        {libelle}
      </span>
    </span>
  </div>
);

/** Un onglet du rail des catégories. Le compte reste visible même quand
 *  l'onglet dort : c'est lui qui dit où chercher. */
const Onglet: React.FC<{
  actif: boolean; libelle: string; compte: number; onClick: () => void;
}> = ({ actif, libelle, compte, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={actif}
    className="px-3.5 py-2 font-sans transition-colors"
    style={{
      borderRadius: 10,
      fontSize: 12,
      letterSpacing: '0.06em',
      border: `1px solid ${actif ? 'var(--admin-accent-line)' : 'var(--admin-line)'}`,
      background: actif
        ? 'color-mix(in oklab, var(--admin-accent), transparent 88%)'
        : 'rgba(4, 8, 12, 0.42)',
      color: actif ? 'var(--admin-brass-hi)' : 'var(--admin-text-soft)',
      boxShadow: actif ? 'inset 0 1px 0 var(--admin-lit)' : 'inset 0 1px 0 var(--admin-sheen)',
    }}
  >
    {libelle}
    <span className="ml-2 tabular-nums" style={{ color: 'var(--admin-text-mute)' }}>{compte}</span>
  </button>
);

/** Une bascule de filtre, du même métal que les onglets. */
const Bascule: React.FC<{
  actif: boolean; children: React.ReactNode; onClick: () => void; titre?: string;
}> = ({ actif, children, onClick, titre }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={actif}
    title={titre}
    className="inline-flex items-center gap-2 px-3 py-2 font-sans transition-colors"
    style={{
      borderRadius: 9,
      fontSize: 12,
      border: `1px solid ${actif ? 'var(--admin-accent-line)' : 'var(--admin-line)'}`,
      background: actif
        ? 'color-mix(in oklab, var(--admin-accent), transparent 88%)'
        : 'rgba(4, 8, 12, 0.42)',
      color: actif ? 'var(--admin-brass-hi)' : 'var(--admin-text-soft)',
    }}
  >
    {children}
  </button>
);

const ClientsSection: React.FC = () => {
  const [clients, setClients]   = useState<Client[]>([]);
  const [comptes, setComptes]   = useState<Map<string, string>>(new Map());
  /** Faux tant que la liste des comptes n'a pas été lue pour de bon. */
  const [comptesLus, setComptesLus] = useState(false);
  const [registre, setRegistre] = useState<Set<string>>(new Set());
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [annee, setAnnee]         = useState<FiltreAnnee>('toutes');
  const [categorie, setCategorie] = useState<FiltreCategorie>('toutes');
  const [terme, setTerme]         = useState('');
  const [nouveauxSeulement, setNouveauxSeulement] = useState(false);
  const [confirmesSeulement, setConfirmesSeulement] = useState(true);
  const [aInviterSeulement, setAInviterSeulement] = useState(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        // Trois lectures d'un coup : le registre, les comptes du site et
        // les fiches de l'Ordre. Les deux dernières servent seulement à
        // savoir qui est déjà des nôtres.
        const [lesClients, lesComptes, lesMembres] = await Promise.all([
          listerClients(),
          listerComptes().catch(() => null),
          listerMembres(3000, true).catch(() => []),
        ]);
        if (annule) return;
        setClients(lesClients);
        if (lesComptes) { setComptes(lesComptes); setComptesLus(true); }
        setRegistre(new Set(lesMembres.map((m) => m.uid)));
      } catch (e) {
        console.warn('[ClientsSection] lecture impossible', e);
        if (!annule) setErreur('La base a refusé la lecture du registre. Vérifie que ton courriel est bien dans l’équipe.');
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => { annule = true; };
  }, []);

  const annees = useMemo(() => anneesDuRegistre(clients), [clients]);
  const anneeReference = annees[0] ?? new Date().getFullYear();

  /** Les courriels qui ont pris quelque chose l'année de référence. */
  const dejaRevenus = useMemo(
    () => courrielsDeLAnnee(clients, anneeReference),
    [clients, anneeReference],
  );

  const lienDe = useMemo(() => (c: Client): Lien => {
    if (!comptesLus) return 'inconnu';
    const uid = comptes.get(c.courriel);
    if (!uid) return 'inviter';
    return registre.has(uid) ? 'registre' : 'compte';
  }, [comptes, comptesLus, registre]);

  /** Tout sauf le filtre de catégorie : c'est ce tas qui alimente les
   *  compteurs du rail, sans quoi chaque onglet afficherait son propre
   *  compte et le rail deviendrait aveugle. */
  const avantCategorie = useMemo(() => {
    let liste = clients;
    if (typeof annee === 'number') liste = liste.filter((c) => c.annee === annee);
    if (confirmesSeulement) liste = liste.filter((c) => c.statut !== 'annule');
    if (nouveauxSeulement) liste = liste.filter((c) => !dejaRevenus.has(c.courriel));
    if (aInviterSeulement) liste = liste.filter((c) => lienDe(c) === 'inviter');
    return filtrerClients(liste, terme);
  }, [clients, annee, confirmesSeulement, nouveauxSeulement, aInviterSeulement, terme, dejaRevenus, lienDe]);

  const visibles = useMemo(
    () => (categorie === 'toutes' ? avantCategorie : avantCategorie.filter((c) => c.categorie === categorie))
      .slice()
      .sort((a, b) => b.annee - a.annee || a.nom.localeCompare(b.nom, 'fr')),
    [avantCategorie, categorie],
  );

  const sansCompte = visibles.filter((c) => lienDe(c) === 'inviter').length;
  const aRelancer = visibles.filter((c) => !dejaRevenus.has(c.courriel)).length;
  const presumees = anneesPresumees(clients).length;

  const exporter = () => {
    const morceaux = [
      'fmm-clients',
      annee === 'toutes' ? null : String(annee),
      categorie === 'toutes' ? null : categorie,
      nouveauxSeulement ? `absents-${anneeReference}` : null,
      aInviterSeulement ? 'a-inviter' : null,
    ].filter(Boolean);
    downloadCsv(`${morceaux.join('-')}.csv`, visibles.map((c) => ({
      nom: c.nom,
      courriel: c.courriel,
      telephone: c.telephone || '',
      annee: c.annee,
      annee_source: c.anneeSource ?? '',
      categorie: LIBELLE_CATEGORIE[c.categorie],
      edition: c.edition || '',
      detail: c.detail,
      quantite: c.quantite,
      montant: c.montant ?? '',
      deja_venu: c.dejaVenu === true ? 'oui' : c.dejaVenu === false ? 'non' : '',
      municipalite: c.municipalite || '',
      entendu_parler: c.source || '',
      statut: c.statut === 'annule' ? 'annulée' : 'confirmée',
      compte_sur_le_site: LIEN_LIBELLE[lienDe(c)],
    })));
  };

  if (chargement) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: 'var(--admin-text-mute)' }}>
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {erreur && (
        <Card className="p-4">
          <p className="font-sans text-sm flex items-center gap-2.5" style={{ color: '#FCA5B0' }}>
            <TriangleAlert size={15} className="shrink-0" /> {erreur}
          </p>
        </Card>
      )}

      {/* ── Le bandeau ─────────────────────────────────────────────
          Ce que la page vaut en un coup d'œil, avant les filtres. */}
      <Card className="px-5 py-5 sm:px-6">
        <p className="admin-prose">
          Tout ce que le festival a vendu, une personne par ligne. Quelqu’un qui a pris douze billets
          tient sur une seule ligne, avec douze au compteur. Sers-toi du filtre <strong>absents de
          {' '}{anneeReference}</strong> pour trouver qui inviter sans réécrire à ceux qui sont déjà revenus.
        </p>
        <div className="admin-seam mt-5 mb-5" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-4">
          <Compteur valeur={visibles.length} libelle="personnes affichées" icone={Users} accent />
          <Compteur valeur={aRelancer} libelle={`absentes de ${anneeReference}`} icone={CalendarClock} />
          <Compteur
            valeur={comptesLus ? sansCompte : '—'}
            libelle="sans compte sur le site"
            icone={UserPlus}
          />
          <Compteur valeur={clients.length} libelle="dans le registre entier" icone={Sparkles} />
        </div>
        {!comptesLus && (
          <p className="font-sans text-[11px] mt-5 flex items-center gap-2" style={{ color: '#E0BE6A' }}>
            <TriangleAlert size={13} className="shrink-0" />
            La liste des comptes du site n’a pas pu se lire. Personne n’est marqué « à inviter » tant
            {' '}que ce n’est pas réglé, pour t’éviter d’écrire à des gens déjà inscrits.
          </p>
        )}
        {presumees > 0 && (
          <p className="font-sans text-[11px] mt-5 flex items-center gap-2" style={{ color: '#E0BE6A' }}>
            <MailQuestion size={13} className="shrink-0" />
            {presumees} fiches portent l’année {ANNEE_PRESUMEE} par présomption : leur export ne datait
            {' '}rien. Elles se reconnaissent à la mention « présumée » sous le nom.
          </p>
        )}
      </Card>

      {/* ── Le rail des catégories ─────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Onglet
          actif={categorie === 'toutes'}
          libelle="Toutes"
          compte={avantCategorie.length}
          onClick={() => setCategorie('toutes')}
        />
        {CATEGORIES_CLIENT.map((cat) => (
          <Onglet
            key={cat}
            actif={categorie === cat}
            libelle={LIBELLE_CATEGORIE[cat]}
            compte={avantCategorie.filter((c) => c.categorie === cat).length}
            onClick={() => setCategorie(cat)}
          />
        ))}
      </div>

      {/* ── Les filtres ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--admin-text-mute)' }}
          />
          <input
            value={terme}
            onChange={(e) => setTerme(e.target.value)}
            placeholder="Chercher un nom ou un courriel…"
            className="admin-input"
            style={{ paddingLeft: '2.2rem' }}
            aria-label="Chercher un nom ou un courriel"
          />
        </div>

        <select
          value={String(annee)}
          onChange={(e) => {
            const v = e.target.value;
            setAnnee(v === 'toutes' ? 'toutes' : Number(v));
          }}
          className="admin-input"
          style={{ width: 'auto', minWidth: 168 }}
          aria-label="Année"
        >
          <option value="toutes">Toutes les années</option>
          {annees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <Bascule
          actif={nouveauxSeulement}
          onClick={() => setNouveauxSeulement((v) => !v)}
          titre={`Ne garde que les personnes dont le courriel n’apparaît nulle part en ${anneeReference}`}
        >
          <CalendarClock size={13} /> Absents de {anneeReference}
        </Bascule>

        {comptesLus && (
          <Bascule
            actif={aInviterSeulement}
            onClick={() => setAInviterSeulement((v) => !v)}
            titre="Ne garde que les personnes sans compte sur le site"
          >
            <UserPlus size={13} /> Sans compte
          </Bascule>
        )}

        <Bascule
          actif={confirmesSeulement}
          onClick={() => setConfirmesSeulement((v) => !v)}
          titre="Écarte les commandes annulées et les paiements qui n’ont pas abouti"
        >
          <CircleCheck size={13} /> Confirmés
        </Bascule>

        <GhostButton onClick={exporter} disabled={visibles.length === 0}>
          <Download size={12} /> Exporter ({visibles.length})
        </GhostButton>
      </div>

      {/* ── La liste ───────────────────────────────────────────── */}
      {visibles.length === 0 ? (
        <Card className="px-5">
          <EmptyState icon={Users}>
            Personne ne répond à ces filtres. Élargis l’année ou vide la recherche.
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* En-tête de colonnes, sur les grands écrans seulement : en
              dessous, chaque ligne se lit comme une petite fiche. */}
          <div
            className="hidden lg:grid px-5 py-2.5 admin-seam font-sans uppercase tracking-[0.24em]"
            style={{
              gridTemplateColumns: '2.2fr 1fr 1.7fr 0.8fr 0.9fr',
              gap: '1rem', fontSize: 9, color: 'var(--admin-text-mute)',
            }}
          >
            <span>Personne</span>
            <span>Téléphone</span>
            <span>Ce qu’elle a pris</span>
            <span>Déjà venue</span>
            <span>Sur le site</span>
          </div>

          {visibles.map((c, i) => {
            const lien = lienDe(c);
            const [un, plusieurs] = UNITE_CATEGORIE[c.categorie];
            return (
              <div
                key={c.id}
                className="px-5 py-3.5 lg:grid lg:items-center transition-colors"
                style={{
                  gridTemplateColumns: '2.2fr 1fr 1.7fr 0.8fr 0.9fr',
                  gap: '1rem',
                  borderTop: i === 0 ? 'none' : '1px solid var(--admin-line-soft)',
                  background: c.statut === 'annule' ? 'rgba(252, 165, 176, 0.035)' : undefined,
                }}
              >
                {/* Nom, courriel, et de quelle année vient la ligne. */}
                <div className="min-w-0">
                  <p className="font-sans truncate" style={{ fontSize: 14, color: 'var(--admin-text)' }}>
                    {c.nom || 'Sans nom'}
                  </p>
                  <a
                    href={`mailto:${c.courriel}`}
                    className="font-sans truncate block hover:underline"
                    style={{ fontSize: 12, color: 'var(--admin-text-soft)' }}
                  >
                    {c.courriel}
                  </a>
                  <p className="mt-1 flex items-center gap-1.5 flex-wrap font-sans" style={{ fontSize: 10.5, color: 'var(--admin-text-mute)' }}>
                    <span style={{ color: 'var(--admin-brass-hi)' }}>{c.annee}</span>
                    {c.anneeSource === 'defaut-2024' && (
                      <span
                        title={`L’export ne portait aucune date. ${ANNEE_PRESUMEE} par présomption.`}
                        style={{ color: '#E0BE6A' }}
                      >
                        présumée
                      </span>
                    )}
                    <span aria-hidden>·</span>
                    <span>{LIBELLE_CATEGORIE[c.categorie]}</span>
                    {c.edition && (<><span aria-hidden>·</span><span>{c.edition}</span></>)}
                    {c.municipalite && (<><span aria-hidden>·</span><span className="truncate">{c.municipalite}</span></>)}
                  </p>
                </div>

                {/* Téléphone. */}
                <div className="min-w-0 mt-2 lg:mt-0">
                  {c.telephone ? (
                    <a
                      href={`tel:${c.telephone}`}
                      className="font-sans inline-flex items-center gap-1.5 tabular-nums hover:underline"
                      style={{ fontSize: 12, color: 'var(--admin-text-soft)' }}
                    >
                      <Phone size={11} className="shrink-0 lg:hidden" />
                      {c.telephone}
                    </a>
                  ) : (
                    <span className="font-sans" style={{ fontSize: 12, color: 'var(--admin-text-mute)' }}>—</span>
                  )}
                </div>

                {/* Le détail de la catégorie. */}
                <div className="min-w-0 mt-2 lg:mt-0">
                  <p className="font-sans" style={{ fontSize: 12, color: 'var(--admin-text-soft)' }}>
                    {c.detail || '—'}
                  </p>
                  {c.quantite > 0 && (
                    <p className="font-sans mt-0.5" style={{ fontSize: 10.5, color: 'var(--admin-text-mute)' }}>
                      {c.quantite} {c.quantite > 1 ? plusieurs : un}
                      {c.statut === 'annule' && ' · commande annulée'}
                    </p>
                  )}
                  {c.quantite === 0 && c.statut === 'annule' && (
                    <p className="font-sans mt-0.5" style={{ fontSize: 10.5, color: '#FCA5B0' }}>
                      commande annulée
                    </p>
                  )}
                </div>

                {/* Déjà venue au festival. */}
                <div className="mt-2 lg:mt-0">
                  {c.dejaVenu === true && <Badge tone="accepted">Déjà venue</Badge>}
                  {c.dejaVenu === false && <Badge tone="neutral">Première fois</Badge>}
                  {c.dejaVenu == null && (
                    <span className="font-sans" style={{ fontSize: 12, color: 'var(--admin-text-mute)' }}>—</span>
                  )}
                </div>

                {/* Le pont vers la messagerie de l'équipe. */}
                <div className="mt-2 lg:mt-0">
                  <span
                    title={
                      lien === 'registre' ? 'Elle a un compte et une fiche : Écrire aux membres la rejoint.'
                      : lien === 'compte' ? 'Elle a un compte, mais pas encore de fiche dans le registre.'
                      : lien === 'inconnu' ? 'La liste des comptes n’a pas pu se lire. Rien ne dit encore si elle en a un.'
                      : 'Aucun compte sur le site. À inviter à s’en créer un.'
                    }
                    className="inline-flex"
                  >
                    <Badge tone={LIEN_TON[lien]}>
                      {lien === 'registre' || lien === 'compte'
                        ? <CircleCheck size={10} />
                        : <CircleSlash size={10} />}
                      <span className="ml-1.5">{LIEN_LIBELLE[lien]}</span>
                    </Badge>
                  </span>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
};

export default ClientsSection;
