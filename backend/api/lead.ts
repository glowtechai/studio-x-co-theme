import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLead, listLeads, updateLeadStatus } from '../lib/db.js';
import type { LeadStatus } from '../lib/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET /api/lead?id=UUID  → single lead
  // GET /api/lead?status=pending_review  → list
  // PATCH /api/lead  { id, status }  → update status
  if (req.method === 'GET') {
    const { id, status } = req.query;
    if (id) {
      const lead = await getLead(String(id));
      if (!lead) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(lead);
    }
    const leads = await listLeads(status as LeadStatus | undefined);
    return res.status(200).json(leads);
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body as { id: string; status: LeadStatus };
    if (!id || !status) return res.status(400).json({ error: 'id and status required' });
    await updateLeadStatus(id, status);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
