// Answer synthesis. First available provider wins:
//   1. ANTHROPIC_API_KEY  → Claude Opus 5           best quality, paid
//   2. OPENROUTER_API_KEY → free OpenRouter models   free, needs a (free) account key
//   3. neither            → Pollinations, keyless    works out of the box; anonymous third party, so it's the
//                                                    stopgap. Turn it off with LLM_KEYLESS=off (then no key = no answer).
import Anthropic from "@anthropic-ai/sdk";

// Free models come and go on OpenRouter; override with a comma-separated OPENROUTER_MODELS.
const FREE_MODELS = (process.env.OPENROUTER_MODELS ??
  "deepseek/deepseek-v4-flash-0731:free,google/gemma-4-31b-it:free,qwen/qwen3.8-27b:free").split(",").map((s) => s.trim());

export type Synthesis = { text: string | null; refused?: boolean };
type Chat = { system: string; user: string };

export async function synthesize(system: string, user: string): Promise<Synthesis> {
  const chat = { system, user };
  if (process.env.ANTHROPIC_API_KEY) return claude(chat);
  if (process.env.OPENROUTER_API_KEY) return openaiCompatible("https://openrouter.ai/api/v1/chat/completions", chat, {
    headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "http-referer": "https://naramd.technoir.cloud", "x-title": "NaraMD" },
    body: { models: FREE_MODELS, max_tokens: 1500 }, // `models` makes OpenRouter fall through when a free model is busy or gone
  });
  if (process.env.LLM_KEYLESS === "off") return { text: null };
  return openaiCompatible("https://text.pollinations.ai/openai", chat, {
    headers: {}, body: { model: process.env.POLLINATIONS_MODEL ?? "openai-fast", max_tokens: 1500 },
  });
}

async function claude({ system, user }: Chat): Promise<Synthesis> {
  const msg = await new Anthropic().beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" }, // the clinician is mid-question: latency beats depth
    system,
    messages: [{ role: "user", content: user }],
  });
  if (msg.stop_reason === "refusal") return { text: null, refused: true };
  return { text: msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("") };
}

async function openaiCompatible(url: string, { system, user }: Chat, opts: { headers: Record<string, string>; body: object }): Promise<Synthesis> {
  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(45_000),
    headers: { "content-type": "application/json", ...opts.headers },
    body: JSON.stringify({ ...opts.body, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  const text: string = (await res.json()).choices?.[0]?.message?.content ?? "";
  return { text: text.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || null };
}
