// Helper compartilhado para ler chaves de API e configuração de modelo padrão
// com precedência: project_config (banco) → env var (fallback).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export type ApiKeyName =
  | "openai_api_key"
  | "anthropic_api_key"
  | "perplexity_api_key";

export async function getApiKey(name: ApiKeyName): Promise<string | null> {
  try {
    const { data } = await admin
      .from("project_config")
      .select("value")
      .eq("key", name)
      .maybeSingle();
    if (data?.value && data.value.trim().length > 0) return data.value;
  } catch {
    // fall through to env
  }
  const envName = name.toUpperCase();
  return Deno.env.get(envName) ?? null;
}

export async function getDefaultModel(): Promise<{
  provider: string;
  model: string;
}> {
  try {
    const { data } = await admin
      .from("project_config")
      .select("key,value")
      .in("key", ["default_llm_provider", "default_llm_model"]);
    const map = Object.fromEntries(
      (data ?? []).map((r) => [r.key, r.value] as const),
    );
    return {
      provider: map.default_llm_provider || "lovable_ai",
      model: map.default_llm_model || "google/gemini-3-flash-preview",
    };
  } catch {
    return {
      provider: "lovable_ai",
      model: "google/gemini-3-flash-preview",
    };
  }
}
