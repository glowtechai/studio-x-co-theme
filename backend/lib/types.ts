export interface IntakePayload {
  form_id: string;
  submission_date: string;
  lead_source: string;
  client_info: {
    first_name: string;
    last_name: string;
    instagram: string;
    phone_number: string;
    email: string;
  };
  hair_assessment: {
    prior_extensions: string;
    prior_experience_notes: string;
    dream_length: number;
    user_reported_density: string;
    health_issues: string;
    client_notes: string;
  };
  images: string[];
  marketing_tracking: {
    gclid: string | null;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
  };
}

export type HairMethod = 'STANDARD_KTIP' | 'MICRO_KTIP' | 'NANO_MICRO_HYBRID';
export type LeadStatus = 'pending_review' | 'sms_sent' | 'deposited' | 'archived';
export type PaymentMethod = 'Zelle' | 'Card' | 'Klarna' | 'Affirm';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface GptVisionResult {
  estimated_current_length_inches: number;
  observed_density: 'very_fine' | 'fine' | 'medium' | 'thick';
  disconnected_canopy_detected: boolean;
  disconnected_canopy_confidence: number;
  scalp_visibility: 'none' | 'minimal' | 'moderate' | 'significant';
  natural_hair_condition: 'healthy' | 'some_damage' | 'damaged';
  recommended_method: HairMethod;
  diagnosis_summary: string;
  canopy_notes: string | null;
}

export interface ComputedAnalysis {
  recommended_method: HairMethod;
  dream_length: number;
  hair_length_used: number;
  total_price: number;
  deposit_required: number;
  honor_upgrade: boolean;
  disconnected_canopy: boolean;
  high_density_side_fill: boolean;
  grams_required: number;
  balayage_addon: boolean;
  balayage_price: number;
  ai_diagnosis: string;
  canopy_notes: string | null;
  compiled_message: string;
  gpt_raw: GptVisionResult | null;
}

export interface Lead {
  id: string;
  created_at: string;
  client_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  instagram: string;
  lead_source: string;
  gclid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  lead_status: LeadStatus;
  raw_images: string[];
  hair_assessment: IntakePayload['hair_assessment'];
  computed_analysis_json: ComputedAnalysis | null;
}

export interface Transaction {
  id: string;
  lead_id: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  created_at: string;
}
