# Sprint 2 — Delivery Report

**Status:** ✅ Código completo — pendente deploy (migrations + edge functions)
**Data:** 2026-04-22
**Owner:** @aiox-master (Orion)

---

## Stories entregues (9/9)

### 2.1 — Agendamento editorial
- `supabase/migrations/20260422100000_add_scheduled_at.sql` — coluna `scheduled_at TIMESTAMPTZ` + índice parcial para status=scheduled.
- `supabase/functions/scheduler/index.ts` — passo 1 promove `status=scheduled` → `published` quando `scheduled_at <= now()`.
- `src/routes/admin.posts.$id.tsx` — input `datetime-local` + botão "Agendar" + botão "Publicar agora".
- `src/routes/admin.posts.tsx` — filtro "Agendados" + badge `CalendarClock` + data exibe `scheduled_at` quando status=scheduled.

### 2.2 — Upload imagem de capa
- `supabase/migrations/20260422100001_storage_post_covers.sql` — bucket público-leitura, admin-escrita, 5MB, mime types `image/(jpeg|png|webp|avif|gif)`.
- `src/components/blog/CoverUploader.tsx` — drop/click, validação cliente, `supabase.storage.upload` + `getPublicUrl`, preview, trocar/remover.

### 2.3 — Tags e categorias
- `supabase/migrations/20260422100002_tags.sql` — tabela `tags` (unique name+slug) + `post_tags` (N:N) + RLS (leitura pública só para posts publicados).
- `src/components/blog/TagsSelector.tsx` — multiselect com criação inline via Enter.
- `src/hooks/queries/useTags.ts` — `usePostTags` + `syncPostTags` (diff insert/delete).
- `src/routes/tag.$slug.tsx` — página pública /tag/$slug lista posts.
- Home (`index.tsx`) e post (`post.$slug.tsx`) exibem tags como links.

### 2.4 — Editor rico com preview
- `src/components/blog/MarkdownEditor.tsx` — toolbar (bold/italic/H2/list/quote/code/link) + live preview split usando componente `Markdown` já seguro (rehype-sanitize).
- Atalhos: Ctrl/Cmd+B (bold), Ctrl/Cmd+I (italic).
- Toggle mostrar/ocultar preview.

### 2.5 — Observabilidade da pipeline
- `supabase/migrations/20260422100003_generation_runs.sql` — tabela `generation_runs` com `run_type`, `status`, `duration_ms`, `error_message`, `metadata`.
- `supabase/functions/_shared/runs.ts` — helpers `startRun` / `finishRun`.
- `fetch-rss`, `generate-post`, `scheduler` → instrumentados com try/finally de log.
- `src/hooks/queries/useRuns.ts` — refetch a cada 15s.
- `src/routes/admin.logs.tsx` — tabela das últimas 50 execuções + botão atualizar.
- Link "Execuções" no sidebar admin.

### 2.6 — Retry/backoff
- `supabase/functions/_shared/retry.ts` — `withRetry` + `fetchWithRetry` com exponential backoff + jitter, respeita `Retry-After` em 429, retry em 5xx.
- Aplicado em Perplexity, Lovable AI Gateway, feeds RSS e chamadas entre edge functions.

### 2.7 — React Query
- `src/routes/__root.tsx` — `QueryClientProvider` com `staleTime=30s`, sem refetch on focus, 1 retry.
- Hooks: `usePosts`, `usePostMutations`, `useTopics`, `useRuns`, `usePostTags`.
- `src/routes/admin.posts.tsx` migrado.

### 2.8 — Integridade referencial
- `supabase/migrations/20260422100004_referential_integrity.sql` — FK `rss_items.used_in_post_id → posts(id) ON DELETE SET NULL` (com cleanup prévio de órfãos) + índice `posts(topic_id, status, published_at DESC)`.

### 2.9 — Cards do blog
- `src/routes/index.tsx` — cards mostram tema editorial (badge), data, capa, excerpt, tags (até 3), badge IA.
- Link "Ler artigo" explícito no card.

---

## Arquivos novos

```
docs/stories/sprint-2-delivery.md
src/components/blog/CoverUploader.tsx
src/components/blog/MarkdownEditor.tsx
src/components/blog/TagsSelector.tsx
src/hooks/queries/usePosts.ts
src/hooks/queries/useRuns.ts
src/hooks/queries/useTags.ts
src/hooks/queries/useTopics.ts
src/routes/admin.logs.tsx
src/routes/tag.$slug.tsx
supabase/functions/_shared/retry.ts
supabase/functions/_shared/runs.ts
supabase/migrations/20260422100000_add_scheduled_at.sql
supabase/migrations/20260422100001_storage_post_covers.sql
supabase/migrations/20260422100002_tags.sql
supabase/migrations/20260422100003_generation_runs.sql
supabase/migrations/20260422100004_referential_integrity.sql
```

## Arquivos modificados

```
src/integrations/supabase/types.ts       # scheduled_at + tags, post_tags, generation_runs
src/layouts/AdminLayout.tsx              # item "Execuções"
src/routes/__root.tsx                    # QueryClientProvider
src/routes/admin.posts.$id.tsx           # MarkdownEditor + CoverUploader + TagsSelector + schedule
src/routes/admin.posts.tsx               # React Query + filtro scheduled
src/routes/index.tsx                     # cards completos (tema + tags)
src/routes/post.$slug.tsx                # tags abaixo do título
src/routeTree.gen.ts                     # regenerado pelo plugin
supabase/functions/fetch-rss/index.ts    # retry + runs
supabase/functions/generate-post/index.ts # retry + runs
supabase/functions/scheduler/index.ts    # publica scheduled + retry + runs
```

---

## Checks

- [x] `npm run typecheck` — 0 erros.
- [x] `routeTree.gen.ts` atualizado com `/admin/logs` e `/tag/$slug`.
- [ ] Migrations aplicadas em produção (`npx supabase db push`).
- [ ] Edge functions redeployadas (`npx supabase functions deploy scheduler generate-post fetch-rss`).
- [ ] Testes manuais no admin após deploy.

---

## Critérios de sucesso Sprint 2 (do epic)

- [ ] Admin consegue agendar post para data/hora futura; scheduler publica automaticamente. ← **código pronto, depende de deploy**
- [ ] Admin faz upload de imagem de capa pela UI. ← **código pronto, depende de deploy do bucket**
- [ ] Tabela `generation_runs` populada a cada execução, visível no admin. ← **código pronto, depende de deploy**
- [ ] Editor tem preview lado-a-lado e toolbar básica. ← **pronto, funciona localmente**
- [ ] Post no blog mostra tags/categoria. ← **pronto, funciona localmente**

---

## Ações operacionais pendentes (cliente/Henrique)

```bash
# 1. Aplicar migrations (cria bucket, generation_runs, tags, scheduled_at, FK)
npx supabase db push

# 2. Redeploy edge functions com _shared/retry + _shared/runs
npx supabase functions deploy scheduler generate-post fetch-rss

# 3. Confirmar SCHEDULER_SECRET e app.scheduler_secret continuam válidos (Sprint 1)
# 4. Verificar que pg_cron segue batendo scheduler a cada hora
```

---

## Débitos que ficam para Sprint 3

- SYS-04 (Vitest + Playwright) — 16h
- SYS-12 + DB-09 (post revisions) — 8h
- UX-03 + UX-11 + UX-12 (loading, mobile, a11y) — 13h
- UX-05 + UX-06 (paginação + busca) — 5h
- UX-13 (dashboard charts) — 4h
- UX-16 + UX-18 + UX-20 + DB-07 + DB-08 + DB-13 — 7.5h
