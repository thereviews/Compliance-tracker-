import { getAuthClient } from '@/lib/supabase';

export async function getPersonalWorkspaceId(
  authHeader: string | null,
  userId: string
): Promise<string> {
  const supabase = getAuthClient(authHeader);

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('created_by', userId)
    .eq('type', 'personal')
    .single();

  if (error || !workspace) {
    throw new Error(
      `Could not find personal workspace: ${
        error?.message || 'Workspace not found'
      }`
    );
  }

  return workspace.id;
}
