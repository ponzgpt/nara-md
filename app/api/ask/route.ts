// POST /api/ask — retrieve (curated guidelines + Europe PMC), then synthesize a cited answer with Claude.
// Without ANTHROPIC_API_KEY it returns the ranked sources only, so the product works with zero secrets.
import Anthropic from "@anthropic-ai/sdk";
import library from "@/data/library.json";
import { rank, tokens, type Entry } from "@/lib/search";
import { boostFor, MODALITIES, REGIONS } from "@/lib/catalog";
import { searchLiterature } from "@/lib/connectors/europepmc";
import { allow } from "@/lib/rate-limit";
import type { AskResponse, Source } from "@/lib/types";

const SYSTEM = `You support clinical neurophysiologists (EEG, EMG/NCS, evoked potentials, PSG, IONM) who are finishing a study report.
Answer only from the numbered sources provided. Cite every claim inline as [n]. Prefer society guidelines over single studies and say which society and year.
Be brief: a direct answer first (2-5 sentences), then, if useful, one sentence of report-ready wording prefixed "Report wording:".
If guidance differs between regions or societies, say so in one line. If the sources do not settle the question, say that plainly instead of filling the gap.`;

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

  const guidelines = rank(library as Entry[], question, { modalities, boostSocieties: boostFor(region) }).slice(0, 6);
  // Short jargon queries ("CTS NCS") go to Europe PMC expanded; full sentences go as written.
  // ponytail: word-count heuristic; a proper query rewriter (or letting Claude write the query) is the upgrade.
  const literature = await searchLiterature(question.split(/\s+/).length <= 3 ? tokens(question).join(" ") : question);
  const sources: Source[] = [
    ...guidelines.map((e) => ({
      kind: "guideline" as const, title: e.title, meta: `${e.societies.join(" · ")} · ${e.journal} ${e.year}`,
      doi: e.doi, pmid: e.pmid, openAccess: e.openAccess, abstract: e.abstract,
    })),
    ...literature,
  ].map((s, i) => ({ ...s, n: i + 1 }));

  if (!process.env.ANTHROPIC_API_KEY) return reply({ answer: null, sources, note: "Showing ranked sources. Written answers are not enabled on this server." });

  const context = sources.map((s) => `[${s.n}] (${s.kind}) ${s.title} — ${s.meta}\n${s.abstract || "(no abstract)"}`).join("\n\n");
  try {
    const msg = await new Anthropic().beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" }, // the clinician is mid-report: latency beats depth
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Region: ${REGIONS[region].label}. Scope: ${modalities.join(", ") || "all modalities"}.\n\nSources:\n${context}\n\nQuestion: ${question}`,
      }],
    });
    if (msg.stop_reason === "refusal") return reply({ answer: null, sources, note: "No written answer for this question. Sources are below." });
    return reply({ answer: msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""), sources });
  } catch (err) {
    console.error("anthropic:", err instanceof Anthropic.APIError ? `${err.status} ${err.name}` : err); // never log the question
    return reply({ answer: null, sources, note: "The answer service is unavailable right now. Sources are below." });
  }
}
