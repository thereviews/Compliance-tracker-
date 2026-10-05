import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client for server-side admin tasks (e.g., Cron jobs)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper to create an authenticated client based on the request's token
export function getAuthClient(authHeader: string | null) {
  if (!authHeader) throw new Error('Missing Authorization header');
  const token = authHeader.replace('Bearer ', '');
  
  return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  });
}

