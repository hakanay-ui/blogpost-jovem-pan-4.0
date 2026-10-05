// Server-only helpers to build sitemap.xml and feed.xml.
// Consumed by server routes via throw new Response(xml, ...).

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { postPath } from "@/lib/site";

type PostRow = {
  title: string;
  slug: string;
  excerpt: string | null;
  subtitle: string | null;
  published_at: string | null;
  updated_at: string | null;
  topic: { slug: string | null; name?: string } | null;
};

function siteUrl(): string {
  const base =
    process.env.VITE_SITE_URL ??
    process.env.SITE_URL ??
    "https://newsfeed-whisperer.lovable.app";
  return base.replace(/\/$/, "");
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function buildSitemap(): Promise<string> {
  const base = siteUrl();
  const { data } = await supabaseAdmin
    .from("posts")
    .select("slug, published_at, updated_at, topic:editorial_topics(slug)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1000);

  const now = new Date().toISOString();
  const urls: Array<{ loc: string; lastmod: string }> = [
    { loc: `${base}/`, lastmod: now },
    { loc: `${base}/ultimas`, lastmod: now },
  ];
  const { data: topics } = await supabaseAdmin
    .from("editorial_topics")
    .select("slug")
    .eq("active", true)
    .not("slug", "is", null);
  for (const t of topics ?? []) urls.push({ loc: `${base}/${t.slug}`, lastmod: now });
  for (const p of (data ?? []) as unknown as PostRow[]) {
    const lastmod = p.updated_at ?? p.published_at ?? now;
    urls.push({ loc: `${base}${postPath(p)}`, lastmod });
  }

  const body = urls
    .map(
      (u) =>
        `  <url><loc>${xmlEscape(u.loc)}</loc><lastmod>${xmlEscape(
          u.lastmod,
        )}</lastmod></url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export async function buildRssFeed(): Promise<string> {
  const base = siteUrl();
  const { data } = await supabaseAdmin
    .from("posts")
    .select("title, slug, excerpt, subtitle, published_at, topic:editorial_topics(slug, name)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(20);

  const items = ((data ?? []) as unknown as PostRow[])
    .map((p) => {
      const link = `${base}${postPath(p)}`;
      const description = p.subtitle || p.excerpt;
      const pubDate = p.published_at
        ? new Date(p.published_at).toUTCString()
        : new Date().toUTCString();
      return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${xmlEscape(pubDate)}</pubDate>
      ${p.topic?.name ? `<category>${xmlEscape(p.topic.name)}</category>` : ""}
      ${description ? `<description>${xmlEscape(description)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  const buildDate = new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Jovem Pan Goiás</title>
    <link>${xmlEscape(base)}</link>
    <atom:link href="${xmlEscape(`${base}/feed.xml`)}" rel="self" type="application/rss+xml"/>
    <description>Notícias de Goiânia, Caldas Novas e Goiás.</description>
    <language>pt-BR</language>
    <lastBuildDate>${xmlEscape(buildDate)}</lastBuildDate>
${items}
  </channel>
</rss>`;
}
