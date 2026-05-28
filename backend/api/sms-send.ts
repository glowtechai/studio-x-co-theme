import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';
import { getLead, updateLeadStatus } from '../lib/db.js';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lead_id, message } = req.body as { lead_id: string; message: string };

  if (!lead_id || !message?.trim()) {
    return res.status(400).json({ error: 'lead_id and message are required' });
  }

  const lead = await getLead(lead_id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const sent = await twilioClient.messages.create({
      from: process.env.TWILIO_FROM_NUMBER!,
      to: lead.phone,
      body: message.trim(),
    });

    await updateLeadStatus(lead_id, 'sms_sent');

    return res.status(200).json({ success: true, sid: sent.sid });
  } catch (err) {
    console.error('Twilio send error:', err);
    return res.status(500).json({ error: 'SMS failed', detail: String(err) });
  }
}
