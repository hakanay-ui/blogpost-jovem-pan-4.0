## Visão geral

Esta é uma **plataforma de blog editorial automatizado com IA**. Em uma frase: você define "linhas editoriais" (tópicos) + fontes RSS, e o sistema pesquisa notícias recentes, redige artigos em pt-BR com IA e publica — manualmente, em revisão ou totalmente automático em um cron.

Stack: **TanStack Start (React 19 + Vite 7) + Supabase (Postgres + Auth + Edge Functions Deno) + Tailwind v4 + shadcn/Radix**. Deploy alvo: Cloudflare Workers. Pacote: bun.

---

## Arquitetura (camadas)

```text
┌──────────────────────────────────────────────────────────┐
│ FRONTEND (TanStack Start, SSR no Cloudflare Worker)      │
│  • Rotas públicas: /, /post/$slug, /tag/$slug,           │
│    /feed.xml, /sitemap.xml                                │
│  • Rotas admin (gated _authenticated):                    │
│    dashboard, topics, feeds, posts, generate, news,       │
│    team, security, integrations, logs, settings, profile  │
│  • Auth: Supabase + Google OAuth (broker Lovable)         │
└──────────────────────────────────────────────────────────┘
                │                       │
       supabase-js (client)     createServerFn (RPC tipado)
                │                       │
┌──────────────────────────────────────────────────────────┐
│ SUPABASE                                                  │
│  Postgres (RLS) + Auth + Storage (post-covers,            │
│  brand-assets, avatars) + Edge Functions (Deno)           │
└──────────────────────────────────────────────────────────┘
                │
┌──────────────────────────────────────────────────────────┐
│ PIPELINE DE IA (Edge Functions)                           │
│  pg_cron (hourly) → scheduler → fetch-rss                 │
│                              → generate-post (Perplexity  │
│                                + Lovable AI Gateway)      │
│                              → generate-cover-image       │
│  Auxiliares: suggest-topic, suggest-angles                │
└──────────────────────────────────────────────────────────┘
                │
        Perplexity API (sonar)  ·  Lovable AI Gateway (Gemini)
```

---

## Modelo de dados (Postgres)

Enums: `app_role(admin|editor|user)`, `post_status(draft|scheduled|published|archived)`, `publish_mode(auto|review)`.

Tabelas principais:
- **profiles** (1:1 com `auth.users`) — `full_name`, `email`, `avatar_url`, `is_approved`, `status`. Criada por trigger `handle_new_user` no signup. **Primeiro usuário vira admin + approved automaticamente.**
- **user_roles** — papéis múltiplos por user (`admin`, `editor`, `user`). Checado por `has_role(uid, role)` (SECURITY DEFINER, evita recursão de RLS).
- **project_config** — chave-valor para feature flags e segredos guardados no banco (ex.: `restrict_signup_by_domain`, `allowed_email_domains`, `require_account_approval`, `scheduler_secret`, `default_llm_provider`, `default_llm_model`, `auto_generate_cover`).
- **editorial_topics** — linha editorial: `name`, `description`, `keywords[]`, `publish_mode (auto/review)`, `schedule_mode (interval/daily_window/per_new_item)`, `frequency_hours`, `daily_run_hour`, `max_posts_per_day`, `last_generated_at`.
- **rss_feeds** — `url` único, `topic_id`, `active`, `last_fetched_at`.
- **rss_items** — itens coletados, UNIQUE(`feed_id`, `guid`) para dedup, `used_in_post_id` marca consumo.
- **posts** — `title`, `slug` único, `content` (markdown), `excerpt`, `cover_image_url`, `status`, `meta_title/description`, `sources` (jsonb, citações Perplexity), `ai_generated`, `published_at`, `scheduled_at`, `author_id`.
- **post_revisions** — histórico capturado pelo trigger `capture_post_revision` quando título/conteúdo/excerpt/capa mudam.
- **generation_runs** — auditoria de cada execução de Edge Function (`startRun`/`finishRun`).
- **research_sessions** — sessões de pesquisa do fluxo "sugerir ângulos".
- **tags** + relação N:N com posts.

**Regra dura:** toda tabela em `public` tem `GRANT` explícito para `authenticated`/`service_role` (e `anon` só onde há SELECT público) + RLS ligado + policies usando `has_role(auth.uid(), 'admin')`.

---

