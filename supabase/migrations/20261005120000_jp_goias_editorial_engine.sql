-- Jovem Pan Goiás — motor editorial (briefing v1, 05/10/2026).
-- Categorias, praça, grade de 12 horários/dia, feeds do briefing e campos
-- novos do post. Idempotente: pode rodar mais de uma vez.
-- O motor só gera posts quando project_config.editorial_engine_enabled = 'true'.

-- ── Categorias (editorial_topics) ─────────────────────────────────────────
ALTER TABLE public.editorial_topics
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS praca TEXT NOT NULL DEFAULT 'ambas',
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.editorial_topics
    ADD CONSTRAINT editorial_topics_praca_check CHECK (praca IN ('goiania', 'caldas-novas', 'ambas'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS editorial_topics_slug_key ON public.editorial_topics (slug);

INSERT INTO public.editorial_topics
  (slug, name, description, keywords, praca, sort_order, requires_approval, publish_mode, active)
VALUES
  ('goiania', 'Goiânia', 'Cidade, prefeitura, obras, saúde, educação, segurança, trânsito.',
    ARRAY['Goiânia', 'Prefeitura de Goiânia', 'Câmara de Goiânia'], 'goiania', 1, false, 'auto', true),
  ('caldas-novas', 'Caldas Novas e região', 'Cidade, turismo, eventos, serviços, Rio Quente e entorno.',
    ARRAY['Caldas Novas', 'Rio Quente', 'Marzagão', 'Piracanjuba'], 'caldas-novas', 2, false, 'auto', true),
  ('goias', 'Goiás', 'Governo do estado, Assembleia, interior com relevância estadual.',
    ARRAY['Goiás', 'Governo de Goiás', 'Alego'], 'ambas', 3, false, 'auto', true),
  ('politica', 'Política', 'Fatos da política goiana e decisões de Brasília que afetam Goiás.',
    ARRAY['política', 'eleições', 'Assembleia Legislativa'], 'ambas', 4, true, 'review', true),
  ('economia-agro', 'Economia e Agro', 'Agronegócio, emprego, comércio, indústria, preços.',
    ARRAY['agronegócio', 'emprego', 'comércio', 'indústria'], 'ambas', 5, false, 'auto', true),
  ('esporte', 'Esporte', 'Goiás, Vila Nova, Atlético-GO, Goiatuba, esporte amador e eventos locais.',
    ARRAY['Goiás EC', 'Vila Nova', 'Atlético-GO', 'Goiatuba'], 'ambas', 6, false, 'auto', true),
  ('servico', 'Serviço', 'Trânsito, clima, concursos, vagas, vacinação, prazos, interdições.',
    ARRAY['trânsito', 'clima', 'concurso', 'vacinação', 'interdição'], 'ambas', 7, false, 'auto', true),
  ('cultura-agenda', 'Cultura e Agenda', 'Shows, festas, gastronomia, o que fazer no fim de semana.',
    ARRAY['show', 'festa', 'agenda', 'gastronomia'], 'ambas', 8, false, 'auto', true),
  ('brasil-mundo', 'Brasil e Mundo', 'Só o fato do dia que todo mundo vai comentar, com o ângulo local.',
    ARRAY['Brasil', 'mundo'], 'ambas', 9, false, 'auto', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  keywords = EXCLUDED.keywords,
  praca = EXCLUDED.praca,
  sort_order = EXCLUDED.sort_order,
  requires_approval = EXCLUDED.requires_approval,
  publish_mode = EXCLUDED.publish_mode;

-- ── Feeds ─────────────────────────────────────────────────────────────────
ALTER TABLE public.rss_feeds
  ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'veiculo',
  ADD COLUMN IF NOT EXISTS discovery_only BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.rss_feeds
    ADD CONSTRAINT rss_feeds_source_kind_check CHECK (source_kind IN ('veiculo', 'oficial', 'busca'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.rss_feeds (name, url, source_kind, discovery_only, active, topic_id)
SELECT f.name, f.url, f.kind, f.discovery, true, t.id
FROM (VALUES
  -- 4.1 Veículos de notícia
  ('g1 Goiás', 'https://g1.globo.com/rss/g1/go/goias/', 'veiculo', false, NULL),
  ('A Redação', 'https://www.aredacao.com.br/feed/', 'veiculo', false, 'goiania'),
  ('Portal 6', 'https://portal6.com.br/feed/', 'veiculo', false, 'goiania'),
  ('Dia Online', 'https://diaonline.ig.com.br/feed/', 'veiculo', false, 'goiania'),
  ('Folha Z', 'https://www.folhaz.com.br/feed/', 'veiculo', false, 'politica'),
  ('Diário da Manhã', 'https://www.dm.com.br/feed/', 'veiculo', false, 'goias'),
  ('Diante do Fato', 'https://diantedofato.com.br/feed/', 'veiculo', false, 'goias'),
  ('Zap Catalão', 'https://zapcatalao.com.br/feed', 'veiculo', false, 'goias'),
  ('ge Goiás', 'https://ge.globo.com/rss/ge/go/', 'veiculo', false, 'esporte'),
  ('Esporte Goiano', 'https://esportegoiano.com.br/feed/', 'veiculo', false, 'esporte'),
  ('Agência Brasil', 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', 'veiculo', false, 'brasil-mundo'),
  ('Canal Rural', 'https://www.canalrural.com.br/feed/', 'veiculo', false, 'economia-agro'),
  -- 4.2 Fontes oficiais e institucionais
  ('Prefeitura de Goiânia', 'https://www.goiania.go.gov.br/feed/', 'oficial', false, 'goiania'),
  ('Governo de Goiás', 'https://goias.gov.br/feed', 'oficial', false, 'goias'),
  ('Corpo de Bombeiros GO', 'https://www.bombeiros.go.gov.br/feed', 'oficial', false, 'servico'),
  ('Goinfra (rodovias)', 'https://www.goinfra.go.gov.br/feed', 'oficial', false, 'servico'),
  ('ANTT', 'https://www.gov.br/antt/rss.xml', 'oficial', false, 'servico'),
  ('Fecomércio-GO', 'https://fecomercio-go.portaldocomercio.org.br/feed/', 'oficial', false, 'economia-agro'),
  ('Adial Goiás', 'https://www.adial.com.br/blog-feed.xml', 'oficial', false, 'economia-agro'),
  ('Aprosoja Goiás', 'https://aprosojago.com.br/feed/', 'oficial', false, 'economia-agro'),
  ('UFG – FACE', 'https://face.ufg.br/feed', 'oficial', false, 'economia-agro'),
  ('Prefeitura de Rio Quente', 'https://www.rioquente.go.gov.br/feed/', 'oficial', false, 'caldas-novas'),
  ('Prefeitura de Caldas Novas', 'https://www.caldasnovas.go.gov.br/feed/', 'oficial', false, 'caldas-novas'),
  -- 4.3 Busca complementar (Google Notícias): só descobre a pauta, nunca é citada
  ('Busca: Caldas Novas', 'https://news.google.com/rss/search?q=%22Caldas+Novas%22+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'busca', true, 'caldas-novas'),
  ('Busca: Rio Quente e região', 'https://news.google.com/rss/search?q=%22Rio+Quente%22+OR+%22Marzag%C3%A3o%22+OR+%22Piracanjuba%22+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'busca', true, 'caldas-novas'),
  ('Busca: O Popular', 'https://news.google.com/rss/search?q=site:opopular.com.br+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'busca', true, NULL),
  ('Busca: Mais Goiás', 'https://news.google.com/rss/search?q=site:maisgoias.com.br+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'busca', true, NULL),
  ('Busca: Jornal Opção', 'https://news.google.com/rss/search?q=site:jornalopcao.com.br+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'busca', true, NULL),
  ('Busca: Assembleia Legislativa GO', 'https://news.google.com/rss/search?q=%22Assembleia+Legislativa+de+Goi%C3%A1s%22+OR+Alego+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'busca', true, 'politica')
) AS f(name, url, kind, discovery, topic_slug)
LEFT JOIN public.editorial_topics t ON t.slug = f.topic_slug
ON CONFLICT (url) DO UPDATE SET
  name = EXCLUDED.name,
  source_kind = EXCLUDED.source_kind,
  discovery_only = EXCLUDED.discovery_only,
  topic_id = EXCLUDED.topic_id;

-- ── Posts: campos do formato do briefing ──────────────────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS praca TEXT,
  ADD COLUMN IF NOT EXISTS cover_alt TEXT,
  ADD COLUMN IF NOT EXISTS cover_credit TEXT,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS slot_id UUID,
  ADD COLUMN IF NOT EXISTS source_item_id UUID REFERENCES public.rss_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_topic_published_idx ON public.posts (topic_id, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS rss_items_published_at_idx ON public.rss_items (published_at DESC);

-- ── Grade de horários ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_type TEXT NOT NULL CHECK (day_type IN ('weekday', 'weekend')),
  slot_time TIME NOT NULL,
  topic_slugs TEXT[] NOT NULL DEFAULT '{}',
  focus TEXT,
  strongest_of_day BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  last_run_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day_type, slot_time)
);

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_slot_id_fkey;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.schedule_slots(id) ON DELETE SET NULL;

ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_slots TO authenticated;
GRANT ALL ON public.schedule_slots TO service_role;

DROP POLICY IF EXISTS schedule_slots_admin_all ON public.schedule_slots;
CREATE POLICY schedule_slots_admin_all ON public.schedule_slots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS schedule_slots_editor_select ON public.schedule_slots;
CREATE POLICY schedule_slots_editor_select ON public.schedule_slots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'editor'));

DROP TRIGGER IF EXISTS schedule_slots_updated_at ON public.schedule_slots;
CREATE TRIGGER schedule_slots_updated_at
  BEFORE UPDATE ON public.schedule_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Horários no fuso de Goiás (America/Sao_Paulo).
INSERT INTO public.schedule_slots (day_type, slot_time, topic_slugs, focus, strongest_of_day) VALUES
  ('weekday', '06:30', ARRAY['servico'], 'Serviço do dia: trânsito, clima, prazos', false),
  ('weekday', '07:30', ARRAY['goiania'], NULL, false),
  ('weekday', '08:30', ARRAY['politica', 'goias'], NULL, false),
  ('weekday', '09:30', ARRAY['caldas-novas'], NULL, false),
  ('weekday', '10:30', ARRAY['economia-agro'], NULL, false),
  ('weekday', '11:30', ARRAY['goiania'], NULL, false),
  ('weekday', '13:00', ARRAY['esporte'], NULL, false),
  ('weekday', '14:00', ARRAY['brasil-mundo'], 'Brasil e Mundo com ângulo local', false),
  ('weekday', '15:00', ARRAY['caldas-novas'], NULL, false),
  ('weekday', '16:00', ARRAY['goias', 'politica'], NULL, false),
  ('weekday', '17:30', ARRAY['cultura-agenda'], NULL, false),
  ('weekday', '19:00', ARRAY[]::TEXT[], 'O assunto mais forte do dia', true),
  ('weekend', '06:30', ARRAY['servico'], 'Serviço e clima do fim de semana', false),
  ('weekend', '07:30', ARRAY['goiania'], NULL, false),
  ('weekend', '08:30', ARRAY['cultura-agenda'], 'O que fazer hoje', false),
  ('weekend', '09:30', ARRAY['caldas-novas'], 'Turismo', false),
  ('weekend', '10:30', ARRAY['esporte'], 'Pré-jogo', false),
  ('weekend', '11:30', ARRAY['goias'], NULL, false),
  ('weekend', '13:00', ARRAY['economia-agro'], NULL, false),
  ('weekend', '14:00', ARRAY['brasil-mundo'], 'Brasil e Mundo com ângulo local', false),
  ('weekend', '15:00', ARRAY['caldas-novas'], NULL, false),
  ('weekend', '16:00', ARRAY['goiania'], NULL, false),
  ('weekend', '17:30', ARRAY['esporte'], 'Resultados', false),
  ('weekend', '19:00', ARRAY[]::TEXT[], 'O assunto mais forte do dia', true)
ON CONFLICT (day_type, slot_time) DO NOTHING;

-- ── Configuração ──────────────────────────────────────────────────────────
-- Chaves blog_* são lidas pelo front público; as demais seguem só para admin.
INSERT INTO public.project_config (key, value) VALUES
  ('editorial_engine_enabled', 'false'),
  ('editorial_advertisers', ''),
  ('blog_player_url_goiania', ''),
  ('blog_player_url_caldas', ''),
  ('blog_corrections_email', ''),
  ('blog_commercial_email', ''),
  ('blog_commercial_whatsapp', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.project_config (key, value) VALUES
  ('blog_name', 'Jovem Pan Goiás'),
  ('blog_tagline', 'Notícias de Goiânia, Caldas Novas e Goiás'),
  ('blog_company', 'Jovem Pan FM Goiânia 106,7 · Caldas Novas 105,7')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

GRANT SELECT ON public.project_config TO anon, authenticated;
DROP POLICY IF EXISTS project_config_public_blog_keys ON public.project_config;
CREATE POLICY project_config_public_blog_keys ON public.project_config
  FOR SELECT TO anon, authenticated
  USING (key LIKE 'blog\_%');

-- ── Cron: a grade tem horários "e meia", então o scheduler roda a cada 15 min ─
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scheduler_hourly') THEN
    PERFORM cron.schedule(
      'scheduler_hourly',
      '*/15 * * * *',
      (SELECT command FROM cron.job WHERE jobname = 'scheduler_hourly')
    );
  END IF;
EXCEPTION WHEN undefined_table OR invalid_schema_name THEN
  RAISE NOTICE 'pg_cron indisponível; ajuste o agendamento manualmente.';
END $$;
