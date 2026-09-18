// "/" is both the product and its landing page: the search is the hero, the story sits below it.
import { Home } from "@/components/Home";
import { Marketing } from "@/components/Marketing";

// Size of the open literature NaraMD searches, refreshed daily. Falls back to a floor if Europe PMC is down.
async function literatureSize(): Promise<number> {
  try {
    const res = await fetch("https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&pageSize=1&query=(SRC:MED%20OR%20SRC:PMC)",
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(5000) });
    return (await res.json()).hitCount;
  } catch {
    return 40_000_000;
  }
}

export default async function Page() {
  const papers = `${Math.floor((await literatureSize()) / 1e6)}M`;
  return <Home papers={papers}><Marketing /></Home>;
}