## Edge Functions (Deno)

Todas em `supabase/functions/*`, com `_shared/` para retry (`fetchWithRetry`), telemetria (`startRun`/`finishRun` → `generation_runs`), auth (`requireAdminOrScheduler`) e leitura de chaves (`getApiKey` busca em `project_config` antes do env).

1. **scheduler** — protegida por `Bearer <scheduler_secret>` (lido de `project_config.scheduler_secret`). Chamada pelo `pg_cron` de hora em hora. Faz:
   1. publica `posts.scheduled` cujo `scheduled_at <= now()`.
   2. invoca `fetch-rss`.
   3. lista `editorial_topics` ativos e decide quais estão "devidos" segundo o `schedule_mode`:
      - `interval`: `elapsed >= frequency_hours`.
      - `daily_window`: hora UTC == `daily_run_hour` e ainda não rodou hoje.
      - `per_new_item`: tem rss_item não usado e ainda não bateu `max_posts_per_day`.
   4. para cada devido, chama `generate-post`.

2. **fetch-rss** — varre `rss_feeds.active`, parseia RSS/Atom com regex caseiro, upsert em `rss_items` com `ON CONFLICT (feed_id, guid)`.

3. **generate-post** — coração do pipeline. Entrada: `topicId` (ou `adhocTopic` manual). Fluxo:
   1. Carrega `editorial_topics` + até 8 `rss_items` não consumidos do tópico.
   2. **Perplexity (`sonar`, `search_recency_filter: "week"`)** — pesquisa factual com prompt em pt-BR. Retorna `research` + `citations`.
   3. **Lovable AI Gateway (Gemini `google/gemini-3-flash-preview`)** — escreve o artigo via tool-calling: força a função `create_blog_post(title, excerpt, content, meta_title, meta_description)`. System prompt obriga pt-BR e tradução de fontes em outros idiomas.
   4. Slugifica título (dedup com sufixo timestamp em colisão).
   5. `status = topic.publish_mode === 'auto' ? 'published' : 'draft'`.
   6. INSERT em `posts` com `sources` (citations Perplexity).
   7. (Opcional, se `auto_generate_cover=true`) chama `generate-cover-image` para criar capa.
   8. Marca `rss_items.used_in_post_id` e atualiza `topic.last_generated_at`.

4. **generate-cover-image** — gera capa via IA, sobe no bucket `post-covers`, atualiza `posts.cover_image_url`.

5. **suggest-topic / suggest-angles** — assistentes admin no fluxo de criação manual.

### Prompts-chave (resumo dos que você precisa replicar)

- **Perplexity (research)** — system: "pesquisador editorial, factual, cita fontes, SEMPRE em pt-BR traduzindo trechos em outros idiomas". User: nome + descrição + keywords + lista numerada dos rss_items recentes.
- **Lovable AI (redação)** — system: "redator editorial, SEMPRE pt-BR, traduz fontes, markdown com `##`/`###`, NÃO inclui H1 (título separado), cita fontes `[1] [2]`". User: tópico + linha editorial + keywords + ângulo selecionado (opcional) + bloco PESQUISA RECENTE + bloco FONTES DISPONÍVEIS. Tool-call forçado para garantir saída estruturada.

---

## Frontend

- **Rotas**: file-based em `src/routes/`. Públicas no nível raiz (SSR para SEO). Admin sob `_authenticated/` (layout gerenciado pela integração Supabase, `ssr:false`, redireciona para `/auth` se sem sessão).
- **Auth**: `AuthContext` envolve o app. Login via `LoginSignupForm` (email/senha + Google via `lovable.auth.signInWithOAuth`). Usuário não-aprovado cai em `/pending-approval`.
- **Data fetching**: TanStack Query com hooks dedicados em `src/hooks/queries/*` (`useTopics`, `usePosts`, `useFeeds`, `useRssItems`, `useRuns`, etc.). Server functions sensíveis (`createServerFn` + `requireSupabaseAuth`) em `src/utils/*.functions.ts`.
- **UI**: shadcn em `src/components/ui/*`, layout admin em `src/layouts/AdminLayout.tsx` (sidebar), public em `src/layouts/PublicLayout.tsx`. Tema dark/light via `ThemeContext`.
- **Markdown**: `src/components/blog/Markdown.tsx` (sanitizado).
- **SEO**: cada rota define `head()` com title/description/og; `/feed.xml` e `/sitemap.xml` são server routes que leem `posts.published`.

