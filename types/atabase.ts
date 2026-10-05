export interface Vendor {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface ComplianceDocument {
  id: string;
  user_id: string;
  vendor_id: string;
  file_path: string;
  document_type: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  auto_renewal: boolean;
  notice_period_days: number | null;
  financial_value: number | null;
  compliance_summary: string | null;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  created_at: string;
}

export interface GeminiExtractionResult {
  vendor_name: string;
  document_type: string;
  effective_date: string | null;
  expiration_date: string | null;
  auto_renewal: boolean;
  notice_period_days: number | null;
  financial_value: number | null;
  compliance_summary: string;
}

