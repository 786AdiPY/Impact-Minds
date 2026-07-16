// Risk Fusion Engine — direct port of LLD §6.5.
// Contract: ML ranks, deterministic rules decide. This function produces a
// bounded score with EXACT additive attribution — every contribution's
// logit_delta sums to the final logit. No black box, no post-hoc SHAP.

// Evidence classes are designed to be ~independent so they add in log-odds.
export const EVIDENCE_CLASSES = ['IDENTITY', 'BEHAVIOUR', 'CONTENT', 'CONTEXT', 'RELATIONAL'];

// Per-class weight (w_c) and asset-tier multiplier (γ).
const CLASS_WEIGHT = { IDENTITY: 0.7, BEHAVIOUR: 0.85, CONTENT: 1.0, CONTEXT: 0.9, RELATIONAL: 0.8 };
const GAMMA = { 1: 0.6, 2: 0.85, 3: 1.05, 4: 1.3 }; // calibrated for spread, not saturation (§6.5 / App D#1)
const PRIOR = 0.02;                                 // base rate of a session worth review
const KAPPA = 9;
const LOGIT_CLAMP = 12;                             // §6.5: clamp L' to [L0, L0+12] to keep resolution

const logit = (p) => Math.log(p / (1 - p));
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const L0 = logit(PRIOR);

// §6.3.2 — robust one-sided saturating normalisation into evidence space [0,1).
// d = (x - median) / (1.4826*MAD + ε);  e = 1 - exp(-max(0, d - τ)/λ)
export function normalise(x, median, mad, { tau = 2.0, lambda = 4.0 } = {}) {
  const d = (x - median) / (1.4826 * mad + 1e-6);
  const e = 1 - Math.exp(-Math.max(0, d - tau) / lambda);
  return { d, e: Math.max(0, Math.min(0.999, e)) };
}

// logit-contrib(E) = ln(1 + κE): exactly 0 at no evidence, monotone-increasing,
// concave, bounded at +ln(1+κ) per class. One-sided by construction — evidence
// only ever ADDS to risk (§6.5 monotonicity invariant), never subtracts.
function logitContrib(E) {
  return Math.log(1 + KAPPA * E);
}

// noisy-OR within a class: E_c = 1 - Π(1 - ρ_k · e_k)
function noisyOr(features) {
  let prod = 1;
  for (const f of features) prod *= 1 - f.rho * f.e;
  return 1 - prod;
}

/**
 * fuse(features, tier) -> { score, logit, band, contributions[] }
 * features: [{ evidenceClass, featureKey, observed, e, rho, note }]
 *   e   = bounded evidence [0,1]  (from normalise() or a direct binary signal)
 *   rho = feature reliability [0,1] (precision that this signal reflects real anomaly)
 */
export function fuse(features, tier = 2) {
  const gamma = GAMMA[tier] ?? 1.0;

  // group by evidence class
  const byClass = {};
  for (const c of EVIDENCE_CLASSES) byClass[c] = [];
  for (const f of features) (byClass[f.evidenceClass] ||= []).push(f);

  const contributions = [];
  let L = L0;

  for (const c of EVIDENCE_CLASSES) {
    const fs = byClass[c] || [];
    if (fs.length === 0) continue;
    const Ec = noisyOr(fs);
    const wc = CLASS_WEIGHT[c] ?? 1.0;
    // raw class contribution before tier scaling
    const rawDelta = wc * logitContrib(Ec);
    // §6.5 step 3: tier amplifies deviation from prior, applied to positive evidence
    const scaledDelta = gamma * rawDelta;
    L += scaledDelta;

    // Attribute the class delta down to each feature proportional to its evidence,
    // so SUM(feature logit_delta) == class delta == total logit movement, exactly.
    const totalE = fs.reduce((s, f) => s + f.rho * f.e, 0) || 1;
    for (const f of fs) {
      const share = (f.rho * f.e) / totalE;
      contributions.push({
        evidenceClass: c,
        featureKey: f.featureKey,
        observed: f.observed,
        normalised: +f.e.toFixed(6),
        weight: +f.rho.toFixed(3),
        logit_delta: +(scaledDelta * share).toFixed(6),
        note: f.note || '',
      });
    }
  }

  // §6.5 step 3 fix: clamp so four corroborating classes don't saturate the
  // sigmoid and lose resolution exactly where it matters most.
  if (L > L0 + LOGIT_CLAMP) {
    const scale = LOGIT_CLAMP / (L - L0);
    for (const c of contributions) c.logit_delta = +(c.logit_delta * scale).toFixed(6);
    L = L0 + LOGIT_CLAMP;
  }

  const score = Math.round(100 * sigmoid(L));
  const band = score >= 86 ? 'CRITICAL' : score >= 61 ? 'HIGH' : score >= 31 ? 'MEDIUM' : 'LOW';

  return { score, logit: +L.toFixed(6), band, contributions };
}

// §6.5 step 5: rules override, they do not add. A fired CRIT rule pins the score.
export function applyRuleOverride(fused, firedRules) {
  const crit = firedRules.filter((r) => r.severity === 'CRIT');
  if (crit.length === 0) return fused;
  return {
    ...fused,
    score: Math.max(fused.score, 95),
    band: 'CRITICAL',
    overriddenBy: crit.map((r) => r.rule_id),
  };
}

// The attribution invariant (property-tested in the LLD). Exposed so the UI can
// assert it live and prove the receipt isn't lying.
export function attributionError(fused) {
  const sum = fused.contributions.reduce((s, c) => s + c.logit_delta, 0);
  return Math.abs((sum + L0) - fused.logit);
}
