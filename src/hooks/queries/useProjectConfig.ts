import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ConfigKey =
  | "require_account_approval"
  | "restrict_signup_by_domain"
  | "allowed_email_domains"
  | "blog_name"
  | "blog_tagline"
  | "blog_logo_url"
  | "blog_favicon_url"
  | "blog_company"
  | "blog_url"
  | "blog_hero_eyebrow"
  | "blog_hero_title"
  | "blog_hero_subtitle"
  | "blog_hero_image_url"
  | "blog_default_cover_url"
  | "blog_section_eyebrow"
  | "blog_section_title"
  | "auto_generate_cover"
  | "cover_image_quality"
  | "cover_image_variants"
  | "blog_player_url_goiania"
  | "blog_player_url_caldas"
  | "blog_corrections_email"
  | "blog_commercial_email"
  | "blog_commercial_whatsapp"
  | "editorial_engine_enabled"
  | "editorial_advertisers";

export type ConfigMap = Partial<Record<ConfigKey, string>>;

const KEYS: ConfigKey[] = [
  "require_account_approval",
  "restrict_signup_by_domain",
  "allowed_email_domains",
  "blog_name",
  "blog_tagline",
  "blog_logo_url",
  "blog_favicon_url",
  "blog_company",
  "blog_url",
  "blog_hero_eyebrow",
  "blog_hero_title",
  "blog_hero_subtitle",
  "blog_hero_image_url",
  "blog_default_cover_url",
  "blog_section_eyebrow",
  "blog_section_title",
  "auto_generate_cover",
  "cover_image_quality",
  "cover_image_variants",
  "blog_player_url_goiania",
  "blog_player_url_caldas",
  "blog_corrections_email",
  "blog_commercial_email",
  "blog_commercial_whatsapp",
  "editorial_engine_enabled",
  "editorial_advertisers",
];

export function useProjectConfig() {
  return useQuery({
    queryKey: ["project_config"],
    queryFn: async (): Promise<ConfigMap> => {
      const { data, error } = await supabase
        .from("project_config")
        .select("key,value")
        .in("key", KEYS);
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).map((r) => [r.key, r.value] as const),
      ) as ConfigMap;
    },
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: ConfigKey; value: string }) => {
      // upsert garante que chaves novas (ex: blog_name) sejam criadas.
      const { error } = await supabase
        .from("project_config")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      if (error) throw error;
    },
    onMutate: async ({ key, value }) => {
      await qc.cancelQueries({ queryKey: ["project_config"] });
      const previous = qc.getQueryData<ConfigMap>(["project_config"]);
      qc.setQueryData<ConfigMap>(["project_config"], (old) => ({
        ...(old ?? {}),
        [key]: value,
      }));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["project_config"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["project_config"] }),
  });
}
