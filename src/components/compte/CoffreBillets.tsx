import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { addLocale } from '../../lib/locale';
import { useBadges } from '../../contexts/BadgesContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Upload, Trash2, ArrowUpRight, FileText } from 'lucide-react';
import {
  listBillets, uploadBillet, deleteBillet, billetError, type Billet,
} from '../../firebase/billets';

// Le coffre à billets. Un festivalier achète sur Zeffy, reçoit sa facture
// par courriel, et la perd. Il la dépose ici et la retrouve le jour venu.
// Les fichiers sont privés (voir storage.rules, chemin billets/{uid}).
const CoffreBillets: React.FC<{ uid: string; lang: 'FR' | 'EN' }> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const { gagnerBadge } = useBadges();
  const [rows, setRows]       = useState<Billet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let live = true;
    listBillets(uid)
      .then((r) => { if (live) { setRows(r); if (r.length > 0) gagnerBadge('billets'); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [uid]);

  const accept = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErr(null);
    const chosen = Array.from(files);
    const bad = chosen.map((f) => billetError(f, lang)).find(Boolean);
    if (bad) { setErr(bad); return; }
    setBusy(true);
    try {
      const added = await Promise.all(chosen.map((f) => uploadBillet(uid, f)));
      setRows((prev) => [...added, ...prev]);
      gagnerBadge('billets');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [uid, lang]);

  const remove = async (b: Billet) => {
    setErr(null);
    try {
      await deleteBillet(b.path);
      setRows((prev) => prev.filter((r) => r.path !== b.path));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section
      className="relative p-6 md:p-8 overflow-hidden"
      style={{ background: 'rgba(26, 5, 11, 0.55)', border: '1px solid rgba(244, 239, 227, 0.10)' }}
    >
      <header className="flex items-start gap-4 mb-6">
        <span className="witcher-tile shrink-0" style={{ width: 46, height: 46 }}>
          <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}>
            <Ticket size={16} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="witcher-stat-label mb-1.5">{t.eyebrow}</p>
          <h2
            className="font-display text-2xl md:text-3xl leading-snug"
            style={{ color: 'var(--color-bone)', fontWeight: 400 }}
          >
            {t.title}
          </h2>
        </div>
      </header>

      <ol className="mb-6 space-y-2">
        {t.steps.map((s, i) => (
          <li key={i} className="flex gap-3 font-sans text-sm leading-relaxed"
              style={{ color: 'rgba(244, 239, 227, 0.72)', fontWeight: 300 }}>
            <span className="font-sans text-[11px] tracking-[0.3em] shrink-0 mt-0.5" style={{ color: '#D8B05A' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {/* Clin d'œil au Seigneur des Anneaux : Gollum sur l'Anneau. */}
      <p
        className="font-editorial italic text-sm md:text-base mb-6 pl-4"
        style={{ color: '#D8B05A', borderLeft: '1px solid rgba(216, 176, 90, 0.45)' }}
      >
        {t.precious}
      </p>

      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); accept(e.dataTransfer.files); }}
        className="relative p-7 md:p-9 text-center transition-colors"
        style={{
          border: `1px dashed ${dragOver ? 'rgba(216,176,90,0.85)' : 'rgba(244,239,227,0.22)'}`,
          background: dragOver ? 'rgba(216,176,90,0.08)' : 'transparent',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,image/*"
          className="sr-only"
          id="billet-input"
          onChange={(e) => accept(e.target.files)}
        />
        <Upload size={22} className="mx-auto mb-3" style={{ color: '#D8B05A', opacity: 0.8 }} />
        <label
          htmlFor="billet-input"
          className="witcher-prompt cursor-pointer inline-flex"
          data-primary="true"
        >
          <span className="witcher-prompt-glyph"><span>A</span></span>
          {busy ? t.uploading : t.choose}
        </label>
        <p className="font-sans text-xs mt-4" style={{ color: 'rgba(244,239,227,0.4)', fontWeight: 300 }}>
          {t.hint}
        </p>
      </div>

      {err && (
        <p className="font-sans text-sm mt-4" style={{ color: '#E08A6E' }}>{err}</p>
      )}

      {/* Coffre */}
      <div className="mt-7">
        <p className="witcher-stat-label mb-4">
          {loading ? t.loading : rows.length > 0 ? t.stored.replace('{n}', String(rows.length)) : t.empty}
        </p>
        {!loading && rows.length === 0 && (
          <Link to={addLocale('/billets', lang)}
                className="inline-flex items-center gap-2 mb-5 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            <Ticket size={14} /> {t.acheter} <ArrowUpRight size={12} />
          </Link>
        )}
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rows.map((b) => (
              <motion.li
                key={b.path}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-4 p-3.5"
                style={{ background: 'rgba(10, 2, 7, 0.6)', border: '1px solid rgba(244,239,227,0.10)' }}
              >
                <FileText size={16} className="shrink-0" style={{ color: '#D8B05A' }} />
                <span className="flex-1 min-w-0">
                  <span
                    className="block font-sans text-sm truncate"
                    style={{ color: 'var(--color-bone)' }}
                  >
                    {b.name}
                  </span>
                  <span
                    className="block font-sans text-[11px] tracking-wider"
                    style={{ color: 'rgba(244,239,227,0.42)', fontWeight: 300 }}
                  >
                    {formatSize(b.size)}
                    {b.uploaded ? ` · ${new Date(b.uploaded).toLocaleDateString(fr ? 'fr-CA' : 'en-CA')}` : ''}
                  </span>
                </span>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 font-sans uppercase tracking-[0.2em] text-[10px] transition"
                  style={{ color: '#D8B05A' }}
                >
                  {t.open} <ArrowUpRight size={12} />
                </a>
                <button
                  type="button"
                  onClick={() => remove(b)}
                  aria-label={`${t.remove} ${b.name}`}
                  className="shrink-0 p-1.5 transition hover:opacity-100 opacity-55"
                  style={{ color: '#E08A6E' }}
                >
                  <Trash2 size={14} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </section>
  );
};

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const FR = {
  eyebrow: 'Coffre à billets',
  title:   'Vos billets, en lieu sûr',
  steps: [
    'Payez votre billet sur Zeffy, comme d’habitude.',
    'Téléchargez la facture que Zeffy vous envoie par courriel.',
    'Déposez-la ici. Elle vous attendra, même si vous perdez le courriel.',
  ],
  precious: '« Gardez-le précieux. Gardez-le en sûreté. »',
  choose:   'Déposer un billet',
  uploading:'Dépôt en cours…',
  hint:     'PDF ou image, 10 Mo maximum. Vous pouvez en déposer plusieurs.',
  loading:  'Ouverture du coffre…',
  empty:    'Toujours pas de billets. Prenez les vôtres à la billetterie.',
  acheter:  'Acheter mes billets',
  stored:   '{n} au coffre',
  open:     'Ouvrir',
  remove:   'Retirer',
};

const EN: typeof FR = {
  eyebrow: 'Ticket vault',
  title:   'Your tickets, kept safe',
  steps: [
    'Pay for your ticket on Zeffy, as usual.',
    'Download the invoice Zeffy emails you.',
    'Drop it here. It will be waiting, even if you lose the email.',
  ],
  precious: '“Keep it secret. Keep it safe.”',
  choose:   'Add a ticket',
  uploading:'Uploading…',
  hint:     'PDF or image, 10 MB max. You can add several.',
  loading:  'Opening the vault…',
  empty:    'No tickets yet. Get yours at the box office.',
  acheter:  'Buy my tickets',
  stored:   '{n} in the vault',
  open:     'Open',
  remove:   'Remove',
};

export default CoffreBillets;
