import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Tag, Check, Loader2, AlertCircle } from 'lucide-react';
import { addLocale } from '../../lib/locale';
import {
  identifierPersonnes, seRetirerDUnePhoto, type PhotoPublique, type PersonnePhoto,
} from '../../firebase/photosPubliques';
import {
  suivreMesAmities, lireFiche, listerMembres, filtrerMembres, type Amitie, type Membre,
} from '../../firebase/ordre';

// ─── La visionneuse d'une photo publique ────────────────────────────
// Ouverte depuis une vignette (PhotosPanel, PhotosDe, PhotosAvecMoi) :
// la photo en grand, fermeture par la croix ou Échap. Le propriétaire
// peut y identifier des personnes ; une personne identifiée peut s'en
// retirer (Alex, 2026-08-28).
//
// Les repères (x, y) sont posés en pourcentage DE LA PHOTO, pas du
// cadre qui l'affiche. Ici, le cadre est forcé au même ratio que la
// photo (aspectRatio CSS) : aucun recadrage, donc un clic tombe
// directement au bon pourcentage. Sur une vignette carrée ailleurs
// (grilles en aspect-square, object-cover), mapDansCadre() convertit
// un repère de l'espace de la photo vers l'espace visible du cadre, et
// rend `null` quand le point tombe hors du recadrage.

/** Convertit une position en % de la photo vers sa position en % d'un
 *  cadre qui la recadre en `object-cover` (même logique que le CSS). */
export function mapDansCadre(
  x: number, y: number, imgW: number, imgH: number, cadreW: number, cadreH: number,
): { x: number; y: number } | null {
  if (!imgW || !imgH || !cadreW || !cadreH) return { x, y };
  const imgRatio = imgW / imgH, cadreRatio = cadreW / cadreH;
  let mx = x, my = y;
  if (imgRatio > cadreRatio) {
    // La photo est plus large que le cadre : recadrage gauche/droite.
    const visible = cadreRatio / imgRatio;
    const decalage = (1 - visible) / 2;
    mx = ((x / 100 - decalage) / visible) * 100;
  } else if (imgRatio < cadreRatio) {
    // La photo est plus haute que le cadre : recadrage haut/bas.
    const visible = imgRatio / cadreRatio;
    const decalage = (1 - visible) / 2;
    my = ((y / 100 - decalage) / visible) * 100;
  }
  if (mx < 0 || mx > 100 || my < 0 || my > 100) return null;
  return { x: mx, y: my };
}

const Repere: React.FC<{ x: number; y: number; nom: string; onRemove?: () => void }> = ({ x, y, nom, onRemove }) => (
  <span
    className="absolute flex flex-col items-center gap-1"
    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
  >
    <span className="relative">
      <span
        className="block w-3.5 h-3.5 rounded-[4px] border-2"
        style={{ borderColor: '#D8B05A', background: 'rgba(216,176,90,0.2)' }}
      />
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Retirer"
          className="absolute -top-2 -right-2 flex items-center justify-center w-4 h-4 rounded-full"
          style={{ background: '#1a050b', border: '1px solid rgba(244,239,227,0.4)', color: '#F4EFE3' }}
        >
          <X size={9} />
        </button>
      )}
    </span>
    <span
      className="px-1.5 py-0.5 rounded-full font-sans uppercase tracking-[0.12em] text-[9px] whitespace-nowrap max-w-[120px] truncate"
      style={{ background: 'rgba(10,2,7,0.82)', color: '#F4EFE3', border: '1px solid rgba(216,176,90,0.35)' }}
    >
      {nom}
    </span>
  </span>
);

interface Props {
  photo: PhotoPublique;
  lang: 'FR' | 'EN';
  onClose: () => void;
  /** Le compte connecté : sert au marqueur « Moi » et au retrait. */
  moi?: { uid: string; nom: string } | null;
  /** Vrai seulement pour le propriétaire de la photo : lui seul pose des repères. */
  proprietaire: boolean;
}

