import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useUI } from '../../contexts/AppContext';
import {
  subscribeAcceptedVendors, CURRENT_YEAR, type VendorApp,
} from '../../firebase/applications';
import { Eyebrow, DisplayTitle, SectionFog } from '../marche/atmospherics';
import { NoticeBoard, Parchment, seedTilt } from '../board/NoticeBoard';

// Le tableau des marchands, refait sur de vrais visuels (2026-08-02).
// Le panneau lui-même (bois, cadre, parchemin) vit dans
// `components/board/NoticeBoard.tsx` depuis le 2026-08-03 : les avis de
// l'espace client s'épinglent sur le même objet.
// L'édition affichée est celle des inscriptions ouvertes (2027) : la 2026
// est complète et déjà derrière nous.
const BOARD_YEAR = CURRENT_YEAR + 1;

const ApprovedVendorsList: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [rows, setRows] = useState<VendorApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAcceptedVendors(BOARD_YEAR, (next) => {
      setRows(next);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Inclinaison stable par avis : épinglé à la main, mais qui ne
  // resaute pas à chaque rendu.
  const tilts = useMemo(
    () => rows.map((v) => seedTilt(`${v.uid}_${v.year}`)),
    [rows],
  );

  return (
    <section className="relative caravan-stage bleed-edges fmm-perf-section text-[var(--color-bone)] overflow-hidden py-20 md:py-28">
      <SectionFog />

      <div className="relative max-w-screen-xl mx-auto px-4 md:px-8">
        {/* Rail de registre, même grammaire que le reste du pilier */}
        <div
          className="flex items-center justify-between gap-4 mb-10 md:mb-14 pb-2"
          style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}
        >
          <span className="witcher-stat-label">{t.eyebrow}</span>
          <span
            className="font-sans text-sm tracking-[0.2em]"
            style={{ color: 'var(--sk-gilt)', fontWeight: 300 }}
          >
            {loading ? '…' : rows.length > 0 ? String(rows.length) : t.none}
          </span>
        </div>

        <header className="max-w-3xl mb-10 md:mb-14">
          <Eyebrow className="mb-5 inline-flex items-center gap-3">
            <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-copper)' }} />
            {t.eyebrow}
          </Eyebrow>
          <DisplayTitle size="lg" glow className="mb-5">{t.title}</DisplayTitle>
          <p
            className="font-sans text-base md:text-lg leading-[1.75]"
            style={{ color: 'rgba(var(--sk-parchment-rgb), 0.75)', fontWeight: 300 }}
          >
            {t.lead}
          </p>
        </header>

        <NoticeBoard>
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-14">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-amber-300 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <Parchment tilt={-1.2} className="col-span-full max-w-sm mx-auto">
              <p className="font-display text-lg md:text-xl text-[#2f1c0b] text-center mb-1.5">
                {t.emptyTitle}
              </p>
              <p className="font-sans text-sm text-[#5b4023] text-center leading-relaxed">{t.empty}</p>
            </Parchment>
          ) : (
            rows.map((v, i) => (
              <Notice key={`${v.uid}_${v.year}`} v={v} tilt={tilts[i]} t={t} index={i} />
            ))
          )}
        </NoticeBoard>

        <p
          className="font-sans text-sm text-center mt-10 max-w-xl mx-auto leading-relaxed"
          style={{ color: 'rgba(var(--sk-parchment-rgb), 0.45)', fontWeight: 300 }}
        >
          {t.refreshNote}
        </p>
      </div>
    </section>
  );
};

// ─── Un avis de marchand ─────────────────────────────────────────
const Notice: React.FC<{ v: VendorApp; tilt: number; t: typeof FR; index: number }> =
({ v, tilt, t, index }) => (
  <Parchment tilt={tilt}>
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: Math.min(0.1 + index * 0.05, 0.6) }}
    >
      <p className="font-sans text-[10px] text-[var(--sk-brass-deep)] uppercase tracking-[0.35em] text-center mb-2.5">
        {t.acceptedTag}
      </p>
      <h3 className="font-display text-lg md:text-xl text-[var(--sk-brown-deep)] text-center mb-1.5 leading-snug">
        {v.companyName || v.kioskName}
      </h3>
      {v.regionOfOrigin && (
        <p className="font-sans text-sm text-[#5b3b1a] text-center mb-3">
          · {v.regionOfOrigin} ·
        </p>
      )}
      {v.description && (
        <p className="font-sans text-sm text-[#3a2618] leading-snug line-clamp-3 text-center">
          {v.description}
        </p>
      )}
      {(v.socials || v.websiteUrl) && (
        <div className="text-center mt-3.5">
          <a
            href={ensureUrl(v.socials || v.websiteUrl || '')}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-sans uppercase tracking-[0.2em] text-[var(--sk-brass-deep)] hover:text-[var(--sk-brown-deep)] transition"
          >
            {t.visit} <ExternalLink size={11} />
          </a>
        </div>
      )}
    </motion.div>
  </Parchment>
);

// ─── Helpers ──────────────────────────────────────────────────────
function ensureUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return '#';
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('@')) return `https://instagram.com/${v.slice(1)}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  return v;
}

// ─── Traductions ─────────────────────────────────────────────────
const FR = {
  eyebrow: 'Marché 2027',
  title:   'Tableau des marchands',
  lead:    'Les marchands retenus pour l’édition 2027 sont épinglés ici, au fil des acceptations.',
  none:        'Aucun avis',
  acceptedTag: 'Confirmé',
  emptyTitle:  'Tableau vide',
  empty:       'Aucun marchand n’a encore été confirmé pour 2027. Les premiers avis seront épinglés sous peu.',
  visit:       'Visiter',
  refreshNote: 'Revenez régulièrement : si votre candidature est retenue, vous la verrez ici et dans votre espace marchand.',
};

const EN: typeof FR = {
  eyebrow: '2027 Market',
  title:   'Merchants’ board',
  lead:    'Merchants selected for the 2027 edition are pinned here as acceptances come in.',
  none:        'No notices',
  acceptedTag: 'Confirmed',
  emptyTitle:  'Empty board',
  empty:       'No merchant has been confirmed for 2027 yet. The first notices will be pinned shortly.',
  visit:       'Visit',
  refreshNote: 'Check back regularly: if your application is selected, you will see it here and in your merchant space.',
};

export default ApprovedVendorsList;
