// Landing page: what Nara does for a clinical neurophysiologist, in plain words. The product lives at /search.
import Link from "next/link";
import library from "@/data/library.json";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  { title: "Speaks neurophysiology", body: "Type the way you write reports: CTS, NCSE, LPD, SSEP, MSLT. Nara knows what you mean." },
  { title: "Cites everything", body: "Every sentence points to the guideline or paper behind it. If the sources don't settle the question, Nara says so instead of filling the gap." },
  { title: "Knows where you practise", body: "BSCN in the UK, ACNS and AANEM in the US, JSCN in Japan. The international bodies always, your local ones first." },
  { title: "Fits your list", body: "Carpal tunnels on a Tuesday, or the whole EEG, EMG and IONM service. Scope Nara to what you actually report." },
  { title: "Uses the access you already have", body: "Add your library's OpenAthens or EZproxy link and paywalled papers open through your trust or university." },
  { title: "Ready for the report", body: "Answers end with one line of wording you can paste straight in. The citations stay with you, not in the report." },
];

const SOCIETIES = ["IFCN", "ILAE", "ACNS", "AANEM", "AASM", "BSCN", "EAN", "PNS", "ISIN", "ISCEV"];

const FAQ = [
  { q: "Is it free?", a: "Yes, while Nara is in pilot. There's no account to create and nothing to install." },
  { q: "Where do the answers come from?", a: `A curated library of ${library.length} society guidelines, each checked against its DOI or PubMed record, plus a live search of Europe PMC, which includes MEDLINE. An AI model writes the answer from those sources only, and shows you every one.` },
  { q: "Does it replace OpenEvidence or Consensus?", a: "No. They cover all of medicine. Nara covers one specialty in depth. When your question is broad, Nara passes it to them in one click." },
  { q: "What happens to my question?", a: "It goes to Europe PMC and to an AI provider to write the answer. Nara stores nothing. Some free AI providers may keep prompts, which is one more reason never to type patient details." },
  { q: "Who is it for?", a: "Consultants, trainees and clinical physiologists in neurophysiology, and neurologists who report their own studies." },
];

export default function Landing() {
  return (
    <>
      <header className="bar">
        <Brand />
        <nav>
          <a className="ghost-link" href="#how">How it works</a>
          <Link className="btn small" href="/search">Open Nara</Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="landing">
        <section className="l-hero">
          <p className="kicker">For clinical neurophysiologists</p>
          <h1>The guideline, before the report is signed.</h1>
          <p className="lede">
            The study is done. One question stands between you and the signature.
            Nara finds the society guidance that settles it, cites it, and gives you a line for the report.
          </p>
          <div className="ctas">
            <Link className="btn" href="/search">Open Nara. It&apos;s free</Link>
            <a className="btn ghost-btn" href="#how">See how it works</a>
          </div>
          <p className="micro">No account · No patient data · EEG, EMG/NCS, evoked potentials, sleep, IONM</p>

          <figure className="preview" aria-label="Example answer">
            <div className="preview-q"><span>Example</span>Right hemispheric periodic discharges at 1 Hz with superimposed fast activity. What do I call it?</div>
            <p>Under the ACNS 2021 critical care terminology these are <b>lateralized periodic discharges</b> with the “plus” modifier for superimposed fast activity: <b>LPDs+F</b><sup>1</sup>.</p>
            <div className="wording"><span className="eyebrow">Report wording</span><p>Lateralized periodic discharges, right hemisphere, 1 Hz, with superimposed fast activity (LPDs+F).</p></div>
            <p className="preview-cite"><sup>1</sup> American Clinical Neurophysiology Society&apos;s Standardized Critical Care EEG Terminology: 2021 Version · <em>J Clin Neurophysiol</em></p>
          </figure>
        </section>

        <section className="l-block narrow">
          <h2>You know this moment.</h2>
          <p>LPDs or GPDs? Mild or moderate carpal tunnel? Does this MSLT meet criteria?</p>
          <p>You know roughly where the answer is: somewhere between an ACNS PDF, a 2008 paper in <em>Clinical Neurophysiology</em> and a paywall your trust may or may not cover.</p>
          <p>Twenty minutes later, the report is still open.</p>
          <p className="punch">Nara gives you those twenty minutes back.</p>
        </section>

        <section className="l-block">
          <h2 className="center">What it does for you</h2>
          <div className="grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="feature"><h3>{f.title}</h3><p>{f.body}</p></article>
            ))}
          </div>
        </section>

        <section className="l-block" id="how">
          <h2 className="center">Three steps. About thirty seconds.</h2>
          <ol className="steps">
            <li><b>Ask</b><span>Type the question as it is in your head, shorthand included.</span></li>
            <li><b>Read</b><span>A short answer, guideline first, with every source one click away.</span></li>
            <li><b>Paste</b><span>Copy the report wording. Sign. Next patient.</span></li>
          </ol>
        </section>

        <section className="l-block narrow center">
          <h2>Built on the guidance you already trust</h2>
          <p className="soc-strip">{SOCIETIES.join(" · ")}</p>
          <p className="fine">Plus the open literature through Europe PMC. Nara is independent and is not affiliated with or endorsed by these organisations.</p>
        </section>

        <section className="l-block narrow">
          <h2>What Nara is not</h2>
          <ul className="nots">
            <li><b>Not a substitute for your judgement.</b> It points to the evidence. You read the trace.</li>
            <li><b>Not a general chatbot.</b> It answers from published sources and shows you each one.</li>
            <li><b>Not a place for patient data.</b> Ask about the finding, never about the patient.</li>
          </ul>
        </section>

        <section className="l-block narrow">
          <h2>Questions</h2>
          {FAQ.map((f) => (
            <details key={f.q} className="faq"><summary>{f.q}</summary><p>{f.a}</p></details>
          ))}
        </section>

        <section className="l-final">
          <h2>Your next report deserves thirty seconds, not thirty tabs.</h2>
          <Link className="btn" href="/search">Open Nara</Link>
        </section>
      </main>

      <footer className="foot">
        Nara MD answers from published sources and does not replace clinical judgement ·{" "}
        <a href="https://github.com/ponzgpt/nara-md" target="_blank" rel="noreferrer">Source on GitHub</a>
      </footer>
    </>
  );
}
