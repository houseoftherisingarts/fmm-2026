import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chargerJournees, resumer, jourISO, ilYA, type Resume } from './visiteurs/donnees';
import VueEnsemble from './visiteurs/VueEnsemble';
import CartesChaleur from './visiteurs/CartesChaleur';
import Enregistrements from './visiteurs/Enregistrements';
import Entonnoirs from './visiteurs/Entonnoirs';
import Frictions from './visiteurs/Frictions';
import Reglages from './visiteurs/Reglages';

// ─── Visiteurs et clics (VexelHotjar) ───────────────────────────────────────
// La section qui répond à « où cliquent les gens, qu'est-ce qui marche ». Six
// onglets, une seule période partagée : la vue d'ensemble, les cartes de
// chaleur, les enregistrements de visites, les parcours, les accrocs et les
// réglages. L'onglet et la période vivent dans l'adresse (?onglet=&jours=),
// donc un lien envoyé à quelqu'un ouvre exactement la même vue.

export type Onglet = 'ensemble' | 'cartes' | 'enregistrements' | 'entonnoirs' | 'frictions' | 'reglages';
const ONGLETS: { id: Onglet; label: string; icon: string }[] = [
  { id: 'ensemble',        label: 'Vue d\'ensemble',   icon: 'fa-gauge-high' },
  { id: 'cartes',          label: 'Cartes de chaleur', icon: 'fa-fire' },
  { id: 'enregistrements', label: 'Visites filmées',   icon: 'fa-film' },
  { id: 'entonnoirs',      label: 'Parcours',          icon: 'fa-route' },
  { id: 'frictions',       label: 'Accrocs',           icon: 'fa-triangle-exclamation' },
  { id: 'reglages',        label: 'Réglages',          icon: 'fa-sliders' },
];
const PERIODES = [7, 14, 30, 90] as const;

export interface Periode { jours: number; de: string; a: string }

const VisiteursSection: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const onglet = (ONGLETS.find(o => o.id === params.get('onglet'))?.id || 'ensemble') as Onglet;
  const jours = (PERIODES as readonly number[]).includes(Number(params.get('jours'))) ? Number(params.get('jours')) : 30;
  const periode = useMemo<Periode>(() => ({ jours, de: jourISO(ilYA(jours - 1)), a: jourISO(new Date()) }), [jours]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const poser = (cle: string, valeur: string) => {
    const p = new URLSearchParams(params);
    p.set(cle, valeur);
    setParams(p, { replace: true });
  };

  useEffect(() => {
    let vivant = true;
    setResume(null); setErreur(null);
    chargerJournees(periode.de, periode.a)
      .then(j => { if (vivant) setResume(resumer(j, periode.de, periode.a)); })
      .catch(e => { if (vivant) setErreur(e?.message || 'Les données ne se chargent pas.'); });
    return () => { vivant = false; };
  }, [periode, version]);

  const pageChoisie = params.get('page') || '';
  const voirCarte = (clePage: string) => { const p = new URLSearchParams(params); p.set('onglet', 'cartes'); p.set('page', clePage); setParams(p); };

  return (
    <div className="space-y-6">
      {/* Onglets et période, sur une seule rangée qui replie sur mobile */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-full border border-white/60 bg-white/45 p-1 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/50">
          {ONGLETS.map(o => (
            <button key={o.id} type="button" onClick={() => poser('onglet', o.id)}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${onglet === o.id ? 'bg-[#BA7B39] text-[#293027] shadow-[0_6px_18px_-8px_rgba(186,123,57,0.7)]' : 'text-[#38403a]/65 hover:bg-white/60 hover:text-[#38403a] dark:text-white/65 dark:hover:bg-white/10'}`}>
              <i className={`fa-solid ${o.icon} text-[10px]`} aria-hidden="true" />
              <span>{o.label}</span>
            </button>
          ))}
        </div>
        {onglet !== 'reglages' && onglet !== 'enregistrements' && (
          <div className="ml-auto flex gap-1 rounded-full border border-white/60 bg-white/45 p-1 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/50" role="group" aria-label="Période">
            {PERIODES.map(n => (
              <button key={n} type="button" onClick={() => poser('jours', String(n))}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold tabular-nums transition-colors ${jours === n ? 'bg-[#293027] text-[#EEE7DB]' : 'text-[#38403a]/65 hover:bg-white/60 dark:text-white/65'}`}>
                {n} j
              </button>
            ))}
          </div>
        )}
      </div>

      {erreur && (
        <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</div>
      )}

      {onglet === 'ensemble' && <VueEnsemble resume={resume} periode={periode} onVoirCarte={voirCarte} onRafraichi={() => setVersion(v => v + 1)} />}
      {onglet === 'cartes' && <CartesChaleur resume={resume} periode={periode} pageChoisie={pageChoisie} onPage={c => poser('page', c)} />}
      {onglet === 'enregistrements' && <Enregistrements />}
      {onglet === 'entonnoirs' && <Entonnoirs resume={resume} periode={periode} />}
      {onglet === 'frictions' && <Frictions resume={resume} onVoirCarte={voirCarte} />}
      {onglet === 'reglages' && <Reglages />}
    </div>
  );
};

export default VisiteursSection;
