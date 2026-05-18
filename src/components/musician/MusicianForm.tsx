import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2, Music, Radio, Zap, Truck, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/AppContext';
import { CURRENT_YEAR } from '../../firebase/applications';
import {
  getMusicianApp, upsertMusicianApp,
  type MusicianApp, type Genre, type StagePref, type SetLength,
  type PowerNeed, type SoundProvided, type PerformerCount, type DayAvailability,
  type LightingNeed,
} from '../../firebase/musicians';
import { mockUpsertMusicianApp } from '../../firebase/mockMusicians';

// DEV-only bypass — same flag used by AdminPage. Lets the form write
// to the in-memory mock store offline.
const DEV_BYPASS = import.meta.env.VITE_ADMIN_DEV_BYPASS === 'true' && import.meta.env.DEV;

const GENRES_FR: Record<Genre, string> = {
  folk: 'Folk', medieval: 'Médiévale', celtic: 'Celtique', baroque: 'Baroque',
  'nordic-viking': 'Nordique / Viking', balfolk: 'Balfolk', ballad: 'Ballade',
  oriental: 'Orientale', 'pagan-trance': 'Transe païenne', other: 'Autre',
};
const GENRES_EN: Record<Genre, string> = {
  folk: 'Folk', medieval: 'Medieval', celtic: 'Celtic', baroque: 'Baroque',
  'nordic-viking': 'Nordic / Viking', balfolk: 'Balfolk', ballad: 'Ballad',
  oriental: 'Oriental', 'pagan-trance': 'Pagan trance', other: 'Other',
};

const ALL_GENRES: Genre[] = Object.keys(GENRES_FR) as Genre[];

interface Props {
  onSubmitted?: () => void;
}

