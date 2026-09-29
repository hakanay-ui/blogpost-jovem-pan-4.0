# Technical Debt Assessment — newsfeed-whisperer

**Autor:** @architect (Aria) — consolidando @data-engineer e @ux-design-expert
**Data:** 2026-04-20
**Status:** Consolidado (Fases 5-9 compactadas — análise inline)
**Fase:** 4+8 / 10 (Brownfield Discovery)

---

## Executive Summary

- **Total de débitos:** 48 (12 sistema, 16 database, 20 UX)
- **Críticos/Altos:** 19
- **Médios:** 18
- **Baixos/Info:** 11
- **Esforço total estimado:** ~150-180 horas (~4 semanas com 1 dev)
- **Esforço para MVP produção:** ~60-80 horas (~2 semanas)

**Recomendação:** 3 sprints focadas.
1. **Sprint Go-live** (crítico): cron, secrets, segurança edge, storage, markdown seguro, SEO SSR, deploy subdomínio.
2. **Sprint Produto**: editor rico, agendamento, imagem automática, logs, tags.
3. **Sprint Polimento**: testes, observabilidade, a11y, performance.

---

## 1. Inventário completo de débitos

### Sistema (12)

| ID | Débito | Severidade | Horas | Sprint |
|---|---|---|---|---|
| SYS-01 | Edge functions com `verify_jwt=false` sem autenticação alternativa | **Crítico** | 3h | 1 |
| SYS-02 | Cron não agendado em produção | **Alto** | 1h | 1 |
| SYS-03 | Markdown renderer caseiro (XSS) | Alto | 3h | 1 |
| SYS-04 | Ausência de testes | Alto | 16h | 3 |
| SYS-05 | Sem `typecheck` como script | Médio | 0.5h | 1 |
| SYS-06 | Sem retry/backoff Perplexity/Lovable | Médio | 2h | 2 |
| SYS-07 | Sem observabilidade de generation runs | Médio | 4h | 2 |
| SYS-08 | Fetch inline sem React Query | Médio | 6h | 2 |
| SYS-09 | Deploy Cloudflare Workers não configurado | Alto | 4h | 1 |
| SYS-10 | Sem sitemap/RSS próprio/OG SSR | **Alto** | 5h | 1 |
| SYS-11 | `.env` versionado | Baixo | 0.5h | 1 |
| SYS-12 | Sem histórico de versões de post | Baixo | 4h | 3 |

### Database (16)

| ID | Débito | Severidade | Horas | Sprint |
|---|---|---|---|---|
| DB-01 | `editorial_topics` RLS `USING true` | Alto | 1h | 1 |
| DB-02 | `rss_items.used_in_post_id` sem FK | Médio | 1h | 2 |
| DB-03 | Falta tabela `generation_runs` | Alto | 3h | 2 |
| DB-04 | Falta `scheduled_at` em posts | **Alto** | 2h | 2 |
| DB-05 | Falta índice composto dashboard | Médio | 0.5h | 2 |
| DB-06 | Índice `posts_slug` redundante com UNIQUE | Baixo | 0h | — |
| DB-07 | `project_config` sem DELETE policy | Baixo | 0.5h | 3 |
| DB-08 | `sources` JSONB sem validation | Médio | 1h | 3 |
| DB-09 | Falta `post_revisions` | Médio | 4h | 3 |
| DB-10 | Falta tags/categories | Médio | 3h | 2 |
| DB-11 | Storage bucket cover_image | **Alto** | 2h | 2 |
| DB-12 | `rss_feeds` sem SELECT public — OK | Info | 0h | — |
| DB-13 | `handle_new_user` LOCK TABLE | Baixo | 1h | 3 |
| DB-14 | Duas migrations mesmo dia | Info | 0h | — |
| DB-15 | `posts.content` sem limite | Baixo | 0h | — |
| DB-16 | pg_cron não configurado | **Crítico** | 1h | 1 |

### UX/Frontend (20)

| ID | Débito | Severidade | Horas | Sprint |
|---|---|---|---|---|
| UX-01 | Editor markdown textarea puro | Alto | 8h | 2 |
| UX-02 | Markdown renderer caseiro no post público | **Alto** | 3h | 1 |
| UX-03 | Estados loading/error/empty inconsistentes | Médio | 5h | 3 |
| UX-04 | Sem toast feedback em ações | Médio | 2h | 1 |
| UX-05 | Sem paginação | Médio | 3h | 3 |
| UX-06 | Sem busca em `/admin/posts` | Médio | 2h | 3 |
| UX-07 | Sem preview antes de publicar | Alto | 3h | 2 |
| UX-08 | Sem calendário editorial / agendamento | **Alto** | 8h | 2 |
| UX-09 | Sem upload de imagem de capa | **Alto** | 6h | 2 |
| UX-10 | Sem OG/meta SSR | **Alto** | 4h | 1 |
| UX-11 | Responsividade admin não testada | Médio | 4h | 3 |
| UX-12 | Acessibilidade WCAG AA | Médio | 4h | 3 |
| UX-13 | Dashboard sem gráficos | Baixo | 4h | 3 |
| UX-14 | Sem página tags/categorias | Médio | 4h | 2 |
| UX-15 | Sem RSS próprio | Médio | 2h | 1 |
| UX-16 | `confirm()` nativo em deletes | Baixo | 1h | 3 |
| UX-17 | Cards home sem tema/autor | Baixo | 2h | 2 |
| UX-18 | Admin sem 404 próprio | Baixo | 1h | 3 |
| UX-19 | `animate-fade-in-up` inline stagger | Info | 0h | — |
| UX-20 | Sem dark/light toggle | Baixo | 3h | 3 |

## 2. Matriz de priorização final

