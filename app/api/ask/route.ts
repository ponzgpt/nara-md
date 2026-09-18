import Anthropic from "@anthropic-ai/sdk";
import library from "@/data/library.json";
import { rank, type Entry } from "@/lib/search";
import { boostFor, DEFAULT_PROFILE, type Profile } from "@/lib/catalog";

type Source = { n: number; kind: "guideline" | "literature"; title: string; meta: string; doi: string | null; pmid: string | null; openAccess: boolean; abstract: string };

async function europePmc(q: string): Promise<Omit<Source, "n">[]> {
  const query = `(${q.replace(/[():"]/g, " ")}) AND HAS_ABSTRACT:y AND (SRC:MED OR SRC:PMC)`;
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=6&query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const hits: any[] = (await res.json()).resultList?.result ?? [];
    return hits.map((h) => ({
      kind: "literature", title: h.title, meta: `${h.journalInfo?.journal?.isoabbreviation ?? ""} ${h.pubYear}`.trim(),
      doi: h.doi ?? null, pmid: h.pmid ?? null, openAccess: h.isOpenAccess === "Y",
      abstract: String(h.abstractText ?? "").replace(/<[^>]+>/g, "").slice(0, 1500),
    }));
  } catch {
    return []; // Europe PMC down or slow: answer from the curated library alone.
  }
}

const SYSTEM = `You support clinical neurophysiologists (EEG, EMG/NCS, evoked potentials, PSG, IONM) who are finishing a study report.
Answer only from the numbered sources provided. Cite every claim inline as [n]. Prefer society guidelines over single studies and say which society and year.
Be brief: a direct answer first (2-5 sentences), then, if useful, one sentence of report-ready wording prefixed "Report wording:".
If guidance differs between regions or societies, say so in one line. If the sources do not settle the question, say that plainly instead of filling the gap.`;

export async function POST(req: Request) {
  const { q, profile = DEFAULT_PROFILE } = (await req.json()) as { q: string; profile?: Profile };
  const question = String(q ?? "").trim().slice(0, 1000);
  if (!question) return Response.json({ error: "Empty question" }, { status: 400 });

  const guidelines = rank(library as Entry[], question, { modalities: profile.modalities, boostSocieties: boostFor(profile) }).slice(0, 6);
  const literature = await europePmc(question);
  const sources: Source[] = [
    ...guidelines.map((e) => ({ kind: "guideline" as const, title: e.title, meta: `${e.societies.join(" · ")} · ${e.journal} ${e.year}`, doi: e.doi, pmid: e.pmid, openAccess: e.openAccess, abstract: e.abstract })),
    ...literature,
  ].map((s, i) => ({ ...s, n: i + 1 }));

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json({ answer: null, sources, note: "Synthesis is off (no ANTHROPIC_API_KEY). Showing ranked sources." });
  }

  const context = sources.map((s) => `[${s.n}] (${s.kind}) ${s.title} — ${s.meta}\n${s.abstract || "(no abstract)"}`).join("\n\n");
  const client = new Anthropic();
  const msg = await client.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" }, // clinician is mid-report: latency beats depth here
    system: SYSTEM,
    messages: [{ role: "user", content: `Region: ${profile.region}. Scope: ${profile.modalities.join(", ") || "all modalities"}.\n\nSources:\n${context}\n\nQuestion: ${question}` }],
  });
  if (msg.stop_reason === "refusal") return Response.json({ answer: null, sources, note: "The model declined this question. Sources are below." });
  const answer = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return Response.json({ answer, sources });
}
