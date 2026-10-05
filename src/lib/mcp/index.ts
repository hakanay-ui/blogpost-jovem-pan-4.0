import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPosts from "./tools/list-posts";
import getPost from "./tools/get-post";
import listTopics from "./tools/list-topics";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "blogpost-jovem-pan-4-0",
  title: "Blogpost Jovem Pan - 4.0",
  version: "0.1.0",
  instructions:
    "Ferramentas do portal Jovem Pan. Use `list_posts` para ver matérias, `get_post` para ler uma matéria completa e `list_topics` para as linhas editoriais.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPosts, getPost, listTopics],
});
