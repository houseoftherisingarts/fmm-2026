import React from 'react';
import { BarChart3, Eye, Users, MousePointerClick, ExternalLink } from 'lucide-react';
import { Card } from '../primitives';
import { mockSubs, mockUsers } from '../../../firebase/mockData';
import { mockListBenevoles, mockListVendors } from '../../../firebase/mockApplications';
import { listBenevoles, listVendors } from '../../../firebase/applications';
import { listSubs } from '../../../firebase/newsletter';
import { listUsers } from '../../../firebase/users';
import { useEffect, useState } from 'react';

interface Props { devBypass: boolean }

const AnalyticsSection: React.FC<Props> = ({ devBypass }) => {
  const [bCount, setBCount]       = useState(0);
  const [vCount, setVCount]       = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [subsCount, setSubsCount]   = useState(0);

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

  // 14-day visitor series — still mock until a GA4 Data API integration
  // (via a Cloud Function / service account) is wired. The site already
  // logs page views through firebase/analytics; this section only lacks
  // the read-side aggregation.
  const visitors14d = devBypass
    ? [120, 145, 180, 165, 210, 235, 190, 220, 280, 305, 340, 360, 395, 420]
    : Array(14).fill(0);

  const stats = [
    { label: 'Visiteurs (14 j)',     value: visitors14d.reduce((a, b) => a + b, 0).toLocaleString('fr-CA'), icon: Eye },
    { label: 'Comptes',              value: usersCount,            icon: Users },
    { label: 'Candidatures',         value: bCount + vCount,       icon: MousePointerClick },
    { label: 'Inscrits infolettre',  value: subsCount,             icon: BarChart3 },
  ];

  const max = Math.max(...visitors14d, 1);

  return (
    <div className="space-y-6">
      <Card className="p-5 border border-blue-300/30 bg-blue-300/5">
        <p className="font-editorial italic text-sm text-ivory-soft">
          Les compteurs Comptes, Candidatures et Infolettre sont câblés sur Firestore. Le graphique 14 jours « Visiteurs » et le palmarès « Pages les plus visitées » attendent une Cloud Function qui interroge la GA4 Data API (le tracking côté site, lui, est déjà actif via <code className="text-brass">AnalyticsPageViews</code>).
        </p>
      </Card>

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
