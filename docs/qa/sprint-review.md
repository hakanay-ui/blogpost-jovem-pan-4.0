# QA Review — Sprints 1+2+3

**Revisor:** @aiox-master atuando como @qa (Quinn)
**Data:** 2026-04-22
**Escopo:** 23 stories (commits `7dc273c` + `ce7bfe4`)
**Método:** Leitura manual do diff + typecheck + análise de segurança/a11y/integração. CodeRabbit indisponível no ambiente (macOS, não WSL), sem deploy Supabase para testes de integração reais.

## Gate

**Verdict:** `CONCERNS` — nenhum bloqueador de produção identificado; 3 majors corrigidos durante a review; 6 minors documentados; 2 gaps de escopo assumidos (E2E, React Query migration parcial).

---

## Metodologia

| Check | Resultado |
|---|---|
| `npm run typecheck` | ✅ 0 erros |
| `routeTree.gen.ts` sincronizado | ✅ `/admin/$`, `/admin/logs`, `/tag/$slug`, `/sitemap.xml`, `/feed.xml` presentes |
| Segredos vazados no git | ✅ `.env` removido (Sprint 1.6); `.env.example` só com placeholders |
| RLS coverage nas tabelas novas | ✅ `tags`, `post_tags`, `generation_runs`, `post_revisions` todas com `ENABLE ROW LEVEL SECURITY` + policies |
| Edge functions autenticadas | ✅ `verify_jwt=true` em fetch-rss/generate-post; scheduler com `SCHEDULER_SECRET` |
| Sanitização markdown | ✅ `rehype-sanitize` com schema restritivo |
| SQL injection em edge functions | ✅ Tudo via Supabase client (query builder parametrizado) |
| Testes reais (vs stub) | ⚠️ Corrigido durante review (ver §majors) |

---

## Findings

### 🔴 Blockers — 0

Nenhum.

### 🟠 Majors — 3 (corrigidos durante a review)

#### M-1: `retry.test.ts` não testava a função real
**O que eu tinha feito:** Importava só o TYPE `RetryOptions` e redefinia `withRetry` inline no teste.
**Impacto:** Testes passavam 100% mas NÃO validavam o código de produção. Cobertura falsa.
**Fix:** Reescrito importando `withRetry` e `fetchWithRetry` do arquivo real (`supabase/functions/_shared/retry.ts`). Adicionadas 4 assertions sobre `fetchWithRetry` (200, 5xx retry, 429 com Retry-After, esgotamento).
**Arquivo:** `tests/unit/retry.test.ts`

#### M-2: Sem ErrorBoundary — erro client-side derruba o app inteiro
**O que eu tinha feito:** Root só tinha `QueryClientProvider + ThemeProvider + AuthProvider + Outlet`.
**Impacto:** Um erro em qualquer rota causa whitescreen, sem telemetria.
**Fix:** Adicionado `src/components/ErrorBoundary.tsx` como classe com `getDerivedStateFromError` + fallback UI com botão "Recarregar". Envolve toda a árvore no `__root.tsx`.

#### M-3: Mobile sidebar sem Escape key
**O que eu tinha feito:** Drawer só fechava por clique no overlay.
**Impacto:** Regressão de a11y em dispositivos com teclado (iPad com teclado, smart TVs).
**Fix:** `useEffect` com handler `keydown` em `window`, cleanup no unmount/mobileOpen=false.
**Arquivo:** `src/layouts/AdminLayout.tsx`.

### 🟡 Minors — 6 (documentados, não-bloqueadores)

#### m-1: React Query migration parcial (Story 2.7)
**Estado:** `admin.posts.tsx` migrada. `admin.topics.tsx`, `admin.feeds.tsx`, `admin.generate.tsx`, `admin.posts.$id.tsx`, `admin.security.tsx`, `admin.team.tsx`, `admin.index.tsx` seguem usando `useEffect + setState + supabase`.
**Decisão:** Core path de posts (listagem e mutations críticas) foi migrada, que é onde cache + invalidation mais importam. Manter o resto como dívida.
**Esforço restante estimado:** 4-6h.

#### m-2: Playwright E2E não implementado (Story 3.1)
**Estado:** Só Vitest unitário (12 testes). Fluxo real login→criar topic→gerar→publicar não é testado automaticamente.
**Decisão:** Playwright exigiria Supabase local + mocks — trabalho maior que Sprint 3 estimou (16h totais para 3.1 incluindo E2E). Documentado como parking lot.

#### m-3: `admin/logs` não mostra nome do tópico (só `topic_id` no metadata)
**Estado:** Tabela mostra run_type + status + duração + metadata cru.
**Sugestão:** Join com `editorial_topics(name)` para exibir "generate-post para tema X".
**Esforço:** 20 min.

#### m-4: `generation_runs` — scheduler grava `status=success` mesmo quando `fetch-rss` ou algum `generate-post` individual falha
**Estado:** `scheduler/index.ts` só marca `error` se exceção chegar no outer try. Falhas internas ficam no array `generated`/`rss` do JSON de resposta.
**Impacto:** Dashboard mostra `success` para scheduler com pipelines parciais quebradas.
**Sugestão:** Calcular status derivado (`success` se todos ok, `error` se qualquer `generate-post` falhou, `success` com warning se só `fetch-rss` teve feed individual com erro).
**Esforço:** 15 min.

