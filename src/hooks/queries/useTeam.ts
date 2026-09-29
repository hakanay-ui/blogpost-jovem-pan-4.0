import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminDeleteUser } from "@/utils/auth.functions";
import type { AppRole } from "@/contexts/AuthContext";

export type Member = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  role: AppRole | null;
};

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async (): Promise<Member[]> => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,email,status,is_active,is_approved,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;

      const roleMap = new Map<string, AppRole>();
      const score = (x: string) => (x === "admin" ? 3 : x === "editor" ? 2 : 1);
      for (const r of roles ?? []) {
        const cur = roleMap.get(r.user_id);
        if (!cur || score(r.role) > score(cur)) roleMap.set(r.user_id, r.role as AppRole);
      }
      return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? null }));
    },
  });
}

export function useTeamMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["team_members"] });

  const approve = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: true })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setActive = useMutation({
    mutationFn: async ({ memberId, active }: { memberId: string; active: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: active })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const changeRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: AppRole }) => {
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", memberId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase
        .from("user_roles")
        .insert({ user_id: memberId, role });
      if (insErr) throw insErr;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (memberId: string) => {
      await adminDeleteUser({ data: { userId: memberId } });
    },
    onSuccess: invalidate,
  });

  return { approve, setActive, changeRole, remove };
}
