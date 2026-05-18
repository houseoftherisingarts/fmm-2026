import React, { useEffect, useState } from 'react';
import { Users, Mail, Phone, Languages, Download, HandHeart, ShoppingBag } from 'lucide-react';
import { Card, Badge, EmptyState, GhostButton, downloadCsv, fmtDate } from '../primitives';
import { listUsers, type AppUser } from '../../../firebase/users';
import { mockUsers } from '../../../firebase/mockData';

interface Props { devBypass: boolean }

const ComptesSection: React.FC<Props> = ({ devBypass }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'benevole' | 'vendor' | 'visitor'>('all');
  const [items,  setItems]  = useState<AppUser[]>([]);
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listUsers()
      .then((live) => {
        if (cancelled) return;
        if (live.length > 0) {
          setItems(live);
        } else if (devBypass) {
          setItems(mockUsers);
        }
      })
      .catch((err) => {
        console.warn('[ComptesSection] listUsers failed:', err);
        if (cancelled) return;
        setError('Impossible de charger les comptes depuis Firestore.');
        if (devBypass) setItems(mockUsers);
      });
    return () => { cancelled = true; };
  }, [devBypass]);

  const filtered = items.filter((u) => {
    const matchSearch = search === '' || `${u.displayName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'benevole' && u.hasBenevoleApp) ||
      (filter === 'vendor'   && u.hasVendorApp) ||
      (filter === 'visitor'  && !u.hasBenevoleApp && !u.hasVendorApp);
    return matchSearch && matchFilter;
  });

  const exportCsv = () => downloadCsv('fmm-comptes.csv', items.map((u) => ({
    nom: u.displayName, email: u.email, telephone: u.phone || '',
    langue: u.lang || '', benevole: u.hasBenevoleApp ? 'oui' : 'non', marchand: u.hasVendorApp ? 'oui' : 'non',
    cree: fmtDate(u.createdAt),
  })));

  return (
    <div className="space-y-5">
      {error && (
        <Card className="p-5 border border-blush/30 bg-blush/5">
          <p className="font-editorial italic text-sm text-ivory-soft">{error}</p>
        </Card>
      )}

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <p className="font-editorial italic text-sm text-ivory-soft">
          {filtered.length} compte{filtered.length > 1 ? 's' : ''}
          {filter !== 'all' && ` (sur ${items.length})`}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche…"
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
          {([
            ['all',      'Tous'],
            ['benevole', 'Bénévoles'],
            ['vendor',   'Marchands'],
            ['visitor',  'Visiteurs'],
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
        <Card><EmptyState icon={Users}>Aucun compte ne correspond.</EmptyState></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <Card key={u.uid} className="p-5 grid md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-1">
                <div className="w-10 h-10 rounded-card bg-brass/15 border border-brass/40 flex items-center justify-center text-brass font-display title-medieval text-sm">
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="md:col-span-4 min-w-0">
                <p className="font-display title-medieval text-sm text-ivory truncate">{u.displayName}</p>
                <p className="font-editorial italic text-xs text-ivory-soft/70 truncate flex items-center gap-1.5">
                  <Mail size={10} className="text-brass" />{u.email}
                </p>
              </div>
              <div className="md:col-span-3 min-w-0 space-y-1">
                {u.phone && <p className="font-sans text-xs text-ivory-soft/80 flex items-center gap-1.5"><Phone size={10} className="text-brass" />{u.phone}</p>}
                {u.lang && <p className="font-sans text-xs text-ivory-soft/80 flex items-center gap-1.5"><Languages size={10} className="text-brass" />{u.lang}</p>}
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-1.5">
                {u.hasBenevoleApp && <Badge tone="info"><HandHeart size={10} className="inline mr-1 -mt-0.5" />Bénévole</Badge>}
                {u.hasVendorApp   && <Badge tone="info"><ShoppingBag size={10} className="inline mr-1 -mt-0.5" />Marchand</Badge>}
                {!u.hasBenevoleApp && !u.hasVendorApp && <Badge>Visiteur</Badge>}
              </div>
              <div className="md:col-span-2 text-right">
                <p className="font-editorial italic text-xs text-ivory-soft/60">Inscrit le</p>
                <p className="font-sans text-xs text-ivory">{fmtDate(u.createdAt)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComptesSection;
