import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Feed = {
  id: string;
  name: string;
  url: string;
  topic_id: string | null;
  active: boolean;
  last_fetched_at: string | null;
};

export type FeedDraft = Omit<Feed, "id" | "last_fetched_at">;

export function useFeeds() {
  return useQuery({
    queryKey: ["feeds"],
    queryFn: async (): Promise<Feed[]> => {
      const { data, error } = await supabase
        .from("rss_feeds")
        .select("id, name, url, topic_id, active, last_fetched_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Feed[];
    },
  });
}

export function useFeedMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["feeds"] });

  const create = useMutation({
    mutationFn: async (draft: FeedDraft) => {
      const { error } = await supabase.from("rss_feeds").insert(draft);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Feed> }) => {
      const { error } = await supabase.from("rss_feeds").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rss_feeds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const touchFetched = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rss_feeds")
        .update({ last_fetched_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, touchFetched };
}
