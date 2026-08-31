import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, Facebook, ArrowUpRight, Stars, Check } from 'lucide-react';
import { ANNONCES, type Annonce } from '../../content/annonces';
import { NoticeBoard, Parchment, seedTilt, type PinTone } from '../board/NoticeBoard';
import PetiteMonnaieCoin from '../PetiteMonnaieCoin';
import { SITE } from '../../content';
import { useAuth } from '../../contexts/AuthContext';
import { useBadges } from '../../contexts/BadgesContext';
import { accepterAvis, suivreMesAvis } from '../../firebase/avis';

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
  const { user, openSignIn } = useAuth();
  const { gagnerBadge } = useBadges();
  // Les avis décrochés quittent le tableau : le babillard ne montre que
  // ce qui reste à prendre (Alex, 2026-08-23).
  const [pris, setPris] = useState<string[]>([]);
  useEffect(() => {
    if (!user?.uid) { setPris([]); return; }
    return suivreMesAvis(user.uid, setPris);
  }, [user?.uid]);

  // Un avis pris vaut un badge, et les quatre valent la collection.
  useEffect(() => {
    if (pris.length === 0) return;
    for (let i = 1; i <= Math.min(pris.length, 4); i += 1) gagnerBadge(`billet-${i}`);
  }, [pris.length, gagnerBadge]);

  const accepter = (id: string) => {
    if (!user?.uid) { openSignIn(); return; }
    void accepterAvis(
      user.uid, id,
      user.displayName || '', user.email || '',
    );
  };

  const restants = ANNONCES.filter((a) => !pris.includes(a.id));
  if (ANNONCES.length === 0) return null;

  return (
    <section aria-labelledby="annonces-title" className="mb-10 md:mb-14">
      <div
        className="flex items-center justify-between gap-4 mb-6 md:mb-8 pb-2"
        style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}
      >
        <span id="annonces-title" className="witcher-stat-label">
          {fr ? 'Avis de la caravane' : 'Caravan notices'}
        </span>
        <span
          className="font-sans text-sm tracking-[0.2em]"
          style={{ color: 'var(--sk-gilt)', fontWeight: 300 }}
        >
          {restants.length} / {ANNONCES.length}
        </span>
      </div>

      {/* Ma collection d'abord : le chiffre du profil pointe ici, donc
          la personne doit voir ce qu'elle a décroché avant le reste
          (Alex, 2026-08-23). */}
      {pris.length > 0 && (
        <div className="mb-7 rounded-lg-card border border-brass/25 px-6 py-5"
             style={{ background: 'rgba(var(--sk-deep-rgb), 0.45)' }}>
          <p className="witcher-stat-label mb-3">
            {fr ? 'Mes avis décrochés' : 'Notices I have taken'}
          </p>
          <ul className="space-y-2">
            {ANNONCES.filter((a) => pris.includes(a.id)).map((a) => (
              <li key={a.id} className="font-editorial text-sm text-ivory-soft flex items-start gap-2.5">
                <Check size={14} className="text-brass shrink-0 mt-0.5" />
                <span>
                  <span className="text-ivory">{fr ? a.titleFR : a.titleEN}</span>
                  <span className="block text-[13px] text-ivory-soft/70">
                    {(fr ? a.bodyFR : a.bodyEN).split('\n\n')[0].slice(0, 120)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="font-sans text-[11px] text-ivory-soft/55 mt-4">
            {fr
              ? `${pris.length} sur ${ANNONCES.length}. Les quatre réunis ouvrent la collection du babillard.`
              : `${pris.length} of ${ANNONCES.length}. All four open the notice board collection.`}
          </p>
        </div>
      )}

      {restants.length > 0 ? (
        <NoticeBoard className="w-full" gridClassName="sm:grid-cols-2">
          {restants.map((a, i) => (
            <AnnonceNotice key={a.id} a={a} lang={lang} index={i} onAccepter={() => accepter(a.id)} />
          ))}
        </NoticeBoard>
      ) : (
        <div className="rounded-lg-card border border-brass/30 px-7 py-10 text-center"
             style={{ background: 'rgba(var(--sk-deep-rgb), 0.5)' }}>
          <p className="font-display title-medieval text-xl text-ivory mb-2">
            {fr ? 'Le babillard est vide' : 'The board is empty'}
          </p>
          <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
            {fr
              ? 'Les quatre avis sont dans votre collection, plus bas.'
              : 'All four notices are in your collection, further down.'}
          </p>
        </div>
      )}

      {/* Le fil Facebook n'est pas branché : tirer les publications
          demande un jeton de page Meta côté serveur. En attendant, on
          renvoie honnêtement à la page plutôt que de simuler un fil. */}
      <a
        href={SITE.social.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-6 md:mt-8 flex items-center justify-between gap-4 p-5 border transition-colors"
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
            <span
              className="block font-sans uppercase tracking-[0.25em] text-[11px] mb-1"
              style={{ color: 'var(--color-bone)' }}
            >
              {fr ? 'Nouvelles de la page Facebook' : 'News from the Facebook page'}
            </span>
            <span
              className="block font-sans text-[13px] leading-snug"
              style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)', fontWeight: 300 }}
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
          style={{ color: 'var(--sk-gilt)' }}
        />
      </a>
    </section>
  );
};

// ─── Un avis épinglé ─────────────────────────────────────────────
// Encre sur parchemin : le titre au centre comme sur le tableau des
// marchands, le corps aligné à gauche parce qu'un paragraphe centré de
// cette longueur ne se lit pas.
const AnnonceNotice: React.FC<{
  a: Annonce; lang: 'FR' | 'EN'; index: number; onAccepter?: () => void;
}> = ({ a, lang, index, onAccepter }) => {
  const fr = lang === 'FR';
  const Icon = a.tone === 'alerte' ? AlertTriangle : a.tone === 'appel' ? Stars : Info;
  const encre = a.tone === 'alerte' ? '#8d2f1e' : 'var(--sk-brass-deep)';
  const tag = a.tone === 'alerte'
    ? (fr ? 'Consigne'    : 'Rule')
    : a.tone === 'appel'
    ? (fr ? 'Appel'       : 'Call')
    : (fr ? 'Bon à savoir' : 'Good to know');

  return (
    // Marge plus large que sur le tableau des marchands : les avis sont de
    // vrais paragraphes, et le parchemin a des bords déchirés. Le texte
    // doit rester dans la zone plate de la feuille.
    <Parchment tilt={seedTilt(a.id)} pin={PIN_PAR_TON[a.tone]} className="px-9 py-9 md:px-12 md:py-10">
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
        <h3 className="font-display text-lg md:text-xl text-[var(--sk-brown-deep)] text-center mb-3 leading-snug">
          {fr ? a.titleFR : a.titleEN}
        </h3>
        {/* Les alinéas de l'auteur sont respectés : un avis long se lit
            en paragraphes, pas en pavé. Séparateur : une ligne vide. */}
        {(fr ? a.bodyFR : a.bodyEN).split('\n\n').map((para, i) => (
          <p
            key={i}
            className="font-sans text-[13px] md:text-sm text-[#3a2618] leading-[1.65] text-pretty mt-3 first:mt-0"
          >
            {para}
          </p>
        ))}

        {onAccepter && (
          <div className="text-center mt-5">
            <button
              type="button"
              onClick={onAccepter}
              className="inline-flex items-center gap-2 px-5 py-2.5 font-sans uppercase tracking-[0.2em] text-[11px] transition-colors"
              style={{ border: '1px solid rgba(var(--sk-copper-deep-rgb), 0.55)', color: 'var(--sk-brown-deep)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--sk-copper-deep-rgb), 0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Check size={13} /> {fr ? 'Accepté' : 'Accepted'}
            </button>
          </div>
        )}

        {a.cta && (
          <div className="text-center mt-5">
            <a
              href={a.cta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 font-sans uppercase tracking-[0.2em] text-[11px] transition-colors"
              style={{ border: '1px solid rgba(var(--sk-copper-deep-rgb), 0.55)', color: 'var(--sk-brown-deep)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--sk-copper-deep-rgb), 0.12)'; }}
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
            style={{ borderTop: '1px solid rgba(var(--sk-copper-deep-rgb), 0.3)' }}
          >
            <PetiteMonnaieCoin className="w-14 h-14 shrink-0" flotte={false} />
            <span className="min-w-0">
              <span
                className="block font-sans uppercase tracking-[0.25em] text-[10px] mb-1"
                style={{ color: 'var(--sk-brown-deep)' }}
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
              style={{ color: 'var(--sk-brass-deep)' }}
            />
          </a>
        )}
      </motion.div>
    </Parchment>
  );
};

export default AnnoncesPanel;
