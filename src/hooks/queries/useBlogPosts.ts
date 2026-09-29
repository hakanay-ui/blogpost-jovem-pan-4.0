import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  ai_generated: boolean;
  topic: { name: string } | null;
  post_tags: Array<{ tag: { name: string; slug: string } | null }>;
};

const PAGE_SIZE = 12;

export function useBlogPosts() {
  return useInfiniteQuery({
    queryKey: ["blog_posts"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, title, slug, excerpt, cover_image_url, published_at, ai_generated, topic:editorial_topics(name), post_tags(tag:tags(name, slug))",
        )
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as unknown as BlogPost[];
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PAGE_SIZE ? pages.length : undefined,
  });
}
