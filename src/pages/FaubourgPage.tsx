import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import EmberCanvas from '../components/vendor/EmberCanvas';
import FORM from '../content/faubourg-form.json';

// ─── Kiosques 2026 : le Google Form de Jessee, habillé FMM ───────────
// TOUT le texte (titre, intro, questions, choix) est celui du Form,
// mot pour mot, tiré de src/content/faubourg-form.json. On n'en change
// rien : c'est son formulaire. La page ne fait que l'habiller et POSTer
// vers formResponse; ses réponses tombent dans sa feuille Sheets comme
// avant. Si elle modifie une question, régénérer le JSON
// (FB_PUBLIC_LOAD_DATA_ de forms.gle/ydpbbFRoWFV94wGD7).
const FORM_ACTION =
  'https://docs.google.com/forms/d/e/1FAIpQLSftFlYqrqYZwVAZyLuC23juIWAguAYVmj6r6uaMEi8AWYa7kg/formResponse';

type Q = { id: string; label: string; type: number; req: boolean; opts: string[] };
const QUESTIONS = FORM.questions as Q[];
// Le Form exige aussi le courriel (réglage « collecter les adresses »).
const EMAIL: Q = { id: 'emailAddress', label: 'Adresse courriel', type: 0, req: true, opts: [] };
const ALL = [EMAIL, ...QUESTIONS];

const FaubourgPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const reduce = useReducedMotion();
  const [v, setV] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const val = (id: string) => v[id] ?? '';
  const set = (id: string, x: string) => setV((p) => ({ ...p, [id]: x }));
  const missing = ALL.filter((q) => q.req && !val(q.id).trim());
  const err = (q: Q) => touched && q.req && !val(q.id).trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (missing.length) {
      document.querySelector<HTMLElement>('[data-missing="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setState('sending');
    const body = new URLSearchParams();
    ALL.forEach((q) => body.append(q.id, val(q.id)));
    body.append('fvv', '1');
    body.append('pageHistory', '0');
    try {
      // no-cors : réponse opaque. Rejet = réseau coupé; résolution = reçu.
      await fetch(FORM_ACTION, { method: 'POST', mode: 'no-cors', body });
      setState('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setState('error');
    }
  };

  const label = (q: Q) => (
    <span className="block font-display text-xs md:text-sm mb-3 tracking-[0.12em] leading-relaxed whitespace-pre-line" style={{ color: '#D8B05A' }}>
      {q.label}{q.req && <span className="ml-1" style={{ color: '#E07A7A' }}>*</span>}
    </span>
  );

  return (
    <>
      <SEO title={FORM.title} description={FORM.intro.slice(0, 160)} />
      <section className="relative caravan-stage bleed-edges text-[var(--color-bone)] pt-28 pb-24 md:pt-32 md:pb-32 overflow-hidden">
        <EmberCanvas />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">

          <div className="flex items-center justify-between gap-4 mb-12 md:mb-16 pb-2" style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}>
            <Link to={addLocale('/marche', lang)} className="inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.3em] text-[var(--color-bone)]/60 hover:text-[#D8B05A] transition">
              <ArrowLeft size={13} /> {lang === 'FR' ? 'Retour au marché' : 'Back to the market'}
            </Link>
            <span className="witcher-stat-label hidden md:block">{lang === 'FR' ? 'Kiosques · Édition 2026' : 'Kiosks · 2026 edition'}</span>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mb-14 md:mb-20"
          >
            <h1
              className="font-display leading-[1.1] text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-10"
              style={{ color: 'var(--color-bone)', fontWeight: 400, textShadow: '0 0 24px rgba(232,177,74,0.28), 0 0 60px rgba(184,106,42,0.22)' }}
            >
              {FORM.title}
            </h1>
            <div className="font-sans text-sm md:text-base leading-[1.8] whitespace-pre-line" style={{ color: 'rgba(244,239,227,0.8)', fontWeight: 300 }}>
              {FORM.intro}
            </div>
          </motion.div>

          {state === 'done' ? (
            <div className="max-w-3xl py-16" style={{ borderTop: '1px solid rgba(244,239,227,0.10)' }}>
              <p className="font-display text-2xl md:text-4xl mb-5" style={{ color: '#D8B05A' }}>Votre réponse a été enregistrée.</p>
              <p className="font-sans text-base leading-[1.75]" style={{ color: 'rgba(244,239,227,0.78)', fontWeight: 300 }}>Merci et au plaisir de festoyer ensemble encore!</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-10 max-w-3xl pt-12" style={{ borderTop: '1px solid rgba(244,239,227,0.10)' }}>
              {ALL.map((q) => (
                <div key={q.id} data-missing={err(q) ? 'true' : undefined}>
                  {label(q)}
                  {q.type === 0 && (
                    <input className="witcher-input font-sans" type={q.id === 'emailAddress' ? 'email' : 'text'} value={val(q.id)} onChange={(e) => set(q.id, e.target.value)} />
                  )}
                  {q.type === 1 && (
                    <textarea rows={4} className="witcher-input font-sans resize-y min-h-[80px]" value={val(q.id)} onChange={(e) => set(q.id, e.target.value)} />
                  )}
                  {q.type === 2 && (
                    <div className="flex flex-col gap-2.5">
                      {q.opts.map((o) => {
                        const active = val(q.id) === o;
                        return (
                          <motion.label
                            key={o}
                            whileTap={{ scale: 0.985 }}
                            className="relative cursor-pointer text-left px-4 py-3 border font-sans text-sm transition-all flex items-center gap-3"
                            style={{
                              background: active ? 'rgba(216,176,90,0.15)' : 'rgba(26,5,11,0.4)',
                              borderColor: active ? '#D8B05A' : 'rgba(244,239,227,0.15)',
                              color: active ? '#D8B05A' : 'rgba(244,239,227,0.85)',
                              boxShadow: active ? '0 0 20px rgba(196,164,90,0.18)' : 'none',
                            }}
                          >
                            <input type="radio" name={q.id} value={o} checked={active} onChange={() => set(q.id, o)} className="sr-only" />
                            <span className="shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                              style={{ borderColor: active ? '#D8B05A' : 'rgba(244,239,227,0.35)', background: active ? '#D8B05A' : 'transparent' }}>
                              {active && <Check size={10} color="#1a050b" />}
                            </span>
                            <span>{o}</span>
                          </motion.label>
                        );
                      })}
                    </div>
                  )}
                  {err(q) && <p className="font-sans text-xs mt-1.5" style={{ color: '#E07A7A' }}>Cette question est obligatoire</p>}
                </div>
              ))}

              <div className="pt-8 flex flex-col items-start gap-4" style={{ borderTop: '1px solid rgba(244,239,227,0.10)' }}>
                <motion.button
                  type="submit"
                  disabled={state === 'sending'}
                  whileHover={reduce ? undefined : { y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="group inline-flex items-center gap-4 px-10 md:px-14 py-5 font-sans uppercase tracking-[0.3em] text-sm disabled:opacity-60"
                  style={{
                    color: '#1a050b', fontWeight: 600,
                    background: 'linear-gradient(180deg, #E8C87A 0%, #D8B05A 55%, #B98F3E 100%)',
                    clipPath: 'polygon(22px 0, 100% 0, calc(100% - 22px) 100%, 0 100%)',
                    boxShadow: '0 0 48px -8px rgba(216,176,90,0.65), 0 18px 40px -14px rgba(0,0,0,0.8)',
                  }}
                >
                  {state === 'sending' ? 'Envoi…' : 'Envoyer'}
                  <span aria-hidden className="inline-block w-6 h-px bg-[#1a050b]/70 transition-all group-hover:w-12" />
                </motion.button>
                {state === 'error' && <p className="font-sans text-sm" style={{ color: '#E07A7A' }}>L’envoi n’a pas passé. Vérifiez votre connexion et réessayez.</p>}
                {touched && missing.length > 0 && <p className="font-sans text-sm" style={{ color: '#E07A7A' }}>Des questions obligatoires sont sans réponse.</p>}
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
};

export default FaubourgPage;
