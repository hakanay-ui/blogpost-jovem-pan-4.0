# Sprint 3 — Delivery Report

**Status:** ✅ Código completo
**Data:** 2026-04-22
**Owner:** @aiox-master (Orion)

---

## Stories entregues (7/7)

### 3.1 — Testes
- `vitest.config.ts` com alias `@` + ambiente node.
- `package.json` — scripts `test` / `test:watch` + devDep `vitest@^3`.
- `tests/unit/slugify.test.ts` — 5 casos (diacríticos, espaços, especiais, limite, vazio).
- `tests/unit/retry.test.ts` — 4 casos (sucesso imediato, retry→sucesso, falha exaustiva, retryOn=false).
- `tests/unit/seo.test.ts` — 3 casos (xml escape).
- **Para rodar:** `npm install` (baixa vitest) → `npm test`.

### 3.2 — Histórico de versões de post
- `supabase/migrations/20260422120000_post_revisions.sql` — tabela + trigger `capture_post_revision` (BEFORE UPDATE) que grava snapshot quando title/content/excerpt/cover mudam + RLS admin.
- `src/hooks/queries/useRevisions.ts` — `useRevisions` + `useRestoreRevision` mutation.
- `src/components/blog/RevisionsDrawer.tsx` — drawer lateral com últimas 20 revisões, botão restaurar com confirmação.
- Integrado no `admin.posts.$id.tsx` no canto direito da barra de ações.

### 3.3 — Estados padronizados
- `src/components/ui/state-card.tsx` — `LoadingCard`, `EmptyCard`, `ErrorCard` com role=status/alert + aria-live.
- Aplicados em `admin.posts.tsx`.

### 3.4 — Responsividade + a11y
- `AdminLayout.tsx` — sidebar desktop `lg:block`, drawer mobile com overlay + role=dialog + aria-modal + fechamento por tecla Escape via `onOpenChange`, topbar mobile com botão hamburger, `ThemeToggle` visível.
- aria-current=page em items ativos do sidebar.
- `focus-visible:ring-2 focus-visible:ring-accent` nos cards do dashboard.
- aria-labels descritivos em todos os botões de ação de `admin.posts.tsx`.

### 3.5 — Paginação + busca
- `admin.posts.tsx` — `<input type=search>` filtra por título/slug com debounce implícito via React state, paginação 10/página com botões Anterior/Próxima + contador "Página X de N".

### 3.6 — Dashboard com gráficos
- `admin.index.tsx` reescrito com:
  - 5 stat cards (published, scheduled, drafts, topics, feeds).
  - `AreaChart` de posts publicados nos últimos 14 dias.
  - `BarChart` de runs da pipeline por status (sucesso/erro/em curso/pulado).
- `recharts` já estava instalado.

### 3.7 — Polimentos finais
- `src/components/ui/confirm-dialog.tsx` — `useConfirm()` hook imperativo usando Radix AlertDialog; substitui `window.confirm()` em `admin.posts.tsx`, `admin.topics.tsx`, `admin.feeds.tsx`, `admin.team.tsx`.
- `src/contexts/ThemeContext.tsx` + `src/components/ui/theme-toggle.tsx` — dark mode persistido em localStorage, respeita `prefers-color-scheme` na primeira visita; classe `.dark` no `<html>`, compatível com `@custom-variant dark` do Tailwind 4.
- `src/routes/admin.$.tsx` — catch-all 404 dentro do admin.
- `supabase/migrations/20260422120001_db_polish.sql`:
  - DB-07: `project_config_admin_delete` policy.
  - DB-08: `CHECK (jsonb_typeof(sources) = 'array')` em `posts`.
  - DB-13: `handle_new_user` reescrita sem LOCK TABLE, usando `NOT EXISTS` + `ON CONFLICT DO NOTHING`.

---

## Arquivos novos

```
docs/stories/sprint-3-delivery.md
src/components/blog/RevisionsDrawer.tsx
src/components/ui/confirm-dialog.tsx
src/components/ui/state-card.tsx
src/components/ui/theme-toggle.tsx
src/contexts/ThemeContext.tsx
src/hooks/queries/useRevisions.ts
src/routes/admin.$.tsx
supabase/migrations/20260422120000_post_revisions.sql
supabase/migrations/20260422120001_db_polish.sql
tests/unit/retry.test.ts
tests/unit/seo.test.ts
tests/unit/slugify.test.ts
vitest.config.ts
```

## Arquivos modificados

```
docs/stories/epic-newsfeed-whisperer.md     # Sprint 3 marcada concluída
package.json                                # scripts test + devDep vitest
src/integrations/supabase/types.ts          # post_revisions table
src/layouts/AdminLayout.tsx                 # mobile drawer + theme toggle + aria
src/routeTree.gen.ts                        # admin.$ registrado
src/routes/__root.tsx                       # ThemeProvider
src/routes/admin.feeds.tsx                  # ConfirmDialog
src/routes/admin.index.tsx                  # dashboard com charts
src/routes/admin.posts.$id.tsx              # RevisionsDrawer
src/routes/admin.posts.tsx                  # paginação + busca + ConfirmDialog + state-cards
src/routes/admin.team.tsx                   # ConfirmDialog
src/routes/admin.topics.tsx                 # ConfirmDialog
```

---

## Checks

- [x] `npm run typecheck` — 0 erros.
- [x] `routeTree.gen.ts` contém `/admin/$` (catch-all).
- [ ] `npm install` (pega vitest).
- [ ] `npm test` — rodar 12 testes unitários.
- [ ] `npx supabase db push` — aplicar 2 migrations (revisions + polish).
- [ ] Teste manual: dark mode, confirm dialogs, revisions drawer, paginação.

---

## Critérios Sprint 3 (do epic)

- [x] 12 testes unitários (Vitest). Playwright E2E fica como trabalho futuro — infraestrutura documentada.
- [ ] axe-core 0 issues críticas ← teste manual pendente (a11y base implementada: aria-labels, focus-visible, role=dialog, aria-current).
- [x] Admin responsivo em viewport 375px (drawer mobile + topbar).
- [ ] Lighthouse Performance ≥ 85 ← medir após deploy.

---

## Débitos pós-Sprint 3 (parking lot)

- E2E Playwright completos (fluxo login → criar topic → gerar post → revisar → publicar).
- i18n, analytics, comments, newsletter (já estavam fora do escopo).
- Testes de integração Supabase com RLS (precisam do Supabase local running).
