import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Download, Save, Loader2, AlertTriangle } from 'lucide-react';
import { CURRENT_YEAR, type VendorApp } from '../../../firebase/applications';
import {
  watchPlanMarche, sauverPlanMarche, televerserCartePlan,
  type PlanMarche,
} from '../../../firebase/planMarche';
import {
  kiosqueDe, assigner, echanger, liberer, modifierKiosque,
  ajouterKiosque, retirerDernierKiosque, ajouterRangee, renommerRangee, retirerRangee,
  placerSurCarte, prixAffiche, compterPremium, WIFI,
} from '../../../lib/planMarche';
import { watchLivraisons, type FicheLivraison } from '../../../firebase/livraisonKiosque';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, GhostButton, downloadCsv } from '../primitives';
import RangeeRow from './planMarche/RangeeRow';
import RailMarchands from './planMarche/RailMarchands';
import PanneauKiosque from './planMarche/PanneauKiosque';
import VueCarte from './planMarche/VueCarte';
import { ficheDeVendor, nomAffiche, type CibleEnMain } from './planMarche/helpers';

interface Props {
  fetchAll: () => Promise<VendorApp[]>;
}

// ─── Plan du marché · l'orchestrateur ─────────────────────────────────
// Assemble les rangées (ou la carte), le rail des marchands sans
// kiosque et le panneau d'édition. Toute la logique du plan lui-même
// vit dans lib/planMarche.ts : ce fichier ne fait que réagir aux
// gestes de Jesse en appliquant la bonne fonction pure, puis en
// sauvegardant. Voir planMarche/helpers.ts pour les petits calculs
// croisés avec les marchands et les fiches de livraison.
const PlanMarcheSection: React.FC<Props> = ({ fetchAll }) => {
  const { user: adminUser } = useAuth();
  const [plan, setPlan] = useState<PlanMarche | null>(null);
  const [vendors, setVendors] = useState<VendorApp[]>([]);
  const [livraisons, setLivraisons] = useState<FicheLivraison[]>([]);
  const [etat, setEtat] = useState<'idle' | 'saving' | 'saved' | 'erreur'>('idle');
  const [vueCarte, setVueCarte] = useState(false);
  const [kiosqueOuvertId, setKiosqueOuvertId] = useState<string | null>(null);
  const [enMain, setEnMain] = useState<CibleEnMain>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => watchPlanMarche(CURRENT_YEAR, (p) => setPlan(p)), []);
  useEffect(() => watchLivraisons(setLivraisons), []);
  useEffect(() => { fetchAll().then(setVendors); }, [fetchAll]);
  // Sans carte, la bascule n'a pas de sens : on revient aux rangées.
  useEffect(() => { if (!plan?.carte) setVueCarte(false); }, [plan?.carte]);

  // fetchAll() interroge toutes les années à la fois : un marchand qui a
  // exposé plusieurs fois aurait sinon sa fiche d'une autre année écraser
  // celle de cette année dans la Map, selon l'ordre de retour du tableau.
  const vendorByUid = useMemo(
    () => new Map(vendors.filter((v) => v.year === CURRENT_YEAR).map((v) => [v.uid, v])),
    [vendors],
  );
  const vendorsSansKiosque = useMemo(
    () => vendors.filter((v) => v.status === 'accepted' && v.year === CURRENT_YEAR && !kiosqueDe(plan, v.uid)),
    [vendors, plan],
  );

  const sauver = async (mut: (p: PlanMarche) => PlanMarche) => {
    setEtat('saving');
    try {
      await sauverPlanMarche(CURRENT_YEAR, mut);
      setEtat('saved');
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setEtat('idle'), 2000);
    } catch (e) {
      console.error('[planMarche] sauvegarde échouée', e);
      setEtat('erreur');
    }
  };

  // Optimiste : le plan local change tout de suite pour que Jesse voie son
  // geste sans attendre. La sauvegarde réelle, elle, rejoue `mut` sur le
  // document le plus frais du serveur (transaction dans firebase/planMarche.ts)
  // plutôt que sur cette copie locale, qui peut déjà être en retard sur un
  // autre admin.
  const appliquer = (mut: (p: PlanMarche) => PlanMarche) => {
    setPlan((prev) => (prev ? mut(prev) : prev));
    void sauver(mut);
  };

  const assignerVendorSurKiosque = (kiosqueId: string, vendorUid: string) => {
    const cible = plan?.kiosques.find((k) => k.id === kiosqueId);
    if (cible?.vendorUid && cible.vendorUid !== vendorUid) {
      const occupant = vendorByUid.get(cible.vendorUid);
      const nom = occupant ? nomAffiche(occupant) : 'le marchand actuel';
      if (!window.confirm(`${nom} occupe déjà ${cible.code}. Le remplacer ?`)) return;
    }
    appliquer((p) => assigner(p, kiosqueId, vendorUid));
    setEnMain(null);
  };

  const echangerKiosques = (aId: string, bId: string) => {
    setEnMain(null);
    if (aId === bId) return;
    appliquer((p) => echanger(p, aId, bId));
  };

  // Résout le clic sur un kiosque selon ce qui est « en main » : un
  // marchand du rail s'y pose, un kiosque déjà pris s'y échange, et
  // sans rien en main le clic ouvre simplement le panneau d'édition.
  const onKiosqueClic = (kiosqueId: string) => {
    if (enMain?.type === 'vendor') { assignerVendorSurKiosque(kiosqueId, enMain.uid); return; }
    if (enMain?.type === 'kiosque') { echangerKiosques(enMain.id, kiosqueId); return; }
    setKiosqueOuvertId(kiosqueId);
  };

  const onToggleEnMainVendor = (uid: string) =>
    setEnMain((p) => (p?.type === 'vendor' && p.uid === uid ? null : { type: 'vendor', uid }));
  const onToggleEnMainKiosque = (id: string) =>
    setEnMain((p) => (p?.type === 'kiosque' && p.id === id ? null : { type: 'kiosque', id }));

  const exporterCsv = () => {
    if (!plan) return;
    const nomRangee = (id: string) => plan.rangees.find((r) => r.id === id)?.nom || id;
    downloadCsv('fmm-plan-marche.csv', plan.kiosques.map((k) => {
      const v = k.vendorUid ? vendorByUid.get(k.vendorUid) : undefined;
      return {
        code: k.code,
        rangee: nomRangee(k.rangeeId),
        prix: prixAffiche(k.prixCents),
        premium: k.premium ? 'oui' : 'non',
        electricite: k.electricite ? 'oui' : 'non',
        wifi: WIFI.find((w) => w.id === k.wifi)?.FR || k.wifi,
        repas: k.nourriture ? 'oui' : 'non',
        marchand: v ? nomAffiche(v) : '',
        courriel: v?.email || '',
      };
    }));
  };

  if (!plan) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </div>
    );
  }

  const kiosqueOuvert = kiosqueOuvertId ? plan.kiosques.find((k) => k.id === kiosqueOuvertId) || null : null;
  const occupes = plan.kiosques.filter((k) => k.vendorUid).length;

  const vueCarteElement = (
    <VueCarte
      plan={plan}
      vendorByUid={vendorByUid}
      onOpenKiosque={onKiosqueClic}
      onDropVendorSurKiosque={assignerVendorSurKiosque}
      onPlacer={(id, x, y) => appliquer((p) => placerSurCarte(p, id, x, y))}
      onTeleverser={async (file, onProgress) => {
        const carte = await televerserCartePlan(CURRENT_YEAR, file, onProgress);
        appliquer((p) => ({ ...p, carte }));
      }}
      onRetirerCarte={() => appliquer((p) => ({ ...p, carte: null }))}
    />
  );

  return (
    <div className="space-y-5">
      <Card className="px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display title-medieval text-xl md:text-2xl text-ivory">Les kiosques de l’édition {CURRENT_YEAR}</h2>
            <p className="font-editorial italic text-sm text-ivory-soft mt-1">
              {occupes} / {plan.kiosques.length} kiosques occupés · {compterPremium(plan)} premium · {vendorsSansKiosque.length} marchand{vendorsSansKiosque.length > 1 ? 's' : ''} accepté{vendorsSansKiosque.length > 1 ? 's' : ''} sans kiosque
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <TemoinSauvegarde etat={etat} />
            {plan.carte && (
              <div className="inline-flex rounded-card border border-ivory-soft/20 overflow-hidden">
                <button onClick={() => setVueCarte(false)}
                  className={`px-3 py-1.5 text-xs font-sans uppercase tracking-wider transition ${!vueCarte ? 'bg-brass text-midnight-deep' : 'text-ivory-soft hover:text-brass'}`}>
                  Rangées
                </button>
                <button onClick={() => setVueCarte(true)}
                  className={`px-3 py-1.5 text-xs font-sans uppercase tracking-wider transition ${vueCarte ? 'bg-brass text-midnight-deep' : 'text-ivory-soft hover:text-brass'}`}>
                  Carte
                </button>
              </div>
            )}
            <GhostButton onClick={exporterCsv}><Download size={12} /> CSV</GhostButton>
          </div>
        </div>
      </Card>

      {enMain && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-card border border-brass/40 bg-brass/10">
          <p className="font-sans text-xs text-brass">
            {enMain.type === 'vendor'
              ? `${vendorByUid.get(enMain.uid) ? nomAffiche(vendorByUid.get(enMain.uid)!) : 'Marchand'} en main : touchez un kiosque pour le poser.`
              : `${plan.kiosques.find((k) => k.id === enMain.id)?.code || 'Kiosque'} en main : touchez un autre kiosque pour échanger.`}
          </p>
          <button onClick={() => setEnMain(null)} className="text-xs font-sans uppercase tracking-wider text-brass hover:underline shrink-0">
            Annuler
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0 space-y-5 w-full">
          {vueCarte ? vueCarteElement : (
            <>
              {plan.rangees.map((r) => (
                <RangeeRow
                  key={r.id}
                  rangee={r}
                  kiosques={plan.kiosques.filter((k) => k.rangeeId === r.id).sort((a, b) => a.numero - b.numero)}
                  vendorByUid={vendorByUid}
                  enMain={enMain}
                  onOpenKiosque={onKiosqueClic}
                  onToggleEnMainKiosque={onToggleEnMainKiosque}
                  onDropVendorSurKiosque={assignerVendorSurKiosque}
                  onDropKiosqueSurKiosque={(kiosqueId, sourceId) => echangerKiosques(sourceId, kiosqueId)}
                  onRenommer={(nom) => appliquer((p) => renommerRangee(p, r.id, nom))}
                  onAjouterKiosque={() => appliquer((p) => ajouterKiosque(p, r.id))}
                  onRetirerDernierKiosque={() => appliquer((p) => retirerDernierKiosque(p, r.id))}
                  onRetirerRangee={() => appliquer((p) => retirerRangee(p, r.id))}
                />
              ))}
              <button
                onClick={() => appliquer((p) => ajouterRangee(p))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card border border-dashed border-ivory-soft/25 text-ivory-soft hover:border-brass hover:text-brass transition text-xs font-sans uppercase tracking-wider"
              >
                <Plus size={12} /> Ajouter une rangée
              </button>
              {!plan.carte && <Card className="p-4">{vueCarteElement}</Card>}
            </>
          )}
        </div>

        <RailMarchands
          vendors={vendorsSansKiosque}
          livraisons={livraisons}
          enMainUid={enMain?.type === 'vendor' ? enMain.uid : null}
          onToggleEnMain={onToggleEnMainVendor}
          onLibererIci={(kiosqueId) => appliquer((p) => liberer(p, kiosqueId))}
        />
      </div>

      <AnimatePresence>
        {kiosqueOuvert && (
          <PanneauKiosque
            key={kiosqueOuvert.id}
            kiosque={kiosqueOuvert}
            rangeeNom={plan.rangees.find((r) => r.id === kiosqueOuvert.rangeeId)?.nom || ''}
            vendor={kiosqueOuvert.vendorUid ? vendorByUid.get(kiosqueOuvert.vendorUid) || null : null}
            fiche={
              kiosqueOuvert.vendorUid && vendorByUid.get(kiosqueOuvert.vendorUid)
                ? ficheDeVendor(vendorByUid.get(kiosqueOuvert.vendorUid)!, livraisons)
                : null
            }
            /* Repli sur 'admin' quand Firebase Auth n'a rien à donner
             * (mode VITE_ADMIN_DEV_BYPASS) : le même repli que
             * MarchandsSection prend pour son propre fil de messages,
             * pour que le panneau reste utilisable hors connexion réelle. */
            currentUid={adminUser?.uid || 'admin'}
            currentName={adminUser?.displayName || adminUser?.email || 'FMM'}
            onClose={() => setKiosqueOuvertId(null)}
            onPatch={(patch) => appliquer((p) => modifierKiosque(p, kiosqueOuvert.id, patch))}
            onLiberer={() => { appliquer((p) => liberer(p, kiosqueOuvert.id)); setKiosqueOuvertId(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const TemoinSauvegarde: React.FC<{ etat: 'idle' | 'saving' | 'saved' | 'erreur' }> = ({ etat }) => {
  if (etat === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-sans uppercase tracking-wider text-ivory-soft/60">
        <Loader2 size={11} className="animate-spin" /> Enregistrement…
      </span>
    );
  }
  if (etat === 'erreur') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-sans uppercase tracking-wider text-blush">
        <AlertTriangle size={11} /> Échec de la sauvegarde
      </span>
    );
  }
  if (etat === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-sans uppercase tracking-wider text-emerald-300">
        <Save size={11} /> Enregistré
      </span>
    );
  }
  return null;
};

export default PlanMarcheSection;
