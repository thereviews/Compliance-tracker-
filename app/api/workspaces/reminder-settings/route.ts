import { NextResponse } from 'next/server';
import { getAuthClient, supabaseAdmin } from '@/lib/supabase';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_DAYS = [1, 3, 7, 14, 30, 45, 60, 90, 120, 180];
const DEFAULT_DAYS = [90, 60, 30, 7];

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: jsonError('Unauthorized', 401) };
  }

  const supabase = getAuthClient(authHeader);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: jsonError('Unauthorized', 401) };
  }

  return { user, error: null };
}

async function getMembership(workspaceId: string, userId: string) {
  return supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();
}

export async function GET(req: Request) {
  try {
    const { user, error: authResponse } = await authenticate(req);

    if (authResponse || !user) {
      return authResponse ?? jsonError('Unauthorized', 401);
    }

    const workspaceId = new URL(req.url).searchParams.get('workspaceId');

    if (!workspaceId || !uuidPattern.test(workspaceId)) {
      return jsonError('A valid workspace ID is required', 400);
    }

    const { data: membership, error: membershipError } =
      await getMembership(workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace membership', 500);
    }

    if (!membership) {
      return jsonError('You are not a member of this workspace', 403);
    }

    const { data: settings, error: settingsError } =
      await supabaseAdmin
        .from('workspace_reminder_settings')
        .select(
          'workspace_id, notice_reminder_days, enabled, updated_at'
        )
        .eq('workspace_id', workspaceId)
        .maybeSingle();

    if (settingsError) {
      console.error(
        'REMINDER SETTINGS FETCH ERROR:',
        settingsError.message
      );
      return jsonError('Could not retrieve reminder settings', 500);
    }

    return NextResponse.json({
      settings: settings ?? {
        workspace_id: workspaceId,
        notice_reminder_days: DEFAULT_DAYS,
        enabled: true,
        updated_at: null,
      },
    });
  } catch (error) {
    console.error('REMINDER SETTINGS GET ERROR:', error);
    return jsonError('Could not retrieve reminder settings', 500);
  }
}

export async function PUT(req: Request) {
  try {
    const { user, error: authResponse } = await authenticate(req);

    if (authResponse || !user) {
      return authResponse ?? jsonError('Unauthorized', 401);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON request body', 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonError('Invalid request body', 400);
    }

    const input = body as Record<string, unknown>;
    const { workspaceId, notice_reminder_days, enabled } = input;

    if (
      typeof workspaceId !== 'string' ||
      !uuidPattern.test(workspaceId)
    ) {
      return jsonError('A valid workspace ID is required', 400);
    }

    if (
      !Array.isArray(notice_reminder_days) ||
      notice_reminder_days.length > ALLOWED_DAYS.length ||
      !notice_reminder_days.every(
        (day) =>
          typeof day === 'number' &&
          Number.isInteger(day) &&
          ALLOWED_DAYS.includes(day)
      ) ||
      new Set(notice_reminder_days).size !== notice_reminder_days.length
    ) {
      return jsonError(
        'Reminder days must be unique allowed intervals',
        400
      );
    }

    if (typeof enabled !== 'boolean') {
      return jsonError('The enabled field must be true or false', 400);
    }

    const { data: membership, error: membershipError } =
      await getMembership(workspaceId, user.id);

    if (membershipError) {
      return jsonError('Could not verify workspace permissions', 500);
    }

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return jsonError(
        'Only workspace owners and admins can change reminder settings',
        403
      );
    }

    const { data: settings, error: saveError } =
      await supabaseAdmin
        .from('workspace_reminder_settings')
        .upsert(
          {
            workspace_id: workspaceId,
            notice_reminder_days: notice_reminder_days,
            enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'workspace_id' }
        )
        .select(
          'workspace_id, notice_reminder_days, enabled, updated_at'
        )
        .single();

    if (saveError || !settings) {
      console.error(
        'REMINDER SETTINGS SAVE ERROR:',
        saveError?.message
      );
      return jsonError('Could not save reminder settings', 500);
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('REMINDER SETTINGS PUT ERROR:', error);
    return jsonError('Could not save reminder settings', 500);
  }
}
