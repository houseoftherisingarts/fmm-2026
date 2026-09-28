import React, { useEffect, useState } from 'react';
import { CalendarClock, Check, Plus, Send } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { suivreRdv, proposerRdv, rendezVousConvenu, type RdvMatch } from '../../firebase/tournoi';

// ─── Le rendez-vous entre adversaires ────────────────────────────────
// Alex, 2026-09-28 : les deux personnes d'un match se coordonnent pour
// jouer en direct. Chacune propose jusqu'à trois moments et un mot;
// l'autre en choisit un, et le rendez-vous est convenu. Tout vit dans
// tournois/{id}/matchs/{id}/rdv/{uid}, un document par personne. Le
// minuteur du coup (24 h) et l'échéance de la ronde continuent de courir :
// le rendez-vous aide, il ne suspend rien.

interface Props {
  tournoiId: string;
  matchId: string;
  moi: string;
  adversaire: { uid: string; nom: string };
  echeance: Timestamp | null | undefined;
  fr: boolean;
  /** Aperçu local : rien ne s'écrit, tout reste en mémoire. */
  apercu?: RdvMatch[];
}

const enLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const Coordination: React.FC<Props> = ({ tournoiId, matchId, moi, adversaire, echeance, fr, apercu }) => {
  const t = fr ? FR : EN;
  const [rdvs, setRdvs] = useState<RdvMatch[]>(apercu ?? []);
  const [creneaux, setCreneaux] = useState<string[]>(['']);
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (apercu) return;
    return suivreRdv(tournoiId, matchId, setRdvs);
  }, [tournoiId, matchId, apercu]);

  const mien = rdvs.find((r) => r.uid === moi);
  const autre = rdvs.find((r) => r.uid === adversaire.uid);
  const convenu = rendezVousConvenu(mien, autre);

  // Le formulaire reprend ce que j'ai déjà proposé.
  useEffect(() => {
    if (!mien) return;
    setCreneaux(mien.creneaux.length ? mien.creneaux.map((c) => enLocal(c.toDate())) : ['']);
    setMessage(mien.message);
  }, [mien?.majLe?.toMillis(), mien?.creneaux.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const quand = (ts: Timestamp) =>
    ts.toDate().toLocaleString(fr ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  const enregistrer = async (choix: Timestamp | null) => {
    const dates = creneaux.map((v) => (v ? new Date(v) : null)).filter((d): d is Date => !!d && !Number.isNaN(d.getTime()));
    const nouveau: RdvMatch = {
      uid: moi, message: message.trim().slice(0, 200), choix,
      creneaux: dates.slice(0, 3).map((d) => Timestamp.fromDate(d)),
    };
    if (apercu) { setRdvs((l) => [...l.filter((r) => r.uid !== moi), nouveau]); return; }
    setOccupe(true); setErreur(null);
    try { await proposerRdv(tournoiId, matchId, moi, { creneaux: dates, message, choix }); }
    catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };

  const champ = 'w-full bg-black/40 border border-brass/25 rounded-card px-3 py-2 font-sans text-[13px] text-ivory placeholder:text-ivory-soft/35 focus:outline-none focus:border-brass/60';
  const petit = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card border font-sans text-[13px] tracking-[0.06em] transition-colors disabled:opacity-50';

  return (
    <div className="mt-3 pt-3 border-t border-brass/15 space-y-3">
      <p className="font-sans uppercase tracking-[0.2em] text-[13px] text-ivory-soft/55 flex items-center gap-1.5">
        <CalendarClock size={13} className="text-brass" /> {t.titre(adversaire.nom)}
      </p>
      {echeance && (
        <p className="font-sans text-[13px] text-ivory-soft/70">{t.avantLe} <span className="text-ivory">{quand(echeance)}</span></p>
      )}

      {convenu ? (
        <p className="rounded-card border border-brass/50 px-3 py-2.5 font-display text-sm text-brass flex items-center gap-2"
           style={{ background: 'rgba(var(--sk-glow-rgb),0.1)' }}>
          <Check size={14} /> {t.convenu} {quand(convenu)}
        </p>
      ) : autre && autre.creneaux.length > 0 ? (
        <div className="space-y-1.5">
          <p className="font-sans text-[13px] text-ivory-soft/70">{t.propose(adversaire.nom)}</p>
          {autre.message && <p className="font-editorial text-sm text-ivory-soft">« {autre.message} »</p>}
          <div className="flex flex-col gap-1.5">
            {autre.creneaux.map((c) => (
              <button key={c.toMillis()} type="button" disabled={occupe} onClick={() => enregistrer(c)}
                      className={`${petit} justify-between border-brass/35 text-ivory hover:bg-brass/15`}>
                <span>{quand(c)}</span><span className="text-brass">{t.choisir}</span>
              </button>
            ))}
          </div>
        </div>
      ) : autre?.message ? (
        <p className="font-editorial text-sm text-ivory-soft">« {autre.message} »</p>
      ) : (
        <p className="font-sans text-[13px] text-ivory-soft/50">{t.rien(adversaire.nom)}</p>
      )}

      {!convenu && (
        <div className="space-y-2">
          <p className="font-sans text-[13px] text-ivory-soft/70">{mien?.creneaux.length ? t.mesMoments : t.proposer}</p>
          {creneaux.map((v, i) => (
            <input key={i} type="datetime-local" value={v} className={champ}
                   onChange={(e) => setCreneaux((l) => l.map((x, j) => (j === i ? e.target.value : x)))} />
          ))}
          {creneaux.length < 3 && (
            <button type="button" onClick={() => setCreneaux((l) => [...l, ''])}
                    className={`${petit} border-brass/20 text-ivory-soft/70 hover:border-brass/50`}>
              <Plus size={12} /> {t.autreMoment}
            </button>
          )}
          <input type="text" value={message} maxLength={200} placeholder={t.motPlaceholder} className={champ}
                 onChange={(e) => setMessage(e.target.value)} />
          <button type="button" disabled={occupe || !creneaux.some(Boolean)} onClick={() => enregistrer(mien?.choix ?? null)}
                  className={`${petit} border-brass/50 text-brass hover:bg-brass hover:text-[var(--sk-brown-dark)] uppercase tracking-[0.16em]`}>
            <Send size={12} /> {mien?.creneaux.length ? t.mettreAJour : t.envoyer}
          </button>
          {erreur && <p className="font-sans text-[13px] text-red-300">{erreur}</p>}
        </div>
      )}
    </div>
  );
};

const FR = {
  titre: (nom: string) => `Rendez-vous avec ${nom}`,
  avantLe: 'Ronde à finir avant le',
  convenu: 'Rendez-vous convenu :',
  propose: (nom: string) => `${nom} propose de jouer :`,
  choisir: 'Ce moment me va',
  rien: (nom: string) => `${nom} n’a encore rien proposé. Proposez un moment, la partie se joue en direct dès que vous êtes deux.`,
  proposer: 'Proposez jusqu’à trois moments :',
  mesMoments: 'Vos moments proposés :',
  autreMoment: 'Un autre moment',
  motPlaceholder: 'Un mot pour votre adversaire (facultatif)',
  envoyer: 'Proposer',
  mettreAJour: 'Mettre à jour',
};
const EN: typeof FR = {
  titre: (nom: string) => `Meet up with ${nom}`,
  avantLe: 'Round to finish before',
  convenu: 'Agreed time:',
  propose: (nom: string) => `${nom} suggests playing:`,
  choisir: 'Works for me',
  rien: (nom: string) => `${nom} has not suggested anything yet. Offer a time; the game is played live as soon as you are both there.`,
  proposer: 'Suggest up to three times:',
  mesMoments: 'Your suggested times:',
  autreMoment: 'Another time',
  motPlaceholder: 'A word for your opponent (optional)',
  envoyer: 'Suggest',
  mettreAJour: 'Update',
};

export default Coordination;
