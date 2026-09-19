// Multilingual front door. The library and Europe PMC are English, so a Spanish or German question is translated into
// English search units by a field glossary. Original words are kept too, because some documents are themselves Spanish
// or German (SENFC, DGKN). This is deliberately a glossary and not a translation model: it's instant, deterministic,
// testable, and covers the vocabulary that actually matters here. ponytail: unknown words pass through untranslated;
// the upgrade for open-ended prose is letting the LLM rewrite the query, at 10-30 s on the free tier.

export type Lang = "en" | "es" | "de";

/** Lowercase and strip accents, so "Túnel" matches "tunel" and titles match queries typed without accents. */
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const WORDS: Record<Exclude<Lang, "en">, RegExp> = {
  es: /\b(el|la|los|las|del|que|para|con|una|un|es|se|en|por|como|cual|cuales|cuando|debo|hay|existe|entre|segun|sindrome|criterios|estandar|estandares|cuanto|puede|pueden|utilizo|uso)\b/g,
  de: /\b(der|die|das|und|ist|sind|fur|fuer|mit|ein|eine|wie|welche|bei|von|zur|zum|nicht|oder|sollte|kriterien|empfehlung|empfehlungen)\b/g,
};
const EN_WORDS = /\b(the|of|and|for|with|is|are|in|to|that|how|what|which|should|do|does|criteria|between)\b/g;

// A glossary hit whose pattern doesn't match its own English output is a word only that language has ("tunel carpiano").
// It lets keyword-style queries with no function words ("túnel carpiano gravedad") be recognised.
const only = (table: [RegExp, string[]][], t: string) => table.filter(([re, out]) => re.test(t) && !re.test(out.join(" "))).length;

export function detectLang(q: string): Lang {
  const t = norm(q), en = (t.match(EN_WORDS) ?? []).length;
  const es = (t.match(WORDS.es) ?? []).length + only(GLOSS_ES, t), de = (t.match(WORDS.de) ?? []).length + only(GLOSS_DE, t);
  const spanishOnly = /[¿¡ñ]/.test(q); // no other language in this product uses them
  if ((es > en || (spanishOnly && es >= en)) && es >= de) return "es";
  if (de > en && de >= es) return "de";
  return "en";
}

export const LANG_NAME: Record<Lang, string> = { en: "English", es: "Spanish", de: "German" };

