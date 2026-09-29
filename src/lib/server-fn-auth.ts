import { supabase } from "@/integrations/supabase/client";

/**
 * Returns headers to attach to an authenticated server function call.
 * Throws if there is no active session.
 */
export async function authHeaders(): Promise<{ Authorization: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");
  return { Authorization: `Bearer ${token}` };
}
