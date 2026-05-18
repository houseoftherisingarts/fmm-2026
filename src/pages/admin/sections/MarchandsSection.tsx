import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Save, Download, ShoppingBag, ExternalLink, Lock, Unlock, RotateCcw, Sparkles, Globe, Crown, Image as ImageIcon } from 'lucide-react';
import {
  CURRENT_YEAR, reinviteVendor, upsertVendorApp,
  type VendorStatus, type VendorApp, type VendorTier,
} from '../../../firebase/applications';
import { useSiteFlags } from '../../../contexts/SiteFlagsContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Badge, Card, EmptyState, GhostButton, downloadCsv, fmtDate } from '../primitives';
import MessageThread from '../../../components/vendor/MessageThread';
import BroadcastComposer from '../../../components/admin/BroadcastComposer';
import VendorImagePicker from '../../../components/admin/VendorImagePicker';
import {
  PREMIUM_VENDORS, MARCHE_VENDORS, DIGITAL_VENDORS, PREP_PRODUCTS,
} from '../../../content/marche';

interface Props {
  fetchAll: () => Promise<VendorApp[]>;
  updateOne: (uid: string, year: number, status: VendorStatus, notes?: string) => Promise<void>;
}

const STATUS_LABEL: Record<VendorStatus, string> = {
  pending:  'En attente',
  accepted: 'Acceptée',
  rejected: 'Refusée',
  waitlist: 'Liste d’attente',
};
const TIER_LABEL: Record<VendorTier, string> = {
  premium: 'Premium · Pavillon',
  marche:  'Marché',
  digital: 'Boutique digitale',
};
const TIER_TONE: Record<VendorTier, string> = {
  premium: 'bg-brass/20 border-brass/50 text-brass',
  marche:  'bg-ivory-soft/10 border-ivory-soft/30 text-ivory-soft',
  digital: 'bg-blue-300/15 border-blue-300/40 text-blue-300',
};
const APPEARANCE_LABEL: Record<string, string> = {
  moderne:   'Moderne',
  medievale: 'Médiévale / Reconstitution',
  decore:    'Décoré (non-reconstitution)',
  incertain: 'Incertain',
};
const ELECTRICITY_LABEL: Record<string, string> = {
  oui:   'Oui — 100 % requis',
  non:   'Non',
  phone: 'Charge téléphone',
};

