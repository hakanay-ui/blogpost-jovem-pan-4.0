import { queryOptions } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AudienceStats } from "./audience";

// The generated database types can lag behind an applied additive migration.
const analyticsClient: SupabaseClient = supabase;

export const audienceQueryOptions = queryOptions({
  queryKey: ["audience"],
  staleTime: 60_000,
  queryFn: async (): Promise<AudienceStats> => {
    const { data, error } = await analyticsClient.rpc("get_audience_stats");
    if (error) throw new Error("Não foi possível carregar a audiência. Tente novamente.");
    return data as AudienceStats;
  },
});

export async function recordPageVisit(input: {
  event_id: string;
  session_id: string;
  path: string;
  referrer: string | null;
}) {
  const { error } = await analyticsClient.rpc("record_page_visit", {
    p_event_id: input.event_id,
    p_session_id: input.session_id,
    p_path: input.path,
    p_referrer: input.referrer,
  });
  if (error) throw error;
}