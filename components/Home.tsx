"use client";
// The home page is the tool. The hero is the search box; the marketing sections (passed as children)
// show only while idle. As soon as there's a query, an answer or a modality scope, results take over.
// The logo returns to the idle state.
import { useEffect, useMemo, useRef, useState } from "react";
import library from "@/data/library.json";
import { rank, type Entry } from "@/lib/search";
import { boostFor, MODALITIES, REGIONS } from "@/lib/catalog";
import { useStored } from "@/lib/use-stored";
import type { AskResponse } from "@/lib/types";
import { Answer } from "@/components/Answer";
import { GuidelineList } from "@/components/GuidelineList";
import { SourcesSheet } from "@/components/SourcesSheet";
import { ThemeToggle } from "@/components/ThemeToggle";

const LIBRARY = library as Entry[];

export function Home({ children }: { children: React.ReactNode }) {
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
      setResult({ answer: null, sources: [], error: "Network error. The library below still works." });
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
          <button className="ghost" onClick={() => sources.current?.showModal()}>Sources</button>
          <label className="region">
            <span className="sr-only">Region</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {Object.entries(REGIONS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </select>
          </label>
          <ThemeToggle />
        </nav>
      </header>

      <main className={active ? "home active" : "home"}>
        <section className="hero">
          <p className="kicker">For clinical neurophysiologists</p>
          <h1>Every standard in your field. One question away.</h1>
          <p className="lede">
            Criteria, terminology, technical standards and protocols from IFCN, ACNS, AANEM, ILAE, AASM and more.
            Ask which one applies, and NaraMD shows you where it comes from.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="search" role="search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} autoFocus
              placeholder="Ask about a standard, criterion or protocol" aria-label="Ask about a standard, criterion or protocol" />
            <button type="submit" disabled={!q.trim() || asking}>{asking ? "Reading…" : "Ask"}</button>
          </form>
          <p className="hint">
            Try{" "}
            {["Awaji vs Gold Coast", "LPD vs GPD", "MSLT criteria", "EEG minimum standards"].map((ex, i) => (
              <span key={ex}>{i > 0 && " · "}<button type="button" className="example" onClick={() => ask(ex)}>{ex}</button></span>
            ))}
          </p>
          <div className="chips" role="group" aria-label="Scope to modalities">
            {MODALITIES.map((m) => (
              <button key={m} className="chip" aria-pressed={scope.includes(m)} onClick={() => toggle(m)}>{m}</button>
            ))}
            {scope.length > 0 && <button className="chip clear" onClick={() => setScope([])}>Clear</button>}
          </div>
          <p className="micro">No account · no patient data · <kbd>/</kbd> to focus</p>
        </section>

        {active ? (
          <>
            <section aria-live="polite">
              {asking && <div className="card skeleton" aria-label="Reading sources"><i /><i /><i /></div>}
              {result && <Answer r={result} q={q} proxy={proxy} />}
            </section>
            <section>
              <h2 className="eyebrow">{entries.length} guidelines{scope.length ? ` · ${scope.join(", ")}` : ""}</h2>
              <GuidelineList entries={entries} proxy={proxy} />
            </section>
          </>
        ) : children}
      </main>

      <footer className="foot">
        NaraMD answers from published sources and does not replace clinical judgement ·{" "}
        <a href="https://github.com/ponzgpt/nara-md" target="_blank" rel="noreferrer">Source</a>
      </footer>

      <SourcesSheet ref={sources} region={region} proxy={proxy} onProxy={setProxy} />
    </>
  );
}
