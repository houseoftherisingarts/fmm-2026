import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swords, Crown, CalendarDays, Hourglass, ScrollText, Users, ArrowUpRight, Check } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Stagger, StaggerItem, ScrollProgress } from '../components/scroll';
import { REGLES } from '../games/hnefatafl/gameLogic';
import { formatDelai } from '../firebase/tafl';
import { lireFiche, nomAffiche } from '../firebase/ordre';
import {
  suivreTournois, suivreInscriptions, suivreMatchs, inscrire, desinscrire,
  matchsDeRonde, nomDeRonde,
  type Tournoi, type InscriptionTournoi, type MatchTournoi,
} from '../firebase/tournoi';
import { APERCU, apercuActif } from './tournoiApercu';

// ─── Le tournoi de hnefatafl ────────────────────────────────────────
// La page publique du tournoi du 7 mars 2027 (Alex, 2026-09-28) : la
// date, le règlement, la cadence, le bouton pour s'inscrire, la liste
// de qui s'est inscrit, puis le tableau ronde par ronde une fois le
// tirage fait, et le champion à la fin. Elle ne s'ouvre que derrière le
// drapeau `pubTournoi`; le déroulement lui-même vit dans
// functions/tournoi.js.

const TournoiPage: React.FC = () => {
  const { lang } = useUI();
  const { user, openSignIn } = useAuth();
  const fr = lang === 'FR';
  const t = fr ? FR : EN;
  const apercu = apercuActif();

  const [tournois, setTournois] = useState<Tournoi[]>(apercu ? [APERCU.tournoi] : []);
  const tournoi = tournois[0] ?? null;
  const [inscrits, setInscrits] = useState<InscriptionTournoi[]>(apercu ? APERCU.inscrits : []);
  const [matchs, setMatchs] = useState<MatchTournoi[]>(apercu ? APERCU.matchs : []);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => { if (!apercu) return suivreTournois(setTournois); }, [apercu]);
  useEffect(() => {
    if (apercu || !tournoi) return;
    const a = suivreInscriptions(tournoi.id, setInscrits);
    const b = suivreMatchs(tournoi.id, setMatchs);
    return () => { a(); b(); };
  }, [tournoi?.id, apercu]); // eslint-disable-line react-hooks/exhaustive-deps

  const inscrit = !!user && inscrits.some((i) => i.uid === user.uid);
  const regle = useMemo(() => REGLES.find((r) => r.id === tournoi?.regleId), [tournoi?.regleId]);
  const date = tournoi ? tournoi.dateDebut.toDate() : null;
  const dateLongue = date
    ? date.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const basculerInscription = async () => {
    if (!user || !tournoi) return;
    setOccupe(true); setErreur(null);
    try {
      if (inscrit) {
        await desinscrire(tournoi.id, user.uid);
      } else {
        const fiche = await lireFiche(user.uid).catch(() => null);
        const nom = nomAffiche(fiche) || user.displayName?.trim() || t.inconnu;
        await inscrire(tournoi.id, user.uid, nom);
      }
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setOccupe(false);
    }
  };

  const lienPartie = (id: string) => `${addLocale('/jeunesse/hnefatafl', lang)}?partie=${id}`;

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <ScrollProgress />
      <PageHeader
        eyebrow={t.eyebrow}
        titleA={t.titreA}
        titleB={t.titreB}
        intro={t.intro}
        orbImage="/jeux/tuile-tafl-v2.webp"
        orbImagePosition="center 45%"
        dateline={dateLongue || t.datelineVide}
      />

      <section className="relative py-14 md:py-20 overflow-hidden">
        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 md:px-8">
          {!tournoi ? (
            <div className="rounded-lg-card border border-brass/25 px-6 py-14 text-center"
                 style={{ background: 'linear-gradient(165deg, rgba(24,12,8,0.9), rgba(8,3,5,0.96))' }}>
              <p className="font-editorial text-base text-ivory-soft">{t.aucun}</p>
            </div>
          ) : (
            <Stagger className="flex flex-col gap-6 md:gap-8">
              {/* ── La fiche et l'inscription ─────────────────────── */}
              <StaggerItem as="div">
                <div className="rounded-lg-card border border-brass/35 overflow-hidden"
                     style={{
                       background: 'linear-gradient(165deg, rgba(24,12,8,0.9), rgba(8,3,5,0.96))',
                       backdropFilter: 'blur(12px)',
                       boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
                     }}>
                  <header className="flex items-center gap-2 px-5 md:px-7 py-3.5 border-b border-brass/20 bg-black/30">
                    <Swords size={13} className="text-brass shrink-0" />
                    <span className="font-display title-medieval uppercase tracking-[0.28em] text-[13px] text-ivory">
                      {tournoi.nom}
                    </span>
                    <span className="ml-auto font-sans text-[13px] uppercase tracking-[0.18em] text-ivory-soft/55">
                      {t.statuts[tournoi.statut]}
                    </span>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <dl className="px-5 md:px-7 py-6 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-5 lg:border-r lg:border-brass/15">
                    <Ligne icone={CalendarDays} titre={t.quand} valeur={dateLongue} />
                    <Ligne icone={ScrollText} titre={t.regle}
                           valeur={regle ? (fr ? regle.nomFR : regle.nomEN) : tournoi.regleId} />
                    <Ligne icone={Hourglass} titre={t.cadence}
                           valeur={tournoi.delaiMs ? `${formatDelai(tournoi.delaiMs, fr)} ${t.parCoup}` : t.sansLimite} />
                  </dl>

                  <div className="px-5 md:px-7 pb-7 lg:pt-6">
                    <div className="divider-brass w-14 mb-5 lg:hidden" />
                    <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed mb-6">
                      {t.format}
                    </p>

                    {tournoi.statut === 'inscriptions' && (
                      !user ? (
                        <button type="button" onClick={openSignIn}
                                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[13px] text-ivory hover:bg-brass/15 transition-colors">
                          {t.connecter} <ArrowUpRight size={14} />
                        </button>
                      ) : (
                        <button type="button" onClick={basculerInscription} disabled={occupe}
                                className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-full border font-sans uppercase tracking-[0.2em] text-[13px] transition-colors disabled:opacity-50 ${
                                  inscrit
                                    ? 'border-brass/30 text-ivory-soft/70 hover:border-brass/60'
                                    : 'border-brass/50 text-ivory hover:bg-brass/15'
                                }`}>
                          {inscrit ? <><Check size={14} /> {t.inscritRetirer}</> : <><Swords size={14} /> {t.inscrire}</>}
                        </button>
                      )
                    )}
                    {tournoi.statut === 'brouillon' && (
                      <p className="font-sans text-xs text-ivory-soft/55">{t.bientot}</p>
                    )}
                    {erreur && <p className="mt-3 font-sans text-xs text-red-300">{erreur}</p>}

                    {tournoi.statut === 'fini' && tournoi.champion && (
                      <div className="mt-6 rounded-card border border-brass/50 px-5 py-4 flex items-center gap-3"
                           style={{ background: 'rgba(var(--sk-glow-rgb),0.08)' }}>
                        <Crown size={18} className="text-brass shrink-0" />
                        <span>
                          <span className="block font-sans uppercase tracking-[0.22em] text-[13px] text-ivory-soft/60">{t.champion}</span>
                          <span className="block font-display title-medieval text-lg text-ivory">{tournoi.champion.nom}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </StaggerItem>

              {/* ── Les inscrits, puis le tableau ─────────────────── */}
              <StaggerItem as="div">
                {tournoi.statut === 'inscriptions' || tournoi.statut === 'brouillon' ? (
                  <div className="rounded-lg-card border border-brass/25 overflow-hidden h-full"
                       style={{ background: 'rgba(8,3,5,0.7)' }}>
                    <header className="flex items-center gap-2 px-5 md:px-7 py-3.5 border-b border-brass/20 bg-black/30">
                      <Users size={13} className="text-brass shrink-0" />
                      <span className="font-display title-medieval uppercase tracking-[0.28em] text-[13px] text-ivory">{t.inscrits}</span>
                      <span className="ml-auto font-sans text-[13px] tracking-[0.12em] text-ivory-soft/50">{inscrits.length}</span>
                    </header>
                    {inscrits.length === 0 ? (
                      <p className="px-5 md:px-7 py-10 font-editorial text-sm text-ivory-soft/70">{t.personne}</p>
                    ) : (
                      <ol className="divide-y divide-brass/10">
                        {inscrits.map((i, n) => (
                          <li key={i.uid} className="flex items-center gap-4 px-5 md:px-7 py-3">
                            <span className="font-display title-medieval text-sm w-7 text-right" style={{ color: 'rgba(var(--sk-glow-rgb),0.6)' }}>
                              {n + 1}
                            </span>
                            <span className={`font-display text-base truncate ${i.uid === user?.uid ? 'text-brass' : 'text-ivory'}`}>{i.nom}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ) : (
                  <Tableau tournoi={tournoi} matchs={matchs} fr={fr} t={t} moi={user?.uid ?? null} lienPartie={lienPartie} />
                )}
              </StaggerItem>
            </Stagger>
          )}

          <p className="font-editorial text-sm md:text-base text-ivory-soft/70 mt-8 max-w-2xl">
            {t.pied}{' '}
            <Link to={addLocale('/jeunesse/hnefatafl', lang)} className="text-brass hover:underline">{t.piedLien}</Link>
          </p>
        </div>
      </section>
    </>
  );
};

const Ligne: React.FC<{ icone: React.ComponentType<{ size?: number; className?: string }>; titre: string; valeur: string }> =
  ({ icone: Icone, titre, valeur }) => (
    <div className="flex items-start gap-3">
      <Icone size={15} className="text-brass shrink-0 mt-0.5" />
      <span className="min-w-0">
        <dt className="font-sans uppercase tracking-[0.22em] text-[13px] text-ivory-soft/55">{titre}</dt>
        <dd className="font-display text-sm md:text-base text-ivory mt-0.5">{valeur}</dd>
      </span>
    </div>
  );

/** Le tableau : une colonne par ronde, un match par carte. */
const Tableau: React.FC<{
  tournoi: Tournoi; matchs: MatchTournoi[]; fr: boolean; t: typeof FR;
  moi: string | null; lienPartie: (id: string) => string;
}> = ({ tournoi, matchs, fr, t, moi, lienPartie }) => {
  const rondes = Array.from({ length: tournoi.nbRondes }, (_, i) => i + 1);
  return (
    <div className="rounded-lg-card border border-brass/25 overflow-hidden h-full" style={{ background: 'rgba(8,3,5,0.7)' }}>
      <header className="flex items-center gap-2 px-5 md:px-7 py-3.5 border-b border-brass/20 bg-black/30">
        <Swords size={13} className="text-brass shrink-0" />
        <span className="font-display title-medieval uppercase tracking-[0.28em] text-[13px] text-ivory">{t.tableau}</span>
        <span className="ml-auto font-sans text-[13px] tracking-[0.12em] text-ivory-soft/50">
          {nomDeRonde(Math.min(tournoi.ronde, tournoi.nbRondes), tournoi.nbRondes, fr)}
        </span>
      </header>
      <div className="flex gap-4 overflow-x-auto px-5 md:px-7 py-6" style={{ scrollbarWidth: 'thin' }}>
        {rondes.map((r) => {
          const liste = matchsDeRonde(matchs, r);
          return (
            <div key={r} className="shrink-0 w-64 md:w-72 lg:w-auto lg:flex-1 lg:min-w-0 flex flex-col">
              <p className="font-sans uppercase tracking-[0.22em] text-[13px] text-ivory-soft/55 mb-3">
                {nomDeRonde(r, tournoi.nbRondes, fr)}
              </p>
              <div className="flex flex-col gap-3 flex-1 justify-around">
                {liste.length === 0 && (
                  <div className="rounded-card border border-dashed border-brass/20 px-4 py-5 font-sans text-[13px] text-ivory-soft/40">
                    {t.aVenir}
                  </div>
                )}
                {liste.map((m) => {
                  const partie = m.parties[m.parties.length - 1];
                  const jeJoue = !!moi && m.joueurs.includes(moi) && m.statut === 'encours' && !!partie;
                  return (
                    <div key={m.id} className={`rounded-card border px-4 py-3 ${jeJoue ? 'border-brass/60' : 'border-brass/20'}`}
                         style={{ background: jeJoue ? 'rgba(var(--sk-glow-rgb),0.08)' : 'rgba(0,0,0,0.3)' }}>
                      {m.joueurs.map((uid, i) => (
                        <div key={uid ?? `bye-${i}`} className={`flex items-center justify-between gap-2 ${i === 0 ? 'mb-1.5' : ''}`}>
                          <span className={`font-display text-base truncate ${
                            m.gagnant && m.gagnant === uid ? 'text-brass' : uid ? 'text-ivory' : 'text-ivory-soft/40'
                          }`}>
                            {uid ? (m.noms[uid] || '—') : t.exempt}
                          </span>
                          {m.gagnant === uid && <Crown size={12} className="text-brass shrink-0" />}
                        </div>
                      ))}
                      {jeJoue && (
                        <Link to={lienPartie(partie)}
                              className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-card border border-brass/40 text-brass hover:bg-brass hover:text-[var(--sk-brown-dark)] transition-colors font-sans text-[13px] uppercase tracking-[0.18em]">
                          {t.jouer} <ArrowUpRight size={12} />
                        </Link>
                      )}
                      {m.parties.length > 1 && (
                        <p className="mt-2 font-sans text-[13px] text-ivory-soft/50">{t.rejouee(m.parties.length)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FR = {
  title: 'Le tournoi de hnefatafl',
  eyebrow: 'Jeux en ligne',
  titreA: 'Tournoi de',
  titreB: 'hnefatafl',
  intro: 'Le jeu des Vikings se joue en tournoi sur le site du festival. Vous vous inscrivez avec votre compte, le tirage vous donne un premier adversaire, et chaque partie gagnée vous fait monter d’une ronde, jusqu’à la finale.',
  datelineVide: 'Date à venir',
  aucun: 'Aucun tournoi n’est annoncé pour le moment. Revenez bientôt.',
  statuts: { brouillon: 'En préparation', inscriptions: 'Inscriptions ouvertes', encours: 'En cours', fini: 'Terminé' },
  quand: 'Quand',
  regle: 'Règlement',
  cadence: 'Cadence',
  parCoup: 'par coup',
  sansLimite: 'Sans limite de temps',
  format: 'Élimination directe : une défaite et le tournoi est fini pour vous. Une nulle se rejoue, camps inversés. Le tirage se fait au moment du départ, et les parties s’ouvrent d’elles-mêmes dans votre espace, sur la table du Hnefatafl.',
  connecter: 'Se connecter pour s’inscrire',
  inscrire: 'Je m’inscris',
  inscritRetirer: 'Inscrit. Me retirer',
  bientot: 'Les inscriptions ouvriront bientôt.',
  inconnu: 'Un inconnu',
  champion: 'Champion du tournoi',
  inscrits: 'Les inscrits',
  personne: 'Personne encore. Le premier nom sur la liste, ce pourrait être le vôtre.',
  tableau: 'Le tableau',
  aVenir: 'À venir',
  exempt: 'Exempté cette ronde',
  jouer: 'Jouer ma partie',
  rejouee: (n: number) => `Partie rejouée (${n} parties)`,
  pied: 'Le tournoi se joue en ligne, sur le plateau du festival.',
  piedLien: 'Ouvrir la table du Hnefatafl',
};

const EN: typeof FR = {
  title: 'The Hnefatafl Tournament',
  eyebrow: 'Online games',
  titreA: 'Hnefatafl',
  titreB: 'tournament',
  intro: 'The Viking game is played as a tournament on the festival site. You sign up with your account, the draw gives you a first opponent, and every game you win takes you up a round, all the way to the final.',
  datelineVide: 'Date to come',
  aucun: 'No tournament is announced right now. Come back soon.',
  statuts: { brouillon: 'In preparation', inscriptions: 'Registration open', encours: 'Under way', fini: 'Finished' },
  quand: 'When',
  regle: 'Rules',
  cadence: 'Pace',
  parCoup: 'per move',
  sansLimite: 'No time limit',
  format: 'Single elimination: one loss and the tournament is over for you. A draw is replayed with sides swapped. The draw happens at the start, and your games open on their own in your space, on the Hnefatafl table.',
  connecter: 'Sign in to register',
  inscrire: 'Sign me up',
  inscritRetirer: 'Registered. Withdraw',
  bientot: 'Registration opens soon.',
  inconnu: 'A stranger',
  champion: 'Tournament champion',
  inscrits: 'Registered players',
  personne: 'Nobody yet. The first name on the list could be yours.',
  tableau: 'The bracket',
  aVenir: 'To come',
  exempt: 'Bye this round',
  jouer: 'Play my game',
  rejouee: (n: number) => `Replayed (${n} games)`,
  pied: 'The tournament is played online, on the festival board.',
  piedLien: 'Open the Hnefatafl table',
};

export default TournoiPage;
