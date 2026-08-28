import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Lock, Shirt, Users, Sparkles, Store } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import Brume from '../components/Brume';
import PageHeader from '../components/layout/PageHeader';
import PieceMontpellois from '../components/boutique/PieceMontpellois';
import Inventaire from './Inventaire';
import Salon2D from './Salon2D';
import { AVATAR_VIDE, chargerAvatar, sauverAvatar, type AvatarChantier } from './avatar';
import { SAC_DEPART, objetParId } from './objets';
import { suivreMaBourse, type Bourse } from '../firebase/montpellois';
import { tenterUneTrouvaille } from './trouvailles';

// ─── Le chantier : inventaire + salon 2D ──────────────────────────────
// Réservé à l'équipe tant que ce n'est pas prêt à publier. `?apercu=1`
// (dev seulement) montre un personnage témoin sans Firebase, pour la
// vérification visuelle (Alex, 2026-08-27).

const TEMOIN: AvatarChantier = {
  corps: 'B',
  peau: 1,
  coiffure: 2,
  equipe: { tete: 'casque_heaume', torse: 'torse_plates', cape: 'cape_ordre', mainDroite: 'baton', mainGauche: 'bouclier_fer', jambes: 'jambes_mailles', pieds: 'bottes_ferrees', amulette: 'amulette_lievre', anneau: 'anneau_brume' },
  sac: SAC_DEPART,
};

const ChantierPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();
  const fr = lang === 'FR';
  const apercu = import.meta.env.DEV && new URLSearchParams(location.search).get('apercu') === '1';

  const [onglet, setOnglet] = useState<'inventaire' | 'salon'>('inventaire');
  const [avatar, setAvatar] = useState<AvatarChantier>(apercu ? TEMOIN : AVATAR_VIDE);
  const [bourse, setBourse] = useState<Bourse | null>(null);
  const [tirage, setTirage] = useState<'attente' | 'en-cours' | 'fait'>('attente');
  const [messageTirage, setMessageTirage] = useState<string | null>(null);

  useEffect(() => {
    if (apercu || !user) return;
    let vivant = true;
    void chargerAvatar(user.uid).then((a) => { if (vivant) setAvatar(a); });
    return () => { vivant = false; };
  }, [apercu, user]);

  useEffect(() => {
    if (apercu || !user) return;
    return suivreMaBourse(user.uid, setBourse);
  }, [apercu, user]);

  async function tenterTrouvaille() {
    if (apercu) return;
    setTirage('en-cours');
    try {
      const { objetId, dejaFaiteAujourdhui } = await tenterUneTrouvaille();
      if (dejaFaiteAujourdhui) {
        setMessageTirage(fr ? 'Déjà tenté aujourd’hui. Revenez demain.' : 'Already tried today. Come back tomorrow.');
      } else if (objetId) {
        const o = objetParId(objetId);
        setMessageTirage(fr ? `Une trouvaille ! ${o?.nom.FR ?? objetId} rejoint votre sac.` : `A find! ${o?.nom.EN ?? objetId} joins your bag.`);
      } else {
        setMessageTirage(fr ? 'Rien cette fois. Le sort sera meilleur demain.' : 'Nothing this time. Better luck tomorrow.');
      }
    } catch (e) {
      setMessageTirage(e instanceof Error ? e.message : String(e));
    } finally {
      setTirage('fait');
    }
  }

  function surChangement(a: AvatarChantier) {
    setAvatar(a);
    if (!apercu && user) void sauverAvatar(user.uid, a);
  }

  const peutEntrer = apercu || (!loading && isAdmin);

  return (
    <main className="min-h-screen text-ivory">
      <SEO title="Chantier" noindex />
      <PageHeader
        eyebrow={fr ? 'Atelier de l’équipe' : 'Team workshop'}
        titleA={fr ? 'Le chantier' : 'The workshop'}
        intro={fr
          ? 'L’inventaire du personnage et le premier salon. Pas encore publié.'
          : 'The character inventory and the first common room. Not published yet.'}
        orbImage="/histoire/archives/lievre/2022-e9ed2ea5.webp"
      />
      <section className="relative caravan-stage bleed-edges pt-4 pb-20 overflow-hidden">
        <Brume />
        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8">
          {!peutEntrer ? (
            <div className="glass-light rounded-lg-card p-10 text-center max-w-md mx-auto">
              <Lock size={22} className="mx-auto mb-4 text-brass" />
              <p className="font-display text-xl mb-2">{fr ? 'Chantier fermé' : 'Workshop closed'}</p>
              <p className="font-editorial text-sm text-ivory-soft leading-relaxed">
                {fr ? 'Cette page est réservée à l’équipe pendant qu’elle se construit.'
                    : 'This page is reserved for the team while it is being built.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-8">
                <button type="button" onClick={() => setOnglet('inventaire')} className="witcher-tab" data-active={onglet === 'inventaire'}>
                  <Shirt size={13} className="inline mr-2 -mt-0.5" />{fr ? 'Inventaire' : 'Inventory'}
                </button>
                <button type="button" onClick={() => setOnglet('salon')} className="witcher-tab" data-active={onglet === 'salon'}>
                  <Users size={13} className="inline mr-2 -mt-0.5" />{fr ? 'Salon' : 'Common room'}
                </button>
              </div>
              {onglet === 'inventaire' ? (
                <Inventaire lang={lang} avatar={avatar} onChange={surChangement} />
              ) : (
                <Salon2D
                  lang={lang}
                  uid={apercu ? 'apercu' : (user?.uid ?? 'apercu')}
                  nom={apercu ? 'Témoin' : (user?.displayName || (fr ? 'Membre' : 'Member'))}
                  avatar={avatar}
                  horsLigne={apercu}
                />
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default ChantierPage;