const VisionneusePhoto: React.FC<Props> = ({ photo, lang, onClose, moi, proprietaire }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;

  const [mode, setMode]             = useState(false);
  const [personnes, setPersonnes]   = useState<PersonnePhoto[]>(photo.personnes ?? []);
  useEffect(() => { setPersonnes(photo.personnes ?? []); }, [photo.id, photo.personnes]);

  const [enPose, setEnPose]         = useState<{ x: number; y: number } | null>(null);
  const [recherche, setRecherche]   = useState('');
  const [amis, setAmis]             = useState<Membre[]>([]);
  const [registre, setRegistre]     = useState<Membre[] | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [retrait, setRetrait]       = useState(false);
  const [erreur, setErreur]         = useState<string | null>(null);
  const cadreRef = useRef<HTMLDivElement>(null);

  // Échap referme d'abord le champ de recherche s'il est ouvert, sinon
  // toute la visionneuse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (enPose) { setEnPose(null); return; }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, enPose]);

  // Les amis, chargés une fois quand le mode d'identification s'ouvre.
  useEffect(() => {
    if (!mode || !moi) return;
    let vivant = true;
    const arret = suivreMesAmities(moi.uid, (liens: Amitie[]) => {
      const uidsAmis = liens
        .filter((l) => l.statut === 'amis')
        .map((l) => l.paire.find((u) => u !== moi.uid))
        .filter((u): u is string => Boolean(u));
      Promise.all(uidsAmis.map((u) => lireFiche(u))).then((fiches) => {
        if (vivant) setAmis(fiches.filter((m): m is Membre => Boolean(m)));
      });
    });
    return () => { vivant = false; arret(); };
  }, [mode, moi]);

  // Le reste du registre, chargé seulement au premier repère posé.
  const chargerRegistre = () => {
    if (registre !== null) return;
    void listerMembres().then(setRegistre).catch(() => setRegistre([]));
  };

  const suggestions = useMemo(() => {
    if (!moi) return [];
    const amisUids = new Set(amis.map((m) => m.uid));
    const reste = (registre ?? []).filter((m) => m.uid !== moi.uid && !amisUids.has(m.uid));
    const base = [...amis, ...reste];
    return (recherche.trim() ? filtrerMembres(base, recherche) : base).slice(0, 12);
  }, [moi, amis, registre, recherche]);

  const onImageClick = (e: React.MouseEvent) => {
    if (!mode || !proprietaire || !cadreRef.current) return;
    const rect = cadreRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setEnPose({ x, y });
    setRecherche('');
    chargerRegistre();
  };

  const choisir = (uid: string, nom: string) => {
    if (!enPose) return;
    setPersonnes((prev) => [...prev.filter((p) => p.uid !== uid), { uid, nom, x: enPose.x, y: enPose.y }]);
    setEnPose(null); setRecherche('');
  };

  const retirerRepere = (uid: string) => setPersonnes((prev) => prev.filter((p) => p.uid !== uid));

  const enregistrer = async () => {
    setEnregistrement(true); setErreur(null);
    try {
      await identifierPersonnes(photo.id, personnes);
      setMode(false); setEnPose(null);
    } catch {
      setErreur(t.errEnregistrer);
    } finally {
      setEnregistrement(false);
    }
  };

  const annuler = () => { setPersonnes(photo.personnes ?? []); setMode(false); setEnPose(null); setErreur(null); };

  const moiIdentifie = moi ? personnes.some((p) => p.uid === moi.uid) : false;

  const meRetirer = async () => {
    if (!moi) return;
    setRetrait(true); setErreur(null);
    try {
      await seRetirerDUnePhoto(photo.id, personnes, moi.uid);
    } catch {
      setErreur(t.errRetrait);
    } finally {
      setRetrait(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
      role="dialog" aria-modal="true" aria-label={t.titre}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(8, 3, 6, 0.88)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg-card"
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: '#1a050b', border: '1px solid rgba(244,239,227,0.14)' }}
      >
        <button
          type="button" onClick={onClose} aria-label={t.fermer}
          className="absolute top-3 right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full"
          style={{ background: 'rgba(10,2,7,0.78)', border: '1px solid rgba(244,239,227,0.25)', color: '#F4EFE3' }}
        >
          <X size={16} />
        </button>

        <div
          ref={cadreRef}
          onClick={onImageClick}
          className="relative w-full"
          style={{ aspectRatio: `${photo.largeur} / ${photo.hauteur}`, cursor: mode && proprietaire ? 'crosshair' : 'default' }}
        >
          <img src={photo.url} alt={photo.legende || ''} className="absolute inset-0 w-full h-full object-cover" />
          {personnes.map((p) => (
            <Repere key={p.uid} x={p.x} y={p.y} nom={p.nom} onRemove={mode ? () => retirerRepere(p.uid) : undefined} />
          ))}
          {enPose && <Repere x={enPose.x} y={enPose.y} nom="?" />}
        </div>

        <div className="p-5 md:p-6 space-y-4">
          {photo.legende && (
            <p className="font-editorial text-sm text-ivory-soft leading-relaxed">{photo.legende}</p>
          )}

          {personnes.length > 0 && (
            <p className="font-sans text-sm" style={{ color: 'rgba(244,239,227,0.75)' }}>
              {t.avec}{' '}
              {personnes.map((p, i) => (
                <React.Fragment key={p.uid}>
                  {i > 0 && ', '}
                  <Link to={addLocale(`/profil/${p.uid}`, lang)} className="text-brass hover:underline">{p.nom}</Link>
                </React.Fragment>
              ))}
            </p>
          )}

          {erreur && (
            <p className="font-sans text-sm flex items-center gap-1.5" style={{ color: '#E08A6E' }}>
              <AlertCircle size={13} /> {erreur}
            </p>
          )}

          {proprietaire && !mode && (
            <button
              type="button" onClick={() => setMode(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-card font-sans uppercase tracking-[0.18em] text-[11px] bg-brass text-midnight-deep"
            >
              <Tag size={13} /> {t.identifier}
            </button>
          )}

          {proprietaire && mode && (
            <div className="space-y-3">
              <p className="font-sans text-xs" style={{ color: 'rgba(244,239,227,0.55)' }}>
                {enPose ? t.choisirQui : t.cliquezPourPoser}
              </p>

              {enPose && (
                <div className="space-y-2">
                  <input
                    type="text" autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)}
                    placeholder={t.rechercherPh} className="witcher-input font-sans"
                  />
                  <ul className="max-h-48 overflow-y-auto space-y-1">
                    {moi && (
                      <li>
                        <button
                          type="button" onClick={() => choisir(moi.uid, moi.nom)}
                          className="w-full text-left px-3 py-2 rounded-card font-sans text-sm hover:bg-brass/10"
                          style={{ color: '#F4EFE3', border: '1px solid rgba(216,176,90,0.3)' }}
                        >
                          {t.moi}
                        </button>
                      </li>
                    )}
                    {suggestions.map((m) => (
                      <li key={m.uid}>
                        <button
                          type="button" onClick={() => choisir(m.uid, m.nom)}
                          className="w-full text-left px-3 py-2 rounded-card font-sans text-sm hover:bg-brass/10"
                          style={{ color: 'rgba(244,239,227,0.85)', border: '1px solid rgba(244,239,227,0.12)' }}
                        >
                          {m.nom}
                        </button>
                      </li>
                    ))}
                    {suggestions.length === 0 && recherche.trim() && (
                      <li className="font-sans text-xs px-1" style={{ color: 'rgba(244,239,227,0.45)' }}>{t.aucunResultat}</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button" onClick={enregistrer} disabled={enregistrement}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-card font-sans uppercase tracking-[0.18em] text-[11px] bg-brass text-midnight-deep disabled:opacity-60"
                >
                  {enregistrement ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {t.enregistrer}
                </button>
                <button
                  type="button" onClick={annuler}
                  className="font-sans uppercase tracking-[0.18em] text-[11px]" style={{ color: 'rgba(244,239,227,0.55)' }}
                >
                  {t.annuler}
                </button>
              </div>
            </div>
          )}

          {!proprietaire && moiIdentifie && (
            <button
              type="button" onClick={meRetirer} disabled={retrait}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-card font-sans uppercase tracking-[0.18em] text-[11px] disabled:opacity-60"
              style={{ border: '1px solid rgba(244,239,227,0.3)', color: '#F4EFE3' }}
            >
              {retrait ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} {t.meRetirer}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

const FR = {
  titre: 'La photo', fermer: 'Fermer',
  avec: 'Avec',
  identifier: 'Identifier des personnes',
  cliquezPourPoser: 'Cliquez sur la photo pour poser un repère.',
  choisirQui: 'Qui est-ce ?',
  rechercherPh: 'Chercher un nom',
  moi: 'Moi',
  aucunResultat: 'Aucun résultat.',
  enregistrer: 'Enregistrer',
  annuler: 'Annuler',
  meRetirer: 'Me retirer de cette photo',
  errEnregistrer: 'Échec de l’enregistrement, réessayez.',
  errRetrait: 'Échec du retrait, réessayez.',
};

const EN: typeof FR = {
  titre: 'The photo', fermer: 'Close',
  avec: 'With',
  identifier: 'Tag people',
  cliquezPourPoser: 'Click the photo to place a marker.',
  choisirQui: 'Who is it?',
  rechercherPh: 'Search a name',
  moi: 'Me',
  aucunResultat: 'No results.',
  enregistrer: 'Save',
  annuler: 'Cancel',
  meRetirer: 'Remove me from this photo',
  errEnregistrer: 'Could not save, please try again.',
  errRetrait: 'Could not remove, please try again.',
};

export default VisionneusePhoto;
