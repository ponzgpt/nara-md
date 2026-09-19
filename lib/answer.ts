// Turns raw model output into something Neuronara is willing to show: plain text, every claim cited against a
// real source number, one "Bottom line". Small models ignore instructions and sometimes add uncited claims of their own,
// so both are enforced here rather than trusted. This is a floor, not proof of faithfulness: it catches invented numbers
// and acronyms, not every invented sentence. A stronger model (Claude) is the real fix.

const CITE = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

// Language-independent specifics: numbers, percentages and acronyms. A sentence that cites [1] but states "4 grades" or "CMAP"
// when source 1 contains neither is the model inventing detail under a real citation.
const SPECIFIC = /\b\d+(?:[.,]\d+)?%?|\b[A-Z]{2,}[A-Za-z]*\b/g;

/** Returns cleaned text, or null when the answer isn't properly cited. `texts[i]` is the full text (title, year, abstract) of source i+1. */
export function cleanAnswer(raw: string, texts: string[]): string | null {
  const nSources = texts.length;
  let t = raw
    .replace(/\*\*|__|^#+\s*/gm, "")                                  // markdown emphasis and headings
    .replace(/^\s*(direct answer|answer)\s*:?\s*$/gim, "")            // stray "Direct answer" heading lines
    .replace(/\s*\n?\s*Bottom line\s*:\s*/i, "\n\nBottom line: ")     // normalise wherever the model put it
    .replace(/\[(\d+)\]\[(\d+)\]/g, "[$1, $2]")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Drop citations that point at sources that don't exist; an answer citing nothing real is not cited.
  let valid = 0;
  t = t.replace(CITE, (_m, list: string) => {
    const ns = list.split(",").map((x) => Number(x.trim())).filter((n) => n >= 1 && n <= nSources);
    valid += ns.length;
    return ns.length ? `[${ns.join(", ")}]` : "";
  });
  if (!valid) return null;

  // Uncited sentences are the model speaking for itself, not the sources. Drop them.
  const [body, bottom] = t.split(/\n\nBottom line: /);
  const cited = (x: string) => /\[\d/.test(x);
  // Cited AND supported: every number/acronym in the sentence must appear in at least one source it cites.
  const supported = (x: string) => {
    const refs = [...x.matchAll(/\[([\d,\s]+)\]/g)].flatMap((m) => m[1].split(",").map((n) => Number(n.trim())));
    const haystack = refs.map((n) => texts[n - 1] ?? "").join(" ").toLowerCase();
    const claim = x.replace(/\[[\d,\s]+\]/g, "");
    return (claim.match(SPECIFIC) ?? []).every((tok) => haystack.includes(tok.toLowerCase().replace(",", ".")) || haystack.includes(tok.toLowerCase()));
  };
  const kept = body.split(/\n{2,}/)
    .map((para) => para.split(/(?<=[.!?])\s+(?=[A-Z])/).filter((x) => cited(x) && supported(x)).join(" "))
    .filter(Boolean).join("\n\n");
  if (!kept) return null;
  return bottom && cited(bottom) && supported(bottom) ? `${kept}\n\nBottom line: ${bottom.trim()}` : kept;
}
