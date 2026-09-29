import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Run = {
  id: string;
  run_type: "scheduler" | "fetch-rss" | "generate-post";
  status: "running" | "success" | "error" | "skipped";
  topic_id: string | null;
  post_id: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  topic?: { name: string } | null;
};

export function useRuns(limit = 50) {
  return useQuery({
    queryKey: ["generation_runs", limit],
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<Run[]> => {
      const { data, error } = await supabase
        .from("generation_runs")
        .select(
          "id, run_type, status, topic_id, post_id, started_at, finished_at, duration_ms, error_message, metadata, topic:editorial_topics(name)",
        )
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as Run[];
    },
  });
}
