import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Swords, Dices, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import { lirePartie, rejoindreDefiParLien, jeuDe, JEUX_DEFIABLES, type PartieTafl } from '../firebase/tafl';
import { lirePartieDes, rejoindreDefiDesParLien, type PartieDes } from '../firebase/desParties';
import { REGLES } from '../games/hnefatafl/gameLogic';
import SEO from '../components/SEO';
import Brume from '../components/Brume';

// ─── Le lobby d'un défi reçu par lien ───────────────────────────────
// Quelqu'un a collé son lien dans Messenger. La personne arrive ici,
// voit qui l'attend, se crée un compte, et la partie s'ouvre (Alex,
// 2026-08-23). C'est la porte d'entrée du site.
//
// Le lien ne dit pas à quel jeu il mène : le même chemin sert au tafl
// et aux dés. Le lobby regarde donc les deux collections et garde
// celle qui répond. Une lecture de plus au chargement, et un seul
// lien à retenir pour tous les jeux du festival.

type Jeu = 'tafl' | 'des';

const DefiLobbyPage: React.FC = () => {
  useCaravanPage();
  const { id = '' } = useParams<{ id: string }>();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const { user, loading, openSignIn } = useAuth();
  const navigate = useNavigate();

  const [jeu, setJeu] = useState<Jeu | null>(null);
  const [tafl, setTafl] = useState<PartieTafl | null>(null);
  const [des, setDes] = useState<PartieDes | null>(null);
  const [lecture, setLecture] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [entree, setEntree] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const p = await lirePartie(id);
        if (vivant && p) { setTafl(p); setJeu('tafl'); return; }
      } catch { /* les règles ferment ce défi : nous tentons les dés */ }
      try {
        const d = await lirePartieDes(id);
        if (vivant && d) { setDes(d); setJeu('des'); }
      } catch { /* rien à ouvrir sous ce lien */ }
    })().finally(() => { if (vivant) setLecture(false); });
    return () => { vivant = false; };
  }, [id, user?.uid]);

  // Une fois connecté, on prend le siège libre et on entre en jeu. Le
  // même lien mène aux quatre jeux : le document dit lequel, et la
  // table des jeux défiables donne l'adresse (Alex, 2026-09-01, quand
  // le Renard et la Mérelle ont eu leurs chambres publiques).
  const chemin = jeu === 'des'
    ? '/jeux/des'
    : tafl ? JEUX_DEFIABLES[jeuDe(tafl)].cheminFR : '/jeunesse/hnefatafl';
  const partie: { joueurs: string[]; statut: string; noms: Record<string, string>; lancePar: string } | null =
    tafl ?? des;

  useEffect(() => {
    if (!user || !partie || !jeu || entree) return;
    if (partie.joueurs.includes(user.uid)) {
      navigate(`${addLocale(chemin, lang)}?partie=${id}`, { replace: true });
      return;
    }
    if (partie.statut !== 'lobby') { setErreur('plein'); return; }
    setEntree(true);
    const nom = user.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger');
    const prendre = jeu === 'des'
      ? rejoindreDefiDesParLien(id, user.uid, nom)
      : rejoindreDefiParLien(id, user.uid, nom);
    void prendre
      .then((r) => {
        if (r === 'ok' || r === 'moi') {
          navigate(`${addLocale(chemin, lang)}?partie=${id}`, { replace: true });
        } else {
          setErreur(r);
          setEntree(false);
        }
      })
      .catch(() => { setErreur('plein'); setEntree(false); });
  }, [user, partie, jeu, chemin, entree, id, lang, fr, navigate]);

  const hote = partie ? (partie.noms[partie.lancePar] || (fr ? 'Un inconnu' : 'A stranger')) : '';
  const regle = tafl ? REGLES.find((r) => r.id === tafl.regleId) : undefined;

  const titreSEO = jeu === 'des'
    ? (fr ? `${hote || 'Quelqu’un'} vous attend aux dés` : `${hote || 'Someone'} is waiting for you at dice`)
    : (fr ? `${hote || 'Quelqu’un'} vous attend au tafl` : `${hote || 'Someone'} is waiting for you at tafl`);

  const descriptionSEO = jeu === 'des'
    ? (fr
      ? 'Une partie de dés du menteur vous attend au Festival Médiéval de Montpellier. Prenez votre siège.'
      : 'A game of liar’s dice is waiting for you at the Festival Médiéval de Montpellier. Take your seat.')
    : (fr
      ? 'Un défi de hnefatafl vous attend au Festival Médiéval de Montpellier. Prenez votre siège.'
      : 'A hnefatafl challenge is waiting for you at the Festival Médiéval de Montpellier. Take your seat.');

  const scene = jeu === 'des'
    ? (fr
      ? 'Cinq dés roulent sous un gobelet de cuir, chacun annonce plus haut que son voisin, et le premier qui doute fait lever tous les gobelets. Prenez le siège libre et la partie commence.'
      : 'Five dice roll under a leather cup, everyone bids higher than the last, and the first to doubt sends every cup up. Take the free seat and the game begins.')
    : (fr
      ? 'Un roi cerné cherche la sortie, ses assaillants resserrent l’étau. Prenez le siège libre et la partie commence.'
      : 'A cornered king looks for a way out while his attackers tighten the ring. Take the free seat and the game begins.');

  return (
    <>
      <SEO title={titreSEO} description={descriptionSEO} />
      <section className="relative min-h-[80vh] flex items-center justify-center px-4 py-24 overflow-hidden">
        <Brume />
        <div className="relative z-10 w-full max-w-lg text-center rounded-lg-card border border-brass/35 px-7 py-12 md:px-12"
             style={{
               background: 'linear-gradient(165deg, rgba(24,12,8,0.92), rgba(8,3,5,0.97))',
               backdropFilter: 'blur(12px)',
               boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
             }}>
          <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-ivory-soft/55 mb-4 inline-flex items-center gap-2">
            {jeu === 'des' ? <Dices size={12} /> : <Swords size={12} />}
            {/* Un lien mort ne résout aucun des deux jeux : la mention
                reste neutre plutôt que d'annoncer une table qui
                n'existe pas. */}
            {jeu === 'des'
              ? (fr ? 'Défi aux dés' : 'Dice challenge')
              : jeu === 'tafl'
                ? (fr ? 'Défi de hnefatafl' : 'Hnefatafl challenge')
                : (fr ? 'Défi du festival' : 'Festival challenge')}
          </p>

          {lecture || loading ? (
            <p className="font-editorial text-base text-ivory-soft py-6 inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> {fr ? 'Le lobby s’ouvre…' : 'Opening the lobby…'}
            </p>
          ) : !partie ? (
            <>
              <h1 className="font-display title-medieval text-3xl text-ivory mb-4">
                {fr ? 'Ce défi n’est plus là' : 'This challenge is gone'}
              </h1>
              <div className="divider-brass w-16 mx-auto mb-5" />
              <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-8">
                {fr
                  ? 'Le siège a été pris, ou le lien a expiré. Connectez-vous et lancez le vôtre : la table est ouverte.'
                  : 'The seat was taken, or the link expired. Sign in and start your own: the table is open.'}
              </p>
              <button type="button" onClick={openSignIn}
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors">
                <LogIn size={15} /> {fr ? 'Se connecter' : 'Sign in'}
              </button>
            </>
          ) : (
            <>
              <h1 className="font-display title-medieval text-3xl md:text-4xl text-ivory mb-4">
                {fr ? `${hote} vous attend` : `${hote} is waiting for you`}
              </h1>
              <div className="divider-brass w-16 mx-auto mb-5" />
              <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-3">
                {scene}
              </p>
              {regle && (
                <p className="font-sans uppercase tracking-[0.2em] text-[10px] text-ivory-soft/55 mb-8">
                  {fr ? regle.nomFR : regle.nomEN}
                </p>
              )}
              {erreur === 'plein' ? (
                <p className="font-editorial text-sm text-brass">
                  {fr ? 'Quelqu’un a pris le siège avant vous.' : 'Someone took the seat before you.'}
                </p>
              ) : user ? (
                <p className="font-editorial text-base text-ivory-soft inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> {fr ? 'Nous vous asseyons…' : 'Seating you…'}
                </p>
              ) : (
                <>
                  <button type="button" onClick={openSignIn}
                          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-brass/50 font-sans uppercase tracking-[0.2em] text-[11px] text-ivory hover:bg-brass/15 transition-colors">
                    <LogIn size={15} /> {fr ? 'Prendre mon siège' : 'Take my seat'}
                  </button>
                  <p className="mt-5 font-sans text-xs text-ivory-soft/55">
                    {fr
                      ? 'Un compte du festival prend une minute, et il porte ensuite vos parties et vos badges.'
                      : 'A festival account takes a minute, and it then carries your games and your badges.'}
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
};

export default DefiLobbyPage;
