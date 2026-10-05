import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_posts",
  title: "Listar matérias",
  description: "Lista as matérias mais recentes do blog, opcionalmente filtradas por status.",
  inputSchema: {
    status: z.enum(["draft", "scheduled", "published", "archived"]).optional().describe("Filtrar por status."),
    limit: z.number().int().min(1).max(50).optional().describe("Quantidade (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("posts")
      .select("id,title,slug,status,excerpt,published_at,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const posts = (data ?? []).map((p) => ({
      id: p.id, title: p.title, slug: p.slug, status: p.status,
      excerpt: p.excerpt, published_at: p.published_at, created_at: p.created_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(posts) }], structuredContent: { posts } };
  },
});
