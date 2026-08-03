import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, Facebook, ArrowUpRight, Stars } from 'lucide-react';
import { ANNONCES, type Annonce } from '../../content/annonces';
import { NoticeBoard, Parchment, seedTilt, type PinTone } from '../board/NoticeBoard';
import PetiteMonnaieCoin from '../PetiteMonnaieCoin';
import { SITE } from '../../content';

// Les annonces ouvrent l'espace client : c'est la première chose vue en
// arrivant. Elles s'épinglent depuis le 2026-08-03 sur le même panneau de
// bois que le tableau des marchands, à la demande d'Alex : un seul objet
// pour tous les avis du festival, kiosques comme festivaliers.
//
// Le clou dit le ton : cire rouge pour une consigne, laiton pour un bon à
// savoir, or pour un appel à participer.
const PIN_PAR_TON: Record<Annonce['tone'], PinTone> = {
  alerte: 'cire',
  info:   'laiton',
  appel:  'or',
};

const AnnoncesPanel: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  if (ANNONCES.length === 0) return null;

  return (
    <section aria-labelledby="annonces-title" className="mb-10 md:mb-14">
      <div
        className="flex items-center justify-between gap-4 mb-6 md:mb-8 pb-2"
        style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.10)' }}
      >
        <span id="annonces-title" className="witcher-stat-label">
          {fr ? 'Avis de la caravane' : 'Caravan notices'}
        </span>
        <span
          className="font-sans text-sm tracking-[0.2em]"
          style={{ color: '#D8B05A', fontWeight: 300 }}
        >
          {ANNONCES.length}
        </span>
      </div>

      <NoticeBoard className="w-full" gridClassName="sm:grid-cols-2">
        {ANNONCES.map((a, i) => (
          <AnnonceNotice key={a.id} a={a} lang={lang} index={i} />
        ))}
      </NoticeBoard>

      {/* Le fil Facebook n'est pas branché : tirer les publications
          demande un jeton de page Meta côté serveur. En attendant, on
          renvoie honnêtement à la page plutôt que de simuler un fil. */}
      <a
        href={SITE.social.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-6 md:mt-8 flex items-center justify-between gap-4 p-5 border transition-colors"
        style={{
          borderColor: 'rgba(244, 239, 227, 0.12)',
          background: 'rgba(26, 5, 11, 0.5)',
        }}
      >
        <span className="flex items-center gap-4 min-w-0">
          <span className="witcher-tile shrink-0" style={{ width: 42, height: 42 }}>
            <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}>
              <Facebook size={15} />
            </span>
          </span>
          <span className="min-w-0">
            <span
              className="block font-sans uppercase tracking-[0.25em] text-[11px] mb-1"
              style={{ color: 'var(--color-bone)' }}
            >
              {fr ? 'Nouvelles de la page Facebook' : 'News from the Facebook page'}
            </span>
            <span
              className="block font-sans text-[13px] leading-snug"
              style={{ color: 'rgba(244,239,227,0.5)', fontWeight: 300 }}
            >
              {fr
                ? 'Les publications du festival, au fil des jours.'
                : 'The festival’s posts, day by day.'}
            </span>
          </span>
        </span>
        <ArrowUpRight
          size={16}
          className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          style={{ color: '#D8B05A' }}
        />
      </a>
    </section>
  );
};

// ─── Un avis épinglé ─────────────────────────────────────────────
// Encre sur parchemin : le titre au centre comme sur le tableau des
// marchands, le corps aligné à gauche parce qu'un paragraphe centré de
// cette longueur ne se lit pas.
const AnnonceNotice: React.FC<{ a: Annonce; lang: 'FR' | 'EN'; index: number }> = ({ a, lang, index }) => {
  const fr = lang === 'FR';
  const Icon = a.tone === 'alerte' ? AlertTriangle : a.tone === 'appel' ? Stars : Info;
  const encre = a.tone === 'alerte' ? '#8d2f1e' : '#7a4a1a';
  const tag = a.tone === 'alerte'
    ? (fr ? 'Consigne'    : 'Rule')
    : a.tone === 'appel'
    ? (fr ? 'Appel'       : 'Call')
    : (fr ? 'Bon à savoir' : 'Good to know');

  return (
    <Parchment tilt={seedTilt(a.id)} pin={PIN_PAR_TON[a.tone]}>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: Math.min(0.1 + index * 0.05, 0.6) }}
      >
        <div className="flex justify-center mb-2.5" style={{ color: encre }}>
          <Icon size={17} strokeWidth={1.6} />
        </div>
        <p
          className="font-sans text-[10px] uppercase tracking-[0.35em] text-center mb-2"
          style={{ color: encre }}
        >
          {tag}
        </p>
        <h3 className="font-display text-lg md:text-xl text-[#2a1505] text-center mb-3 leading-snug">
          {fr ? a.titleFR : a.titleEN}
        </h3>
        <p className="font-sans text-[13px] md:text-sm text-[#3a2618] leading-[1.65]">
          {fr ? a.bodyFR : a.bodyEN}
        </p>

        {a.cta && (
          <div className="text-center mt-5">
            <a
              href={a.cta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 font-sans uppercase tracking-[0.2em] text-[11px] transition-colors"
              style={{ border: '1px solid rgba(122, 74, 26, 0.55)', color: '#2a1505' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122, 74, 26, 0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {fr ? a.cta.labelFR : a.cta.labelEN}
              <ArrowUpRight size={13} />
            </a>
          </div>
        )}

        {a.piece && (
          <a
            href={a.lienPiece}
            target={a.lienPiece?.startsWith('http') ? '_blank' : undefined}
            rel={a.lienPiece?.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="group flex items-center gap-4 mt-5 pt-4 transition-opacity hover:opacity-100 opacity-90"
            style={{ borderTop: '1px solid rgba(122, 74, 26, 0.3)' }}
          >
            <PetiteMonnaieCoin className="w-14 h-14 shrink-0" flotte={false} />
            <span className="min-w-0">
              <span
                className="block font-sans uppercase tracking-[0.25em] text-[10px] mb-1"
                style={{ color: '#2a1505' }}
              >
                {fr ? 'La Petite Monnaie' : 'The Petite Monnaie'}
              </span>
              <span
                className="block font-sans text-[12px] leading-snug"
                style={{ color: '#5b3b1a' }}
              >
                {fr ? 'La monnaie locale de la Petite-Nation.' : 'The local currency of Petite-Nation.'}
              </span>
            </span>
            <ArrowUpRight
              size={14}
              className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              style={{ color: '#7a4a1a' }}
            />
          </a>
        )}
      </motion.div>
    </Parchment>
  );
};

export default AnnoncesPanel;
