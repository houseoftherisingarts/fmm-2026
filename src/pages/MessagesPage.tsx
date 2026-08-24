import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Search, MessageCircle, ChevronLeft, UserCircle2,
  Flag, VolumeX, Volume2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import {
  type DMThread, type DM,
  threadId as faireFilId, ensureThread, subscribeDMThread, sendDM, subscribeInbox, markThreadRead,
} from '../firebase/dms';
import { lireFiche, type Membre } from '../firebase/ordre';
import {
  LONGUEUR_MAX, bloquer, debloquer, signaler, suivreBlocages, tropVite,
} from '../firebase/moderation';
import { Portrait, teinteDe, quand } from '../components/ordre/Portrait';
import SEO from '../components/SEO';

// ─── La boîte de réception ───────────────────────────────────────────
// /messages           → la liste des conversations
// /messages/:autreUid → une conversation, créée au premier envoi
//
// Un fil par paire de personnes : la clé est la paire d'uid triée, donc
// deux fils pour les mêmes gens ne peuvent pas exister. La liste et le
// fil arrivent en direct.
//
// Le nom et la photo de l'autre viennent du registre de l'Ordre
// (/membres), la seule fiche qu'un membre puisse lire chez un autre.
// L'ancienne version interrogeait /users et /benevoles, fermés par les
// règles à tous sauf leur propriétaire, donc l'en-tête affichait un
// inconnu sans visage à chaque conversation (corrigé le 2026-08-23).

// La vitrine de démonstration a été retirée le 2026-08-24 : Alex a pris
// une conversation fabriquée pour une vraie personne. Une boîte de
// réception ne montre plus que de vrais échanges.

