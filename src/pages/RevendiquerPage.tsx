import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Users, KeyRound, Loader2, Check, ShieldCheck, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import { motDeLaForme, motDuChef } from '../firebase/guildes';
import {
  guildeApercuParCode, guildeRevendiquerProfil,
  type ApercuInvitation, type CasRevendication,
} from '../firebase/guildeMonnaie';

// ─── La porte « Revendiquer votre profil » ───────────────────────────
// Alex, 11 septembre 2026 : le lien d'invitation d'un groupe se poste
// dans un groupe Facebook et ouvre cette page. Elle montre le groupe et
// les noms annoncés à la fondation, la personne se connecte avec son
// courriel ou avec Google, et le serveur (functions/guildes.js,
// revendiquerProfil) rattache son compte à sa ligne : par le courriel
// quand c'est celui qu'elle a donné, par le nom qu'elle pointe sinon.
// Qui n'est pas sur la liste entre comme simple membre, sans file.
//
// Adresse : /rejoindre/{code} (EN : /en/join/{code}). Le code est celui
// de la fiche (codeInvitation, huit caractères).

const ORBE_PAR_DEFAUT = '/histoire/archives/lievre/2022-e9ed2ea5.webp';
const CADRAGE_BANNIERE = '65% center';

const bouton = {
  plein: 'inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card disabled:opacity-50',
  filet: 'inline-flex items-center gap-2 px-4 py-2 border border-brass/40 text-brass hover:bg-brass/10 font-sans text-xs uppercase tracking-wider transition rounded-card disabled:opacity-50',
};

const messageErreur = (e: unknown, fr: boolean): string => {
  const code = (e as { code?: string })?.code || '';
  if (/not-found$/.test(code) && !(e instanceof Error && /liste|list/.test(e.message))) {
    return fr ? 'Ce lien ne mène à rien. Demandez-en un neuf à votre chef.' : 'That link leads nowhere. Ask your leader for a fresh one.';
  }
  return e instanceof Error ? e.message : String(e);
};

