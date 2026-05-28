import type { HairMethod, GptVisionResult, ComputedAnalysis } from './types.js';

// ── Pricing Matrix ──────────────────────────────────────────────────────────
export const VALID_LENGTHS = [18, 20, 22, 24, 26, 28] as const;
export type ValidLength = (typeof VALID_LENGTHS)[number];

export const PRICING_MATRIX: Record<HairMethod, Record<ValidLength, number>> = {
  STANDARD_KTIP:     { 18: 2000, 20: 2100, 22: 2300, 24: 2400, 26: 2700, 28: 3100 },
  MICRO_KTIP:        { 18: 2400, 20: 2500, 22: 2700, 24: 2900, 26: 3200, 28: 3600 },
  NANO_MICRO_HYBRID: { 18: 2800, 20: 3000, 22: 3300, 24: 3600, 26: 4000, 28: 4400 },
};

export const BALAYAGE_ADDON_PRICE = 350;

// Snap the client's dream length to the nearest valid tier (round up for safety)
export function resolveLength(raw: number): ValidLength {
  const sorted = [...VALID_LENGTHS].sort((a, b) => a - b);
  for (const len of sorted) {
    if (raw <= len) return len;
  }
  return 28;
}

// ── Heuristic Rules ─────────────────────────────────────────────────────────

interface HeuristicInput {
  dream_length: number;
  user_reported_density: string;
  gpt: GptVisionResult | null;
  client_notes: string;
}

interface HeuristicOutput {
  recommended_method: HairMethod;
  hair_length_used: ValidLength;
  total_price: number;
  deposit_required: number;
  honor_upgrade: boolean;
  disconnected_canopy: boolean;
  high_density_side_fill: boolean;
  grams_required: number;
}

export function applyHeuristics(input: HeuristicInput): HeuristicOutput {
  const { dream_length, user_reported_density, gpt, client_notes } = input;
  const densityLower = user_reported_density.toLowerCase();

  // ── Rule 1: Disconnected Canopy Detection ─────────────────────────────────
  // GPT vision takes precedence; fall back to keyword scan of client notes
  const canopyKeywords = /blunt.?cut|mullet|canopy|heavy.?line|shelf|hard.?line|disconnect/i;
  const disconnected_canopy =
    (gpt?.disconnected_canopy_detected && gpt.disconnected_canopy_confidence >= 0.5) ||
    canopyKeywords.test(client_notes);

  // ── Rule 2: High-Density Side-Fill ───────────────────────────────────────
  const isThick = /thick/i.test(densityLower);
  const high_density_side_fill = disconnected_canopy && isThick;
  const grams_required = high_density_side_fill ? 110 : 150;

  // ── Method Selection ─────────────────────────────────────────────────────
  // Prefer GPT recommendation; override with density rules where warranted
  let recommended_method: HairMethod =
    gpt?.recommended_method ?? selectMethodByDensity(densityLower);

  // Canopy + perimeter restoration always upgrades to at least MICRO for precision
  if (disconnected_canopy && recommended_method === 'STANDARD_KTIP') {
    recommended_method = 'MICRO_KTIP';
  }

  // ── Length Resolution ─────────────────────────────────────────────────────
  // If disconnected canopy and natural hair is past mid-back, enforce min 26"
  const estimatedNaturalLength = gpt?.estimated_current_length_inches ?? 0;
  const naturalIsMidBack = estimatedNaturalLength >= 18; // 18" from root ≈ mid-back

  let hair_length_used: ValidLength = resolveLength(dream_length);
  if (disconnected_canopy && naturalIsMidBack && hair_length_used < 26) {
    hair_length_used = 26; // minimum needed to blend canopy
  }

  // ── Rule 3: Jennifer's Logic ─────────────────────────────────────────────
  // Conditions: Rule 1 ✓, Rule 2 ✓ (thick), dream_length === 22
  // → Price at 22" tier but supply 26" hair, honor the 22" investment
  const honor_upgrade =
    disconnected_canopy &&
    high_density_side_fill &&
    dream_length === 22;

  if (honor_upgrade) {
    hair_length_used = 26; // upgrade hair fabric silently
  }

  // Pricing: if honor_upgrade, use the dream_length tier (22") for price
  const pricing_length: ValidLength = honor_upgrade ? resolveLength(dream_length) : hair_length_used;
  const total_price = PRICING_MATRIX[recommended_method][pricing_length];
  const deposit_required = Math.round(total_price * 0.5);

  return {
    recommended_method,
    hair_length_used,
    total_price,
    deposit_required,
    honor_upgrade,
    disconnected_canopy,
    high_density_side_fill,
    grams_required,
  };
}

function selectMethodByDensity(density: string): HairMethod {
  if (/very.?fine|fragile|nano/i.test(density)) return 'NANO_MICRO_HYBRID';
  if (/fine|thin/i.test(density)) return 'MICRO_KTIP';
  return 'STANDARD_KTIP';
}

export function methodLabel(method: HairMethod): string {
  return {
    STANDARD_KTIP: 'Standard K-Tip',
    MICRO_KTIP: 'Micro K-Tip',
    NANO_MICRO_HYBRID: 'Nano + Micro Hybrid',
  }[method];
}
