import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

export type PostUpdate = TablesUpdate<"posts">;

export type AdminPostRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "scheduled" | "published" | "archived";
  ai_generated: boolean;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  topic_id: string | null;
  review_reason: string | null;
};

export function usePosts(filter: "all" | "draft" | "scheduled" | "published") {
  return useQuery({
    queryKey: ["posts", filter],
    queryFn: async (): Promise<AdminPostRow[]> => {
      let q = supabase
        .from("posts")
        .select(
          "id, title, slug, status, ai_generated, published_at, scheduled_at, created_at, topic_id, review_reason",
        )
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AdminPostRow[];
    },
  });
}

export function usePost(id: string | null | undefined) {
  return useQuery({
    queryKey: ["post", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSavePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: PostUpdate }) => {
      const { error } = await supabase.from("posts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["post", id] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function usePostMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["posts"] });

  const publish = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("posts")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const unpublish = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").update({ status: "draft" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const cancelSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("posts")
        .update({ status: "draft", scheduled_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { publish, unpublish, remove, cancelSchedule };
}

export type CreatePostInput = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input?: CreatePostInput): Promise<string> => {
      const { data: userData } = await supabase.auth.getUser();
      const ts = Date.now();
      const title = input?.title?.trim() || "Novo post sem título";
      const slug =
        input?.slug?.trim() ||
        (input?.title ? `${slugify(input.title)}-${ts.toString(36)}` : `draft-${ts}`);
      const { data, error } = await supabase
        .from("posts")
        .insert({
          title,
          slug,
          excerpt: input?.excerpt?.trim() || null,
          content: input?.content ?? "",
          status: "draft",
          ai_generated: false,
          author_id: userData.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}
