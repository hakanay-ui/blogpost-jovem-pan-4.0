// Generates a cover image for a post using Lovable AI (Nano Banana) and
// uploads it to the `post-covers` storage bucket. Returns the public URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdminOrScheduler } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) throw new Error("Resposta de imagem inválida (sem data URL).");
  const mime = match[1];
  const b64 = match[2];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "png";
}

const MODEL_BY_QUALITY: Record<string, string> = {
  standard: "google/gemini-3.1-flash-image-preview", // Nano Banana 2
  high: "google/gemini-3-pro-image-preview",          // Gemini 3 Pro Image
};

async function generateOne(
  apiKey: string,
  finalPrompt: string,
  model: string,
): Promise<{ bytes: Uint8Array; mime: string } | { error: string; status: number }> {
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: finalPrompt }],
      modalities: ["image", "text"],
    }),
  });
  if (aiRes.status === 429) return { error: "Rate limit do AI Gateway.", status: 429 };
  if (aiRes.status === 402) return { error: "Créditos do AI Gateway esgotados.", status: 402 };
  if (!aiRes.ok) {
    const t = await aiRes.text();
    console.error("AI gateway image error:", aiRes.status, t);
    return { error: `AI Gateway error ${aiRes.status}`, status: 500 };
  }
  const data = await aiRes.json();
  const dataUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) {
    console.error("AI sem imagem na resposta:", JSON.stringify(data).slice(0, 400));
    return { error: "IA não retornou imagem.", status: 500 };
  }
  return dataUrlToBytes(dataUrl);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdminOrScheduler(req);
  if (!auth.ok) return auth.response;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const body = await req.json().catch(() => ({}));
    const prompt: string = (body?.prompt ?? "").toString().trim();
    const postId: string | undefined = body?.postId;
    const title: string | undefined = body?.title;
    const excerpt: string | undefined = body?.excerpt;
    const quality: "standard" | "high" =
      body?.quality === "high" ? "high" : "standard";
    const rawCount = Number(body?.count ?? 1);
    const count = rawCount === 3 ? 3 : 1;

    if (!prompt && !title) {
      return jsonResponse({ error: "Informe um prompt ou o título do post." }, 400);
    }

    const model = MODEL_BY_QUALITY[quality];
    const finalPrompt =
      prompt ||
      `Crie uma imagem de capa editorial moderna, minimalista e profissional para um artigo de blog intitulado "${title}". ${
        excerpt ? `Resumo: ${excerpt}.` : ""
      } Estilo: ilustração conceitual elegante, paleta harmoniosa, sem texto, sem marcas d'água. ` +
      `Composição horizontal widescreen 16:9 cinematográfica, enquadramento amplo, alta resolução editorial, sem bordas.`;

    // Gera N imagens em paralelo.
    const results = await Promise.all(
      Array.from({ length: count }).map(() => generateOne(LOVABLE_API_KEY, finalPrompt, model)),
    );

    const errored = results.find((r) => "error" in r) as { error: string; status: number } | undefined;
    const successes = results.filter((r) => "bytes" in r) as { bytes: Uint8Array; mime: string }[];
    if (successes.length === 0 && errored) {
      return jsonResponse({ error: errored.error }, errored.status);
    }

    // Upload no bucket `post-covers`.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const baseFolder = postId || "ai-generated";
    const ts = Date.now();
    const subfolder = count === 3 ? `${baseFolder}/variants` : baseFolder;

    const uploads = await Promise.all(
      successes.map(async ({ bytes, mime }, i) => {
        const ext = extFromMime(mime);
        const path = count === 3 ? `${subfolder}/${ts}-${i}.${ext}` : `${subfolder}/${ts}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("post-covers")
          .upload(path, bytes, { contentType: mime, upsert: true, cacheControl: "3600" });
        if (upErr) throw new Error(`Falha no upload: ${upErr.message}`);
        const { data: pub } = supabase.storage.from("post-covers").getPublicUrl(path);
        return { url: pub.publicUrl, path };
      }),
    );

    // Single-image: atualiza o post automaticamente (comportamento legado).
    if (count === 1 && postId && uploads[0]) {
      await supabase.from("posts").update({ cover_image_url: uploads[0].url }).eq("id", postId);
    }

    if (count === 3) {
      return jsonResponse({ ok: true, variants: uploads, model, quality });
    }
    return jsonResponse({ ok: true, url: uploads[0].url, path: uploads[0].path, model, quality });
  } catch (e) {
    console.error("generate-cover-image error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});
