import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CreatorProfile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
  website_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  show_on_blog: boolean;
};

const SELECT =
  "id,full_name,email,avatar_url,bio,job_title,website_url,twitter_url,linkedin_url,github_url,instagram_url,youtube_url,show_on_blog";

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["my_profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CreatorProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(SELECT)
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as CreatorProfile | null) ?? null;
    },
  });
}

export function useUpdateMyProfile(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CreatorProfile>) => {
      if (!userId) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_profile", userId] });
    },
  });
}

export function useAuthorByPostId(postId: string | undefined) {
  return useQuery({
    queryKey: ["author_by_post", postId],
    enabled: !!postId,
    queryFn: async (): Promise<CreatorProfile | null> => {
      const { data: post } = await supabase
        .from("posts")
        .select("author_id")
        .eq("id", postId!)
        .maybeSingle();
      const authorId = (post as { author_id: string | null } | null)?.author_id;
      if (!authorId) return null;
      const { data } = await supabase
        .from("profiles")
        .select(SELECT)
        .eq("id", authorId)
        .eq("show_on_blog", true)
        .maybeSingle();
      return (data as CreatorProfile | null) ?? null;
    },
  });
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadBrandAsset(file: File, kind: "logo" | "favicon"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("brand-assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
  return data.publicUrl;
}
