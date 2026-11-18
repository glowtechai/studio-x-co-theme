import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLead, getTransactionsByLead } from '../lib/db.js';

// Google Ads Offline Conversion upload via REST API
// Requires OAuth2 access token with google-ads scope
async function getGoogleAdsAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET!,
    refresh_token: process.env.GOOGLE_ADS_OAUTH_REFRESH_TOKEN!,
    grant_type: 'refresh_token',
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) throw new Error(`Token refresh failed: ${resp.status}`);
  const json = (await resp.json()) as { access_token: string };
  return json.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lead_id } = req.body as { lead_id: string };
  if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

  const lead = await getLead(lead_id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (!lead.gclid) return res.status(200).json({ skipped: true, reason: 'No gclid on record' });
  if (lead.lead_status !== 'deposited') {
    return res.status(400).json({ error: 'Lead must be in deposited status' });
  }

  const transactions = await getTransactionsByLead(lead_id);
  const completed = transactions.filter((t) => t.payment_status === 'completed');
  if (!completed.length) {
    return res.status(400).json({ error: 'No completed transactions found' });
  }

  const totalPaid = completed.reduce((sum, t) => sum + t.amount_paid, 0);
  const depositTimestamp = completed[0].created_at;
  const conversionDateTime = new Date(depositTimestamp)
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '+00:00');

  try {
    const accessToken = await getGoogleAdsAccessToken();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
    const conversionAction = `customers/${customerId}/conversionActions/${process.env.GOOGLE_ADS_CONVERSION_ACTION_ID}`;

    const payload = {
      conversions: [
        {
          gclid: lead.gclid,
          conversionAction,
          conversionDateTime,
          conversionValue: totalPaid,
          currencyCode: 'USD',
        },
      ],
      partialFailure: true,
    };

    const apiResp = await fetch(
      `https://googleads.googleapis.com/v17/customers/${customerId}:uploadClickConversions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!apiResp.ok) {
      const text = await apiResp.text();
      throw new Error(`Google Ads API error ${apiResp.status}: ${text}`);
    }

    const result = await apiResp.json();
    return res.status(200).json({ success: true, result });
  } catch (err) {
    console.error('Conversion upload error:', err);
    return res.status(500).json({ error: 'Conversion upload failed', detail: String(err) });
  }
}
