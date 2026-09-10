import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Repliable from './Repliable';
import EquipeClan, { ICONES } from '../clan/EquipeClan';
import { ARCHETYPES, FICHES, GROUPES } from '../../content/placeClan';
import { epinglerPlace, lirePlaceDe, type Place, type ResultatClan } from '../../firebase/placeClan';

// ─── « Ma place dans le clan », sur la fiche d'un membre ────────────
// Le verdict du jeu de l'année de la Peste et l'équipe de sept que le
// jeu a proposée. Sur sa propre fiche, la porte vers le jeu; sur celle
// d'un autre, la lecture seule. Rien ne s'affiche tant que la personne
// n'a pas joué.
const PlaceClanBloc: React.FC<{ uid: string; lang: 'FR' | 'EN'; prive: boolean }> = ({ uid, lang, prive }) => {
  const fr = lang === 'FR';
  const [resultat, setResultat] = useState<ResultatClan | null | undefined>(undefined);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [epingle, setEpingle] = useState(true);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    let vivant = true;
    lirePlaceDe({ uid }).then((r) => {
      if (!vivant) return;
      setResultat(r.resultat); setPlaces(r.places);
      setEpingle(r.resultat?.badge !== false);
    }).catch(() => { if (vivant) setResultat(null); });
    return () => { vivant = false; };
  }, [uid]);

  if (resultat === undefined) return null;
  if (!resultat) {
    if (!prive) return null;
    return (
      <Repliable id="clan" titre={fr ? 'Ma place dans le clan' : 'My place in the clan'} icone={<Compass size={16} />}>
        <p className="font-editorial text-base text-ivory-soft leading-relaxed">
          {fr ? 'Le jeu de l’année de la Peste dit quelle place vous tenez dans une équipe, puis vous propose un clan.' : 'The Plague year’s game tells you your place in a team, then offers you a clan.'}{' '}
          <Link to={fr ? '/jeux/clan' : '/en/games/clan'} style={{ color: 'var(--color-amber-glow)' }}>{fr ? 'Trouver ma place' : 'Find my place'}</Link>
        </p>
      </Repliable>
    );
  }
  const g = GROUPES[resultat.groupe];
  return (
    <Repliable id="clan" titre={fr ? (prive ? 'Ma place dans le clan' : 'Sa place dans le clan') : (prive ? 'My place in the clan' : 'Their place in the clan')}
               icone={<Compass size={16} />} resume={g.titres[resultat.fonction]}>
      <div className="space-y-4">
        {prive && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox" checked={epingle} disabled={occupe}
              onChange={async (e) => {
                const veut = e.target.checked;
                setEpingle(veut); setOccupe(true);
                try { await epinglerPlace({ afficher: veut }); }
                catch { setEpingle(!veut); }
                setOccupe(false);
              }}
              style={{ accentColor: 'var(--color-amber-glow)' }}
            />
            <span className="font-editorial text-sm text-ivory-soft">
              {fr ? 'Afficher ma place en badge, à côté de mon nom' : 'Show my place as a badge, next to my name'}
            </span>
          </label>
        )}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-2xl text-ivory inline-flex items-center gap-2">{ICONES[resultat.fonction]} {g.titres[resultat.fonction]}</span>
          <span className="font-sans uppercase tracking-[0.18em] text-[10px]" style={{ color: 'var(--color-amber-glow)' }}>
            {g.nom} · {ARCHETYPES[resultat.archetype].nom} · {fr ? 'à défaut' : 'otherwise'} {g.titres[resultat.seconde]}
          </span>
        </div>
        <p className="font-editorial text-base text-ivory-soft leading-relaxed">{FICHES[resultat.fonction].role}</p>
        {places && (
          <div>
            <p className="font-sans uppercase tracking-[0.18em] text-[10px] text-ivory-soft/70 mb-2">{fr ? 'L’équipe proposée par le jeu' : 'The team the game proposed'}</p>
            <EquipeClan groupe={resultat.groupe} places={places} moi={uid} />
          </div>
        )}
        <div className="flex flex-wrap gap-4 font-sans uppercase tracking-[0.2em] text-[11px]">
          {resultat.clanId && <Link to={`/guildes/${resultat.clanId}`} style={{ color: 'var(--color-amber-glow)' }}>{fr ? 'La page du clan' : 'The clan page'}</Link>}
          {prive && <Link to={fr ? '/jeux/clan' : '/en/games/clan'} className="text-ivory-soft/70">{fr ? 'Revoir mon équipe ou rejouer' : 'Review my team or play again'}</Link>}
        </div>
      </div>
    </Repliable>
  );
};

export default PlaceClanBloc;
