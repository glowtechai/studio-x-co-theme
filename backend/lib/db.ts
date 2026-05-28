import { createClient } from '@supabase/supabase-js';
import type { Lead, Transaction, LeadStatus, ComputedAnalysis } from './types.js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function createLead(data: Omit<Lead, 'id' | 'created_at'>): Promise<Lead> {
  const { data: row, error } = await supabase
    .from('leads')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`DB createLead: ${error.message}`);
  return row as Lead;
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Lead;
}

export async function updateLeadAnalysis(
  id: string,
  analysis: ComputedAnalysis,
): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ computed_analysis_json: analysis })
    .eq('id', id);
  if (error) throw new Error(`DB updateLeadAnalysis: ${error.message}`);
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ lead_status: status })
    .eq('id', id);
  if (error) throw new Error(`DB updateLeadStatus: ${error.message}`);
}

export async function listLeads(status?: LeadStatus): Promise<Lead[]> {
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('lead_status', status);
  const { data, error } = await query;
  if (error) throw new Error(`DB listLeads: ${error.message}`);
  return (data ?? []) as Lead[];
}

export async function createTransaction(
  data: Omit<Transaction, 'id' | 'created_at'>,
): Promise<Transaction> {
  const { data: row, error } = await supabase
    .from('transactions')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`DB createTransaction: ${error.message}`);
  return row as Transaction;
}

export async function getTransactionsByLead(leadId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`DB getTransactionsByLead: ${error.message}`);
  return (data ?? []) as Transaction[];
}
