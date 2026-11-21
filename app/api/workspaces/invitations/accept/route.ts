import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAuthClient } from '@/lib/supabase';

export const runtime = 'nodejs';

async function readJsonObject(
  req: Request
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}


export async function POST(req: Request) {
  try {
    const supabase = getAuthClient(
      req.headers.get('Authorization')
    );

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please sign in to accept this invitation' },
        { status: 401 }
      );
    }

    const body = await readJsonObject(req);

    if (!body) {
      return NextResponse.json(
        { error: 'A valid JSON object is required.' },
        { status: 400 }
      );
    }

    const token =
      typeof body.token === 'string'
        ? body.token.trim()
        : '';

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      );
    }

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const { data, error } = await supabase.rpc(
      'accept_workspace_invitation',
      { p_token_hash: tokenHash }
    );

    if (error) {
      console.error('[INVITATION ACCEPTANCE ERROR]', error);

      return NextResponse.json(
        {
          error: 'This invitation could not be accepted. It may be invalid, expired, revoked, or already used.'
        },
        { status: 400 }
      );
    }

    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      data.success !== true
    ) {
      const code =
        data && typeof data === 'object' && !Array.isArray(data)
          ? data.code
          : null;

      const messages: Record<string, string> = {
        invalid_invitation: 'This invitation is invalid.',
        invalid_or_expired: 'This invitation is invalid, expired, or already used.',
        email_mismatch: 'This invitation was sent to a different email address.',
        invalid_workspace: 'This invitation is not valid for this workspace.',
        already_member: 'You are already a member of this workspace.'
      };

      return NextResponse.json(
        {
          success: false,
          error:
            typeof code === 'string' && messages[code]
              ? messages[code]
              : 'This invitation could not be accepted.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: data
    });

  } catch (error: unknown) {
    console.error('[INVITATION ACCEPTANCE ERROR]', error);

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
