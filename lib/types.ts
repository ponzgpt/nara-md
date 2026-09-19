// Wire types shared by /api/ask and the page.

export type Source = {
  n: number;
  kind: "guideline" | "literature";
  title: string;
  meta: string;
  doi: string | null;
  pmid: string | null;
  url?: string;
  openAccess: boolean;
  abstract: string;
};

// What the page holds while and after asking. `provider` is set once sources arrive; `pending` until the answer event.
export type AskResponse = { answer: string | null; sources: Source[]; note?: string; error?: string; provider?: "anthropic" | "openrouter" | "keyless" | "none"; pending?: boolean };

/** /api/ask streams newline-delimited JSON: sources as soon as retrieval finishes, the answer when it's written. */
export type AskEvent =
  | { type: "sources"; sources: Source[]; provider: "anthropic" | "openrouter" | "keyless" | "none" }
  | { type: "answer"; answer: string | null; note?: string };
