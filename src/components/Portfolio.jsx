import { useEffect, useRef, useState } from 'react';

const SECTIONS = [
  {
    id: 'problem', n: '01', label: 'The Problem',
    h: 'Insider threat detection is a solved problem that nobody has solved.',
    body: "A bank with 85,000 employees sees three to eight confirmed insider incidents a year. Over five years that's maybe thirty positive examples against ten billion negatives. That's not a class-imbalance problem — it's an absence-of-data problem. No supervised classifier survives contact with that math, and anyone quoting 99% accuracy trained it on a synthetic generator.",
    stat: { v: '30', k: 'confirmed incidents, 5 years, 85k staff' },
  },
  {
    id: 'chokepoint', n: '02', label: 'The Chokepoint',
    h: "We didn't build a detector. We built the control, and the detector fell out of it.",
    body: 'Every privileged session is brokered. The human never learns the credential — the broker holds it, injects it, and rotates it on close. Credential theft isn\'t detected here, it\'s deleted: there\'s nothing standing to steal. The session, not the account, becomes the unit of audit.',
    stat: { v: '0', k: 'standing credentials a human ever sees' },
  },
  {
    id: 'engine', n: '03', label: 'ML Ranks, Rules Decide',
    h: 'The model orders the queue. It never holds the trigger.',
    body: 'Risk is a pure function: robust median/MAD normalisation, noisy-OR within five evidence classes, log-odds fusion across classes, an asset-tier multiplier. Every contribution is attributed — not approximated with SHAP, not a black box. Enforcement is a separate layer of deterministic rules that can be unit-tested and read by an auditor.',
    code: 'assert |Σ logit_delta − logit| < 1e-6   // property-tested, not estimated',
  },
  {
    id: 'deception', n: '04', label: 'Deception Layer',
    h: 'Precision 1.0. Zero machine learning. Works on day one.',
    body: 'A decoy table no application has ever referenced. A honeytoken credential nothing legitimately checks out. There is no false positive, because there is no legitimate reason to touch either — and it needs no baseline, so it catches a brand-new insider with zero history on their first session, exactly where every statistical model is blind.',
    stat: { v: '1.0', k: 'precision — by construction, not by tuning' },
  },
  {
    id: 'compliance', n: '05', label: 'Compliance, Automatically',
    h: 'Auditors don\'t want architecture diagrams. They want evidence, on a schedule.',
    body: "A live cryptographic bill of materials from negotiated key exchange, not installed-version guesswork. A one-query finding that an approver rubber-stamped one maker's requests for six months. A number — 62% of standing privilege never exercised — that survives the walk back to the judging room.",
    stat: { v: '62%', k: 'standing privilege never exercised, auto-revoked' },
  },
  {
    id: 'honest', n: '06', label: 'What\'s Actually Real',
    h: 'The brain is real. The pipes are simulated. We\'re telling you which is which.',
    body: 'The fusion engine, the rule evaluator, the attribution invariant, the deception logic — all real, all running in your browser right now, scoring seeded sessions exactly as they would score live telemetry. What isn\'t real yet: the SSH/pgwire broker, the credential vault, the Kafka pipeline. That\'s infrastructure, not intelligence — and it\'s the well-scoped next step, not a hidden gap.',
  },
  {
    id: 'stack', n: '07', label: 'The Stack',
    h: 'No backend required to prove the thesis.',
    body: 'React and Supabase. The entire detection engine — normalisation, fusion, rules, attribution — is client-side JavaScript, deterministic and dependency-free. That\'s deliberate: the console works with no network, so a demo can\'t be broken by wifi, and the same engine is the one that would run inline in a real broker\'s risk service.',
  },
];

export default function Portfolio() {
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const idx = refs.current.indexOf(e.target);
          if (e.isIntersecting) {
            e.target.classList.add('pf-in');
            if (idx !== -1) setActive(idx);
          }
        });
      },
      { threshold: 0.35, rootMargin: '-10% 0px -10% 0px' }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const jump = (i) => refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <section className="pf">
      <div className="pf-rail">
        {SECTIONS.map((s, i) => (
          <button key={s.id} className={`pf-dot-row ${active === i ? 'on' : ''}`} onClick={() => jump(i)}>
            <span className="pf-dot" />
            <span className="pf-dot-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="pf-sections">
        {SECTIONS.map((s, i) => (
          <div className="pf-section" key={s.id} ref={(el) => (refs.current[i] = el)}>
            <div className="pf-n">{s.n}</div>
            <h2 className="pf-h">{s.h}</h2>
            <p className="pf-body">{s.body}</p>
            {s.stat && (
              <div className="pf-stat">
                <div className="pf-stat-v">{s.stat.v}</div>
                <div className="pf-stat-k">{s.stat.k}</div>
              </div>
            )}
            {s.code && <div className="pf-code mono">{s.code}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
