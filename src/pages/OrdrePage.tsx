import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, Check, Clock, Users, Swords, Dices, ArrowUpRight } from 'lucide-react';
import { lancerDefi, DELAIS_DEFI } from '../firebase/tafl';
import { lancerDefiDes } from '../firebase/desParties';
import { REGLE_DEFAUT } from '../games/hnefatafl/gameLogic';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import {
  listerMembres, filtrerMembres, suivreMesAmities, demanderAmitie, accepterAmitie,
  estAmi, amitieEnAttente, type Amitie, type Membre,
} from '../firebase/ordre';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PageHeader from '../components/layout/PageHeader';
import SalonOrdre from '../components/ordre/SalonOrdre';
import MurSocial from '../components/mur/MurSocial';
import AnnoncesPanel from '../components/compte/AnnoncesPanel';
import BadgeVerifie from '../components/compte/BadgeVerifie';

// ─── Les membres de l'Ordre ─────────────────────────────────────────
// Le registre des gens du festival (Alex, 2026-08-23) : on cherche par
// nom, on ajoute quelqu'un comme ami, on ouvre sa fiche. C'est la
// première pierre du réseau, avant qu'il ait sa propre plateforme.

const OrdrePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const { user, openSignIn, isAdmin } = useAuth();

  const [membres, setMembres] = useState<Membre[]>([]);
  const [liens, setLiens] = useState<Amitie[]>([]);
  const [terme, setTerme] = useState('');
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    if (!user) { setCharge(false); return; }
    let vivant = true;
    listerMembres()
      .then((m) => { if (vivant) setMembres(m); })
      .finally(() => { if (vivant) setCharge(false); });
    const stop = suivreMesAmities(user.uid, setLiens);
    return () => { vivant = false; stop(); };
  }, [user?.uid]);

  const visibles = useMemo(
    () => filtrerMembres(membres.filter((m) => m.uid !== user?.uid), terme),
    [membres, terme, user?.uid],
  );

  const amis = useMemo(
    () => (user ? visibles.filter((m) => estAmi(liens, user.uid, m.uid)) : []),
    [visibles, liens, user],
  );

  return (
    <>
      <SEO
        title={fr ? 'Les membres de l’Ordre' : 'Members of the Order'}
        description={fr
          ? 'Le registre des membres du festival : cherchez quelqu’un, ajoutez-le comme ami, ouvrez sa fiche.'
          : 'The festival’s member roll: find someone, add them as a friend, open their card.'}
      />
      <PageHeader
        eyebrow={fr ? 'Le registre' : 'The roll'}
        titleA={fr ? 'Les membres' : 'Members of'}
        titleB={fr ? 'de l’Ordre' : 'the Order'}
        intro={fr
          ? 'Tous ceux qui ont ouvert un compte au festival. Cherchez quelqu’un par son nom, ajoutez-le comme ami, et défiez-le quand vous voulez.'
          : 'Everyone who opened a festival account. Look someone up by name, add them as a friend, and challenge them whenever you like.'}
        // Cinq membres de la troupe en costume viking, assis en cercle et en pleine
        // conversation (archives lievre, festival 2022). Choisie pour le registre :
        // Alex voulait un vrai groupe de gens qui discutent, pas un objet de jeu.
        orbImage="/histoire/archives/lievre/2022-e9ed2ea5.webp"
        orbImagePosition="center"
        orbLabel={fr
          ? 'Cinq membres de la troupe en costume viking, agenouillés et assis en cercle sur le terrain du festival, en pleine conversation. Un bouclier peint en jaune et noir repose devant eux, et des fanions colorés flottent en arrière-plan.'
          : 'Five reenactors in Viking costume, kneeling and sitting together on the festival grounds, mid-conversation. A shield painted yellow and black rests in front of them, with colourful pennants strung in the background.'}
      />

      <section className="relative py-14 md:py-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          {!user ? (
            <div className="max-w-lg mx-auto text-center rounded-lg-card border border-brass/35 px-7 py-12"
                 style={{ background: 'rgba(26, 5, 11, 0.5)' }}>
              <h2 className="font-display title-medieval text-2xl text-ivory mb-3">
                {fr ? 'Le registre s’ouvre aux membres' : 'The roll opens to members'}
              </h2>
              <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-7">
                {fr
                  ? 'Connectez-vous pour voir qui est là, ajouter des amis et lancer des défis.'
                  : 'Sign in to see who is here, add friends and send challenges.'}
              </p>
              <button type="button" onClick={openSignIn}
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors">
                {fr ? 'Se connecter' : 'Sign in'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <label className="relative flex-1 min-w-[240px]">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ivory-soft/45" />
                  <input
                    value={terme}
                    onChange={(e) => setTerme(e.target.value)}
                    placeholder={fr ? 'Chercher un membre par son nom' : 'Search a member by name'}
                    className="w-full pl-11 pr-4 py-3.5 rounded-card font-sans text-sm text-ivory placeholder:text-ivory-soft/40"
                    style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(232,177,74,0.25)' }}
                  />
                </label>
                <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-ivory-soft/55 inline-flex items-center gap-2">
                  <Users size={13} /> {visibles.length} {fr ? 'membres' : 'members'} · {amis.length} {fr ? 'amis' : 'friends'}
                </span>
              </div>

              {charge ? (
                <p className="font-sans text-sm text-ivory-soft/55">{fr ? 'Lecture du registre…' : 'Reading the roll…'}</p>
              ) : visibles.length === 0 ? (
                <p className="font-editorial text-base text-ivory-soft">
                  {terme
                    ? (fr ? 'Personne de ce nom dans le registre.' : 'Nobody by that name on the roll.')
                    : (fr ? 'Le registre est encore vide. Vous y serez dès votre première visite de l’espace membre.' : 'The roll is still empty. You will appear on your first visit to the member space.')}
                </p>
              ) : (
                <>
                  {/* Deux sections pour l'équipe : les membres qui se sont
                      inscrits eux-mêmes, puis les fiches importées des
                      exports du festival (Alex, 2026-08-28). */}
                  {isAdmin ? (
                    <>
                      <p className="witcher-stat-label mb-3">
                        {fr ? 'Inscrits eux-mêmes' : 'Signed up themselves'} · {visibles.filter((m) => !m.importe).length}
                      </p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                        {visibles.filter((m) => !m.importe).map((m) => (
                          <CarteMembre key={m.uid} m={m} fr={fr} lang={lang}
                            moi={user.uid} monNom={user.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger')} liens={liens} />
                        ))}
                      </div>
                      <p className="witcher-stat-label mb-3">
                        {fr ? 'Fiches importées, jamais réclamées' : 'Imported cards, never claimed'} · {visibles.filter((m) => m.importe).length}
                      </p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {visibles.filter((m) => m.importe).map((m) => (
                          <CarteMembre key={m.uid} m={m} fr={fr} lang={lang}
                            moi={user.uid} monNom={user.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger')} liens={liens} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {visibles.map((m) => (
                        <CarteMembre key={m.uid} m={m} fr={fr} lang={lang}
                          moi={user.uid} monNom={user.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger')} liens={liens} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* La place commune du registre, sous la liste des membres. */}
          {/* Le mur social, en tête du registre (Alex, 2026-08-27). */}
          <div className="mb-10 md:mb-14 max-w-3xl">
            <p className="witcher-stat-label mb-4">{fr ? 'Le mur social' : 'The social wall'}</p>
            <MurSocial lang={lang} avecAnnonces={false} />
          </div>
          <SalonOrdre />
          {/* Le babillard des annonces, au bas du registre (Alex, 2026-08-28). */}
          <div className="mt-14 max-w-4xl">
            <AnnoncesPanel lang={lang} />
          </div>
        </div>
      </section>
    </>
  );
};

const CarteMembre: React.FC<{
  m: Membre; fr: boolean; lang: 'FR' | 'EN'; moi: string; monNom: string; liens: Amitie[];
}> = ({ m, fr, lang, moi, monNom, liens }) => {
  const { isAdmin } = useAuth();
  // Le défi (Alex, 2026-08-27) : depuis la carte, on choisit le jeu,
  // la partie s'ouvre dans l'attente de l'autre, et le lien mène au
  // plateau. Deux jeux se jouent à deux : Hnefatafl et les dés.
  const [choixDefi, setChoixDefi] = useState(false);
  const [defiEnCours, setDefiEnCours] = useState<'tafl' | 'des' | null>(null);
  const [partieLancee, setPartieLancee] = useState<{ jeu: 'tafl' | 'des'; id: string } | null>(null);
  const [delaiMs, setDelaiMs] = useState(0);
  const lancer = async (jeu: 'tafl' | 'des') => {
    setDefiEnCours(jeu);
    try {
      const nomCible = m.nom || (fr ? 'Un inconnu' : 'A stranger');
      const id = jeu === 'tafl'
        ? await lancerDefi({ moiUid: moi, moiNom: monNom, cibleUid: m.uid, cibleNom: nomCible, regleId: REGLE_DEFAUT, monCamp: 'attacker', delaiMs })
        : await lancerDefiDes({ moiUid: moi, moiNom: monNom, cibleUid: m.uid, cibleNom: nomCible });
      setPartieLancee({ jeu, id });
      setChoixDefi(false);
    } finally { setDefiEnCours(null); }
  };
  const lienPartie = (p: { jeu: 'tafl' | 'des'; id: string }) =>
    `${addLocale(p.jeu === 'tafl' ? '/jeunesse/hnefatafl' : '/jeux/des', lang)}?partie=${p.id}`;
  const ami = estAmi(liens, moi, m.uid);
  const attente = amitieEnAttente(liens, moi, m.uid);
  const aMoiDeRepondre = attente && attente.de !== moi;
  const [occupe, setOccupe] = useState(false);

  const geste = async () => {
    setOccupe(true);
    try {
      if (aMoiDeRepondre) await accepterAmitie(moi, m.uid);
      else if (!attente && !ami) await demanderAmitie(moi, m.uid);
    } finally { setOccupe(false); }
  };

  return (
    <article className="relative rounded-lg-card border border-brass/25 p-6 flex flex-col"
             style={{ background: 'rgba(26, 5, 11, 0.45)' }}>
      {/* Le « i » de la fiche importée, visible de l'équipe seulement.
          Il disparaît dès que la personne réclame son compte. */}
      {isAdmin && m.importe && (
        <span title={fr ? 'Fiche importée, jamais réclamée' : 'Imported card, never claimed'}
              className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center font-display text-xs"
              style={{ background: 'rgba(120,130,190,0.18)', border: '1px solid rgba(150,170,220,0.6)', color: '#9fb0e6' }}>
          i
        </span>
      )}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-brass/30"
             style={{ background: `hsl(${m.avatarHue ?? 30} 40% 22%)` }}>
          {m.avatarUrl
            ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            : <span className="w-full h-full flex items-center justify-center font-display text-xl text-ivory/80">
                {(m.nom || '?').slice(0, 1).toUpperCase()}
              </span>}
        </div>
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <Link to={`${addLocale('/profil', lang)}/${m.uid}`}
                  className="block font-display title-medieval text-lg text-ivory hover:text-brass transition-colors truncate">
              {m.nom || (fr ? 'Un inconnu' : 'A stranger')}
            </Link>
            {m.verifie && <BadgeVerifie size={22} titre={fr ? 'Membre vérifié' : 'Verified member'} />}
          </span>
          {m.ville && <span className="block font-sans text-[11px] text-ivory-soft/55 truncate">{m.ville}</span>}
        </div>
      </div>

      {m.devise && (
        <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-4">« {m.devise} »</p>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        <button type="button" onClick={geste} disabled={occupe || ami || (!!attente && !aMoiDeRepondre)}
                className="px-4 py-2.5 rounded-card border border-brass/40 font-sans text-[10px] uppercase tracking-[0.16em] text-ivory hover:bg-brass/15 transition-colors inline-flex items-center gap-2 disabled:opacity-60">
          {ami ? <><Check size={12} /> {fr ? 'Ami' : 'Friend'}</>
            : aMoiDeRepondre ? <><UserPlus size={12} /> {fr ? 'Accepter' : 'Accept'}</>
            : attente ? <><Clock size={12} /> {fr ? 'Demande envoyée' : 'Request sent'}</>
            : <><UserPlus size={12} /> {fr ? 'Ajouter' : 'Add'}</>}
        </button>
        <Link to={`${addLocale('/profil', lang)}/${m.uid}`}
              className="px-4 py-2.5 rounded-card border border-brass/25 font-sans text-[10px] uppercase tracking-[0.16em] text-ivory-soft/80 hover:border-brass/60 transition-colors">
          {fr ? 'Profil' : 'Profile'}
        </Link>
        {m.uid !== moi && (
          partieLancee ? (
            <Link to={lienPartie(partieLancee)}
                  className="px-4 py-2.5 rounded-card bg-brass text-midnight-deep font-sans text-[10px] uppercase tracking-[0.16em] font-semibold hover:bg-brass-soft transition-colors inline-flex items-center gap-2">
              {partieLancee.jeu === 'tafl' ? <Swords size={12} /> : <Dices size={12} />}
              {fr ? 'Défi lancé · ouvrir' : 'Challenge sent · open'} <ArrowUpRight size={11} />
            </Link>
          ) : (
            <button type="button" onClick={() => setChoixDefi((v) => !v)} aria-expanded={choixDefi}
                    className="px-4 py-2.5 rounded-card border border-brass/25 font-sans text-[10px] uppercase tracking-[0.16em] text-ivory-soft/80 hover:border-brass/60 transition-colors inline-flex items-center gap-2">
              <Swords size={12} /> {fr ? 'Défi' : 'Challenge'}
            </button>
          )
        )}
      </div>
      {choixDefi && !partieLancee && (
        <div className="mt-3 pt-3 flex flex-wrap items-center gap-2" style={{ borderTop: '1px solid rgba(244,239,227,0.10)' }}>
          <span className="font-sans uppercase tracking-[0.2em] text-[10px] text-brass mr-1">{fr ? 'Quel jeu ?' : 'Which game?'}</span>
          <button type="button" onClick={() => lancer('tafl')} disabled={defiEnCours !== null}
                  className="px-3 py-2 rounded-card border border-brass/40 font-sans text-[10px] uppercase tracking-[0.16em] text-ivory hover:bg-brass/15 transition-colors inline-flex items-center gap-2 disabled:opacity-60">
            <Swords size={12} /> Hnefatafl
          </button>
          <button type="button" onClick={() => lancer('des')} disabled={defiEnCours !== null}
                  className="px-3 py-2 rounded-card border border-brass/40 font-sans text-[10px] uppercase tracking-[0.16em] text-ivory hover:bg-brass/15 transition-colors inline-flex items-center gap-2 disabled:opacity-60">
            <Dices size={12} /> {fr ? 'Les dés' : 'Dice'}
          </button>
          {/* Le minuteur (Hnefatafl) : qui ne joue pas à temps cède la partie. */}
          <div className="basis-full flex flex-wrap items-center gap-1.5 mt-1">
            <span className="font-sans uppercase tracking-[0.2em] text-[9px] text-ivory-soft/55 mr-1">{fr ? 'Minuteur Hnefatafl' : 'Hnefatafl timer'}</span>
            {DELAIS_DEFI.map((d) => (
              <button key={d.ms} type="button" onClick={() => setDelaiMs(d.ms)} aria-pressed={delaiMs === d.ms}
                      className="px-2.5 py-1 rounded-full font-sans text-[9px] uppercase tracking-[0.14em] transition-colors"
                      style={{ border: `1px solid ${delaiMs === d.ms ? '#D8B05A' : 'rgba(244,239,227,0.2)'}`, color: delaiMs === d.ms ? '#F4EFE3' : 'rgba(244,239,227,0.55)', background: delaiMs === d.ms ? 'rgba(216,176,90,0.16)' : 'transparent' }}>
                {fr ? d.FR : d.EN}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

export default OrdrePage;
