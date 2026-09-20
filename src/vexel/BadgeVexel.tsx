// BadgeVexel — le sticker foil du pied de page, porté de
// xena-horizon-platform (3)/components/BadgeVexel.tsx. Un liseré découpé,
// un reflet holographique qui suit le pointeur, un léger basculement 3D : le
// même geste que les autocollants de collection, posé bien droit.
//
// Ne se rend QUE quand settings/vexel.partenaire.code existe dans le
// Firestore du site (écrit par PartenaireVexelPanneau au moment de
// l'inscription) : tant que le site n'a pas de représentant actif, ce
// composant ne rend rien. Le lien pointe vers la page publique du
// représentant, /r/CODE sur vexelwebstudio.com.
//
// La finition du collant se lit dans settings/vexel.collant (une chaîne, un
// FiniId). Quand le champ manque ou ne nomme aucune finition connue, finiDe
// rend l'irisé, la finition d'origine : les sites déjà en ligne ne changent
// donc jamais d'apparence sans qu'on le leur demande. Le rendu lui-même vit
// dans BadgeVexelRendu, copié tel quel dans vexel-site, pour que l'aperçu du
// studio et le badge des sites montrent exactement la même chose.
import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { finiDe } from './collants';
import { BadgeVexelRendu } from './BadgeVexelRendu';

interface ParametresVexel {
  partenaire?: { code?: string; lien?: string };
  collant?: string;
}

export interface BadgeVexelProps {
  /** L'instance Firestore déjà configurée du site hôte : ce composant ne
   * connaît aucune configuration Firebase, il lit seulement `settings/vexel`. */
  db: Firestore;
  className?: string;
}

export function BadgeVexel({ db, className = '' }: BadgeVexelProps) {
  const [code, setCode] = useState<string | null>(null);
  const [collant, setCollant] = useState<string | undefined>(undefined);

  useEffect(() => {
    return onSnapshot(
      doc(db, 'settings/vexel'),
      (snap) => {
        const parametres = snap.exists() ? (snap.data() as ParametresVexel) : {};
        const p = parametres.partenaire;
        // Seul un code de la forme attendue passe; le lien se reconstruit
        // dans BadgeVexelRendu plutot que d'etre lu de la base, pour
        // qu'aucune adresse etrangere (javascript:, autre site) ne puisse
        // etre servie au visiteur.
        const codeSur = typeof p?.code === 'string' && /^[A-Z0-9-]{4,24}$/.test(p.code) ? p.code : null;
        setCode(codeSur);
        setCollant(typeof parametres.collant === 'string' ? parametres.collant : undefined);
      },
      () => {
        setCode(null);
        setCollant(undefined);
      },
    );
  }, [db]);

  if (!code) return null;

  return <BadgeVexelRendu fini={finiDe(collant)} code={code} nom="Vexel" className={className} />;
}

export default BadgeVexel;
