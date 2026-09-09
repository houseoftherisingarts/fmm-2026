import React, { useEffect, useMemo, useState } from 'react';
import { Compass, RotateCcw } from 'lucide-react';
import {
  ARCHETYPES, FICHES, FONCTIONS, GROUPES, LISTE_GROUPES, QUESTIONS, type Fonction, type Groupe,
} from '../../../content/placeClan';
import { calculerScores, couverture, plafonds, trancher } from '../../../lib/placeClan';
import { statsPlaceClan, type StatsClan } from '../../../firebase/placeClan';

// ─── Admin · Jeux · Ta place dans le clan ───────────────────────────
// La carte complète du questionnaire, pour voir d'un coup d'œil quelle
// question pèse sur quel verdict sans refaire le jeu dix fois (Alex,
// 9 septembre 2026). Quatre volets : la nomenclature par groupe, la
// carte des questions et de leurs poids, un simulateur qui tranche à
// mesure qu'on coche, et les chiffres des gens qui ont joué.
//
// Le contenu vit dans src/content/placeClan.ts : cette page le lit, elle
// ne l'édite pas. Changer un poids, c'est changer ce fichier.

const COULEURS: Record<Fonction, string> = {
  souverain: '#e8b14a', champion: '#d9694a', eclaireur: '#7fb2d6', sage: '#a98ad9',
  batisseur: '#c9a56a', soigneur: '#7fc99a', heraut: '#e58fbf',
};

