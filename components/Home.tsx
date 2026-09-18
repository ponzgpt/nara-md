"use client";
// The home page is the tool. The hero is the search box; the marketing sections (passed as children)
// show only while idle. As soon as there's a query, an answer or a modality scope, results take over.
// The logo returns to the idle state.
import { useEffect, useMemo, useRef, useState } from "react";
import library from "@/data/library.json";
import { rank, type Entry } from "@/lib/search";
import { boostFor, DOC_TYPES, MODALITIES } from "@/lib/catalog";
import { useStored } from "@/lib/use-stored";
import type { AskResponse } from "@/lib/types";
import { Results } from "@/components/Results";
import { Examples } from "@/components/Examples";
import { RegionMenu } from "@/components/RegionMenu";
import { SourcesSheet } from "@/components/SourcesSheet";
import { ThemeToggle } from "@/components/ThemeToggle";

const LIBRARY = library as Entry[];
const SOCIETIES = new Set(LIBRARY.flatMap((e) => e.societies)).size;
const COUNTS = DOC_TYPES.map((t) => ({ ...t, n: LIBRARY.filter((e) => e.type === t.id).length }));

export function Home({ papers, children }: { papers: string; children: React.ReactNode }) {
  const [region, setRegion] = useStored("nara.region", "global");
  const [scope, setScope] = useStored<string[]>("nara.scope", []);
  const [proxy, setProxy] = useStored("nara.proxy", "");
  const [q, setQ] = useState("");
  const [result, setResult] = useState<AskResponse | null>(null);
  const [asking, setAsking] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sources = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const focus = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); input.current?.focus(); }
    };
    addEventListener("keydown", focus);
    return () => removeEventListener("keydown", focus);
  }, []);

  const entries = useMemo(() => rank(LIBRARY, q, { modalities: scope, boostSocieties: boostFor(region) }), [q, scope, region]);
  const active = Boolean(q.trim() || result || asking || scope.length);
  const toggle = (m: string) => setScope(scope.includes(m) ? scope.filter((x) => x !== m) : [...scope, m]);
  const reset = () => { setQ(""); setResult(null); setScope([]); scrollTo({ top: 0 }); };
  const edit = (v: string) => { setQ(v); setResult(null); }; // a new query invalidates the last answer

  async function ask(question: string) {
    if (!question.trim() || asking) return;
    setQ(question);
    scrollTo({ top: 0 });
    setAsking(true);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: question, region, modalities: scope }),
      });
      setResult(await res.json());
    } catch {
      setResult({ answer: null, sources: [], error: "Network error. The standards below still work." });
    } finally {
      setAsking(false);
    }
  }

  return (
    <>
      <header className="bar">
        <a href="/" className="brand" aria-label="NaraMD home" onClick={(e) => { e.preventDefault(); reset(); }}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" /><path d="M5 17h5l2-6 3 12 3-15 2 9h7" /></svg>
          <span>Nara<b>MD</b></span>
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
          <ul className="stats" aria-label="What NaraMD searches">
            {COUNTS.map((c) => <li key={c.id}><b>{c.n}</b> {c.short}</li>)}
            <li><b>{SOCIETIES}</b> societies</li>
            <li><b>{papers}</b> papers</li>
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="search" role="search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input ref={input} value={q} onChange={(e) => edit(e.target.value)} autoFocus
              placeholder="Ask about a standard, criterion or protocol" aria-label="Ask about a standard, criterion or protocol" />
            <button type="submit" disabled={!q.trim() || asking}>{asking ? "Reading…" : "Ask"}</button>
          </form>
          <Examples onPick={ask} />
          <div className="chips" role="group" aria-label="Scope to modalities">
            {MODALITIES.map((m) => (
              <button key={m} className="chip" aria-pressed={scope.includes(m)} onClick={() => toggle(m)}>{m}</button>
            ))}
            {scope.length > 0 && <button className="chip clear" onClick={() => setScope([])}>Clear</button>}
          </div>
        </section>

        {active
          ? <Results q={q} entries={entries} result={result} asking={asking} proxy={proxy} papers={papers} />
          : children}
      </main>

      <footer className="foot">
        NaraMD answers from published sources and does not replace clinical judgement ·{" "}
        <a href="https://github.com/ponzgpt/nara-md" target="_blank" rel="noreferrer">Source</a>
      </footer>

      <SourcesSheet ref={sources} region={region} proxy={proxy} onProxy={setProxy} />
    </>
  );
}
