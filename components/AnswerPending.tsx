"use client";
// Placeholder where the written answer will appear. It says what is happening and, on the slow keyless tier,
// how long to expect, because a silent 20-second wait reads as "nothing happened".
import { useEffect, useState } from "react";
import type { AskResponse } from "@/lib/types";

export function AnswerPending({ provider, sources }: { provider: AskResponse["provider"]; sources: number }) {
  const [s, setS] = useState(0);
  useEffect(() => { const t = setInterval(() => setS((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const slow = provider === "keyless";
  return (
    <article className="card answer pending" role="status">
      <p className="pending-head">
        <span className="dot" aria-hidden="true" />
        Reading {sources} sources and writing a cited answer… <b>{s}s</b>
      </p>
      <div className="skeleton" aria-hidden="true"><i /><i /><i /></div>
      <p className="pending-note">
        {slow && s >= 6
          ? "The free model is slow and can take up to 30 seconds. The sources below are already the evidence: read them while you wait."
          : "The sources below are ready. The answer will appear here."}
      </p>
    </article>
  );
}