const Chip: React.FC<{ f: Fonction; n: number }> = ({ f, n }) => (
  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-sans"
        style={{ background: `${COULEURS[f]}22`, color: COULEURS[f], border: `1px solid ${COULEURS[f]}66` }}>
    {FICHES[f].nom.replace(/^L[ae'’] ?/, '')} +{n}
  </span>
);

const PlaceClanSection: React.FC = () => {
  const [groupe, setGroupe] = useState<Groupe>('vikings');
  const [choix, setChoix] = useState<number[]>(() => QUESTIONS.map(() => -1));
  const [stats, setStats] = useState<StatsClan | null>(null);
  const [erreurStats, setErreurStats] = useState<string | null>(null);

  useEffect(() => { statsPlaceClan({}).then(setStats).catch((e) => setErreurStats((e as Error).message)); }, []);

  const scores = useMemo(() => calculerScores(choix), [choix]);
  const nbRepondu = choix.filter((c) => c >= 0).length;
  const t = useMemo(() => trancher(scores), [scores]);
  const plaf = useMemo(() => plafonds(), []);
  const couv = useMemo(() => couverture(), []);
  const titres = GROUPES[groupe].titres;

  // Pour chaque fonction, la réponse de chaque question qui la nourrit le plus.
  const chemin = (f: Fonction) => QUESTIONS.map((q) => {
    let meilleur = -1; let pts = 0;
    q.reponses.forEach((r, i) => { const p = r.poids[f] ?? 0; if (p > pts) { pts = p; meilleur = i; } });
    return { i: meilleur, pts };
  });

  const jouerChemin = (f: Fonction) => setChoix(chemin(f).map((c) => (c.i >= 0 ? c.i : 0)));

  return (
    <div className="space-y-10">
      <header>
        <h2 className="font-display text-3xl text-ivory inline-flex items-center gap-3"><Compass size={24} /> Ta place dans le clan</h2>
        <p className="font-editorial text-base text-ivory-soft mt-2 max-w-3xl">
          Le jeu de l’année de la Peste. Sept fonctions fixes dans le moteur, quatre archétypes par-dessus, et six compagnies qui ne changent que les titres. Tout ce qui suit se lit dans <code className="text-[12px]">src/content/placeClan.ts</code>.
        </p>
      </header>

      {/* 1 · Les chiffres */}
      <section>
        <h3 className="font-sans uppercase tracking-[0.2em] text-[11px] mb-3" style={{ color: 'var(--color-amber-glow)' }}>Qui a joué</h3>
        {erreurStats && <p className="font-editorial text-sm text-ivory-soft/70">{erreurStats}</p>}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Résultats', stats.total], ['Équipes composées', stats.equipes], ['Clans fondés', stats.clans],
              ['Invitations en attente', stats.invitations.enAttente],
            ].map(([l, n]) => (
              <div key={String(l)} className="caravan-glass rounded-[15px] p-4" style={{ border: '1px solid rgba(var(--sk-glow-rgb), 0.25)' }}>
                <div className="font-display text-3xl text-ivory">{n as number}</div>
                <div className="font-sans uppercase tracking-[0.16em] text-[10px] text-ivory-soft/70">{l}</div>
              </div>
            ))}
            <div className="col-span-2 md:col-span-4 overflow-x-auto">
              <table className="w-full text-[12px] font-sans">
                <thead><tr className="text-ivory-soft/60 uppercase tracking-[0.14em] text-[10px]">
                  <th className="text-left py-1 pr-3">Compagnie</th>{FONCTIONS.map((f) => <th key={f} className="text-right px-2">{FICHES[f].nom.replace(/^L[ae'’] ?/, '')}</th>)}<th className="text-right pl-3">Total</th>
                </tr></thead>
                <tbody>{LISTE_GROUPES.map((g) => (
                  <tr key={g} className="border-t" style={{ borderColor: 'rgba(var(--sk-glow-rgb), 0.15)' }}>
                    <td className="py-1.5 pr-3 text-ivory">{GROUPES[g].nom}</td>
                    {FONCTIONS.map((f) => <td key={f} className="text-right px-2 text-ivory-soft">{stats.croise[`${g}.${f}`] ?? 0}</td>)}
                    <td className="text-right pl-3 text-ivory">{stats.parGroupe[g] ?? 0}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 2 · La nomenclature */}
      <section>
        <h3 className="font-sans uppercase tracking-[0.2em] text-[11px] mb-3" style={{ color: 'var(--color-amber-glow)' }}>Une fonction, six noms</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] font-sans">
            <thead><tr className="text-ivory-soft/60 uppercase tracking-[0.14em] text-[10px]">
              <th className="text-left py-1 pr-3">Fonction</th><th className="text-left pr-3">Archétype</th>
              {LISTE_GROUPES.map((g) => <th key={g} className="text-left px-2">{GROUPES[g].nom}</th>)}
            </tr></thead>
            <tbody>{FONCTIONS.map((f) => (
              <tr key={f} className="border-t" style={{ borderColor: 'rgba(var(--sk-glow-rgb), 0.15)' }}>
                <td className="py-1.5 pr-3" style={{ color: COULEURS[f] }}>{FICHES[f].nom}</td>
                <td className="pr-3 text-ivory-soft">{ARCHETYPES[FICHES[f].archetype].nom}</td>
                {LISTE_GROUPES.map((g) => <td key={g} className="px-2 text-ivory">{GROUPES[g].titres[f]}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      {/* 3 · La carte des questions et le simulateur, sur une même grille */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <h3 className="font-sans uppercase tracking-[0.2em] text-[11px]" style={{ color: 'var(--color-amber-glow)' }}>La carte des questions et le simulateur</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select value={groupe} onChange={(e) => setGroupe(e.target.value as Groupe)}
                    className="bg-[rgba(var(--sk-ink-rgb),0.6)] px-3 py-1.5 text-[12px] font-sans" style={{ color: 'var(--color-bone)', border: '1px solid rgba(var(--sk-glow-rgb), 0.35)' }}>
              {LISTE_GROUPES.map((g) => <option key={g} value={g}>{GROUPES[g].nom}</option>)}
            </select>
            {FONCTIONS.map((f) => (
              <button key={f} type="button" onClick={() => jouerChemin(f)} title={`Cocher partout la réponse qui nourrit le plus ${FICHES[f].nom.toLowerCase()}`}
                      className="rounded-full px-2.5 py-1 text-[11px] font-sans" style={{ background: `${COULEURS[f]}22`, color: COULEURS[f], border: `1px solid ${COULEURS[f]}66` }}>
                Chemin {titres[f]}
              </button>
            ))}
            <button type="button" onClick={() => setChoix(QUESTIONS.map(() => -1))} className="inline-flex items-center gap-1 text-[11px] font-sans text-ivory-soft/70"><RotateCcw size={12} /> Vider</button>
          </div>
        </div>
        <p className="font-editorial text-sm text-ivory-soft/80 mb-4">
          Chaque réponse vaut trois points, répartis sur une, deux ou trois fonctions. Cochez une réponse par question : le verdict se recalcule à droite. Les boutons « Chemin » cochent d’un coup les réponses qui mènent le plus droit à une fonction.
        </p>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_20rem] gap-6">
          <ol className="space-y-4">
            {QUESTIONS.map((q, qi) => (
              <li key={q.id} className="caravan-glass rounded-[15px] p-4" style={{ border: '1px solid rgba(var(--sk-glow-rgb), 0.2)' }}>
                <div className="font-editorial text-[15px] text-ivory mb-2"><span className="text-ivory-soft/50 font-sans text-[11px] mr-2">{q.id}</span>{q.texte}</div>
                <ul className="space-y-1.5">
                  {q.reponses.map((r, ri) => (
                    <li key={ri}>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="radio" name={q.id} checked={choix[qi] === ri} onChange={() => setChoix((c) => c.map((x, i) => (i === qi ? ri : x)))} className="mt-1" />
                        <span className="font-editorial text-[14px] text-ivory-soft flex-1">{r.texte}</span>
                        <span className="flex flex-wrap gap-1 justify-end shrink-0">
                          {(Object.keys(r.poids) as Fonction[]).map((f) => <Chip key={f} f={f} n={r.poids[f]!} />)}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <aside className="xl:sticky xl:top-24 self-start space-y-4">
            <div className="caravan-glass rounded-[15px] p-4" style={{ border: '1px solid rgba(var(--sk-glow-rgb), 0.35)' }}>
              <div className="font-sans uppercase tracking-[0.16em] text-[10px] text-ivory-soft/70">Verdict · {nbRepondu}/{QUESTIONS.length} réponses</div>
              <div className="font-display text-3xl text-ivory mt-1" style={{ color: COULEURS[t.fonction] }}>{titres[t.fonction]}</div>
              <div className="font-sans text-[12px] text-ivory-soft mt-1">{FICHES[t.fonction].nom} · {ARCHETYPES[t.archetype].nom} · à défaut {titres[t.seconde]}</div>
              <ul className="mt-3 space-y-1.5">
                {FONCTIONS.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[11px] font-sans">
                    <span className="w-24 shrink-0 truncate" style={{ color: COULEURS[f] }}>{titres[f]}</span>
                    <span className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(var(--sk-glow-rgb), 0.12)' }}>
                      <span className="block h-1.5 rounded-full" style={{ width: `${(scores[f] / plaf[f]) * 100}%`, background: COULEURS[f] }} />
                    </span>
                    <span className="w-12 text-right text-ivory-soft/70">{scores[f]} / {plaf[f]}</span>
                  </li>
                ))}
              </ul>
              <p className="font-editorial text-[12px] text-ivory-soft/60 mt-3">Le plafond est le maximum qu’une fonction peut atteindre sur tout le questionnaire. À égalité, l’archétype le plus fort tranche, puis l’ordre des fonctions.</p>
            </div>
            <div className="caravan-glass rounded-[15px] p-4" style={{ border: '1px solid rgba(var(--sk-glow-rgb), 0.2)' }}>
              <div className="font-sans uppercase tracking-[0.16em] text-[10px] text-ivory-soft/70 mb-2">Équilibre du questionnaire</div>
              <ul className="space-y-1 text-[11px] font-sans">
                {FONCTIONS.map((f) => <li key={f} className="flex justify-between"><span style={{ color: COULEURS[f] }}>{FICHES[f].nom}</span><span className="text-ivory-soft">{couv[f]} réponses · plafond {plaf[f]}</span></li>)}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default PlaceClanSection;