const MusicianForm: React.FC<Props> = ({ onSubmitted }) => {
  const { user } = useAuth();
  const { lang } = useUI();
  const t = lang === 'FR' ? FR : EN;
  const genreLabels = lang === 'FR' ? GENRES_FR : GENRES_EN;

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Form state ──────────────────────────────────────────────────
  const [bandName, setBandName]               = useState('');
  const [contactName, setContactName]         = useState('');
  const [contactRole, setContactRole]         = useState('');
  const [phone, setPhone]                     = useState('');
  const [altEmail, setAltEmail]               = useState('');
  const [website, setWebsite]                 = useState('');
  const [spotify, setSpotify]                 = useState('');
  const [socials, setSocials]                 = useState('');

  const [shortBio, setShortBio]               = useState('');
  const [genres, setGenres]                   = useState<Genre[]>([]);
  const [genresOther, setGenresOther]         = useState('');
  const [performerCount, setPerformerCount]   = useState<PerformerCount>('duo');
  const [performerNames, setPerformerNames]   = useState('');

  const [daysAvailable, setDays]              = useState<DayAvailability[]>([]);
  const [preferredStage, setStage]            = useState<StagePref>('main');
  const [setLength, setSetLength]             = useState<SetLength>('45-60');
  const [numberOfSets, setNumberOfSets]       = useState(2);
  const [willingToRove, setWillingToRove]     = useState(false);
  const [willingToCollab, setWillingToCollab] = useState(false);
  const [fireSafeRepertoire, setFireSafe]     = useState(false);

  const [soundProvided, setSound]             = useState<SoundProvided>('need-fmm-pa');
  const [inputList, setInputList]             = useState('');
  const [monitorsNeeded, setMonitors]         = useState(0);
  const [ownsBackline, setOwnsBackline]       = useState(false);
  const [backlineNotes, setBacklineNotes]     = useState('');
  const [powerNeed, setPowerNeed]             = useState<PowerNeed>('one-circuit');
  const [powerNotes, setPowerNotes]           = useState('');
  const [lightingNeed, setLighting]           = useState<LightingNeed>('basic-stage-light');
  const [weatherDependent, setWeatherDep]     = useState(false);

  const [travelingFrom, setTravelingFrom]     = useState('');
  const [needsLodging, setNeedsLodging]       = useState(false);
  const [needsMeals, setNeedsMeals]           = useState(false);
  const [vehicleCount, setVehicleCount]       = useState(0);
  const [loadInWindow, setLoadInWindow]       = useState('');
  const [accessibilityNeeds, setA11y]         = useState('');

  const [feeExpectation, setFee]              = useState('');
  const [hasContract, setHasContract]         = useState(false);
  const [contractNotes, setContractNotes]     = useState('');
  const [invoiceEntity, setInvoiceEntity]     = useState('');

  const [whyFMM, setWhyFMM]                   = useState('');
  const [specialRequests, setSpecial]         = useState('');

  // Pre-fill from any existing application for this user/year so a
  // returning band sees their last answers.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const prev = await getMusicianApp(user.uid, CURRENT_YEAR);
        if (cancelled || !prev) return;
        setBandName(prev.bandName ?? '');
        setContactName(prev.contactName ?? '');
        setContactRole(prev.contactRole ?? '');
        setPhone(prev.phone ?? '');
        setAltEmail(prev.altEmail ?? '');
        setWebsite(prev.website ?? '');
        setSpotify(prev.spotify ?? '');
        setSocials(prev.socials ?? '');
        setShortBio(prev.shortBio ?? '');
        setGenres(prev.genres ?? []);
        setGenresOther(prev.genresOther ?? '');
        setPerformerCount(prev.performerCount ?? 'duo');
        setPerformerNames(prev.performerNames ?? '');
        setDays(prev.daysAvailable ?? []);
        setStage(prev.preferredStage ?? 'main');
        setSetLength(prev.setLength ?? '45-60');
        setNumberOfSets(prev.numberOfSets ?? 2);
        setWillingToRove(!!prev.willingToRove);
        setWillingToCollab(!!prev.willingToCollab);
        setFireSafe(!!prev.fireSafeRepertoire);
        setSound(prev.soundProvided ?? 'need-fmm-pa');
        setInputList(prev.inputList ?? '');
        setMonitors(prev.monitorsNeeded ?? 0);
        setOwnsBackline(!!prev.ownsBackline);
        setBacklineNotes(prev.backlineNotes ?? '');
        setPowerNeed(prev.powerNeed ?? 'one-circuit');
        setPowerNotes(prev.powerNotes ?? '');
        setLighting(prev.lightingNeed ?? 'basic-stage-light');
        setWeatherDep(!!prev.weatherDependent);
        setTravelingFrom(prev.travelingFrom ?? '');
        setNeedsLodging(!!prev.needsLodging);
        setNeedsMeals(!!prev.needsMeals);
        setVehicleCount(prev.vehicleCount ?? 0);
        setLoadInWindow(prev.loadInWindow ?? '');
        setA11y(prev.accessibilityNeeds ?? '');
        setFee(prev.feeExpectation ?? '');
        setHasContract(!!prev.hasContract);
        setContractNotes(prev.contractNotes ?? '');
        setInvoiceEntity(prev.invoiceEntity ?? '');
        setWhyFMM(prev.whyFMM ?? '');
        setSpecial(prev.specialRequests ?? '');
      } catch (e) {
        console.warn('[musicianForm] prefetch failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const toggleGenre = (g: Genre) => {
    setGenres((cur) => cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]);
  };
  const toggleDay = (d: DayAvailability) => {
    setDays((cur) => cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!bandName.trim() || !contactName.trim() || !phone.trim() || !shortBio.trim()) {
      setError(t.errRequired);
      return;
    }
    setError(null);
    setSubmitting(true);
    const app: MusicianApp = {
      uid: user.uid,
      email: user.email || '',
      year: CURRENT_YEAR,
      status: 'pending',
      bandName: bandName.trim(),
      contactName: contactName.trim(),
      contactRole: contactRole.trim() || undefined,
      phone: phone.trim(),
      altEmail: altEmail.trim() || undefined,
      website: website.trim() || undefined,
      spotify: spotify.trim() || undefined,
      socials: socials.trim() || undefined,
      shortBio: shortBio.trim(),
      genres,
      genresOther: genres.includes('other') ? (genresOther.trim() || undefined) : undefined,
      performerCount,
      performerNames: performerNames.trim() || undefined,
      daysAvailable,
      preferredStage,
      setLength,
      numberOfSets,
      willingToRove,
      willingToCollab,
      fireSafeRepertoire,
      soundProvided,
      inputList: inputList.trim() || undefined,
      monitorsNeeded: monitorsNeeded || undefined,
      ownsBackline,
      backlineNotes: backlineNotes.trim() || undefined,
      powerNeed,
      powerNotes: powerNotes.trim() || undefined,
      lightingNeed,
      weatherDependent,
      travelingFrom: travelingFrom.trim(),
      needsLodging,
      needsMeals,
      vehicleCount: vehicleCount || undefined,
      loadInWindow: loadInWindow.trim() || undefined,
      accessibilityNeeds: accessibilityNeeds.trim() || undefined,
      feeExpectation: feeExpectation.trim() || undefined,
      hasContract,
      contractNotes: contractNotes.trim() || undefined,
      invoiceEntity: invoiceEntity.trim() || undefined,
      whyFMM: whyFMM.trim() || undefined,
      specialRequests: specialRequests.trim() || undefined,
    };
    try {
      if (DEV_BYPASS) await mockUpsertMusicianApp(app);
      else            await upsertMusicianApp(app);
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      console.error('[musicianForm] submit failed', err);
      setError(t.errSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="velvet-card rounded-lg-card p-10 md:p-12 text-center max-w-2xl mx-auto"
      >
        <CheckCircle2 size={48} className="mx-auto mb-5 text-emerald-400" />
        <h2 className="font-display title-medieval text-3xl md:text-4xl text-ivory mb-3">{t.thanksTitle}</h2>
        <p className="font-editorial italic text-base md:text-lg text-ivory-soft max-w-md mx-auto">{t.thanksBody}</p>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="velvet-card rounded-lg-card p-6 md:p-10 max-w-3xl mx-auto space-y-10 text-ivory"
    >
      {/* ─── Band identity ─── */}
      <Fieldset icon={Music} title={t.sectionIdentity}>
        <Row label={t.bandName} required>
          <input className={inputClass} value={bandName} onChange={(e) => setBandName(e.target.value)} required />
        </Row>
        <Row label={t.contactName} required>
          <input className={inputClass} value={contactName} onChange={(e) => setContactName(e.target.value)} required />
        </Row>
        <Row label={t.contactRole}>
          <input className={inputClass} value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="leader, manager, agent..." />
        </Row>
        <Row label={t.phone} required>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </Row>
        <Row label={t.altEmail}>
          <input type="email" className={inputClass} value={altEmail} onChange={(e) => setAltEmail(e.target.value)} />
        </Row>
        <Row label={t.website}>
          <input className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        </Row>
        <Row label={t.spotify}>
          <input className={inputClass} value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="https://open.spotify.com/..." />
        </Row>
        <Row label={t.socials}>
          <input className={inputClass} value={socials} onChange={(e) => setSocials(e.target.value)} placeholder="@instagram, FB page, TikTok..." />
        </Row>
      </Fieldset>

      {/* ─── Programme ─── */}
      <Fieldset icon={FileText} title={t.sectionProgramme}>
        <Row label={t.shortBio} required>
          <textarea rows={4} className={inputClass} value={shortBio} onChange={(e) => setShortBio(e.target.value)} required />
        </Row>
        <Row label={t.genres}>
          <div className="flex flex-wrap gap-2">
            {ALL_GENRES.map((g) => (
              <Chip key={g} on={genres.includes(g)} onClick={() => toggleGenre(g)}>{genreLabels[g]}</Chip>
            ))}
          </div>
          {genres.includes('other') && (
            <input className={`${inputClass} mt-2`} placeholder={t.genresOther} value={genresOther} onChange={(e) => setGenresOther(e.target.value)} />
          )}
        </Row>
        <Row label={t.performerCount}>
          <select className={inputClass} value={performerCount} onChange={(e) => setPerformerCount(e.target.value as PerformerCount)}>
            <option value="solo">Solo</option>
            <option value="duo">Duo</option>
            <option value="trio">Trio</option>
            <option value="4-5">4–5</option>
            <option value="6-8">6–8</option>
            <option value="9+">9+</option>
          </select>
        </Row>
        <Row label={t.performerNames}>
          <textarea rows={2} className={inputClass} value={performerNames} onChange={(e) => setPerformerNames(e.target.value)} placeholder={t.performerNamesPh} />
        </Row>
      </Fieldset>

      {/* ─── Performance preferences ─── */}
      <Fieldset icon={Radio} title={t.sectionPerformance}>
        <Row label={t.daysAvailable}>
          <div className="flex flex-wrap gap-2">
            {(['vendredi','samedi','dimanche'] as DayAvailability[]).map((d) => (
              <Chip key={d} on={daysAvailable.includes(d)} onClick={() => toggleDay(d)}>
                {lang === 'FR' ? d[0].toUpperCase()+d.slice(1) : t.dayLabel[d]}
              </Chip>
            ))}
          </div>
        </Row>
        <Row label={t.preferredStage}>
          <select className={inputClass} value={preferredStage} onChange={(e) => setStage(e.target.value as StagePref)}>
            <option value="small">{t.stage.small}</option>
            <option value="medium">{t.stage.medium}</option>
            <option value="main">{t.stage.main}</option>
            <option value="roving">{t.stage.roving}</option>
            <option value="fire-circle">{t.stage['fire-circle']}</option>
          </select>
        </Row>
        <Row label={t.setLength}>
          <select className={inputClass} value={setLength} onChange={(e) => setSetLength(e.target.value as SetLength)}>
            <option value="15-30">15–30 min</option>
            <option value="30-45">30–45 min</option>
            <option value="45-60">45–60 min</option>
            <option value="60-90">60–90 min</option>
            <option value="90+">90+ min</option>
          </select>
        </Row>
        <Row label={t.numberOfSets}>
          <input type="number" min={1} max={6} className={inputClass} value={numberOfSets} onChange={(e) => setNumberOfSets(Number(e.target.value) || 1)} />
        </Row>
        <Check label={t.willingToRove}      on={willingToRove}      onChange={setWillingToRove} />
        <Check label={t.willingToCollab}    on={willingToCollab}    onChange={setWillingToCollab} />
        <Check label={t.fireSafeRepertoire} on={fireSafeRepertoire} onChange={setFireSafe} />
      </Fieldset>

      {/* ─── Technical needs ─── */}
      <Fieldset icon={Zap} title={t.sectionTechnical}>
        <Row label={t.soundProvided}>
          <select className={inputClass} value={soundProvided} onChange={(e) => setSound(e.target.value as SoundProvided)}>
            <option value="fully-acoustic">{t.sound['fully-acoustic']}</option>
            <option value="we-bring-pa">{t.sound['we-bring-pa']}</option>
            <option value="need-fmm-pa">{t.sound['need-fmm-pa']}</option>
            <option value="partial">{t.sound.partial}</option>
          </select>
        </Row>
        <Row label={t.inputList}>
          <textarea rows={3} className={inputClass} value={inputList} onChange={(e) => setInputList(e.target.value)} placeholder={t.inputListPh} />
        </Row>
        <Row label={t.monitorsNeeded}>
          <input type="number" min={0} max={12} className={inputClass} value={monitorsNeeded} onChange={(e) => setMonitors(Number(e.target.value) || 0)} />
        </Row>
        <Check label={t.ownsBackline} on={ownsBackline} onChange={setOwnsBackline} />
        <Row label={t.backlineNotes}>
          <textarea rows={2} className={inputClass} value={backlineNotes} onChange={(e) => setBacklineNotes(e.target.value)} placeholder={t.backlineNotesPh} />
        </Row>
        <Row label={t.powerNeed}>
          <select className={inputClass} value={powerNeed} onChange={(e) => setPowerNeed(e.target.value as PowerNeed)}>
            <option value="none">{t.power.none}</option>
            <option value="phone-charge">{t.power['phone-charge']}</option>
            <option value="one-circuit">{t.power['one-circuit']}</option>
            <option value="multiple-circuits">{t.power['multiple-circuits']}</option>
            <option value="three-phase">{t.power['three-phase']}</option>
          </select>
        </Row>
        <Row label={t.powerNotes}>
          <input className={inputClass} value={powerNotes} onChange={(e) => setPowerNotes(e.target.value)} placeholder={t.powerNotesPh} />
        </Row>
        <Row label={t.lightingNeed}>
          <select className={inputClass} value={lightingNeed} onChange={(e) => setLighting(e.target.value as LightingNeed)}>
            <option value="daylight-ok">{t.lighting['daylight-ok']}</option>
            <option value="basic-stage-light">{t.lighting['basic-stage-light']}</option>
            <option value="theatrical">{t.lighting.theatrical}</option>
            <option value="fire-only">{t.lighting['fire-only']}</option>
          </select>
        </Row>
        <Check label={t.weatherDependent} on={weatherDependent} onChange={setWeatherDep} />
      </Fieldset>

      {/* ─── Logistics ─── */}
      <Fieldset icon={Truck} title={t.sectionLogistics}>
        <Row label={t.travelingFrom}>
          <input className={inputClass} value={travelingFrom} onChange={(e) => setTravelingFrom(e.target.value)} placeholder="Montréal, Bretagne, Boston..." />
        </Row>
        <Check label={t.needsLodging} on={needsLodging} onChange={setNeedsLodging} />
        <Check label={t.needsMeals}   on={needsMeals}   onChange={setNeedsMeals} />
        <Row label={t.vehicleCount}>
          <input type="number" min={0} max={10} className={inputClass} value={vehicleCount} onChange={(e) => setVehicleCount(Number(e.target.value) || 0)} />
        </Row>
        <Row label={t.loadInWindow}>
          <input className={inputClass} value={loadInWindow} onChange={(e) => setLoadInWindow(e.target.value)} placeholder={t.loadInWindowPh} />
        </Row>
        <Row label={t.accessibilityNeeds}>
          <textarea rows={2} className={inputClass} value={accessibilityNeeds} onChange={(e) => setA11y(e.target.value)} />
        </Row>
      </Fieldset>

      {/* ─── Open notes ─── */}
      <Fieldset icon={FileText} title={t.sectionOpen}>
        <Row label={t.feeExpectation}>
          <input className={inputClass} value={feeExpectation} onChange={(e) => setFee(e.target.value)} placeholder={t.feeExpectationPh} />
        </Row>
        <Check label={t.hasContract} on={hasContract} onChange={setHasContract} />
        <Row label={t.contractNotes}>
          <textarea rows={2} className={inputClass} value={contractNotes} onChange={(e) => setContractNotes(e.target.value)} />
        </Row>
        <Row label={t.invoiceEntity}>
          <input className={inputClass} value={invoiceEntity} onChange={(e) => setInvoiceEntity(e.target.value)} />
        </Row>
        <Row label={t.whyFMM}>
          <textarea rows={3} className={inputClass} value={whyFMM} onChange={(e) => setWhyFMM(e.target.value)} />
        </Row>
        <Row label={t.specialRequests}>
          <textarea rows={3} className={inputClass} value={specialRequests} onChange={(e) => setSpecial(e.target.value)} />
        </Row>
      </Fieldset>

      {error && (
        <p className="font-editorial italic text-sm text-blush text-center">{error}</p>
      )}
      <div className="flex justify-center pt-2">
        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-brass text-midnight-deep font-sans uppercase tracking-wider text-sm font-semibold rounded-card disabled:opacity-50"
        >
          {submitting ? t.submitting : t.submit} <Send size={16} />
        </motion.button>
      </div>
    </form>
  );
};

// ─── Small bits ──────────────────────────────────────────────────────
const inputClass =
  'w-full bg-midnight-deep/55 border border-ivory-soft/20 rounded-card px-3 py-2 text-sm text-ivory placeholder:text-ivory-soft/40 focus:outline-none focus:border-brass/70 focus:ring-1 focus:ring-brass/40 transition';

const Fieldset: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <section>
    <h3 className="font-display title-medieval text-base md:text-lg text-brass uppercase tracking-widest mb-1 flex items-center gap-2">
      <Icon size={14} /> {title}
    </h3>
    <div className="divider-brass w-16 mb-4" />
    <div className="space-y-4">{children}</div>
  </section>
);

