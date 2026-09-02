import React from 'react';
import { BarChart3, Eye, Users, MousePointerClick, ExternalLink, Target } from 'lucide-react';
import { Card } from '../primitives';
import { mockSubs, mockUsers } from '../../../firebase/mockData';
import { mockListBenevoles, mockListVendors } from '../../../firebase/mockApplications';
import { listBenevoles, listVendors, CURRENT_YEAR } from '../../../firebase/applications';
import { listSubs } from '../../../firebase/newsletter';
import { listUsers } from '../../../firebase/users';
import { getDailyStats, suivreJourCourant, slugToPath, type DayStats } from '../../../lib/siteStats';
import type { AdminSectionId } from '../AdminShell';
import { useEffect, useState } from 'react';

interface Props { devBypass: boolean; onNavigate: (s: AdminSectionId) => void }

const SOURCE_LABELS: Record<string, string> = {
  google: 'Google', facebook: 'Facebook', direct: 'Direct', autre: 'Autre',
};
const JEU_LABELS: Record<string, string> = {
  des: 'Dés', hnefatafl: 'Hnefatafl', tarot: 'Tarot',
};

// Le jour où le compteur a commencé à lire le référent du navigateur en
// plus de l'étiquette utm. Avant cette date, une visite venue d'une
// recherche Google tombait dans « Direct ». Cette note peut disparaître
// quand la fenêtre de quatorze jours ne contiendra plus rien d'avant,
// soit à partir du 16 septembre 2026.
const DEBUT_LECTURE_REFERENT = '2026-09-02';

// Série de démonstration, réservée au développement quand Firestore ne
// rend rien du tout. Elle ne doit jamais s'afficher sans être nommée.
const SERIE_DEMO = [120, 145, 180, 165, 210, 235, 190, 220, 280, 305, 340, 360, 395, 420];

