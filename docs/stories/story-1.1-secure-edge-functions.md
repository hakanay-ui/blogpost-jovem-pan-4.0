# Story 1.1 — Autenticar edge functions

**Status:** Draft
**Epic:** Finalização e Go-live
**Prioridade:** 🔴 Crítica
**Estimativa:** 3h
**Sprint:** 1
**Dependencies:** nenhuma

---

## Problema

As três edge functions (`fetch-rss`, `generate-post`, `scheduler`) estão com `verify_jwt = false` no `supabase/config.toml`. Isso significa que qualquer pessoa com a URL pode chamar `generate-post` e disparar pesquisas Perplexity + completions Lovable, gastando tokens/créditos do cliente.

## Solução proposta

- **`generate-post`** e **`fetch-rss`**: ativar `verify_jwt = true` e exigir sessão Supabase válida (chamadas vêm do admin autenticado).
- **`scheduler`**: manter `verify_jwt = false` MAS validar um `Authorization: Bearer ${SCHEDULER_SECRET}` header (segredo configurado no Supabase Secrets + no cron).
- Chamadas internas `scheduler → fetch-rss/generate-post` passam a usar `SUPABASE_SERVICE_ROLE_KEY` que já é o padrão atual (mantém funcionalidade).

## Acceptance Criteria

1. **Given** um usuário não autenticado, **when** invoca `POST /functions/v1/generate-post`, **then** recebe 401.
2. **Given** um admin autenticado, **when** clica "Gerar post" no admin, **then** função executa normalmente.
3. **Given** chamada ao `scheduler` sem header `Authorization`, **then** retorna 401.
4. **Given** chamada ao `scheduler` com `Authorization: Bearer $SCHEDULER_SECRET` correto, **then** executa pipeline.
5. `supabase/config.toml` commitado refletindo nova config.
6. Secret `SCHEDULER_SECRET` documentado em `docs/architecture/operations.md` (passo de setup).

## Tasks

- [ ] Alterar `supabase/config.toml`: `verify_jwt=true` em fetch-rss e generate-post.
- [ ] Adicionar check de `SCHEDULER_SECRET` no `supabase/functions/scheduler/index.ts`.
- [ ] Atualizar `src/routes/admin.generate.tsx` e `admin.feeds.tsx` para enviar JWT (já enviam via `session.access_token`, validar).
- [ ] Criar `docs/architecture/operations.md` com seção "Secrets necessários".
- [ ] Deploy funções: `supabase functions deploy fetch-rss generate-post scheduler`.
- [ ] Teste manual: tentar chamar sem auth (curl) e com auth.

## Dev Notes

- Auth middleware em `src/integrations/supabase/auth-middleware.ts` já cobre o lado do servidor TanStack; atenção que edge functions são independentes.
- O `invoke` do supabase-js envia JWT automaticamente se sessão existe — o admin já faz isso em `admin.generate.tsx`.

## Testes

- [ ] Smoke test com `curl` retorna 401 sem JWT.
- [ ] Smoke test com JWT de admin retorna 200.
- [ ] Scheduler com secret errado retorna 401.
- [ ] Documentar comando de teste em `docs/architecture/operations.md`.

## Change Log
- 2026-04-20: story criada (@pm)
