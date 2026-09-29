// Fetches RSS items for all active feeds and stores new items
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchWithRetry } from "../_shared/retry.ts";
import { startRun, finishRun } from "../_shared/runs.ts";
import { requireAdminOrScheduler } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeXmlEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function pick(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? decodeXmlEntities(m[1]).trim() : null;
}

function pickLink(xml: string): string | null {
  // Atom <link href="..."/> or RSS <link>...</link>
  const atom = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (atom) return atom[1];
  return pick(xml, "link");
}

function parseFeed(xml: string): Array<{ guid: string; title: string; link: string; description: string | null; published_at: string | null }> {
  const items: any[] = [];
  // Try RSS <item> first
  const itemRe = /<item[\s\S]*?<\/item>/gi;
  const entryRe = /<entry[\s\S]*?<\/entry>/gi;
  const blocks = xml.match(itemRe) || xml.match(entryRe) || [];
  for (const block of blocks.slice(0, 30)) {
    const title = pick(block, "title") || "";
    const link = pickLink(block) || "";
    const guid = pick(block, "guid") || pick(block, "id") || link;
    const description = pick(block, "description") || pick(block, "summary") || pick(block, "content");
    const pubDate = pick(block, "pubDate") || pick(block, "published") || pick(block, "updated");
    let published_at: string | null = null;
    if (pubDate) {
      const d = new Date(pubDate);
      if (!isNaN(d.getTime())) published_at = d.toISOString();
    }
    if (title && link) {
      items.push({ guid, title, link, description, published_at });
    }
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdminOrScheduler(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const run = await startRun(supabase, "fetch-rss");

  try {
    const { data: feeds, error: feedsError } = await supabase
      .from("rss_feeds")
      .select("id, url, name")
      .eq("active", true);

    if (feedsError) throw feedsError;

    let totalNew = 0;
    const results: any[] = [];

    for (const feed of feeds ?? []) {
      try {
        const res = await fetchWithRetry(
          feed.url,
          { headers: { "User-Agent": "Lovable-Blog/1.0" } },
          { maxAttempts: 2 },
        );
        if (!res.ok) {
          results.push({ feed: feed.name, error: `HTTP ${res.status}` });
          continue;
        }
        const xml = await res.text();
        const items = parseFeed(xml);

        const rows = items.map((it) => ({
          feed_id: feed.id,
          guid: it.guid.slice(0, 1000),
          title: it.title.slice(0, 500),
          link: it.link.slice(0, 1000),
          description: it.description?.slice(0, 5000) ?? null,
          published_at: it.published_at,
        }));

        if (rows.length > 0) {
          const { error: upErr, count } = await supabase
            .from("rss_items")
            .upsert(rows, { onConflict: "feed_id,guid", ignoreDuplicates: true, count: "exact" });
          if (upErr) {
            results.push({ feed: feed.name, error: upErr.message });
            continue;
          }
          totalNew += count ?? 0;
          results.push({ feed: feed.name, fetched: rows.length, new: count ?? 0 });
        }

        await supabase.from("rss_feeds").update({ last_fetched_at: new Date().toISOString() }).eq("id", feed.id);
      } catch (e: any) {
        results.push({ feed: feed.name, error: e.message });
      }
    }

    await finishRun(supabase, run, {
      status: "success",
      metadata: { totalNew, feedsProcessed: feeds?.length ?? 0 },
    });

    return new Response(JSON.stringify({ ok: true, totalNew, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("fetch-rss error:", e);
    await finishRun(supabase, run, { status: "error", error: e });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
