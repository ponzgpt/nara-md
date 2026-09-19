// POST /api/ask — retrieve (curated guidelines + Europe PMC), then synthesize a cited answer (lib/llm.ts).
// With no LLM key configured it returns the ranked sources only, so the product works with zero secrets.
import { LIBRARY } from "@/lib/library";
import { literatureAttempts, rank } from "@/lib/search";
import { detectLang, LANG_NAME } from "@/lib/lang";
import { boostFor, MODALITIES, REGIONS } from "@/lib/catalog";
import { searchLiterature } from "@/lib/connectors/europepmc";
import { allow } from "@/lib/rate-limit";
import { provider, synthesize } from "@/lib/llm";
import { cleanAnswer } from "@/lib/answer";
import type { AskEvent, AskResponse, Source } from "@/lib/types";

const SYSTEM = `You help clinical neurophysiologists (EEG, EMG/NCS, evoked potentials, sleep, IONM) work out which standard, criteria, terminology or protocol applies to their question.
Use ONLY the numbered sources provided. Society guidelines and consensus statements outrank single studies; name the society and year.
When sources disagree, or a newer version supersedes an older one, say so and cite both. Mention regional differences in one line when relevant.
If the sources do not settle the question, say that plainly instead of filling the gap.
State only what the source text says. If an excerpt does not reveal a detail (which scale is recommended, what a threshold is, how many grades there are), say the excerpt does not specify it: never supply it from memory.

RULES
- Every sentence that states a fact ends with its source number in square brackets, like [1] or [2, 4]. An answer without citations is rejected.
- Write the answer in the language of the question (English, Spanish or German). The sources are mostly English: translate what you use, and keep guideline names and abbreviations as they are.
- Plain text only. No markdown, no bold, no headings, no bullet points.
- 2 to 5 sentences, then one final line starting exactly with "Bottom line:" (one sentence, also cited). Keep the label "Bottom line:" in English even when answering in another language.

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

  // Stream two events so the page can show sources in ~1 s instead of waiting up to 30 s for the written answer.
  // "no-transform" stops Next's gzip from buffering the chunks.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AskEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        const guidelines = rank(LIBRARY, question, { modalities, ...boostFor(region) }).slice(0, 6);
        // Europe PMC is English and matches literally, so it gets the question's key concepts (translated if needed),
        // strict first, relaxed until something comes back. ponytail: glossary + heuristics; an LLM query rewriter is the
        // upgrade, at 10-30 s on the free tier.
        let literature: Awaited<ReturnType<typeof searchLiterature>> = [];
        for (const attempt of literatureAttempts(question)) {
          literature = await searchLiterature(attempt);
          if (literature.length >= 3) break;
        }
        const sources: Source[] = [
          ...guidelines.map((e) => ({
            kind: "guideline" as const, title: e.title, meta: `${e.societies.join(" · ")} · ${e.journal} ${e.year}`,
            doi: e.doi, pmid: e.pmid, url: e.url, openAccess: e.openAccess,
            abstract: e.titleEn ? `[${e.lang?.toUpperCase()} document, English title: ${e.titleEn}] ${e.abstract}` : e.abstract,
          })),
          ...literature,
        ].map((s, i) => ({ ...s, n: i + 1 }));
        send({ type: "sources", sources, provider: provider() });

        // The model reads at most 5 documents and 4 papers, in full where possible. When an abstract must be cut, keep its start
        // AND its end: conclusions sit at the end, and cutting them is how the model ends up guessing what a guideline recommends.
        const fit = (t: string, max: number) => (t.length <= max ? t : `${t.slice(0, Math.floor(max * 0.55))} […] ${t.slice(-Math.floor(max * 0.45))}`);
        const prompted = sources.filter((s) => (s.kind === "guideline" ? s.n <= 5 : s.n <= guidelines.length + 4));
        const context = prompted.map((s) => `[${s.n}] (${s.kind}) ${s.title} — ${s.meta}\n${fit(s.abstract, s.kind === "guideline" ? 2400 : 1500) || "(no abstract)"}`).join("\n\n");
        const lang = LANG_NAME[detectLang(question)];
        const prompt = `Question language: ${lang}. Region: ${REGIONS[region].label}. Scope: ${modalities.join(", ") || "all modalities"}.\n\nSources:\n${context}\n\nQuestion: ${question}`;

        let out = await synthesize(SYSTEM, prompt);
        if (out.refused) return send({ type: "answer", answer: null, note: "No written answer for this question. Sources are below." });
        if (!out.text) return send({ type: "answer", answer: null, note: "Showing ranked sources. Written answers are not enabled on this server." });
        const texts = sources.map((s) => `${s.title} ${s.meta} ${s.abstract}`);
        let answer = cleanAnswer(out.text, texts);
        if (!answer) { // small models sometimes skip citations: one retry with the rule restated, then give up honestly
          out = await synthesize(SYSTEM, `${prompt}\n\nReminder: cite every sentence with [n] from the sources above, plain text only.`);
          answer = out.text ? cleanAnswer(out.text, texts) : null;
        }
        send(answer ? { type: "answer", answer } : { type: "answer", answer: null, note: "Couldn't write a properly cited answer this time. The sources below are the evidence." });
      } catch (err) {
        console.error("ask:", err instanceof Error ? err.message : err); // never log the question
        send({ type: "answer", answer: null, note: "The answer service is busy right now. The sources below are still the evidence." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store, no-transform" } });
}
