import React from 'react';
import { useUI } from '../contexts/AppContext';
import SEO from '../components/SEO';
import { SITE } from '../content';

const PrivacyPage: React.FC = () => {
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <main className="bg-parchment text-ink pt-32 pb-20 md:pt-40 md:pb-28">
        <article className="max-w-3xl mx-auto px-4 md:px-6">
          <p className="font-editorial italic text-stone uppercase tracking-[0.3em] text-xs mb-3">{t.eyebrow}</p>
          <h1 className="font-display text-4xl md:text-5xl text-ink mb-6">{t.title}</h1>
          <div className="divider-brass w-24 mb-10" />

          <div className="prose font-editorial text-lg text-ink-soft leading-relaxed space-y-6">
            <p>{t.intro}</p>
            <h2 className="font-display text-2xl text-ink mt-10">{t.section1Title}</h2>
            <p>{t.section1Body}</p>
            <h2 className="font-display text-2xl text-ink mt-10">{t.section2Title}</h2>
            <p>{t.section2Body}</p>
            <h2 className="font-display text-2xl text-ink mt-10">{t.section3Title}</h2>
            <p>
              {t.contactBody}{' '}
              <a href={`mailto:${SITE.contact.email}`} className="text-oxblood hover:underline">
                {SITE.contact.email}
              </a>.
            </p>
          </div>
        </article>
      </main>
    </>
  );
};

const FR = {
  eyebrow: 'Légal',
  title: 'Politique de confidentialité',
  intro: 'Le Festival Médiéval de Montpellier (FMM), opéré par Le Salon des Inconnus, respecte la Loi 25 du Québec sur la protection des renseignements personnels. Cette politique décrit quelles données nous recueillons et pourquoi.',
  section1Title: 'Données recueillies',
  section1Body: 'Nous recueillons votre adresse courriel uniquement si vous vous inscrivez à notre infolettre, et des données de navigation anonymisées via Google Analytics et Meta Pixel — seulement après votre consentement explicite.',
  section2Title: 'Vos droits',
  section2Body: 'Vous pouvez en tout temps retirer votre consentement, demander l\'accès à vos données ou leur suppression. Le lien de désabonnement est présent dans chaque infolettre.',
  section3Title: 'Nous joindre',
  contactBody: 'Pour toute question concernant vos données :',
};

const EN = {
  eyebrow: 'Legal',
  title: 'Privacy policy',
  intro: 'Festival Médiéval de Montpellier (FMM), operated by Le Salon des Inconnus, complies with Quebec\'s Law 25 on personal data protection. This policy explains what we collect and why.',
  section1Title: 'Data we collect',
  section1Body: 'We collect your email address only if you sign up for our newsletter, and anonymized navigation data via Google Analytics and Meta Pixel — only after your explicit consent.',
  section2Title: 'Your rights',
  section2Body: 'You may withdraw consent, request access to your data, or request its deletion at any time. An unsubscribe link is included in every newsletter.',
  section3Title: 'Contact us',
  contactBody: 'For any data-related question:',
};

export default PrivacyPage;