const RevendiquerPage: React.FC = () => {
  useCaravanPage();
  const { code = '' } = useParams<{ code: string }>();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const { user, loading, openSignIn } = useAuth();

  const [apercu, setApercu] = useState<ApercuInvitation | null | undefined>(undefined);
  const [erreurLien, setErreurLien] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ cas: CasRevendication; nom: string | null; slug: string | null } | null>(null);
  const [regarde, setRegarde] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Le groupe se montre avant la connexion.
  useEffect(() => {
    let vivant = true;
    setApercu(undefined); setErreurLien(null);
    guildeApercuParCode({ code })
      .then((a) => { if (vivant) setApercu(a); })
      .catch((e) => { if (vivant) { setApercu(null); setErreurLien(messageErreur(e, fr)); } });
    return () => { vivant = false; };
  }, [code, fr]);

  // Une fois connecté, le serveur regarde si le courriel du compte est
  // déjà celui d'une ligne : alors la place se prend sans rien demander.
  useEffect(() => {
    if (!user || !apercu || regarde) return;
    setRegarde(true);
    guildeRevendiquerProfil({ code, seulementCourriel: true })
      .then((r) => {
        if (r.cas === 'fondateur' || r.cas === 'deja') setResultat({ cas: r.cas, nom: r.nom, slug: r.slug });
      })
      .catch(() => { /* la liste ci-dessous reste la voie normale */ });
  }, [user, apercu, regarde, code]);

  const revendiquer = async (nom?: string) => {
    setBusy(nom || '*'); setErreur(null);
    try {
      const r = await guildeRevendiquerProfil({ code, nom });
      setResultat({ cas: r.cas, nom: r.nom, slug: r.slug });
    } catch (e) {
      setErreur(messageErreur(e, fr));
    } finally { setBusy(null); }
  };

  if (apercu === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-brass animate-spin" />
      </main>
    );
  }

  if (apercu === null) {
    return (
      <main className="min-h-screen text-ivory">
        <SEO title={fr ? 'Invitation' : 'Invitation'} noindex />
        <section className="relative caravan-stage bleed-edges pt-24 pb-20 overflow-hidden">
          <Brume />
          <div className="relative z-10 px-5 md:px-10 xl:px-16">
            <div className="glass-light rounded-lg-card p-6 md:p-8 flex items-center justify-between gap-5 flex-wrap">
              <p className="font-editorial text-base text-ivory-soft leading-relaxed min-w-0 flex-1">{erreurLien}</p>
              <Link to={addLocale('/guildes', lang)} className={bouton.filet}>{fr ? 'Voir les groupes' : 'See the groups'}</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const mot = motDeLaForme(apercu.forme, lang);
  const chef = motDuChef(apercu.forme, lang);
  const cheminGroupe = addLocale(apercu.slug ? `/${apercu.slug}` : `/guildes/${apercu.guildeId}`, lang);
  const libres = apercu.fondateurs.filter((f) => !f.pris);
  const pris = apercu.fondateurs.filter((f) => f.pris);
  const un = ['clan', 'ordre'].includes(apercu.forme) ? 'un' : 'une';

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={`${apercu.nom} · ${fr ? 'Revendiquer votre profil' : 'Claim your profile'}`} noindex image={apercu.banniereUrl || apercu.blason} />

      {/* ── La bannière du groupe, d'un bord à l'autre ── */}
      <div className="relative w-full overflow-hidden aspect-[16/10] sm:aspect-video md:aspect-[21/9]">
        <img
          src={apercu.banniereUrl || ORBE_PAR_DEFAUT} alt=""
          className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: CADRAGE_BANNIERE }}
        />
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'linear-gradient(to top, rgba(var(--sk-ink-rgb),0.97) 0%, rgba(var(--sk-ink-rgb),0.55) 45%, rgba(var(--sk-ink-rgb),0.15) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 px-5 md:px-10 xl:px-16 pb-6 md:pb-10 flex items-end gap-4 md:gap-6">
          <span className="w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden shrink-0 border border-brass/40 flex items-center justify-center"
                style={{ background: 'rgba(var(--sk-deep-rgb),0.7)', boxShadow: '0 0 34px -8px rgba(var(--sk-gilt-rgb),0.6)' }}>
            {apercu.blason ? <img src={apercu.blason} alt="" className="w-full h-full object-cover" /> : <Users size={26} className="text-brass" />}
          </span>
          <div className="min-w-0">
            <p className="font-sans uppercase tracking-[0.22em] text-[10px] md:text-[11px]" style={{ color: 'var(--sk-gilt)' }}>
              {fr ? `Invitation · ${mot}` : `Invitation · ${mot}`}
            </p>
            <h1 className="font-display text-3xl md:text-5xl xl:text-6xl leading-[1.02] mt-1 text-ivory">{apercu.nom}</h1>
            <p className="font-sans text-sm text-ivory-soft mt-2 inline-flex items-center gap-1.5">
              <Users size={12} /> {apercu.nbMembres} {fr ? (apercu.nbMembres > 1 ? 'membres' : 'membre') : (apercu.nbMembres > 1 ? 'members' : 'member')}
            </p>
          </div>
        </div>
      </div>

      <section className="relative caravan-stage bleed-edges pt-8 pb-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 px-5 md:px-10 xl:px-16 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">

          {/* ── Ce que le groupe dit de lui, et la porte ── */}
          <div className="space-y-6">
            {apercu.description && (
              <p className="font-editorial text-lg md:text-xl text-ivory-soft leading-relaxed">{apercu.description}</p>
            )}

            {resultat ? (
              <div className="glass-light rounded-lg-card p-6 md:p-8 space-y-4">
                <p className="witcher-stat-label inline-flex items-center gap-2" style={{ color: 'var(--sk-gilt)' }}>
                  <ShieldCheck size={14} /> {fr ? 'C’est fait' : 'Done'}
                </p>
                <p className="font-editorial text-base md:text-lg text-ivory leading-relaxed">
                  {resultat.cas === 'membre'
                    ? (fr ? `Vous êtes maintenant membre de ${apercu.nom}. La porte du ${mot.toLowerCase()} s’ouvre ici.`
                          : `You are now a member of ${apercu.nom}. The ${mot.toLowerCase()}’s door opens here.`)
                    : (fr ? `Bienvenue, ${resultat.nom}. Votre place vous attendait depuis la fondation, et elle est maintenant la vôtre.`
                          : `Welcome, ${resultat.nom}. Your seat had been waiting since the founding, and it is now yours.`)}
                </p>
                <Link to={cheminGroupe} className={bouton.plein}>
                  <KeyRound size={13} /> {fr ? `Entrer dans ${un === 'un' ? 'le' : 'la'} ${mot.toLowerCase()}` : `Enter the ${mot.toLowerCase()}`}
                </Link>
              </div>
            ) : (
              <div className="glass-light rounded-lg-card p-6 md:p-8 space-y-4">
                <p className="witcher-stat-label inline-flex items-center gap-2">
                  <KeyRound size={13} /> {fr ? 'Revendiquer votre profil' : 'Claim your profile'}
                </p>
                <p className="font-editorial text-base text-ivory-soft leading-relaxed">
                  {fr
                    ? `Si votre nom a été annoncé à la fondation, votre place vous attend déjà. Connectez-vous avec le courriel que vous avez donné au ${chef.toLowerCase()}, ou avec Google si c’est la même adresse, et elle se rattache toute seule. Sinon, pointez votre nom dans la liste.`
                    : `If your name was announced at the founding, your seat is already waiting. Sign in with the email you gave the ${chef.toLowerCase()}, or with Google if it is the same address, and it attaches itself. Otherwise, point to your name in the list.`}
                </p>
                {!user && !loading && (
                  <button type="button" onClick={openSignIn} className={bouton.plein}>
                    <LogIn size={13} /> {fr ? 'Se connecter ou créer un compte' : 'Sign in or create an account'}
                  </button>
                )}
                {user && (
                  <p className="font-sans text-xs text-ivory-soft/70">
                    {fr ? `Connecté avec ${user.email || 'ce compte'}.` : `Signed in as ${user.email || 'this account'}.`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Les noms annoncés à la fondation ── */}
          {!resultat && (
            <div className="glass-light rounded-lg-card p-5 md:p-6">
              <p className="witcher-stat-label mb-1.5">{fr ? 'Les noms annoncés' : 'The announced names'}</p>
              <p className="font-sans text-[11px] mb-4" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                {fr ? 'Trouvez le vôtre et dites que c’est vous.' : 'Find yours and say it is you.'}
              </p>

              {libres.length === 0 && (
                <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-4">
                  {fr ? 'Toutes les places annoncées sont prises. La porte reste ouverte aux membres.' : 'Every announced seat is taken. The door stays open to members.'}
                </p>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {libres.map((f) => (
                  <div key={f.nom} className="flex items-center justify-between gap-3 px-4 py-3 rounded-card"
                       style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(var(--sk-glow-rgb),0.18)' }}>
                    <div className="min-w-0">
                      <p className="font-display text-base md:text-lg text-ivory truncate">{f.nom}</p>
                      <p className="font-sans text-[10px] uppercase tracking-[0.18em] mt-0.5" style={{ color: f.chef ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                        {f.chef ? chef : (fr ? 'Fondateur' : 'Founder')}{f.indice ? ` · ${f.indice}` : ''}
                      </p>
                    </div>
                    {user
                      ? (
                        <button type="button" onClick={() => void revendiquer(f.nom)} disabled={busy !== null} className={bouton.filet}>
                          {busy === f.nom ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          {fr ? 'C’est moi' : 'That’s me'}
                        </button>
                      )
                      : (
                        <button type="button" onClick={openSignIn} className={bouton.filet}>
                          {fr ? 'C’est moi' : 'That’s me'}
                        </button>
                      )}
                  </div>
                ))}
                {pris.map((f) => (
                  <div key={f.nom} className="flex items-center justify-between gap-3 px-4 py-3 rounded-card opacity-50"
                       style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(var(--sk-parchment-rgb),0.1)' }}>
                    <div className="min-w-0">
                      <p className="font-display text-base md:text-lg text-ivory truncate">{f.nom}</p>
                      <p className="font-sans text-[10px] uppercase tracking-[0.18em] mt-0.5" style={{ color: 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                        {f.chef ? chef : (fr ? 'Fondateur' : 'Founder')} · {fr ? 'déjà en place' : 'already seated'}
                      </p>
                    </div>
                    <Check size={14} className="text-brass shrink-0" />
                  </div>
                ))}
              </div>

              {erreur && <p role="alert" className="font-sans text-xs mt-4" style={{ color: 'var(--sk-rouille, #c0563a)' }}>{erreur}</p>}

              <div className="mt-6 pt-5 flex items-center justify-between gap-4 flex-wrap" style={{ borderTop: '1px solid rgba(var(--sk-parchment-rgb),0.12)' }}>
                <p className="font-editorial text-sm text-ivory-soft leading-relaxed min-w-0 flex-1">
                  {fr ? 'Votre nom n’y est pas ? Le lien vous fait entrer comme membre, sans file d’attente.' : 'Your name is not there? The link lets you in as a member, no queue.'}
                </p>
                {user
                  ? (
                    <button type="button" onClick={() => void revendiquer()} disabled={busy !== null} className={bouton.plein}>
                      {busy === '*' ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={13} />}
                      {fr ? 'Entrer comme membre' : 'Enter as a member'}
                    </button>
                  )
                  : (
                    <button type="button" onClick={openSignIn} className={bouton.plein}>
                      <LogIn size={13} /> {fr ? 'Se connecter' : 'Sign in'}
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default RevendiquerPage;
