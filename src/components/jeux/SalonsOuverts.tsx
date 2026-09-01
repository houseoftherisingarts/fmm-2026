// ─── Les tables ouvertes, tous jeux confondus ───────────────────────
// Alex, 2026-09-01 : la console des années dit quels jeux existent,
// elle ne disait pas qui est en train d'attendre. Ce bloc montre les
// chambres ouvertes en direct, avec le jeu, l'hôte et le siège libre.
// Un clic assoit le joueur et ouvre la partie.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorOpen, Swords } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { addLocale } from '../../lib/locale';
import {
  rejoindreSalon, suivreSalonsOuverts, SALON_JEUX, type SalonOuvert,
} from '../../firebase/salons';

const SalonsOuverts: React.FC = () => {
  const { lang } = useUI();
  const fr = lang === 'FR';
  const { user, openSignIn } = useAuth();
  const navigate = useNavigate();
  const [salons, setSalons] = useState<SalonOuvert[]>([]);
  const [entree, setEntree] = useState<string | null>(null);

  useEffect(() => suivreSalonsOuverts(null, setSalons), []);

  const ouvertes = salons.filter((s) => s.hoteUid !== user?.uid);
  if (ouvertes.length === 0) return null;

  const asseoir = async (s: SalonOuvert) => {
    if (!user) { openSignIn(); return; }
    setEntree(s.id);
    try {
      const nom = user.displayName?.trim() || (fr ? 'Un inconnu' : 'A stranger');
      const r = await rejoindreSalon(s, user.uid, nom);
      if (r === 'ok' || r === 'moi') {
        navigate(`${addLocale(SALON_JEUX[s.jeu].cheminFR, lang)}?partie=${s.id}`);
      }
    } finally {
      setEntree(null);
    }
  };

  return (
    <section className="mt-8 rounded-lg-card border border-brass/25 overflow-hidden"
             style={{ background: 'rgba(10, 4, 6, 0.55)' }}>
      <header className="flex items-center gap-2 px-5 md:px-7 py-3.5 border-b border-brass/20 bg-black/30">
        <DoorOpen size={13} className="text-brass shrink-0" />
        <span className="font-display title-medieval uppercase tracking-[0.28em] text-[11px]"
              style={{ color: 'var(--color-amber-glow)' }}>
          {fr ? 'Les tables ouvertes' : 'The open tables'}
        </span>
        <span className="ml-auto font-sans text-[11px] tracking-[0.12em] text-ivory-soft/50">
          {ouvertes.length}
        </span>
      </header>
      <ul className="divide-y divide-brass/10">
        {ouvertes.slice(0, 12).map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 px-5 md:px-7 py-3">
            <span className="min-w-0">
              <span className="block font-display text-sm text-ivory truncate">
                {s.hoteNom || (fr ? 'Un inconnu' : 'A stranger')}
              </span>
              <span className="block font-sans text-[10px] uppercase tracking-[0.18em] text-ivory-soft/55 mt-0.5">
                {fr ? SALON_JEUX[s.jeu].nomFR : SALON_JEUX[s.jeu].nomEN}
                {s.places > 2 ? ` · ${s.assis}/${s.places}` : ''}
              </span>
            </span>
            <button
              type="button"
              disabled={entree === s.id}
              onClick={() => { void asseoir(s); }}
              className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-card border border-brass/40 text-brass hover:bg-brass hover:text-[var(--sk-brown-dark)] transition-colors font-sans text-[10px] uppercase tracking-[0.18em] disabled:opacity-50"
            >
              <Swords size={12} />
              {entree === s.id
                ? (fr ? 'Un instant' : 'One moment')
                : (fr ? 'Prendre le siège' : 'Take the seat')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SalonsOuverts;
