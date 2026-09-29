// Server-only helpers to build sitemap.xml and feed.xml.
// Consumed by server routes via throw new Response(xml, ...).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
    .select("slug, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1000);

  const urls: Array<{ loc: string; lastmod: string }> = [
    { loc: `${base}/`, lastmod: new Date().toISOString() },
  ];
  for (const p of data ?? []) {
    const lastmod = p.updated_at ?? p.published_at ?? new Date().toISOString();
    urls.push({ loc: `${base}/post/${p.slug}`, lastmod });
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
    .select("title, slug, excerpt, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(20);

  const items = (data ?? [])
    .map((p) => {
      const link = `${base}/post/${p.slug}`;
      const pubDate = p.published_at
        ? new Date(p.published_at).toUTCString()
        : new Date().toUTCString();
      return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${xmlEscape(pubDate)}</pubDate>
      ${p.excerpt ? `<description>${xmlEscape(p.excerpt)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  const buildDate = new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>EditorIA — Blog técnico</title>
    <link>${xmlEscape(base)}</link>
    <atom:link href="${xmlEscape(`${base}/feed.xml`)}" rel="self" type="application/rss+xml"/>
    <description>Blog editorial automatizado com IA a partir de RSS e Perplexity.</description>
    <language>pt-BR</language>
    <lastBuildDate>${xmlEscape(buildDate)}</lastBuildDate>
${items}
  </channel>
</rss>`;
}
