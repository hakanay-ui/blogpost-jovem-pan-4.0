import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RssItemRow = {
  id: string;
  feed_id: string;
  title: string;
  link: string;
  description: string | null;
  guid: string;
  published_at: string | null;
  created_at: string;
  used_in_post_id: string | null;
  feed: { id: string; name: string; topic_id: string | null } | null;
};

export type RssItemsFilter = {
  page?: number;
  pageSize?: number;
  status?: "all" | "new" | "used";
  feedId?: string | null;
  topicId?: string | null;
  search?: string;
};

export function useRssItems(filter: RssItemsFilter = {}) {
  const {
    page = 1,
    pageSize = 20,
    status = "all",
    feedId = null,
    topicId = null,
    search = "",
  } = filter;

  return useQuery({
    queryKey: ["rss_items", { page, pageSize, status, feedId, topicId, search }],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = supabase
        .from("rss_items")
        .select(
          "id, feed_id, title, link, description, guid, published_at, created_at, used_in_post_id, feed:rss_feeds!inner(id, name, topic_id)",
          { count: "exact" },
        )
        .order("published_at", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (status === "new") q = q.is("used_in_post_id", null);
      if (status === "used") q = q.not("used_in_post_id", "is", null);
      if (feedId) q = q.eq("feed_id", feedId);
      if (topicId) q = q.eq("feed.topic_id", topicId);
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);

      const { data, error, count } = await q;
      if (error) throw error;
      return {
        items: (data ?? []) as unknown as RssItemRow[],
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
      };
    },
  });
}

export function useFetchRssNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("fetch-rss", {
        body: {},
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rss_items"] }),
  });
}
