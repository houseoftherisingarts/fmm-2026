import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import { Link } from 'react-router-dom';
import { QUESTIONS_SONDAGE, QUESTIONS_REQUISES, AUTRE, BONUS_SONDAGE, type QuestionSondage } from '../content/sondageRetour';
import ClassementGlisser from '../components/sondage/ClassementGlisser';
import { envoyerSondage, type ValeurReponse } from '../firebase/sondageRetour';

// ─── Le sondage de retour de l'édition 2026 ─────────────────────────
// Alex, 2026-09-28 : le suivi de l'édition (activités, nourriture, site
// web, thématique), le vote sur les prochains thèmes, et les données
// que demandent les subventions (provenance, nuitées, dépenses). Tout
// est facultatif sauf la note globale, pour qu'un départ en cours de
// route laisse quand même une réponse utile. Le bonus de Montpellois,
// lui, demande un compte connecté et toutes les questions qui ne sont
// pas marquées « facultatif » : la fonction sondageRetourBonus vérifie.

const T = {
  FR: {
    eyebrow: 'Édition 2026 · Caravanes et Saltimbanques',
    titre: 'Le sondage de retour',
    intro: `Vos réponses guident la prochaine édition et appuient les demandes de subvention du festival. Le sondage prend environ sept minutes, et ${BONUS_SONDAGE} Montpellois attendent dans votre bourse quand vous l’aurez terminé.`,
    bonusConnexion: `Pour recevoir vos ${BONUS_SONDAGE} Montpellois, connectez-vous à votre compte avant d’envoyer vos réponses.`,
    seConnecter: 'Se connecter',
    bonusManque: (n: number) => `Encore ${n} question${n > 1 ? 's' : ''} sans la mention « facultatif » avant les ${BONUS_SONDAGE} Montpellois.`,
    bonusPret: `Tout est rempli : les ${BONUS_SONDAGE} Montpellois arrivent dans votre bourse à l’envoi.`,
    merciBonus: `Vos ${BONUS_SONDAGE} Montpellois sont en route vers votre bourse.`,
    echelleBas: 'Décevant', echelleHaut: 'Excellent',
    precisez: 'Précisez', envoyer: 'Envoyer mes réponses', envoi: 'Envoi…',
    requis: 'Il manque la note globale de l’édition, dans la partie « Le bilan ».',
    erreur: 'L’envoi n’a pas passé. Vérifiez votre connexion, puis réessayez.',
    merciTitre: 'Merci pour vos réponses',
    merciTexte: 'Elles arrivent directement à l’équipe du festival. À septembre prochain !',
    facultatif: 'facultatif',
    classer: { monter: 'Monter', descendre: 'Descendre', glisser: 'Glisser' },
    autreChose: 'Si vous avez placé « Autre chose » dans la liste, précisez',
  },
  EN: {
    eyebrow: '2026 edition · Caravans and Mountebanks',
    titre: 'The feedback survey',
    intro: `Your answers shape the next edition and support the festival’s grant applications. The survey takes about seven minutes, and ${BONUS_SONDAGE} Montpellois wait in your purse once you finish it.`,
    bonusConnexion: `To receive your ${BONUS_SONDAGE} Montpellois, sign in to your account before sending your answers.`,
    seConnecter: 'Sign in',
    bonusManque: (n: number) => `${n} more question${n > 1 ? 's' : ''} without the “optional” mark before the ${BONUS_SONDAGE} Montpellois.`,
    bonusPret: `All set: the ${BONUS_SONDAGE} Montpellois reach your purse when you send.`,
    merciBonus: `Your ${BONUS_SONDAGE} Montpellois are on their way to your purse.`,
    echelleBas: 'Disappointing', echelleHaut: 'Excellent',
    precisez: 'Please specify', envoyer: 'Send my answers', envoi: 'Sending…',
    requis: 'The overall rating of the edition is missing, in the “The verdict” part.',
    erreur: 'The answers did not go through. Check your connection, then try again.',
    merciTitre: 'Thank you for your answers',
    merciTexte: 'They go straight to the festival team. See you next September!',
    facultatif: 'optional',
    classer: { monter: 'Move up', descendre: 'Move down', glisser: 'Drag' },
    autreChose: 'If you ranked “Something else”, please specify',
  },
};

const OR = '#E3C27A';

