"use client";
// The home page is the tool. The hero is the search box; the marketing sections (passed as children)
// show only while idle. As soon as there's a query, an answer or a modality scope, results take over.
// The logo returns to the idle state.
import { useEffect, useMemo, useRef, useState } from "react";
import { LIBRARY } from "@/lib/library";
import { rank } from "@/lib/search";
import { boostFor, DOC_TYPES, missingLocal, MODALITIES } from "@/lib/catalog";
import { useStored } from "@/lib/use-stored";
import type { AskEvent, AskResponse } from "@/lib/types";
import { Results } from "@/components/Results";
import { Suggestions } from "@/components/Suggestions";
import { Examples } from "@/components/Examples";
import { RegionMenu } from "@/components/RegionMenu";
import { SourcesSheet } from "@/components/SourcesSheet";
import { ThemeToggle } from "@/components/ThemeToggle";

const SOCIETIES = new Set(LIBRARY.flatMap((e) => e.societies)).size;
const COUNTS = DOC_TYPES.map((t) => ({ ...t, n: LIBRARY.filter((e) => e.type === t.id).length }));

export function Home({ papers, children }: { papers: string; children: React.ReactNode }) {
  const [region, setRegion] = useStored("neuronara.region", "global");
  const [scope, setScope] = useStored<string[]>("neuronara.scope", []);
  const [proxy, setProxy] = useStored("neuronara.proxy", "");
  const [q, setQ] = useState("");                 // what's in the box
  const [asked, setAsked] = useState<string | null>(null); // what was last submitted: results belong to this, not to `q`
  const [result, setResult] = useState<AskResponse | null>(null);
  const [asking, setAsking] = useState(false);
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sources = useRef<HTMLDialogElement>(null);
  const run = useRef(0); // id of the latest request, so a slow older answer can't overwrite a newer one

  useEffect(() => {
    const focus = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); input.current?.focus(); }
    };
    addEventListener("keydown", focus);
    return () => removeEventListener("keydown", focus);
  }, []);

  const missing = useMemo(() => missingLocal(region, LIBRARY), [region]);
  // Two different rankings: `entries` is the results page (for the submitted question); `matches` is only the typing dropdown.
  const entries = useMemo(() => rank(LIBRARY, asked ?? "", { modalities: scope, ...boostFor(region) }), [asked, scope, region]);
  const typed = useMemo(() => rank(LIBRARY, q, { modalities: scope, ...boostFor(region) }), [q, scope, region]);
  const active = asked !== null || scope.length > 0;
  const suggesting = focused && q.trim().length > 0 && q.trim() !== asked;
  const toggle = (m: string) => setScope(scope.includes(m) ? scope.filter((x) => x !== m) : [...scope, m]);
  const reset = () => { run.current++; setQ(""); setAsked(null); setResult(null); setAsking(false); setScope([]); scrollTo({ top: 0 }); };

  async function ask(question: string) {
    question = question.trim();
    if (!question) return;
    const id = ++run.current;
    setQ(question); setAsked(question); setFocused(false); input.current?.blur();
    scrollTo({ top: 0 });
    setAsking(true);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: question, region, modalities: scope }),
      });
      if (!res.body || !(res.headers.get("content-type") ?? "").includes("ndjson")) {
        const err = await res.json().catch(() => ({}));
        return setResult({ answer: null, sources: [], error: err.error ?? "Something went wrong. The standards below still work." });
      }
      // Events arrive as the server finishes each phase: sources first, then the written answer.
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (value) buf += dec.decode(value, { stream: true });
        for (let nl = buf.indexOf("\n"); nl >= 0; nl = buf.indexOf("\n")) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim() || id !== run.current) continue;
          const ev: AskEvent = JSON.parse(line);
          if (ev.type === "sources") setResult({ answer: null, sources: ev.sources, provider: ev.provider, pending: true });
          else setResult((r) => ({ sources: r?.sources ?? [], provider: r?.provider, answer: ev.answer, note: ev.note }));
        }
        if (done) break;
      }
    } catch {
      if (id === run.current) setResult((r) => ({ answer: null, sources: r?.sources ?? [], error: "Network error. The standards below still work." }));
    } finally {
      if (id === run.current) setAsking(false);
    }
  }

  // The answer is written for a region and a scope (both are in the prompt), so changing either re-asks the same question.
  const key = `${region}|${scope.join(",")}`;
  const lastKey = useRef(key);
  useEffect(() => {
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (!asked) return;
    const t = setTimeout(() => ask(asked), 600); // debounce: people toggle several chips in a row
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <header className="bar">
        <a href="/" className="brand" aria-label="Neuronara home" onClick={(e) => { e.preventDefault(); reset(); }}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" /><path d="M5 17h5l2-6 3 12 3-15 2 9h7" /></svg>
          <span>Neuro<b>nara</b></span>
        </a>
        <nav>
          <button className="pill" onClick={() => sources.current?.showModal()} title="Sources and library access" aria-label="Sources and library access">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5ZM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13Z" /></svg>
            <span className="label">Sources</span>
          </button>
          <RegionMenu value={region} onChange={setRegion} />
          <ThemeToggle />
        </nav>
      </header>

      <main className={active ? "home active" : "home"}>
        <section className="hero">
          <h1><span>Every standard in clinical neurophysiology.</span> <span>One question away.</span></h1>
          <ul className="stats" aria-label="What Neuronara searches">
            {COUNTS.map((c) => <li key={c.id}><b>{c.n}</b> {c.short}</li>)}
            <li><b>{SOCIETIES}</b> societies</li>
            <li><b>{papers}</b> papers</li>
          </ul>
          <div className="search-wrap" onFocus={() => setFocused(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
            <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="search" role="search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setFocused(true); }} autoFocus autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setFocused(false);
                  if (e.key === "ArrowDown") { e.preventDefault(); document.querySelector<HTMLElement>(".suggest [data-nav]")?.focus(); }
                }}
                placeholder="Ask a question about a standard, criterion or protocol" aria-label="Ask a question about a standard, criterion or protocol" />
              <button type="submit" disabled={!q.trim() || asking}>{asking ? "Reading…" : "Ask"}</button>
            </form>
            {suggesting && <Suggestions q={q.trim()} matches={typed.slice(0, 5)} total={typed.length} proxy={proxy} onAsk={() => ask(q)} />}
          </div>
          <Examples onPick={ask} />
          <div className="chips" role="group" aria-label="Scope to modalities">
            {MODALITIES.map((m) => (
              <button key={m} className="chip" aria-pressed={scope.includes(m)} onClick={() => toggle(m)}>{m}</button>
            ))}
            {scope.length > 0 && <button className="chip clear" onClick={() => setScope([])}>Clear</button>}
          </div>
        </section>

        {active
          ? <Results q={asked ?? ""} entries={entries} result={result} asking={asking} proxy={proxy} papers={papers} region={region} missing={missing} />
          : children}
      </main>

      <footer className="foot">
        Neuronara answers from published sources and does not replace clinical judgement ·{" "}
        <a href="https://github.com/ponzgpt/neuronara" target="_blank" rel="noreferrer">Source</a>
      </footer>

      <SourcesSheet ref={sources} region={region} proxy={proxy} onProxy={setProxy} />
    </>
  );
}
