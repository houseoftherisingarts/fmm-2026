import React, { useState } from 'react';
import { Gift } from 'lucide-react';
import { Eyebrow, DisplayTitle, GildedFrame, SectionFog, SectionTopRail } from '../marche/atmospherics';
import { inscrireConcoursWJW, PRIX_CONCOURS_WJW } from '../../firebase/concoursWJW';
import { useAuth } from '../../contexts/AuthContext';

// ─── Le concours William ────────────────────────────────────────────
// La plus-value du palier à 2 500 $ : un concours qui remplit une liste
// de gens intéressés, remise au commanditaire avec leur consentement.
// Trois prix, un formulaire de trois champs, et le règlement écrit en
// clair sous le bouton, parce que la seule chose qui rend cette liste
// utilisable est que chaque personne ait su à quoi elle disait oui.
//
// Même écrin que le reste de la page : verre vin dans les coins dorés.

const CHAMP =
  'w-full min-w-0 bg-[rgba(10,2,7,0.6)] px-4 py-3 text-sm font-sans transition-colors focus:outline-none disabled:opacity-60 placeholder:text-[rgba(232,221,193,0.45)]';

const ConcoursWJW: React.FC = () => {
  const { user, sendMagicLink } = useAuth();
  const [nom, setNom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [telephone, setTelephone] = useState('');
  const [consent, setConsent] = useState(false);
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'merci' | 'erreur'>('repos');

  const bordure = (vide: boolean) => ({
    color: 'var(--color-bone)',
    border: `1px solid ${vide && etat === 'erreur' ? 'rgba(224, 138, 122, 0.55)' : 'rgba(232, 177, 74, 0.35)'}`,
  });

  // Connecté : un clic suffit, le serveur prend le nom de la fiche et le
  // courriel du compte (Alex, 2026-08-30). Le téléphone reste facultatif,
  // il sert à joindre la personne si elle gagne.
  const participerAvecCompte = async () => {
    setEtat('envoi');
    try {
      await participerConcoursAvecCompte(telephone);
      setEtat('merci');
    } catch {
      setEtat('erreur');
    }
  };

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent || !nom.trim() || !courriel.trim() || !telephone.trim()) { setEtat('erreur'); return; }
    setEtat('envoi');
    try {
      await inscrireConcoursWJW({ nom, courriel, telephone });
    } catch {
      // Un courriel déjà inscrit tombe ici : la règle refuse la seconde
      // création. La personne est déjà dans le chapeau, on continue.
    }
    // Participer, c'est aussi ouvrir son espace : le lien de connexion
    // part vers le courriel donné, à moins que la personne soit déjà
    // connectée. Le tirage s'annonce dans cet espace, pas ailleurs.
    if (!user) {
      try { await sendMagicLink(courriel); } catch { /* le compte se fera à la prochaine visite */ }
    }
    setEtat('merci');
  };

  return (
    <section id="concours-wjw" className="relative py-16 md:py-24 overflow-hidden">
      <SectionFog edges="both" />
      <div className="relative z-10 max-w-screen-2xl mx-auto px-5 md:px-10 lg:px-14">
        <SectionTopRail index="08" name="Le concours" meta="Prix" metaValue="3" className="mb-10 md:mb-14" />

        <GildedFrame tone="amber" active className="block">
          <div className="caravan-glass grid lg:grid-cols-12 gap-10 lg:gap-14 items-start p-7 md:p-12 lg:p-14">
            <div className="lg:col-span-6 min-w-0">
              <Eyebrow tone="amber" className="mb-5 inline-flex items-center gap-3">
                <span aria-hidden className="h-px w-8" style={{ background: 'var(--color-amber-glow)' }} />
                Concours William J. Walter
              </Eyebrow>
              <DisplayTitle size="lg" glow className="mb-5">
                Trois prix à gagner
              </DisplayTitle>
              <p className="font-editorial text-base md:text-lg text-ivory leading-relaxed mb-7">
                Trois prix sont tirés le dimanche matin, dernier jour du festival, parmi
                les gens qui se seront inscrits ici même, sur le site web, avant le
                samedi 26 septembre au soir. C'est la seule porte d'entrée du tirage,
                et la place au banquet se gagne à temps pour s'y asseoir.
              </p>
              <ul className="space-y-4">
                {PRIX_CONCOURS_WJW.map((p, i) => (
                  <li key={p.titre} className="flex gap-4">
                    <span
                      aria-hidden
                      className="font-editorial italic text-sm mt-1 shrink-0 w-6"
                      style={{ color: 'var(--color-copper)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0">
                      <span className="font-display title-medieval block text-lg md:text-xl text-ivory leading-snug">
                        {p.titre}
                      </span>
                      <span className="font-editorial block text-sm md:text-base text-ivory-soft mt-0.5">
                        {p.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-6 min-w-0">
              {etat === 'merci' ? (
                <div className="py-6">
                  <Gift size={28} style={{ color: 'var(--color-amber-glow)' }} className="mb-4" />
                  <p className="font-display title-medieval text-2xl text-ivory mb-3">Votre participation est dans votre espace.</p>
                  <p className="font-editorial text-base md:text-lg text-ivory-soft leading-relaxed max-w-prose">
                    {user
                      ? 'Elle vous attend dans votre espace, en haut à droite. Le gagnant y sera annoncé le dimanche 27 septembre au matin.'
                      : 'Un lien de connexion vient de partir vers votre courriel : il ouvre votre espace au Festival Médiéval. Cliquez ensuite sur Connexion, en haut à droite, pour voir si vous êtes l’heureux gagnant. Le gagnant y sera annoncé le dimanche 27 septembre au matin.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={envoyer} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="cw-nom" className="sr-only">Votre nom</label>
                    <input id="cw-nom" type="text" autoComplete="name" required value={nom}
                      onChange={(e) => setNom(e.target.value)} placeholder="Votre nom"
                      disabled={etat === 'envoi'} className={CHAMP} style={bordure(!nom.trim())} />
                  </div>
                  <div>
                    <label htmlFor="cw-courriel" className="sr-only">Votre courriel</label>
                    <input id="cw-courriel" type="email" inputMode="email" autoComplete="email" required value={courriel}
                      onChange={(e) => setCourriel(e.target.value)} placeholder="votre@courriel.ca"
                      disabled={etat === 'envoi'} className={CHAMP} style={bordure(!courriel.trim())} />
                  </div>
                  <div>
                    <label htmlFor="cw-tel" className="sr-only">Votre téléphone</label>
                    <input id="cw-tel" type="tel" inputMode="tel" autoComplete="tel" required value={telephone}
                      onChange={(e) => setTelephone(e.target.value)} placeholder="819 000-0000"
                      disabled={etat === 'envoi'} className={CHAMP} style={bordure(!telephone.trim())} />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer pt-1">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 shrink-0 accent-[#E8B14A]" />
                    <span className="font-editorial text-[15px] text-ivory-soft leading-snug">
                      Je comprends que mon courriel et mon téléphone servent à me joindre
                      pour la remise des prix, et j’accepte qu’ils soient remis à
                      William J. Walter pour recevoir ses nouvelles et ses offres
                      publicitaires, ainsi que celles du festival ou de ses partenaires.
                    </span>
                  </label>

                  {etat === 'erreur' && (
                    <p className="font-editorial text-sm" style={{ color: 'rgba(224, 138, 122, 0.9)' }}>
                      Les trois champs et la case sont nécessaires pour entrer dans le tirage.
                    </p>
                  )}

                  <div className="pt-2">
                    <button type="submit" disabled={etat === 'envoi'} className="fmm-glass-btn is-primary px-8 py-4"
                      style={{ display: 'inline-flex', flexDirection: 'row', gap: '.8rem', alignItems: 'center', width: 'auto' }}>
                      <Gift size={17} />
                      <span className="fmm-glass-btn-label">{etat === 'envoi' ? 'Un instant' : 'Participer au concours'}</span>
                    </button>
                  </div>

                  {/* Le règlement, en clair et sous le bouton : c'est ce qui
                      rend la liste remise au commanditaire utilisable. */}
                  <p className="font-editorial text-[13px] md:text-sm text-ivory-soft/80 leading-relaxed pt-3 max-w-prose">
                    Règlement. Concours ouvert aux résidents du Québec de 18 ans et plus, du
                    1er au 26 septembre 2026, 23 h 59. Une inscription par personne, sur le
                    site web du festival uniquement. Trois prix tirés au hasard le dimanche
                    27 septembre au matin parmi les inscriptions valides, et remis sans achat
                    requis. Les personnes gagnantes
                    sont jointes par le courriel et le téléphone donnés ici; c'est à cela
                    qu'ils servent d'abord. Ces coordonnées sont aussi partagées avec
                    William J. Walter à des fins publicitaires, et chaque envoi porte un lien
                    pour vous retirer. Le Festival Médiéval de Montpellier et William J. Walter
                    ne vendent jamais cette liste.
                  </p>
                </form>
              )}
            </div>
          </div>
        </GildedFrame>
      </div>
    </section>
  );
};

export default ConcoursWJW;
