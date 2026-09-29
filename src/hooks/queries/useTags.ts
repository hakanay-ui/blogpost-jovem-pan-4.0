import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TagOption } from "@/components/blog/TagsSelector";

export function usePostTags(postId: string | null | undefined) {
  return useQuery({
    queryKey: ["post_tags", postId],
    enabled: !!postId,
    queryFn: async (): Promise<TagOption[]> => {
      const { data, error } = await supabase
        .from("post_tags")
        .select("tag:tags(id, name, slug)")
        .eq("post_id", postId!);
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => row.tag)
        .filter(Boolean) as TagOption[];
    },
  });
}

export async function syncPostTags(postId: string, next: TagOption[]): Promise<void> {
  const { data: current, error: selErr } = await supabase
    .from("post_tags")
    .select("tag_id")
    .eq("post_id", postId);
  if (selErr) throw selErr;
  const currentIds = new Set((current ?? []).map((r) => r.tag_id));
  const nextIds = new Set(next.map((t) => t.id));

  const toAdd = next.filter((t) => !currentIds.has(t.id));
  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("post_tags")
      .insert(toAdd.map((t) => ({ post_id: postId, tag_id: t.id })));
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("post_tags")
      .delete()
      .eq("post_id", postId)
      .in("tag_id", toRemove);
    if (error) throw error;
  }
}
