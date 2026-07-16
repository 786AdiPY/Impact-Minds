import { useEffect, useRef, useState } from 'react';

const SECTIONS = [
  {
    id: 'problem', n: '01', label: 'The Problem',
    h: 'A bank sees too few confirmed insider incidents to train a model on.',
    body: "A bank with 85,000 employees confirms three to eight insider incidents a year, about thirty over five years against billions of routine transactions. That is not enough positive data to train or validate a supervised classifier, so any tool quoting 99% accuracy is testing on synthetic data, not real cases. The design here ranks unusual sessions for review instead of claiming an accuracy figure it cannot support.",
  },
  {
    id: 'chokepoint', n: '02', label: 'The Chokepoint',
    h: 'Every privileged session runs through a broker instead of a direct login.',
    body: "The user never sees the actual credential. The broker holds it, injects it into the session, and rotates it once the session closes. If a credential is phished or leaked, there is nothing usable behind it, and every session produces its own audit trail instead of a shared account log the bank has to reconstruct after the fact.",
  },
  {
    id: 'cbom', n: '03', label: 'CBOM, For Free',
    h: 'The broker logs which encryption algorithm each session actually used.',
    body: "This gives the bank a live inventory of post-quantum versus classical key exchange across every connected host, without running a separate scanner that only sees what is installed, not what was negotiated. RBI's Q-SAFE Committee has named this kind of inventory, a Cryptography Bill of Materials, as a required deliverable, so a bank already producing one has less work left when that requirement lands.",
    code: 'ML-KEM hybrid (FIPS 203), NTRU Prime (PQ, non-NIST), Classical: reported as three separate categories',
  },
  {
    id: 'pq-honest', n: '04', label: 'The Honest PQ Answer',
    h: 'Key exchange is post-quantum. Login certificates are still classical.',
    body: "OpenSSH has no post-quantum signature algorithm yet, so SSH login still relies on Ed25519. That gap is disclosed rather than hidden, and it matters less than it sounds: a signature cannot be forged after the fact, so there is no urgency there. The real exposure is data at rest, session recordings kept for years, which is why those are encrypted with a post-quantum hybrid scheme regardless.",
  },
  {
    id: 'engine', n: '05', label: 'ML Ranks, Rules Decide',
    h: 'Every risk score breaks down into the exact inputs that produced it.',
    body: "The scoring function is additive and closed-form, so each signal's contribution to a score can be shown exactly, not estimated afterward with a method like SHAP. An analyst or auditor can see precisely why a session was flagged. The model only ranks sessions for review; a separate, fixed set of rules decides enforcement, so the decision itself stays auditable and testable on its own.",
    code: 'assert |Σ logit_delta − logit| < 1e-6   // exact, not estimated',
  },
  {
    id: 'deception', n: '06', label: 'Deception Layer',
    h: 'Decoy credentials and tables trigger an automatic session kill.',
    body: "A honeytoken credential and a decoy database table exist only as bait, never referenced by any real application. Any access to either is treated as confirmed malicious, and the session is terminated immediately, with no false-positive risk since there is no legitimate reason to touch them. This catches a first-time insider with zero prior activity, a case a behavioral model has no history to compare against.",
  },
  {
    id: 'drift', n: '07', label: 'Baseline Drift',
    h: 'A user\'s own baseline is checked for gradual manipulation.',
    body: "An insider can avoid tripping anomaly detection by raising their activity slowly over weeks, so their personal baseline moves with them and never registers a spike. The system separately tracks how much a person's own baseline has shifted over 90 days and flags large increases, and compares each person against peers who access the same systems rather than against their own history alone.",
  },
  {
    id: 'redact', n: '08', label: 'Redact-at-Seal',
    h: 'Aadhaar, PAN, and card numbers are redacted before a recording is stored.',
    body: "A session recording otherwise retains every identifier a user viewed on screen, kept for up to ten years under standard retention rules, which becomes a large, unmonitored store of personal data under DPDP. Identifiers are validated (Aadhaar via checksum, cards via Luhn) and replaced with a keyed hash at seal time, so an analyst can still see that the same identifier recurred without ever seeing the value. Reversing it requires two-of-three approval and a logged legal reason.",
  },
  {
    id: 'proof', n: '09', label: 'No Blockchain',
    h: 'Every logged command can be proven unaltered without a blockchain.',
    body: "Each command is included in a signed daily checkpoint using a Merkle tree, and that checkpoint is timestamped by a free, independent third-party authority under RFC 3161. This gives tamper-evidence and third-party proof of when a record existed, at a fraction of the cost of signing every event individually or running blockchain consensus for a single-writer log.",
    code: 'openssl ts -query -data chain_head.bin -sha512 | curl freetsa.org/tsr   // third-party, zero cost',
  },
  {
    id: 'rubberstamp', n: '10', label: 'The Rubber Stamp',
    h: 'One query checks whether maker-checker approvals are genuine review.',
    body: "Maker-checker assumes the approver reviews independently, but that assumption is rarely tested. A single query over approval history can surface an approver who denied none of one requester's access requests over many months, each approved in under a minute. That is a real governance gap, found with one query and no model.",
  },
  {
    id: 'autorevoke', n: '11', label: 'Auto-Revoke',
    h: 'Unused standing access is revoked automatically after 90 days.',
    body: "Privileged entitlements left unused for 90 days are revoked automatically, with notice sent to the holder and their manager first. In shadow-mode testing, 62% of standing privileged entitlements had never been used at all. Removing them cuts the attack surface directly, before any detection model needs to run.",
  },
  {
    id: 'queue', n: '12', label: 'Alert Budget',
    h: 'Analysts see a fixed number of alerts a day, not everything above a threshold.',
    body: "A threshold-based system can flood an analyst with alerts on a bad day, and an analyst dismissing two hundred alerts is more likely to miss the one that matters. The queue is capped at a fixed number of the highest-ranked sessions per day instead, which forces the ranking to be accurate rather than relying on alert volume staying manageable.",
  },
  {
    id: 'llm', n: '13', label: 'Where the LLM Goes',
    h: 'The LLM drafts summaries. It never scores risk or decides access.',
    body: "A language model is used only to draft an investigator's narrative and summarize a session for triage, both reviewed by a human before use. It never computes the risk score, explains it, or makes the access decision, because those steps involve reading the user's own commands, and a model reading that text could be manipulated by a prompt injected into it. Keeping scoring and decisions deterministic removes that risk.",
    code: 'score, explanation, access decision: deterministic, never the LLM',
  },
  {
    id: 'arsenal', n: '14', label: 'The Rest of the Arsenal',
    h: 'Additional controls already implemented.',
    body: "Two-person access control on the highest-tier systems requires two authorized people in the session at once, either can end it, neither can act alone. Destructive actions such as deleting a recording are delayed 24 hours with a veto window. Sessions tied to a support ticket end automatically shortly after that ticket closes. Peer groups for behavioral comparison are built from actual access patterns instead of the org chart. Keystroke timing is used only as a supporting signal to flag a possible handover mid-session, never as authentication.",
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
