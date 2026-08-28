import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Lock, MessageCircle, Pin, Share2, ShieldCheck } from 'lucide-react';
import VoteBar from '../components/mur/VoteBar';
import BilletCarte from '../components/mur/BilletCarte';
import type { PostMur } from '../firebase/mur';

const BILLET_VIDEO: PostMur = {
  id: 'demo-video', uid: 'demo-uid-video', nom: 'Morgane la Sage', avatarHue: 30,
  texte: 'Le montage du grand chapiteau, en accéléré — trois heures en deux minutes.',
  genre: 'billet',
  videoUrl: '/orb/festival-orbe.mp4',
  videoVignette: '/orb/caravan.webp',
  videoTitre: 'Le montage du chapiteau, en accéléré',
  videoDescription: 'Douze bénévoles, trois heures, un mât central qui refuse de coopérer jusqu’à la toute fin. La suite du chantier suit demain, avec les bannières et les guirlandes.',
  pour: 9, contre: 0, score: 9, nbCommentaires: 0,
  creeLe: null,
};

// ─── Banc d'essai : voter, commenter, partager ───────────────────────
// Alex, 2026-08-28 : vérification visuelle de la barre de vote, de la
// bulle au survol et de la carte de partage citée, sans compte ni
// Firestore — données factices seulement. `?apercu=1` (dev seulement),
// même patron que ChantierPage.tsx.

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nomsPour = async () => { await attendre(80); return ['Gwendal le Brave', 'Iseult', 'Corentin des Bois', 'Anne Robillard']; };
const nomsContre = async () => { await attendre(80); return ['Le Chevalier Grognon']; };

