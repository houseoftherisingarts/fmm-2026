import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Le billet du Banquet du Prince William, tel qu'il apparaît dans le coffre.
// Un vrai billet de papier : parchemin, encre de vin, talon détachable, un
// sceau de cire et deux coupes qui trinquent quand la souris passe dessus.
// La palette reste la même sur toutes les peaux du site, parce qu'un
// billet se montre au soleil à l'entrée du banquet et doit se lire là.
// Le document vient de banquetTickets/{courriel} : { nom, places, numero }.

export type BilletBanquetDonnees = { nom?: string; places: number; numero?: string };

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .42 0 0 0 0 .27 0 0 0 0 .12 0 0 0 .11 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`;

const CSS = `
.bb { --papier:#f3ead6; --encre:#3b1219; --encre-douce:#6b3b35; --or:#8d6421; --cire:#9a2a22;
  --talon:132px; --creux:13px; position:relative; filter:drop-shadow(0 18px 28px rgba(8,2,4,.45)) drop-shadow(0 2px 3px rgba(8,2,4,.35)); }
.bb-papier { position:relative; display:grid; grid-template-columns:1fr var(--talon); color:var(--encre);
  background:${GRAIN}, radial-gradient(130% 120% at 30% 20%, #f8f1df 0%, var(--papier) 55%, #e6d6b4 100%);
  border-radius:15px;
  -webkit-mask: radial-gradient(circle var(--creux) at calc(100% - var(--talon)) 0, #0000 98%, #000) , radial-gradient(circle var(--creux) at calc(100% - var(--talon)) 100%, #0000 98%, #000);
  -webkit-mask-composite: source-in; mask-composite: intersect; }
.bb-cadre { position:absolute; inset:9px; border:1px solid color-mix(in oklab, var(--or) 55%, transparent); border-radius:9px; pointer-events:none; }
.bb-cadre::after { content:''; position:absolute; inset:3px; border:1px solid color-mix(in oklab, var(--or) 25%, transparent); border-radius:7px; }
.bb-talon { position:relative; border-left:2px dashed color-mix(in oklab, var(--encre) 28%, transparent); }
.bb-coupes .bb-g { transform-box:fill-box; transition:transform .45s cubic-bezier(.22,1,.36,1); }
.bb-coupes .bb-gg { transform-origin:100% 100%; } .bb-coupes .bb-gd { transform-origin:0% 100%; }
.bb:hover .bb-gg { transform:rotate(9deg); } .bb:hover .bb-gd { transform:rotate(-9deg); }
.bb-etoile { transform-box:fill-box; transform-origin:center; transition:transform .5s cubic-bezier(.22,1,.36,1), opacity .5s; opacity:.55; }
.bb:hover .bb-etoile { transform:scale(1.35) rotate(20deg); opacity:1; }
@media (max-width: 639px) {
  .bb-coupes { width:64px; height:58px; }
  .bb { --talon:112px; }
  .bb-papier { grid-template-columns:1fr; grid-template-rows:auto var(--talon);
    -webkit-mask: radial-gradient(circle var(--creux) at 0 calc(100% - var(--talon)), #0000 98%, #000), radial-gradient(circle var(--creux) at 100% calc(100% - var(--talon)), #0000 98%, #000);
    -webkit-mask-composite: source-in; mask-composite: intersect; }
  .bb-talon { border-left:0; border-top:2px dashed color-mix(in oklab, var(--encre) 28%, transparent); }
}
@media (prefers-reduced-motion: reduce) { .bb * { transition:none !important; } }
`;

// Deux coupes qui trinquent sous une petite couronne.
const Coupes: React.FC = () => (
  <svg className="bb-coupes" viewBox="0 0 96 88" width="88" height="80" aria-hidden="true">
    <g className="bb-g bb-gg">
      <path d="M14 22 h26 c0 12 -5 22 -13 22 s-13 -10 -13 -22z" fill="#9a2a22" stroke="#3b1219" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M16.5 27 h21" stroke="#f3ead6" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
      <path d="M27 44 v18 M19 66 h16" stroke="#3b1219" strokeWidth="2.4" strokeLinecap="round" />
    </g>
    <g className="bb-g bb-gd">
      <path d="M56 22 h26 c0 12 -5 22 -13 22 s-13 -10 -13 -22z" fill="#a87a2c" stroke="#3b1219" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M58.5 27 h21" stroke="#f3ead6" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
      <path d="M69 44 v18 M61 66 h16" stroke="#3b1219" strokeWidth="2.4" strokeLinecap="round" />
    </g>
    <path d="M38 12 l4 -7 l6 5 l6 -5 l4 7 z" fill="#a87a2c" stroke="#3b1219" strokeWidth="1.8" strokeLinejoin="round" />
    <path className="bb-etoile" d="M10 8 l1.6 3.6 l3.6 1.6 l-3.6 1.6 l-1.6 3.6 l-1.6 -3.6 l-3.6 -1.6 l3.6 -1.6z" fill="#a87a2c" />
    <path className="bb-etoile" d="M86 6 l1.2 2.8 l2.8 1.2 l-2.8 1.2 l-1.2 2.8 l-1.2 -2.8 l-2.8 -1.2 l2.8 -1.2z" fill="#9a2a22" />
    <path className="bb-etoile" d="M48 78 l1 2.2 l2.2 1 l-2.2 1 l-1 2.2 l-1 -2.2 l-2.2 -1 l2.2 -1z" fill="#a87a2c" />
  </svg>
);

// Le sceau de cire, bord irrégulier, initiales du Prince William en relief.
const Sceau: React.FC = () => (
  <svg viewBox="0 0 64 64" width="58" height="58" aria-hidden="true">
    <defs>
      <radialGradient id="bb-cire" cx="38%" cy="32%" r="70%">
        <stop offset="0" stopColor="#c2463a" /><stop offset=".55" stopColor="#9a2a22" /><stop offset="1" stopColor="#6c1914" />
      </radialGradient>
    </defs>
    <path d="M32 3 c5 0 7 3 11 4 s8 1 10 5 s0 7 2 11 s5 6 4 10 s-4 6 -5 10 s0 8 -4 10 s-7 0 -11 2 s-6 5 -10 4 s-5 -4 -9 -5 s-8 0 -10 -4 s1 -7 -1 -11 s-6 -6 -5 -10 s5 -5 6 -9 s0 -8 4 -10 s7 1 11 -1 s4 -6 7 -6z" fill="url(#bb-cire)" />
    <circle cx="32" cy="32" r="17" fill="none" stroke="#5a130f" strokeOpacity=".55" strokeWidth="1.5" />
    <circle cx="32" cy="32" r="17" fill="none" stroke="#e58b7c" strokeOpacity=".35" strokeWidth=".8" transform="translate(-.8 -.8)" />
    <text x="32" y="37.5" textAnchor="middle" fontFamily="Cinzel Decorative, Cinzel, Georgia, serif" fontSize="15" fontWeight="700" fill="#5a130f" fillOpacity=".85">PW</text>
    <text x="31.3" y="36.8" textAnchor="middle" fontFamily="Cinzel Decorative, Cinzel, Georgia, serif" fontSize="15" fontWeight="700" fill="#e58b7c" fillOpacity=".4">PW</text>
  </svg>
);

const BilletBanquet: React.FC<{ billet: BilletBanquetDonnees; nomRepli?: string | null; fr: boolean }> = ({ billet, nomRepli, fr }) => {
  const calme = useReducedMotion();
  const places = Math.max(1, Number(billet.places) || 1);
  const nom = (billet.nom || nomRepli || '').trim();
  const t = fr
    ? { sur: 'Billet de banquet', quand: 'Quand', lieu: 'Où', nom: 'Au nom de', date: 'Dimanche 27 septembre, 13 h 30', village: 'Village Nourriture',
        pied: 'Présentez ce billet à l’entrée du banquet.', table: 'À la table', couverts: places > 1 ? 'couverts' : 'couvert' }
    : { sur: 'Banquet ticket', quand: 'When', lieu: 'Where', nom: 'In the name of', date: 'Sunday, September 27, 1:30 pm', village: 'Food Village',
        pied: 'Show this ticket at the banquet entrance.', table: 'At the table', couverts: places > 1 ? 'seats' : 'seat' };
  const etiquette = 'font-display-alt uppercase tracking-[0.22em] text-[11px]';

  return (
    <motion.div
      className="bb mb-6"
      initial={calme ? false : { opacity: 0, y: 14, rotate: -1.2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <style>{CSS}</style>
      <div className="bb-papier" role="group" aria-label={`${t.sur} · Banquet du Prince William · ${places} ${t.couverts}`}>
        <span className="bb-cadre" />
        <div className="relative p-6 md:p-7 flex flex-col sm:flex-row gap-3 sm:gap-5 min-w-0">
          <div className="shrink-0 sm:pt-1"><Coupes /></div>
          <div className="min-w-0 flex-1">
            <p className={etiquette} style={{ color: 'var(--or)' }}>{t.sur}</p>
            <h3 className="font-display text-[22px] md:text-[26px] leading-[1.15] mt-1.5" style={{ color: 'var(--encre)', fontWeight: 700 }}>
              Banquet du Prince&nbsp;William
            </h3>
            <div className="flex items-center gap-2 my-4" aria-hidden="true">
              <span className="h-px flex-1" style={{ background: 'color-mix(in oklab, var(--or) 60%, transparent)' }} />
              <span className="w-1.5 h-1.5 rotate-45" style={{ background: 'var(--or)' }} />
              <span className="h-px flex-1" style={{ background: 'color-mix(in oklab, var(--or) 60%, transparent)' }} />
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 font-editorial text-[17px] leading-snug">
              <div><dt className={etiquette} style={{ color: 'var(--encre-douce)' }}>{t.quand}</dt><dd className="font-semibold">{t.date}</dd></div>
              <div><dt className={etiquette} style={{ color: 'var(--encre-douce)' }}>{t.lieu}</dt><dd className="font-semibold">{t.village}</dd></div>
              {nom && <div className="sm:col-span-2"><dt className={etiquette} style={{ color: 'var(--encre-douce)' }}>{t.nom}</dt><dd className="font-semibold">{nom}</dd></div>}
            </dl>
            <p className="font-sans text-[11px] mt-4 tracking-wide" style={{ color: 'var(--encre-douce)' }}>{t.pied}</p>
          </div>
        </div>

        <div className="bb-talon flex sm:flex-col items-center justify-center gap-4 sm:gap-1 px-4 py-3 text-center">
          <div className="flex flex-col items-center">
            <p className={etiquette} style={{ color: 'var(--or)' }}>{t.table}</p>
            <p className="font-display leading-none text-[52px] mt-1" style={{ color: 'var(--encre)', fontWeight: 700 }}>{places}</p>
            <p className="font-editorial text-[16px] font-semibold -mt-0.5">{t.couverts}</p>
          </div>
          <motion.div
            className="sm:mt-2"
            initial={calme ? false : { scale: 1.5, opacity: 0, rotate: -40 }}
            animate={{ scale: 1, opacity: 1, rotate: -14 }}
            transition={{ delay: 0.45, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Sceau />
          </motion.div>
          {billet.numero && (
            <p className="font-sans text-[10px] tracking-[0.2em] sm:mt-1" style={{ color: 'var(--encre-douce)' }}>N° {billet.numero}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BilletBanquet;
