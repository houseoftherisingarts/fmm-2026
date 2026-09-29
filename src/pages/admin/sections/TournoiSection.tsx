import React, { useEffect, useState } from 'react';
import { Swords, Crown, Trash2, Play, Gavel } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Card, Input, Label, PrimaryButton, GhostButton, DangerButton, Badge, EmptyState, ToggleSwitch, fmtDate } from '../primitives';
import { useSiteFlags } from '../../../contexts/SiteFlagsContext';
import { setSiteFlag } from '../../../firebase/siteFlags';
import { REGLES } from '../../../games/hnefatafl/gameLogic';
import { DELAIS_DEFI } from '../../../firebase/tafl';
import {
  suivreTournois, suivreInscriptions, suivreMatchs, creerTournoi, majTournoi, supprimerTournoi,
  desinscrire, lancerTournoi, trancherMatch, matchsDeRonde, nomDeRonde,
  type Tournoi, type InscriptionTournoi, type MatchTournoi, type StatutTournoi,
} from '../../../firebase/tournoi';

// ─── Admin · Jeux · Tournoi de hnefatafl ────────────────────────────
// La régie du tournoi du 7 mars 2027 (Alex, 2026-09-28). On crée la
// fiche en brouillon, on ouvre les inscriptions quand la page est
// publiée (drapeau `pubTournoi` dans Paramètres), on lance le tirage le
// jour venu, et on tranche à la main les matchs d'une personne absente.
// Le reste (rondes, couronne) se fait tout seul dans functions/tournoi.js.

const TON: Record<StatutTournoi, 'neutral' | 'info' | 'accepted' | 'pending'> = {
  brouillon: 'neutral', inscriptions: 'info', encours: 'accepted', fini: 'pending',
};
const LIBELLE: Record<StatutTournoi, string> = {
  brouillon: 'Brouillon', inscriptions: 'Inscriptions ouvertes', encours: 'En cours', fini: 'Terminé',
};

const enLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const TournoiSection: React.FC = () => {
  const [tournois, setTournois] = useState<Tournoi[]>([]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [nom, setNom] = useState('Tournoi de hnefatafl 2027');
  const [date, setDate] = useState(enLocal(new Date(2027, 2, 7, 13, 0)));
  const [regleId, setRegleId] = useState('copenhague');
  const [dureeJours, setDureeJours] = useState(7);
  // 24 heures par coup, timeout = forfait (Alex, 2026-09-28).
  const [delaiMs, setDelaiMs] = useState(DELAIS_DEFI[2].ms);
  const [erreur, setErreur] = useState<string | null>(null);
  // La publication est une bascule ici même (Alex, 2026-09-28 : « tout en
  // mode toggle in admin; quand je publie le tournoi, c'est que c'est
  // prêt à faire »). Même drapeau que dans Paramètres.
  const { flags } = useSiteFlags();
  const [erreurPub, setErreurPub] = useState<string | null>(null);
  const publier = (v: boolean) => { setErreurPub(null); setSiteFlag('pubTournoi', v).catch((e) => setErreurPub((e as Error).message)); };
  const pret = tournois.some((t) => t.statut !== 'brouillon');

  useEffect(() => suivreTournois(setTournois, true), []);

  const creer = async () => {
    setErreur(null);
    try {
      const id = await creerTournoi({ nom, dateDebut: new Date(date), dureeJours, regleId, delaiMs: delaiMs || null });
      setOuvert(id);
    } catch (e) { setErreur((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory flex items-center gap-2"><Swords size={20} className="text-brass" /> Tournoi de hnefatafl</h2>
        <p className="font-sans text-sm text-ivory-soft/70 mt-1 max-w-2xl">
          Créez la fiche, ouvrez les inscriptions quand la page est publiée (Paramètres, drapeau « Tournoi de hnefatafl »),
          lancez le tirage le jour venu. Les rondes avancent d'elles-mêmes à mesure que les parties finissent, le minuteur
          du coup et l'échéance de chaque ronde donnent forfait tout seuls, et les adversaires se donnent rendez-vous
          depuis la page du tournoi.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg text-ivory">Publication</h3>
            <p className="font-sans text-sm text-ivory-soft/70 mt-1 max-w-xl">
              {flags.pubTournoi
                ? 'La page /jeux/tournoi est ouverte et la page des jeux en ligne l’annonce.'
                : 'Rien n’est visible : la page répond « Sentier perdu » et aucun lien n’existe. Ouvrez les inscriptions d’un tournoi ci-dessous, puis basculez ici quand c’est prêt à faire.'}
            </p>
            {!flags.pubTournoi && !pret && tournois.length > 0 && (
              <p className="font-sans text-xs text-amber-300/80 mt-1">Aucun tournoi n’a ses inscriptions ouvertes : la page publiée dirait « Aucun tournoi n’est annoncé ».</p>
            )}
            {erreurPub && <p className="font-sans text-xs text-red-300 mt-1">{erreurPub}</p>}
          </div>
          <ToggleSwitch checked={!!flags.pubTournoi} onChange={publier} label={flags.pubTournoi ? 'Publié' : 'Caché'} />
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-lg text-ivory mb-4">Nouveau tournoi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Nom</Label><Input value={nom} onChange={(e) => setNom(e.target.value)} /></div>
          <div><Label>Date et heure du départ</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div>
            <Label>Durée du tournoi (jours)</Label>
            <Input type="number" min={1} max={60} value={dureeJours} onChange={(e) => setDureeJours(Number(e.target.value) || 7)} />
            <p className="font-sans text-[11px] text-ivory-soft/50 mt-1">Chaque ronde reçoit une part égale; passé son échéance, la personne qui devait jouer perd par forfait.</p>
          </div>
          <div>
            <Label>Règlement</Label>
            <select value={regleId} onChange={(e) => setRegleId(e.target.value)}
                    className="w-full bg-black/30 border border-brass/30 rounded-card px-3 py-2 font-sans text-sm text-ivory">
              {REGLES.map((r) => <option key={r.id} value={r.id}>{r.nomFR}</option>)}
            </select>
          </div>
          <div>
            <Label>Temps par coup</Label>
            <select value={delaiMs} onChange={(e) => setDelaiMs(Number(e.target.value))}
                    className="w-full bg-black/30 border border-brass/30 rounded-card px-3 py-2 font-sans text-sm text-ivory">
              {DELAIS_DEFI.map((d) => <option key={d.ms} value={d.ms}>{d.FR}</option>)}
              <option value={5 * 60 * 1000}>5 minutes par coup</option>
              <option value={15 * 60 * 1000}>15 minutes par coup</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <PrimaryButton onClick={creer} disabled={!nom.trim() || !date}>Créer en brouillon</PrimaryButton>
          {erreur && <span className="font-sans text-xs text-red-300">{erreur}</span>}
        </div>
      </Card>

      {tournois.length === 0 ? (
        <EmptyState icon={Swords}>Aucun tournoi pour l'instant.</EmptyState>
      ) : tournois.map((t) => (
        <Card key={t.id}>
          <button type="button" onClick={() => setOuvert(ouvert === t.id ? null : t.id)}
                  className="w-full flex items-center justify-between gap-4 text-left">
            <span className="min-w-0">
              <span className="block font-display text-lg text-ivory truncate">{t.nom}</span>
              <span className="block font-sans text-xs text-ivory-soft/60">{fmtDate(t.dateDebut, { dateStyle: 'full', timeStyle: 'short' })}</span>
            </span>
            <Badge tone={TON[t.statut]}>{LIBELLE[t.statut]}</Badge>
          </button>
          {ouvert === t.id && <Regie tournoi={t} />}
        </Card>
      ))}
    </div>
  );
};

/** La régie d'un tournoi ouvert : inscrits, tirage, tableau, arbitrage. */
const Regie: React.FC<{ tournoi: Tournoi }> = ({ tournoi }) => {
  const [inscrits, setInscrits] = useState<InscriptionTournoi[]>([]);
  const [matchs, setMatchs] = useState<MatchTournoi[]>([]);
  const [occupe, setOccupe] = useState(false);
  const [confirme, setConfirme] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const a = suivreInscriptions(tournoi.id, setInscrits);
    const b = suivreMatchs(tournoi.id, setMatchs);
    return () => { a(); b(); };
  }, [tournoi.id]);

  const faire = async (geste: () => Promise<unknown>) => {
    setOccupe(true); setErreur(null); setConfirme(null);
    try { await geste(); } catch (e) { setErreur((e as Error).message); } finally { setOccupe(false); }
  };
  // Un geste lourd se confirme d'un second clic, sans boîte de dialogue.
  const deuxClics = (cle: string, geste: () => Promise<unknown>) =>
    confirme === cle ? faire(geste) : setConfirme(cle);

  const statut = tournoi.statut;

  return (
    <div className="mt-5 pt-5 border-t border-brass/15 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {statut === 'brouillon' && (
          <PrimaryButton disabled={occupe} onClick={() => faire(() => majTournoi(tournoi.id, { statut: 'inscriptions' }))}>
            Ouvrir les inscriptions
          </PrimaryButton>
        )}
        {statut === 'inscriptions' && (
          <>
            <PrimaryButton disabled={occupe || inscrits.length < 2}
                           onClick={() => deuxClics('lancer', () => lancerTournoi({ tournoiId: tournoi.id }))}>
              <Play size={14} /> {confirme === 'lancer' ? `Confirmer le tirage (${inscrits.length} inscrits)` : 'Lancer le tirage'}
            </PrimaryButton>
            <GhostButton disabled={occupe} onClick={() => faire(() => majTournoi(tournoi.id, { statut: 'brouillon' }))}>
              Refermer les inscriptions
            </GhostButton>
          </>
        )}
        {statut === 'brouillon' && (
          <DangerButton disabled={occupe} onClick={() => deuxClics('supprimer', () => supprimerTournoi(tournoi.id))}>
            <Trash2 size={14} /> {confirme === 'supprimer' ? 'Confirmer la suppression' : 'Supprimer'}
          </DangerButton>
        )}
        {erreur && <span className="font-sans text-xs text-red-300">{erreur}</span>}
      </div>

      {statut === 'fini' && tournoi.champion && (
        <p className="font-display text-base text-brass flex items-center gap-2"><Crown size={16} /> Champion : {tournoi.champion.nom}</p>
      )}

      <div>
        <Label>Inscrits ({inscrits.length})</Label>
        {inscrits.length === 0 ? (
          <p className="font-sans text-sm text-ivory-soft/60">Personne encore.</p>
        ) : (
          <ul className="divide-y divide-brass/10 border border-brass/15 rounded-card">
            {inscrits.map((i) => (
              <li key={i.uid} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="font-sans text-sm text-ivory truncate">{i.nom} <span className="text-ivory-soft/40 text-xs">· {fmtDate(i.inscritLe)}</span></span>
                {statut !== 'encours' && statut !== 'fini' && (
                  <GhostButton disabled={occupe} onClick={() => faire(() => desinscrire(tournoi.id, i.uid))}>Retirer</GhostButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(statut === 'encours' || statut === 'fini') && (
        <div className="space-y-4">
          {Array.from({ length: tournoi.nbRondes }, (_, i) => i + 1).map((r) => {
            const liste = matchsDeRonde(matchs, r);
            if (liste.length === 0) return null;
            return (
              <div key={r}>
                <Label>{nomDeRonde(r, tournoi.nbRondes, true)}</Label>
                <ul className="divide-y divide-brass/10 border border-brass/15 rounded-card">
                  {liste.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                      <span className="font-sans text-sm text-ivory min-w-0 flex-1">
                        {m.joueurs.map((uid, i) => (
                          <React.Fragment key={uid ?? i}>
                            {i > 0 && <span className="text-ivory-soft/40"> contre </span>}
                            <span className={m.gagnant === uid ? 'text-brass' : uid ? '' : 'text-ivory-soft/40'}>
                              {uid ? m.noms[uid] : 'exempt'}
                            </span>
                          </React.Fragment>
                        ))}
                        {m.parties.length > 1 && <span className="text-ivory-soft/40 text-xs"> · {m.parties.length} parties</span>}
                        {m.echeance && m.statut === 'encours' && <span className="text-ivory-soft/40 text-xs"> · avant le {fmtDate(m.echeance, { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                      </span>
                      {m.statut === 'fini' ? (
                        <Badge tone="accepted">{m.exempt ? 'Exempt' : 'Tranché'}</Badge>
                      ) : (
                        <span className="flex items-center gap-2">
                          {m.joueurs.filter((u): u is string => !!u).map((uid) => (
                            <GhostButton key={uid} disabled={occupe}
                                         onClick={() => deuxClics(`${m.id}:${uid}`, () => trancherMatch({ tournoiId: tournoi.id, matchId: m.id, gagnantUid: uid }))}>
                              <Gavel size={12} /> {confirme === `${m.id}:${uid}` ? `Confirmer : ${m.noms[uid]} gagne` : `Victoire à ${m.noms[uid]}`}
                            </GhostButton>
                          ))}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <p className="font-sans text-[11px] text-ivory-soft/45">
        Créé {fmtDate(tournoi.createdAt)} · dernier changement {fmtDate(tournoi.updatedAt ?? Timestamp.now())}
      </p>
    </div>
  );
};

export default TournoiSection;
