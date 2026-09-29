import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ServiceStatus = {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  source: "db" | "env" | "platform" | "none";
  lastFour: string | null;
  managed?: "platform" | "connector";
};

const DB_KEY_BY_SERVICE: Record<string, string> = {
  openai: "openai_api_key",
  anthropic: "anthropic_api_key",
  perplexity: "perplexity_api_key",
};

const ENV_KEY_BY_SERVICE: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  lovable_ai: "LOVABLE_API_KEY",
};

async function assertAdmin(context: { userId: string }) {
  // Verify role with service-role client to remove RLS as the authorization gate.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: role, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !role) throw new Error("Acesso negado.");
}

async function getEffectiveKey(
  supabase: any,
  serviceId: string,
): Promise<{ key: string | null; source: "db" | "env" | "none" }> {
  const dbKey = DB_KEY_BY_SERVICE[serviceId];
  if (dbKey) {
    const { data } = await supabase
      .from("project_config")
      .select("value")
      .eq("key", dbKey)
      .maybeSingle();
    if (data?.value && data.value.trim().length > 0) {
      return { key: data.value, source: "db" };
    }
  }
  const envKey = ENV_KEY_BY_SERVICE[serviceId];
  const envVal = envKey ? process.env[envKey] : undefined;
  if (envVal) return { key: envVal, source: "env" };
  return { key: null, source: "none" };
}

/**
 * Returns configuration status for all integrated services + default model.
 * Never returns full key values — only `lastFour` for preview.
 */
export const getIntegrationsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const definitions: Array<Omit<ServiceStatus, "configured" | "source" | "lastFour">> = [
      {
        id: "lovable_ai",
        name: "Lovable AI",
        description:
          "Modelos de IA integrados à plataforma (Gemini, GPT via gateway).",
        managed: "platform",
      },
      {
        id: "perplexity",
        name: "Perplexity",
        description:
          "Pesquisa inteligente com IA para enriquecer o conteúdo gerado. Cole sua chave ou use o connector da plataforma.",
      },
      {
        id: "openai",
        name: "OpenAI",
        description: "GPT-5 / GPT-5-mini para geração nativa.",
      },
      {
        id: "anthropic",
        name: "Anthropic",
        description: "Claude para geração com raciocínio avançado.",
      },
    ];

    const services: ServiceStatus[] = await Promise.all(
      definitions.map(async (def) => {
        if (def.id === "lovable_ai") {
          const configured = !!process.env.LOVABLE_API_KEY;
          return {
            ...def,
            configured,
            source: configured ? "platform" : "none",
            lastFour: null,
          };
        }
        const { key, source } = await getEffectiveKey(context.supabase, def.id);
        return {
          ...def,
          configured: !!key,
          source: key ? source : "none",
          lastFour: key ? key.slice(-4) : null,
        };
      }),
    );

    const { data: cfg } = await context.supabase
      .from("project_config")
      .select("key,value")
      .in("key", ["default_llm_provider", "default_llm_model"]);
    const cfgMap = Object.fromEntries(
      (cfg ?? []).map((r: any) => [r.key, r.value] as const),
    );

    return {
      services,
      defaultProvider: cfgMap.default_llm_provider || "lovable_ai",
      defaultModel: cfgMap.default_llm_model || "google/gemini-3-flash-preview",
    };
  });

/**
 * Save (upsert) an API key for a custom provider into project_config.
 */
export const saveIntegrationKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      serviceId: z.enum(["openai", "anthropic", "perplexity"]),
      apiKey: z
        .string()
        .min(10, "Chave muito curta")
        .max(500, "Chave muito longa")
        .regex(/^\S+$/, "Chave não pode conter espaços"),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const dbKey = DB_KEY_BY_SERVICE[data.serviceId];
    const { error } = await context.supabase
      .from("project_config")
      .upsert(
        { key: dbKey, value: data.apiKey, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error("Falha ao salvar chave.");
    return { ok: true };
  });

/**
 * Clear a stored API key (sets value to '').
 */
export const clearIntegrationKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      serviceId: z.enum(["openai", "anthropic", "perplexity"]),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const dbKey = DB_KEY_BY_SERVICE[data.serviceId];
    const { error } = await context.supabase
      .from("project_config")
      .upsert(
        { key: dbKey, value: "", updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error("Falha ao remover chave.");
    return { ok: true };
  });

/**
 * Set default LLM provider + model used by /admin/generate.
 */
export const setDefaultModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      provider: z.enum(["lovable_ai", "openai", "anthropic"]),
      model: z.string().min(1).max(120),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    // Verify provider is configured
    if (data.provider === "lovable_ai") {
      if (!process.env.LOVABLE_API_KEY) {
        throw new Error("Lovable AI não está configurado.");
      }
    } else {
      const { key } = await getEffectiveKey(context.supabase, data.provider);
      if (!key) throw new Error(`${data.provider} não está configurado.`);
    }

    const now = new Date().toISOString();
    const { error: e1 } = await context.supabase
      .from("project_config")
      .upsert(
        { key: "default_llm_provider", value: data.provider, updated_at: now },
        { onConflict: "key" },
      );
    const { error: e2 } = await context.supabase
      .from("project_config")
      .upsert(
        { key: "default_llm_model", value: data.model, updated_at: now },
        { onConflict: "key" },
      );
    if (e1 || e2) throw new Error("Falha ao salvar modelo padrão.");

    return { ok: true };
  });

/**
 * Test a service connection by making a lightweight API call.
 */
export const testIntegrationConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      serviceId: z.enum(["openai", "anthropic", "perplexity", "lovable_ai"]),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { serviceId } = data;

    try {
      if (serviceId === "lovable_ai") {
        return {
          ok: !!process.env.LOVABLE_API_KEY,
          message: process.env.LOVABLE_API_KEY
            ? "Gerenciado pela plataforma — ativo."
            : "Não configurado.",
        };
      }

      const { key } = await getEffectiveKey(context.supabase, serviceId);
      if (!key) return { ok: false, message: "Chave não configurada." };

      switch (serviceId) {
        case "openai": {
          const res = await fetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${key}` },
          });
          if (!res.ok)
            return {
              ok: false,
              message: `Erro ${res.status}: chave inválida ou sem créditos.`,
            };
          return { ok: true, message: "Conexão com OpenAI verificada." };
        }
        case "anthropic": {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": key,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-3-haiku-20240307",
              max_tokens: 1,
              messages: [{ role: "user", content: "ping" }],
            }),
          });
          if (!res.ok)
            return {
              ok: false,
              message: `Erro ${res.status}: chave inválida ou sem créditos.`,
            };
          return { ok: true, message: "Conexão com Anthropic verificada." };
        }
        case "perplexity": {
          const res = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar",
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 16,
            }),
          });
          if (!res.ok) {
            const errorText = await res.text();
            return {
              ok: false,
              message:
                res.status === 401
                  ? "Erro 401: chave inválida."
                  : `Erro ${res.status}: ${errorText || "falha ao validar chave."}`,
            };
          }
          return { ok: true, message: "Conexão com Perplexity verificada." };
        }
      }
      return { ok: false, message: "Serviço desconhecido." };
    } catch (e) {
      return {
        ok: false,
        message: `Falha na conexão: ${
          e instanceof Error ? e.message : "erro desconhecido"
        }`,
      };
    }
  });
