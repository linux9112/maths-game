/**
 * Core mathematical engine for calculation weakness tracking,
 * Laplace smoothing error rates, and response latency multipliers.
 */

export const MAX_LATENCY_MS = 15000;
export const MIN_WEAKNESS_SCORE = 0.01;
export const MAX_WEAKNESS_SCORE = 4.0;

/**
 * Laplace Smoothing Error Rate (Rule of Succession):
 * E = (mistakes + 1) / (attempts + 2)
 *
 * Guaranteed mathematical invariants:
 * - Uninformed prior: E(0, 0) = 0.5000
 * - Strictly bounded within (0, 1) for any N >= 0, 0 <= M <= N
 * - Monotonically increasing with mistakes: dE/dM > 0
 * - Monotonically decreasing with correct attempts: dE/dN < 0 (fixed M)
 */
export function calculateLaplaceErrorRate(mistakes: number, attempts: number): number {
  const safeMistakes = Math.max(0, isFinite(mistakes) ? mistakes : 0);
  const safeAttempts = Math.max(safeMistakes, isFinite(attempts) ? attempts : 0);
  return (safeMistakes + 1) / (safeAttempts + 2);
}

/**
 * Response Latency Multiplier:
 * L = 1 + ln(1 + cappedRT / 1000)
 * where cappedRT = clamp(avgResponseTimeMs, 0, 15000)
 *
 * Guaranteed mathematical invariants:
 * - Lower bound: L >= 1.0 (at RT = 0, L = 1.0)
 * - Sub-linear logarithmic damping prevents single stalls from skewing scores
 * - Monotonically increasing with response time up to safety cap
 * - Anti-AFK protection: capped at RT_max = 15,000 ms (~3.773)
 */
export function calculateLatencyMultiplier(avgResponseTimeMs: number): number {
  const safeRt = Math.max(0, isFinite(avgResponseTimeMs) ? avgResponseTimeMs : 0);
  const cappedRt = Math.min(safeRt, MAX_LATENCY_MS);
  return 1 + Math.log(1 + cappedRt / 1000);
}

/**
 * Composite Weakness Score:
 * W = E * L
 * Clamped to [0.01, 4.0] and rounded to 4 decimal places for stable B-tree indexing.
 */
export function calculateCompositeWeaknessScore(
  mistakes: number,
  attempts: number,
  avgResponseTimeMs: number
): number {
  const errorRate = calculateLaplaceErrorRate(mistakes, attempts);
  const latencyMultiplier = calculateLatencyMultiplier(avgResponseTimeMs);
  const rawScore = errorRate * latencyMultiplier;

  const clamped = Math.max(MIN_WEAKNESS_SCORE, Math.min(rawScore, MAX_WEAKNESS_SCORE));
  return Math.round(clamped * 10000) / 10000;
}

/**
 * Pedagogical mastery score (0-100) combining accuracy, repetition depth, and fluency
 */
export function calculatePedagogicalMastery(
  attempts: number,
  mistakes: number,
  avgResponseTimeMs: number
): number {
  if (attempts <= 0) return 0;

  const correct = Math.max(0, attempts - mistakes);
  const accuracy = correct / attempts;

  // Repetition confidence factor (saturates at 10 attempts)
  const confidence = Math.min(1.0, attempts / 10);

  // Speed factor: 1.0 for <= 1500ms, drops to 0.5 at 4000ms, down to 0 at 10000ms
  const safeRt = Math.max(500, avgResponseTimeMs || 2500);
  let speedScore = 1.0;
  if (safeRt > 1500) {
    speedScore = Math.max(0, 1.0 - (safeRt - 1500) / 8500);
  }
  // Combined score: accuracy dominant (70%), speed weighted by accuracy (20%), depth (10%)
  const rawMastery = (accuracy * 0.7 + accuracy * confidence * 0.1 + accuracy * speedScore * 0.2) * 100;
  return Math.max(0, Math.min(100, Math.round(rawMastery)));
}
