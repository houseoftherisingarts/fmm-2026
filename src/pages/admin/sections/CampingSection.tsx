import React, { useEffect, useMemo, useState } from 'react';
import { Tent, Caravan, RefreshCw, ShieldAlert } from 'lucide-react';
import { Card } from '../primitives';
import {
  CATEGORIES_CAMPING, LIBELLE_CAMPING, CAMPING_FLAGS_DEFAULTS,
  watchCampingFlags, setCampingFlags, placesDe, placesZeffy,
  type CampingFlags, type CategorieCamping,
} from '../../../firebase/campingFlags';
import { listerClients, type Client } from '../../../firebase/clients';
import { listVendors, CURRENT_YEAR } from '../../../firebase/applications';

// ─── Camping : les places, par catégorie ─────────────────────────────
// Alex, 2026-09-07 : « remplir et mettre à jour les places vendues
// (Zeffy) sous Public, ajouter Kiosques et Bénévoles, chaque catégorie
// compte les tentes et les VR, et en haut le total et le max ».
//
// Les chiffres vivent dans siteFlags/camping (src/firebase/campingFlags.ts).
// Chaque champ s'enregistre quand il perd le focus. Le public se
// reprend du registre des clients d'un clic; les kiosques et les
// bénévoles s'écrivent à la main, avec un rappel de ce que les
// candidatures de marchands ont coché.

const AIDE: Record<CategorieCamping, string> = {
  public:    'Les emplacements vendus sur Zeffy. Le bouton reprend le registre des clients.',
  kiosques:  'Les marchands qui campent derrière la rangée de kiosques.',
  benevoles: 'Les bénévoles logés sur le terrain pendant la fin de semaine.',
};

const champNombre =
  'w-full bg-midnight-deep/60 border border-ivory-soft/20 rounded-card px-4 py-2.5 font-sans text-lg text-ivory tabular-nums focus:border-brass focus:outline-none transition-colors';

