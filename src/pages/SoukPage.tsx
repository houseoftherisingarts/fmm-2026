import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Store, Coins } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import { addLocale } from '../lib/locale';
import SEO from '../components/SEO';
import PageHeader from '../components/layout/PageHeader';
import MesObjets from '../components/souk/MesObjets';
import PieceMontpellois from '../components/boutique/PieceMontpellois';
import { acheterAuSouk } from '../firebase/montpellois';
import {
  listerSouk, listerCommercesRuelle, type ObjetSouk, type CategorieSouk, type Commerce,
} from '../firebase/souk';

// ─── /souk · La foire usagée ──────────────────────────────────────────
// Une petite place de marché entre membres, plus sombre que le reste du
// site : lanternes, enseignes peintes à la main, marché noir de
// l'Ordre. Trois blocs : filtres + grille des objets, bouton pour
// mettre un objet en vente, puis les commerces non officiels de la
// ruelle (créés par les membres, jamais approuvés par le festival tant
// qu'ils ne sont pas promus en kiosque).
const CATEGORIES: CategorieSouk[] = ['costume', 'arme', 'artisanat', 'livre', 'decor', 'autre'];
const CAT_LABEL: Record<'FR' | 'EN', Record<CategorieSouk, string>> = {
  FR: { costume: 'Costume', arme: 'Arme', artisanat: 'Artisanat', livre: 'Livre', decor: 'Décor', autre: 'Autre' },
  EN: { costume: 'Costume', arme: 'Weapon', artisanat: 'Craft', livre: 'Book', decor: 'Decor', autre: 'Other' },
};

const SoukPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const fr = lang === 'FR';
  const { user, openSignIn } = useAuth();

  return (
    <main className="min-h-screen text-ivory">
      <SEO title={fr ? 'Le Souk · la foire usagée' : 'The Souk · secondhand fair'} noindex />
      <PageHeader
        eyebrow={fr ? 'L’Ordre · la foire usagée' : 'The Order · secondhand fair'}
        titleA={fr ? 'Le Souk' : 'The Souk'}
        intro={fr
          ? 'La ruelle où les membres revendent ce qu’ils ne portent plus : costumes, armes, artisanat, livres et décor. Écrivez au vendeur par la messagerie du site.'
          : 'The back alley where members resell what they no longer use: costumes, weapons, crafts, books and decor. Message the seller through the site’s inbox.'}
        orbImage="/orb/marche.jpg"
      />

      <section
        className="relative bleed-edges pt-4 pb-24 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 12% 8%, rgba(216, 155, 58, 0.14), transparent 60%),
            radial-gradient(ellipse 50% 35% at 88% 22%, rgba(216, 155, 58, 0.10), transparent 60%),
            radial-gradient(ellipse 55% 40% at 30% 85%, rgba(216, 155, 58, 0.09), transparent 60%),
            linear-gradient(180deg, #08060a 0%, #0c0810 45%, #08060a 100%)
          `,
        }}
      >
        {/* Texture toile noire : marché noir, plus sombre que le reste du site */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.16] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: 'url(/textures/black-linen.png)', backgroundSize: '480px' }}
        />

        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          {!user ? (
            <div className="glass-light rounded-lg-card p-8 text-center max-w-xl mx-auto">
              <p className="font-editorial text-base text-ivory-soft leading-relaxed mb-5">
                {fr ? 'Le Souk se visite entre membres. Connectez-vous pour entrer dans la ruelle.' : 'The Souk is for members only. Sign in to step into the alley.'}
              </p>
              <button type="button" onClick={openSignIn}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card">
                {fr ? 'Se connecter' : 'Sign in'}
              </button>
            </div>
          ) : (
            <>
              <GrilleObjets lang={lang} uid={user.uid} />
              <div className="mt-16 pt-12 border-t border-ivory-soft/10">
                <RuelleCommerces lang={lang} />
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

// ─── Grille des objets ─────────────────────────────────────────────────
const GrilleObjets: React.FC<{ lang: 'FR' | 'EN'; uid: string }> = ({ lang, uid }) => {
  const fr = lang === 'FR';
  const [objets, setObjets] = useState<ObjetSouk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<CategorieSouk | 'all'>('all');
  const [vendreOuvert, setVendreOuvert] = useState(false);

  useEffect(() => { listerSouk().then((rows) => { setObjets(rows); setLoading(false); }); }, []);

  const filtres = useMemo(() => objets.filter((o) => filtre === 'all' || o.categorie === filtre), [objets, filtre]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <FiltreBouton actif={filtre === 'all'} onClick={() => setFiltre('all')} label={fr ? 'Tous' : 'All'} />
          {CATEGORIES.map((c) => (
            <FiltreBouton key={c} actif={filtre === c} onClick={() => setFiltre(c)} label={CAT_LABEL[lang][c]} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setVendreOuvert((v) => !v)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-xs font-semibold hover:bg-brass-soft transition rounded-card shrink-0"
        >
          <Store size={14} /> {fr ? 'Mettre un objet en vente' : 'Sell an item'}
        </button>
      </div>

      {vendreOuvert && (
        <div className="mb-10 glass-light rounded-lg-card p-1">
          <MesObjets uid={uid} lang={lang} />
        </div>
      )}

      {loading ? (
        <p className="font-editorial italic text-sm text-ivory-soft">{fr ? 'Chargement…' : 'Loading…'}</p>
      ) : filtres.length === 0 ? (
        <p className="font-editorial italic text-sm text-ivory-soft">
          {fr ? 'Rien dans cette catégorie pour le moment.' : 'Nothing in this category yet.'}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtres.map((o) => <CarteObjet key={o.id} o={o} lang={lang} />)}
        </div>
      )}
    </div>
  );
};

const CarteObjet: React.FC<{ o: ObjetSouk; lang: 'FR' | 'EN' }> = ({ o, lang }) => {
  const fr = lang === 'FR';
  return (
    <div className="glass-light rounded-lg-card overflow-hidden flex flex-col" style={{ border: '1px solid rgba(216, 176, 90, 0.18)' }}>
      <div className="aspect-[4/3] bg-midnight-deep/60 relative overflow-hidden">
        {o.photos[0] ? (
          <img src={o.photos[0]} alt={o.titre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ivory-soft/30">
            <Store size={28} />
          </div>
        )}
        {o.statut !== 'disponible' && (
          <span className="absolute top-2 right-2 witcher-stat-label bg-midnight-deep/80 px-2 py-1 rounded-card">
            {o.statut === 'reserve' ? (fr ? 'Réservé' : 'Reserved') : (fr ? 'Vendu' : 'Sold')}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="font-display title-medieval text-base text-ivory truncate">{o.titre}</p>
        <p className="font-sans text-sm text-brass font-semibold">{o.prix.toFixed(2)} $</p>
        {o.description && <p className="font-editorial text-xs text-ivory-soft leading-relaxed line-clamp-2">{o.description}</p>}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <Link to={addLocale(`/profil/${o.uid}`, lang)} className="font-sans text-xs text-ivory-soft hover:text-brass transition truncate">
            {o.nom}
          </Link>
          <Link
            to={addLocale(`/messages/${o.uid}`, lang)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-[10px] font-semibold hover:bg-brass-soft transition rounded-card shrink-0"
          >
            <MessageSquare size={12} /> {fr ? 'Écrire' : 'Message'}
          </Link>
        </div>
      </div>
    </div>
  );
};

const FiltreBouton: React.FC<{ actif: boolean; onClick: () => void; label: string }> = ({ actif, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3.5 py-1.5 rounded-card font-sans text-xs uppercase tracking-wider transition border ${
      actif ? 'bg-brass/20 border-brass text-brass' : 'border-ivory-soft/20 text-ivory-soft hover:border-brass/50 hover:text-brass'
    }`}
  >
    {label}
  </button>
);