const VotesBancEssai: React.FC = () => {
  const location = useLocation();
  const apercu = import.meta.env.DEV && new URLSearchParams(location.search).get('apercu') === '1';
  const [monVote, setMonVote] = useState<1 | -1 | 0>(1);
  const [monVoteC1, setMonVoteC1] = useState<1 | -1 | 0>(1);
  const [monVoteC2, setMonVoteC2] = useState<1 | -1 | 0>(0);

  if (!apercu) {
    return (
      <main className="min-h-screen text-ivory flex items-center justify-center">
        <div className="glass-light rounded-lg-card p-10 text-center max-w-md">
          <Lock size={22} className="mx-auto mb-4 text-brass" />
          <p className="font-display text-xl">Chantier fermé</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-ivory bg-midnight-deep py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="font-display title-medieval text-2xl text-ivory">Banc d’essai — voter, commenter, partager</h1>

        {/* ── Le billet, épinglé, avec sa barre de vote et sa bulle ── */}
        <article className="rounded-lg-card p-5 md:p-6" style={{ background: 'rgba(38, 30, 52, 0.45)', border: '1px solid rgba(120, 130, 190, 0.32)' }}>
          <p className="flex items-center gap-1.5 mb-3 font-sans uppercase tracking-[0.18em] text-[9px]" style={{ color: '#D8B05A' }}>
            <Pin size={11} /> Épinglé par l’équipe
          </p>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-lg text-ivory/85"
                  style={{ background: 'hsl(200 40% 22%)' }}>G</span>
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-2 min-w-0">
                <span className="font-display text-base text-ivory truncate">Gwendal le Brave</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-sans uppercase tracking-[0.16em] text-[9px] shrink-0"
                      style={{ background: 'rgba(216,176,90,0.16)', border: '1px solid #D8B05A', color: '#D8B05A' }}>
                  <ShieldCheck size={10} /> Admin · Modérateur
                </span>
              </span>
              <p className="font-sans text-[11px] text-ivory-soft/55">2 h</p>
            </div>
          </div>
          <p className="font-editorial text-[15px] text-ivory leading-relaxed">
            Le feu s’allume à 18h45 ce soir — venez tôt pour les meilleures places autour du pit principal.
          </p>

          {/* Carte de partage citée */}
          <div className="mt-4 rounded-card p-4" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(244,239,227,0.14)' }}>
            <p className="font-sans text-[11px] text-ivory-soft/60 mb-1.5">Partagé de Morgane la Sage</p>
            <p className="font-display text-sm text-brass mb-1">Tarot de Marseille</p>
            <p className="font-editorial text-[13px] text-ivory-soft leading-relaxed">
              Voici mon tirage : la croix celtique. La situation penche vers un renouveau, et l’issue le confirme.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-4">
            <VoteBar
              fr pour={14} contre={2} score={12} monVote={monVote}
              onVoter={(v) => setMonVote(v === monVote ? 0 : v)}
              listerPour={nomsPour} listerContre={nomsContre}
              vertical
            />
            <span className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.14em] text-ivory-soft/70">
              <MessageCircle size={14} /> Commenter (2)
            </span>
            <span className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.14em] text-ivory-soft/70">
              <Share2 size={14} /> Partager
            </span>
          </div>

          {/* Deux commentaires, votés eux aussi */}
          <div className="mt-3 pt-3 border-t border-white/10 divide-y divide-white/5">
            <div className="flex gap-2.5 py-2.5 first:pt-0">
              <span className="rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-ivory/85"
                    style={{ width: 30, height: 30, background: 'hsl(30 40% 22%)', fontSize: 12 }}>I</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-display text-[13px] text-ivory">Iseult</span>
                  <span className="font-sans text-[10px] text-ivory-soft/45">1 h</span>
                </div>
                <p className="font-editorial text-[13px] text-ivory leading-relaxed mt-0.5">J’y serai, on garde une place au feu !</p>
                <div className="mt-1.5">
                  <VoteBar fr pour={5} contre={0} score={5} monVote={monVoteC1}
                           onVoter={(v) => setMonVoteC1(v === monVoteC1 ? 0 : v)}
                           listerPour={nomsPour} listerContre={nomsContre} petit />
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 py-2.5">
              <span className="rounded-full overflow-hidden shrink-0 border border-brass/30 flex items-center justify-center font-display text-ivory/85"
                    style={{ width: 30, height: 30, background: 'hsl(0 40% 22%)', fontSize: 12 }}>C</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-display text-[13px] text-ivory">Le Chevalier Grognon</span>
                  <span className="font-sans text-[10px] text-ivory-soft/45">45 min</span>
                </div>
                <p className="font-editorial text-[13px] text-ivory leading-relaxed mt-0.5">Encore un feu, vraiment ?</p>
                <div className="mt-1.5">
                  <VoteBar fr pour={1} contre={3} score={-2} monVote={monVoteC2}
                           onVoter={(v) => setMonVoteC2(v === monVoteC2 ? 0 : v)}
                           listerPour={nomsPour} listerContre={nomsContre} petit />
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* ── L'aperçu d'un lien collé dans le texte ──────────────── */}
        <article className="rounded-lg-card p-5 md:p-6" style={{ background: 'rgba(38, 30, 52, 0.45)', border: '1px solid rgba(120, 130, 190, 0.32)' }}>
          <p className="font-editorial text-[15px] text-ivory leading-relaxed mb-4">
            Le journal en parle très bien : https://www.ledroit.com/festival-medieval-montpellier
          </p>
          <a href="#apercu-demo" onClick={(e) => e.preventDefault()}
             className="flex gap-3 rounded-card overflow-hidden hover:opacity-90 transition-opacity"
             style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(244,239,227,0.14)' }}>
            <span className="w-28 h-28 shrink-0 flex items-center justify-center font-display text-ivory-soft/40 text-xs"
                  style={{ background: 'rgba(216,176,90,0.12)' }}>image</span>
            <div className="min-w-0 py-3 pr-3 flex flex-col justify-center">
              <p className="font-sans uppercase tracking-[0.16em] text-[9px] text-ivory-soft/50 mb-1">ledroit.com</p>
              <p className="font-display text-sm text-ivory truncate">Le Festival Médiéval de Montpellier revient en force</p>
              <p className="font-editorial text-[12px] text-ivory-soft/70 leading-snug line-clamp-2 mt-0.5">
                Trois jours de fête, treize piliers, un village complet reconstitué pour l’édition 2026.
              </p>
            </div>
          </a>

          {/* ── La vidéo, réservée aux membres VIP ──────────────────── */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="font-sans text-xs" style={{ color: '#E08A6E' }}>
              La vidéo est réservée aux membres VIP. Votre don retire les publicités et ouvre la vidéo.
            </p>
          </div>
        </article>

        {/* ── Le billet vidéo, façon YouTube ────────────────────────── */}
        <BilletCarte
          lang="FR" post={BILLET_VIDEO} delaiIndex={0}
          fond="rgba(38, 30, 52, 0.45)" bord="rgba(120, 130, 190, 0.32)"
          peutEpingler={false} bandeauEpingle=""
        />
      </div>
    </main>
  );
};

export default VotesBancEssai;
