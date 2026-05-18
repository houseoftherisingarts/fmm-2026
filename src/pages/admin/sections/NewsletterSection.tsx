import React, { useEffect, useState } from 'react';
import { Mail, Download, Languages, Trash2 } from 'lucide-react';
import { Card, Badge, EmptyState, GhostButton, downloadCsv, fmtDate } from '../primitives';
import { mockSubs, type MockSub } from '../../../firebase/mockData';
import { listSubs, deleteSub, type NewsletterSub } from '../../../firebase/newsletter';

interface Props { devBypass: boolean }

type Sub = MockSub | NewsletterSub;

const NewsletterSection: React.FC<Props> = ({ devBypass }) => {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<'active' | 'unsubscribed' | 'all'>('active');
  const [subs, setSubs]       = useState<Sub[]>([]);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await listSubs();
        if (cancelled) return;
        if (live.length === 0 && devBypass) {
          setSubs(mockSubs);
        } else {
          setSubs(live);
        }
      } catch (e) {
        console.warn('[newsletter] list failed', e);
        if (cancelled) return;
        if (devBypass) setSubs(mockSubs);
        else setError('Impossible de charger les abonnés.');
      }
    })();
    return () => { cancelled = true; };
  }, [devBypass]);

  const filtered = subs.filter((s) => {
    const matchSearch = search === '' || s.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'active'       && !s.unsubscribed) ||
      (filter === 'unsubscribed' &&  s.unsubscribed);
    return matchSearch && matchFilter;
  });

  const removeSub = async (id: string) => {
    if (!confirm('Supprimer cet abonné ?')) return;
    const prevList = subs;
    setSubs((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSub(id);
    } catch (e) {
      console.warn('[newsletter] delete failed', e);
      setSubs(prevList);
      setError('Échec de la suppression — réessayez.');
    }
  };

  const exportCsv = () => downloadCsv('fmm-infolettre.csv', subs.map((s) => ({
    email: s.email, langue: s.lang, source: s.source, abonnement: fmtDate(s.subscribedAt),
    statut: s.unsubscribed ? 'desabonne' : 'actif',
  })));

  const langCount = { FR: subs.filter((s) => s.lang === 'FR' && !s.unsubscribed).length, EN: subs.filter((s) => s.lang === 'EN' && !s.unsubscribed).length };

  return (
    <div className="space-y-5">
      {error && (
        <Card className="p-4 border border-blush/40 bg-blush/10">
          <p className="font-sans text-sm text-blush">{error}</p>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-ivory">{subs.filter((s) => !s.unsubscribed).length}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">Actifs</p></Card>
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-ivory">{subs.filter((s) => s.unsubscribed).length}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">Désabonnés</p></Card>
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-brass">{langCount.FR}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">FR</p></Card>
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-brass">{langCount.EN}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">EN</p></Card>
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <p className="font-editorial italic text-sm text-ivory-soft">{filtered.length} abonné{filtered.length > 1 ? 's' : ''} affichés</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche…"
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
          {([
            ['active',       'Actifs'],
            ['unsubscribed', 'Désabonnés'],
            ['all',          'Tous'],
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${filter === k ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'}`}>
              {label}
            </button>
          ))}
          <GhostButton onClick={exportCsv}><Download size={12} /> CSV</GhostButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState icon={Mail}>Aucun abonné trouvé.</EmptyState></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-midnight-deep/50 border-b border-ivory-soft/15">
              <tr>
                <th className="text-left px-4 md:px-5 py-3 font-display title-medieval text-xs text-brass">Courriel</th>
                <th className="text-left px-4 py-3 font-display title-medieval text-xs text-brass hidden md:table-cell">Source</th>
                <th className="text-left px-4 py-3 font-display title-medieval text-xs text-brass hidden md:table-cell">Langue</th>
                <th className="text-left px-4 py-3 font-display title-medieval text-xs text-brass hidden lg:table-cell">Abonnement</th>
                <th className="text-right px-4 md:px-5 py-3 font-display title-medieval text-xs text-brass">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-ivory-soft/10 last:border-0 hover:bg-brass/5 transition">
                  <td className="px-4 md:px-5 py-3 font-sans text-sm text-ivory">
                    <span className="flex items-center gap-2">
                      {s.email}
                      {s.unsubscribed && <Badge tone="rejected">Désabonné</Badge>}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-editorial italic text-xs text-ivory-soft hidden md:table-cell">{s.source}</td>
                  <td className="px-4 py-3 font-sans text-xs hidden md:table-cell">
                    <span className="inline-flex items-center gap-1 text-ivory-soft"><Languages size={10} className="text-brass" />{s.lang}</span>
                  </td>
                  <td className="px-4 py-3 font-sans text-xs text-ivory-soft hidden lg:table-cell">{fmtDate(s.subscribedAt)}</td>
                  <td className="px-4 md:px-5 py-3 text-right">
                    <button onClick={() => removeSub(s.id)} className="text-ivory-soft hover:text-blush transition" aria-label="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default NewsletterSection;
