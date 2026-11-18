import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';
import type { IntakePayload } from '../lib/types.js';
import { createLead, updateLeadAnalysis } from '../lib/db.js';
import { runVisionAnalysis, buildAnalysis } from '../lib/analyze.js';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let payload: IntakePayload;
  try {
    payload = req.body as IntakePayload;
    if (!payload.client_info?.phone_number) throw new Error('Missing phone_number');
    if (!payload.hair_assessment?.dream_length) throw new Error('Missing dream_length');
  } catch (err) {
    return res.status(400).json({ error: 'Invalid payload', detail: String(err) });
  }

  const { client_info, hair_assessment, images, marketing_tracking, lead_source } = payload;

  // 1. Persist lead immediately so we have an ID
  let lead;
  try {
    lead = await createLead({
      client_name: `${client_info.first_name} ${client_info.last_name}`,
      first_name: client_info.first_name,
      last_name: client_info.last_name,
      email: client_info.email,
      phone: client_info.phone_number,
      instagram: client_info.instagram,
      lead_source,
      gclid: marketing_tracking.gclid ?? null,
      utm_source: marketing_tracking.utm_source ?? null,
      utm_medium: marketing_tracking.utm_medium ?? null,
      utm_campaign: marketing_tracking.utm_campaign ?? null,
      lead_status: 'pending_review',
      raw_images: images ?? [],
      hair_assessment,
      computed_analysis_json: null,
    });
  } catch (err) {
    console.error('Lead creation failed:', err);
    return res.status(500).json({ error: 'DB error', detail: String(err) });
  }

  // 2. Respond 200 immediately — webhook caller doesn't need to wait
  res.status(200).json({ success: true, lead_id: lead.id });

  // 3. Run GPT-4o vision analysis (async, after response flushed)
  try {
    const gpt = await runVisionAnalysis(images, payload);
    const analysis = await buildAnalysis(payload, gpt);
    await updateLeadAnalysis(lead.id, analysis);

    // 4. Notify Giselle via SMS
    const dashboardUrl = `${process.env.DASHBOARD_BASE_URL}/dashboard?lead_id=${lead.id}`;
    await twilioClient.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to: process.env.GISELLE_PHONE_NUMBER!,
      body: `🚨 Studio X Premium Lead Alert: ${client_info.first_name} ${client_info.last_name} has submitted their assessment form. Tap here to review: ${dashboardUrl}`,
    });
  } catch (err) {
    // Non-fatal: lead already saved, log and continue
    console.error('Post-save processing error:', err);
  }
}
