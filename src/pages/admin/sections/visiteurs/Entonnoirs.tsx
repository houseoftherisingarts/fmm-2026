import React, { useEffect, useMemo, useState } from 'react';
import { Card, GhostButton, Input, Label, PrimaryButton } from '../../primitives';
import { chargerReglages, chargerSessions, enregistrerReglages, nb, pct, type Resume, type Session } from './donnees';
import type { Periode } from '../VisiteursSection';
import type { ReglagesVexelHotjar } from '../../../../vexelhotjar';

// ─── Parcours (entonnoirs) ──────────────────────────────────────────────────
// Un parcours, c'est une suite de pages que le client voudrait voir enchaînées
// (l'accueil, puis une formation, puis le paiement). Pour chaque étape, la
// part des visites qui s'y est rendue après l'étape précédente, et où l'on
// perd le plus de monde. Les parcours se gardent dans les réglages; les
// visites de la période se relisent à chaque ouverture.

type Entonnoir = NonNullable<ReglagesVexelHotjar['entonnoirs']>[number];

const correspond = (path: string, motif: string): boolean => {
  const m = motif.trim();
  if (!m) return false;
  if (m.endsWith('*')) return path.startsWith(m.slice(0, -1));
  return path === m || path === m.replace(/\/$/, '');
};

function compter(sessions: Session[], etapes: string[]): number[] {
  const n = etapes.map(() => 0);
  for (const s of sessions) {
    const parcours = s.parcours && s.parcours.length ? s.parcours : [s.entree || ''];
    let depuis = 0;
    for (let i = 0; i < etapes.length; i += 1) {
      const idx = parcours.findIndex((p, k) => k >= depuis && correspond(p, etapes[i]));
      if (idx < 0) break;
      n[i] += 1;
      depuis = idx;
    }
  }
  return n;
}

interface Props { resume: Resume | null; periode: Periode }

