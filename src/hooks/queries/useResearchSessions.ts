import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ResearchSession = {
  id: string;
  topic_id: string | null;
  topic_name: string;
  topic_description: string | null;
  topic_keywords: string[];
  mode: "existing" | "adhoc";
  research: string | null;
  citations: string[];
  angles: Array<{
    title: string;
    angle: string;
    summary: string;
    source_indices: number[];
  }>;
  used_for_post_id: string | null;
  used_angle: { title: string; angle: string; summary: string } | null;
  created_at: string;
  updated_at: string;
};

export function useResearchSessions(limit = 30) {
  return useQuery({
    queryKey: ["research_sessions", limit],
    queryFn: async (): Promise<ResearchSession[]> => {
      const { data, error } = await supabase
        .from("research_sessions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as ResearchSession[];
    },
  });
}

export function useDeleteResearchSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("research_sessions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["research_sessions"] }),
  });
}
