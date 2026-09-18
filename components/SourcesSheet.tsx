"use client";
// Where answers come from, plus the one access setting a clinician may need: their library proxy.
import { forwardRef } from "react";
import { CONNECTORS, GLOBAL_SOCIETIES, REGIONS, SOCIETY_SITES } from "@/lib/catalog";

const KIND = { live: "Live", proxy: "Via your library", link: "Hand-off" };

type Props = { region: string; proxy: string; onProxy: (v: string) => void };

export const SourcesSheet = forwardRef<HTMLDialogElement, Props>(function SourcesSheet({ region, proxy, onProxy }, ref) {
  const societies = [...GLOBAL_SOCIETIES, ...REGIONS[region].societies].filter((s) => SOCIETY_SITES[s]);
  return (
    <dialog ref={ref} className="sheet" aria-labelledby="sources-title">
      <form method="dialog">
        <h2 id="sources-title">Sources &amp; access</h2>
        <ul className="sources">
          {CONNECTORS.map((c) => (
            <li key={c.id}>
              <div><b>{c.name}</b><span className={`tag ${c.kind}`}>{KIND[c.kind]}</span></div>
              <p>{c.access}. {c.note}</p>
            </li>
          ))}
        </ul>
        <label>
          Library proxy prefix
          <span>Paywalled articles open through your institution. Ask your library for the EZproxy or OpenAthens prefix.</span>
          <input type="url" defaultValue={proxy} placeholder="https://proxy.yourlibrary.edu/login?url="
            onChange={(e) => onProxy(e.target.value.trim())} />
        </label>
        <div>
          <span className="eyebrow">Societies for {REGIONS[region].label}</span>
          <p className="societies">
            {societies.map((s) => <a key={s} href={SOCIETY_SITES[s]} target="_blank" rel="noreferrer">{s}</a>)}
          </p>
        </div>
        <footer><button>Done</button></footer>
      </form>
    </dialog>
  );
});
