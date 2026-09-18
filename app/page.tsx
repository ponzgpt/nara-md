"use client";
// One screen: search box that filters instantly and asks on Enter, modality chips that scope both,
// region in the header. Every preference is adjusted in place and remembered in the browser.
import { useEffect, useMemo, useRef, useState } from "react";
import library from "@/data/library.json";
import { rank, type Entry } from "@/lib/search";
import { boostFor, MODALITIES, REGIONS } from "@/lib/catalog";
import { useStored } from "@/lib/use-stored";
import type { AskResponse } from "@/lib/types";
import { Answer } from "@/components/Answer";
import { GuidelineList } from "@/components/GuidelineList";
import { SourcesSheet } from "@/components/SourcesSheet";

const LIBRARY = library as Entry[];

export default function Home() {
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
  const toggle = (m: string) => setScope(scope.includes(m) ? scope.filter((x) => x !== m) : [...scope, m]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || asking) return;
    setAsking(true);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q, region, modalities: scope }),
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
        <span className="brand">
          <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" /><path d="M5 17h5l2-6 3 12 3-15 2 9h7" /></svg>
          Nara<sup>MD</sup>
        </span>
        <nav>
          <button className="ghost" onClick={() => sources.current?.showModal()}>Sources</button>
          <label className="region">
            <span className="sr-only">Region</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {Object.entries(REGIONS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </select>
          </label>
        </nav>
      </header>

      <main>
        <section className="hero">
          <h1>The guideline, before the report is signed.</h1>
          <p className="lede">Society guidance and literature for EEG, EMG/NCS, evoked potentials, sleep and IONM. Cited, in seconds.</p>
          <form onSubmit={ask} className="search" role="search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} autoFocus
              placeholder="Search or ask a question" aria-label="Search guidelines or ask a question" />
            <button type="submit" disabled={!q.trim() || asking}>{asking ? "Reading…" : "Ask"}</button>
          </form>
          <p className="hint">Try “LPD vs GPD”, “CTS NCS”, “MSLT”. <kbd>/</kbd> to focus · no patient identifiers</p>
          <div className="chips" role="group" aria-label="Scope to modalities">
            {MODALITIES.map((m) => (
              <button key={m} className="chip" aria-pressed={scope.includes(m)} onClick={() => toggle(m)}>{m}</button>
            ))}
            {scope.length > 0 && <button className="chip clear" onClick={() => setScope([])}>Clear</button>}
          </div>
        </section>

        <section aria-live="polite">
          {asking && <div className="card skeleton" aria-label="Reading sources"><i /><i /><i /></div>}
          {result && <Answer r={result} q={q} proxy={proxy} />}
        </section>

        <section>
          <h2 className="eyebrow">{q || scope.length ? `${entries.length} guidelines` : "Library"}</h2>
          <GuidelineList entries={entries} proxy={proxy} />
        </section>
      </main>

      <footer className="foot">Nara MD answers from published sources and does not replace clinical judgement.</footer>

      <SourcesSheet ref={sources} region={region} proxy={proxy} onProxy={setProxy} />
    </>
  );
}
