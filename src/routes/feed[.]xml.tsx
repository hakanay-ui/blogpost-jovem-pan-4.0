import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const getFeed = createServerFn({ method: "GET" }).handler(async () => {
  const { buildRssFeed } = await import("@/server/seo");
  return buildRssFeed();
});

export const Route = createFileRoute("/feed.xml")({
  loader: async () => {
    const xml = await getFeed();
    throw new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=600",
      },
    });
  },
  component: () => null,
});
