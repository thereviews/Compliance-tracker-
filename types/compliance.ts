export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type RequirementStatus = 'Compliant' | 'In Progress' | 'Non-Compliant' | 'Under Review';
export type ActionStatus = 'Open' | 'In Progress' | 'Completed';
export type WorkspaceRole = 'Owner' | 'Admin' | 'Editor' | 'Viewer';

export interface ComplianceRequirement {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  obligation_source: string | null;
  owner_id: string | null;
  priority: Priority;
  status: RequirementStatus;
  deadline: string | null;
  created_at: string;
}

export interface ComplianceEvidence {
  id: string;
  workspace_id: string;
  requirement_id: string | null;
  file_name: string;
  file_path: string;
  document_type: string | null;
  compliance_summary: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ComplianceAction {
  id: string;
  workspace_id: string;
  requirement_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null;
  status: ActionStatus;
  created_at: string;
}

export interface GeminiExtractionResult {
  title: string;
  description: string;
  obligation_source: string;
  document_type: string;
  compliance_summary: string;
  suggested_actions: string[];
}

