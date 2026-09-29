import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/layouts/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { parseOnboarding } from "@/hooks/queries/useOnboarding";

export const Route = createFileRoute("/admin")({
  // Auth gate runs client-side: Supabase session lives in localStorage and
  // is not available during SSR. ssr:false avoids redirect loops on refresh
  // and prevents the admin shell HTML from leaking to anonymous users.
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/admin/login" });
    }
    // Block non-admins from any /admin/* sub-route. Status of profile
    // (active/approved) is verified inside AdminLayout for richer UX.
    const [{ data: role }, { data: prof }] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("onboarding")
        .eq("id", data.user.id)
        .maybeSingle(),
    ]);
    if (!role) {
      // Not an admin → bounce to pending-approval (handles editor/user too).
      throw redirect({ to: "/pending-approval" });
    }
    // First login (or after "Refazer onboarding") lands on the setup wizard.
    // Guard skips the wizard route itself, otherwise it redirects onto itself.
    if (
      !location.pathname.startsWith("/admin/onboarding") &&
      !parseOnboarding(prof?.onboarding).completed
    ) {
      throw redirect({ to: "/admin/onboarding" });
    }
    return { user: data.user };
  },
  component: AdminLayout,
});
