// The full curated library: journal papers resolved through Europe PMC (data/library.json, `npm run library`)
// plus national society documents verified from their own sites (data/national.json, `npm run library:national`).
import pubmed from "@/data/library.json";
import national from "@/data/national.json";
import type { Entry } from "@/lib/search";

export const LIBRARY = [...(pubmed as Entry[]), ...(national as Entry[])];
