import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import type { Kiosque, QualiteWifi } from '../../../../firebase/planMarche';
import type { VendorApp } from '../../../../firebase/applications';
import type { FicheLivraison } from '../../../../firebase/livraisonKiosque';
import { WIFI, NOTE_MAX_LEN } from '../../../../lib/planMarche';
import { Label, Input, ToggleSwitch, Textarea, DangerButton } from '../../primitives';
import MessageThread from '../../../../components/vendor/MessageThread';
import { besoinElectriciteLabel, nomAffiche, optionNourriturePrise } from './helpers';

interface Props {
  kiosque: Kiosque;
  rangeeNom: string;
  vendor: VendorApp | null;
  fiche: FicheLivraison | null;
  currentUid: string;
  currentName: string;
  onClose: () => void;
  onPatch: (patch: Partial<Omit<Kiosque, 'id' | 'rangeeId' | 'vendorUid'>>) => void;
  onLiberer: () => void;
}

/** Le panneau qui s'ouvre sur un kiosque : ses réglages, sa fiche
 *  d'occupant et le fil de messages avec lui, tout au même endroit
 *  pour que Jesse n'ait jamais à ouvrir la fiche Marchands à côté. */
const PanneauKiosque: React.FC<Props> = ({
  kiosque, rangeeNom, vendor, fiche, currentUid, currentName, onClose, onPatch, onLiberer,
}) => {
  const [prixBrouillon, setPrixBrouillon] = useState(kiosque.prixCents != null ? String(kiosque.prixCents / 100) : '');
  const [noteBrouillon, setNoteBrouillon] = useState(kiosque.note || '');

  // Le panneau peut rester monté d'un kiosque à l'autre (même clé de
  // composant côté parent) : on resynchronise les brouillons quand la
  // cible change plutôt que de garder ceux du kiosque précédent.
  useEffect(() => {
    setPrixBrouillon(kiosque.prixCents != null ? String(kiosque.prixCents / 100) : '');
    setNoteBrouillon(kiosque.note || '');
  }, [kiosque.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const commitPrix = () => {
    const v = parseFloat(prixBrouillon.replace(',', '.'));
    onPatch({ prixCents: Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : undefined });
  };
  const commitNote = () => {
    if (noteBrouillon !== (kiosque.note || '')) onPatch({ note: noteBrouillon || undefined });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-midnight-deep/60 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-midnight-deep border-l border-brass/30 overflow-y-auto p-5 md:p-6 space-y-5"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-editorial italic text-brass uppercase tracking-[0.3em] text-[10px] mb-1">{rangeeNom}</p>
            <h3 className="font-display title-medieval text-xl text-ivory">{kiosque.code}</h3>
          </div>
          <button onClick={onClose} className="text-ivory-soft hover:text-blush transition" title="Fermer">
            <X size={18} />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Prix ($ avant taxes)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={prixBrouillon}
              onChange={(e) => setPrixBrouillon(e.target.value)}
              onBlur={commitPrix}
              placeholder="Prix à venir"
              className="w-full"
            />
          </div>
          <div>
            <Label>Wifi</Label>
            <select
              value={kiosque.wifi}
              onChange={(e) => onPatch({ wifi: e.target.value as QualiteWifi })}
              className="admin-input w-full"
            >
              {WIFI.map((w) => <option key={w.id} value={w.id}>{w.FR}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-card border border-ivory-soft/15 px-3.5 py-2.5">
          <span className="font-sans text-sm text-ivory">Électricité</span>
          <ToggleSwitch checked={kiosque.electricite} onChange={(v) => onPatch({ electricite: v })} />
        </div>

        <div className="rounded-card border border-ivory-soft/15 px-3.5 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-sm text-ivory">Repas livrés au kiosque</span>
            <ToggleSwitch checked={kiosque.nourriture} onChange={(v) => onPatch({ nourriture: v })} />
          </div>
          {vendor && fiche && (
            <p className="font-editorial italic text-xs text-brass">
              {optionNourriturePrise(fiche)
                ? `Fiche ${fiche.statut === 'paye' ? 'payée' : 'caisse ouverte'} chez le marchand.`
                : 'Sur la liste d’attente de la livraison.'}
            </p>
          )}
        </div>

        <div>
          <Label>Note</Label>
          <Textarea
            rows={3}
            value={noteBrouillon}
            onChange={(e) => setNoteBrouillon(e.target.value)}
            onBlur={commitNote}
            placeholder="Une remarque pour l’équipe du site, jamais vue par le marchand."
            className="w-full"
          />
        </div>

        <div className="pt-1 border-t border-ivory-soft/10">
          <p className="font-display title-medieval text-xs text-brass mb-2 mt-4">Occupant</p>
          {vendor ? (
            <>
              <div className="space-y-1 font-sans text-sm text-ivory-soft">
                <p className="text-ivory">{nomAffiche(vendor)}</p>
                <p>{vendor.email}</p>
                {vendor.phone && <p>{vendor.phone}</p>}
                <p className="text-xs text-stone">
                  {vendor.category || 'Catégorie non précisée'} · {vendor.kioskDimensions || vendor.spaceSize || 'dimensions non précisées'} · Électricité : {besoinElectriciteLabel(vendor)}
                </p>
              </div>

              <MessageThread
                vendorUid={vendor.uid}
                currentUid={currentUid}
                currentName={currentName}
                currentRole="admin"
                threadKind="vendor"
                compact
                height="h-64"
              />

              <DangerButton onClick={onLiberer} className="mt-4 w-full inline-flex items-center justify-center gap-2">
                <Trash2 size={12} /> Libérer le kiosque
              </DangerButton>
            </>
          ) : (
            <p className="font-editorial italic text-sm text-stone">
              Ce kiosque est libre. Glissez un marchand du rail, ou touchez-le puis touchez ce kiosque.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PanneauKiosque;
