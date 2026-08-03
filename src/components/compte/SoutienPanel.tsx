import React from 'react';
import { LifeBuoy, Mail, Phone } from 'lucide-react';
import { SITE } from '../../content';

// Le guichet de soutien de l'espace client : courriel et téléphone, à
// portée de main, sans avoir à retourner chercher dans le pied de page.
const SoutienPanel: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const t = fr ? FR : EN;

  return (
    <section
      className="relative p-6 md:p-8 overflow-hidden"
      style={{ background: 'rgba(26, 5, 11, 0.55)', border: '1px solid rgba(244, 239, 227, 0.10)' }}
    >
      <header className="flex items-start gap-4 mb-5">
        <span className="witcher-tile shrink-0" style={{ width: 46, height: 46 }}>
          <span className="witcher-tile-inner" style={{ color: '#D8B05A' }}>
            <LifeBuoy size={16} />
          </span>
        </span>
        <div className="min-w-0">
          <p className="witcher-stat-label mb-1.5">{t.eyebrow}</p>
          <h2
            className="font-display text-2xl md:text-3xl leading-snug"
            style={{ color: 'var(--color-bone)', fontWeight: 400 }}
          >
            {t.title}
          </h2>
        </div>
      </header>

      <p
        className="font-sans text-sm md:text-[15px] leading-[1.7] mb-6"
        style={{ color: 'rgba(244, 239, 227, 0.7)', fontWeight: 300 }}
      >
        {t.lead}
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <ContactRow
          icon={Mail}
          label={t.byMail}
          value={SITE.contact.email}
          href={`mailto:${SITE.contact.email}?subject=${encodeURIComponent(t.mailSubject)}`}
        />
        <ContactRow
          icon={Phone}
          label={t.byPhone}
          value={SITE.contact.phone}
          href={`tel:${SITE.contact.phone.replace(/[^\d+]/g, '')}`}
        />
      </div>
    </section>
  );
};

const ContactRow: React.FC<{
  icon: React.ComponentType<{ size?: number }>;
  label: string; value: string; href: string;
}> = ({ icon: Icon, label, value, href }) => (
  <a
    href={href}
    className="group flex items-center gap-4 p-4 transition-colors"
    style={{ background: 'rgba(10, 2, 7, 0.55)', border: '1px solid rgba(244,239,227,0.10)' }}
  >
    <span className="shrink-0" style={{ color: '#D8B05A' }}><Icon size={16} /></span>
    <span className="min-w-0">
      <span
        className="block font-sans uppercase tracking-[0.28em] text-[10px] mb-1"
        style={{ color: 'rgba(244,239,227,0.45)' }}
      >
        {label}
      </span>
      <span
        className="block font-sans text-sm truncate transition-colors group-hover:text-[#D8B05A]"
        style={{ color: 'var(--color-bone)' }}
      >
        {value}
      </span>
    </span>
  </a>
);

const FR = {
  eyebrow: 'Soutien',
  title:   'Une question, un pépin',
  lead:    'Une équipe de bénévoles répond. Écrivez, ou appelez si c’est pressant. Précisez votre nom et, s’il y a lieu, le numéro de votre billet.',
  byMail:  'Par courriel',
  byPhone: 'Par téléphone',
  mailSubject: 'Espace client FMM',
};

const EN: typeof FR = {
  eyebrow: 'Support',
  title:   'A question, a snag',
  lead:    'A team of volunteers answers. Write, or call if it is urgent. Include your name and, if relevant, your ticket number.',
  byMail:  'By email',
  byPhone: 'By phone',
  mailSubject: 'FMM client space',
};

export default SoutienPanel;
