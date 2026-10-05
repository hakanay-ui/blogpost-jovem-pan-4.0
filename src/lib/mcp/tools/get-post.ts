import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_post",
  title: "Ver matéria",
  description: "Retorna o conteúdo completo de uma matéria pelo id ou slug.",
  inputSchema: { idOrSlug: z.string().min(1).describe("Id (uuid) ou slug da matéria.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ idOrSlug }, ctx) => {
    const sb = supabaseForUser(ctx);
    const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
    const { data, error } = await sb
      .from("posts")
      .select("id,title,subtitle,slug,status,excerpt,content,published_at")
      .eq(isUuid ? "id" : "slug", idOrSlug)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Matéria não encontrada." }], isError: true };
    const post = { ...data };
    return { content: [{ type: "text", text: JSON.stringify(post) }], structuredContent: { post } };
  },
});