const Row: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label className="block">
    <span className="font-sans text-xs uppercase tracking-widest text-ivory-soft/80 mb-1.5 inline-block">
      {label}{required ? ' *' : ''}
    </span>
    {children}
  </label>
);

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-pill border text-xs font-sans uppercase tracking-wider transition ${
      on
        ? 'bg-brass/25 border-brass text-brass'
        : 'bg-midnight-deep/40 border-ivory-soft/25 text-ivory-soft hover:border-ivory-soft/50'
    }`}
  >
    {children}
  </button>
);

const Check: React.FC<{ label: string; on: boolean; onChange: (v: boolean) => void }> = ({ label, on, onChange }) => (
  <label className="flex items-start gap-2.5 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={on}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-ivory-soft/40 bg-midnight-deep accent-brass"
    />
    <span className="font-sans text-sm text-ivory-soft">{label}</span>
  </label>
);

// ─── i18n ────────────────────────────────────────────────────────────
const FR = {
  sectionIdentity:   'Identité du groupe',
  sectionProgramme:  'Programme musical',
  sectionPerformance:'Préférences scène',
  sectionTechnical:  'Besoins techniques',
  sectionLogistics:  'Logistique',
  sectionOpen:       'Précisions',
  bandName:    'Nom du groupe',
  contactName: 'Personne-ressource',
  contactRole: 'Rôle (leader, gérant·e…)',
  phone:       'Téléphone',
  altEmail:    'Courriel alternatif',
  website:     'Site web / Bandcamp',
  spotify:     'Spotify',
  socials:     'Réseaux sociaux',
  shortBio:    'Présentation (1-2 paragraphes pour la page publique)',
  genres:      'Genres musicaux',
  genresOther: 'Précisez votre genre',
  performerCount: 'Nombre de musicien·nes',
  performerNames: 'Membres (optionnel)',
  performerNamesPh: 'Noms / instruments — un par ligne',
  daysAvailable: 'Jours de disponibilité',
  dayLabel: { vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' } as Record<string, string>,
  preferredStage: 'Scène souhaitée',
  stage: {
    small: 'Petite scène acoustique', medium: 'Scène moyenne', main: 'Grande scène',
    roving: 'Déambulatoire / itinérant', 'fire-circle': 'Cercle de feu',
  } as Record<string, string>,
  setLength: 'Durée d’un set',
  numberOfSets: 'Nombre de sets demandés',
  willingToRove: 'Acceptez-vous de jouer en déambulatoire ?',
  willingToCollab: 'Ouvert·es aux collaborations / jams avec d’autres groupes',
  fireSafeRepertoire: 'Avez-vous un répertoire adapté au cercle de feu (acoustique, intime) ?',
  soundProvided: 'Son / sonorisation',
  sound: {
    'fully-acoustic': 'Entièrement acoustique', 'we-bring-pa': 'Nous apportons notre PA',
    'need-fmm-pa':    'Nous avons besoin du PA FMM', partial: 'Partiel (à discuter)',
  } as Record<string, string>,
  inputList: 'Liste des entrées (input list)',
  inputListPh: 'Ex.: 4 voix SM58, 2 DI, 1 cornemuse mic, 2 OH percu...',
  monitorsNeeded: 'Nombre de retours scène',
  ownsBackline: 'Nous apportons notre backline (ampli, batterie, etc.)',
  backlineNotes: 'Détails backline',
  backlineNotesPh: 'Ce que vous apportez vs ce que vous demandez',
  powerNeed: 'Besoin électrique',
  power: {
    none: 'Aucun', 'phone-charge': 'Recharge téléphone seulement',
    'one-circuit': '1 circuit', 'multiple-circuits': 'Plusieurs circuits',
    'three-phase': 'Triphasé',
  } as Record<string, string>,
  powerNotes: 'Précisions électriques',
  powerNotesPh: 'Watts approximatifs, génératrice tolérée ?',
  lightingNeed: 'Éclairage',
  lighting: {
    'daylight-ok': 'Jour seulement', 'basic-stage-light': 'Éclairage scène basique',
    theatrical: 'Théâtral / cues', 'fire-only': 'Feu / ambiance seulement',
  } as Record<string, string>,
  weatherDependent: 'Instruments sensibles à la pluie / humidité',
  travelingFrom: 'Vous venez de',
  needsLodging: 'Avons besoin d’hébergement',
  needsMeals:   'Avons besoin de repas',
  vehicleCount: 'Nombre de véhicules à stationner',
  loadInWindow: 'Fenêtre d’arrivée souhaitée',
  loadInWindowPh: 'Ex.: vendredi 14h-16h',
  accessibilityNeeds: 'Besoins d’accessibilité',
  feeExpectation: 'Cachet / attentes financières',
  feeExpectationPh: 'Champ libre — Pitch vous reviendra',
  hasContract: 'Nous avons un contrat-type',
  contractNotes: 'Précisions contrat',
  invoiceEntity: 'Entité de facturation',
  whyFMM: 'Pourquoi le FMM ?',
  specialRequests: 'Autres précisions',
  submit: 'Envoyer ma candidature',
  submitting: 'Envoi en cours…',
  errRequired: 'Champs obligatoires manquants (nom du groupe, contact, téléphone, présentation).',
  errSubmit:   'Impossible d’envoyer la candidature. Réessayez ou contactez admin@festivalmedievaldemontpellier.org.',
  thanksTitle: 'Merci, votre candidature est arrivée',
  thanksBody:  'Pitch (Éric Pichette) la lira et vous reviendra par courriel. Vous pourrez modifier vos réponses en revenant ici.',
};

const EN: typeof FR = {
  sectionIdentity:   'Band identity',
  sectionProgramme:  'Musical programme',
  sectionPerformance:'Performance preferences',
  sectionTechnical:  'Technical needs',
  sectionLogistics:  'Logistics',
  sectionOpen:       'Notes',
  bandName:    'Band name',
  contactName: 'Primary contact',
  contactRole: 'Role (leader, manager…)',
  phone:       'Phone',
  altEmail:    'Alternate email',
  website:     'Website / Bandcamp',
  spotify:     'Spotify',
  socials:     'Socials',
  shortBio:    'Bio (1-2 paragraphs for the public lineup page)',
  genres:      'Genres',
  genresOther: 'Describe your genre',
  performerCount: 'Number of performers',
  performerNames: 'Roster (optional)',
  performerNamesPh: 'Names / instruments — one per line',
  daysAvailable: 'Days available',
  dayLabel: { vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday' } as Record<string, string>,
  preferredStage: 'Preferred stage',
  stage: {
    small: 'Small acoustic stage', medium: 'Medium stage', main: 'Main stage',
    roving: 'Roving / strolling', 'fire-circle': 'Fire circle',
  } as Record<string, string>,
  setLength: 'Set length',
  numberOfSets: 'Number of sets requested',
  willingToRove: 'Willing to play as a roving act?',
  willingToCollab: 'Open to collaborations / jams with other bands',
  fireSafeRepertoire: 'Do you have an acoustic / intimate repertoire for the fire circle?',
  soundProvided: 'Sound / PA',
  sound: {
    'fully-acoustic': 'Fully acoustic', 'we-bring-pa': 'We bring our own PA',
    'need-fmm-pa':    'We need the FMM PA', partial: 'Partial (let’s discuss)',
  } as Record<string, string>,
  inputList: 'Input list',
  inputListPh: 'e.g. 4 vox SM58, 2 DI, 1 bagpipe mic, 2 percussion OH...',
  monitorsNeeded: 'Stage monitors needed',
  ownsBackline: 'We bring our own backline (amps, drums, etc.)',
  backlineNotes: 'Backline notes',
  backlineNotesPh: 'What you bring vs what you need',
  powerNeed: 'Power need',
  power: {
    none: 'None', 'phone-charge': 'Phone charge only',
    'one-circuit': '1 circuit', 'multiple-circuits': 'Multiple circuits',
    'three-phase': 'Three-phase',
  } as Record<string, string>,
  powerNotes: 'Power notes',
  powerNotesPh: 'Approx watts, generator OK?',
  lightingNeed: 'Lighting',
  lighting: {
    'daylight-ok': 'Daylight only', 'basic-stage-light': 'Basic stage lighting',
    theatrical: 'Theatrical / cues', 'fire-only': 'Fire / ambient only',
  } as Record<string, string>,
  weatherDependent: 'Rain/humidity-sensitive instruments',
  travelingFrom: 'You travel from',
  needsLodging: 'We need lodging',
  needsMeals:   'We need meals',
  vehicleCount: 'Number of vehicles to park',
  loadInWindow: 'Preferred load-in window',
  loadInWindowPh: 'e.g. Friday 2-4pm',
  accessibilityNeeds: 'Accessibility needs',
  feeExpectation: 'Fee / financial expectations',
  feeExpectationPh: 'Free text — Pitch will follow up',
  hasContract: 'We have a standard contract',
  contractNotes: 'Contract notes',
  invoiceEntity: 'Invoice entity',
  whyFMM: 'Why FMM?',
  specialRequests: 'Other notes',
  submit: 'Send my application',
  submitting: 'Sending…',
  errRequired: 'Missing required fields (band name, contact, phone, bio).',
  errSubmit:   'Could not submit the application. Try again or email admin@festivalmedievaldemontpellier.org.',
  thanksTitle: 'Thanks — application received',
  thanksBody:  'Pitch (Éric Pichette) will read it and follow up by email. You can edit your answers by coming back here.',
};

export default MusicianForm;