const CampingSection: React.FC = () => {
  const [flags, setFlags] = useState<CampingFlags>(CAMPING_FLAGS_DEFAULTS);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [marchandsCamping, setMarchandsCamping] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => watchCampingFlags(setFlags), []);
  useEffect(() => {
    listerClients().then(setClients).catch(() => setClients(null));
    listVendors().then((vs) => {
      setMarchandsCamping(vs.filter((v) => v.year === CURRENT_YEAR && v.wantsCampingSpot && v.status !== 'rejected').length);
    }).catch(() => setMarchandsCamping(null));
  }, []);

  const zeffy = useMemo(() => (clients ? placesZeffy(clients, CURRENT_YEAR) : null), [clients]);

  const total = CATEGORIES_CAMPING.reduce(
    (acc, cat) => { const p = placesDe(flags, cat); return { tentes: acc.tentes + p.tentes, vr: acc.vr + p.vr }; },
    { tentes: 0, vr: 0 },
  );
  const totalPlaces = total.tentes + total.vr;
  const maxPlaces   = flags.maxTentes + flags.maxVr;
  const taux = maxPlaces > 0 ? Math.min(1, totalPlaces / maxPlaces) : 0;
  const depasse = maxPlaces > 0 && totalPlaces > maxPlaces;

  const ecrire = (valeurs: Partial<CampingFlags>) => {
    setFlags((prev) => ({ ...prev, ...valeurs }));
    setCampingFlags(valeurs).then(() => setErreur(null)).catch(() => setErreur('Firestore n’a pas pris la valeur. Réessayez dans un instant.'));
  };

  const Nombre: React.FC<{ cle: keyof CampingFlags; id: string }> = ({ cle, id }) => (
    <input
      id={id}
      type="number"
      min={0}
      step={1}
      inputMode="numeric"
      value={flags[cle]}
      onChange={(e) => setFlags((prev) => ({ ...prev, [cle]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
      onBlur={(e) => ecrire({ [cle]: Number(e.target.value) || 0 })}
      className={champNombre}
    />
  );

  return (
    <div className="space-y-6">
      <p className="font-editorial italic text-sm text-ivory-soft">
        Les places du terrain, en tentes et en VR, par catégorie. Chaque chiffre s’enregistre quand vous quittez le champ.
      </p>

      {erreur && (
        <p className="flex items-center gap-2 font-sans text-xs text-blush">
          <ShieldAlert size={13} className="shrink-0" /> {erreur}
        </p>
      )}

      {/* En haut : le total et le maximum */}
      <Card className="p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div>
            <p className="font-sans uppercase tracking-[0.3em] text-[10px] font-semibold text-brass mb-2">Places attribuées</p>
            <p className="font-display text-5xl md:text-6xl text-ivory leading-none tabular-nums">
              {totalPlaces}
              <span className="text-ivory-soft/50 text-3xl md:text-4xl"> / {maxPlaces || '—'}</span>
            </p>
            <div className="mt-4 h-2 rounded-full bg-ivory-soft/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${depasse ? 'bg-blush' : 'bg-brass'}`}
                style={{ width: `${taux * 100}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 font-sans text-sm text-ivory-soft">
              <span className="inline-flex items-center gap-2"><Tent size={15} className="text-brass" /> Tentes <b className="text-ivory tabular-nums">{total.tentes}</b> / {flags.maxTentes || '—'}</span>
              <span className="inline-flex items-center gap-2"><Caravan size={15} className="text-brass" /> VR <b className="text-ivory tabular-nums">{total.vr}</b> / {flags.maxVr || '—'}</span>
              {depasse && <span className="text-blush">Le terrain est dépassé de {totalPlaces - maxPlaces}.</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 min-w-[260px]">
            <div>
              <label htmlFor="camping-maxTentes" className="block font-sans text-sm text-ivory mb-1">Max tentes</label>
              <Nombre cle="maxTentes" id="camping-maxTentes" />
            </div>
            <div>
              <label htmlFor="camping-maxVr" className="block font-sans text-sm text-ivory mb-1">Max VR</label>
              <Nombre cle="maxVr" id="camping-maxVr" />
            </div>
            <p className="col-span-2 font-editorial italic text-xs text-ivory-soft/70">Ce que le terrain peut recevoir. Le total en haut est la somme des deux.</p>
          </div>
        </div>
      </Card>

      {/* Les trois catégories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CATEGORIES_CAMPING.map((cat) => {
          const p = placesDe(flags, cat);
          return (
            <Card key={cat} className="p-6 md:p-8 flex flex-col">
              <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1">
                {LIBELLE_CAMPING[cat]}
              </h3>
              <p className="font-editorial italic text-xs text-ivory-soft/70 mb-5">{AIDE[cat]}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`camping-${cat}-tentes`} className="flex items-center gap-1.5 font-sans text-sm text-ivory mb-1"><Tent size={14} className="text-brass" /> Tentes</label>
                  <Nombre cle={`${cat}Tentes`} id={`camping-${cat}-tentes`} />
                </div>
                <div>
                  <label htmlFor={`camping-${cat}-vr`} className="flex items-center gap-1.5 font-sans text-sm text-ivory mb-1"><Caravan size={14} className="text-brass" /> VR</label>
                  <Nombre cle={`${cat}Vr`} id={`camping-${cat}-vr`} />
                </div>
              </div>

              <p className="font-sans text-sm text-ivory-soft mt-4">
                Sous-total <b className="text-ivory tabular-nums">{p.tentes + p.vr}</b> {p.tentes + p.vr > 1 ? 'places' : 'place'}
              </p>

              {cat === 'public' && (
                <div className="mt-auto pt-5 border-t border-ivory-soft/15">
                  <p className="font-sans text-xs text-ivory-soft mb-3">
                    {zeffy ? (
                      <>
                        Zeffy, registre des clients {CURRENT_YEAR} : <b className="text-ivory tabular-nums">{zeffy.tentes}</b> tentes · <b className="text-ivory tabular-nums">{zeffy.vr}</b> VR
                        {(zeffy.tentes !== p.tentes || zeffy.vr !== p.vr) && <span className="text-brass"> · différent de ce qui est inscrit</span>}
                      </>
                    ) : 'Le registre des clients ne répond pas pour le moment.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => zeffy && ecrire({ publicTentes: zeffy.tentes, publicVr: zeffy.vr })}
                    disabled={!zeffy}
                    className="admin-ghost inline-flex items-center gap-2 disabled:opacity-40"
                  >
                    <RefreshCw size={14} /> Reprendre les chiffres Zeffy
                  </button>
                  <p className="font-editorial italic text-xs text-ivory-soft/60 mt-3">
                    Un nouvel export Zeffy se verse d’abord dans le registre (<code className="text-brass">tools/importer-clients.mjs</code>), puis ce bouton le reprend.
                  </p>
                </div>
              )}
              {cat === 'kiosques' && marchandsCamping !== null && (
                <p className="mt-auto pt-5 border-t border-ivory-soft/15 font-sans text-xs text-ivory-soft">
                  {marchandsCamping} {marchandsCamping > 1 ? 'marchands ont' : 'marchand a'} coché un emplacement de camping dans sa candidature {CURRENT_YEAR}.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CampingSection;
