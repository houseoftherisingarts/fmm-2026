import React from 'react';

// Drifting fog overlay — used between sections to ease the transition
// from one photo band to the next. Pure decoration; aria-hidden.
// `tone` flips blend mode: dark sections use `screen`, light sections
// use `multiply`.
const Brume: React.FC<{ tone?: 'dark' | 'light'; className?: string }> = ({ tone = 'dark', className = '' }) => (
  <div
    aria-hidden
    className={`brume ${tone === 'light' ? 'brume-light' : ''} ${className}`}
  />
);

export default Brume;
