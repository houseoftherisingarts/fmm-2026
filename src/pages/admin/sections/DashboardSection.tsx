import React, { useEffect, useState } from 'react';
import {
  HandHeart, ShoppingBag, Users, Mail, MessageSquare, ArrowUpRight,
  Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import type { AdminSectionId } from '../AdminShell';
import type { BenevoleApp, VendorApp } from '../../../firebase/applications';
import { listBenevoles, listVendors } from '../../../firebase/applications';
import { listSubs } from '../../../firebase/newsletter';
import { listInbox } from '../../../firebase/mail';
import type { MailMessage } from '../../../firebase/mail';
import { listUsers } from '../../../firebase/users';
import type { AppUser } from '../../../firebase/users';
import { mockListBenevoles, mockListVendors } from '../../../firebase/mockApplications';
import { mockSubs, mockMessages, mockUsers } from '../../../firebase/mockData';
import { DEPARTMENTS } from '../../../content/departments';
import { Card, Badge, fmtDate } from '../primitives';

// Flat message shape used by the dashboard preview (normalised from MailMessage)
interface DashMsg { id: string; from: string; subject: string; sentAt: unknown; read: boolean }

interface Props { onNavigate: (s: AdminSectionId) => void; devBypass: boolean }

const DashboardSection: React.FC<Props> = ({ onNavigate, devBypass }) => {
  const [benevoles, setBenevoles] = useState<BenevoleApp[]>([]);
  const [vendors,   setVendors]   = useState<VendorApp[]>([]);
  const [subs,      setSubs]      = useState<number>(0);
  const [messages,  setMessages]  = useState<DashMsg[]>([]);
  const [users,     setUsers]     = useState<AppUser[]>([]);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        // Always try live first
        const [liveBens, liveVens, liveSubs, liveUsers] = await Promise.all([
          listBenevoles(),
          listVendors(),
          listSubs(),
          listUsers(),
        ]);

        // Fetch messages from all department inboxes in parallel
        const inboxArrays = await Promise.all(
          DEPARTMENTS.map((d) =>
            listInbox({ type: 'department', departmentId: d.id }),
          ),
        );
        const liveMessages: MailMessage[] = inboxArrays.flat();

        if (cancelled) return;

        const liveActiveSubs = liveSubs.filter((s) => !s.unsubscribed).length;
        const normMessages: DashMsg[] = liveMessages.map((m) => ({
          id:     m.id ?? m.threadId,
          from:   m.fromName,
          subject: m.subject,
          sentAt: m.createdAt,
          read:   m.read,
        }));

        // If live returned data, use it
        if (liveBens.length > 0 || liveVens.length > 0 || liveActiveSubs > 0 || liveUsers.length > 0) {
          setBenevoles(liveBens);
          setVendors(liveVens);
          setSubs(liveActiveSubs);
          setMessages(normMessages);
          setUsers(liveUsers);
          return;
        }

        // Live returned empty — fall back to mock if devBypass
        if (devBypass) {
          const [mockBens, mockVens] = await Promise.all([
            mockListBenevoles(),
            mockListVendors(),
          ]);
          if (!cancelled) {
            setBenevoles(mockBens);
            setVendors(mockVens);
            setSubs(mockSubs.filter((s) => !s.unsubscribed).length);
            setMessages(mockMessages.map((m) => ({ id: m.id, from: m.from, subject: m.subject, sentAt: m.sentAt, read: m.read })));
            setUsers(mockUsers);
          }
        }
      } catch (err) {
        console.warn('[Dashboard] Live fetch failed:', err);
        if (cancelled) return;
        setError('Impossible de charger les données en temps réel. Affichage des données de démonstration.');
        if (devBypass) {
          const [mockBens, mockVens] = await Promise.all([
            mockListBenevoles(),
            mockListVendors(),
          ]);
          if (!cancelled) {
            setBenevoles(mockBens);
            setVendors(mockVens);
            setSubs(mockSubs.filter((s) => !s.unsubscribed).length);
            setMessages(mockMessages.map((m) => ({ id: m.id, from: m.from, subject: m.subject, sentAt: m.sentAt, read: m.read })));
            setUsers(mockUsers);
          }
        }
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [devBypass]);

  const bPending  = benevoles.filter((b) => b.status === 'pending').length;
  const bAccepted = benevoles.filter((b) => b.status === 'accepted').length;
  const bRejected = benevoles.filter((b) => b.status === 'rejected').length;
  const vPending  = vendors.filter((v) => v.status === 'pending').length;
  const vAccepted = vendors.filter((v) => v.status === 'accepted').length;
  const vRejected = vendors.filter((v) => v.status === 'rejected').length;
  const unreadMessages = messages.filter((m) => !m.read).length;

  const stats: Array<{
    label: string; value: number; icon: React.ComponentType<{ size?: number; className?: string }>;
    section: AdminSectionId; hint?: string;
  }> = [
    { label: 'Bénévoles à traiter', value: bPending,        icon: HandHeart,    section: 'benevoles', hint: `${benevoles.length} au total` },
    { label: 'Marchands à traiter', value: vPending,        icon: ShoppingBag,  section: 'marchands', hint: `${vendors.length} au total` },
    { label: 'Comptes',             value: users.length,    icon: Users,        section: 'comptes' },
    { label: 'Infolettre',          value: subs,            icon: Mail,         section: 'newsletter' },
    { label: 'Messages non lus',    value: unreadMessages,  icon: MessageSquare, section: 'messages',  hint: `${messages.length} au total` },
  ];

  const recentBenevoles = [...benevoles].slice(0, 5);
  const recentVendors   = [...vendors].slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Error banner */}
      {error && (
        <Card className="p-5 border border-blush/30 bg-blush/5">
          <p className="font-editorial italic text-sm text-ivory-soft">{error}</p>
        </Card>
      )}

      {/* Welcome card */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-midnight to-midnight-deep border border-brass/20 !rounded-lg-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] font-semibold mb-2">
              Bienvenue à la cour
            </p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-1">FMM 2026 — Tableau de bord</h2>
            <p className="font-editorial text-sm text-ivory-soft max-w-2xl">
              Survolez les candidatures, validez les marchands, gardez un œil sur l’infolettre et l’inbox.
              Cliquez une carte ci-dessous pour ouvrir la section.
            </p>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            Voir le site <ArrowUpRight size={14} />
          </a>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {stats.map(({ label, value, icon: Icon, section, hint }) => (
          <Card key={label} className="p-5 hover:bg-brass/10 transition cursor-pointer">
            <button onClick={() => onNavigate(section)} className="w-full text-left">
              <Icon size={22} className="text-brass mb-3" />
              <p className="font-display title-medieval text-3xl text-ivory tabular-nums">{value}</p>
              <p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">{label}</p>
              {hint && <p className="font-editorial italic text-[11px] text-ivory-soft/60 mt-2">{hint}</p>}
            </button>
          </Card>
        ))}
      </div>

      {/* Status breakdown — bénévoles + marchands */}
      <div className="grid md:grid-cols-2 gap-5">
        <BreakdownCard
          title="Bénévoles" pending={bPending} accepted={bAccepted} rejected={bRejected}
          onClick={() => onNavigate('benevoles')}
        />
        <BreakdownCard
          title="Marchands" pending={vPending} accepted={vAccepted} rejected={vRejected}
          onClick={() => onNavigate('marchands')}
        />
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display title-medieval text-sm text-brass uppercase tracking-widest">Dernières candidatures bénévoles</h3>
            <button onClick={() => onNavigate('benevoles')} className="text-[11px] uppercase tracking-widest text-ivory-soft hover:text-brass transition font-sans">
              Voir tout →
            </button>
          </div>
          {recentBenevoles.length === 0 ? (
            <p className="font-editorial italic text-sm text-ivory-soft/60">Aucune candidature pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {recentBenevoles.map((b) => (
                <li key={b.uid} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-display title-medieval text-ivory truncate">{b.prenom} {b.nom}</p>
                    <p className="font-editorial italic text-xs text-ivory-soft/60 truncate">{b.email} · {fmtDate(b.createdAt)}</p>
                  </div>
                  <Badge tone={b.status === 'accepted' ? 'accepted' : b.status === 'rejected' ? 'rejected' : 'pending'}>
                    {b.status === 'accepted' ? 'Acceptée' : b.status === 'rejected' ? 'Refusée' : 'En attente'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display title-medieval text-sm text-brass uppercase tracking-widest">Dernières inscriptions marchands</h3>
            <button onClick={() => onNavigate('marchands')} className="text-[11px] uppercase tracking-widest text-ivory-soft hover:text-brass transition font-sans">
              Voir tout →
            </button>
          </div>
          {recentVendors.length === 0 ? (
            <p className="font-editorial italic text-sm text-ivory-soft/60">Aucune inscription pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {recentVendors.map((v) => (
                <li key={v.uid} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-display title-medieval text-ivory truncate">{v.kioskName}</p>
                    <p className="font-editorial italic text-xs text-ivory-soft/60 truncate">{v.category} · {v.contact}</p>
                  </div>
                  <Badge tone={v.status === 'accepted' ? 'accepted' : v.status === 'rejected' ? 'rejected' : 'pending'}>
                    {v.status === 'accepted' ? 'Acceptée' : v.status === 'rejected' ? 'Refusée' : 'En attente'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Inbox preview */}
      {unreadMessages > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display title-medieval text-sm text-brass uppercase tracking-widest">Messages récents</h3>
            <button onClick={() => onNavigate('messages')} className="text-[11px] uppercase tracking-widest text-ivory-soft hover:text-brass transition font-sans">
              Ouvrir l’inbox →
            </button>
          </div>
          <ul className="space-y-3">
            {messages.slice(0, 3).map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-display title-medieval text-ivory truncate">
                    {!m.read && <span className="inline-block w-2 h-2 rounded-full bg-brass mr-2 align-middle" />}
                    {m.subject}
                  </p>
                  <p className="font-editorial italic text-xs text-ivory-soft/60 truncate">{m.from} · {fmtDate(m.sentAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

const BreakdownCard: React.FC<{ title: string; pending: number; accepted: number; rejected: number; onClick: () => void }> = ({ title, pending, accepted, rejected, onClick }) => {
  const total = pending + accepted + rejected;
  const seg = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display title-medieval text-sm text-brass uppercase tracking-widest">{title} · répartition</h3>
        <button onClick={onClick} className="text-[11px] uppercase tracking-widest text-ivory-soft hover:text-brass transition font-sans">
          Gérer →
        </button>
      </div>
      <div className="h-2 rounded-full bg-ivory-soft/10 overflow-hidden flex mb-4">
        <div className="bg-brass" style={{ width: `${seg(pending)}%` }} />
        <div className="bg-emerald-400" style={{ width: `${seg(accepted)}%` }} />
        <div className="bg-blush" style={{ width: `${seg(rejected)}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Stat icon={Clock}        tone="text-brass"          label="En attente" value={pending} />
        <Stat icon={CheckCircle2} tone="text-emerald-400"    label="Acceptées"  value={accepted} />
        <Stat icon={XCircle}      tone="text-blush"          label="Refusées"   value={rejected} />
      </div>
    </Card>
  );
};

const Stat: React.FC<{ icon: React.ComponentType<{ size?: number; className?: string }>; tone: string; label: string; value: number }> = ({ icon: Icon, tone, label, value }) => (
  <div>
    <div className="flex items-center gap-1.5">
      <Icon size={12} className={tone} />
      <span className="font-display title-medieval text-lg text-ivory tabular-nums">{value}</span>
    </div>
    <p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft/70 mt-0.5">{label}</p>
  </div>
);

export default DashboardSection;