const Entonnoirs: React.FC<Props> = ({ resume, periode }) => {
  const [liste, setListe] = useState<Entonnoir[]>([]);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [edite, setEdite] = useState<Entonnoir | null>(null);
  const [sauve, setSauve] = useState(false);
  const [erreur, setErreur] = useState(false);

  useEffect(() => { chargerReglages().then(r => setListe(r.entonnoirs || [])); }, []);
  useEffect(() => {
    let vivant = true;
    setSessions(null); setErreur(false);
    chargerSessions(new Date(periode.de + 'T00:00:00')).then(s => { if (vivant) setSessions(s); }).catch(() => { if (vivant) { setErreur(true); setSessions([]); } });
    return () => { vivant = false; };
  }, [periode]);

  const chemins = useMemo(() => (resume?.pages || []).map(p => p.path), [resume]);

  const garder = async (l: Entonnoir[]) => {
    setListe(l);
    setSauve(true);
    await enregistrerReglages({ entonnoirs: l }).catch(() => {});
    setSauve(false);
  };
  const enregistrerEdite = () => {
    if (!edite) return;
    const propre = { ...edite, nom: edite.nom.trim() || 'Parcours', etapes: edite.etapes.map(e => e.trim()).filter(Boolean) };
    if (propre.etapes.length < 2) return;
    const existe = liste.some(e => e.id === propre.id);
    garder(existe ? liste.map(e => (e.id === propre.id ? propre : e)) : [...liste, propre]);
    setEdite(null);
  };

  return (
    <div className="space-y-5">
      {!edite && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#ECE5D2]/70 dark:text-white/60">
            {erreur ? 'La lecture des visites a échoué; changez de période ou revenez dans un instant.' : sessions ? `${nb(sessions.length)} visites lues sur ${periode.jours} jours.` : 'Lecture des visites…'}
          </p>
          <PrimaryButton type="button" onClick={() => setEdite({ id: `e${Date.now().toString(36)}`, nom: '', etapes: [chemins[0] || '/accueil', ''] })}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nouveau parcours
          </PrimaryButton>
        </div>
      )}

      {edite && (
        <Card className="p-6">
          <p className="mb-4 font-serif text-lg text-[#ECE5D2] dark:text-white">{liste.some(e => e.id === edite.id) ? 'Modifier le parcours' : 'Nouveau parcours'}</p>
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <div>
              <Label>Nom</Label>
              <Input value={edite.nom} onChange={e => setEdite({ ...edite, nom: e.target.value })} placeholder="De l'accueil à l'achat" />
            </div>
            <div>
              <Label>Étapes, dans l'ordre (une adresse par ligne; l'étoile vaut pour tout ce qui suit)</Label>
              <div className="space-y-2">
                {edite.etapes.map((et, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-[11px] font-bold text-[#C9A85A]">{i + 1}</span>
                    <Input list="vh-chemins" value={et} onChange={e => setEdite({ ...edite, etapes: edite.etapes.map((x, k) => (k === i ? e.target.value : x)) })} placeholder="/formations/*" />
                    <button type="button" aria-label="Retirer cette étape" onClick={() => setEdite({ ...edite, etapes: edite.etapes.filter((_, k) => k !== i) })} className="h-8 w-8 shrink-0 rounded-full text-[#ECE5D2]/40 hover:bg-red-50 hover:text-red-500"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
                  </div>
                ))}
                <datalist id="vh-chemins">{chemins.map(c => <option key={c} value={c} />)}</datalist>
                <GhostButton type="button" onClick={() => setEdite({ ...edite, etapes: [...edite.etapes, ''] })}><i className="fa-solid fa-plus" aria-hidden="true" /> Ajouter une étape</GhostButton>
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <PrimaryButton type="button" onClick={enregistrerEdite} disabled={edite.etapes.filter(e => e.trim()).length < 2}>Enregistrer</PrimaryButton>
            <GhostButton type="button" onClick={() => setEdite(null)}>Annuler</GhostButton>
          </div>
        </Card>
      )}

      {!liste.length && !edite && (
        <Card className="p-6">
          <p className="font-serif text-xl text-[#ECE5D2] dark:text-white">Aucun parcours défini.</p>
          <p className="mt-2 max-w-2xl text-sm text-[#ECE5D2]/70 dark:text-white/60">
            Un parcours suit les visites d'une page à l'autre et montre où elles décrochent. Le premier à créer serait celui qui mène à un achat :
            l'accueil, puis la page d'une formation, puis la page de paiement.
          </p>
        </Card>
      )}

      {liste.map(e => {
        const n = sessions ? compter(sessions, e.etapes) : e.etapes.map(() => 0);
        const base = n[0] || 0;
        const pire = n.reduce((p, v, i) => (i > 0 && n[i - 1] - v > (n[p - 1] || 0) - (n[p] || 0) ? i : p), 1);
        return (
          <Card key={e.id} className="p-6">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg text-[#ECE5D2] dark:text-white">{e.nom}</h3>
                <p className="text-[12px] text-[#ECE5D2]/60 dark:text-white/50">
                  {base ? `${pct(n[n.length - 1], base)} % des visites vont jusqu'au bout` : 'Aucune visite n\'a commencé ce parcours sur la période.'}
                  {base > 0 && n.length > 1 && n[pire - 1] - n[pire] > 0 && ` · la plus grosse perte est entre l'étape ${pire} et l'étape ${pire + 1}`}
                </p>
              </div>
              <span className="flex gap-2">
                <button type="button" onClick={() => setEdite({ ...e, etapes: [...e.etapes] })} className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#C9A85A] hover:underline">Modifier</button>
                <button type="button" onClick={() => { if (window.confirm(`Retirer le parcours « ${e.nom} » ?`)) garder(liste.filter(x => x.id !== e.id)); }} className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ECE5D2]/50 hover:text-red-500">Retirer</button>
              </span>
            </div>
            <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {e.etapes.map((et, i) => {
                const part = base ? n[i] / base : 0;
                const perte = i > 0 && n[i - 1] ? pct(n[i - 1] - n[i], n[i - 1]) : 0;
                return (
                  <li key={i} className="relative rounded-[16px] border border-[#ECE5D2]/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="mb-2 flex items-baseline justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-[#ECE5D2]/55"><span>Étape {i + 1}</span>{i > 0 && perte > 0 && <span className={i === pire ? 'text-[#E27A68]' : ''}>−{perte} %</span>}</p>
                    <p className="truncate text-[13px] text-[#ECE5D2] dark:text-white" title={et}>{et}</p>
                    <p className="mt-2 font-serif text-3xl leading-none text-[#ECE5D2] dark:text-white">{nb(n[i])}</p>
                    <div className="mt-3 h-[6px] w-full overflow-hidden rounded-full bg-[#ECE5D2]/[0.07]">
                      <div className="h-full rounded-full bg-[#C9A85A]" style={{ width: `${Math.max(part ? 2 : 0, part * 100)}%` }} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#ECE5D2]/55">{Math.round(part * 100)} % du départ</p>
                  </li>
                );
              })}
            </ol>
          </Card>
        );
      })}
      {sauve && <p className="text-[11px] text-[#ECE5D2]/55">Enregistrement…</p>}
    </div>
  );
};

export default Entonnoirs;
