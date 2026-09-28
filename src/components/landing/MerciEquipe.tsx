import React from 'react';
import EmberCanvas from '../vendor/EmberCanvas';

// ─── La page de remerciements, au bout du prologue ──────────────────
// Alex, 2026-09-28 : après l'édition Caravanes et Saltimbanques, le
// film promo qui suivait le défilement du chevalier cède sa place à
// ce mot de l'équipe. Le film reste dans la galerie de la page
// Histoire. La photo est recadrée à la poutre de la scène
// (public/merci/), et le texte est celui d'Alex, sans émojis.

const TITLE_FONT = '"Marcellus", "Cinzel", "Cinzel Decorative", Georgia, serif';
const BODY_FONT = '"Cormorant Garamond", Georgia, serif';
const LABEL_FONT = '"Cormorant SC", "Cormorant Garamond", Georgia, serif';
const IVORY = '#EAEFF6';
const GOLD = '#E3C27A';

const PARAGRAPHES = [
  'Un immense merci pour cette incroyable édition ! Voici les visages heureux derrière l’organisation du festival. De gauche à droite : Léna, Éric, Jesse, Maïté, Mikael, Océane, Arnaud, Alex, Tristan et Thierry. Mention spéciale à Joëlle qui n’a pas pu être sur la photo.',
  'Il y a aussi tous les bénévoles, la municipalité de Montpellier, les pompiers, les partenaires, les loisirs, les artistes, les exposant-es et tout un ensemble de personnes incroyables qui permettent de faire exister ce festival...!',
  'On se repose juste un petit peu et on attaque déjà la préparation de la prochaine édition !',
];

const MerciEquipe: React.FC<{ onEnter: () => void }> = ({ onEnter }) => (
  <div className="absolute inset-0" style={{ background: '#07080c' }}>
  <div className="absolute inset-0 overflow-y-auto overscroll-contain">
    <div className="relative w-full">
      <img
        src="/merci/equipe-2026.webp"
        srcSet="/merci/equipe-2026-1024.webp 1024w, /merci/equipe-2026.webp 2048w"
        sizes="100vw"
        alt="L’équipe d’organisation du Festival Médiéval de Montpellier 2026 sur la grande scène"
        className="block w-full object-cover"
        style={{ height: 'min(62vh, 46.2vw)', objectPosition: '50% 30%' }}
        decoding="async"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%]"
           style={{ background: 'linear-gradient(to bottom, rgba(7,8,12,0), #07080c)' }} />
    </div>

    <div className="px-5 sm:px-[6vw] pt-6 lg:pt-8 pb-28">
      <p className="uppercase text-[11px] sm:text-xs tracking-[0.35em] mb-4" style={{ color: GOLD, fontFamily: LABEL_FONT }}>
        Caravanes et Saltimbanques · 2026
      </p>
      <h2 style={{ fontFamily: TITLE_FONT, color: IVORY, fontSize: 'clamp(1.75rem, 3.4vw, 3.2rem)', lineHeight: 1.15, letterSpacing: '0.02em', textShadow: '0 2px 14px rgba(0,0,0,0.85)' }}>
        Un immense merci pour cette édition 2026,{' '}
        <span style={{ color: GOLD }}>on se revoit en 2027 !</span>
      </h2>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 rounded-[15px] border border-white/15 bg-white/[0.04] backdrop-blur-md px-6 py-6 sm:px-8 sm:py-7"
           style={{ boxShadow: '0 0 40px rgba(227,194,122,0.06)' }}>
        {PARAGRAPHES.map((p) => (
          <p key={p.slice(0, 16)} style={{ fontFamily: BODY_FONT, color: IVORY, fontSize: 'clamp(1.05rem, 1.25vw, 1.25rem)', lineHeight: 1.6 }}>
            {p}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={onEnter}
        className="mt-7 inline-flex min-h-[48px] items-center gap-3 rounded-[15px] border px-6 py-3 uppercase text-xs tracking-[0.28em] backdrop-blur-md outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#D7DEE8]"
        style={{ borderColor: `${GOLD}99`, color: IVORY, background: 'rgba(0,0,0,0.4)', fontFamily: LABEL_FONT }}
      >
        Entrer au festival →
      </button>
    </div>
  </div>
  {/* Les braises du site montent par-dessus la photo et le texte. */}
  <div className="pointer-events-none absolute inset-0 z-10">
    <EmberCanvas className="opacity-80" count={40} />
  </div>
  </div>
);

export default MerciEquipe;
