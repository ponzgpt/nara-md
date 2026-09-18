"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import library from "@/data/library.json";
import { rank, type Entry } from "@/lib/search";
import { boostFor, CONNECTORS, DEFAULT_PROFILE, doiHref, GLOBAL_SOCIETIES, MODALITIES, REGIONS, SOCIETY_SITES, type Profile } from "@/lib/catalog";

type Source = { n: number; kind: string; title: string; meta: string; doi: string | null; pmid: string | null; openAccess: boolean };
type Result = { answer: string | null; sources: Source[]; note?: string; error?: string };

const LIB = library as Entry[];
const load = (): Profile => {
  try { return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem("nara.profile") ?? "{}") }; } catch { return DEFAULT_PROFILE; }
};

export default function Home() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [asking, setAsking] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const settings = useRef<HTMLDialogElement>(null);
  const sourcesDlg = useRef<HTMLDialogElement>(null);

  useEffect(() => { const p = load(); setProfile(p); setScope(p.modalities); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "/" && document.activeElement !== input.current) { e.preventDefault(); input.current?.focus(); } };
    addEventListener("keydown", onKey); return () => removeEventListener("keydown", onKey);
  }, []);

  const save = (p: Profile) => { setProfile(p); setScope(p.modalities); try { localStorage.setItem("nara.profile", JSON.stringify(p)); } catch {} };
  const entries = useMemo(() => rank(LIB, q, { modalities: scope, boostSocieties: boostFor(profile) }), [q, scope, profile]);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || asking) return;
    setAsking(true); setResult(null);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q, profile: { ...profile, modalities: scope } }) });
      setResult(await res.json());
    } catch { setResult({ answer: null, sources: [], error: "Network error. The library below still works offline." }); }
    finally { setAsking(false); }
  }

  const toggle = (m: string) => setScope((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));
  const local = REGIONS[profile.region];

  return (
    <>
      <header className="bar">
        <span className="mark">Nara<sup>MD</sup></span>
        <nav>
          <button className="ghost" onClick={() => sourcesDlg.current?.showModal()}>Sources</button>
          <button className="ghost" onClick={() => settings.current?.showModal()} aria-label="Your practice settings">
            {local.label}{profile.modalities.length ? ` · ${profile.modalities.length} modalities` : ""}
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <h1>The guideline, before the report is signed.</h1>
          <form onSubmit={ask} className="search" role="search">
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} autoFocus
              placeholder="Search guidelines or ask a question"
              aria-label="Search guidelines or ask a question" />
            <button type="submit" disabled={!q.trim() || asking}>{asking ? "Reading…" : "Ask"}</button>
          </form>
          <p className="hint">Try “LPD vs GPD”, “CTS NCS”, “MSLT”. Type to filter · Enter to ask · <kbd>/</kbd> to focus. No patient identifiers.</p>
          <div className="chips" role="group" aria-label="Modalities">
            {MODALITIES.map((m) => (
              <button key={m} className="chip" aria-pressed={scope.includes(m)} onClick={() => toggle(m)}>{m}</button>
            ))}
          </div>
        </section>

        <section aria-live="polite">
          {asking && <div className="card answer skeleton" aria-label="Reading sources"><i /><i /><i /></div>}
          {result && <Answer r={result} q={q} proxy={profile.proxyPrefix} />}
        </section>

        <section>
          <h2 className="label">{q ? `${entries.length} matching guidelines` : "Library"}</h2>
          <ul className="list">
            {entries.map((e) => <Row key={e.id} e={e} proxy={profile.proxyPrefix} />)}
            {!entries.length && <li className="empty">Nothing in the curated library. Press Enter to search the literature.</li>}
          </ul>
        </section>
      </main>

      <dialog ref={settings} className="sheet">
        <form method="dialog" onSubmit={(e) => {
          if ((e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "cancel") return;
          const f = new FormData(e.currentTarget);
          save({ region: String(f.get("region")), modalities: f.getAll("mod").map(String), proxyPrefix: String(f.get("proxy") ?? "").trim() });
        }}>
          <h2>Your practice</h2>
          <label>Where you practise
            <select name="region" defaultValue={profile.region} key={profile.region}>
              {Object.entries(REGIONS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </select>
          </label>
          <fieldset><legend>What you read <span>Nara opens scoped to these. Leave empty for everything.</span></legend>
            <div className="chips">
              {MODALITIES.map((m) => (
                <label key={m + profile.modalities.join()} className="chip"><input type="checkbox" name="mod" value={m} defaultChecked={profile.modalities.includes(m)} />{m}</label>
              ))}
            </div>
          </fieldset>
          <label>Library proxy prefix <span>Routes paywalled DOIs through your institution (EZproxy / OpenAthens).</span>
            <input name="proxy" defaultValue={profile.proxyPrefix} key={profile.proxyPrefix} placeholder="https://proxy.yourlibrary.edu/login?url=" type="url" />
          </label>
          <footer><button value="cancel" formNoValidate className="ghost">Cancel</button><button>Save</button></footer>
        </form>
      </dialog>

      <dialog ref={sourcesDlg} className="sheet">
        <form method="dialog">
          <h2>Sources</h2>
          <ul className="sources">
            {CONNECTORS.map((c) => (
              <li key={c.id}><b>{c.name}</b><span className={`tag ${c.kind}`}>{{ live: "Live", proxy: "Via your library", link: "Hand-off" }[c.kind]}</span>
                <p>{c.access} — {c.note}</p></li>
            ))}
          </ul>
          <h3 className="label">Societies for {local.label}</h3>
          <p className="societies">
            {[...GLOBAL_SOCIETIES, ...local.societies].filter((s) => SOCIETY_SITES[s]).map((s) => <a key={s} href={SOCIETY_SITES[s]} target="_blank" rel="noreferrer">{s}</a>)}
          </p>
          <footer><button>Done</button></footer>
        </form>
      </dialog>
    </>
  );
}

function Row({ e, proxy }: { e: Entry; proxy: string }) {
  return (
    <li className="row">
      <a className="title" href={e.doi ? doiHref(e.doi, e.openAccess ? "" : proxy) : `https://pubmed.ncbi.nlm.nih.gov/${e.pmid}/`} target="_blank" rel="noreferrer">{e.title}</a>
      <div className="meta">
        <span>{e.societies.join(" · ")}</span><span>{e.journal} {e.year}</span>
        {e.openAccess && <span className="tag live">Open</span>}
        {e.retired && <span className="tag warn">Retired</span>}
        {e.pmcid && <a href={`https://europepmc.org/article/PMC/${e.pmcid}`} target="_blank" rel="noreferrer">Full text</a>}
        {e.pmid && <a href={`https://pubmed.ncbi.nlm.nih.gov/${e.pmid}/`} target="_blank" rel="noreferrer">PubMed</a>}
      </div>
    </li>
  );
}

function Answer({ r, q, proxy }: { r: Result; q: string; proxy: string }) {
  const href = (s: Source) => (s.doi ? doiHref(s.doi, s.openAccess ? "" : proxy) : `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`);
  const byN = new Map(r.sources.map((s) => [s.n, s]));
  const wording = r.answer?.match(/Report wording:\s*([\s\S]+)$/)?.[1].trim();
  const body = r.answer?.replace(/Report wording:[\s\S]+$/, "").trim();
  const cite = (t: string) => t.split(/(\[\d+(?:,\s*\d+)*\])/).map((part, i) => {
    const ns = part.match(/^\[([\d,\s]+)\]$/)?.[1].split(",").map(Number);
    return ns ? <sup key={i}>{ns.map((n) => byN.get(n) ? <a key={n} href={href(byN.get(n)!)} target="_blank" rel="noreferrer">{n}</a> : n)}</sup> : part;
  });
  return (
    <article className="card answer">
      {r.error && <p className="note">{r.error}</p>}
      {r.note && <p className="note">{r.note}</p>}
      {body && body.split(/\n{2,}/).map((p, i) => <p key={i}>{cite(p)}</p>)}
      {wording && (
        <div className="wording">
          <span className="label">Report wording</span>
          <p>{cite(wording)}</p>
          <button className="ghost" onClick={() => navigator.clipboard.writeText(wording.replace(/\s*\[\d+(?:,\s*\d+)*\]/g, ""))}>Copy</button>
        </div>
      )}
      {!!r.sources.length && (
        <ol className="cites">
          {r.sources.map((s) => (
            <li key={s.n} value={s.n}><a href={href(s)} target="_blank" rel="noreferrer">{s.title}</a> <span>{s.kind === "guideline" ? "Guideline" : "Literature"} · {s.meta}</span></li>
          ))}
        </ol>
      )}
      <p className="handoff">Also ask
        {CONNECTORS.filter((c) => ["pubmed", "openevidence", "consensus"].includes(c.id)).map((c) => (
          <a key={c.id} href={c.url!.endsWith("=") ? c.url + encodeURIComponent(q) : c.url} target="_blank" rel="noreferrer">{c.name}</a>
        ))}
      </p>
    </article>
  );
}