// ─── Les commerces de la ruelle ─────────────────────────────────────────
const RuelleCommerces: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { listerCommercesRuelle().then((rows) => { setCommerces(rows); setLoading(false); }); }, []);

  return (
    <div>
      <p className="witcher-stat-label mb-2">{fr ? 'La ruelle' : 'The alley'}</p>
      <h2 className="font-display title-medieval text-2xl md:text-3xl text-ivory mb-2">
        {fr ? 'Les commerces de la ruelle' : 'Shops of the alley'}
      </h2>
      <p className="font-editorial italic text-sm text-ivory-soft max-w-xl mb-8">
        {fr
          ? 'Des commerces montés par les membres, non officiels, jamais approuvés par le festival tant qu’ils ne tiennent pas un kiosque.'
          : 'Shops set up by members, unofficial, never approved by the festival unless they hold a kiosk.'}
      </p>
      {loading ? (
        <p className="font-editorial italic text-sm text-ivory-soft">{fr ? 'Chargement…' : 'Loading…'}</p>
      ) : commerces.length === 0 ? (
        <p className="font-editorial italic text-sm text-ivory-soft">{fr ? 'Aucun commerce pour le moment.' : 'No shops yet.'}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {commerces.map((c) => (
            <div key={c.uid} className="glass-light rounded-lg-card overflow-hidden flex flex-col" style={{ border: '1px solid rgba(216, 176, 90, 0.18)' }}>
              <div className="aspect-[4/3] bg-midnight-deep/60 relative overflow-hidden">
                {c.photos[0] ? (
                  <img src={c.photos[0]} alt={c.nom} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ivory-soft/30"><Store size={28} /></div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <p className="font-display title-medieval text-base text-ivory truncate">{c.nom}</p>
                <p className="font-sans text-xs uppercase tracking-widest text-brass">{c.categorie}</p>
                <p className="font-editorial text-xs text-ivory-soft leading-relaxed line-clamp-2">{c.description}</p>
                <Link
                  to={addLocale(`/profil/${c.uid}`, lang)}
                  className="mt-auto pt-3 font-sans text-xs text-ivory-soft hover:text-brass transition"
                >
                  {fr ? 'Voir la fiche' : 'View listing'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SoukPage;
