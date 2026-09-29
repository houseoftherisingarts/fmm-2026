import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, Eye, Music, Palette, Store } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Badge, Card, EmptyState, GhostButton, Input, PrimaryButton, downloadCsv, fmtDate } from '../primitives';
import {
  LIEN_SQUARE_BOUTIQUE, PRIX_BOUTIQUE_ANNUEL, listerVitrines, majBoutiqueAdmin, urlPublique,
  type StatutBoutique, type Vitrine,
} from '../../../firebase/vitrines';

// ─── Admin · Vitrines ────────────────────────────────────────────────
// Les vitrines des musiciens et des artisans, et surtout les demandes
// de boutique : poser le lien de paiement, activer pour un an une fois
// l'année réglée, ou refuser. Alex, 2026-09-28.

const STATUT: Record<StatutBoutique, { label: string; tone: 'pending' | 'accepted' | 'rejected' | 'neutral' }> = {
  aucune:   { label: 'Vitrine seule',  tone: 'neutral' },
  demandee: { label: 'Boutique demandée', tone: 'pending' },
  active:   { label: 'Boutique active', tone: 'accepted' },
  refusee:  { label: 'Refusée',        tone: 'rejected' },
};

type Filtre = 'toutes' | StatutBoutique;

const ORIGINE = typeof window !== 'undefined' ? window.location.origin : 'https://festivalmedievaldemontpellier.org';
const APERCUS = [
  { label: 'Vitrine publique (exemple)', chemin: '/vitrine/apercu?apercu=1' },
  { label: 'Atelier rempli (exemple)',   chemin: '/ma-vitrine?apercu=1' },
  { label: 'Page des boutiques',         chemin: '/boutiques?apercu=1' },
];

