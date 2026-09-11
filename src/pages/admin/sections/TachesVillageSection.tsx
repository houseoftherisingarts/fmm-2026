import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock, ArrowRight, Users } from 'lucide-react';
import { Card } from '../primitives';
import {
  TACHES_VILLAGE, NOMS_QUI, type Qui, type TacheVillage,
} from '../../../content/tachesVillage';
import { subscribeEtatTaches, cocherTache, type EtatTaches } from '../../../firebase/tachesVillage';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Les tâches du Village Gastronomique, à cocher à plusieurs ──────
// Alex, 10 septembre 2026 : la répartition montée en juin dormait dans
// un PDF, et personne ne savait ce qui restait. Elle vit maintenant ici,
// où trois personnes la cochent en même temps depuis leur téléphone.
//
// Le contenu des tâches est écrit en dur (src/content/tachesVillage.ts).
// Firestore ne garde que ce qui est coché, alors une case perdue ne
// coûte qu'un clic.

const FILTRES: Array<{ cle: Qui | 'tous'; libelle: string }> = [
  { cle: 'tous', libelle: 'Tout le monde' },
  { cle: 'A', libelle: 'Alex' },
  { cle: 'M', libelle: 'Marc-Alexis' },
  { cle: 'P', libelle: 'Phil' },
  { cle: 'E', libelle: 'Les employés' },
];

const TachesVillageSection: React.FC = () => {
  const { user } = useAuth();
  const [etat, setEtat] = useState<EtatTaches>({});
  const [filtre, setFiltre] = useState<Qui | 'tous'>('tous');
  const [cacherFinies, setCacherFinies] = useState(false);
  const [enVol, setEnVol] = useState<Record<string, boolean>>({});
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => subscribeEtatTaches(setEtat), []);

  const visibles = useMemo(
    () => TACHES_VILLAGE.filter((t) => filtre === 'tous' || t.qui.includes(filtre)),
    [filtre],
  );

  const cochee = (t: TacheVillage) => Boolean(etat[t.id]) || (!etat[t.id] && t.etat === 'fait' && !(t.id in etat));
  const faites = visibles.filter(cochee).length;

  // Les tâches restent groupées par sous-section, dans l'ordre du document
  // d'origine, pour que la lecture à l'écran suive celle du papier.
  const groupes = useMemo(() => {
    const g: Array<{ grand: string; section: string; items: TacheVillage[] }> = [];
    for (const t of visibles) {
      if (cacherFinies && cochee(t)) continue;
      const dernier = g[g.length - 1];
      if (dernier && dernier.section === t.section) dernier.items.push(t);
      else g.push({ grand: t.grand, section: t.section, items: [t] });
    }
    return g;
  }, [visibles, cacherFinies, etat]);

  const basculer = async (t: TacheVillage) => {
    const nouvelEtat = !cochee(t);
    setEnVol((e) => ({ ...e, [t.id]: true }));
    setErreur(null);
    try {
      await cocherTache(t.id, nouvelEtat, user?.displayName || undefined);
    } catch {
      setErreur("La coche n'a pas été enregistrée. Vérifiez la connexion et réessayez.");
    } finally {
      setEnVol((e) => { const c = { ...e }; delete c[t.id]; return c; });
    }
  };

  let grandCourant = '';

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-cinzel text-xl text-brass">Village Gastronomique</h2>
            <p className="text-sm text-parchment/60 mt-1">
              La répartition des tâches montée avec Marc-Alexis et Phil. Cochez à mesure, tout le
              monde voit la même liste au même moment.
            </p>
          </div>
          <div className="text-right">
            <div className="font-cinzel text-3xl text-brass leading-none">{faites}<span className="text-parchment/40 text-xl"> / {visibles.length}</span></div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-parchment/50 mt-1">réglées</div>
          </div>
        </div>

        <div className="mt-4 h-1.5 rounded-full bg-parchment/10 overflow-hidden">
          <div
            className="h-full bg-brass/70 transition-[width] duration-500"
            style={{ width: visibles.length ? `${(faites / visibles.length) * 100}%` : '0%' }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {FILTRES.map((f) => (
            <button
              key={f.cle}
              type="button"
              onClick={() => setFiltre(f.cle)}
              aria-pressed={filtre === f.cle}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filtre === f.cle
                  ? 'border-brass/60 bg-brass/15 text-brass'
                  : 'border-parchment/15 text-parchment/70 hover:border-parchment/30'
              }`}
            >
              {f.libelle}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm text-parchment/60 cursor-pointer">
            <input
              type="checkbox"
              checked={cacherFinies}
              onChange={(e) => setCacherFinies(e.target.checked)}
              className="accent-brass"
            />
            Cacher ce qui est réglé
          </label>
        </div>

        {erreur && (
          <p role="alert" className="mt-3 text-sm text-red-300/90">{erreur}</p>
        )}
      </Card>

      {groupes.map((g, i) => {
        const nouveauGrand = g.grand !== grandCourant;
        grandCourant = g.grand;
        return (
          <React.Fragment key={`${g.section}-${i}`}>
            {nouveauGrand && (
              <h3 className="font-cinzel text-sm uppercase tracking-[0.14em] text-brass/80 pt-2">
                {g.grand}
              </h3>
            )}
            <Card>
              <h4 className="font-cinzel text-xs uppercase tracking-[0.1em] text-parchment/50 mb-3">
                {g.section}
              </h4>
              <ul className="space-y-1">
                {g.items.map((t) => {
                  const est = cochee(t);
                  const occupe = enVol[t.id];
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => basculer(t)}
                        disabled={occupe}
                        aria-pressed={est}
                        className="w-full text-left flex items-start gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-parchment/5 transition-colors disabled:opacity-50"
                      >
                        <span className="mt-0.5 shrink-0">
                          {est
                            ? <CheckCircle2 size={18} className="text-brass" />
                            : <Circle size={18} className="text-parchment/30" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block ${est ? 'line-through text-parchment/40' : 'text-parchment/90'}`}>
                            {t.nom}
                            {t.qui.length > 1 && (
                              <span className="text-parchment/45 text-sm"> avec {t.qui.filter((q) => filtre === 'tous' || q !== filtre).map((q) => NOMS_QUI[q]).join(', ')}</span>
                            )}
                          </span>
                          {t.note && !est && (
                            <span className="block text-[11.5px] text-parchment/45 mt-0.5">{t.note}</span>
                          )}
                          {est && etat[t.id]?.par && (
                            <span className="block text-[11.5px] text-parchment/40 mt-0.5">coché par {etat[t.id].par}</span>
                          )}
                        </span>
                        {!est && t.etat === 'encours' && (
                          <span className="shrink-0 flex items-center gap-1 text-[11px] uppercase tracking-wider text-amber-200/70">
                            <Clock size={12} /> entamé
                          </span>
                        )}
                        {!est && t.etat === 'apres' && (
                          <span className="shrink-0 flex items-center gap-1 text-[11px] uppercase tracking-wider text-parchment/45">
                            <ArrowRight size={12} /> après
                          </span>
                        )}
                        {filtre === 'tous' && t.qui.length === 1 && (
                          <span className="shrink-0 flex items-center gap-1 text-[11px] text-parchment/40">
                            <Users size={12} /> {NOMS_QUI[t.qui[0]]}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default TachesVillageSection;
