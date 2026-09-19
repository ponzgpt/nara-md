// Turns raw model output into something NaraMD is willing to show: plain text, every claim cited against a
// real source number, one "Bottom line". Small models ignore instructions and sometimes add uncited claims of their own,
// so both are enforced here rather than trusted.

const CITE = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

/** Returns cleaned text, or null when the answer isn't properly cited. `nSources` = how many numbered sources exist. */
export function cleanAnswer(raw: string, nSources: number): string | null {
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
  const kept = body.split(/\n{2,}/)
    .map((para) => para.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(cited).join(" "))
    .filter(Boolean).join("\n\n");
  if (!kept) return null;
  return bottom && cited(bottom) ? `${kept}\n\nBottom line: ${bottom.trim()}` : kept;
}
