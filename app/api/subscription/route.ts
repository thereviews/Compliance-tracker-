import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';

const isUuid = (value: string | null): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function GET(req: Request) {
  try {
    const authorization = req.headers.get('Authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getAuthClient(authorization);

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!isUuid(workspaceId)) {
      return NextResponse.json(
        { error: 'A valid workspaceId is required.' },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    if (!membership) {
      return NextResponse.json(
        { error: 'Workspace access denied.' },
        { status: 403 }
      );
    }

    const { data: subscription, error: subscriptionError } =
      await supabase
        .from('workspace_subscriptions')
        .select(`
          id,
          workspace_id,
          plan_id,
          status,
          access_type,
          billing_provider,
          billing_interval,
          current_period_start,
          current_period_end,
          trial_ends_at,
          canceled_at,
          subscription_plans (
            id,
            name,
            description,
            limits,
            features
          )
        `)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

    if (subscriptionError) {
      throw new Error(subscriptionError.message);
    }

    if (!subscription) {
      return NextResponse.json(
        { error: 'Workspace subscription not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription
    });
  } catch (error: unknown) {
    console.error('[SUBSCRIPTION API ERROR]', error);

    return NextResponse.json(
      { error: 'Failed to fetch workspace subscription.' },
      { status: 500 }
    );
  }
}
