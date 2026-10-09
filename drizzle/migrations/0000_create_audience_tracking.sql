CREATE TABLE public.page_visits (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL,
  path text NOT NULL,
  referrer_host text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.page_visits TO authenticated;
GRANT ALL ON public.page_visits TO service_role;
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY page_visits_admin_select ON public.page_visits FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX page_visits_created_at_idx ON public.page_visits (created_at DESC);
CREATE INDEX page_visits_session_created_idx ON public.page_visits (session_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_page_visit(p_event_id uuid, p_session_id uuid, p_path text, p_referrer text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_event_id IS NULL OR p_session_id IS NULL OR p_path IS NULL OR length(p_path) > 1024
    OR p_path !~ '^/' OR p_path ~ '^//'
    OR p_path ~ '^/(admin|api|mcp|pending-approval)(/|$)' OR p_path ~ '^/\.'
    OR p_path ~ '[?#[:cntrl:]]' OR p_path ~ '\.(xml|json)$' THEN
    RAISE EXCEPTION 'Invalid public path';
  END IF;
  IF p_referrer IS NOT NULL AND (length(p_referrer) > 253 OR p_referrer !~ '^[a-zA-Z0-9.-]+$') THEN
    RAISE EXCEPTION 'Invalid referring hostname';
  END IF;
  IF (SELECT count(*) FROM public.page_visits WHERE session_id = p_session_id AND created_at > now() - interval '1 hour') >= 300 THEN
    RETURN;
  END IF;
  INSERT INTO public.page_visits (id, session_id, path, referrer_host)
  VALUES (p_event_id, p_session_id, p_path, lower(p_referrer)) ON CONFLICT (id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.record_page_visit(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_page_visit(uuid, uuid, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_audience_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'last24h', count(*) FILTER (WHERE created_at >= now() - interval '24 hours'),
    'last7days', count(*) FILTER (WHERE created_at >= now() - interval '7 days'),
    'last30days', count(*) FILTER (WHERE created_at >= now() - interval '30 days'),
    'sessions7days', count(DISTINCT session_id) FILTER (WHERE created_at >= now() - interval '7 days'),
    'total', count(*),
    'firstVisit', min(created_at),
    'daily', (SELECT coalesce(jsonb_agg(jsonb_build_object('date', d.day::text, 'visits', d.visits) ORDER BY d.day), '[]'::jsonb) FROM (
      SELECT calendar.day::date AS day, count(v.id) AS visits
      FROM generate_series((now() AT TIME ZONE 'America/Sao_Paulo')::date - 29, (now() AT TIME ZONE 'America/Sao_Paulo')::date, interval '1 day') AS calendar(day)
      LEFT JOIN public.page_visits v ON v.created_at >= (calendar.day AT TIME ZONE 'America/Sao_Paulo') AND v.created_at < ((calendar.day + interval '1 day') AT TIME ZONE 'America/Sao_Paulo')
      GROUP BY calendar.day
    ) d),
    'pages', (SELECT coalesce(jsonb_agg(jsonb_build_object('path', p.path, 'visits', p.visits) ORDER BY p.visits DESC, p.path), '[]'::jsonb) FROM (
      SELECT path, count(*) AS visits FROM public.page_visits WHERE created_at >= now() - interval '30 days' GROUP BY path ORDER BY visits DESC, path LIMIT 10
    ) p),
    'sources', (SELECT coalesce(jsonb_agg(jsonb_build_object('source', s.source, 'visits', s.visits) ORDER BY s.visits DESC, s.source), '[]'::jsonb) FROM (
      SELECT coalesce(referrer_host, 'Direto / sem referência') AS source, count(*) AS visits FROM public.page_visits WHERE created_at >= now() - interval '30 days' GROUP BY coalesce(referrer_host, 'Direto / sem referência') ORDER BY visits DESC, source LIMIT 10
    ) s)
  ) INTO result FROM public.page_visits;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_audience_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_audience_stats() TO authenticated;