import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DailyBucket = { date: string; count: number };

function last14DaysBuckets(): DailyBucket[] {
  const out: DailyBucket[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    out.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return out;
}

export type DashboardStats = {
  posts: number;
  drafts: number;
  scheduled: number;
  topics: number;
  feeds: number;
  daily: DailyBucket[];
};

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<DashboardStats> => {
      const from = new Date();
      from.setDate(from.getDate() - 13);
      from.setHours(0, 0, 0, 0);

      const [p, d, s, t, f, recent] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
        supabase.from("editorial_topics").select("*", { count: "exact", head: true }),
        supabase.from("rss_feeds").select("*", { count: "exact", head: true }),
        supabase
          .from("posts")
          .select("published_at")
          .eq("status", "published")
          .gte("published_at", from.toISOString()),
      ]);

      const buckets = last14DaysBuckets();
      const bucketIdx = new Map(buckets.map((b, i) => [b.date, i]));
      for (const row of recent.data ?? []) {
        if (!row.published_at) continue;
        const key = new Date(row.published_at).toISOString().slice(0, 10);
        const idx = bucketIdx.get(key);
        if (idx !== undefined) buckets[idx].count += 1;
      }

      return {
        posts: p.count ?? 0,
        drafts: d.count ?? 0,
        scheduled: s.count ?? 0,
        topics: t.count ?? 0,
        feeds: f.count ?? 0,
        daily: buckets,
      };
    },
  });
}
