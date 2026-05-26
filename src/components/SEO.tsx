import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useUI } from '../contexts/AppContext';
import { SITE } from '../content';

interface Props {
  title?: string;
  description?: string;
  image?: string;
}

const DEFAULT_DESC: Record<'FR' | 'EN', string> = {
  FR: 'Festival Médiéval de Montpellier — 25, 26, 27 septembre 2026. Édition Caravanes & Saltimbanques. Marché, banquet, musique, joutes et chevaux au Québec.',
  EN: 'Festival Médiéval de Montpellier — September 25-27, 2026. Caravans & Players Edition. Market, banquet, music, jousts and horses in Quebec.',
};

const SEO: React.FC<Props> = ({ title, description, image }) => {
  const { lang } = useUI();
  const location = useLocation();
  const fullTitle = title ? `${title} · ${SITE.name}` : SITE.name;
  const desc = description || DEFAULT_DESC[lang];
  const url = `https://www.festivalmedievaldemontpellier.org${location.pathname}`;
  const ogImage = image || `https://www.festivalmedievaldemontpellier.org${SITE.logo}`;

  return (
    <Helmet>
      <html lang={lang.toLowerCase()} />
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:locale" content={lang === 'FR' ? 'fr_CA' : 'en_CA'} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
