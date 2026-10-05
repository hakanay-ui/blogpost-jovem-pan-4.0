import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  praca: string;
};

export type NewsCard = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_alt: string | null;
  published_at: string | null;
  praca: string | null;
  topic: { slug: string | null; name: string } | null;
};

const CARD_FIELDS =
  "id, title, slug, subtitle, excerpt, cover_image_url, cover_alt, published_at, praca, topic:editorial_topics(slug, name)";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("editorial_topics")
        .select("id, slug, name, description, praca")
        .eq("active", true)
        .not("slug", "is", null)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

const PAGE_SIZE = 20;

// Últimas publicadas, paginadas. categorySlug filtra por categoria.
export function useNewsFeed(categorySlug?: string) {
  return useInfiniteQuery({
    queryKey: ["news_feed", categorySlug ?? "all"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      let q = supabase
        .from("posts")
        .select(
          categorySlug
            ? CARD_FIELDS.replace("editorial_topics(", "editorial_topics!inner(")
            : CARD_FIELDS,
        )
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (categorySlug) q = q.eq("topic.slug", categorySlug);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as NewsCard[];
    },
    getNextPageParam: (last, pages) => (last.length === PAGE_SIZE ? pages.length : undefined),
  });
}

export function useRelatedNews(topicId: string | null | undefined, excludeId: string | undefined) {
  return useQuery({
    queryKey: ["related_news", topicId, excludeId],
    enabled: !!topicId && !!excludeId,
    queryFn: async (): Promise<NewsCard[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select(CARD_FIELDS)
        .eq("status", "published")
        .eq("topic_id", topicId!)
        .neq("id", excludeId!)
        .order("published_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return (data ?? []) as unknown as NewsCard[];
    },
  });
}
