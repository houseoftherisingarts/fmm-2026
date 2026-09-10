import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, LogIn, RotateCcw, Shield, Sparkles } from 'lucide-react';
import SEO from '../components/SEO';
import { GildedFrame } from '../components/marche/atmospherics';
import { useAuth } from '../contexts/AuthContext';
import {
  ARCHETYPES, FICHES, FONCTIONS, GROUPES, LISTE_GROUPES, QUESTIONS, type Groupe,
} from '../content/placeClan';
import { verdict as trancherVerdict, type Verdict } from '../lib/placeClan';
import {
  composerMonEquipe, effacerBrouillon, enregistrerPlace, formerClan, garderBrouillon, lireBrouillon, lireMaPlace,
  repondreInvitation, type EtatClan, type Place,
} from '../firebase/placeClan';
import EquipeClan, { ICONES } from '../components/clan/EquipeClan';
import Grimoire, {
  ChoixEncre, Encre, Folio, RegistreFolios, romain, ENCRE, ENCRE_PALE,
} from '../components/clan/Grimoire';
import Medaillon from '../components/compte/Medaillon';

// ─── Ta place dans le clan · le jeu de l'année de la Peste ──────────
// Quinze questions, un verdict, une équipe de sept tirée parmi les gens
// du même groupe, et un clan à fonder d'un geste. Le questionnaire se
// joue sans compte; garder sa place et rencontrer son équipe demandent
// de se connecter, et le brouillon survit à la connexion.

type Etape = 'accueil' | 'groupe' | 'questions' | 'verdict';

const BOUTON = 'fmm-glass-btn is-primary px-7 py-3.5';
const STYLE_BOUTON: React.CSSProperties = { display: 'inline-flex', gap: '.7rem', alignItems: 'center', width: 'auto' };

