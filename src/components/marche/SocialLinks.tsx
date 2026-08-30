import React from 'react';
import { Facebook, Globe, Instagram } from 'lucide-react';
import type { MarcheKiosk } from '../../content/marche';

// Pastilles sociales d'un kiosque : site, Facebook, Instagram. On ne
// répète pas le lien déjà porté par le CTA principal (`href`).
const SocialLinks: React.FC<{ kiosk: MarcheKiosk }> = ({ kiosk }) => {
  const items = [
    { href: kiosk.website,   label: 'Site web',  Icon: Globe },
    { href: kiosk.facebook,  label: 'Facebook',  Icon: Facebook },
    { href: kiosk.instagram, label: 'Instagram', Icon: Instagram },
  ].filter((i): i is { href: string; label: string; Icon: typeof Globe } => !!i.href && i.href !== kiosk.href);
  if (!items.length) return null;
  return (
    <span className="inline-flex items-center gap-2">
      {items.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${kiosk.name} · ${label}`}
          title={label}
          className="inline-flex items-center justify-center w-9 h-9 rounded-full transition hover:scale-110"
          style={{
            color: 'var(--color-amber-glow)',
            boxShadow: 'inset 0 0 0 1px rgba(232,177,74,0.35)',
            background: 'rgba(232,177,74,0.06)',
          }}
        >
          <Icon size={15} strokeWidth={1.6} />
        </a>
      ))}
    </span>
  );
};

export default SocialLinks;
