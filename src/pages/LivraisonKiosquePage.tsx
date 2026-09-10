import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import EmberCanvas from '../components/vendor/EmberCanvas';
import {
  IconSunrise, IconCauldron, IconFlame, IconGreens,
  IconBread, IconHoney, IconScorpion, IconPitcher,
} from '../components/icons/Medieval';
import { MENU, type Categorie, type Plat } from '../content/menu2026';
import {
  JOURS, PLACES_PILOTE, REPAS_PAR_JOUR, PRIX_JOUR_CENTS,
  NO_TPS, NO_TVQ, calculer, argent, type JourId,
} from '../content/livraisonKiosque';
import { reserverLivraisonKiosque, watchPlacesLibres } from '../firebase/livraisonKiosque';

// ─── Repas livrés au kiosque · programme pilote ──────────────────────
// Alex, 10 septembre 2026. Le service rendu à un marchand l'an passé
// devient une offre : deux repas par jour apportés à la tente, des
// boîtes surprises tirées du menu du village, cinquante dollars avant
// taxes par personne et par jour. Dix kiosques cette édition.
//
// La page vit derrière son lien, /kiosque/livraison, et n'entre dans
// aucun menu ni dans aucun plan de site. Même mécanique que
// /signer-cuisine : le lien se colle dans une conversation.
//
// Le paiement passe par la caisse Stripe du Salon des Inconnus, celle
// qui vend déjà les Montpellois. La fonction `reserverLivraisonKiosque`
// compte les places avant d'ouvrir la caisse, et le webhook marque la
// fiche payée.

const GLYPHES = {
  sunrise: IconSunrise, cauldron: IconCauldron, flame: IconFlame, greens: IconGreens,
  bread: IconBread, honey: IconHoney, scorpion: IconScorpion, pitcher: IconPitcher,
} as const;

const Glyphe: React.FC<{ name: keyof typeof GLYPHES; size?: number }> = ({ name, size = 20 }) => {
  const I = GLYPHES[name];
  return <I size={size} className="shrink-0" />;
};

type Etat = 'repos' | 'envoi' | 'inscritEnAttente';

