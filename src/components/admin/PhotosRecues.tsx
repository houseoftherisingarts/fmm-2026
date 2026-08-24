import React, { useEffect, useState } from 'react';
import { Images, Check, X, Trash2, Download, Loader2, AlertCircle } from 'lucide-react';
import { Card, Badge, EmptyState, GhostButton, PrimaryButton, DangerButton, fmtDate } from '../../pages/admin/primitives';
import {
  listerToutesLesPhotos, changerStatut, supprimerPhoto,
  type PhotoPublique, type StatutPhoto,
} from '../../firebase/photosPubliques';

// ─── Photos reçues (admin) ──────────────────────────────────────────
// Toutes les photos envoyées par les membres depuis leur espace compte
// (PhotosPanel). Filtre par statut, aperçu en grand, Retenir / Refuser /
// Supprimer. Rien de destructif ne part sans un petit panneau de
// confirmation POSÉ DANS LA PAGE : jamais de confirm() ni d'alert() du
// navigateur (Alex, 2026-08-23).

interface Props { devBypass: boolean }

const STATUT_LABEL: Record<StatutPhoto, string> = {
  attente: 'En attente', retenue: 'Retenue', refusee: 'Non retenue',
};
const STATUT_TONE: Record<StatutPhoto, 'pending' | 'accepted' | 'rejected'> = {
  attente: 'pending', retenue: 'accepted', refusee: 'rejected',
};

