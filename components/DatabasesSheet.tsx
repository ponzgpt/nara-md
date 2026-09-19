"use client";
// The databases Neuronara searches, and the one access setting a clinician may need: their library proxy.
// On a phone it is a bottom sheet with four ways out, so it can never trap the user:
//   × in a sticky header · tap outside · swipe the handle down · Escape (and the Done button at the end).
import { forwardRef, useRef } from "react";
import { CONNECTORS, GLOBAL_SOCIETIES, REGIONS, SOCIETY_SITES } from "@/lib/catalog";

const KIND = { live: "Live", proxy: "Via your library", link: "Hand-off" };

type Props = { region: string; proxy: string; onProxy: (v: string) => void };

export const DatabasesSheet = forwardRef<HTMLDialogElement, Props>(function DatabasesSheet({ region, proxy, onProxy }, ref) {
  const societies = [...GLOBAL_SOCIETIES, ...REGIONS[region].societies].filter((s) => SOCIETY_SITES[s]);
  const startY = useRef<number | null>(null);
  const close = (el: HTMLElement) => el.closest("dialog")?.close();

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="sources-title"
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
      <form method="dialog">
        <header className="sheet-head">
          <div className="sheet-handle" aria-hidden="true"
            onTouchStart={(e) => { startY.current = e.touches[0].clientY; }}
            onTouchMove={(e) => { if (startY.current !== null && e.touches[0].clientY - startY.current > 70) { startY.current = null; close(e.currentTarget); } }}
            onTouchEnd={() => { startY.current = null; }} />
          <h2 id="sources-title">Databases &amp; access</h2>
          <button className="icon" aria-label="Close" autoFocus>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
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
