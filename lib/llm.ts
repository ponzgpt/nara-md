// Answer synthesis. Picks the first provider with a key:
//   ANTHROPIC_API_KEY  → Claude Opus 5 (best quality, paid)
//   OPENROUTER_API_KEY → free OpenRouter models (MVP default), tried in order until one answers
//   neither            → null, and the caller shows ranked sources only
import Anthropic from "@anthropic-ai/sdk";

// Free models come and go on OpenRouter; override with a comma-separated OPENROUTER_MODELS.
const FREE_MODELS = (process.env.OPENROUTER_MODELS ??
  "deepseek/deepseek-v4-flash-0731:free,google/gemma-4-31b-it:free,qwen/qwen3.8-27b:free").split(",").map((s) => s.trim());

export type Synthesis = { text: string | null; refused?: boolean };

export async function synthesize(system: string, user: string): Promise<Synthesis> {
  if (process.env.ANTHROPIC_API_KEY) return claude(system, user);
  if (process.env.OPENROUTER_API_KEY) return openrouter(system, user);
  return { text: null };
}

async function claude(system: string, user: string): Promise<Synthesis> {
  const msg = await new Anthropic().beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" }, // the clinician is mid-report: latency beats depth
    system,
    messages: [{ role: "user", content: user }],
  });
  if (msg.stop_reason === "refusal") return { text: null, refused: true };
  return { text: msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("") };
}

// OpenAI-compatible endpoint; `models` makes OpenRouter fall through the list when a free model is busy or gone.
async function openrouter(system: string, user: string): Promise<Synthesis> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(45_000),
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "http-referer": "https://naramd.technoir.cloud",
      "x-title": "Nara MD",
    },
    body: JSON.stringify({
      models: FREE_MODELS,
      max_tokens: 1500,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}`);
  const text: string = (await res.json()).choices?.[0]?.message?.content ?? "";
  return { text: text.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || null };
}