### 🔴 Sprint 1 — Go-live (deploy + segurança + SEO crítico)
**Objetivo:** Deployar em subdomínio com pipeline funcional e seguro.
**Esforço:** ~27 horas.

- SYS-01 (3h) Autenticar edge functions
- SYS-02 + DB-16 (2h) Agendar cron em produção
- SYS-03 + UX-02 (6h) Substituir markdown renderer (unificar)
- SYS-09 (4h) Configurar deploy Cloudflare Workers + subdomínio
- SYS-10 (5h) SEO SSR (sitemap, OG tags, meta)
- SYS-11 (0.5h) Remover `.env` do git, criar `.env.example`
- SYS-05 (0.5h) Adicionar `typecheck` script
- DB-01 (1h) Restringir RLS de topics
- UX-04 (2h) Toast feedback padrão
- UX-15 (2h) Feed RSS do blog
- Validação end-to-end da pipeline (1-2h)

### 🟡 Sprint 2 — Produto (recursos pedidos pelo cliente)
**Objetivo:** Entregar 100% do escopo contratado com UX profissional.
**Esforço:** ~50 horas.

- DB-03 (3h) Tabela `generation_runs`
- DB-04 + UX-08 (10h) Agendamento + calendário editorial
- DB-11 + UX-09 (8h) Storage + upload cover
- DB-10 + UX-14 (7h) Tags/categorias + página no blog
- UX-01 + UX-07 (11h) Editor rico + preview
- DB-05 (0.5h) Índice dashboard
- DB-02 (1h) FK `used_in_post_id`
- SYS-06 (2h) Retry Perplexity/Lovable
- SYS-07 (4h) Dashboard de logs
- SYS-08 (6h) Migrar queries para React Query
- UX-17 (2h) Cards home completos

### 🟢 Sprint 3 — Polimento/robustez
**Objetivo:** Qualidade, a11y, manutenção.
**Esforço:** ~45 horas.

- SYS-04 (16h) Testes (Vitest + Playwright smoke)
- SYS-12 + DB-09 (8h) Histórico de versões
- UX-03 + UX-11 + UX-12 (13h) Loading/empty/error + mobile + a11y
- UX-05 + UX-06 (5h) Paginação + busca
- UX-13 (4h) Dashboard com gráficos (recharts)
- UX-16 + UX-18 + UX-20 (5h) Polimentos gerais
- DB-07 + DB-08 + DB-13 (2.5h) Polimentos DB
- DB-10 backfill/seed (2h)

## 3. Riscos cruzados (análise QA compactada)

| Risco | Áreas | Mitigação |
|---|---|---|
| XSS via markdown | SYS-03 + UX-02 | Resolver simultaneamente (mesma story) |
| Custo descontrolado IA | SYS-01 + SYS-06 | Autenticar edge + quota interna |
| Perda de SEO no deploy | SYS-09 + SYS-10 | Validar OG + sitemap antes de DNS switch |
| Dados órfãos ao deletar post | DB-02 + UX-07 | FK SET NULL + confirmação de delete |
| Agendamento quebra em fuso | DB-04 + UX-08 | Armazenar TIMESTAMPTZ, UI exibe timezone do usuário |
| Storage sem limite de tamanho | DB-11 + UX-09 | RLS bucket + policy de max 5MB |

## 4. Critérios de sucesso (por sprint)

### Sprint 1
- [ ] `blog.cliente.com.br` (ou domínio escolhido) responde com posts publicados.
- [ ] `POST /functions/v1/generate-post` requer auth (JWT ou secret header).
- [ ] `pg_cron` chamando scheduler a cada hora — log verificável.
- [ ] Lighthouse SEO ≥ 90 na home e em 1 post.
- [ ] `sitemap.xml` válido + RSS `/feed.xml`.
- [ ] Post malicioso com `<script>` renderiza escapado.

### Sprint 2
- [ ] Admin consegue agendar post para data/hora futura; scheduler publica automaticamente.
- [ ] Admin faz upload de imagem de capa pela UI.
- [ ] Tabela `generation_runs` populada a cada execução, visível no admin.
- [ ] Editor tem preview lado-a-lado e toolbar básica.
- [ ] Post no blog mostra tags/categoria.

### Sprint 3
- [ ] `bun test` roda ≥ 20 testes unitários + 3 E2E Playwright.
- [ ] axe-core score 0 issues críticas.
- [ ] Admin responsivo em viewport 375px.
- [ ] Lighthouse Performance ≥ 85.

## 5. Decisões arquiteturais recomendadas

1. **Markdown:** migrar para `react-markdown` + `rehype-sanitize` + `remark-gfm`. Editor: `MDXEditor` ou `BlockNote` (decidir no início da Sprint 2 com POC).
2. **Auth edge functions:** JWT do Supabase para admin + header secret interno para chamadas scheduler→generate-post.
3. **Cron:** Supabase Cron (built-in) chamando URL do scheduler com header de auth.
4. **Storage:** bucket `post-covers` público-leitura + RLS admin-write, com transformações on-the-fly (Supabase Image Transform).
5. **SEO SSR:** usar `HeadContent` / `Scripts` do TanStack Start para emitir `<title>` e meta server-side.
6. **Queries:** padronizar em React Query — hooks dedicados em `src/hooks/queries/`.
7. **Subdomínio:** deploy Cloudflare Workers + custom domain; alternativa Lovable publishing se o cliente exige.

## 6. Fora de escopo (parking lot)

- Internationalization (i18n).
- Comments/reactions em posts.
- Newsletter (resend integration preparada mas não ativa).
- Analytics com dashboard próprio.
- Multi-tenant.

---

**Próximo:** Fase 10 → Epic + Stories (`docs/stories/epic-newsfeed-whisperer.md`).