const PhotosRecuesSection: React.FC<Props> = ({ devBypass }) => {
  const [photos, setPhotos]     = useState<PhotoPublique[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filtre, setFiltre]     = useState<StatutPhoto | 'all'>('all');
  const [ouverte, setOuverte]   = useState<PhotoPublique | null>(null);
  const [confirmerSuppr, setConfirmerSuppr] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [erreur, setErreur]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await listerToutesLesPhotos();
        if (!cancelled) setPhotos(live);
      } catch (e) {
        console.warn('[photosRecues] chargement échoué', e);
        if (!cancelled) setErreur(devBypass ? null : 'Impossible de charger les photos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [devBypass]);

  const counts = {
    total:   photos.length,
    attente: photos.filter((p) => p.statut === 'attente').length,
    retenue: photos.filter((p) => p.statut === 'retenue').length,
    refusee: photos.filter((p) => p.statut === 'refusee').length,
  };
  const filtrees = filtre === 'all' ? photos : photos.filter((p) => p.statut === filtre);

  const changer = async (id: string, statut: StatutPhoto) => {
    const avant = photos;
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, statut } : p)));
    setOuverte((o) => (o && o.id === id ? { ...o, statut } : o));
    try {
      await changerStatut(id, statut);
    } catch (e) {
      console.warn('[photosRecues] statut échoué', e);
      setPhotos(avant);
      setErreur('Échec de la mise à jour du statut.');
    }
  };

  const supprimer = async (id: string) => {
    setBusy(true);
    try {
      await supprimerPhoto(id);
      setPhotos((list) => list.filter((p) => p.id !== id));
      setOuverte(null);
      setConfirmerSuppr(false);
    } catch (e) {
      console.warn('[photosRecues] suppression échouée', e);
      setErreur('Échec de la suppression, réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const fermer = () => { setOuverte(null); setConfirmerSuppr(false); };

  return (
    <div className="space-y-5">
      {erreur && (
        <Card className="p-4 border border-blush/40 bg-blush/10">
          <p className="font-sans text-sm text-blush">{erreur}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-ivory">{counts.total}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">Total</p></Card>
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-brass">{counts.attente}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">En attente</p></Card>
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-ivory">{counts.retenue}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">Retenues</p></Card>
        <Card className="p-5"><p className="font-display title-medieval text-3xl text-ivory">{counts.refusee}</p><p className="font-sans text-[10px] uppercase tracking-widest text-ivory-soft mt-1">Non retenues</p></Card>
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <p className="font-editorial italic text-sm text-ivory-soft">
          {filtrees.length} photo{filtrees.length > 1 ? 's' : ''} affichée{filtrees.length > 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {([
            ['all', 'Toutes'], ['attente', 'En attente'], ['retenue', 'Retenues'], ['refusee', 'Non retenues'],
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFiltre(k)}
              className={`px-3 py-1.5 font-sans uppercase tracking-wider rounded-card text-xs transition ${filtre === k ? 'bg-brass text-midnight-deep' : 'border border-ivory-soft/20 text-ivory-soft hover:border-brass hover:text-brass'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card><EmptyState icon={Images}>Chargement…</EmptyState></Card>
      ) : filtrees.length === 0 ? (
        <Card><EmptyState icon={Images}>Aucune photo{filtre !== 'all' ? ' dans cette catégorie' : ''}.</EmptyState></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtrees.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOuverte(p)}
              className="group relative block w-full aspect-square overflow-hidden rounded-card ring-1 ring-ivory-soft/15 hover:ring-brass/60 transition"
            >
              <img
                src={p.url}
                alt={p.legende || p.nomMembre}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <span className="absolute top-1.5 right-1.5"><Badge tone={STATUT_TONE[p.statut]}>{STATUT_LABEL[p.statut]}</Badge></span>
              <span
                className="absolute bottom-0 left-0 right-0 px-2 py-1.5 font-sans text-[10px] truncate text-left"
                style={{ background: 'rgba(4,8,11,0.78)', color: 'var(--admin-text-soft)' }}
              >
                {p.nomMembre} · {fmtDate(p.envoyeeLe)}
              </span>
            </button>
          ))}
        </div>
      )}

      {ouverte && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center px-3 md:px-6"
          style={{ background: 'rgba(4,8,11,0.85)', backdropFilter: 'blur(10px)' }}
          onClick={fermer}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col admin-card-strong"
          >
            <header className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--admin-line)' }}>
              <div className="min-w-0">
                <p className="font-sans text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--admin-accent)' }}>{ouverte.nomMembre}</p>
                <p className="font-sans text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                  {fmtDate(ouverte.envoyeeLe)}{ouverte.edition ? ` · Édition ${ouverte.edition}` : ''}
                </p>
              </div>
              <button
                onClick={fermer}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ border: '1px solid var(--admin-line)', color: 'var(--admin-text-soft)' }}
              >
                <X size={14} />
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <img
                src={ouverte.url}
                alt={ouverte.legende || ouverte.nomMembre}
                className="w-full h-auto max-h-[55vh] object-contain bg-black/40"
              />
              {ouverte.legende && (
                <p className="px-5 pt-4 font-editorial italic text-sm text-ivory-soft">{ouverte.legende}</p>
              )}
              <p className="px-5 pt-2 pb-1 font-sans text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                {ouverte.largeur}×{ouverte.hauteur} · {Math.round(ouverte.poids / 1024)} Ko
              </p>
            </div>

            <footer className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderTop: '1px solid var(--admin-line)' }}>
              {!confirmerSuppr ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <PrimaryButton onClick={() => changer(ouverte.id, 'retenue')} disabled={ouverte.statut === 'retenue'}>
                      <Check size={13} /> Retenir
                    </PrimaryButton>
                    <GhostButton onClick={() => changer(ouverte.id, 'refusee')} disabled={ouverte.statut === 'refusee'}>
                      <X size={13} /> Refuser
                    </GhostButton>
                    <a href={ouverte.url} download target="_blank" rel="noopener noreferrer" className="admin-ghost inline-flex items-center gap-1.5">
                      <Download size={13} /> Télécharger
                    </a>
                  </div>
                  <DangerButton onClick={() => setConfirmerSuppr(true)}>
                    <Trash2 size={13} /> Supprimer
                  </DangerButton>
                </>
              ) : (
                <div className="w-full flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-sans text-sm flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
                    <AlertCircle size={14} style={{ color: '#FCA5B0' }} /> Supprimer cette photo pour de bon ?
                  </p>
                  <div className="flex items-center gap-2">
                    <GhostButton onClick={() => setConfirmerSuppr(false)}>Annuler</GhostButton>
                    <DangerButton onClick={() => supprimer(ouverte.id)} disabled={busy}>
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Confirmer
                    </DangerButton>
                  </div>
                </div>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotosRecuesSection;
