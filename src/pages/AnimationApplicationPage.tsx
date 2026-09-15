import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useUI } from '../contexts/AppContext';
import { addLocale } from '../lib/locale';
import { useCaravanPage } from '../lib/useCaravanPage';
import SEO from '../components/SEO';
import AnimationForm from '../components/animation/AnimationForm';

// Sans porte de connexion, contrairement à la candidature musicale :
// une troupe ou un artisan qui écrit au festival pour la première fois
// n'a pas de compte, et lui en demander un fermerait la porte avant la
// première phrase (Alex, 2026-09-15). Le formulaire pré-remplit ce
// qu'il peut si la personne est déjà connectée, et rien de plus.
const AnimationApplicationPage: React.FC = () => {
  useCaravanPage();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;

  return (
    <>
      <SEO title={t.title} description={t.intro} />
      <section className="relative pt-28 pb-24 md:pt-32 md:pb-32 overflow-hidden text-ivory">
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
          <Link
            to={addLocale('/activites', lang)}
            className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest text-ivory-soft hover:text-brass mb-10 transition"
          >
            <ArrowLeft size={14} /> {t.back}
          </Link>

          <p className="font-editorial italic text-brass uppercase tracking-[0.4em] text-xs md:text-sm mb-3 text-center">
            <Sparkles size={12} className="inline mr-1.5 -mt-0.5" />{t.eyebrow}
          </p>

          <h1 className="font-display title-medieval text-5xl md:text-7xl text-ivory mb-5 text-center leading-[1.05]">
            {t.title}
          </h1>

          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="h-px bg-gradient-to-r from-transparent via-brass to-transparent w-32 mx-auto mb-6 origin-center"
          />

          <p className="font-editorial italic text-base md:text-lg text-ivory-soft max-w-2xl mx-auto text-center mb-12">
            {t.intro}
          </p>

          <AnimationForm />
        </div>
      </section>
    </>
  );
};

const FR = {
  back:    'Retour aux activités',
  eyebrow: 'Candidature d’animation',
  title:   'J’aimerais animer',
  intro:   'Troupe, conteur, artisan ou saltimbanque : remplissez ce formulaire pour proposer votre présence au FMM. Tristan lira chaque candidature et vous reviendra par courriel.',
};

const EN: typeof FR = {
  back:    'Back to activities',
  eyebrow: 'Performer application',
  title:   'I’d like to perform',
  intro:   'Troupe, storyteller, craftsperson or performer: fill in this form to propose your presence at FMM. Tristan will read every application and follow up by email.',
};

export default AnimationApplicationPage;
