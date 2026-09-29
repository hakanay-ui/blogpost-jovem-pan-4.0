// Sugere campos de uma linha editorial (descrição, palavras-chave, modo, frequência)
// a partir do nome do tema, usando Lovable AI com tool calling.
import { getDefaultModel } from "../_shared/keys.ts";
import { requireAdminOrScheduler } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdminOrScheduler(req);
  if (!auth.ok) return auth.response;

  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      throw new Error("name é obrigatório (mínimo 2 caracteres)");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");
    const { model } = await getDefaultModel();

    const systemPrompt = `Você é um estrategista editorial. Dado o nome de um tema, sugira:
- uma descrição curta (1-2 frases) com tom, ângulo e público-alvo
- 5 a 8 palavras-chave relevantes em português
- modo de publicação ("auto" para temas estáveis/factuais, "review" para temas sensíveis)
- frequência em horas (6, 12, 24, 48 ou 72) considerando volume típico de notícias do tema

Responda em português brasileiro.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "suggest_editorial_topic",
          description: "Retorna campos sugeridos para uma linha editorial",
          parameters: {
            type: "object",
            properties: {
              description: { type: "string", description: "1-2 frases, max 240 chars" },
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "5 a 8 termos curtos em pt-BR",
              },
              publish_mode: {
                type: "string",
                enum: ["auto", "review"],
                description: "auto para temas factuais, review para sensíveis",
              },
              frequency_hours: {
                type: "integer",
                description: "Horas entre gerações: 6, 12, 24, 48 ou 72",
              },
            },
            required: ["description", "keywords", "publish_mode", "frequency_hours"],
          },
        },
      },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Tema editorial: "${name.trim()}"` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "suggest_editorial_topic" } },
      }),
    });

    if (res.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit do AI Gateway. Tente novamente em alguns instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (res.status === 402) {
      return new Response(
        JSON.stringify({
          error: "Créditos do AI Gateway esgotados. Adicione créditos em Settings → Workspace → Usage.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error:", res.status, t);
      throw new Error(`AI Gateway error ${res.status}`);
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI não retornou estrutura esperada");
    const suggestion = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ ok: true, suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-topic error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
