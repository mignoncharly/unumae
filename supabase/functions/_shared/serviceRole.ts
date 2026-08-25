import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Accepts the runtime key directly or a separately issued service credential
 * only after PostgREST verifies it can execute a service-role-only function.
 * Decoding an unverified `role` claim would be forgeable and is never enough.
 */
export async function isServiceRoleRequest(
  request: Request,
  supabaseUrl: string,
  runtimeServiceKey: string
): Promise<boolean> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return false;
  if (authorization === `Bearer ${runtimeServiceKey}`) return true;

  const credential = authorization.slice('Bearer '.length);
  const verifier = createClient(supabaseUrl, runtimeServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${credential}` } },
  });
  const { data, error } = await verifier.rpc('service_role_probe');
  return !error && data === true;
}
