import OpenAI from 'openai';
import type { GptVisionResult, IntakePayload, ComputedAnalysis } from './types.js';
import { applyHeuristics, BALAYAGE_ADDON_PRICE } from './pricing.js';
import { compileMessage } from './compiler.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VISION_SYSTEM_PROMPT = `You are an expert hair extension consultation AI for The Studio X Co., a luxury salon in Downey, CA specializing in K-Tip, Micro K-Tip, Nano+Micro Hybrid extensions, Mesh Integration, and Beaded Toppers.

Analyze the submitted hair photos and return a JSON object with this exact shape:
{
  "estimated_current_length_inches": <number: 0-32>,
  "observed_density": "<very_fine|fine|medium|thick>",
  "disconnected_canopy_detected": <boolean>,
  "disconnected_canopy_confidence": <number: 0.0-1.0>,
  "scalp_visibility": "<none|minimal|moderate|significant>",
  "natural_hair_condition": "<healthy|some_damage|damaged>",
  "recommended_method": "<STANDARD_KTIP|MICRO_KTIP|NANO_MICRO_HYBRID>",
  "diagnosis_summary": "<2-3 warm, professional sentences describing the hair state and opportunity>",
  "canopy_notes": "<string describing the canopy issue if detected, or null>"
}

Disconnected canopy: a heavy blunt horizontal cut line visible at the perimeter/sides that creates a hard shelf. This is common in layered-over mullet-style cuts.
STANDARD_KTIP: medium-thick density, health-tolerant. MICRO_KTIP: fine/thin strands needing featherlight bonds. NANO_MICRO_HYBRID: very fine, fragile, or visible scalp.
Return ONLY valid JSON. No markdown, no commentary.`;

export async function runVisionAnalysis(
  images: string[],
  payload: IntakePayload,
): Promise<GptVisionResult | null> {
  if (!images.length) return null;

  const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = images
    .slice(0, 3)
    .map((url) => ({
      type: 'image_url' as const,
      image_url: { url, detail: 'high' as const },
    }));

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 600,
      messages: [
        { role: 'system', content: VISION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text',
              text: `Client reported density: ${payload.hair_assessment.user_reported_density}. Dream length: ${payload.hair_assessment.dream_length}". Prior extensions: ${payload.hair_assessment.prior_extensions}. Notes: ${payload.hair_assessment.client_notes}`,
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';
    return JSON.parse(raw) as GptVisionResult;
  } catch (err) {
    console.error('GPT-4o vision error:', err);
    return null;
  }
}

export async function buildAnalysis(
  payload: IntakePayload,
  gpt: GptVisionResult | null,
): Promise<ComputedAnalysis> {
  const heuristics = applyHeuristics({
    dream_length: payload.hair_assessment.dream_length,
    user_reported_density: payload.hair_assessment.user_reported_density,
    gpt,
    client_notes: payload.hair_assessment.client_notes,
  });

  const compiled_message = compileMessage({
    first_name: payload.client_info.first_name,
    lead_source: payload.lead_source,
    analysis: {
      ...heuristics,
      ai_diagnosis: gpt?.diagnosis_summary ?? 'Your hair has beautiful potential — our expert eye sees exactly what it needs.',
      canopy_notes: gpt?.canopy_notes ?? null,
      balayage_addon: false,
      balayage_price: 0,
      compiled_message: '',
      gpt_raw: gpt,
    },
  });

  return {
    ...heuristics,
    ai_diagnosis: gpt?.diagnosis_summary ?? 'Your hair has beautiful potential — our expert eye sees exactly what it needs.',
    canopy_notes: gpt?.canopy_notes ?? null,
    balayage_addon: false,
    balayage_price: BALAYAGE_ADDON_PRICE,
    compiled_message,
    gpt_raw: gpt,
  };
}