const MarchandsSection: React.FC<Props> = ({ fetchAll, updateOne }) => {
  const [items, setItems]       = useState<VendorApp[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<VendorStatus | 'all'>('all');
  const [tierFilter, setTierF]  = useState<VendorTier | 'all'>('all');
  const [yearFilter, setYearF]  = useState<number | 'all'>(CURRENT_YEAR);
  const [search, setSearch]     = useState('');
  const [collapsedYears, setCollapsedYears] = useState<Record<number, boolean>>({});

  const { flags, setFlag } = useSiteFlags();
  const { user: adminUser } = useAuth();
  const inscriptionsOpen = flags.vendorApplicationsOpen;
  const [imagePickerOpen, setImagePickerOpen] = useState(false);

  // Catalogue used by the image picker — every kiosk on every tier in
  // a flat list so Jesse can swap any photo. Sourced from the same
  // content module the public /marche reads.
  const allKiosksForPicker = useMemo(
    () => [
      ...PREMIUM_VENDORS.map((v) => ({ id: v.id, name: `${v.name} · Premium`,   defaultImage: v.image })),
      ...MARCHE_VENDORS.map((v)  => ({ id: v.id, name: `${v.name} · Marché`,    defaultImage: v.image })),
      ...DIGITAL_VENDORS.map((v) => ({ id: v.id, name: `${v.name} · Digitale`,  defaultImage: v.image })),
      ...PREP_PRODUCTS.map((v)   => ({ id: v.id, name: `${v.name} · Boutique`,  defaultImage: v.image })),
    ],
    [],
  );

  // Personalised greeting — when the logged-in admin is Jesse (matched by
  // display name or email local-part), the section opens with a dedicated
  // welcome. Falls back to a neutral greeting for any other admin so the
  // header stays warm without misnaming visitors.
  const greetingName = (() => {
    const dn = adminUser?.displayName?.trim();
    const local = adminUser?.email?.split('@')[0] || '';
    const looksLikeJesse =
      /jesse/i.test(dn || '') || /jesse/i.test(local) ||
      // Dev bypass — still greet Jesse so she can see the experience
      adminUser?.email === 'dev@local';
    if (looksLikeJesse) return 'Jesse';
    if (dn) return dn.split(' ')[0];
    if (local) return local;
    return 'admin';
  })();

  const load = async () => {
    setLoading(true);
    setItems(await fetchAll());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const years = useMemo(
    () => Array.from(new Set(items.map((v) => v.year))).sort((a, b) => b - a),
    [items],
  );

  // Stable accessor for the tier — older docs may not have it set yet.
  const tierOf = (v: VendorApp): VendorTier => v.tier || 'marche';

  const filtered = items.filter((v) =>
    (filter === 'all' || v.status === filter) &&
    (tierFilter === 'all' || tierOf(v) === tierFilter) &&
    (yearFilter === 'all' || v.year === yearFilter) &&
    (search === '' || `${v.companyName || v.kioskName} ${v.contact} ${v.email} ${v.regionOfOrigin || ''} ${v.category}`.toLowerCase().includes(search.toLowerCase())),
  );

  // Tier counts for the greeting summary chips.
  const tierCounts = useMemo(() => {
    const c = { premium: 0, marche: 0, digital: 0 } as Record<VendorTier, number>;
    for (const v of items) if (v.year === CURRENT_YEAR) c[tierOf(v)] += 1;
    return c;
  }, [items]);
  const pendingCount = useMemo(
    () => items.filter((v) => v.status === 'pending' && v.year === CURRENT_YEAR).length,
    [items],
  );

  const grouped = useMemo(() => {
    const m = new Map<number, VendorApp[]>();
    for (const v of filtered) {
      if (!m.has(v.year)) m.set(v.year, []);
      m.get(v.year)!.push(v);
    }
    return [...m.entries()].sort(([a], [b]) => b - a);
  }, [filtered]);

  const exportCsv = () => downloadCsv('fmm-marchands.csv', items.map((v) => ({
    annee: v.year,
    compagnie: v.companyName || v.kioskName,
    contact: v.contact, email: v.email, telephone: v.phone || '',
    description: v.description || v.products || '',
    socials: v.socials || v.websiteUrl || '',
    deja_expo: v.hasParticipatedBefore ? 'oui' : 'non',
    equipe: v.teamSize || '',
    interet_benevole: v.familyVolunteerInterest || '',
    apparence: v.kioskAppearance || '',
    dimensions: v.kioskDimensions || v.spaceSize || '',
    electricite: v.electricityNeed || (v.needsElectricity ? 'oui' : 'non'),
    camping: v.wantsCampingSpot ? 'oui' : 'non',
    region: v.regionOfOrigin || '',
    source: v.firstTimeSource || '',
    autres: v.otherQuestions || '',
    statut: v.status, notes: v.adminNotes || '',
    recue: fmtDate(v.createdAt),
  })));

  const toggleInscriptions = () => setFlag('vendorApplicationsOpen', !inscriptionsOpen);
  const toggleYear = (y: number) => setCollapsedYears((p) => ({ ...p, [y]: !p[y] }));

  const reinvite = async (v: VendorApp) => {
    const target = CURRENT_YEAR;
    if (v.year >= target) {
      alert(`${v.companyName || v.kioskName} a déjà un dossier ${target}.`);
      return;
    }
    if (!confirm(`Réinviter ${v.companyName || v.kioskName} pour ${target} ? Ses réponses ${v.year} seront copiées et le statut remis à "en attente".`)) return;
    try {
      await reinviteVendor(v.uid, v.year, target);
      await load();
    } catch (e) {
      alert(`Échec : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Personalised greeting — Hello Jesse / Hello {name} ──── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-card border border-brass/30 bg-gradient-to-br from-brass/10 via-midnight-deep to-midnight-deep px-5 md:px-7 py-5 md:py-6"
      >
        <div
          aria-hidden
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-brass/20 blur-3xl pointer-events-none"
        />
        <div className="relative flex items-start gap-4 flex-wrap">
          <motion.div
            animate={{ rotate: [0, 8, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-11 h-11 rounded-full bg-brass/15 border border-brass/50 flex items-center justify-center text-brass shadow-[0_0_18px_rgba(176,141,58,0.45)]"
          >
            <Sparkles size={18} />
          </motion.div>
          <div className="flex-1 min-w-[14rem]">
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">
              Pavillon · Marché · Digitale
            </p>
            <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory leading-tight">
              Hello {greetingName}
            </h2>
            <p className="font-editorial text-sm md:text-base text-ivory-soft mt-1.5 max-w-2xl">
              Tu gères tout d’ici : valider les candidatures, faire glisser un marchand entre <span className="text-brass">Pavillon&nbsp;Premium</span>, <span className="text-ivory">Marché</span> et <span className="text-blue-300">Boutique&nbsp;digitale</span>, et tout ce que les visiteurs voient sur <code className="text-brass font-sans text-xs">/marche</code> vient d’ici.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-[14rem]">
            <Chip icon={Crown}     label="Premium"   value={tierCounts.premium} tone="bg-brass/15 text-brass border-brass/40" />
            <Chip icon={ShoppingBag} label="Marché"  value={tierCounts.marche}  tone="bg-ivory-soft/10 text-ivory border-ivory-soft/30" />
            <Chip icon={Globe}     label="Digitale"  value={tierCounts.digital} tone="bg-blue-300/15 text-blue-300 border-blue-300/40" />
            <Chip icon={Sparkles}  label="À traiter" value={pendingCount}       tone="bg-amber-300/15 text-amber-300 border-amber-300/40" />
          </div>
        </div>
      </motion.div>

      {/* ── Broadcast composer — branded instruction messages ──── */}
      <BroadcastComposer
        vendors={items}
        adminUid={adminUser?.uid || 'admin'}
        adminName={greetingName === 'Jesse' ? 'Jesse — FMM' : (adminUser?.displayName || 'FMM')}
      />

      {/* ── Image library access — opens picker over every kiosk ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 rounded-card border border-brass/25 bg-midnight-deep/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-card bg-brass/15 border border-brass/45 flex items-center justify-center text-brass shrink-0">
            <ImageIcon size={15} />
          </div>
          <div className="min-w-0">
            <p className="font-display title-medieval text-sm text-ivory leading-tight">
              Bibliothèque d’images
            </p>
            <p className="font-editorial italic text-xs text-ivory-soft">
              Choisir la photo de chaque kiosque — visible aussitôt sur <code className="font-sans text-[10px] text-brass">/marche</code>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setImagePickerOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-card border border-brass/55 text-brass hover:bg-brass hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition shrink-0"
        >
          <ImageIcon size={13} /> Ouvrir la galerie
        </button>
      </div>

      {imagePickerOpen && (
        <VendorImagePicker
          vendors={allKiosksForPicker}
          editorUid={adminUser?.uid || 'admin'}
          onClose={() => setImagePickerOpen(false)}
        />
      )}

      {/* ── Header: counts + close/open toggle ─────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="font-editorial italic text-sm text-ivory-soft">
          {filter === 'all' && yearFilter === 'all' && tierFilter === 'all'
            ? `${items.length} inscriptions au total`
            : `${filtered.length} affichées sur ${items.length}`}
        </p>
        <button
          onClick={toggleInscriptions}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-card font-sans uppercase tracking-wider text-xs font-semibold transition ${
            inscriptionsOpen
              ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
              : 'bg-amber-300/15 border border-amber-300/40 text-amber-300 hover:bg-amber-300/25'
          }`}
        >
          {inscriptionsOpen ? <Lock size={12} /> : <Unlock size={12} />}
          {inscriptionsOpen ? 'Fermer les inscriptions' : 'Rouvrir les inscriptions'}
        </button>
      </div>

      {!inscriptionsOpen && (
        <Card className="px-4 py-3 border border-amber-300/30">
          <p className="font-editorial italic text-sm text-amber-300">
            Les inscriptions sont fermées. Toute nouvelle candidature est versée à la liste d’attente.
          </p>
        </Card>
      )}

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-display title-medieval text-xs text-brass mr-1">Niveau :</span>
        {(['all', 'premium', 'marche', 'digital'] as const).map((t) => (
          <button key={t} onClick={() => setTierF(t)}
            className={`px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition inline-flex items-center gap-1.5 ${
              tierFilter === t
                ? t === 'premium' ? 'bg-brass text-midnight-deep'
                : t === 'digital' ? 'bg-blue-300 text-midnight-deep'
                : t === 'marche'  ? 'bg-ivory text-midnight-deep'
                : 'bg-brass text-midnight-deep'
                : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'
            }`}>
            {t === 'premium' && <Crown size={11} />}
            {t === 'marche'  && <ShoppingBag size={11} />}
            {t === 'digital' && <Globe size={11} />}
            {t === 'all' ? 'Tous niveaux' : TIER_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display title-medieval text-xs text-brass mr-1">Année :</span>
          <button onClick={() => setYearF('all')}
            className={`px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${yearFilter === 'all' ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'}`}>
            Toutes
          </button>
          {years.map((y) => (
            <button key={y} onClick={() => setYearF(y)}
              className={`px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${yearFilter === y ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'}`}>
              {y}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche…"
            className="px-3 py-1.5 rounded-card border border-ivory-soft/20 bg-midnight-deep/50 text-ivory placeholder:text-stone focus:border-brass focus:outline-none text-xs font-sans" />
          {(['all', 'pending', 'waitlist', 'accepted', 'rejected'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${filter === f ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'}`}>
              {f === 'all' ? 'Tous statuts' : STATUS_LABEL[f]}
            </button>
          ))}
          <GhostButton onClick={exportCsv}><Download size={12} /> CSV</GhostButton>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={ShoppingBag}>Aucune inscription ne correspond aux filtres.</EmptyState></Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([year, rows]) => {
            const collapsed = !!collapsedYears[year];
            return (
              <section key={year} className="space-y-2">
                <button onClick={() => toggleYear(year)}
                  className="w-full flex items-center gap-3 px-1 py-2 group">
                  {collapsed ? <ChevronRight size={18} className="text-brass" /> : <ChevronDown size={18} className="text-brass" />}
                  <h3 className="font-display title-medieval text-lg text-ivory">
                    {year}
                    {year === CURRENT_YEAR && <span className="ml-2 text-xs text-brass uppercase tracking-widest">(en cours)</span>}
                  </h3>
                  <span className="font-editorial italic text-xs text-stone ml-1">— {rows.length} inscription{rows.length > 1 ? 's' : ''}</span>
                  <span className="flex-1 ml-3 h-px bg-gradient-to-r from-brass/40 to-transparent" />
                </button>
                {!collapsed && (
                  <div className="space-y-2">
                    {rows.map((v) => (
                      <Row
                        key={`${v.uid}_${v.year}`}
                        v={v}
                        onChanged={load}
                        updateOne={updateOne}
                        onReinvite={() => reinvite(v)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{
  v: VendorApp;
  onChanged: () => void;
  updateOne: Props['updateOne'];
  onReinvite: () => void;
}> = ({ v, onChanged, updateOne, onReinvite }) => {
  const [open, setOpen]     = useState(false);
  const [notes, setNotes]   = useState(v.adminNotes || '');
  const [saving, setSaving] = useState(false);
  const { user: adminUser } = useAuth();

  const tier: VendorTier = v.tier || 'marche';

  const save = async (status?: VendorStatus) => {
    setSaving(true);
    try { await updateOne(v.uid, v.year, status || v.status, notes); await onChanged(); }
    finally { setSaving(false); }
  };

  // Persist a tier change to the vendor doc and refresh the list. Mock
  // vendors (uid starts with `mock-`) get the update through upsertVendorApp
  // when Firestore is wired; without Firestore it falls back to a no-op.
  const setTier = async (next: VendorTier) => {
    setSaving(true);
    try {
      await upsertVendorApp({ ...v, tier: next, featured: next === 'premium' });
      await onChanged();
    } catch {
      // Mock mode without Firestore: mutate the in-memory record so the UI
      // reflects the change immediately even though it isn't persisted.
      (v as { tier?: VendorTier }).tier = next;
      (v as { featured?: boolean }).featured = next === 'premium';
      await onChanged();
    } finally {
      setSaving(false);
    }
  };

  const canReinvite = v.year < CURRENT_YEAR && (v.status === 'accepted' || v.status === 'rejected');

  return (
    <Card className="overflow-hidden">
      <header className="grid grid-cols-12 gap-3 items-center px-4 md:px-5 py-3.5 cursor-pointer" onClick={() => setOpen(!open)}>
        <button aria-label="Toggle" className="col-span-1">
          {open ? <ChevronDown size={16} className="text-brass" /> : <ChevronRight size={16} className="text-ivory-soft" />}
        </button>
        <div className="col-span-12 sm:col-span-4 min-w-0">
          <p className="font-display title-medieval text-sm text-ivory truncate flex items-center gap-2">
            {tier === 'premium' && <Crown size={12} className="text-brass shrink-0" />}
            {tier === 'digital' && <Globe size={12} className="text-blue-300 shrink-0" />}
            {v.companyName || v.kioskName}
          </p>
          <p className="font-editorial italic text-xs text-stone truncate">
            {v.contact}{v.regionOfOrigin ? ` · ${v.regionOfOrigin}` : v.category ? ` · ${v.category}` : ''}
          </p>
        </div>
        <p className="col-span-12 sm:col-span-4 font-sans text-xs text-ivory-soft truncate">{v.email}</p>
        <div className="col-span-12 sm:col-span-3 flex justify-end items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-card border text-[10px] uppercase tracking-widest font-sans ${TIER_TONE[tier]}`}>
            {tier === 'premium' ? 'Premium' : tier === 'digital' ? 'Digitale' : 'Marché'}
          </span>
          <Badge tone={v.status}>{STATUS_LABEL[v.status]}</Badge>
        </div>
      </header>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 md:px-5 pb-5 border-t border-ivory-soft/15"
          >
            <div className="grid md:grid-cols-2 gap-5 pt-4">
              <dl className="space-y-2 font-sans text-sm">
                <Detail label="Téléphone"     value={v.phone || '—'} />
                <Detail label="Région"        value={v.regionOfOrigin || '—'} />
                <Detail label="Équipe"        value={v.teamSize || '—'} />
                <Detail label="Déjà expo"     value={v.hasParticipatedBefore ? 'Oui' : v.hasParticipatedBefore === false ? 'Non' : '—'} />
                <Detail label="Apparence"     value={v.kioskAppearance ? APPEARANCE_LABEL[v.kioskAppearance] : '—'} />
                <Detail label="Dimensions"    value={v.kioskDimensions || v.spaceSize || '—'} />
                <Detail label="Électricité"   value={v.electricityNeed ? ELECTRICITY_LABEL[v.electricityNeed] : (v.needsElectricity ? 'Oui (legacy)' : '—')} />
                <Detail label="Camping"       value={v.wantsCampingSpot ? 'Oui' : v.wantsCampingSpot === false ? 'Non' : '—'} />
                <Detail label="Liens"         value={v.socials || v.websiteUrl || '—'} link={v.socials || v.websiteUrl} />
                <Detail label="Source 1re"    value={v.firstTimeSource || '—'} />
                <Detail label="Reçue le"      value={fmtDate(v.createdAt)} />
              </dl>
              <div className="space-y-4">
                <div>
                  <p className="font-display title-medieval text-xs text-brass mb-1.5">Description / produits</p>
                  <p className="font-editorial text-sm text-ivory-soft whitespace-pre-line min-h-[80px]">
                    {v.description || v.products || <em className="text-stone">— aucun —</em>}
                  </p>
                </div>
                {v.familyVolunteerInterest && (
                  <div>
                    <p className="font-display title-medieval text-xs text-brass mb-1.5">Intérêt bénévolat (famille / équipe)</p>
                    <p className="font-editorial text-sm text-ivory-soft whitespace-pre-line">{v.familyVolunteerInterest}</p>
                  </div>
                )}
                {v.otherQuestions && (
                  <div>
                    <p className="font-display title-medieval text-xs text-brass mb-1.5">Autres questions / infos</p>
                    <p className="font-editorial text-sm text-ivory-soft whitespace-pre-line">{v.otherQuestions}</p>
                  </div>
                )}
              </div>
            </div>
            {adminUser && (
              <div className="mt-5">
                <MessageThread
                  vendorUid={v.uid}
                  currentUid={adminUser.uid}
                  currentName={adminUser.displayName || 'FMM'}
                  currentRole="admin"
                  height="h-72"
                />
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <p className="font-display title-medieval text-xs text-brass mr-1">Niveau :</p>
              {(['premium', 'marche', 'digital'] as const).map((t) => (
                <button key={t} onClick={() => setTier(t)} disabled={saving || tier === t}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card font-sans uppercase tracking-wider text-[11px] font-semibold transition disabled:opacity-100 ${
                    tier === t
                      ? t === 'premium' ? 'bg-brass text-midnight-deep border border-brass'
                      : t === 'digital' ? 'bg-blue-300 text-midnight-deep border border-blue-300'
                      : 'bg-ivory text-midnight-deep border border-ivory'
                      : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'
                  }`}>
                  {t === 'premium' && <Crown size={11} />}
                  {t === 'marche'  && <ShoppingBag size={11} />}
                  {t === 'digital' && <Globe size={11} />}
                  {TIER_LABEL[t]}
                </button>
              ))}
              {v.heroImage && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ivory-soft font-sans">
                  <ImageIcon size={11} className="text-brass" /> Image vedette présente
                </span>
              )}
            </div>

            <div className="mt-5">
              <p className="font-display title-medieval text-xs text-brass mb-1.5">Notes admin (privées)</p>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-midnight-deep/60 border border-ivory-soft/20 px-3 py-2 text-sm font-sans text-ivory placeholder:text-stone focus:border-brass focus:outline-none rounded-card resize-y" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => save('accepted')} disabled={saving}
                className="px-4 py-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                Accepter
              </button>
              <button onClick={() => save('rejected')} disabled={saving}
                className="px-4 py-1.5 bg-blush/20 border border-blush/40 text-blush hover:bg-blush/30 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                Refuser
              </button>
              <button onClick={() => save('waitlist')} disabled={saving}
                className="px-4 py-1.5 bg-amber-300/15 border border-amber-300/40 text-amber-300 hover:bg-amber-300/25 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                Liste d’attente
              </button>
              <button onClick={() => save('pending')} disabled={saving}
                className="px-4 py-1.5 bg-brass/15 border border-brass/40 text-brass hover:bg-brass/25 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                En attente
              </button>
              {canReinvite && (
                <button onClick={onReinvite} disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-300/10 border border-blue-300/40 text-blue-300 hover:bg-blue-300/20 font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                  <RotateCcw size={12} /> Réinviter pour {CURRENT_YEAR}
                </button>
              )}
              <button onClick={() => save()} disabled={saving}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 border border-stone text-ivory hover:bg-ivory hover:text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold transition rounded-card disabled:opacity-50">
                <Save size={12} /> Notes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

const Detail: React.FC<{ label: string; value: string; link?: string }> = ({ label, value, link }) => (
  <div className="flex gap-2 items-start">
    <dt className="font-display title-medieval text-xs text-brass min-w-[88px]">{label}</dt>
    <dd className="text-ivory-soft flex items-center gap-1.5 break-all">
      {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="hover:text-brass transition inline-flex items-center gap-1">{value}<ExternalLink size={10} /></a> : value}
    </dd>
  </div>
);

// Compact summary chip used in the greeting header.
const Chip: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  tone: string;
}> = ({ icon: Icon, label, value, tone }) => (
  <div className={`rounded-card border px-3 py-2 ${tone}`}>
    <div className="flex items-center gap-1.5">
      <Icon size={12} />
      <span className="font-sans text-[10px] uppercase tracking-widest">{label}</span>
    </div>
    <div className="font-display title-medieval text-lg leading-none mt-0.5 text-ivory">
      {value}
    </div>
  </div>
);

export default MarchandsSection;
