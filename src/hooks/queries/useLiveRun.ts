import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Run } from "./useRuns";

// Polling agressivo (2s) para exibir progresso de um generate-post em curso.
// Busca o run mais recente de um tópico após uma marca temporal (ISO).
export function useLiveRun(topicId: string | null, sinceIso: string | null) {
  return useQuery({
    queryKey: ["live_run", topicId, sinceIso],
    enabled: !!topicId && !!sinceIso,
    refetchInterval: 2_000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<Run | null> => {
      const { data, error } = await supabase
        .from("generation_runs")
        .select("*")
        .eq("run_type", "generate-post")
        .eq("topic_id", topicId!)
        .gte("started_at", sinceIso!)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Run | null;
    },
  });
}
