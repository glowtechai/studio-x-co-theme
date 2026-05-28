import type { ComputedAnalysis } from './types.js';
import { methodLabel } from './pricing.js';

interface CompilerInput {
  first_name: string;
  lead_source: string;
  analysis: ComputedAnalysis;
}

export function compileMessage(input: CompilerInput): string {
  const { first_name, lead_source, analysis } = input;
  const {
    honor_upgrade,
    disconnected_canopy,
    total_price,
    deposit_required,
    recommended_method,
    dream_length,
    hair_length_used,
    grams_required,
    ai_diagnosis,
  } = analysis;

  if (honor_upgrade && disconnected_canopy) {
    return compileHonorUpgradeMessage({
      first_name,
      lead_source,
      total_price,
      deposit_required,
      dream_length,
      hair_length_used,
    });
  }

  if (disconnected_canopy) {
    return compileCanopyMessage({
      first_name,
      lead_source,
      total_price,
      deposit_required,
      recommended_method: methodLabel(recommended_method),
      hair_length_used,
      grams_required,
      ai_diagnosis,
    });
  }

  return compileStandardMessage({
    first_name,
    lead_source,
    total_price,
    deposit_required,
    recommended_method: methodLabel(recommended_method),
    hair_length_used,
    ai_diagnosis,
  });
}

// ── Template: Jennifer's Logic (honor_upgrade = true) ─────────────────────
function compileHonorUpgradeMessage(p: {
  first_name: string;
  lead_source: string;
  total_price: number;
  deposit_required: number;
  dream_length: number;
  hair_length_used: number;
}): string {
  return `Thank you so much for submitting your hair assessment form, ${p.first_name}! I love that you found me through ${p.lead_source}. First, take a deep breath — we can absolutely fix this blunt line and make your hair look completely seamless. 🤍

I noticed on your form that you selected ${p.dream_length}" for your dream length. However, looking closely at your snapshots from the back, your existing length is actually sitting beautifully past your mid-back, right around ${p.hair_length_used - 2}" to ${p.hair_length_used}".

Because your natural hair is so beautifully thick, if we use ${p.dream_length}" on the sides, it will fall short of your back hair and won't blend out that heavy canopy line. To make everything match perfectly, I am going to custom-source our premium ${p.hair_length_used}" luxury hair fabric for your sides. This gives us the perfect amount of length and density to swallow up that thick blunt 'shelf' and slide-cut those soft, cascading face-framing layers you want — without it looking thin or stringy.

Even though your density requires a significant amount of premium ${p.hair_length_used}" hair to fix this line, since you selected ${p.dream_length}" on your form, I want to honor that tier for you. I will custom upgrade your fabric to our ${p.hair_length_used}" length at no extra cost, keeping your investment at a flat $${p.total_price.toLocaleString()} all-inclusive (which covers the ${p.hair_length_used}" hair, full high-density side application, custom blending layers, and styling).

To secure your private session and instantly allocate this ${p.hair_length_used}" inventory from our vault, a 50% retainer of $${p.deposit_required.toLocaleString()} is required. Let me know if you are ready to secure your spot and I will send over your secure reservation link!`;
}

// ── Template: Canopy Correction (no honor upgrade) ────────────────────────
function compileCanopyMessage(p: {
  first_name: string;
  lead_source: string;
  total_price: number;
  deposit_required: number;
  recommended_method: string;
  hair_length_used: number;
  grams_required: number;
  ai_diagnosis: string;
}): string {
  return `Hi ${p.first_name}! Thank you so much for submitting your assessment — I'm so glad you found me through ${p.lead_source}. 🤍

After reviewing your photos, I can see exactly what we're working with. ${p.ai_diagnosis}

Based on your hair's current structure, I'm recommending our **${p.recommended_method}** method using ${p.hair_length_used}" premium hair with a focused ${p.grams_required}g side-fill placement. This is the most precise approach for restoring your perimeter and creating a seamless, natural-looking blend.

Your all-inclusive investment: **$${p.total_price.toLocaleString()}**
50% retainer to secure your date: **$${p.deposit_required.toLocaleString()}**

Reply here and I'll send over your secure booking link to reserve your session! ✨`;
}

// ── Template: Standard ────────────────────────────────────────────────────
function compileStandardMessage(p: {
  first_name: string;
  lead_source: string;
  total_price: number;
  deposit_required: number;
  recommended_method: string;
  hair_length_used: number;
  ai_diagnosis: string;
}): string {
  return `Hi ${p.first_name}! I'm Giselle from The Studio X Co. — thank you so much for submitting your hair assessment, and I love that you found me through ${p.lead_source}! 🤍

After reviewing everything you shared, ${p.ai_diagnosis}

I'm recommending our **${p.recommended_method}** with ${p.hair_length_used}" premium human hair. This will give you a completely natural, undetectable result that moves and feels entirely like your own.

Your custom investment: **$${p.total_price.toLocaleString()}**
50% retainer to hold your appointment: **$${p.deposit_required.toLocaleString()}**

I'd love to get you booked! Reply here and I'll send your secure reservation link. Can't wait to transform your hair. ✨`;
}
