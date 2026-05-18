import React, { useState } from 'react';
import {
  FileText, BookOpen, ChevronDown, ChevronRight, Phone, Mail,
  Sparkles, ListChecks,
} from 'lucide-react';
import { BENEVOLE_ROLES, KEY_CONTACTS } from '../../content/benevoleRoles';

// Documents shelf in the bénévole space. Surfaces the four core
// references the team needs day-of:
//   1. Programmation (festival schedule)
//   2. Carte du site (event map)
//   3. Aide-mémoire des contacts (admin directory)
//   4. Rôles & description de tâches (per-role onboarding)
//
// The first two are placeholders that link to PDFs / image assets
// when uploaded to /public; the third and fourth are inlined so the
// team can read them on phone without a download.

interface Props {
  lang?: 'FR' | 'EN';
}

const DocumentsShelf: React.FC<Props> = ({ lang = 'FR' }) => {
  const [openSection, setOpen] = useState<'roles' | 'contacts' | null>(null);
  const t = lang === 'FR' ? FR : EN;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen size={14} className="text-brass" />
        <p className="font-display title-medieval text-[11px] text-brass uppercase tracking-widest">
          {t.title}
        </p>
      </div>

      {/* Programmation */}
      <DocLink
        href="/docs/fmm-2026-programmation.pdf"
        icon="📜"
        title={t.programTitle}
        sub={t.programSub}
        download
      />

      {/* Carte du site */}
      <DocLink
        href="/docs/fmm-2026-carte-du-site.pdf"
        icon="🗺️"
        title={t.mapTitle}
        sub={t.mapSub}
        download
      />

      {/* Contacts — expandable */}
      <ExpandableDoc
        icon="📇"
        title={t.contactsTitle}
        sub={t.contactsSub}
        open={openSection === 'contacts'}
        onToggle={() => setOpen(openSection === 'contacts' ? null : 'contacts')}
      >
        <ul className="divide-y divide-ivory-soft/10">
          {KEY_CONTACTS.map((c) => (
            <li key={c.name} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-display title-medieval text-sm text-ivory truncate">{c.name}</p>
                <p className="font-editorial italic text-[11px] text-ivory-soft/70">{c.role}</p>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                {c.phone && (
                  <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
                    className={`inline-flex items-center gap-1 font-sans text-xs hover:underline ${
                      c.tone === 'blush' ? 'text-blush' : 'text-brass'
                    }`}>
                    <Phone size={10} /> {c.phone}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`}
                    className="block font-sans text-[11px] text-ivory-soft hover:text-brass transition truncate max-w-[14rem]">
                    <Mail size={10} className="inline mr-1" />{c.email}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </ExpandableDoc>

      {/* Rôles & description de tâches — expandable */}
      <ExpandableDoc
        icon="⚔️"
        title={t.rolesTitle}
        sub={t.rolesSub}
        open={openSection === 'roles'}
        onToggle={() => setOpen(openSection === 'roles' ? null : 'roles')}
      >
        <div className="space-y-4">
          {BENEVOLE_ROLES.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      </ExpandableDoc>
    </section>
  );
};

// ── Sub-components ──
const DocLink: React.FC<{
  href: string; icon: string; title: string; sub: string; download?: boolean;
}> = ({ href, icon, title, sub, download }) => (
  <a href={href}
    target="_blank" rel="noopener noreferrer"
    {...(download ? { download: true } : {})}
    className="group flex items-center gap-3 px-4 py-3.5 rounded-card border hover:border-brass/40 hover:bg-brass/[0.04] transition"
  >
    <span className="text-2xl shrink-0">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="font-display title-medieval text-sm text-ivory truncate group-hover:text-brass transition">{title}</p>
      <p className="font-editorial italic text-xs text-ivory-soft/60 truncate">{sub}</p>
    </div>
    <FileText size={13} className="text-ivory-soft/40 group-hover:text-brass transition shrink-0" />
  </a>
);

const ExpandableDoc: React.FC<{
  icon: string; title: string; sub: string;
  open: boolean; onToggle: () => void;
  children: React.ReactNode;
}> = ({ icon, title, sub, open, onToggle, children }) => (
  <div className={`rounded-card border ${open ? 'border-brass/40 bg-brass/[0.04]' : 'border-ivory-soft/15 bg-midnight'} transition overflow-hidden`}>
    <button onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-ivory-soft/[0.03] transition">
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-display title-medieval text-sm text-ivory truncate">{title}</p>
        <p className="font-editorial italic text-xs text-ivory-soft/60 truncate">{sub}</p>
      </div>
      {open ? <ChevronDown size={14} className="text-brass shrink-0" /> : <ChevronRight size={14} className="text-ivory-soft/50 shrink-0" />}
    </button>
    {open && (
      <div className="px-4 pb-4 pt-1">
        {children}
      </div>
    )}
  </div>
);

const RoleCard: React.FC<{ role: typeof BENEVOLE_ROLES[number] }> = ({ role }) => (
  <article className="rounded-card border /40 p-4 md:p-5">
    <header className="flex items-center gap-3 mb-3">
      <span className="text-2xl">{role.icon}</span>
      <h3 className="font-display title-medieval text-base text-ivory">{role.title}</h3>
    </header>

    <p className="font-editorial text-sm text-ivory-soft leading-relaxed mb-4 whitespace-pre-line">
      {role.description}
    </p>

    <SubBlock icon={ListChecks} label="Tâches">
      <ul className="space-y-1">
        {role.taches.map((t) => (
          <li key={t} className="flex items-start gap-2">
            <span className="text-brass mt-0.5 shrink-0">•</span>
            <span className="font-sans text-xs text-ivory-soft leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </SubBlock>

    <SubBlock icon={Sparkles} label="Compétences / qualités">
      <ul className="space-y-1">
        {role.competences.map((c) => (
          <li key={c} className="flex items-start gap-2">
            <span className="text-brass mt-0.5 shrink-0">•</span>
            <span className="font-sans text-xs text-ivory-soft leading-relaxed">{c}</span>
          </li>
        ))}
      </ul>
    </SubBlock>

    <div className="grid sm:grid-cols-2 gap-2 pt-2 mt-2 font-sans text-[11px] text-ivory-soft/80">
      <div>
        <p className="font-display title-medieval text-[9px] text-brass uppercase tracking-widest mb-0.5">Langues</p>
        <p className="leading-relaxed">{role.langues}</p>
      </div>
      <div>
        <p className="font-display title-medieval text-[9px] text-brass uppercase tracking-widest mb-0.5">Horaire</p>
        <p className="leading-relaxed">{role.horaire}</p>
      </div>
    </div>
  </article>
);

const SubBlock: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  children: React.ReactNode;
}> = ({ icon: Icon, label, children }) => (
  <div className="mb-3 last:mb-0">
    <p className="font-display title-medieval text-[9px] text-brass uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
      <Icon size={9} /> {label}
    </p>
    {children}
  </div>
);

const FR = {
  title:          'Documents importants',
  programTitle:   'La programmation',
  programSub:     'Horaire des spectacles, banquets, ateliers — fin de semaine complète',
  mapTitle:       'La carte du site',
  mapSub:         'Plan des stations, scènes, camping et stationnement',
  contactsTitle:  'Aide-mémoire — contacts',
  contactsSub:    "Numéros et courriels des organisateur·ices et de l'urgence",
  rolesTitle:     'Rôles & description de tâches',
  rolesSub:       '6 postes bénévoles · tâches, compétences, horaire',
};
const EN: typeof FR = {
  title:          'Important documents',
  programTitle:   'Festival schedule',
  programSub:     'Shows, banquets, workshops — full weekend',
  mapTitle:       'Site map',
  mapSub:         'Stations, stages, camping and parking layout',
  contactsTitle:  'Cheat sheet — contacts',
  contactsSub:    'Phones and emails of organizers + emergency',
  rolesTitle:     'Roles & task descriptions',
  rolesSub:       '6 volunteer roles · tasks, skills, schedule',
};

export default DocumentsShelf;