const LivraisonKiosquePage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const [params] = useSearchParams();
  const retour = params.get('livraison');

  const [libres, setLibres] = useState(PLACES_PILOTE);
  useEffect(() => watchPlacesLibres(setLibres), []);
  const complet = libres <= 0;

  const [kiosque, setKiosque] = useState('');
  const [contact, setContact] = useState('');
  const [courriel, setCourriel] = useState('');
  const [telephone, setTelephone] = useState('');
  const [personnes, setPersonnes] = useState(2);
  const [jours, setJours] = useState<JourId[]>(['ven', 'sam', 'dim']);
  const [restrictions, setRestrictions] = useState('');
  const [tientKiosque, setTientKiosque] = useState(false);
  const [etat, setEtat] = useState<Etat>('repos');
  const [erreur, setErreur] = useState<string | null>(null);

  const facture = useMemo(() => calculer(personnes, jours.length), [personnes, jours.length]);
  const troisJours = jours.length === 3;

  const basculerJour = (id: JourId) =>
    setJours((prev) => (prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]));

  const pret =
    kiosque.trim().length > 1 &&
    contact.trim().length > 1 &&
    /.+@.+\..+/.test(courriel) &&
    telephone.trim().length >= 7 &&
    personnes >= 1 &&
    jours.length >= 1 &&
    tientKiosque;

  const envoyer = async () => {
    if (!pret || etat === 'envoi') return;
    setEtat('envoi');
    setErreur(null);
    try {
      const reponse = await reserverLivraisonKiosque({
        kiosque: kiosque.trim(),
        contact: contact.trim(),
        courriel: courriel.trim(),
        telephone: telephone.trim(),
        personnes,
        jours,
        restrictions: restrictions.trim(),
        langue: lang,
        liste: complet,
      });
      if (reponse.url) { window.location.href = reponse.url; return; }
      if (reponse.enAttente) { setEtat('inscritEnAttente'); return; }
      if (reponse.complet) { setLibres(0); setEtat('repos'); setErreur(t.erreurComplet); return; }
      setEtat('repos');
      setErreur(t.erreurGenerique);
    } catch (e) {
      setEtat('repos');
      const message = (e as { message?: string })?.message;
      setErreur(message && message.length < 200 ? message : t.erreurGenerique);
    }
  };

  return (
    <>
      <SEO title={t.seoTitre} description={t.seoDesc} noindex />

      <section className="relative caravan-stage bleed-edges text-[var(--color-bone)] pt-28 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        <EmberCanvas />

        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <div
            className="flex items-center justify-between gap-4 mb-10 md:mb-14 pb-2"
            style={{ borderBottom: '1px solid rgba(var(--sk-parchment-rgb), 0.10)' }}
          >
            <p
              className="font-sans uppercase tracking-[0.45em] text-[10px] md:text-[11px] inline-flex items-center gap-2"
              style={{ color: 'var(--sk-gilt)' }}
            >
              <UtensilsCrossed size={12} />{t.eyebrow}
            </p>
            <span className="witcher-stat-label hidden md:inline">
              {complet ? t.compteurComplet : t.compteur(libres)}
            </span>
          </div>

          <h1
            className="font-display leading-[1.02] tracking-[-0.005em] text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-8 max-w-4xl"
            style={{
              color: 'var(--color-bone)',
              fontWeight: 400,
              textShadow: '0 0 24px rgba(var(--sk-glow-rgb), 0.28), 0 0 60px rgba(var(--sk-copper-rgb), 0.22)',
            }}
          >
            {t.titre}
          </h1>

          <div className="max-w-2xl space-y-5">
            {t.intro.map((p, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.08 }}
                className="font-sans text-base md:text-lg leading-[1.75]"
                style={{ color: 'rgba(var(--sk-parchment-rgb), 0.78)', fontWeight: 300 }}
              >
                {p}
              </motion.p>
            ))}
          </div>

          <p className="md:hidden witcher-stat-label mt-8">
            {complet ? t.compteurComplet : t.compteur(libres)}
          </p>
        </div>

        {/* ── Le formulaire ─────────────────────────────────────────── */}
        <div className="relative z-10 w-full px-4 md:px-8 mt-12 md:mt-16">
          <div className="velvet-card p-6 md:p-10 max-w-screen-xl mx-auto" style={{ border: '1px solid rgba(var(--sk-gilt-rgb), 0.3)' }}>

            {retour === 'ok' && <Bandeau ton="bon" texte={t.retourOk} />}
            {retour === 'annulee' && <Bandeau ton="avis" texte={t.retourAnnulee} />}

            {etat === 'inscritEnAttente' ? (
              <div className="text-center py-8">
                <span className="witcher-tile mx-auto mb-6 block" style={{ width: 54, height: 54 }}>
                  <span className="witcher-tile-inner" style={{ color: 'var(--sk-gilt)' }}><Check size={18} /></span>
                </span>
                <h2 className="font-display text-3xl mb-4" style={{ color: 'var(--color-bone)', fontWeight: 400 }}>{t.attenteTitre}</h2>
                <p className="font-sans text-base max-w-md mx-auto" style={{ color: 'rgba(var(--sk-parchment-rgb),0.72)', fontWeight: 300 }}>{t.attenteCorps}</p>
              </div>
            ) : (
              <>
                {complet && <Bandeau ton="avis" texte={t.completAvis} />}

                <h2 className="font-display text-2xl md:text-3xl mb-8" style={{ color: 'var(--color-bone)', fontWeight: 400 }}>
                  {complet ? t.formTitreAttente : t.formTitre}
                </h2>

                <div className="grid gap-10 lg:gap-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start">
                  <div>
                <div className="grid gap-5 md:grid-cols-2">
                  <Champ label={t.champKiosque} value={kiosque} onChange={setKiosque} placeholder={t.phKiosque} />
                  <Champ label={t.champContact} value={contact} onChange={setContact} placeholder={t.phContact} />
                  <Champ label={t.champCourriel} value={courriel} onChange={setCourriel} type="email" placeholder="nom@exemple.ca" />
                  <Champ label={t.champTelephone} value={telephone} onChange={setTelephone} type="tel" placeholder="514 555 0199" />
                </div>

                <div className="mt-8">
                  <Etiquette>{t.champPersonnes}</Etiquette>
                  <div className="flex items-center gap-3">
                    <button type="button" className="witcher-step" aria-label={t.moins} onClick={() => setPersonnes((n) => Math.max(1, n - 1))}>−</button>
                    <span className="font-display text-3xl tabular-nums w-14 text-center" style={{ color: 'var(--color-bone)' }}>{personnes}</span>
                    <button type="button" className="witcher-step" aria-label={t.plus} onClick={() => setPersonnes((n) => Math.min(12, n + 1))}>+</button>
                    <span className="font-sans text-sm ml-2" style={{ color: 'rgba(var(--sk-parchment-rgb),0.6)' }}>{t.aideePersonnes}</span>
                  </div>
                </div>

                <div className="mt-8">
                  <Etiquette>{t.champJours}</Etiquette>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {JOURS.map((j) => {
                      const actif = jours.includes(j.id);
                      return (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => basculerJour(j.id)}
                          aria-pressed={actif}
                          className="text-left px-4 py-3 rounded-card transition-colors font-sans text-sm"
                          style={{
                            border: `1px solid ${actif ? 'rgba(var(--sk-gilt-rgb),0.75)' : 'rgba(var(--sk-parchment-rgb),0.18)'}`,
                            background: actif ? 'rgba(var(--sk-gilt-rgb),0.10)' : 'transparent',
                            color: actif ? 'var(--color-bone)' : 'rgba(var(--sk-parchment-rgb),0.7)',
                          }}
                        >
                          <span className="block">{lang === 'FR' ? j.labelFR : j.labelEN}</span>
                          <span className="block text-[11px] mt-1" style={{ color: actif ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.45)' }}>
                            {t.deuxRepas}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="font-sans text-xs mt-3" style={{ color: troisJours ? 'var(--sk-gilt)' : 'rgba(var(--sk-parchment-rgb),0.5)' }}>
                    {troisJours ? t.prioriteAcquise : t.prioriteRappel}
                  </p>
                </div>

                <div className="mt-8">
                  <Etiquette>{t.champRestrictions}</Etiquette>
                  <textarea
                    value={restrictions}
                    rows={3}
                    onChange={(e) => setRestrictions(e.target.value)}
                    placeholder={t.phRestrictions}
                    className="witcher-input font-sans resize-y min-h-[86px]"
                  />
                </div>

                <label className="flex items-start gap-3 mt-8 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tientKiosque}
                    onChange={(e) => setTientKiosque(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-[var(--sk-gilt)]"
                  />
                  <span className="font-sans text-sm leading-relaxed" style={{ color: 'rgba(var(--sk-parchment-rgb),0.78)' }}>
                    {t.confirmationKiosque}
                  </span>
                </label>

                  </div>

                {/* ── L'addition, en vis-à-vis des champs ──────────── */}
                <div className="lg:sticky lg:top-28">
                <div
                  className="p-5 md:p-6 rounded-card"
                  style={{ background: 'rgba(var(--sk-ink-rgb),0.45)', border: '1px solid rgba(var(--sk-parchment-rgb),0.14)' }}
                >
                  <Ligne
                    gauche={t.ligneForfait(personnes, jours.length)}
                    droite={argent(facture.sousTotalCents, lang)}
                  />
                  <Ligne gauche={t.tps} droite={argent(facture.tpsCents, lang)} discret />
                  <Ligne gauche={t.tvq} droite={argent(facture.tvqCents, lang)} discret />
                  <div className="flex items-baseline justify-between mt-4 pt-4" style={{ borderTop: '1px solid rgba(var(--sk-gilt-rgb),0.35)' }}>
                    <span className="font-sans uppercase tracking-[0.2em] text-[11px]" style={{ color: 'var(--sk-gilt)' }}>{t.total}</span>
                    <span className="font-display text-3xl tabular-nums" style={{ color: 'var(--color-bone)' }}>{argent(facture.totalCents, lang)}</span>
                  </div>
                  <p className="font-sans text-[11px] mt-4" style={{ color: 'rgba(var(--sk-parchment-rgb),0.42)' }}>
                    {t.mentionTaxes}
                  </p>
                </div>

                {erreur && <Bandeau ton="avis" texte={erreur} />}

                <div className="mt-8 flex flex-col items-start gap-3">
                  <button
                    type="button"
                    className="witcher-prompt"
                    data-primary="true"
                    disabled={!pret || etat === 'envoi'}
                    onClick={envoyer}
                    style={{ opacity: pret && etat !== 'envoi' ? 1 : 0.45 }}
                  >
                    <span className="witcher-prompt-glyph">
                      {etat === 'envoi' ? <Loader2 size={14} className="animate-spin" /> : <span>A</span>}
                    </span>
                    {complet ? t.ctaAttente : t.cta}
                  </button>
                  <p className="font-sans text-xs" style={{ color: 'rgba(var(--sk-parchment-rgb),0.45)' }}>
                    {complet ? t.noteAttente : t.noteCaisse}
                  </p>
                </div>
                </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(var(--sk-ink-rgb),0.85), transparent)' }}
        />
      </section>

      {/* ── Le menu du village, sous le formulaire ───────────────────── */}
      <section className="relative bg-midnight-deep py-20 md:py-28">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <p className="font-sans uppercase tracking-[0.45em] text-[10px] mb-6" style={{ color: 'var(--sk-gilt)' }}>
            {t.menuEyebrow}
          </p>
          <h2 className="font-display title-medieval text-3xl md:text-5xl text-ivory mb-5 max-w-3xl leading-tight">
            {t.menuTitre}
          </h2>
          <p className="font-sans text-base leading-[1.75] max-w-2xl mb-12" style={{ color: 'rgba(var(--sk-parchment-rgb),0.72)', fontWeight: 300 }}>
            {t.menuIntro}
          </p>

          <div className="md:columns-2 lg:columns-3 gap-10">
            {MENU.map((g) => <CategorieMenu key={g.key} categorie={g} lang={lang} />)}
          </div>
        </div>
      </section>
    </>
  );
};

// ── Petites pièces ─────────────────────────────────────────────────

const Etiquette: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="block font-sans uppercase tracking-[0.22em] text-[10px] mb-3" style={{ color: 'var(--sk-gilt)' }}>
    {children}
  </span>
);

const Champ: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <Etiquette>{label}</Etiquette>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="witcher-input font-sans"
    />
  </div>
);

const Ligne: React.FC<{ gauche: string; droite: string; discret?: boolean }> = ({ gauche, droite, discret }) => (
  <div className="flex items-baseline justify-between py-1.5">
    <span className="font-sans text-sm" style={{ color: discret ? 'rgba(var(--sk-parchment-rgb),0.55)' : 'rgba(var(--sk-parchment-rgb),0.85)' }}>{gauche}</span>
    <span className="font-sans text-sm tabular-nums" style={{ color: discret ? 'rgba(var(--sk-parchment-rgb),0.55)' : 'var(--color-bone)' }}>{droite}</span>
  </div>
);

const Bandeau: React.FC<{ ton: 'bon' | 'avis'; texte: string }> = ({ ton, texte }) => (
  <div
    className="flex items-start gap-3 p-4 mb-7 rounded-card"
    style={{
      background: ton === 'bon' ? 'rgba(var(--sk-gilt-rgb),0.10)' : 'rgba(180,90,50,0.12)',
      border: `1px solid ${ton === 'bon' ? 'rgba(var(--sk-gilt-rgb),0.4)' : 'rgba(200,110,60,0.4)'}`,
    }}
  >
    <span className="mt-0.5 shrink-0" style={{ color: ton === 'bon' ? 'var(--sk-gilt)' : '#d98a55' }}>
      {ton === 'bon' ? <Check size={16} /> : <AlertTriangle size={16} />}
    </span>
    <p className="font-sans text-sm leading-relaxed" style={{ color: 'rgba(var(--sk-parchment-rgb),0.85)' }}>{texte}</p>
  </div>
);

const CategorieMenu: React.FC<{ categorie: Categorie; lang: 'FR' | 'EN' }> = ({ categorie: g, lang }) => (
  <article className="break-inside-avoid mb-10">
    <div className="flex items-baseline gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(var(--sk-glow-rgb),0.22)' }}>
      <span aria-hidden style={{ color: 'var(--color-copper)' }}><Glyphe name={g.icon} /></span>
      <h3 className="font-display title-medieval text-xl md:text-2xl text-ivory flex-1 leading-tight">{g.name[lang]}</h3>
    </div>
    <ul className="space-y-3">
      {g.dishes.map((p: Plat) => (
        <li key={p.name} className="flex gap-3">
          <span aria-hidden className="mt-[0.55rem] shrink-0 w-[6px] h-[6px] rotate-45" style={{ border: '1px solid var(--color-copper)' }} />
          <div className="min-w-0">
            <span className="font-display title-medieval text-base text-ivory leading-snug">{p.name}</span>
            {p.note && <p className="font-editorial text-sm text-ivory-soft leading-snug mt-1">{p.note[lang]}</p>}
          </div>
        </li>
      ))}
    </ul>
  </article>
);

// ── Les mots ───────────────────────────────────────────────────────

const FR = {
  seoTitre: 'Repas livrés au kiosque',
  seoDesc: 'Programme pilote : deux repas par jour apportés à votre kiosque pendant le Festival Médiéval de Montpellier.',
  eyebrow: `Programme pilote · ${PLACES_PILOTE} kiosques`,
  titre: 'Manger sans fermer boutique',
  intro: [
    'Tenir un kiosque du matin au soir laisse peu de place pour manger, et la file du village est rarement courte au moment où votre tente se vide enfin. La cuisine vous apporte donc deux repas par jour directement sur place, de sorte que personne n’ait à fermer boutique pour aller chercher son souper.',
    `Le service ouvre à ${PLACES_PILOTE} kiosques pour cette édition. Cinquante dollars avant taxes par personne et par jour, les deux repas compris, et nous conviendrons des heures de livraison avec vous une fois sur le terrain.`,
  ],
  compteur: (n: number) => `${n} place${n > 1 ? 's' : ''} sur ${PLACES_PILOTE}`,
  compteurComplet: `Les ${PLACES_PILOTE} places sont prises`,
  completAvis: `Les ${PLACES_PILOTE} places du pilote sont prises. Votre nom se garde sur la liste, et une place qui se libère revient d’abord aux kiosques inscrits pour les trois jours.`,
  formTitre: 'Votre réservation',
  formTitreAttente: 'Votre place sur la liste',
  champKiosque: 'Nom du kiosque',
  phKiosque: 'Le nom sous lequel vous exposez',
  champContact: 'Personne à joindre',
  phContact: 'Prénom et nom',
  champCourriel: 'Courriel',
  champTelephone: 'Téléphone',
  champPersonnes: 'Combien de personnes à nourrir',
  aideePersonnes: `${REPAS_PAR_JOUR} repas par jour, chacune`,
  moins: 'Une personne de moins',
  plus: 'Une personne de plus',
  champJours: 'Les jours qui vous intéressent',
  deuxRepas: `${REPAS_PAR_JOUR} repas livrés`,
  prioriteAcquise: 'Les trois jours : votre kiosque passe devant.',
  prioriteRappel: 'Les kiosques qui prennent les trois jours passent devant.',
  champRestrictions: 'Allergies et restrictions',
  phRestrictions: 'Une intolérance, un régime, quelqu’un qui ne mange pas de porc : dites-le ici et la cuisine s’ajuste.',
  confirmationKiosque: 'Je confirme tenir un kiosque au festival cette année, puisque le service est réservé aux marchands et aux exploitants qui travaillent sur le site.',
  ligneForfait: (p: number, j: number) =>
    `Repas livrés · ${p} personne${p > 1 ? 's' : ''} × ${j} jour${j > 1 ? 's' : ''} × ${(PRIX_JOUR_CENTS / 100).toFixed(0)} $`,
  tps: 'TPS (5 %)',
  tvq: 'TVQ (9,975 %)',
  total: 'Total',
  mentionTaxes: `Le Salon des Inconnus · 9380-0589 Québec Inc. · TPS ${NO_TPS} · TVQ ${NO_TVQ}`,
  cta: 'Réserver et payer',
  ctaAttente: 'M’inscrire sur la liste',
  noteCaisse: 'Le paiement se fait sur la caisse sécurisée de Stripe, qui vous fait parvenir votre reçu par courriel.',
  noteAttente: 'Rien n’est facturé tant qu’une place ne se libère pas.',
  retourOk: 'Votre paiement est passé. Le reçu s’en vient par courriel, et la cuisine vous écrit avant le festival pour les heures de livraison.',
  retourAnnulee: 'Le paiement a été interrompu et rien n’a été prélevé, donc votre demande vous attend telle quelle.',
  attenteTitre: 'Votre nom est sur la liste',
  attenteCorps: 'La cuisine vous écrit dès qu’une place se libère. Les kiosques inscrits pour les trois jours passent en premier.',
  erreurComplet: 'La dernière place vient de partir pendant que vous remplissiez le formulaire, et votre demande peut encore rejoindre la liste.',
  erreurGenerique: 'La caisse n’a pas répondu, alors réessayez dans un moment.',
  menuEyebrow: 'Le menu du village',
  menuTitre: 'Ce qui peut se retrouver dans vos boîtes',
  menuIntro: 'Chaque boîte se compose à même le menu du village et son contenu reste une surprise jusqu’à ce qu’elle arrive à votre tente. Voici ce que la cuisine sert cette année.',
};

const EN: typeof FR = {
  seoTitre: 'Meals delivered to your booth',
  seoDesc: 'Pilot program: two meals a day brought to your booth during the Festival Médiéval de Montpellier.',
  eyebrow: `Pilot program · ${PLACES_PILOTE} booths`,
  titre: 'Eat without closing up',
  intro: [
    'Running a booth from morning to night leaves little room to eat, and the village line is rarely short by the time your tent finally empties. Our kitchen brings you two meals a day right where you stand, so nobody has to close up to go find supper.',
    `The service opens to ${PLACES_PILOTE} booths this year. Fifty dollars before tax per person per day, both meals included, and we will agree on delivery times with you once we are on the grounds.`,
  ],
  compteur: (n: number) => `${n} of ${PLACES_PILOTE} spots left`,
  compteurComplet: `All ${PLACES_PILOTE} spots are taken`,
  completAvis: `The ${PLACES_PILOTE} pilot spots are taken. Your name stays on the list, and a spot that frees up goes first to booths signed up for all three days.`,
  formTitre: 'Your reservation',
  formTitreAttente: 'Your place on the list',
  champKiosque: 'Booth name',
  phKiosque: 'The name you trade under',
  champContact: 'Who to reach',
  phContact: 'First and last name',
  champCourriel: 'Email',
  champTelephone: 'Phone',
  champPersonnes: 'How many people to feed',
  aideePersonnes: `${REPAS_PAR_JOUR} meals a day, each`,
  moins: 'One person fewer',
  plus: 'One person more',
  champJours: 'The days you want',
  deuxRepas: `${REPAS_PAR_JOUR} meals delivered`,
  prioriteAcquise: 'All three days: your booth goes to the front.',
  prioriteRappel: 'Booths taking all three days go to the front.',
  champRestrictions: 'Allergies and restrictions',
  phRestrictions: 'An intolerance, a diet, someone who does not eat pork: tell us here and the kitchen adjusts.',
  confirmationKiosque: 'I confirm that I hold a booth at the festival this year, since the service is reserved for merchants and operators working on site.',
  ligneForfait: (p: number, j: number) =>
    `Delivered meals · ${p} ${p > 1 ? 'people' : 'person'} × ${j} day${j > 1 ? 's' : ''} × $${(PRIX_JOUR_CENTS / 100).toFixed(0)}`,
  tps: 'GST (5%)',
  tvq: 'QST (9.975%)',
  total: 'Total',
  mentionTaxes: `Le Salon des Inconnus · 9380-0589 Québec Inc. · GST ${NO_TPS} · QST ${NO_TVQ}`,
  cta: 'Reserve and pay',
  ctaAttente: 'Put me on the list',
  noteCaisse: 'Payment runs through Stripe’s secure checkout, which sends your receipt by email.',
  noteAttente: 'Nothing is charged until a spot frees up.',
  retourOk: 'Your payment went through. The receipt is on its way by email, and the kitchen will write to you before the festival about delivery times.',
  retourAnnulee: 'The payment was interrupted and nothing was charged, so your request is waiting exactly as you left it.',
  attenteTitre: 'Your name is on the list',
  attenteCorps: 'The kitchen writes to you as soon as a spot frees up. Booths signed up for all three days come first.',
  erreurComplet: 'The last spot went while you were filling the form, and your request can still join the list.',
  erreurGenerique: 'The checkout did not answer, so try again in a moment.',
  menuEyebrow: 'The village menu',
  menuTitre: 'What can end up in your boxes',
  menuIntro: 'Every box is built from the village menu, and what is inside stays a surprise until it reaches your tent. Here is what the kitchen serves this year.',
};

export default LivraisonKiosquePage;
