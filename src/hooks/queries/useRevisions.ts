import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Revision = {
  id: string;
  post_id: string;
  title: string;
  excerpt: string | null;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  cover_image_url: string | null;
  edited_by: string | null;
  created_at: string;
};

export function useRevisions(postId: string | null | undefined) {
  return useQuery({
    queryKey: ["post_revisions", postId],
    enabled: !!postId,
    queryFn: async (): Promise<Revision[]> => {
      const { data, error } = await supabase
        .from("post_revisions")
        .select("*")
        .eq("post_id", postId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Revision[];
    },
  });
}

export function useRestoreRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rev: Revision) => {
      const { error } = await supabase
        .from("posts")
        .update({
          title: rev.title,
          excerpt: rev.excerpt,
          content: rev.content,
          meta_title: rev.meta_title,
          meta_description: rev.meta_description,
          cover_image_url: rev.cover_image_url,
        })
        .eq("id", rev.post_id);
      if (error) throw error;
    },
    onSuccess: (_d, rev) => {
      qc.invalidateQueries({ queryKey: ["post_revisions", rev.post_id] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