---

## Regras e invariantes (importantes para clonar)

1. **Primeiro signup = admin** (via `handle_new_user`). Os seguintes entram como `user` + `is_approved=false` e dependem de aprovação manual.
2. **RLS sempre ligado**. Roles **nunca** ficam em `profiles` — sempre em `user_roles`, consultado por `has_role(...)` SECURITY DEFINER.
3. **Edge Functions internas** (`fetch-rss`, `generate-post`) protegidas por `requireAdminOrScheduler`: aceita ou JWT de admin ou `Bearer SCHEDULER_SECRET`. **Nunca expor sem auth** (era um débito crítico — SYS-01).
4. **Segredos do scheduler vivem em `project_config.scheduler_secret`**, não em env var manual. pg_cron lê via `ALTER DATABASE postgres SET app.scheduler_secret = '...'`.
5. **Chaves de API com fallback de 2 níveis**: `project_config.<nome>` (admin pode trocar no UI de Integrations) → env var.
6. **Conteúdo sempre em pt-BR**, com tradução obrigatória de fontes em outros idiomas (regra reforçada no system prompt).
7. **Cron horário** dispara `scheduler`; tópicos têm 3 modos de agendamento (interval/daily_window/per_new_item).
8. **Toda execução vai para `generation_runs`** para o dashboard de logs.
9. **Frontend**: nada de cor hardcoded — tokens semânticos em `src/styles.css`. Nada de `tsc --noEmit` direto (usar `tsgo`).

---

## Secrets necessários

Edge Functions:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (auto)
- `LOVABLE_API_KEY` (redação — auto-gerenciada pela Lovable Cloud)
- `PERPLEXITY_API_KEY` (pesquisa — usuário fornece)
- Scheduler secret: gravado em `project_config.scheduler_secret` + `app.scheduler_secret` no Postgres para o pg_cron

Cliente:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

SSR Worker:
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Passos para clonar (ordem)

1. Criar projeto TanStack Start + Tailwind v4 + shadcn + bun.
2. Criar projeto Supabase; aplicar migrations (enums → profiles → user_roles → has_role → editorial_topics → rss_feeds → rss_items → posts → post_revisions → generation_runs → tags → research_sessions → project_config). Cada CREATE TABLE seguido de GRANT + RLS + policies.
3. Criar triggers: `handle_new_user`, `check_email_domain`, `capture_post_revision`, `update_updated_at_column` em todas as tabelas com `updated_at`.
4. Configurar Google OAuth em Auth Providers.
5. Subir Edge Functions (`fetch-rss`, `generate-post`, `generate-cover-image`, `scheduler`, `suggest-topic`, `suggest-angles`) com helpers `_shared/{retry,runs,auth,keys}.ts`.
6. Setar secrets (PERPLEXITY_API_KEY, LOVABLE_API_KEY) + `project_config.scheduler_secret`.
7. Habilitar `pg_cron` + `pg_net`; agendar chamada horária para `scheduler` com `Bearer app.scheduler_secret`.
8. Buckets de Storage: `post-covers`, `brand-assets`, `avatars` (públicos).
9. Frontend: rotas públicas (`index`, `post.$slug`, `tag.$slug`, `feed.xml`, `sitemap.xml`) e admin sob `_authenticated/` com `AuthContext`, hooks de query, layouts.
10. Primeiro signup vira admin → cadastrar tópico + feed → testar `generate-post` manualmente → ligar cron.

---

## Como apresentar isso ao Claude

Cole este plano e adicione:
- "Use TanStack Start, não Next/Remix."
- "Não armazene roles em `profiles`; use tabela `user_roles` + `has_role()`."
- "Edge functions internas precisam de `requireAdminOrScheduler` — nunca `verify_jwt=false` sem auth alternativa."
- "Geração de conteúdo: Perplexity para pesquisa (`sonar`, recency=week) + Lovable AI Gateway (Gemini) com tool-calling forçado para saída estruturada."
- "Todo conteúdo em pt-BR, traduzindo fontes."
- "Toda Edge Function loga em `generation_runs` via `startRun`/`finishRun`."

Quer que eu detalhe alguma camada (prompts completos, schema SQL exato, ou exemplos de hooks) em um documento separado?
