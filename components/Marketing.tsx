// What NaraMD does, shown below the search while the page is idle. Copy: UK English, plain, direct.
import library from "@/data/library.json";

const FEATURES = [
  { title: "Every standard in one place", body: "Diagnostic criteria, terminology, technical standards and protocols from the societies that write them. Each one is linked to its source." },
  { title: "Compares instead of guessing", body: "When societies disagree or a version changes, NaraMD shows each side with its citation. If the sources don't settle the question, it says so." },
  { title: "Speaks neurophysiology", body: "Type the way you talk at the reporting desk: CTS, NCSE, LPD, SSEP, MSLT. NaraMD knows what you mean." },
  { title: "Knows where you practise", body: "BSCN in the UK, ACNS and AANEM in the US, JSCN in Japan. International bodies always, and your local ones first." },
  { title: "Fits your practice", body: "Only carpal tunnels? The whole EEG, EMG and IONM service? Scope NaraMD to what you actually do." },
  { title: "Uses the access you already have", body: "Add your library's OpenAthens or EZproxy link and paywalled papers open through your trust or university." },
];

const SOCIETIES = ["IFCN", "ILAE", "ACNS", "AANEM", "AASM", "BSCN", "EAN", "PNS", "ISIN", "ISCEV"];

const FAQ = [
  { q: "Is it free?", a: "Yes, while NaraMD is in pilot. There's no account and nothing to install." },
  { q: "Where do the answers come from?", a: `From a curated library of ${library.length} society guidelines and consensus papers, each checked against its DOI or PubMed record, plus a live search of Europe PMC, which includes MEDLINE. An AI model writes the answer from those sources only and shows you every one.` },
  { q: "Does it replace OpenEvidence or Consensus?", a: "No. They cover all of medicine; NaraMD covers one specialty in depth. When your question is broad, NaraMD passes it to them in one click." },
  { q: "What happens to my question?", a: "It goes to Europe PMC, and to an AI provider that writes the answer. NaraMD stores nothing. Some free AI providers may keep prompts, which is one more reason never to type patient details." },
  { q: "Who is it for?", a: "Consultants, trainees and clinical physiologists in neurophysiology, and neurologists who carry out their own studies." },
];

export function Marketing() {
  return (
    <>
      <figure className="preview" aria-label="Example answer">
        <div className="preview-q"><span>Example</span>Awaji or Gold Coast criteria for ALS: what actually changed?</div>
        <p>
          The <b>Gold Coast criteria</b> (2020) simplify the diagnosis: progressive motor impairment with upper and lower motor neuron
          dysfunction in one body region, or lower motor neuron dysfunction in two, once other causes are excluded. They drop the
          possible/probable/definite categories<sup>1</sup>.
        </p>
        <p>
          <b>Awaji</b> (2008) is still the reference for how EMG findings count: fasciculation potentials carry the same weight as
          fibrillations when chronic neurogenic change is present<sup>2</sup>.
        </p>
        <div className="wording"><span className="eyebrow">Bottom line</span><p>Diagnose with Gold Coast (2020). Interpret the EMG with Awaji (2008).</p></div>
        <p className="preview-cite">
          <sup>1</sup> A proposal for new diagnostic criteria for ALS · <em>Clin Neurophysiol</em> 2020<br />
          <sup>2</sup> Electrodiagnostic criteria for diagnosis of ALS · <em>Clin Neurophysiol</em> 2008
        </p>
      </figure>

      <section className="l-block narrow">
        <h2>Three societies. Two versions. One question.</h2>
        <p>Awaji or Gold Coast? ACNS terminology from 2012 or 2021? Whose minimum EEG standard does your department follow, IFCN&apos;s or ACNS&apos;s?</p>
        <p>The answers exist. They&apos;re spread across society websites, journals and PDFs from different decades, and some sit behind paywalls.</p>
        <p className="punch">NaraMD puts them side by side and tells you which applies.</p>
      </section>

      <section className="l-block">
        <h2 className="center">What NaraMD does for you</h2>
        <div className="grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature"><h3>{f.title}</h3><p>{f.body}</p></article>
          ))}
        </div>
      </section>

      <section className="l-block">
        <h2 className="center">Ask. Compare. Use.</h2>
        <ol className="steps">
          <li><b>Ask</b><span>Type the question as you&apos;d put it to a colleague, abbreviations included.</span></li>
          <li><b>Compare</b><span>See which standard applies, where it differs from the others, and the source for each.</span></li>
          <li><b>Use</b><span>Take the bottom line into your report, protocol, audit or teaching.</span></li>
        </ol>
      </section>

      <section className="l-block narrow center">
        <h2>Built on the guidance you already trust</h2>
        <p className="soc-strip">{SOCIETIES.join(" · ")}</p>
        <p className="fine">Plus the open literature through Europe PMC. NaraMD is independent and is not affiliated with or endorsed by these organisations.</p>
      </section>

      <section className="l-block narrow">
        <h2>What NaraMD is not</h2>
        <ul className="nots">
          <li><b>Not a substitute for your judgement.</b> It shows you the evidence. You read the trace.</li>
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
    </>
  );
}
