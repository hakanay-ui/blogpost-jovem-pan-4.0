# System Architecture — newsfeed-whisperer

**Projeto:** Blog editorial com geração de conteúdo por IA a partir de RSS + Perplexity
**Autor:** @architect (Aria)
**Data:** 2026-04-20
**Fase:** 1 / 10 (Brownfield Discovery)

---

## 1. Visão geral

Plataforma full-stack composta por:

1. **Blog público** (SSR/SPA via TanStack Start) que consome posts publicados no Supabase.
2. **Admin SPA** (mesmo bundle) para gestão de linha editorial, fontes RSS e publicações.
3. **Pipeline de IA serverless** em Edge Functions do Supabase (Deno) que coletam RSS, pesquisam com Perplexity e redigem com Lovable AI Gateway.
4. **Cron externo** (pg_cron ou Supabase Cron) disparando o scheduler — **ainda não configurado em runtime**.

Origem do código: projeto gerado/evoluído no Lovable (`@lovable.dev/vite-tanstack-config`), hospedagem prevista em Cloudflare Workers (`@cloudflare/vite-plugin` + `wrangler.jsonc`).

## 2. Stack tecnológico

| Camada | Tecnologia | Versão | Notas |
|---|---|---|---|
| Runtime build | Vite | 7.3 | Config abstraída por `@lovable.dev/vite-tanstack-config` |
| Framework app | TanStack Start | 1.167 | React 19, file-based routing |
| Roteamento | @tanstack/react-router | 1.168 | `routeTree.gen.ts` gerado |
| UI | Tailwind CSS | 4.2 | Plugin `@tailwindcss/vite` |
| Componentes | Radix UI (27 pkgs) + shadcn-style | — | Em `src/components/ui` |
| Estado servidor | @tanstack/react-query | 5.83 | Usado pontualmente (admin/integrations) |
| Form | react-hook-form + zod | 7.71 / 4.3 | |
| Backend | Supabase | 2.104 | Postgres + Auth + Edge Functions (Deno) |
| Deploy target | Cloudflare Workers | — | `wrangler.jsonc` + `nodejs_compat` |
| Package manager | bun | — | `bun.lockb` versionado |

## 3. Estrutura de pastas

```
newsfeed-whisperer/
├── src/
│   ├── routes/              # File-based routing (TanStack)
│   │   ├── __root.tsx       # Root layout
│   │   ├── index.tsx        # Blog home (público)
│   │   ├── post.$slug.tsx   # Post individual (público)
│   │   ├── admin.tsx        # Admin layout container
│   │   ├── admin.index.tsx  # Dashboard
│   │   ├── admin.login.tsx
│   │   ├── admin.topics.tsx
│   │   ├── admin.feeds.tsx
│   │   ├── admin.posts.tsx
│   │   ├── admin.posts.$id.tsx
│   │   ├── admin.generate.tsx
│   │   ├── admin.team.tsx
│   │   ├── admin.security.tsx
│   │   ├── admin.integrations.tsx
│   │   └── pending-approval.tsx
│   ├── layouts/             # PublicLayout, AdminLayout
│   ├── components/
│   │   ├── auth/            # LoginSignupForm, ProtectedRoute
│   │   ├── lp/              # ScrollReveal (landing page)
│   │   └── ui/              # Radix-based primitives
│   ├── contexts/
│   │   └── AuthContext.tsx  # Auth state global
│   ├── hooks/
│   │   └── use-mobile.tsx
│   ├── integrations/
│   │   └── supabase/        # Cliente + auth-middleware (server fn)
│   ├── utils/               # Server fns (createServerFn) — auth/integrations
│   ├── lib/utils.ts         # cn() helper
│   ├── router.tsx
│   └── styles.css
├── supabase/
│   ├── config.toml          # verify_jwt=false em todas edge fns ⚠️
│   ├── migrations/          # 2 migrations (auth + tabelas core)
│   └── functions/
│       ├── fetch-rss/       # Parser RSS/Atom caseiro
│       ├── generate-post/   # Perplexity + Lovable AI Gateway
│       └── scheduler/       # Orquestrador cron
├── vite.config.ts           # defineConfig() do Lovable
├── wrangler.jsonc           # Cloudflare deploy target
├── package.json             # "tanstack_start_ts"
├── tsconfig.json
├── eslint.config.js
└── .env                     # Chaves Supabase (anon + URL)
```

## 4. Fluxo de dados (pipeline principal)

```
  ┌──────────────┐
  │  pg_cron *   │ ← AINDA NÃO AGENDADO
  └──────┬───────┘
         ▼
  ┌──────────────┐   invoca     ┌──────────────┐
  │  scheduler   ├─────────────▶│  fetch-rss   │
  └──────┬───────┘              └──────┬───────┘
         │                             │
         │                             ▼
         │                      ┌──────────────┐
         │                      │  rss_items   │ (upsert dedup)
         │                      └──────────────┘
         │
         │ filtra topics.frequency vencida
         ▼
  ┌──────────────┐
  │ generate-post│
  │   (topicId)  │
  └──────┬───────┘
         │
         ├──▶ Perplexity (sonar, filter=week)  → research + citations
         ├──▶ Lovable AI (gemini-3-flash-preview, tool_calling) → artigo estruturado
         └──▶ INSERT posts (status deriva de publish_mode do topic)
                │
                ▼
         ┌──────────────┐
         │   posts      │ → Blog público consome via supabase-js
         └──────────────┘
```

## 5. Padrões de código

### ✅ Padrões que seguem convenção