// [pattern on accent-stripped text, English search units it adds]. Units are single words or phrases.
const GLOSS_ES: [RegExp, string[]][] = [
  // --- Spanish ---
  [/\b(sindrome del )?tunel carpiano\b/, ["carpal tunnel"]],
  [/\bneurograf\w*|\bconduccion nerviosa|\bvelocidad de conduccion|\bestudios? de conduccion/, ["nerve conduction"]],
  [/\belectromiograf\w*/, ["electromyography"]],
  [/\belectrodiagnostic\w*|\belectrofisiolog\w*/, ["electrodiagnostic"]],
  [/\bgravedad\b|\bgradu\w*|\bgradac\w*/, ["grading", "severity"]],
  [/\becograf\w*|\bultrasonid\w*/, ["ultrasound"]],
  [/\besclerosis lateral amiotrofica|\bela\b/, ["als", "amyotrophic lateral sclerosis"]],
  [/\b(estatus|estado|status) epilept\w*/, ["status epilepticus"]],
  [/\bno convulsiv\w*|\bsin convulsion/, ["nonconvulsive"]],
  [/\bdescargas? periodicas?/, ["periodic discharges"]],
  [/\blateralizad\w*/, ["lateralized"]], [/\bgeneralizad\w*/, ["generalized"]],
  [/\bcuidados criticos|\bpacientes? critic\w*|\bcritic\w* (enfermo|grave)/, ["critical care", "critically ill"]],
  [/\bmuerte (encefalica|cerebral)|\bdiagnostico de muerte/, ["brain death"]],
  [/\brequisitos (tecnicos|minimos)|\bestandares? (tecnic|minim)\w*|\bminimos?\b/, ["minimum", "technical"]],
  [/\binformes?\b|\binformar\b/, ["report"]],
  [/\bpolineuropat\w*/, ["polyneuropathy"]], [/\bsimetrica distal/, ["distal symmetric"]],
  [/\bdesmielinizant\w*/, ["demyelinating"]], [/\bpdic\b/, ["cidp", "chronic inflammatory demyelinating"]],
  [/\bguillain[ -]barre/, ["guillain"]],
  [/\blatencias? multiples?/, ["multiple sleep latency"]], [/\bmantenimiento de la vigilia/, ["maintenance of wakefulness"]],
  [/\bhipopnea\w*|\bhipopnoea\w*/, ["hypopnea", "respiratory events"]], [/\bdesaturacion/, ["desaturation"]],
  [/\bapnea\w*/, ["apnea"]], [/\bpolisomnograf\w*/, ["polysomnography"]], [/\bsueno\b/, ["sleep"]],
  [/\bclasificacion\w*/, ["classification"]],
  [/\bcrisis( epilepticas?| convulsivas?)?\b|\bconvulsion\w*/, ["seizure"]], [/\bepilepsia\w*|\bepileptic\w*/, ["epilepsy"]],
  [/\bestimulacion magnetica transcraneal|\bemt\b|\bemtr\b/, ["transcranial magnetic"]],
  [/\bcontraindicacion\w*|\bcribado de seguridad|\bseguridad\b/, ["safety"]],
  [/\bpotenciales evocados motores?/, ["motor evoked"]], [/\bpotenciales evocados somatosensorial\w*|\bpess\b/, ["somatosensory evoked"]],
  [/\bpotenciales evocados\b/, ["evoked potential"]],
  [/\bmonitorizacion (neurofisiologica )?intraoperatoria|\bneuromonitorizacion|\bmio\b/, ["intraoperative monitoring"]],
  [/\bcriterios? de alarma|\balarma\b/, ["warning criteria"]],
  [/\bfotoestimulacion|\bestimulacion fotica/, ["photic stimulation"]], [/\bhiperventilacion/, ["hyperventilation"]],
  [/\bvalores (normales|de referencia)|\bnormativ\w*/, ["normal values", "reference values"]],
  [/\bsensitiv\w*/, ["sensory"]], [/\bnervio mediano/, ["median nerve"]], [/\bnervio cubital/, ["ulnar nerve"]],
  [/\bmonitorizacion\b/, ["monitoring"]], [/\bconsentimiento informado/, ["informed consent"]],
  [/\batencion continuada|\bguardias?\b/, ["on-call"]], [/\beeg de rutina/, ["routine eeg"]],
  [/\bneonat\w*/, ["neonatal"]], [/\bpediatric\w*|\bninos?\b/, ["paediatric", "children"]],
  [/\bterminologia/, ["terminology"]], [/\bpuntua\w*|\bpuntuacion/, ["scoring"]], [/\bcriterios?\b/, ["criteria"]],
  // --- Spanish, second pass: systematic coverage of the field's vocabulary, not just the questions seen so far ---
  [/\bneuropat\w*/, ["neuropathy"]], [/\bradiculopat\w*|\braiz\b|\braices\b/, ["radiculopathy"]], [/\bmiopat\w*/, ["myopathy"]],
  [/\bmiastenia/, ["myasthenia"]], [/\bunion neuromuscular/, ["neuromuscular junction"]], [/\bplexo braquial/, ["brachial plexus"]],
  [/\bestimulacion repetitiva/, ["repetitive nerve stimulation"]], [/\bfibra unica/, ["single fiber"]], [/\bonda f\b/, ["f wave"]],
  [/\breflejo h\b/, ["h reflex"]], [/\breflejo (del )?parpadeo/, ["blink reflex"]],
  [/\bmotora?\b|\bmotores\b/, ["motor"]], [/\bcubital/, ["ulnar"]], [/\bcodo\b/, ["elbow"]], [/\bmuneca/, ["wrist"]], [/\bperone\w*/, ["peroneal"]],
  [/\bmontaje\w*/, ["montage"]], [/\belectrodos?\b/, ["electrode"]], [/\bregistr\w*/, ["recording"]], [/\brutina/, ["routine"]],
  [/\banesthes\w*|\banestesi\w*|\banestesic\w*/, ["anaesthesia"]], [/\bprofundidad/, ["depth"]],
  [/\bno epilepticas?|\bpsicogen\w*|\bcrisis funcionales/, ["non-epileptic", "psychogenic", "functional"]],
  [/\bvideo-?eeg|\bvideo ?electroencefalograf\w*|\btelemetria/, ["video eeg", "telemetry"]],
  [/\bdispositivos? (portatiles?|vestibles?)|\bwearables?/, ["wearable devices"]], [/\bdeteccion/, ["detection"]],
  [/\bmelatonina/, ["melatonin"]], [/\bprivacion de sueno/, ["sleep deprivation"]], [/\btelemedicina/, ["telemedicine"]],
  [/\bpotenciales evocados visuales/, ["visual evoked"]], [/\bpotenciales evocados auditivos|\bpea\b/, ["auditory brainstem evoked"]],
  [/\bapnea obstructiva|\bsahs\b|\bsahos\b/, ["obstructive sleep apnea"]], [/\bpiernas inquietas/, ["restless legs"]],
  [/\bmovimientos periodicos/, ["periodic limb movement"]], [/\bnarcolepsia/, ["narcolepsy"]], [/\binsomnio/, ["insomnia"]],
  [/\btratamiento|\bterapeutic\w*|\btratar\b/, ["treatment", "therapeutic"]], [/\brepetitiv\w*/, ["repetitive"]],
  [/\bdepresion/, ["depression"]], [/\bdolor/, ["pain"]], [/\bdefin\w*/, ["definition"]], [/\bclasific\w*/, ["classification"]],
  [/\bfuncion cerebral/, ["brain function"]], [/\badultos?\b/, ["adults"]], [/\bencefalopatia/, ["encephalopathy"]],
  [/\bhipoxi\w*|\banoxi\w*/, ["hypoxic"]], [/\bcoma\b/, ["coma"]], [/\bpatron\w*/, ["pattern"]], [/\britmic\w*/, ["rhythmic"]],
  [/\bnervio\b/, ["nerve"]], [/\bnervios\b/, ["nerve"]], [/\bmusculo\w*/, ["muscle"]], [/\bcirugia de columna|\bcolumna vertebral/, ["spine surgery"]],
  [/\bconsentimiento/, ["consent"]], [/\bamplitud/, ["amplitude"]], [/\blatencia\b/, ["latency"]],
  [/\bagujas?\b/, ["needle"]], [/\buci\b|\bcuidados intensivos/, ["intensive care", "critically ill"]], [/\burgencias?\b/, ["emergency department"]],
  [/\bcoste\w*|\bcosto\w*/, ["cost"]], [/\benfermedad de creutzfeldt/, ["creutzfeldt"]],
  [/\bderivaci\w*|\bderivar\b/, ["referral"]],
];

