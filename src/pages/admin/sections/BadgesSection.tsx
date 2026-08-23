import React, { useEffect, useMemo, useState } from 'react';
import { ANNONCES } from '../../../content/annonces';
import { listerAcceptations, type Acceptation } from '../../../firebase/avis';
import { COLLECTIONS, TOUS_LES_BADGES, sceauDe } from '../../../firebase/badges';

// ─── Admin · Babillard et badges ─────────────────────────────────────
// Qui a décroché quel avis du babillard (Alex, 2026-08-23), et le
// catalogue des badges avec le prix rattaché à chaque collection.

const PRIX = { petit: 'Petit prix', moyen: 'Prix moyen', grand: 'Grand prix' };

const BadgesSection: React.FC = () => {
  const [lignes, setLignes] = useState<Acceptation[]>([]);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    let vivant = true;
    listerAcceptations()
      .then((r) => { if (vivant) setLignes(r); })
      .finally(() => { if (vivant) setCharge(false); });
    return () => { vivant = false; };
  }, []);

  const parAvis = useMemo(() => {
    const m = new Map<string, Acceptation[]>();
    lignes.forEach((l) => m.set(l.avisId, [...(m.get(l.avisId) || []), l]));
    return m;
  }, [lignes]);

  const complets = useMemo(() => {
    const parPersonne = new Map<string, number>();
    lignes.forEach((l) => parPersonne.set(l.uid, (parPersonne.get(l.uid) || 0) + 1));
    return Array.from(parPersonne.values()).filter((n) => n >= ANNONCES.length).length;
  }, [lignes]);

  return (
    <div className="space-y-10">
      <header>
        <h2 className="font-display title-medieval text-2xl text-ivory mb-2">Babillard et badges</h2>
        <p className="font-editorial text-sm text-ivory-soft/80 leading-relaxed max-w-2xl">
          Chaque avis du babillard porte un bouton « Accepté ». L’avis quitte alors le tableau du
          visiteur et rejoint sa collection. Voici qui a pris quoi, et le catalogue des badges avec
          la taille du prix rattachée à chaque collection.
        </p>
      </header>

      <section>
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h3 className="font-display title-medieval text-lg text-ivory">Avis décrochés</h3>
          <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-ivory-soft/55">
            {lignes.length} acceptation{lignes.length > 1 ? 's' : ''} · {complets} babillard{complets > 1 ? 's' : ''} complet{complets > 1 ? 's' : ''}
          </span>
        </div>
        {charge ? (
          <p className="font-sans text-sm text-ivory-soft/55">Lecture…</p>
        ) : (
          <div className="space-y-5">
            {ANNONCES.map((a) => {
              const gens = parAvis.get(a.id) || [];
              return (
                <div key={a.id} className="rounded-lg-card border border-brass/25 p-5"
                     style={{ background: 'rgba(26, 5, 11, 0.4)' }}>
                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <h4 className="font-display text-base text-ivory">{a.titleFR}</h4>
                    <span className="font-sans text-xs" style={{ color: '#D8B05A' }}>{gens.length}</span>
                  </div>
                  {gens.length === 0 ? (
                    <p className="font-sans text-[13px] text-ivory-soft/45">Personne ne l’a encore décroché.</p>
                  ) : (
                    <ul className="space-y-1">
                      {gens.map((g) => (
                        <li key={g.uid} className="font-sans text-[13px] text-ivory-soft/80">
                          {g.nom || '(sans nom)'} · {g.courriel || g.uid}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h3 className="font-display title-medieval text-lg text-ivory">Le catalogue des badges</h3>
          <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-ivory-soft/55">
            {TOUS_LES_BADGES.length} badges · {COLLECTIONS.length} collections
          </span>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {COLLECTIONS.map((c) => (
            <div key={c.id} className="rounded-lg-card border border-brass/25 p-5"
                 style={{ background: 'rgba(26, 5, 11, 0.4)' }}>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h4 className="font-display text-base text-ivory">{c.nomFR}</h4>
                <span className="font-sans uppercase tracking-[0.18em] text-[10px]" style={{ color: '#D8B05A' }}>
                  {PRIX[c.prix]}
                </span>
              </div>
              <ul className="space-y-1.5">
                {c.badges.map((b) => (
                  <li key={b.id} className="font-sans text-[13px] text-ivory-soft/80 flex gap-2">
                    <img src={sceauDe(b.id)} alt="" aria-hidden loading="lazy" className="w-7 h-7 object-contain shrink-0" />
                    <span><strong className="font-normal text-ivory">{b.nomFR}</strong> · {b.texteFR}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-5 font-editorial text-sm text-ivory-soft/70 leading-relaxed max-w-2xl">
          Les prix restent à choisir. Le site annonce leur taille, jamais leur contenu, et le
          visiteur qui réunit les {TOUS_LES_BADGES.length} badges déclenche le très grand prix.
        </p>
      </section>
    </div>
  );
};

export default BadgesSection;
