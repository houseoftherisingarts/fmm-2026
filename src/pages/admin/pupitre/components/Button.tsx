import React from 'react';

// Les trois boutons du Pupitre, repeints sur le canon de la régie.
// Le primaire est la plaque de laiton battu de `.admin-cta`, le
// secondaire la plaque creuse de `.admin-ghost`. Le laiton plein reste
// rare : sur les planches, c'est ce qui lui donne son poids.
//
// Quarante-quatre pixels de haut au minimum. Le Pupitre sert debout
// pendant le festival, souvent d'une seule main, et une cible plus
// courte se rate.

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  icon,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2.5 min-h-[44px] px-5 rounded-[10px] ' +
    'font-sans uppercase tracking-[0.2em] text-[11px] font-semibold ' +
    'cursor-pointer disabled:cursor-not-allowed';

  const admin =
    variant === 'primary' ? 'admin-cta' : variant === 'secondary' ? 'admin-ghost' : '';

  const ghost =
    variant === 'ghost'
      ? 'text-[var(--admin-text-soft)] hover:text-[var(--admin-brass-hi)] ' +
        'hover:bg-[rgba(196,214,230,0.05)] transition-colors duration-200 disabled:opacity-45'
      : '';

  return (
    <button className={`${base} ${admin} ${ghost} ${className}`} {...props}>
      {icon && <span className="shrink-0 inline-flex items-center">{icon}</span>}
      {children}
    </button>
  );
};