const VitrinesSection: React.FC = () => {
  const [liste, setListe] = useState<Vitrine[] | null>(null);
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [liens, setLiens] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const charger = () => listerVitrines().then(setListe).catch(() => setListe([]));
  useEffect(() => { charger(); }, []);

  const visibles = useMemo(() => (liste ?? []).filter((v) => filtre === 'toutes' || v.boutique?.statut === filtre), [liste, filtre]);
  const demandes = (liste ?? []).filter((v) => v.boutique?.statut === 'demandee').length;

  async function poser(v: Vitrine, statut: StatutBoutique) {
    setBusy(v.slug);
    try {
      const b = { ...v.boutique, statut, lienPaiement: liens[v.slug] ?? v.boutique.lienPaiement };
      if (statut === 'active') {
        const debut = new Date();
        const fin = new Date(debut); fin.setFullYear(fin.getFullYear() + 1);
        b.activeeLe = Timestamp.fromDate(debut);
        b.expireLe = Timestamp.fromDate(fin);
      }
      await majBoutiqueAdmin(v.slug, b);
      await charger();
    } finally { setBusy(null); }
  }

  async function poserLien(v: Vitrine) {
    const lien = (liens[v.slug] ?? '').trim();
    if (!lien) return;
    setBusy(v.slug);
    try { await majBoutiqueAdmin(v.slug, { ...v.boutique, lienPaiement: lien }); await charger(); }
    finally { setBusy(null); }
  }

  const exporter = () => downloadCsv('vitrines.csv', (liste ?? []).map((v) => ({
    nom: v.nom, type: v.type, adresse: urlPublique(v.slug), publiee: v.publie ? 'oui' : 'non',
    boutique: v.boutique?.statut ?? 'aucune', expire: v.boutique?.expireLe ? fmtDate(v.boutique.expireLe) : '',
    courriel: v.liens?.courriel ?? '', ville: v.ville ?? '', pistes: v.pistes.length, produits: v.produits.length,
  })));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Vitrines</h2>
          <p className="font-editorial text-sm text-ivory-soft mt-1">
            Les pages des musiciens et des artisans sans site. La boutique du festival se règle {PRIX_BOUTIQUE_ANNUEL} $ par année par le Square du festival{LIEN_SQUARE_BOUTIQUE ? '' : ' (lien général à poser dans .env.local, VITE_SQUARE_BOUTIQUE_URL)'} : la personne paie depuis son atelier, vous activez dès que le paiement passe.
          </p>
        </div>
        <GhostButton onClick={exporter}><Download size={14} /> CSV</GhostButton>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <Eye size={18} className="text-brass shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="font-display text-lg text-ivory">Aperçu pour l’équipe</h3>
            <p className="font-editorial text-sm text-ivory-soft mt-1">
              Tant que la bascule « Vitrines des musiciens et des artisans » dort dans Paramètres, ces adresses ne s’ouvrent que pour l’équipe et pour qui a l’un des liens d’aperçu ci-dessous. À montrer à Jesse avant d’allumer.
            </p>
            <ul className="mt-3 space-y-1">
              {APERCUS.map((a) => (
                <li key={a.chemin} className="flex flex-wrap items-center gap-2">
                  <span className="font-sans text-[13px] text-ivory-soft w-44">{a.label}</span>
                  <a href={a.chemin} target="_blank" rel="noopener noreferrer" className="font-sans text-[13px] text-brass hover:underline break-all">{ORIGINE}{a.chemin}</a>
                  <GhostButton onClick={() => navigator.clipboard?.writeText(`${ORIGINE}${a.chemin}`)}>Copier</GhostButton>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(['toutes', 'demandee', 'active', 'aucune', 'refusee'] as Filtre[]).map((f) => (
          <button key={f} type="button" onClick={() => setFiltre(f)}
                  className={`px-3 py-1.5 rounded-card font-sans text-xs uppercase tracking-wider border transition ${filtre === f ? 'bg-brass text-midnight-deep border-brass' : 'border-white/15 text-ivory-soft hover:border-brass/60'}`}>
            {f === 'toutes' ? `Toutes (${liste?.length ?? 0})` : `${STATUT[f].label}${f === 'demandee' && demandes ? ` (${demandes})` : ''}`}
          </button>
        ))}
      </div>

      {liste === null && <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />}
      {liste && visibles.length === 0 && <EmptyState icon={Store}>Aucune vitrine dans cette liste.</EmptyState>}

      <div className="grid gap-4">
        {visibles.map((v) => {
          const s = v.boutique?.statut ?? 'aucune';
          return (
            <Card key={v.slug}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-card overflow-hidden bg-black/30 border border-white/10 shrink-0 flex items-center justify-center text-brass">
                    {v.avatar ? <img src={v.avatar.url} alt="" className="w-full h-full object-cover" /> : v.type === 'musique' ? <Music size={20} /> : <Palette size={20} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg text-ivory">{v.nom}</h3>
                      <Badge tone={STATUT[s].tone}>{STATUT[s].label}</Badge>
                      <Badge tone={v.publie ? 'info' : 'neutral'}>{v.publie ? 'Publiée' : 'Brouillon'}</Badge>
                    </div>
                    <p className="font-sans text-xs text-ivory-soft mt-1">
                      {v.type === 'musique' ? 'Musique' : 'Artisan'}{v.ville ? ` · ${v.ville}` : ''} · {v.pistes.length} piste{v.pistes.length > 1 ? 's' : ''} · {v.produits.length} création{v.produits.length > 1 ? 's' : ''}
                      {v.liens?.courriel ? ` · ${v.liens.courriel}` : ''}
                    </p>
                    <a href={urlPublique(v.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-sans text-xs text-brass hover:underline mt-1">
                      /vitrine/{v.slug} <ExternalLink size={11} />
                    </a>
                    {s === 'demandee' && v.boutique.demandeeLe && <p className="font-sans text-xs text-ivory-soft mt-1">Demandée le {fmtDate(v.boutique.demandeeLe)}</p>}
                    {s === 'active' && v.boutique.expireLe && <p className="font-sans text-xs text-ivory-soft mt-1">Active jusqu’au {fmtDate(v.boutique.expireLe)}</p>}
                  </div>
                </div>

                {s !== 'aucune' && (
                  <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[320px]">
                    <div className="flex gap-2">
                      <Input placeholder="Lien Square propre à cette demande (sinon le lien général)" defaultValue={v.boutique.lienPaiement ?? ''}
                             onChange={(e) => setLiens((l) => ({ ...l, [v.slug]: e.target.value }))} />
                      <GhostButton onClick={() => poserLien(v)} disabled={busy === v.slug}>Poser</GhostButton>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s !== 'active' && <PrimaryButton onClick={() => poser(v, 'active')} disabled={busy === v.slug}>Activer pour un an</PrimaryButton>}
                      {s === 'active' && <GhostButton onClick={() => poser(v, 'active')} disabled={busy === v.slug}>Renouveler un an</GhostButton>}
                      {s !== 'refusee' && <GhostButton onClick={() => poser(v, 'refusee')} disabled={busy === v.slug}>Refuser</GhostButton>}
                      {s === 'active' && <GhostButton onClick={() => poser(v, 'aucune')} disabled={busy === v.slug}>Fermer la boutique</GhostButton>}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default VitrinesSection;
