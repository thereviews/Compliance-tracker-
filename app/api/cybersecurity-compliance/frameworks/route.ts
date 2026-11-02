import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { SECURITY_FRAMEWORK_CATALOG } from '@/lib/security-framework-catalog';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, supabase: null };
  }

  const supabase = getAuthClient(authHeader);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase: null };
  }

  return { user, supabase };
}

async function verifyWorkspace(
  supabase: NonNullable<
    Awaited<ReturnType<typeof authenticate>>['supabase']
  >,
  workspaceId: string,
  userId: string,
) {
  return supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();
}

export async function GET(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) {
      return jsonError('Unauthorized', 401);
    }

    const workspaceId = new URL(req.url).searchParams.get('workspaceId');

    if (!workspaceId || !uuidPattern.test(workspaceId)) {
      return jsonError('A valid workspace ID is required.', 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      console.error('SECURITY FRAMEWORK MEMBERSHIP:', membershipError.message);
      return jsonError('Could not verify workspace access.', 500);
    }

    if (!membership) {
      return jsonError('You do not have access to this workspace.', 403);
    }

    const { data: frameworks, error: frameworkError } = await supabase
      .from('security_frameworks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (frameworkError) {
      console.error('SECURITY FRAMEWORK GET:', frameworkError.message);
      return jsonError('Could not load frameworks.', 500);
    }

    const frameworkIds = (frameworks ?? []).map((item) => item.id);

    let requirements: Record<string, unknown>[] = [];

    if (frameworkIds.length > 0) {
      const { data, error } = await supabase
        .from('security_requirements')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('framework_id', frameworkIds)
        .order('requirement_code', { ascending: true });

      if (error) {
        console.error('SECURITY REQUIREMENTS GET:', error.message);
        return jsonError('Could not load framework requirements.', 500);
      }

      requirements = data ?? [];
    }

    const frameworksWithRequirements = (frameworks ?? []).map((framework) => ({
      ...framework,
      requirements: requirements.filter(
        (requirement) => requirement.framework_id === framework.id,
      ),
    }));

    return NextResponse.json({
      catalog: SECURITY_FRAMEWORK_CATALOG.map(
        ({ key, name, version, description, requirements }) => ({
          key,
          name,
          version,
          description,
          requirementCount: requirements.length,
        }),
      ),
      frameworks: frameworksWithRequirements,
      role: membership.role,
    });
  } catch (error) {
    console.error('SECURITY FRAMEWORK GET ERROR:', error);
    return jsonError('Could not load frameworks.', 500);
  }
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await authenticate(req);

    if (!user || !supabase) {
      return jsonError('Unauthorized', 401);
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await req.json();

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return jsonError('Invalid request body.', 400);
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return jsonError('Invalid JSON request body.', 400);
    }

    const workspaceId = body.workspaceId;
    const frameworkKey = body.frameworkKey;

    if (
      typeof workspaceId !== 'string' ||
      !uuidPattern.test(workspaceId)
    ) {
      return jsonError('A valid workspace ID is required.', 400);
    }

    if (typeof frameworkKey !== 'string') {
      return jsonError('A valid framework selection is required.', 400);
    }

    const definition = SECURITY_FRAMEWORK_CATALOG.find(
      (item) => item.key === frameworkKey,
    );

    if (!definition) {
      return jsonError('This framework is not available in the catalog.', 400);
    }

    const { data: membership, error: membershipError } =
      await verifyWorkspace(supabase, workspaceId, user.id);

    if (membershipError) {
      console.error('SECURITY FRAMEWORK MEMBERSHIP:', membershipError.message);
      return jsonError('Could not verify workspace access.', 500);
    }

    if (!membership) {
      return jsonError('You do not have access to this workspace.', 403);
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return jsonError(
        'Only workspace owners and admins can add frameworks.',
        403,
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from('security_frameworks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('name', definition.name)
      .eq('version', definition.version)
      .maybeSingle();

    if (existingError) {
      console.error('SECURITY FRAMEWORK LOOKUP:', existingError.message);
      return jsonError('Could not check existing framework.', 500);
    }

    let frameworkId = existing?.id;
    let created = false;

    if (!frameworkId) {
      const { data: inserted, error: insertError } = await supabase
        .from('security_frameworks')
        .insert({
          workspace_id: workspaceId,
          name: definition.name,
          version: definition.version,
          description: definition.description,
          status: 'active',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (insertError) {
        // Another request may have added the same framework concurrently.
        const { data: raced } = await supabase
          .from('security_frameworks')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('name', definition.name)
          .eq('version', definition.version)
          .maybeSingle();

        if (!raced) {
          console.error('SECURITY FRAMEWORK INSERT:', insertError.message);
          return jsonError('Could not add framework.', 500);
        }

        frameworkId = raced.id;
      } else {
        frameworkId = inserted.id;
        created = true;
      }
    }

    const starterRows = definition.requirements.map((requirement) => ({
      workspace_id: workspaceId,
      framework_id: frameworkId,
      requirement_code: requirement.code,
      title: requirement.title,
      description: requirement.description,
      category: requirement.category,
      priority: requirement.priority,
      created_by: user.id,
    }));

    const { error: requirementsError } = await supabase
      .from('security_requirements')
      .upsert(starterRows, {
        onConflict: 'framework_id,requirement_code',
        ignoreDuplicates: true,
      });

    if (requirementsError) {
      console.error('SECURITY REQUIREMENTS SEED:', requirementsError.message);
      return jsonError(
        'The framework was added, but its starter requirements could not be loaded. Try adding it again.',
        500,
      );
    }

    const { data: framework, error: reloadError } = await supabase
      .from('security_frameworks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', frameworkId)
      .single();

    if (reloadError || !framework) {
      console.error('SECURITY FRAMEWORK RELOAD:', reloadError?.message);
      return jsonError('Framework was added but could not be reloaded.', 500);
    }

    return NextResponse.json(
      {
        message: created
          ? 'Framework added with starter requirements.'
          : 'Framework already existed; starter requirements were checked.',
        framework,
        requirementCount: definition.requirements.length,
        created,
      },
      { status: created ? 201 : 200 },
    );
  } catch (error) {
    console.error('SECURITY FRAMEWORK POST ERROR:', error);
    return jsonError('Could not add framework.', 500);
  }
}
