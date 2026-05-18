import React from 'react';

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
  const baseStyles = "flex items-center justify-center gap-2 px-6 py-3 rounded-xl3 transition-all duration-300 font-sans font-medium tracking-wide disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm";
  
  const variants = {
    primary: "bg-gold-gradient hover:bg-gold-gradient-hover text-black shadow-[0_0_15px_rgba(191,149,63,0.3)] hover:shadow-[0_0_25px_rgba(191,149,63,0.5)] border border-gold-400/20",
    secondary: "bg-dark-700/50 backdrop-blur-md text-gold-500 border border-gold-500/30 hover:bg-gold-900/20 hover:border-gold-400/60 hover:text-gold-200",
    ghost: "text-neutral-400 hover:text-gold-400 hover:bg-white/5"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {children}
    </button>
  );
};