- **File-based routes** com nomenclatura TanStack (`admin.topics.tsx`).
- **Componentes Radix wrapped** em `src/components/ui` estilo shadcn.
- **Client Supabase** centralizado em `src/integrations/supabase/client.ts`.
- **Server Functions** (`createServerFn`) com middleware `requireSupabaseAuth` para operações sensíveis.
- **Tailwind tokens** (`bg-bg-base`, `text-text-primary`, `accent`, etc.) indicam design system próprio.
- **Animações** com Framer Motion + `lp-*` classes utilitárias.

### ⚠️ Desvios detectados

- **Markdown render caseiro** em `src/routes/post.$slug.tsx` (`renderMarkdown`) — reinventa a roda, risco de XSS e inconsistência. Deveria usar `react-markdown` + `rehype-sanitize`.
- **Fetch direto com `supabase.from(...)` nos componentes** — sem React Query / cache, sem loading/error states consistentes.
- **`useEffect` com `.then` aninhado** sem tratamento de erro (vários componentes admin).
- **Componentes que misturam fetch + render** sem separar lógica (ex.: `admin.topics.tsx` tem 291 linhas).
- **Auth subscription em `setTimeout`** para evitar deadlocks (AuthContext.tsx:106) — workaround típico Supabase, mantido mas não documentado.

## 6. Integrações externas

| Serviço | Função | Chave env | Onde | Status |
|---|---|---|---|---|
| Supabase | DB/Auth/Storage/Functions | `VITE_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | Client + Edge | ✅ configurado |
| Perplexity | Pesquisa factual | `PERPLEXITY_API_KEY` | Edge Function | ⚠️ precisa em produção |
| Lovable AI Gateway | Redação | `LOVABLE_API_KEY` | Edge Function | ⚠️ precisa em produção |
| OpenAI/Anthropic/Resend | Previsto (não usado ainda) | `*_API_KEY` | Status-check em UI | Não usado no pipeline |
| Cloudflare Workers | Hosting | — | `wrangler.jsonc` | Não deployado |

## 7. Configurações

### Build
- `vite dev` (local), `vite build` (prod), `build:dev` (modo development).
- ESLint + Prettier configurados (`eslint.config.js`, `.prettierrc`).
- Sem scripts de `test` nem `typecheck` no `package.json`. ⚠️

### Edge Functions (`supabase/config.toml`)
```toml
[functions.fetch-rss]     verify_jwt = false  ⚠️
[functions.generate-post] verify_jwt = false  ⚠️ (exposta publicamente)
[functions.scheduler]     verify_jwt = false  ⚠️
```

### Env
- `.env` versionado com chaves ANON+URL (público, OK).
- Service role e API keys devem ficar no painel do Supabase (secrets). **Não verificado.**

## 8. Débitos identificados (nível sistema)

| ID | Débito | Categoria | Severidade | Notas |
|---|---|---|---|---|
| SYS-01 | Edge functions com `verify_jwt=false` sem autenticação alternativa | Segurança | **Crítico** | Qualquer um pode invocar `generate-post` e gastar tokens |
| SYS-02 | Cron não agendado em produção | Operação | **Alto** | Sem isso, pipeline é 100% manual |
| SYS-03 | Markdown renderer caseiro | Segurança/Qualidade | Alto | Risco XSS + inconsistência |
| SYS-04 | Ausência de testes (nenhum arquivo `.test.*`) | Qualidade | Alto | Nenhum script de teste no package.json |
| SYS-05 | Ausência de `typecheck` como script | Qualidade | Médio | TS existe mas não é enforçado |
| SYS-06 | Sem retry/backoff nas chamadas Perplexity/Lovable | Resiliência | Médio | Erro 429 falha hard |
| SYS-07 | Sem observabilidade (logs de generation runs) | Operação | Médio | `generation_runs` não existe |
| SYS-08 | Fetch inline em componentes sem React Query | Qualidade | Médio | Apesar de ter RQ instalado |
| SYS-09 | Deploy Cloudflare Workers não configurado/testado | Operação | Alto | wrangler.jsonc presente mas sem CI |
| SYS-10 | Sem sitemap.xml, RSS próprio, OG tags SSR | SEO | Alto | Blog depende disso |
| SYS-11 | `.env` versionado (mesmo com chaves públicas) | Segurança (conv.) | Baixo | Prática ruim; usar `.env.example` |
| SYS-12 | Nenhum histórico de versões de post | Produto | Baixo | Edições sobrescrevem |

## 9. Dependências / versões

- **27 pacotes `@radix-ui/*`** — OK, alinhados.
- **React 19 + TanStack Start 1.167** — bleeding edge, atento a breaking changes.
- **Tailwind 4.2** (nova sintaxe) — documentação interna pode divergir da v3.
- Sem `@types/bun` mesmo usando bun — `@types/node` 22 presente.

## 10. Perguntas para especialistas

**Para @data-engineer (Fase 5):**
- O schema cobre agendamento por data (`scheduled_at` em posts) ou só por frequência?
- Falta índice em `posts(topic_id, status)` para dashboard?
- RLS das `rss_items` está correta? (hoje só admin lê — ok, só backend usa).
- Falta tabela `generation_runs` para auditoria?

**Para @ux-design-expert (Fase 6):**
- Editor markdown textarea vs. Tiptap/MDX?
- Como deve ser o calendário editorial na UI?
- Consistência de estados loading/error/empty entre rotas admin?
- Acessibilidade do bloco de fontes no post público?

---

**Próxima fase:** Fase 2 → @data-engineer documenta `SCHEMA.md` + `DB-AUDIT.md`.