const SondagePage: React.FC = () => {
  const { lang } = useUI();
  const L = lang === 'EN' ? 'EN' : 'FR';
  const t = T[L];
  const { user } = useAuth();
  const [rep, setRep] = useState<Record<string, ValeurReponse>>({});
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'fini'>('saisie');
  const [erreur, setErreur] = useState<string | null>(null);

  const poser = (id: string, v: ValeurReponse) => setRep((r) => ({ ...r, [id]: v }));
  const basculer = (id: string, opt: string) => setRep((r) => {
    const cur = Array.isArray(r[id]) ? (r[id] as string[]) : [];
    return { ...r, [id]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
  });
  const aAutre = (q: QuestionSondage) => {
    if (q.type === 'classement') return true;
    const v = rep[q.id];
    const ouvre = (id: string) => id === AUTRE || !!q.options?.find((o) => o.id === id)?.preciser;
    return Array.isArray(v) ? v.some(ouvre) : typeof v === 'string' && ouvre(v);
  };

  const envoyer = async () => {
    if (typeof rep.noteGlobale !== 'number') { setErreur(t.requis); return; }
    setErreur(null); setEtat('envoi');
    // On n'envoie que ce qui a une valeur, et la case « Précisez » seulement
    // quand « Autre » est coché.
    const propre: Record<string, ValeurReponse> = {};
    for (const [k, v] of Object.entries(rep)) {
      if (k.endsWith('Autre') && !aAutre(QUESTIONS_SONDAGE.find((q) => `${q.id}Autre` === k)!)) continue;
      if (typeof v === 'string' ? v.trim() : Array.isArray(v) ? v.length : true) propre[k] = typeof v === 'string' ? v.trim().slice(0, 2000) : v;
    }
    try {
      await envoyerSondage(propre, L, user?.uid);
      setBonusAttendu(!!user && manquantes === 0);
      setEtat('fini');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErreur(t.erreur); setEtat('saisie');
    }
  };

  const questions = useMemo(() => QUESTIONS_SONDAGE, []);
  const manquantes = QUESTIONS_REQUISES.filter((id) => {
    const v = rep[id];
    return v === undefined || (Array.isArray(v) ? !v.length : typeof v === 'string' && !v.trim());
  }).length;
  const [bonusAttendu, setBonusAttendu] = useState(false);
  let numero = 0;

  return (
    <div>
      <SEO title={t.titre} description={t.intro} />
      <PageHeader eyebrow={t.eyebrow} titleA={t.titre} titleB="" intro={t.intro} orbImage="/sondage/joute-2026.webp" orbImagePosition="center" />

      <section className="pb-24">
        <div className="w-full px-4 md:px-[4vw]">
          {etat === 'fini' ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-8 md:p-12 text-center">
              <Check size={36} className="mx-auto mb-4" style={{ color: OR }} />
              <h2 className="font-display text-3xl md:text-4xl text-ivory mb-3">{t.merciTitre}</h2>
              <p className="font-editorial text-lg text-ivory-soft/85">{t.merciTexte}</p>
              {bonusAttendu && <p className="font-sans text-sm uppercase tracking-[0.18em] mt-5" style={{ color: OR }}>{t.merciBonus}</p>}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {questions.map((q) => {
                numero += 1;
                return (
                  <React.Fragment key={q.id}>
                    {q.section && (
                      <h2 className="lg:col-span-2 font-display uppercase tracking-[0.2em] text-xl md:text-2xl mt-8 first:mt-0" style={{ color: OR }}>
                        {q.section[L]}
                      </h2>
                    )}
                    <div className={`rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 md:p-6 ${(q.type === 'plusieurs' && (q.options?.length ?? 0) > 6) || q.type === 'classement' ? 'lg:col-span-2' : ''}`}>
                      <p className="font-editorial text-lg text-ivory leading-snug mb-4">
                        <span className="font-sans text-xs mr-2" style={{ color: OR }}>{numero}.</span>
                        {q[L]}
                        {q.facultatif && <span className="ml-2 font-sans text-[11px] uppercase tracking-[0.15em] text-ivory-soft/50">{t.facultatif}</span>}
                      </p>

                      {q.type === 'note' && (
                        <div>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((n) => {
                              const actif = rep[q.id] === n;
                              return (
                                <button key={n} type="button" onClick={() => poser(q.id, n)} aria-pressed={actif}
                                  className="flex-1 min-h-[48px] rounded-[12px] border font-display text-lg transition-colors"
                                  style={{ borderColor: actif ? OR : 'rgba(255,255,255,0.18)', background: actif ? 'rgba(227,194,122,0.18)' : 'rgba(0,0,0,0.25)', color: actif ? OR : 'var(--color-bone)' }}>
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex justify-between mt-2 font-sans text-[11px] uppercase tracking-[0.12em] text-ivory-soft/55">
                            <span>{t.echelleBas}</span><span>{t.echelleHaut}</span>
                          </div>
                        </div>
                      )}

                      {(q.type === 'choix' || q.type === 'plusieurs') && (
                        <div className={`grid gap-2 ${(q.options?.length ?? 0) > 6 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                          {q.options!.map((o) => {
                            const v = rep[q.id];
                            const actif = q.type === 'choix' ? v === o.id : Array.isArray(v) && v.includes(o.id);
                            return (
                              <button key={o.id} type="button" aria-pressed={actif}
                                onClick={() => (q.type === 'choix' ? poser(q.id, o.id) : basculer(q.id, o.id))}
                                className="flex items-center gap-3 text-left min-h-[48px] rounded-[12px] border px-4 py-2 font-sans text-sm transition-colors"
                                style={{ borderColor: actif ? OR : 'rgba(255,255,255,0.18)', background: actif ? 'rgba(227,194,122,0.14)' : 'rgba(0,0,0,0.25)', color: 'var(--color-bone)' }}>
                                <span className={`inline-flex shrink-0 items-center justify-center w-5 h-5 border ${q.type === 'choix' ? 'rounded-full' : 'rounded-[5px]'}`}
                                  style={{ borderColor: actif ? OR : 'rgba(255,255,255,0.35)', background: actif ? OR : 'transparent' }}>
                                  {actif && <Check size={13} color="#1A0A05" />}
                                </span>
                                {o[L]}
                              </button>
                            );
                          })}
                          {aAutre(q) && (
                            <input type="text" maxLength={200} placeholder={t.precisez}
                              value={(rep[`${q.id}Autre`] as string) ?? ''} onChange={(e) => poser(`${q.id}Autre`, e.target.value)}
                              className="sm:col-span-2 lg:col-span-3 min-h-[48px] rounded-[12px] border border-white/20 bg-black/30 px-4 font-sans text-sm text-ivory outline-none focus:border-[#E3C27A]" />
                          )}
                        </div>
                      )}

                      {q.type === 'classement' && (
                        <div className="grid gap-3 lg:max-w-3xl">
                          <ClassementGlisser
                            options={q.options!.map((o) => ({ id: o.id, libelle: o[L] }))}
                            valeur={Array.isArray(rep[q.id]) ? (rep[q.id] as string[]) : undefined}
                            onChange={(ordre) => poser(q.id, ordre)} libelles={t.classer} />
                          <input type="text" maxLength={200} placeholder={t.autreChose}
                            value={(rep[`${q.id}Autre`] as string) ?? ''} onChange={(e) => poser(`${q.id}Autre`, e.target.value)}
                            className="min-h-[48px] rounded-[12px] border border-white/20 bg-black/30 px-4 font-sans text-sm text-ivory outline-none focus:border-[#E3C27A]" />
                        </div>
                      )}

                      {q.type === 'court' && (
                        <input type="text" maxLength={3} value={(rep[q.id] as string) ?? ''}
                          onChange={(e) => poser(q.id, e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                          className="w-32 min-h-[48px] rounded-[12px] border border-white/20 bg-black/30 px-4 font-sans text-lg tracking-[0.3em] text-ivory outline-none focus:border-[#E3C27A]" />
                      )}

                      {q.type === 'texte' && (
                        <textarea rows={3} maxLength={2000} value={(rep[q.id] as string) ?? ''} onChange={(e) => poser(q.id, e.target.value)}
                          className="w-full rounded-[12px] border border-white/20 bg-black/30 p-4 font-sans text-sm text-ivory outline-none focus:border-[#E3C27A]" />
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              <div className="lg:col-span-2 flex flex-col items-start gap-3 mt-4">
                <p className="font-editorial text-base text-ivory-soft/85">
                  {!user ? (
                    <>{t.bonusConnexion}{' '}<Link to={L === 'EN' ? '/en/account' : '/compte'} className="underline" style={{ color: OR }}>{t.seConnecter}</Link></>
                  ) : manquantes ? t.bonusManque(manquantes) : t.bonusPret}
                </p>
                {erreur && <p role="alert" className="font-sans text-sm text-red-300">{erreur}</p>}
                <button type="button" onClick={envoyer} disabled={etat === 'envoi'}
                  className="min-h-[52px] rounded-[15px] px-8 font-sans text-sm uppercase tracking-[0.25em] transition-opacity disabled:opacity-60"
                  style={{ background: OR, color: '#1A0A05' }}>
                  {etat === 'envoi' ? t.envoi : t.envoyer}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SondagePage;