const GLOSS_DE: [RegExp, string[]][] = [
  [/\bkarpaltunnel\w*/, ["carpal tunnel"]], [/\bneurographie|\bnervenleitgeschwindigkeit|\belektroneurographie/, ["nerve conduction"]],
  [/\bschlaf-?eeg\b/, ["sleep", "eeg"]], [/\bschlafentzug/, ["sleep deprivation"]], [/\bschlaf\w*/, ["sleep"]],
  [/\bhirntod|\bhirnfunktionsausfall/, ["brain death"]], [/\bkriterien\b/, ["criteria"]],
  [/\bableit\w*/, ["recording", "montage"]], [/\bbefund\w*|\bbeurteilung|\bbeschreibung/, ["report", "interpretation"]],
  [/\berwachsene\w*/, ["adults"]], [/\bkinder\w*/, ["children"]], [/\bnarkose\w*/, ["anaesthesia"]],
  [/\bevozierte\w* potenzial\w*|\bevozierte\w* potential\w*/, ["evoked potential"]], [/\bintraoperativ\w*/, ["intraoperative"]],
  [/\btelemedizin\w*/, ["telemedicine"]], [/\blangzeit\w*/, ["long-term"]], [/\bepilepsie\b/, ["epilepsy"]],
  [/\banf(a|ae)ll\w*/, ["seizure"]], [/\bnadeln?\b/, ["needle"]], [/\bdurchfuhr\w*|\bdurchfuehr\w*/, ["recording"]],
];

/** English search units implied by a Spanish/German question, one group of alternatives per glossary hit. Empty for English. */
export function translate(q: string): string[][] {
  const lang = detectLang(q);
  if (lang === "en") return []; // the glossary's patterns also match English words ("electrodiagnostic")
  const t = norm(q);
  return (lang === "es" ? GLOSS_ES : GLOSS_DE).filter(([re]) => re.test(t)).map(([, units]) => units);
}

// ---- Cognates: most Spanish/German medical vocabulary is Latin/Greek and looks like its English twin. ----
// Instead of listing every word, match query words to the library's own English vocabulary by spelling similarity.

/** Spanish spelling → the English spelling it usually corresponds to. Applied before measuring similarity. */
const ES_TO_EN: [RegExp, string][] = [
  [/izante\b/g, "ating"], // must precede -ante, or it never fires
  [/cion\b/g, "tion"], [/ciones\b/g, "tions"], [/ologia\b/g, "ology"], [/grafia\b/g, "graphy"], [/patia\b/g, "pathy"], [/ia\b/g, "y"],
  [/dad\b/g, "ty"], [/ico\b|ica\b/g, "ic"], [/ivo\b|iva\b/g, "ive"], [/oso\b|osa\b/g, "ous"], [/ante\b/g, "ant"],
  [/ismo\b/g, "ism"], [/ista\b/g, "ist"], [/fisi/g, "physi"], [/farm/g, "pharm"], [/mielin/g, "myelin"], [/encefal/g, "encephal"],
  [/^poli/g, "poly"], [/^hemi/g, "hemi"], [/^neuro/g, "neuro"], [/^esti/g, "sti"], [/^es(?=[pt])/g, "s"], [/c(?=[ei])/g, "c"],
  [/ado\b|ada\b/g, "ed"], [/ario\b|aria\b/g, "ary"], [/mente\b/g, ""], [/^des(?=[a-z])/g, "de"],
];
const editDistance = (a: string, b: string) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};

/** The English word in `vocab` that `word` most likely corresponds to, or null. Long words only: short ones are too ambiguous. */
export function cognate(word: string, vocab: Iterable<string>): string | null {
  const w = norm(word);
  if (w.length < 7) return null;
  const candidates = [w, ES_TO_EN.reduce((x, [re, to]) => x.replace(re, to), w)]; // rules chain: desmielinizante → demyelinating
  let best: string | null = null, bestScore = 0.78;
  for (const v of vocab) {
    for (const c of candidates) {
      if (Math.abs(v.length - c.length) > 4 || (v[0] !== c[0] && !(c[0] === "f" && v[0] === "p"))) continue; // compare the transformed spelling, not the original
      const score = 1 - editDistance(c, v) / Math.max(c.length, v.length);
      if (score > bestScore) { bestScore = score; best = v; }
    }
  }
  return best;
}
