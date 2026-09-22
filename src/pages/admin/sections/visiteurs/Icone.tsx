import React from 'react';
import {
  ArrowUpDown, Ban, Bug, Check, CornerRightUp, FileText, Film, Flame, Gauge, Hourglass, LoaderCircle, Monitor,
  MousePointer2, MoveRight, PersonStanding, Play, Plus, RotateCw, Route, SlidersHorizontal, Smartphone, SquareDashed,
  SquarePen, Tablet, Trash2, TriangleAlert, Wind, X, Zap, type LucideIcon,
} from 'lucide-react';

// Le module VexelHotjar nomme ses icônes à la Font Awesome, que le FMM ne charge pas :
// ces noms se traduisent ici en icônes lucide, taillées sur la police comme les <i> d'origine.
const ICONES: Record<string, LucideIcon> = {
  'fa-gauge-high': Gauge, 'fa-fire': Flame, 'fa-film': Film, 'fa-route': Route, 'fa-triangle-exclamation': TriangleAlert,
  'fa-sliders': SlidersHorizontal, 'fa-check': Check, 'fa-bolt': Zap, 'fa-ban': Ban, 'fa-pen-to-square': SquarePen,
  'fa-bug': Bug, 'fa-plus': Plus, 'fa-xmark': X, 'fa-mobile-screen': Smartphone, 'fa-tablet-screen-button': Tablet,
  'fa-desktop': Monitor, 'fa-arrow-right-long': MoveRight, 'fa-circle-notch': LoaderCircle, 'fa-rotate': RotateCw,
  'fa-person-walking': PersonStanding, 'fa-file-lines': FileText, 'fa-hourglass-half': Hourglass,
  'fa-arrow-turn-up': CornerRightUp, 'fa-arrow-pointer': MousePointer2, 'fa-wind': Wind, 'fa-arrows-up-down': ArrowUpDown,
  'fa-vector-square': SquareDashed, 'fa-trash-can': Trash2, 'fa-play': Play,
};

export const Icone: React.FC<{ nom: string; className?: string; titre?: string }> = ({ nom, className = '', titre }) => {
  const Svg = ICONES[nom];
  if (!Svg) return null;
  return (
    <Svg size="1em" className={`inline-block shrink-0 align-[-0.125em] ${className}`}
      aria-hidden={titre ? undefined : true} aria-label={titre} role={titre ? 'img' : undefined}>
      {titre && <title>{titre}</title>}
    </Svg>
  );
};
