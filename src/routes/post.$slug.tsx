import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { UNCATEGORIZED_SLUG } from "@/lib/site";

// URL antiga (/post/slug). Redireciona (301) para /categoria/slug.
const fetchCategoryOf = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => {
    if (typeof slug !== "string" || !slug || slug.length > 200) throw new Error("slug inválido");
    return slug;
  })
  .handler(async ({ data: slug }): Promise<string | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("posts")
      .select("topic:editorial_topics(slug)")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!data) return null;
    const topic = (data as unknown as { topic: { slug: string | null } | null }).topic;
    return topic?.slug || UNCATEGORIZED_SLUG;
  });

export const Route = createFileRoute("/post/$slug")({
  loader: async ({ params }) => {
    const categoria = await fetchCategoryOf({ data: params.slug });
    if (!categoria) throw notFound();
    throw redirect({ to: "/$categoria/$slug", params: { categoria, slug: params.slug }, statusCode: 301 });
  },
  component: () => null,
});