const heure = (d: Date) => d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const AnalyticsSection: React.FC<Props> = ({ devBypass, onNavigate }) => {
  const [bCount, setBCount]         = useState<number | null>(0);
  const [vCount, setVCount]         = useState<number | null>(0);
  const [usersCount, setUsersCount] = useState<number | null>(0);
  const [subsCount, setSubsCount]   = useState<number | null>(0);
  const [daily, setDaily]           = useState<DayStats[]>([]);
  const [erreurVisites, setErreurVisites] = useState(false);
  const [releveA, setReleveA]       = useState<Date | null>(null);
  const [enDirect, setEnDirect]     = useState(false);

  // Compteurs de visites first-party (siteStats/AAAA-MM-JJ), alimentés
  // par bumpPageView() sur chaque changement de route du site public.
  // Les treize journées closes se lisent une fois; celle d'aujourd'hui
  // reste branchée sur Firestore et se met à jour toute seule.
  useEffect(() => {
    let cancelled = false;
    getDailyStats(14)
      .then((d) => {
        if (cancelled) return;
        setDaily(d);
        setErreurVisites(false);
        setReleveA(new Date());
      })
      .catch(() => { if (!cancelled) setErreurVisites(true); });

    const stop = suivreJourCourant((jour) => {
      if (cancelled) return;
      setEnDirect(true);
      setReleveA(new Date());
      setDaily((prev) => (prev.length === 0
        ? prev
        : prev.map((d) => (d.day === jour.day ? jour : d))));
    });
    return () => { cancelled = true; stop(); };
  }, []);

  // Les quatre compteurs de tête. Chaque lecture est isolée : un accès
  // refusé sur une collection doit s'afficher comme « non lu », jamais
  // comme un zéro qu'on prendrait pour un vrai résultat.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lire = async <T,>(p: Promise<T[]>): Promise<T[] | null> => p.catch(() => null);
      const [bens, vens, users, subs] = await Promise.all([
        lire(listBenevoles()), lire(listVendors()), lire(listUsers()), lire(listSubs()),
      ]);
      if (cancelled) return;

      const vensAnnee = vens?.filter((v) => v.year === CURRENT_YEAR) ?? null;
      const vide = (bens?.length ?? 0) + (vensAnnee?.length ?? 0)
        + (users?.length ?? 0) + (subs?.length ?? 0) === 0;

      if (devBypass && vide) {
        // En développement seulement, quand Firestore ne rend rien :
        // les jeux de démonstration évitent une section vide.
        const [mb, mv] = await Promise.all([mockListBenevoles(), mockListVendors()]);
        if (cancelled) return;
        setBCount(mb.length);
        setVCount(mv.length);
        setUsersCount(mockUsers.length);
        setSubsCount(mockSubs.filter((s) => !s.unsubscribed).length);
        return;
      }
      setBCount(bens ? bens.length : null);
      setVCount(vensAnnee ? vensAnnee.length : null);
      setUsersCount(users ? users.length : null);
      setSubsCount(subs ? subs.filter((s) => !s.unsubscribed).length : null);
    })();
    return () => { cancelled = true; };
  }, [devBypass]);

  // La série réelle prime toujours. Les chiffres de démonstration ne
  // servent qu'au développement, et seulement si la base ne rend rien.
  const serieReelle = daily.map((d) => d.total);
  const aDesVisites = serieReelle.some((n) => n > 0);
  const serieEstUneDemo = !aDesVisites && devBypass;
  const visitors14d = aDesVisites ? serieReelle : serieEstUneDemo ? SERIE_DEMO : Array(14).fill(0);

  // Palmarès des pages, agrégé sur les quatorze jours. Les chemins de la
  // régie sont écartés : ce sont nos propres écrans, pas des visites.
  const pageTotals: Record<string, number> = {};
  for (const d of daily) {
    for (const [slug, n] of Object.entries(d.pages)) {
      if (slug.startsWith('_admin')) continue;
      pageTotals[slug] = (pageTotals[slug] || 0) + n;
    }
  }
  const grandTotal = Object.values(pageTotals).reduce((a, b) => a + b, 0);
  const topPages = Object.entries(pageTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([slug, n]) => ({
      page: slugToPath(slug),
      n,
      pct: grandTotal ? Math.round((n / grandTotal) * 100) : 0,
    }));

  const totalVisites = visitors14d.reduce((a, b) => a + b, 0);
  const candidatures = bCount === null && vCount === null ? null : (bCount ?? 0) + (vCount ?? 0);

  const stats: Array<{ label: string; value: number | null; icon: typeof Eye; note?: string }> = [
    { label: 'Pages vues (14 j)',   value: erreurVisites ? null : totalVisites, icon: Eye,
      note: serieEstUneDemo ? 'Démonstration' : undefined },
    { label: 'Comptes',             value: usersCount, icon: Users },
    { label: `Candidatures ${CURRENT_YEAR}`, value: candidatures, icon: MousePointerClick },
    { label: 'Inscrits infolettre', value: subsCount,  icon: BarChart3 },
  ];

  const max = Math.max(...visitors14d, 1);

  // Attribution par source, agrégée sur les quatorze jours. Une session
  // compte une seule fois, à sa première page : ces chiffres ne sont pas
  // comparables aux pages vues ci-dessus.
  const sourceTotals: Record<string, number> = { google: 0, facebook: 0, direct: 0, autre: 0 };
  for (const d of daily) {
    for (const [src, n] of Object.entries(d.sources || {})) {
      sourceTotals[src in sourceTotals ? src : 'autre'] += n;
    }
  }
  const sourceGrandTotal = Object.values(sourceTotals).reduce((a, b) => a + b, 0);
  const premierJourEtiquete = daily.find((d) => Object.keys(d.sources || {}).length > 0)?.day;
  const fenetreContientDuVieux = daily.some((d) => d.day < DEBUT_LECTURE_REFERENT
    && Object.keys(d.sources || {}).length > 0);

  // Publicité AdSense dans les jeux, agrégée sur les quatorze jours.
  const pubJeuxTotal = daily.reduce((a, d) => a + (d.pubJeux || 0), 0);
  const pubJeuxParJeu: Record<string, number> = {};
  for (const d of daily) {
    for (const [jeu, n] of Object.entries(d.pubJeuxParJeu || {})) {
      pubJeuxParJeu[jeu] = (pubJeuxParJeu[jeu] || 0) + n;
    }
  }
  const pubJeuxEntries = Object.entries(pubJeuxParJeu).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map(({ label, value, icon: Icon, note }) => (
          <Card key={label} className="p-5">
            <Icon size={20} className="text-brass mb-3" />
            <p className="font-display title-medieval text-2xl md:text-3xl text-ivory">
              {value === null ? '—' : value.toLocaleString('fr-CA')}
            </p>
            <p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">{label}</p>
            {value === null && (
              <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-2">Lecture refusée</p>
            )}
            {note && value !== null && (
              <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-2">{note}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Visitor sparkbars */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display title-medieval text-sm text-brass uppercase tracking-widest">Visiteurs · 14 derniers jours</h3>
          <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ivory-soft hover:text-brass transition font-sans">
            Firebase console <ExternalLink size={10} />
          </a>
        </div>
        {erreurVisites ? (
          <p className="font-editorial italic text-sm text-ivory-soft/60">
            Les compteurs de visites n'ont pas pu être lus. Rien ne s'affiche ici tant que la lecture échoue :
            un graphique à zéro laisserait croire à des journées creuses.
          </p>
        ) : (
          <>
            <div className="flex items-end gap-1.5 h-32">
              {visitors14d.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                  <div className="w-full bg-brass/30 hover:bg-brass transition rounded-t" style={{ height: `${(v / max) * 100}%` }} title={`${daily[i]?.day ?? `J-${13 - i}`} : ${v} pages vues`} />
                  <span className="font-sans text-[9px] text-ivory-soft/50">{i % 2 === 0 ? (daily[i]?.day.slice(5).replace('-', '/') ?? `J-${13 - i}`) : ''}</span>
                </div>
              ))}
            </div>
            <p className="font-editorial italic text-[11px] text-ivory-soft/50 mt-3">
              {serieEstUneDemo
                ? 'Série de démonstration : la base ne contient aucune visite pour cette fenêtre.'
                : `Pages vues par jour, compteur maison anonyme (Firestore), à l'heure du festival. Les journées d'avant l'installation restent à zéro.${enDirect ? ' La journée du jour se met à jour toute seule.' : ''}`}
            </p>
            {releveA && !serieEstUneDemo && (
              <p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft/40 mt-1">
                Relevé à {heure(releveA)}
              </p>
            )}
          </>
        )}
      </Card>

      {/* Palmarès des pages */}
      <Card className="p-6">
        <h3 className="font-display title-medieval text-sm text-brass uppercase tracking-widest mb-5">Pages les plus visitées</h3>
        {topPages.length > 0 ? (
          <>
            <ul className="space-y-2">
              {topPages.map((p) => (
                <li key={p.page}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-sans text-ivory">{p.page}</span>
                    <span className="font-display title-medieval text-brass tabular-nums text-xs">{p.n.toLocaleString('fr-CA')} · {p.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-ivory-soft/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brass" style={{ width: `${p.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="font-editorial italic text-[11px] text-ivory-soft/50 mt-4">
              Les pages de la régie sont écartées du palmarès, et le compteur ne les enregistre plus depuis le 2 septembre 2026.
              Le pourcentage se lit sur le total des pages publiques de la fenêtre.
            </p>
          </>
        ) : (
          <p className="font-editorial italic text-sm text-ivory-soft/60">Les premières visites rempliront ce palmarès d'ici quelques heures.</p>
        )}
      </Card>

      {/* Publicité : attribution par source + affichages dans les jeux */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display title-medieval text-sm text-brass uppercase tracking-widest">Publicité · 14 derniers jours</h3>
          <button onClick={() => onNavigate('pubs')}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ivory-soft hover:text-brass transition font-sans">
            Rapports <Target size={10} />
          </button>
        </div>

        <h4 className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mb-3">Sessions par source</h4>
        {sourceGrandTotal > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {Object.entries(sourceTotals).map(([src, n]) => (
                <div key={src} className="rounded-card border border-ivory-soft/10 bg-midnight-deep/40 p-4">
                  <p className="font-display title-medieval text-xl text-ivory tabular-nums">{n.toLocaleString('fr-CA')}</p>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">{SOURCE_LABELS[src]}</p>
                  <p className="font-sans text-[10px] text-ivory-soft/50 mt-0.5">{Math.round((n / sourceGrandTotal) * 100)}%</p>
                </div>
              ))}
            </div>
            <p className="font-editorial italic text-[11px] text-ivory-soft/50 mb-6">
              Une session compte une seule fois, à sa première page : ces chiffres ne s'additionnent pas aux pages vues.
              {premierJourEtiquete ? ` L'étiquetage commence le ${premierJourEtiquete} dans cette fenêtre.` : ''}
              {' '}« Direct » veut dire aucune étiquette utm et aucun référent.
              {fenetreContientDuVieux
                ? ' Les journées d\'avant le 2 septembre 2026 ne lisaient pas le référent : les visites venues d\'une recherche s\'y comptent encore comme directes.'
                : ''}
            </p>
          </>
        ) : (
          <p className="font-editorial italic text-sm text-ivory-soft/60 mb-6">Aucune session avec source identifiée sur la période.</p>
        )}

        <h4 className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mb-3">Pub AdSense dans les jeux</h4>
        {pubJeuxTotal > 0 ? (
          <>
            <p className="font-display title-medieval text-2xl text-ivory tabular-nums mb-3">
              {pubJeuxTotal.toLocaleString('fr-CA')}{' '}
              <span className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft align-middle">affichages</span>
            </p>
            <ul className="space-y-2">
              {pubJeuxEntries.map(([jeu, n]) => {
                const pct = Math.round((n / pubJeuxTotal) * 100);
                return (
                  <li key={jeu}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-sans text-ivory">{JEU_LABELS[jeu] || jeu}</span>
                      <span className="font-display title-medieval text-brass tabular-nums text-xs">{n.toLocaleString('fr-CA')} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-ivory-soft/10 rounded-full overflow-hidden">
                      <div className="h-full bg-brass" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="font-editorial italic text-sm text-ivory-soft/60">Aucun affichage tant que le bloc AdSense des jeux n'est pas approuvé.</p>
        )}
      </Card>
    </div>
  );
};

export default AnalyticsSection;
