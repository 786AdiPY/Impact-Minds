import { useRef } from 'react';
import GlintLogo from './GlintLogo.jsx';
import Portfolio from './Portfolio.jsx';

const NAV_LINKS = ['Platform', 'Detection', 'Compliance', 'Contact'];
const DEMO_VIDEO_URL = 'https://drive.google.com/file/d/1w2L1zqdJJ6jwAlUp1MBBb1fvlaYs11N6/view?usp=sharing';

export default function Landing({ onEnter }) {
  const pfRef = useRef(null);
  const scrollToPortfolio = () => pfRef.current?.scrollIntoView({ behavior: 'smooth' });
  const openDemo = () => window.open(DEMO_VIDEO_URL, '_blank', 'noopener,noreferrer');

  return (
    <div className="land">
      <div className="land-shard land-shard-a" />
      <div className="land-shard land-shard-b" />
      <div className="land-shard land-shard-c" />

      <nav className="land-nav">
        <div className="land-brand">
          <GlintLogo size={22} showMark />
        </div>
        <div className="land-links">
          {NAV_LINKS.map((l) => <a key={l} href="#">{l}</a>)}
        </div>
        <div className="land-nav-actions">
          <button className="btn btn-g" onClick={onEnter}>Sign In</button>
          <button className="btn btn-p" onClick={onEnter}>Enter Console</button>
        </div>
      </nav>

      <header className="land-hero">
        <button className="play-btn" onClick={openDemo} aria-label="Watch the demo video">
          <span className="play-icon">▶</span>
        </button>
        <div className="play-label">Click to watch the demo</div>

        <h1>
          Insider Threats Don't<br />Announce Themselves.
        </h1>
        <p className="land-sub">
          GLINT brokers every privileged session, scores it in real time, and shows the
          exact receipt behind every risk point — no black box, no standing credentials,
          nothing an auditor can't read.
        </p>

        <div className="land-cta-row">
          <div className="land-input">
            <input type="text" placeholder="Enter your workspace domain" />
            <button className="btn btn-p" onClick={onEnter}>Launch Console</button>
          </div>
        </div>

        <button className="land-scroll" onClick={scrollToPortfolio} aria-label="Scroll to learn more">↓</button>
      </header>

      <section className="land-stats">
        {[
          { v: '0', k: 'Broker bypasses tolerated', note: 'PAM-R001 · always P1' },
          { v: '1e-6', k: 'Attribution error', note: 'exact, not SHAP' },
          { v: '<3s', k: 'Detection → session killed', note: 'p99, drill-verified' },
          { v: '≤15', k: 'Alerts per analyst / day', note: 'fixed queue, no fatigue' },
        ].map((s) => (
          <div className="stat" key={s.k}>
            <div className="stat-v">{s.v}</div>
            <div className="stat-k">{s.k}</div>
            <div className="stat-n">{s.note}</div>
          </div>
        ))}
      </section>

      <section className="land-feat">
        <div className="feat-card">
          <div className="feat-icon">◧</div>
          <h3>Ranked, not raw</h3>
          <p>A fixed top-N threat queue — of 22,000 sessions today, these are the ones that need a human.</p>
        </div>
        <div className="feat-card">
          <div className="feat-icon">◈</div>
          <h3>Rules decide, ML ranks</h3>
          <p>Enforcement is deterministic and auditable. The model orders the queue — it never holds the trigger.</p>
        </div>
        <div className="feat-card">
          <div className="feat-icon">◉</div>
          <h3>Kill in real time</h3>
          <p>Sessions that cross CRITICAL terminate and the credential rotates — before the export finishes.</p>
        </div>
      </section>

      <div ref={pfRef}>
        <Portfolio />
      </div>

      <footer className="land-foot">
        <span>GLINT — Privileged Access Governance</span>
        <button className="btn btn-p" onClick={onEnter}>Enter Console →</button>
      </footer>
    </div>
  );
}
