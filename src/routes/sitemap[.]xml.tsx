import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getSitemap = createServerFn({ method: "GET" }).handler(async () => {
  const { buildSitemap } = await import("@/server/seo");
  return buildSitemap();
});

export const Route = createFileRoute("/sitemap.xml")({
  loader: async () => {
    const xml = await getSitemap();
    throw new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=600",
      },
    });
  },
  component: () => null,
});
