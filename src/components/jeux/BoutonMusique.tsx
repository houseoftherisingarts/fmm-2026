import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Music, VolumeX, Check } from 'lucide-react';
import { annoncerLecture, ecouterExclusivite } from '../../lib/audioExclusif';
import { AMBIANCES, ambianceParId } from '../../lib/ambiances';
import { useAuth } from '../../contexts/AuthContext';
import { suivreMaBourse } from '../../firebase/montpellois';

// ─── La musique d'un jeu ────────────────────────────────────────────
// Une seule piste tourne à la fois sur le site : le registre
// d'exclusivité coupe les autres dès qu'un jeu prend la parole.
//
// Alex, 2026-08-31 : la pastille n'est plus un simple interrupteur.
// Un clic ouvre un petit menu qui liste les ambiances de
// src/lib/ambiances.ts que la personne possède (les gratuites pour
// tout le monde, plus celles que sa bourse confirme achetées), avec
// « Couper » en tête. Changer de piste ne quitte jamais la partie, et
// le choix se retient par jeu dans localStorage.

export interface BoutonMusiqueHandle {
  /** Lance la piste choisie si elle ne joue pas déjà. Appelé au premier
   *  vrai geste de la personne, donc le navigateur autorise le son. */
  demarrer(): void;
}

/** La clé de mémoire du choix, un jeu à la fois. */
const cleMemoire = (jeu: string) => `fmm.musique.${jeu}`;

function lireChoix(jeu: string, defaut: string): string | null {
  try {
    const v = localStorage.getItem(cleMemoire(jeu));
    if (v === null) return defaut;
    // Chaîne vide = la personne a coupé la musique pour ce jeu.
    return v === '' ? null : v;
  } catch { return defaut; }
}

function ecrireChoix(jeu: string, id: string | null): void {
  try { localStorage.setItem(cleMemoire(jeu), id ?? ''); } catch { /* navigation privée */ }
}

const BoutonMusique = forwardRef<BoutonMusiqueHandle, {
  /** L'identifiant du jeu : sert au registre d'exclusivité et à la mémoire. */
  cle: string;
  /** L'ambiance jouée par défaut dans ce jeu. */
  defaut: string;
  onLabel: string;
  offLabel: string;
  lang?: 'FR' | 'EN';
  className?: string;
}>(({ cle, defaut, onLabel, offLabel, lang = 'FR', className = '' }, ref) => {
  const fr = lang === 'FR';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const boiteRef = useRef<HTMLDivElement | null>(null);
  const [joue, setJoue] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  /** Le menu tombe vers la gauche par défaut. Collé au bord gauche de
   *  l'écran (la barre du jeu s'empile sur téléphone), il sortirait du
   *  cadre : il bascule alors vers la droite. */
  const [versLaDroite, setVersLaDroite] = useState(false);
  const [choix, setChoix] = useState<string | null>(() => lireChoix(cle, defaut));

  // Les ambiances achetées, quand quelqu'un est connecté.
  const { user } = useAuth();
  const [achetees, setAchetees] = useState<string[]>([]);
  useEffect(() => {
    if (!user?.uid) { setAchetees([]); return; }
    return suivreMaBourse(user.uid, (b) => setAchetees(b.ambiances || []));
  }, [user?.uid]);

  // Les gratuites pour tout le monde, les achetées en plus, et la piste
  // d'origine du jeu quoi qu'il arrive : elle est déjà sa musique depuis
  // le premier jour, la fermer ici serait une perte, pas un réglage.
  const pistes = useMemo(
    () => AMBIANCES.filter((a) => a.gratuite || achetees.includes(a.id) || a.id === defaut),
    [achetees, defaut],
  );

  const courante = ambianceParId(choix ?? undefined);

  useEffect(() => ecouterExclusivite(cle, () => {
    audioRef.current?.pause();
    setJoue(false);
  }), [cle]);

  // Un clic ailleurs referme le menu.
  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent) => {
      if (!boiteRef.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [ouvert]);

  const lancer = () => {
    const a = audioRef.current;
    if (!a || !courante) return;
    annoncerLecture(cle);
    a.volume = 0.28;
    a.play().then(() => setJoue(true)).catch(() => setJoue(false));
  };

  useImperativeHandle(ref, () => ({
    demarrer: () => { if (!joue) lancer(); },
    // `lancer` ne dépend que de refs et de `courante`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [joue, courante]);

  /** Choisir une piste la met en route tout de suite; « Couper » arrête
   *  tout. Dans les deux cas le choix se retient pour ce jeu. */
  const choisir = (id: string | null) => {
    setOuvert(false);
    ecrireChoix(cle, id);
    setChoix(id);
    const a = audioRef.current;
    if (!a) return;
    if (id === null) { a.pause(); setJoue(false); return; }
    const piste = ambianceParId(id);
    if (!piste) return;
    a.src = piste.fichier;
    annoncerLecture(cle);
    a.volume = 0.28;
    a.play().then(() => setJoue(true)).catch(() => setJoue(false));
  };

  const etiquette = joue && courante ? (fr ? courante.titreFR : courante.titreEN) : offLabel;

  return (
    <div ref={boiteRef} className={`relative shrink-0 ${className}`}>
      <audio ref={audioRef} src={courante?.fichier} loop preload="none" />
      <button
        type="button"
        onClick={() => {
          const r = boiteRef.current?.getBoundingClientRect();
          setVersLaDroite(!!r && r.right < 252);
          setOuvert((v) => !v);
        }}
        title={courante?.credit || offLabel}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[40px] rounded-[15px] border border-white/15 bg-black/45 backdrop-blur-md transition-colors duration-200 font-sans text-[10px] uppercase tracking-[0.18em] ${
          joue ? 'text-ivory border-brass/50' : 'text-ivory-soft hover:text-ivory hover:border-brass/50'
        }`}
      >
        {joue ? <Music size={12} className="text-brass" /> : <Music size={12} />}
        <span className="hidden sm:inline max-w-[9rem] truncate">{etiquette}</span>
      </button>

      {ouvert && (
        <div
          role="menu"
          className={`absolute ${versLaDroite ? 'left-0' : 'right-0'} top-full mt-2 z-50 w-[15rem] max-w-[calc(100vw-1.5rem)] rounded-[15px] border border-white/15 bg-black/80 backdrop-blur-xl p-1.5`}
          style={{ boxShadow: '0 18px 44px rgba(0,0,0,0.65)' }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choisir(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-[11px] text-left font-sans text-[11px] uppercase tracking-[0.14em] transition-colors ${
              choix === null ? 'text-brass bg-brass/10' : 'text-ivory-soft hover:text-ivory hover:bg-white/10'
            }`}
          >
            <VolumeX size={13} />
            <span className="flex-1">{onLabel}</span>
            {choix === null && <Check size={13} />}
          </button>
          <div className="my-1 h-px bg-white/10" />
          {pistes.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              onClick={() => choisir(a.id)}
              title={a.credit}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-[11px] text-left font-sans text-[11px] transition-colors ${
                choix === a.id ? 'text-brass bg-brass/10' : 'text-ivory-soft hover:text-ivory hover:bg-white/10'
              }`}
            >
              <Music size={13} className="shrink-0" />
              <span className="flex-1 truncate">{fr ? a.titreFR : a.titreEN}</span>
              {choix === a.id && <Check size={13} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

BoutonMusique.displayName = 'BoutonMusique';
export default BoutonMusique;
