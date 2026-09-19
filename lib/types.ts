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

export type AskResponse = { answer: string | null; sources: Source[]; note?: string; error?: string };