const PlaceClanPage: React.FC = () => {
  const { user, openSignIn } = useAuth();
  const brouillon = useMemo(() => lireBrouillon(), []);
  const [etape, setEtape] = useState<Etape>(brouillon?.groupe && brouillon.reponses.length === QUESTIONS.length ? 'verdict' : 'accueil');
  const [groupe, setGroupe] = useState<Groupe | null>(brouillon?.groupe ?? null);
  const [reponses, setReponses] = useState<number[]>(brouillon?.reponses ?? []);
  const [index, setIndex] = useState(Math.min(brouillon?.reponses.length ?? 0, QUESTIONS.length - 1));
  const [etat, setEtat] = useState<EtatClan | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nomClan, setNomClan] = useState('');
  const [clanCree, setClanCree] = useState<{ id: string; invites: number } | null>(null);
  const [enregistre, setEnregistre] = useState(false);

  const v: Verdict | null = useMemo(
    () => (groupe && reponses.length === QUESTIONS.length ? trancherVerdict(groupe, reponses) : null),
    [groupe, reponses],
  );

  // Ce que le serveur sait déjà de moi (résultat, équipe, invitations).
  const recharger = useCallback(async () => {
    if (!user) return;
    try { setEtat(await lireMaPlace({})); } catch { /* hors ligne : la page reste jouable */ }
  }, [user]);
  useEffect(() => { void recharger(); }, [recharger]);

  // Un résultat déjà en banque et aucun brouillon local : montrer le verdict tel quel.
  useEffect(() => {
    if (etat?.resultat && !brouillon && etape === 'accueil') {
      setGroupe(etat.resultat.groupe);
      if (etat.resultat.reponses?.length === QUESTIONS.length) setReponses(etat.resultat.reponses);
      setEtape('verdict');
      setEnregistre(true);
    }
  }, [etat, brouillon, etape]);

  // Garder le verdict dès qu'il existe et que la personne est connectée.
  useEffect(() => {
    if (!user || !v || !groupe || enregistre) return;
    (async () => {
      try {
        await enregistrerPlace({ groupe, reponses, fonction: v.fonction, seconde: v.seconde, archetype: v.archetype, scores: v.scores });
        setEnregistre(true);
        effacerBrouillon();
        await recharger();
      } catch (e) { setErreur((e as Error).message); }
    })();
  }, [user, v, groupe, reponses, enregistre, recharger]);

  const choisirGroupe = (g: Groupe) => {
    setGroupe(g); setReponses([]); setIndex(0); setEnregistre(false); setEtape('questions');
    garderBrouillon({ groupe: g, reponses: [] });
  };
  const repondre = (i: number) => {
    const suivant = [...reponses]; suivant[index] = i;
    setReponses(suivant);
    garderBrouillon({ groupe, reponses: suivant });
    if (index < QUESTIONS.length - 1) setIndex(index + 1);
    else { setEnregistre(false); setEtape('verdict'); }
  };
  const recommencer = () => { effacerBrouillon(); setReponses([]); setIndex(0); setEnregistre(false); setEtape('groupe'); setClanCree(null); };

  const composer = async (exclure?: string[]) => {
    setOccupe(true); setErreur(null);
    try {
      const r = await composerMonEquipe(exclure ? { exclure } : {});
      setEtat((e) => (e ? { ...e, places: r.places } : e));
    } catch (e) { setErreur((e as Error).message); }
    setOccupe(false);
  };
  const fonder = async () => {
    setOccupe(true); setErreur(null);
    try {
      const r = await formerClan({ nom: nomClan });
      setClanCree({ id: r.id, invites: r.invites });
      await recharger();
    } catch (e) { setErreur((e as Error).message); }
    setOccupe(false);
  };
  const repondreInv = async (id: string, accepter: boolean) => {
    setOccupe(true); setErreur(null);
    try { await repondreInvitation({ invitationId: id, accepter }); await recharger(); }
    catch (e) { setErreur((e as Error).message); }
    setOccupe(false);
  };

  const q = QUESTIONS[index];
  const places: Place[] | null = etat?.places ?? null;
  const clanId = etat?.resultat?.clanId ?? clanCree?.id ?? null;

  // ── Ce qui s'écrit sur la page de droite, étape par étape ─────────
  // Tout le jeu tient sur le vélin : les réponses sont des lignes de
  // registre, pas des boutons posés par-dessus la scène.
  const pageDroite = (() => {
    if (etape === 'accueil') {
      return (
        <>
          <Folio texte="ANNO PESTIS" />
          <Encre
            as="span" texte="Ta place dans le clan" cle="titre" vitesse={0.03}
            className="font-display block text-center leading-tight mb-[1.6cqw]"
            style={{ fontSize: 'clamp(17px, 2.6cqw, 32px)' }}
          />
          <Encre
            texte="Quinze questions, un verdict, et une équipe de sept à réunir."
            cle="accroche" delai={0.9}
            className="font-editorial text-center leading-snug mb-[2.4cqw]"
            style={{ fontSize: 'clamp(11px, 1.5cqw, 18px)', color: ENCRE_PALE }}
          />
          <ChoixEncre
            texte="Ouvrir le registre" cle="entrer" fort marge="›" delai={2.4}
            onClick={() => setEtape('groupe')}
          />
        </>
      );
    }

    if (etape === 'groupe') {
      return (
        <>
          <Folio texte="FOLIO I" />
          <Encre
            texte="Dans quelle compagnie marchez-vous ?" cle="groupe"
            className="font-editorial text-center leading-snug mb-[1.8cqw]"
            style={{ fontSize: 'clamp(12px, 1.8cqw, 21px)' }}
          />
          <div style={{ borderTop: '1px solid rgba(96, 66, 40, 0.26)', paddingTop: '1cqw' }}>
            {LISTE_GROUPES.map((g, i) => (
              <ChoixEncre
                key={g} cle={`g-${g}`}
                texte={GROUPES[g].nom} sous={GROUPES[g].devise}
                marge={romain(i + 1)} delai={0.85 + i * 0.14}
                onClick={() => choisirGroupe(g)}
              />
            ))}
          </div>
        </>
      );
    }

    if (etape === 'questions' && groupe) {
      // Les réponses arrivent pendant que la question finit de sécher,
      // sinon l'attente devient longue sur quinze folios.
      const depart = 0.25 + q.texte.length * 0.011;
      return (
        <>
          <Folio texte={`FOLIO ${romain(index + 1)}`} cle={q.id} />
          <Encre
            texte={q.texte} cle={q.id} delai={0.3} vitesse={0.014}
            className="font-editorial text-center leading-snug mb-[1.3cqw]"
            style={{ fontSize: 'clamp(12px, 1.72cqw, 22px)' }}
          />
          <div style={{ borderTop: '1px solid rgba(96, 66, 40, 0.26)', paddingTop: '1cqw' }}>
            {q.reponses.map((r, i) => (
              <ChoixEncre
                key={`${q.id}-${i}`} cle={`${q.id}-${i}`}
                texte={r.texte} marge={['a', 'b', 'c', 'd'][i]}
                delai={depart + i * 0.1}
                choisi={reponses[index] === i}
                onClick={() => repondre(i)}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-[1.4cqw]"
               style={{ fontSize: 'clamp(8px, 1.05cqw, 13px)' }}>
            <button type="button" className="grimoire-choix font-display"
                    style={{ color: ENCRE_PALE, letterSpacing: '0.22em' }}
                    onClick={() => (index === 0 ? setEtape('groupe') : setIndex(index - 1))}>
              ‹ PRÉCÉDENTE
            </button>
            {reponses[index] !== undefined && index < QUESTIONS.length - 1 && (
              <button type="button" className="grimoire-choix font-display"
                      style={{ color: ENCRE, letterSpacing: '0.22em' }}
                      onClick={() => setIndex(index + 1)}>
                SUIVANTE ›
              </button>
            )}
          </div>
        </>
      );
    }

    if (etape === 'verdict' && groupe && v) {
      return (
        <>
          <Folio texte="LE VERDICT" cle={v.fonction} />
          <Encre
            as="span" texte={v.titre} cle={`t-${v.fonction}`} vitesse={0.05} delai={0.5}
            className="font-display block text-center leading-tight mb-[1.2cqw]"
            style={{ fontSize: 'clamp(22px, 3.6cqw, 46px)' }}
          />
          <Encre
            texte={`${GROUPES[groupe].nom} · ${ARCHETYPES[v.archetype].nom}`}
            cle={`a-${v.fonction}`} delai={1.4}
            className="font-editorial text-center leading-snug mb-[2.2cqw]"
            style={{ fontSize: 'clamp(10px, 1.35cqw, 16px)', color: ENCRE_PALE }}
          />
          <div style={{ borderTop: '1px solid rgba(96, 66, 40, 0.26)', paddingTop: '1cqw' }}>
            <ChoixEncre
              texte="Lire ce que ça veut dire" cle="lire" marge="›" delai={2}
              onClick={() => document.getElementById('fiche-verdict')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
            <ChoixEncre
              texte="Refaire le questionnaire" cle="refaire" marge="↺" delai={2.2}
              onClick={recommencer}
            />
          </div>
        </>
      );
    }
    return null;
  })();

  const registreDesFolios = (etape === 'questions' || etape === 'verdict')
    ? QUESTIONS.map((_, i) => ({ romain: romain(i + 1), marque: etape === 'verdict' || reponses[i] !== undefined }))
    : null;

  return (
    <>
      <SEO title="Ta place dans le clan" description="Le jeu de l’année de la Peste : quinze questions pour trouver votre place dans une équipe, et le clan qui va avec." />

      {/* La scène : le livre prend l'écran, et le jeu s'écrit dessus. */}
      <Grimoire
        gauche={registreDesFolios ? (
          <>
            <RegistreFolios lignes={registreDesFolios} />
            {groupe && (
              <p aria-hidden className="font-display text-center mt-[2cqw]"
                 style={{ color: ENCRE_PALE, fontSize: 'clamp(8px, 1.05cqw, 13px)', letterSpacing: '0.26em' }}>
                {GROUPES[groupe].nom.toUpperCase()}
              </p>
            )}
          </>
        ) : undefined}
        droite={pageDroite}
      />

      {/* Ce qui ne tient pas sur une page de vélin défile sous le livre :
          les invitations reçues, la fiche du verdict et le clan. */}
      {(etape === 'verdict' || (user && (etat?.invitations.length ?? 0) > 0)) && (
        <div className="px-5 pt-10 pb-24 max-w-3xl mx-auto space-y-8">

          {user && (etat?.invitations.length ?? 0) > 0 && (
            <GildedFrame tone="amber" active className="block">
              <div className="caravan-glass p-5 space-y-4">
                <p className="font-sans uppercase tracking-[0.2em] text-[11px]" style={{ color: 'var(--color-amber-glow)' }}>Une invitation vous attend</p>
                {etat!.invitations.map((inv) => (
                  <div key={inv.id} className="flex flex-wrap items-center gap-3">
                    {inv.de && <Medaillon nom={inv.de.nom} hue={inv.de.avatarHue} url={inv.de.avatarUrl} taille={32} />}
                    <p className="font-editorial text-base text-ivory flex-1 min-w-[12rem]">
                      {inv.de?.nom ?? 'Quelqu’un'} vous invite dans le clan <strong style={{ color: 'var(--color-amber-glow)' }}>{inv.nomClan}</strong> ({GROUPES[inv.groupe].nom.toLowerCase()}).
                    </p>
                    <button type="button" disabled={occupe} onClick={() => repondreInv(inv.id, true)} className={BOUTON} style={STYLE_BOUTON}>
                      <Check size={15} /><span className="fmm-glass-btn-label">Accepter</span>
                    </button>
                    <button type="button" disabled={occupe} onClick={() => repondreInv(inv.id, false)}
                            className="font-sans uppercase tracking-[0.2em] text-[11px] text-ivory-soft/70">Refuser</button>
                  </div>
                ))}
              </div>
            </GildedFrame>
          )}

          {etape === 'verdict' && groupe && v && (
            <>
              <div id="fiche-verdict">
              <GildedFrame tone="amber" active className="block">
                <div className="caravan-glass p-6 sm:p-8">
                  <p className="font-sans uppercase tracking-[0.22em] text-[11px] mb-2" style={{ color: 'var(--color-amber-glow)' }}>
                    {GROUPES[groupe].nom} · {ARCHETYPES[v.archetype].nom}
                  </p>
                  <h2 className="font-display text-4xl sm:text-5xl text-ivory leading-tight mb-4">{v.titre}</h2>
                  <p className="font-editorial text-lg text-ivory leading-relaxed mb-3">{FICHES[v.fonction].role}</p>
                  <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-5">{FICHES[v.fonction].signes}</p>
                  <p className="font-editorial text-base text-ivory-soft/80 leading-relaxed">
                    {ARCHETYPES[v.archetype].phrase} Et quand la place de {v.titre} est prise, vous faites un très bon {v.titreSecond}.
                  </p>
                  <ul className="mt-6 space-y-1.5">
                    {FONCTIONS.map((f) => {
                      const max = Math.max(1, ...FONCTIONS.map((x) => v.scores[x]));
                      return (
                        <li key={f} className="flex items-center gap-3 text-[12px] font-sans">
                          <span className="w-40 shrink-0 inline-flex items-center gap-1.5 uppercase tracking-[0.14em] text-[10px]"
                                style={{ color: f === v.fonction ? 'var(--color-amber-glow)' : 'rgba(var(--sk-bone-rgb),0.7)' }}>
                            {ICONES[f]} {GROUPES[groupe].titres[f]}
                          </span>
                          <span className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(var(--sk-glow-rgb), 0.12)' }}>
                            <span className="block h-1.5 rounded-full" style={{ width: `${(v.scores[f] / max) * 100}%`, background: f === v.fonction ? 'var(--color-amber-glow)' : 'rgba(var(--sk-glow-rgb), 0.45)' }} />
                          </span>
                          <span className="w-6 text-right text-ivory-soft/70">{v.scores[f]}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </GildedFrame>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button type="button" onClick={recommencer} className="fmm-glass-btn px-6 py-3" style={STYLE_BOUTON}>
                  <RotateCcw size={15} /><span className="fmm-glass-btn-label">Refaire le questionnaire</span>
                </button>
                <p className="font-editorial text-sm text-ivory-soft/70 max-w-sm leading-snug">
                  Vos réponses se remplacent, et votre place change avec elles{clanId ? ', sans que votre clan bouge' : ''}.
                </p>
              </div>

              {!user ? (
                <div className="caravan-glass rounded-[15px] p-5 space-y-3" style={{ border: '1px solid rgba(var(--sk-glow-rgb), 0.3)' }}>
                  <p className="font-editorial text-base text-ivory leading-relaxed">
                    Connectez-vous pour garder votre place, voir l’équipe de sept que le jeu vous propose et fonder votre clan. Vos réponses restent ici en attendant.
                  </p>
                  <button type="button" onClick={openSignIn} className={BOUTON} style={STYLE_BOUTON}>
                    <LogIn size={15} /><span className="fmm-glass-btn-label">Me connecter</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-2xl text-ivory mb-1">Votre équipe de sept</h3>
                    <p className="font-editorial text-base text-ivory-soft/80 mb-4">
                      Une personne par place, tirée parmi {GROUPES[groupe].nom.toLowerCase()} qui ont fait le jeu. Écartez quelqu’un ou relancez tant que l’équipe ne vous plaît pas.
                    </p>
                    {places ? (
                      <EquipeClan groupe={groupe} places={places} moi={user.uid} occupe={occupe}
                                  onRelancer={() => composer()} onEcarter={(uid) => composer([uid])} />
                    ) : (
                      <button type="button" disabled={occupe || !enregistre} onClick={() => composer()} className={BOUTON} style={STYLE_BOUTON}>
                        <Sparkles size={15} /><span className="fmm-glass-btn-label">{enregistre ? 'Composer mon équipe' : 'Un instant'}</span>
                      </button>
                    )}
                  </div>

                  {places && (
                    <div className="caravan-glass rounded-[15px] p-5 space-y-3" style={{ border: '1px solid rgba(var(--sk-glow-rgb), 0.3)' }}>
                      {clanId ? (
                        <p className="font-editorial text-base text-ivory leading-relaxed">
                          Votre clan existe. {clanCree ? `${clanCree.invites} invitation${clanCree.invites > 1 ? 's sont parties' : ' est partie'}; chacun accepte ou refuse depuis sa page.` : ''}{' '}
                          <Link to={`/guildes/${clanId}`} className="inline-flex items-center gap-1.5" style={{ color: 'var(--color-amber-glow)' }}>
                            <Shield size={13} /> Ouvrir la page du clan
                          </Link>
                        </p>
                      ) : (
                        <>
                          <p className="font-editorial text-base text-ivory leading-relaxed">
                            Cette équipe vous plaît ? Donnez-lui un nom : le clan se fonde avec vous à sa tête, et chaque personne de l’équipe reçoit l’invitation. Elle accepte ou refuse, {GROUPES[groupe].equipe} se remplit à mesure.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <input type="text" value={nomClan} onChange={(e) => setNomClan(e.target.value)} placeholder="Le nom du clan" maxLength={40}
                                   className="flex-1 min-w-[12rem] bg-[rgba(var(--sk-ink-rgb),0.6)] px-4 py-3 text-base font-sans focus:outline-none"
                                   style={{ color: 'var(--color-bone)', border: '1px solid rgba(var(--sk-glow-rgb), 0.35)' }} />
                            <button type="button" disabled={occupe || nomClan.trim().length < 3} onClick={fonder} className={BOUTON} style={STYLE_BOUTON}>
                              <Shield size={15} /><span className="fmm-glass-btn-label">Fonder le clan</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {erreur && <p className="font-editorial text-sm" style={{ color: 'rgba(224, 138, 122, 0.9)' }}>{erreur}</p>}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default PlaceClanPage;
