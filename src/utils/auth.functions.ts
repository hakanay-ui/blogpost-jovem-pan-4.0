import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const validateSignupInput = z.object({
  email: z.string().email().max(255),
});

/**
 * validate-signup: returns whether a given email is allowed to sign up
 * based on project_config (restrict_signup_by_domain + allowed_email_domains).
 * Also returns whether the new account will require admin approval.
 *
 * IMPORTANT: this is a UX gate. The DB trigger `check_email_domain` is the
 * authoritative security boundary.
 */
export const validateSignup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => validateSignupInput.parse(input))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();

    // First user always passes.
    // Conta usuários reais em auth.users (fonte verdadeira). Contar profiles
    // dava falso positivo em projetos remixados, onde um usuário pode existir
    // em auth.users sem profile porque o trigger on_auth_user_created não
    // chegou a ser criado.
    const { data: usersData, error: countErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (countErr) {
      console.error("validateSignup count error:", countErr);
      return {
        allowed: false,
        requiresApproval: false,
        message: "Erro ao validar cadastro. Tente novamente.",
      };
    }

    const isFirstUser = (usersData?.users?.length ?? 0) === 0;

    const { data: cfgRows, error: cfgErr } = await supabaseAdmin
      .from("project_config")
      .select("key,value")
      .in("key", [
        "restrict_signup_by_domain",
        "allowed_email_domains",
        "require_account_approval",
      ]);

    if (cfgErr) {
      console.error("validateSignup config error:", cfgErr);
      return {
        allowed: false,
        requiresApproval: false,
        message: "Erro ao validar cadastro. Tente novamente.",
      };
    }

    const cfg = Object.fromEntries(
      (cfgRows ?? []).map((r) => [r.key, r.value]),
    ) as Record<string, string>;

    const restrict = cfg["restrict_signup_by_domain"] === "true";
    const requireApproval = cfg["require_account_approval"] === "true";

    if (isFirstUser) {
      return { allowed: true, requiresApproval: false, message: null };
    }

    if (!restrict) {
      return { allowed: true, requiresApproval: requireApproval, message: null };
    }

    const allowedDomains = (cfg["allowed_email_domains"] ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    const emailDomain = email.split("@")[1] ?? "";
    const isAllowed = allowedDomains.some(
      (d) => emailDomain === d || emailDomain.endsWith("." + d),
    );

    if (!isAllowed) {
      return {
        allowed: false,
        requiresApproval: false,
        message:
          "O domínio do seu email não é permitido para cadastro nesta plataforma.",
      };
    }

    return { allowed: true, requiresApproval: requireApproval, message: null };
  });

/**
 * check-user-active: validates the current session against profile flags.
 * If the user is no longer active or approved, signs them out server-side.
 */
export const checkUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("is_active,is_approved")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("checkUserActive query error:", error);
      return { active: true, approved: true, signedOut: false };
    }

    if (!profile) {
      return { active: false, approved: false, signedOut: false };
    }

    let signedOut = false;
    if (!profile.is_active) {
      try {
        await supabaseAdmin.auth.admin.signOut(userId);
        signedOut = true;
      } catch (e) {
        console.error("Failed to sign out inactive user:", e);
      }
    }

    return {
      active: profile.is_active,
      approved: profile.is_approved,
      signedOut,
    };
  });

/**
 * delete-user: admin-only deletion of a user (cascades profile + role).
 */
const deleteUserInput = z.object({ userId: z.string().uuid() });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteUserInput.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId: callerId } = context;

    // verify caller is admin (user_roles RLS allows reading own roles)
    const { data: adminRole, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr || !adminRole) {
      throw new Error("Apenas administradores podem remover usuários.");
    }
    if (data.userId === callerId) {
      throw new Error("Você não pode remover sua própria conta.");
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { success: true };
  });
