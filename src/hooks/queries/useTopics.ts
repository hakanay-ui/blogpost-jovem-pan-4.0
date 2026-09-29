import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ScheduleMode = "interval" | "daily_window" | "per_new_item";

export type Topic = {
  id: string;
  name: string;
  description: string | null;
  keywords: string[];
  publish_mode: "auto" | "review";
  frequency_hours: number;
  active: boolean;
  last_generated_at: string | null;
  schedule_mode: ScheduleMode;
  daily_run_hour: number;
  max_posts_per_day: number;
};

export type TopicDraft = Omit<Topic, "id" | "last_generated_at">;

export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: async (): Promise<Topic[]> => {
      const { data, error } = await supabase
        .from("editorial_topics")
        .select(
          "id, name, description, keywords, publish_mode, frequency_hours, active, last_generated_at, schedule_mode, daily_run_hour, max_posts_per_day",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Topic[];
    },
  });
}

export function useTopicMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["topics"] });

  const create = useMutation({
    mutationFn: async (draft: TopicDraft) => {
      const { error } = await supabase.from("editorial_topics").insert(draft);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Topic> }) => {
      const { error } = await supabase.from("editorial_topics").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("editorial_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
