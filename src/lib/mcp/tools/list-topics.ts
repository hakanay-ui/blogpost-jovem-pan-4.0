import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_topics",
  title: "Listar linhas editoriais",
  description: "Lista as linhas editoriais (tópicos) configuradas no painel.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from("editorial_topics").select("id,name,description").order("name");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const topics = (data ?? []).map((t) => ({ id: t.id, name: t.name, description: t.description }));
    return { content: [{ type: "text", text: JSON.stringify(topics) }], structuredContent: { topics } };
  },
});
