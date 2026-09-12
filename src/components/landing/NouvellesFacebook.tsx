import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight, Facebook, Images, PlayCircle } from 'lucide-react';
import { NoticeBoard, Parchment, seedTilt } from '../board/NoticeBoard';
import { SITE } from '../../content';
import { suivreNouvelles, type FilFacebook, type Publication } from '../../firebase/nouvelles';

// Les nouvelles de la page Facebook, épinglées sous les avis de la
// caravane sur le même panneau de bois (Alex, 2026-09-12). Le fil se
// recopie chaque matin côté serveur; ici on ne fait que l'afficher.
// Le bouton « Nouvelles » de la barre mène à `#nouvelles`.

export const ANCRE_NOUVELLES = 'nouvelles';

const NouvellesFacebook: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const [fil, setFil] = useState<FilFacebook | null | undefined>(undefined);
  useEffect(() => suivreNouvelles(setFil), []);

  // Arrivée par le bouton « Nouvelles » depuis une autre page : la
  // section se met elle-même en vue une fois montée, parce que le
  // navigateur a déjà raté l'ancre pendant que l'accueil se chargeait.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== `#${ANCRE_NOUVELLES}`) return;
    const t = window.setTimeout(() => {
      document.getElementById(ANCRE_NOUVELLES)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
    return () => window.clearTimeout(t);
  }, [hash, fil === undefined]);

  const publications = fil?.publications ?? [];
  const misAJour = fil?.misAJour
    ? fil.misAJour.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long' })
    : null;

  return (
    <section
      id={ANCRE_NOUVELLES}
      aria-labelledby="nouvelles-title"
      className="scroll-mt-20"
    >
      <div
        className="flex items-center justify-between gap-4 mb-6 md:mb-8 pb-2"
        style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}
      >
        <span id="nouvelles-title" className="witcher-stat-label">
          {fr ? 'Nouvelles de la caravane' : 'Caravan news'}
        </span>
        <a
          href={SITE.social.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.22em] transition-colors"
          style={{ color: 'var(--sk-gilt)', fontWeight: 300 }}
        >
          <Facebook size={13} />
          <span className="hidden sm:inline">
            {misAJour
              ? (fr ? `Facebook · à jour le ${misAJour}` : `Facebook · updated ${misAJour}`)
              : 'Facebook'}
          </span>
          <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </div>

      {publications.length > 0 ? (
        <NoticeBoard className="w-full" gridClassName="sm:grid-cols-2 lg:grid-cols-3">
          {publications.map((p) => <PublicationEpinglee key={p.id} p={p} lang={lang} />)}
        </NoticeBoard>
      ) : (
        // Rien de recopié encore (jeton absent, ou première nuit pas
        // passée) : on renvoie honnêtement à la page plutôt que de
        // simuler un fil.
        <a
          href={SITE.social.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-4 p-5 border transition-colors"
          style={{
            borderColor: 'rgba(var(--sk-parchment-rgb), 0.12)',
            background: 'rgba(var(--sk-deep-rgb), 0.5)',
          }}
        >
          <span className="flex items-center gap-4 min-w-0">
            <span className="witcher-tile shrink-0" style={{ width: 42, height: 42 }}>
              <span className="witcher-tile-inner" style={{ color: 'var(--sk-gilt)' }}>
                <Facebook size={15} />
              </span>
            </span>
            <span className="min-w-0">
              <span className="block font-sans uppercase tracking-[0.25em] text-[11px] mb-1" style={{ color: 'var(--color-bone)' }}>
                {fr ? 'Les nouvelles arrivent chaque matin' : 'News arrive every morning'}
              </span>
              <span className="block font-sans text-[13px] leading-snug" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)', fontWeight: 300 }}>
                {fr
                  ? 'En attendant, les publications du festival se lisent sur la page Facebook.'
                  : 'Until then, the festival’s posts are on the Facebook page.'}
              </span>
            </span>
          </span>
          <ArrowUpRight size={16} className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" style={{ color: 'var(--sk-gilt)' }} />
        </a>
      )}
    </section>
  );
};

// ─── Une publication épinglée ────────────────────────────────────
// La photo d'abord, collée comme une gravure sur le parchemin, la date
// en petites capitales, le texte en dessous, coupé net après quelques
// lignes : la suite se lit sur Facebook. Tout le parchemin est le lien.
const PublicationEpinglee: React.FC<{ p: Publication; lang: 'FR' | 'EN' }> = ({ p, lang }) => {
  const fr = lang === 'FR';
  const date = new Date(p.date).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'long' });
  const encre = 'var(--sk-brass-deep)';
  return (
    <Parchment tilt={seedTilt(p.id)} pin="laiton" className="px-8 py-8 md:px-9 md:py-9">
      <a href={p.lien} target="_blank" rel="noopener noreferrer" className="group block">
        {p.image && (
          <span
            className="relative block aspect-[4/3] mb-4 overflow-hidden"
            style={{
              boxShadow: '0 1px 0 rgba(255,255,255,0.35), 0 6px 14px -6px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(58,38,24,0.35)',
              filter: 'sepia(0.18) contrast(0.98)',
            }}
          >
            <img
              src={p.image}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            {(p.type === 'video' || p.type === 'album') && (
              <span
                className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-2 py-1 font-sans text-[10px] uppercase tracking-[0.2em]"
                style={{ background: 'rgba(20,4,10,0.72)', color: 'var(--color-bone)' }}
              >
                {p.type === 'video' ? <PlayCircle size={12} /> : <Images size={12} />}
                {p.type === 'video' ? (fr ? 'Vidéo' : 'Video') : (fr ? 'Album' : 'Album')}
              </span>
            )}
          </span>
        )}
        <p className="font-sans text-[10px] uppercase tracking-[0.35em] text-center mb-2.5" style={{ color: encre }}>
          {date}
        </p>
        {p.texte ? (
          <p
            // Sans photo, le texte est la seule chose sur la feuille :
            // il se lit plus gros, comme une lettre, sinon le parchemin
            // reste à moitié vide à côté des cartes illustrées.
            className={p.image
              ? 'font-sans text-[13px] md:text-sm text-[#3a2618] leading-[1.65] text-pretty whitespace-pre-line'
              : 'font-sans text-[15px] md:text-[17px] text-[#3a2618] leading-[1.7] text-pretty whitespace-pre-line'}
            style={{ display: '-webkit-box', WebkitLineClamp: p.image ? 6 : 12, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {p.texte}
          </p>
        ) : p.titreLien ? (
          <p className="font-display text-base text-[var(--sk-brown-deep)] text-center leading-snug">{p.titreLien}</p>
        ) : null}
        <span
          className="mt-4 inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.28em] transition-colors group-hover:text-[#5a3a12]"
          style={{ color: encre }}
        >
          {fr ? 'Lire sur Facebook' : 'Read on Facebook'}
          <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </a>
    </Parchment>
  );
};

export default NouvellesFacebook;
