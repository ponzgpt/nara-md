// POST /api/ask — retrieve (curated guidelines + Europe PMC), then synthesize a cited answer (lib/llm.ts).
// With no LLM key configured it returns the ranked sources only, so the product works with zero secrets.
import { LIBRARY } from "@/lib/library";
import { rank, tokens } from "@/lib/search";
import { boostFor, MODALITIES, REGIONS } from "@/lib/catalog";
import { searchLiterature } from "@/lib/connectors/europepmc";
import { allow } from "@/lib/rate-limit";
import { synthesize } from "@/lib/llm";
import { cleanAnswer } from "@/lib/answer";
import type { AskResponse, Source } from "@/lib/types";

const SYSTEM = `You help clinical neurophysiologists (EEG, EMG/NCS, evoked potentials, sleep, IONM) work out which standard, criteria, terminology or protocol applies to their question.
Use ONLY the numbered sources provided. Society guidelines and consensus statements outrank single studies; name the society and year.
When sources disagree, or a newer version supersedes an older one, say so and cite both. Mention regional differences in one line when relevant.
If the sources do not settle the question, say that plainly instead of filling the gap.

RULES
- Every sentence that states a fact ends with its source number in square brackets, like [1] or [2, 4]. An answer without citations is rejected.
- Plain text only. No markdown, no bold, no headings, no bullet points.
- 2 to 5 sentences, then one final line starting exactly with "Bottom line:" (one sentence, also cited).

EXAMPLE
The 2021 ACNS terminology names periodic patterns by location, so lateralized periodic discharges are LPDs and generalized ones are GPDs [1]. The 2012 version used different modifiers and is superseded [1, 2].
Bottom line: Use the 2021 ACNS terms (LPD, GPD) [1].`;

const reply = (body: AskResponse, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!allow(ip)) return reply({ answer: null, sources: [], error: "Too many questions in a short time. Try again in a few minutes." }, 429);

  // Trust boundary: everything below reaches a prompt, so accept only known values.
  const body = await req.json().catch(() => ({}));
  const question = String(body.q ?? "").trim().slice(0, 1000);
  const region = Object.hasOwn(REGIONS, body.region) ? String(body.region) : "global";
  const modalities = (Array.isArray(body.modalities) ? body.modalities : []).filter((m: unknown) => MODALITIES.includes(String(m)));
  if (!question) return reply({ answer: null, sources: [], error: "Empty question." }, 400);

  const guidelines = rank(LIBRARY, question, { modalities, ...boostFor(region) }).slice(0, 6);
  // Short jargon queries ("fnd criteria") go to Europe PMC as expanded phrases; full sentences go as written.
  // ponytail: word-count heuristic; letting the LLM write the literature query is the upgrade.
  // If the expansion is too strict (e.g. "Awaji vs Gold Coast"), retry with the user's own words, which
  // for comparisons finds exactly the papers that discuss both sides.
  const short = question.split(/\s+/).length <= 4;
  let literature = await searchLiterature(short ? tokens(question) : question);
  if (short && !literature.length) literature = await searchLiterature(question.replace(/\b(vs|versus|or)\b/gi, " "));
  const sources: Source[] = [
    ...guidelines.map((e) => ({
      kind: "guideline" as const, title: e.title, meta: `${e.societies.join(" · ")} · ${e.journal} ${e.year}`,
      doi: e.doi, pmid: e.pmid, url: e.url, openAccess: e.openAccess,
      abstract: e.titleEn ? `[${e.lang?.toUpperCase()} document, English title: ${e.titleEn}] ${e.abstract}` : e.abstract,
    })),
    ...literature,
  ].map((s, i) => ({ ...s, n: i + 1 }));

  const context = sources.map((s) => `[${s.n}] (${s.kind}) ${s.title} — ${s.meta}\n${s.abstract || "(no abstract)"}`).join("\n\n");
  const prompt = `Region: ${REGIONS[region].label}. Scope: ${modalities.join(", ") || "all modalities"}.\n\nSources:\n${context}\n\nQuestion: ${question}`;
  try {
    let out = await synthesize(SYSTEM, prompt);
    if (out.refused) return reply({ answer: null, sources, note: "No written answer for this question. Sources are below." });
    if (!out.text) return reply({ answer: null, sources, note: "Showing ranked sources. Written answers are not enabled on this server." });
    let answer = cleanAnswer(out.text, sources.length);
    if (!answer) { // small models sometimes skip citations: one retry with the rule restated, then give up honestly
      out = await synthesize(SYSTEM, `${prompt}\n\nReminder: cite every sentence with [n] from the sources above, plain text only.`);
      answer = out.text ? cleanAnswer(out.text, sources.length) : null;
    }
    if (!answer) return reply({ answer: null, sources, note: "Couldn't write a properly cited answer this time. The sources below are the evidence." });
    return reply({ answer, sources });
  } catch (err) {
    console.error("llm:", err instanceof Error ? err.message : err); // never log the question
    return reply({ answer: null, sources, note: "The answer service is busy right now. Sources are below." });
  }
}
