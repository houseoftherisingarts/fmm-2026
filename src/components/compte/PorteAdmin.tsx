import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_ACCENT, ROLE_LABELS, allowedSections } from '../../lib/adminPermissions';
import { NAV } from '../../pages/admin/AdminShell';

// ─── La porte de l'admin, sur son propre profil ──────────────────────
// Alex, 2026-08-28 : « lorsque nous sommes sur notre profil, nous avons
// un bouton Admin, le même qu'en bas mais plus gros et plus joli, et il
// porte la couleur de la porte que la personne a le droit d'atteindre ».
// La couleur vient de ROLE_ACCENT, la même que celle du tableau de bord,
// et les raccourcis ne montrent que les sections ouvertes à ce rôle.

const PorteAdmin: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const fr = lang === 'FR';
  const { isAdmin, adminRole } = useAuth();
  if (!isAdmin) return null;

  const teinte = ROLE_ACCENT[adminRole ?? 'super'];
  const ouvertes = allowedSections(adminRole, NAV.map((n) => n.id));
  const raccourcis = NAV.filter((n) => ouvertes.includes(n.id)).slice(0, 8);

  return (
    <section className="rounded-lg-card p-7 md:p-8 relative overflow-hidden"
             style={{
               background: `linear-gradient(135deg, ${teinte.rail}, rgba(var(--sk-deep-rgb),0.55))`,
               border: `1px solid ${teinte.line}`,
               boxShadow: `0 0 44px -22px ${teinte.accent}`,
             }}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <span className="witcher-stat-label inline-flex items-center gap-2" style={{ color: teinte.accent }}>
          <ShieldCheck size={13} /> {fr ? 'Votre porte d’équipe' : 'Your team door'}
        </span>
        {adminRole && (
          <span className="px-3 py-1 rounded-full font-sans uppercase tracking-[0.2em] text-[10px]"
                style={{ color: teinte.accent, border: `1px solid ${teinte.accent}`, background: `${teinte.accentDim}33` }}>
            {ROLE_LABELS[adminRole][lang]}
          </span>
        )}
      </div>

      <Link
        to="/admin"
        className="flex items-center justify-between gap-4 px-6 py-5 rounded-card font-display title-medieval text-2xl md:text-3xl transition-transform hover:scale-[1.01]"
        style={{ background: `linear-gradient(120deg, ${teinte.accent}, ${teinte.accentDim})`, color: '#120608' }}
      >
        {fr ? 'Espace admin' : 'Admin space'}
        <ArrowUpRight size={22} />
      </Link>

      <p className="font-editorial text-sm text-ivory-soft leading-relaxed mt-5 mb-3">
        {fr
          ? 'Voici les portes qui vous sont ouvertes. Une personne de l’équipe en ouvre d’autres depuis la section des rôles.'
          : 'These are the doors open to you. Someone on the team opens others from the roles section.'}
      </p>
      <ul className="flex flex-wrap gap-2">
        {raccourcis.map((n) => {
          const Icone = n.icon;
          return (
            <li key={n.id}>
              <Link to={`/admin?section=${n.id}`}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-card font-sans uppercase tracking-[0.16em] text-[10px] transition-colors hover:brightness-125"
                    style={{ color: teinte.accent, border: `1px solid ${teinte.line}`, background: `${teinte.accentDim}22` }}>
                <Icone size={12} /> {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default PorteAdmin;
