// Statistics used in the study's Data Analysis section:
// weighted mean & SD, paired-samples t, independent-samples t, Cohen's d, Pearson r.
// Two-tailed p-values come from the Student t distribution (regularized incomplete beta).

export function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN
}

export function sd(xs: number[]) {
  if (xs.length < 2) return NaN
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1))
}

// ---- Student t distribution ----
function logGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
  let y = x
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5)
  let ser = 1.000000000190015
  for (const ci of c) ser += ci / ++y
  return -tmp + Math.log((2.5066282746310005 * ser) / x)
}

function betacf(a: number, b: number, x: number) {
  const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300
  const qab = a + b, qap = a + 1, qam = a - 1
  let c = 1, d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d; h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

function incompleteBeta(x: number, a: number, b: number) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b
}

/** Two-tailed p-value for a t statistic with df degrees of freedom. */
export function tTestP(t: number, df: number) {
  if (!Number.isFinite(t) || df <= 0) return NaN
  return incompleteBeta(df / (df + t * t), df / 2, 0.5)
}

export interface TTest {
  n: number
  meanDiff: number
  t: number
  df: number
  p: number
  d: number
}

/** Paired-samples t-test (pretest vs posttest within a group). */
export function pairedTTest(before: number[], after: number[]): TTest | null {
  const n = Math.min(before.length, after.length)
  if (n < 2) return null
  const diffs = Array.from({ length: n }, (_, i) => after[i] - before[i])
  const md = mean(diffs)
  const s = sd(diffs)
  const t = s === 0 ? (md === 0 ? 0 : Infinity) : md / (s / Math.sqrt(n))
  return { n, meanDiff: md, t, df: n - 1, p: s === 0 ? (md === 0 ? 1 : 0) : tTestP(t, n - 1), d: s === 0 ? 0 : md / s }
}

/** Independent-samples t-test (pooled variance) — e.g. gain scores, experimental vs control. */
export function independentTTest(a: number[], b: number[]): TTest | null {
  if (a.length < 2 || b.length < 2) return null
  const ma = mean(a), mb = mean(b)
  const va = sd(a) ** 2, vb = sd(b) ** 2
  const df = a.length + b.length - 2
  const pooled = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / df)
  const se = pooled * Math.sqrt(1 / a.length + 1 / b.length)
  const t = se === 0 ? 0 : (ma - mb) / se
  return { n: a.length + b.length, meanDiff: ma - mb, t, df, p: se === 0 ? 1 : tTestP(t, df), d: pooled === 0 ? 0 : (ma - mb) / pooled }
}

export function pearson(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length)
  if (n < 3) return null
  const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n))
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my)
    sxx += (x[i] - mx) ** 2
    syy += (y[i] - my) ** 2
  }
  if (sxx === 0 || syy === 0) return null
  const r = sxy / Math.sqrt(sxx * syy)
  const t = r * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r))
  return { r, n, p: tTestP(t, n - 2) }
}

// ---- Interpretation scales ----
export function effectSizeLabel(d: number) {
  const a = Math.abs(d)
  if (a >= 0.8) return 'Large'
  if (a >= 0.5) return 'Medium'
  if (a >= 0.2) return 'Small'
  return 'Negligible'
}

export function correlationLabel(r: number) {
  const a = Math.abs(r)
  if (a >= 0.7) return 'Strong'
  if (a >= 0.4) return 'Moderate'
  if (a >= 0.2) return 'Weak'
  return 'Very weak / none'
}

/** Five-point Likert weighted-mean interpretation. */
export function likertLabel(m: number) {
  if (m >= 4.21) return 'Strongly Agree'
  if (m >= 3.41) return 'Agree'
  if (m >= 2.61) return 'Neutral'
  if (m >= 1.81) return 'Disagree'
  return 'Strongly Disagree'
}

/** SUS adjective rating & grade (Bangor, Kortum & Miller, 2009; Sauro & Lewis). */
export function susLabel(score: number) {
  if (score >= 84.1) return { adjective: 'Best Imaginable', grade: 'A+', acceptable: true }
  if (score >= 80.3) return { adjective: 'Excellent', grade: 'A', acceptable: true }
  if (score >= 68) return { adjective: 'Good', grade: 'B–C', acceptable: true }
  if (score >= 51) return { adjective: 'OK / Fair', grade: 'D', acceptable: false }
  if (score >= 25) return { adjective: 'Poor', grade: 'F', acceptable: false }
  return { adjective: 'Worst Imaginable', grade: 'F', acceptable: false }
}

/** Item difficulty index interpretation (proportion correct). */
export function difficultyLabel(p: number) {
  if (p > 0.8) return 'Very easy'
  if (p > 0.6) return 'Easy'
  if (p > 0.4) return 'Average'
  if (p > 0.2) return 'Difficult'
  return 'Very difficult'
}

export const fmt = (n: number | null | undefined, digits = 2) =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toFixed(digits)

export const fmtP = (p: number | null | undefined) =>
  p === null || p === undefined || !Number.isFinite(p) ? '—' : p < 0.001 ? '< .001' : p.toFixed(3)
