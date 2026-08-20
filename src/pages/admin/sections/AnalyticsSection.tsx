import React from 'react';
import { BarChart3, Eye, Users, MousePointerClick, ExternalLink } from 'lucide-react';
import { Card } from '../primitives';
import { mockSubs, mockUsers } from '../../../firebase/mockData';
import { mockListBenevoles, mockListVendors } from '../../../firebase/mockApplications';
import { listBenevoles, listVendors } from '../../../firebase/applications';
import { listSubs } from '../../../firebase/newsletter';
import { listUsers } from '../../../firebase/users';
import { getDailyStats, slugToPath, type DayStats } from '../../../lib/siteStats';
import { useEffect, useState } from 'react';

interface Props { devBypass: boolean }

const AnalyticsSection: React.FC<Props> = ({ devBypass }) => {
  const [bCount, setBCount]       = useState(0);
  const [vCount, setVCount]       = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [subsCount, setSubsCount]   = useState(0);
  const [daily, setDaily]           = useState<DayStats[]>([]);

  // Compteurs de visites first-party (siteStats/AAAA-MM-JJ), alimentés
  // par bumpPageView() sur chaque changement de route du site public.
  useEffect(() => {
    let cancelled = false;
    getDailyStats(14).then((d) => { if (!cancelled) setDaily(d); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bens, vens, users, subs] = await Promise.all([
          listBenevoles().catch(() => [] as Awaited<ReturnType<typeof listBenevoles>>),
          listVendors().catch(() => [] as Awaited<ReturnType<typeof listVendors>>),
          listUsers().catch(() => [] as Awaited<ReturnType<typeof listUsers>>),
          listSubs().catch(() => [] as Awaited<ReturnType<typeof listSubs>>),
        ]);
        if (cancelled) return;
        if (devBypass && bens.length + vens.length + users.length + subs.length === 0) {
          // Fall back to mock showcase numbers so the section isn't empty in
          // dev when Firestore is unreachable.
          const [mb, mv] = await Promise.all([mockListBenevoles(), mockListVendors()]);
          if (cancelled) return;
          setBCount(mb.length);
          setVCount(mv.length);
          setUsersCount(mockUsers.length);
          setSubsCount(mockSubs.filter((s) => !s.unsubscribed).length);
          return;
        }
        setBCount(bens.length);
        setVCount(vens.length);
        setUsersCount(users.length);
        setSubsCount(subs.filter((s) => !s.unsubscribed).length);
      } catch (e) {
        console.warn('[analytics] fetch failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [devBypass]);

  // Série 14 jours réelle, lue des compteurs Firestore siteStats.
  // En dev sans données, on garde la série de démonstration.
  const visitors14d = daily.length > 0 && !devBypass
    ? daily.map((d) => d.total)
    : devBypass
      ? [120, 145, 180, 165, 210, 235, 190, 220, 280, 305, 340, 360, 395, 420]
      : Array(14).fill(0);

  // Palmarès des pages, agrégé sur les 14 jours.
  const pageTotals: Record<string, number> = {};
  for (const d of daily) {
    for (const [slug, n] of Object.entries(d.pages)) {
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

  const stats = [
    { label: 'Visiteurs (14 j)',     value: visitors14d.reduce((a, b) => a + b, 0).toLocaleString('fr-CA'), icon: Eye },
    { label: 'Comptes',              value: usersCount,            icon: Users },
    { label: 'Candidatures',         value: bCount + vCount,       icon: MousePointerClick },
    { label: 'Inscrits infolettre',  value: subsCount,             icon: BarChart3 },
  ];

  const max = Math.max(...visitors14d, 1);

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <Icon size={20} className="text-brass mb-3" />
            <p className="font-display title-medieval text-2xl md:text-3xl text-ivory">{value}</p>
            <p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">{label}</p>
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
        <div className="flex items-end gap-1.5 h-32">
          {visitors14d.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
              <div className="w-full bg-brass/30 hover:bg-brass transition rounded-t" style={{ height: `${(v / max) * 100}%` }} title={`Jour J-${13 - i} : ${v} visiteurs`} />
              <span className="font-sans text-[9px] text-ivory-soft/50">{i % 2 === 0 ? `J-${13 - i}` : ''}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Top pages (mock) */}
      <Card className="p-6">
        <h3 className="font-display title-medieval text-sm text-brass uppercase tracking-widest mb-5">Pages les plus visitées</h3>
        {devBypass ? (
          <ul className="space-y-2">
            {[
              { page: '/',           pct: 38 },
              { page: '/activites',  pct: 22 },
              { page: '/nourriture', pct: 14 },
              { page: '/musique',    pct: 11 },
              { page: '/marche',     pct: 8 },
              { page: '/benevole',   pct: 5 },
              { page: '/histoire',   pct: 2 },
            ].map((p) => (
              <li key={p.page}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-sans text-ivory">{p.page}</span>
                  <span className="font-display title-medieval text-brass tabular-nums text-xs">{p.pct}%</span>
                </div>
                <div className="h-1.5 bg-ivory-soft/10 rounded-full overflow-hidden">
                  <div className="h-full bg-brass" style={{ width: `${p.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-editorial italic text-sm text-ivory-soft/60">À venir une fois Firebase Analytics configuré.</p>
        )}
      </Card>
    </div>
  );
};

export default AnalyticsSection;