#### m-5: `capture_post_revision` trigger comentário desatualizado
**Estado:** Migration `20260422120000_post_revisions.sql` comenta "captura quando title/content/excerpt mudam" mas checa 4 campos (também `cover_image_url`).
**Impacto:** Apenas documentação.
**Sugestão:** Alinhar comentário ou remover `cover_image_url` do check (preferir o código atual).

#### m-6: `TagsSelector` slug pode ficar vazio
**Estado:** Se o nome for 100% caracteres especiais (`!!!`), `slugify()` retorna `""`. Segunda tag assim viola UNIQUE(slug).
**Impacto:** Erro raro, exibido via toast.
**Sugestão:** Validar `slug !== ""` antes do insert.

### 🔵 Info — 4 (notas para acompanhamento)

- **i-1:** `admin.posts.$id.tsx` usa `useEffect + useState` para carregar o post em vez de React Query — inconsistente com Story 2.7 mas funciona. Consolidar com m-1.
- **i-2:** `useRuns` refetchInterval = 15s — em páginas abertas muito tempo, consome banda. Tem `refetchOnWindowFocus=false` no client global, então é OK.
- **i-3:** `CoverUploader` usa `upsert: true` — path inclui `Date.now()` então colisão improvável, mas dois uploads simultâneos no mesmo milissegundo sobrescreveriam. Aceitável para admin single-user.
- **i-4:** Blog home retorna 50 posts sem paginação infinita — aceitável no MVP, sitemap/RSS já limitam a 1000/20. Story 3.5 cobriu paginação só no admin.

---

## Cobertura por story

| Story | Status | Fix aplicado na review | Comentário |
|---|---|---|---|
| 1.1 secure edge | ✅ | — | verify_jwt + SCHEDULER_SECRET validados |
| 1.2 pg_cron | ✅ | — | migration usa current_setting sem hardcoded |
| 1.3 safe markdown | ✅ | — | rehype-sanitize com schema custom |
| 1.5 SEO SSR | ✅ | — | loaders + head() dinâmicos ok |
| 1.6 hardening | ✅ | — | .env removed, typecheck script, RLS topics |
| 1.7 toast | ✅ | — | sonner em todas as ações admin |
| 2.1 scheduled_at | ✅ | — | FK + trigger + UI ok |
| 2.2 cover upload | ✅ | — | bucket RLS + componente ok |
| 2.3 tags | ✅ | — | tabelas + N:N + route pública ok |
| 2.4 editor rico | ✅ | — | toolbar + preview + sanitize ok |
| 2.5 pipeline logs | ⚠️ m-4 | — | status do scheduler pode mascarar falhas internas |
| 2.6 retry | ✅ | M-1 | teste reescrito para cobrir código real |
| 2.7 React Query | ⚠️ m-1 | — | parcial, apenas posts migrado |
| 2.8 integridade DB | ✅ | — | FK + índice composto ok |
| 2.9 cards blog | ✅ | — | topic + tags + excerpt visíveis |
| 3.1 testes | ⚠️ m-2 | M-1 | só unit; E2E como parking lot |
| 3.2 revisões | ⚠️ m-5 | — | funciona; só doc inconsistente |
| 3.3 estados | ✅ | — | LoadingCard/EmptyCard/ErrorCard com aria |
| 3.4 responsivo+a11y | ✅ | M-3 | Escape handler adicionado |
| 3.5 paginação | ✅ | — | admin.posts paginated; blog home restante (i-4) |
| 3.6 dashboard | ✅ | — | charts ok, scheduler 15s pode ser ajustado (i-2) |
| 3.7 polimentos | ⚠️ m-6 | M-2 | ErrorBoundary adicionado; slugify edge case fica |

---

## Dívidas abertas após QA

| ID | Descrição | Esforço | Status |
|---|---|---|---|
| m-1 | Completar React Query em admin | 4-6h | ✅ **Resolvido** — criados hooks `useTopics/useTopicMutations`, `useFeeds/useFeedMutations`, `usePost/useSavePost`; migrados `admin.topics.tsx`, `admin.feeds.tsx`, `admin.posts.$id.tsx`. Restam `admin.generate`, `admin.security`, `admin.team` que não mutam dados de domínio — aceitável. |
| m-2 | Playwright E2E (3 fluxos: login/gerar/publicar) | 8h | ⏳ Parking lot — fora do orçamento original, requer Supabase local |
| m-3 | Join topic name em /admin/logs | 20 min | ✅ **Resolvido** — `useRuns` traz `topic:editorial_topics(name)`, coluna "Tema" na tabela |
| m-4 | Status derivado em scheduler runs | 15 min | ✅ **Resolvido** — `finishRun` recebe `status=error` quando qualquer generate-post interno falha, com metadata de falhas individuais |
| m-5 | Alinhar comentário de trigger de revisão | 5 min | ✅ **Resolvido** — comentário da migration lista os 4 campos corretos |
| m-6 | Validar slug vazio no TagsSelector | 10 min | ✅ **Resolvido** — toast de erro quando slug derivado é `""` antes do insert |

Resolvidos: 5 de 6. Parking lot: m-2 (Playwright).

---

## Decisão de gate

**Atualizado → PASS** — 3 majors corrigidos + 5 dos 6 minors resolvidos na mesma sessão. Único parking lot remanescente é Playwright E2E (m-2), documentado e aceito como fora do orçamento original.

**Próximo passo recomendado:**
1. Deploy Supabase (migrations + functions).
2. Teste manual do fluxo end-to-end no admin (agendar, publicar, revisar).
3. Cliente valida em produção.
