import type { SupabaseClient } from '@supabase/supabase-js';

type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'uploaded'
  | 'viewed'
  | 'downloaded'
  | 'status_changed';

type AuditEntity =
  | 'vendor'
  | 'document'
  | 'compliance_assessment'
  | 'compliance_evidence'
  | 'risk_assessment'
  | 'workspace_member'
  | 'compliance_register_entry'
  | 'corrective_action';

interface AuditLogEntry {
  workspaceId: string;
  actorId: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityId?: string | null;
  entityName?: string | null;
  details?: Record<string, unknown>;
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  entry: AuditLogEntry,
): Promise<boolean> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      workspace_id: entry.workspaceId,
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      entity_name: entry.entityName ?? null,
      details: entry.details ?? {},
    });

    if (error) {
      console.error('AUDIT LOG INSERT:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('AUDIT LOG ERROR:', error);
    return false;
  }
}
