// Shared admin-auth helper for edge functions called from the admin panel.
// Validates a Supabase JWT and ensures the caller has the `admin` role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Require an authenticated admin (user with role='admin') OR a valid
 * scheduler secret (so internal cron-triggered calls still work).
 */
export async function requireAdminOrScheduler(req: Request): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : "";

  if (!token) {
    return { ok: false, response: jsonError("Missing Authorization header", 401) };
  }

  // Path 1: service-role key (scheduler internal calls)
  if (token === serviceKey) {
    return { ok: true, userId: "service-role" };
  }

  // Path 2: scheduler_secret in DB (cron jobs)
  const { data: cfg } = await admin
    .from("project_config")
    .select("value")
    .eq("key", "scheduler_secret")
    .maybeSingle();
  if (cfg?.value && token === cfg.value) {
    return { ok: true, userId: "scheduler" };
  }

  // Path 3: user JWT — must be admin
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false, response: jsonError("Invalid token", 401) };
  }

  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!role) {
    return { ok: false, response: jsonError("Forbidden — admin role required", 403) };
  }

  return { ok: true, userId: userData.user.id };
}