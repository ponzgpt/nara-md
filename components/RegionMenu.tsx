"use client";
// Region picker styled like the theme toggle: a pill that opens a small menu.
// Keyboard: Enter/Space opens, arrows move, Escape closes and returns focus.
import { useEffect, useRef, useState } from "react";
import { REGIONS } from "@/lib/catalog";

const KEYS = Object.keys(REGIONS);

export function RegionMenu({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    addEventListener("pointerdown", outside);
    wrap.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    return () => removeEventListener("pointerdown", outside);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = [...(wrap.current?.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]") ?? [])];
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
    }
  };

  return (
    <div className="menu-wrap" ref={wrap} onKeyDown={onKey}>
      <button ref={button} className="pill" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        aria-label={`Region: ${REGIONS[value].label}`} title="Where you practise">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
        {REGIONS[value].short}
      </button>
      {open && (
        <div className="menu" role="menu" aria-label="Where you practise">
          <p className="menu-title">Where you practise</p>
          {KEYS.map((k) => (
            <button key={k} role="menuitemradio" aria-checked={k === value} onClick={() => { onChange(k); setOpen(false); button.current?.focus(); }}>
              <span>{REGIONS[k].label}</span>
              {REGIONS[k].societies.length > 0 && <small>{REGIONS[k].societies.slice(0, 3).join(" · ")}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
