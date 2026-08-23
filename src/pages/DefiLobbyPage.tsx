import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Swords, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import { lirePartie, rejoindreDefiParLien, type PartieTafl } from '../firebase/tafl';
import { REGLES } from '../games/hnefatafl/gameLogic';
import SEO from '../components/SEO';
import Brume from '../components/Brume';

// ─── Le lobby d'un défi reçu par lien ───────────────────────────────
// Quelqu'un a collé son lien dans Messenger. La personne arrive ici,
// voit qui l'attend, se crée un compte, et la partie s'ouvre (Alex,
// 2026-08-23). C'est la porte d'entrée du site.

const DefiLobbyPage: React.FC = () => {
  useCaravanPage();
  const { id = '' } = useParams<{ id: string }>();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const { user, loading, openSignIn } = useAuth();
  const navigate = useNavigate();

  const [partie, setPartie] = useState<PartieTafl | null>(null);
  const [lecture, setLecture] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [entree, setEntree] = useState(false);

  useEffect(() => {
    let vivant = true;
    lirePartie(id)
      .then((p) => { if (vivant) setPartie(p); })
      .catch(() => { /* règles : la partie n'est plus ouverte */ })
      .finally(() => { if (vivant) setLecture(false); });
    return () => { vivant = false; };
  }, [id, user?.uid]);

  // Une fois connecté, on prend le siège libre et on entre en jeu.
  useEffect(() => {
    if (!user || !partie || entree) return;
    if (partie.joueurs.includes(user.uid)) {
      navigate(`${addLocale('/jeunesse/hnefatafl', lang)}?partie=${id}`, { replace: true });
      return;
    }
    if (partie.statut !== 'lobby') { setErreur('plein'); return; }
    setEntree(true);
    void rejoindreDefiParLien(id, user.uid, user.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger'))
      .then((r) => {
        if (r === 'ok' || r === 'moi') {
          navigate(`${addLocale('/jeunesse/hnefatafl', lang)}?partie=${id}`, { replace: true });
        } else {
          setErreur(r);
          setEntree(false);
        }
      })
      .catch(() => { setErreur('plein'); setEntree(false); });
  }, [user, partie, entree, id, lang, fr, navigate]);

  const hote = partie ? (partie.noms[partie.lancePar] || (fr ? 'Un inconnu' : 'A stranger')) : '';
  const regle = partie ? REGLES.find((r) => r.id === partie.regleId) : undefined;

  return (
    <>
      <SEO
        title={fr ? `${hote || 'Quelqu’un'} vous attend au tafl` : `${hote || 'Someone'} is waiting for you at tafl`}
        description={fr
          ? 'Un défi de hnefatafl vous attend au Festival Médiéval de Montpellier. Prenez votre siège.'
          : 'A hnefatafl challenge is waiting for you at the Festival Médiéval de Montpellier. Take your seat.'}
      />
      <section className="relative min-h-[80vh] flex items-center justify-center px-4 py-24 overflow-hidden">
        <Brume />
        <div className="relative z-10 w-full max-w-lg text-center rounded-lg-card border border-brass/35 px-7 py-12 md:px-12"
             style={{
               background: 'linear-gradient(165deg, rgba(24,12,8,0.92), rgba(8,3,5,0.97))',
               backdropFilter: 'blur(12px)',
               boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
             }}>
          <p className="font-sans uppercase tracking-[0.28em] text-[10px] text-ivory-soft/55 mb-4 inline-flex items-center gap-2">
            <Swords size={12} /> {fr ? 'Défi de hnefatafl' : 'Hnefatafl challenge'}
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
                {fr
                  ? 'Un roi cerné cherche la sortie, ses assaillants resserrent l’étau. Prenez le siège libre et la partie commence.'
                  : 'A cornered king looks for a way out while his attackers tighten the ring. Take the free seat and the game begins.'}
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
                  <Loader2 size={16} className="animate-spin" /> {fr ? 'On vous assoit…' : 'Seating you…'}
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