const MessagesPage: React.FC = () => {
  useCaravanPage();
  const { otherUid: autreUid } = useParams<{ otherUid?: string }>();
  const navigate = useNavigate();
  const { user, loading, openSignIn } = useAuth();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const t = fr ? FR : EN;

  const [fils, setFils]         = useState<DMThread[]>([]);
  const [recherche, setRecherche] = useState('');
  const [autre, setAutre]       = useState<Membre | null>(null);
  const [moiFiche, setMoiFiche] = useState<Membre | null>(null);
  const [msgs, setMsgs]         = useState<DM[]>([]);
  const [brouillon, setBrouillon] = useState('');
  const [envoi, setEnvoi]       = useState(false);
  const [avis, setAvis]         = useState('');
  const [bloques, setBloques]   = useState<string[]>([]);
  const [filActif, setFilActif] = useState<string | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // ── Qui je suis ──
  const monUid  = user?.uid || '';
  const monNom  = (moiFiche?.nom || user?.displayName || '').trim() || t.sansNom;
  const maPhoto = moiFiche?.avatarUrl;
  const maTeinte = moiFiche?.avatarHue ?? teinteDe(monNom);

  // ── Ma fiche et mes silences ──
  useEffect(() => {
    if (!user) { setMoiFiche(null); setBloques([]); return; }
    let vivant = true;
    lireFiche(user.uid).then((f) => { if (vivant) setMoiFiche(f); }).catch(() => {});
    const stop = suivreBlocages(user.uid, setBloques);
    return () => { vivant = false; stop(); };
  }, [user?.uid]);

  // ── La liste des conversations ──
  useEffect(() => {
    if (!user) return;
    return subscribeInbox(monUid, setFils);
  }, [monUid, user]);

  // ── La conversation ouverte ──
  useEffect(() => {
    if (!autreUid) { setAutre(null); setFilActif(null); setMsgs([]); return; }
    let vivant = true;
    let arreter: (() => void) | undefined;
    (async () => {
      let fiche: Membre | null = null;
      try { fiche = await lireFiche(autreUid); } catch { /* hors ligne */ }
      if (!vivant) return;
      setAutre(fiche);

      const id = faireFilId(monUid, autreUid);
      setFilActif(id);

      // Le fil s'ouvre avant la première lecture, sinon la conversation
      // n'apparaîtrait jamais dans la boîte des deux personnes.
      try {
        await ensureThread(
          monUid, monNom, maTeinte, maPhoto,
          autreUid, (fiche?.nom || '').trim() || t.sansNom,
          fiche?.avatarHue ?? teinteDe(fiche?.nom || ''), fiche?.avatarUrl,
        );
      } catch { /* hors ligne, ou bloqué par l'autre */ }
      if (!vivant) return;
      arreter = subscribeDMThread(id, (liste) => { if (vivant) setMsgs(liste); });
    })();
    return () => { vivant = false; arreter?.(); };
  }, [autreUid, monUid, monNom, maTeinte, maPhoto, t.sansNom]);

  // Les messages neufs se marquent lus en entrant.
  useEffect(() => {
    if (filActif) markThreadRead(filActif, monUid).catch(() => {});
  }, [filActif, monUid, msgs.length]);

  useEffect(() => {
    const el = zoneRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, filActif]);

  const bloque = !!autreUid && bloques.includes(autreUid);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    const texte = brouillon.trim();
    if (!autreUid || !texte || !filActif || envoi) return;
    if (tropVite(`dm:${filActif}`)) { setAvis(t.tropVite); return; }
    setEnvoi(true);
    setAvis('');
    try {
      const charge = { senderUid: monUid, senderName: monNom, body: texte.slice(0, LONGUEUR_MAX) };
      await sendDM(filActif, charge, autreUid);
      setBrouillon('');
    } catch {
      // La règle Firestore refuse l'envoi quand le destinataire vous a
      // fait taire. Rien ne le lui dit, et rien ne vous le dit non plus.
      setAvis(t.echec);
    } finally {
      setEnvoi(false);
    }
  };

  const rapporter = async () => {
    if (!user || !autreUid || !filActif) return;
    const dernier = [...msgs].reverse().find((m) => m.senderUid === autreUid);
    try {
      await signaler({
        parUid: user.uid, parNom: monNom,
        contreUid: autreUid, contreNom: (autre?.nom || '').trim() || t.sansNom,
        texte: dernier?.body || '', lieu: 'prive', reference: filActif,
      });
      setAvis(t.signale);
    } catch { setAvis(t.echec); }
  };

  const basculerSilence = async () => {
    if (!user || !autreUid) return;
    if (bloque) { await debloquer(user.uid, autreUid); setAvis(t.debloque); }
    else { await bloquer(user.uid, autreUid); setAvis(t.bloque); }
  };

  const filtres = useMemo(() => fils.filter((f) => {
    const u = f.participantUids.find((x) => x !== monUid);
    const nom = u ? f.participantNames?.[u] || '' : '';
    return recherche === '' || nom.toLowerCase().includes(recherche.toLowerCase());
  }), [fils, recherche, monUid]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen text-ivory flex items-center justify-center px-6">
        <div className="max-w-md text-center glass-light rounded-lg-card p-8">
          <h1 className="font-display title-medieval text-2xl text-ivory mb-3">{t.titre}</h1>
          <p className="font-editorial text-ivory-soft mb-6">{t.connectezVous}</p>
          <button onClick={openSignIn}
            className="px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
            {t.seConnecter}
          </button>
        </div>
      </main>
    );
  }

  // Le fil garde lui-même le nom et la photo de l'autre. Quand sa fiche
  // du registre n'arrive pas (hors ligne, ou membre qui n'a jamais
  // rempli la sienne), ils servent de repli plutôt que d'afficher un
  // inconnu sans visage.
  const filCourant = autreUid ? fils.find((f) => f.id === filActif) : undefined;
  const nomAutre = (autre?.nom
    || (autreUid ? filCourant?.participantNames?.[autreUid] : '')
    || '').trim() || t.sansNom;
  const photoAutre = autre?.avatarUrl
    || (autreUid ? filCourant?.participantPhotos?.[autreUid] : undefined);
  const teinteAutre = autre?.avatarHue
    ?? (autreUid ? filCourant?.participantHues?.[autreUid] : undefined)
    ?? teinteDe(nomAutre);
  const reste = LONGUEUR_MAX - brouillon.length;

  return (
    <>
      <SEO title={t.titre} noindex />
      <div className="min-h-screen text-ivory pt-20 pb-10">
        <div className="max-w-screen-xl mx-auto px-3 md:px-6">
          <div className="flex items-center gap-3 mb-4">
            <Link to={addLocale('/ordre', lang)}
              className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass transition">
              <ArrowLeft size={12} /> {t.registre}
            </Link>
          </div>

          <div className="grid lg:grid-cols-12 gap-4 h-[calc(100vh-10rem)] min-h-[36rem]">
            {/* ── La liste des conversations ── */}
            <aside className={`lg:col-span-4 ${autreUid ? 'hidden lg:flex' : 'flex'} flex-col rounded-lg-card border border-brass/25 overflow-hidden`}
                   style={{ background: 'rgba(26, 5, 11, 0.45)' }}>
              <div className="px-4 py-3.5">
                <h1 className="font-display title-medieval text-sm text-ivory mb-2.5 flex items-center gap-2">
                  <MessageCircle size={14} className="text-brass" /> {t.conversations}
                </h1>
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory-soft/45" />
                  <label htmlFor="chercher-fil" className="sr-only">{t.chercher}</label>
                  <input id="chercher-fil" value={recherche} onChange={(e) => setRecherche(e.target.value)}
                    placeholder={t.chercher}
                    className="w-full pl-8 pr-3 py-2 rounded-card text-xs font-sans text-ivory placeholder:text-ivory-soft/40 focus:outline-none focus:border-brass/60 transition-colors"
                    style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(232,177,74,0.22)' }} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filtres.length === 0 ? (
                  <div className="p-8 text-center text-ivory-soft/60">
                    <UserCircle2 size={28} className="mx-auto mb-3 opacity-40" />
                    <p className="font-editorial text-[13px] leading-relaxed">{t.aucune}</p>
                  </div>
                ) : filtres.map((f) => {
                  const u = f.participantUids.find((x) => x !== monUid) || '';
                  const nom = (f.participantNames?.[u] || '').trim() || t.sansNom;
                  const actif = u === autreUid;
                  const neuf = (f.unread?.[monUid] || 0) > 0;
                  return (
                    <button key={f.id} onClick={() => navigate(addLocale(`/messages/${u}`, lang))}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                        actif ? 'bg-brass/10' : 'hover:bg-ivory-soft/[0.04]'
                      }`}
                      style={{ borderBottom: '1px solid rgba(244, 239, 227, 0.06)' }}>
                      <Portrait nom={nom} url={f.participantPhotos?.[u]}
                                teinte={f.participantHues?.[u] ?? teinteDe(nom)} taille={40} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className={`font-display title-medieval text-sm truncate ${actif ? 'text-brass' : neuf ? 'text-ivory' : 'text-ivory-soft'}`}>{nom}</p>
                          <span className="ml-auto font-sans text-[10px] tabular-nums text-ivory-soft/40 shrink-0">
                            {quand(f.lastMessageAt, lang)}
                          </span>
                        </div>
                        <p className="font-editorial text-[12px] text-ivory-soft/60 truncate mt-0.5">
                          {f.lastSenderUid === monUid ? t.vousDeuxPoints : ''}{f.lastMessage || '…'}
                        </p>
                      </div>
                      {neuf && <span aria-label={t.duNeuf} className="w-2 h-2 rounded-full bg-brass shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* ── La conversation ── */}
            <section className={`lg:col-span-8 ${autreUid ? 'flex' : 'hidden lg:flex'} flex-col rounded-lg-card border border-brass/25 overflow-hidden`}
                     style={{ background: 'rgba(26, 5, 11, 0.45)' }}>
              {!autreUid ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-ivory-soft/60 px-8">
                  <MessageCircle size={36} className="opacity-30 mb-4" />
                  <p className="font-editorial text-sm leading-relaxed max-w-sm">{t.choisissez}</p>
                </div>
              ) : (
                <>
                  <header className="px-4 py-3 flex items-center gap-3"
                          style={{ borderBottom: '1px solid rgba(232, 177, 74, 0.18)' }}>
                    <button onClick={() => navigate(addLocale('/messages', lang))}
                      aria-label={t.retourListe}
                      className="lg:hidden text-ivory-soft hover:text-brass transition-colors">
                      <ChevronLeft size={18} />
                    </button>
                    <Link to={`${addLocale('/profil', lang)}/${autreUid}`}
                          className="flex items-center gap-3 hover:opacity-80 transition flex-1 min-w-0">
                      <Portrait nom={nomAutre} url={photoAutre} teinte={teinteAutre} taille={38} />
                      <div className="min-w-0">
                        <p className="font-display title-medieval text-sm text-ivory truncate">{nomAutre}</p>
                        {autre?.ville && (
                          <p className="font-sans text-[10px] text-ivory-soft/50 truncate">{autre.ville}</p>
                        )}
                      </div>
                    </Link>
                    {user && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={rapporter} title={t.signaler} aria-label={t.signaler}
                          className="p-2 rounded-card text-ivory-soft/50 hover:text-brass transition-colors">
                          <Flag size={14} />
                        </button>
                        <button type="button" onClick={basculerSilence}
                          title={bloque ? t.debloquer : t.bloquer} aria-label={bloque ? t.debloquer : t.bloquer}
                          className={`p-2 rounded-card transition-colors ${bloque ? 'text-brass' : 'text-ivory-soft/50 hover:text-brass'}`}>
                          {bloque ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        </button>
                      </div>
                    )}
                  </header>

                  <div ref={zoneRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-3" aria-live="polite">
                    {msgs.length === 0 ? (
                      <p className="text-center pt-16 font-editorial text-sm text-ivory-soft/55">
                        {t.premierMot(nomAutre)}
                      </p>
                    ) : (
                      <AnimatePresence initial={false}>
                        {msgs.map((m) => {
                          const mien = m.senderUid === monUid;
                          return (
                            <motion.div key={m.id}
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                              className={`flex ${mien ? 'justify-end' : 'justify-start'} gap-2.5`}>
                              {!mien && (
                                <Portrait nom={nomAutre} url={photoAutre} teinte={teinteAutre} taille={28} />
                              )}
                              <div className={`max-w-[76%] px-4 py-2.5 text-sm font-sans whitespace-pre-wrap break-words rounded-card ${
                                mien
                                  ? 'bg-brass text-midnight-deep'
                                  : 'bg-ivory-soft/[0.07] text-ivory-soft border border-ivory-soft/10'
                              }`}>
                                {m.body}
                                <span className={`block font-sans text-[9px] tabular-nums mt-1.5 ${mien ? 'text-midnight-deep/55' : 'text-ivory-soft/45'}`}>
                                  {quand(m.createdAt, lang)}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>

                  {avis && (
                    <p role="status" className="px-4 md:px-6 py-2 font-sans text-[11px] text-brass/90"
                       style={{ borderTop: '1px solid rgba(244, 239, 227, 0.08)' }}>
                      {avis}
                    </p>
                  )}

                  {bloque ? (
                    <div className="px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3"
                         style={{ borderTop: '1px solid rgba(232, 177, 74, 0.18)' }}>
                      <p className="font-editorial text-sm text-ivory-soft/70">{t.silenceEnCours(nomAutre)}</p>
                      <button type="button" onClick={basculerSilence}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-card border border-brass/40 font-sans uppercase tracking-[0.16em] text-[10px] text-ivory hover:bg-brass/15 transition-colors">
                        <Volume2 size={12} /> {t.debloquer}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={envoyer} className="px-4 md:px-6 py-4 flex items-end gap-3"
                          style={{ borderTop: '1px solid rgba(232, 177, 74, 0.18)' }}>
                      <label htmlFor="mot-prive" className="sr-only">{t.champ}</label>
                      <textarea
                        id="mot-prive"
                        rows={1}
                        value={brouillon}
                        maxLength={LONGUEUR_MAX}
                        onChange={(e) => { setBrouillon(e.target.value); if (avis) setAvis(''); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void envoyer(e as unknown as React.FormEvent);
                          }
                        }}
                        placeholder={t.champ}
                        className="flex-1 px-4 py-2.5 rounded-card text-sm font-sans text-ivory placeholder:text-ivory-soft/40 resize-none max-h-36 focus:outline-none focus:border-brass/60 transition-colors"
                        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(232,177,74,0.22)' }}
                      />
                      <div className="flex flex-col items-end gap-1.5">
                        {reste < 200 && (
                          <span aria-live="polite" className="font-sans text-[10px] tabular-nums text-ivory-soft/50">{reste}</span>
                        )}
                        <button type="submit" disabled={envoi || !brouillon.trim()} aria-label={t.envoyer}
                          className="inline-flex items-center justify-center w-11 h-11 bg-brass text-midnight-deep rounded-card hover:bg-brass-soft transition-colors disabled:opacity-35 disabled:cursor-not-allowed">
                          <Send size={15} />
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

const FR = {
  titre: 'Messages',
  registre: 'Le registre',
  conversations: 'Vos conversations',
  chercher: 'Chercher quelqu’un',
  aucune: 'Aucune conversation pour l’instant. Ouvrez la fiche d’un membre et écrivez-lui.',
  choisissez: 'Choisissez une conversation dans la liste. Pour en commencer une nouvelle, ouvrez la fiche d’un membre dans le registre.',
  connectezVous: 'Connectez-vous pour retrouver vos conversations.',
  seConnecter: 'Se connecter',
  champ: 'Écrire un message',
  envoyer: 'Envoyer',
  retourListe: 'Revenir à la liste',
  duNeuf: 'Des messages non lus',
  vousDeuxPoints: 'Vous : ',
  premierMot: (nom: string) => `Vous n’avez encore rien échangé avec ${nom}. Le premier mot vous revient.`,
  signaler: 'Signaler cette conversation à l’équipe',
  bloquer: 'Ne plus recevoir ses messages',
  debloquer: 'Recevoir à nouveau ses messages',
  signale: 'Signalé. L’équipe va regarder.',
  bloque: 'Cette personne ne peut plus vous écrire.',
  debloque: 'Cette personne peut vous écrire à nouveau.',
  silenceEnCours: (nom: string) => `Vous avez fait taire ${nom}. Ses messages ne vous parviennent plus.`,
  tropVite: 'Laissez passer un instant avant le prochain message.',
  echec: 'Le message n’est pas passé. Réessayez dans un moment.',
  sansNom: 'Un membre',
};

const EN: typeof FR = {
  titre: 'Messages',
  registre: 'The roll',
  conversations: 'Your conversations',
  chercher: 'Look someone up',
  aucune: 'No conversations yet. Open a member’s card and write to them.',
  choisissez: 'Pick a conversation from the list. To start a new one, open a member’s card on the roll.',
  connectezVous: 'Sign in to find your conversations.',
  seConnecter: 'Sign in',
  champ: 'Write a message',
  envoyer: 'Send',
  retourListe: 'Back to the list',
  duNeuf: 'Unread messages',
  vousDeuxPoints: 'You: ',
  premierMot: (nom: string) => `You have not exchanged anything with ${nom} yet. The first word is yours.`,
  signaler: 'Report this conversation to the team',
  bloquer: 'Stop receiving their messages',
  debloquer: 'Receive their messages again',
  signale: 'Reported. The team will look at it.',
  bloque: 'This person can no longer write to you.',
  debloque: 'This person can write to you again.',
  silenceEnCours: (nom: string) => `You have muted ${nom}. Their messages no longer reach you.`,
  tropVite: 'Let a moment pass before your next message.',
  echec: 'The message did not go through. Try again in a moment.',
  sansNom: 'A member',
};

export default MessagesPage;
