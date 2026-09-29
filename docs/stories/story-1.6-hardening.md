# Story 1.6 — Hardening pré-produção

**Status:** Draft
**Epic:** Finalização e Go-live
**Prioridade:** 🟡 Média-alta
**Estimativa:** 2h
**Sprint:** 1
**Dependencies:** nenhuma

---

## Problema

Quickwins de segurança/qualidade:
- `editorial_topics` RLS `USING true` expõe linha editorial (DB-01).
- `.env` versionado com chaves ANON (SYS-11) — não é segredo, mas péssima prática.
- Sem script `typecheck` (SYS-05).

## Acceptance Criteria

1. Policy `topics_select_all` substituída por `topics_admin_select` (admin-only).
2. Blog público continua funcionando (nunca consome `editorial_topics` direto — verificar).
3. `.env` removido do git; `.env.example` criado com placeholders.
4. `package.json` tem script `"typecheck": "tsc --noEmit"`.
5. `bun run typecheck` passa sem erros.

## Tasks

- [ ] Migration: `DROP POLICY topics_select_all; CREATE POLICY topics_admin_select ON editorial_topics FOR SELECT USING (has_role(auth.uid(), 'admin'));`.
- [ ] Verificar via grep que nenhum componente público usa `editorial_topics.select()`.
- [ ] `git rm --cached .env && echo ".env" >> .gitignore`.
- [ ] Criar `.env.example` com chaves sem valores.
- [ ] Adicionar `"typecheck": "tsc --noEmit"` em `package.json`.
- [ ] Rodar `bun run typecheck` e corrigir o que aparecer.

## Testes

- [ ] `bun run typecheck` exit code 0.
- [ ] Usuário anônimo não consegue `SELECT` em `editorial_topics` (testar via SQL).

## Change Log
- 2026-04-20: story criada (@pm)
- 2026-06-09: **Revertido o item `.env` (SYS-11).** A chave anon/publishable é
  pública por design (já presente no bundle servido ao browser, no system
  prompt do Lovable e — anteriormente — como fallback hardcoded no
  `client.ts`). Mantê-la fora do git não traz ganho de segurança e introduz
  uma race no remix: o novo projeto nasce sem `.env`, o Lovable Cloud injeta
  as chaves do novo projeto Supabase, mas o primeiro build pode rodar antes
  → `VITE_*` ficam `undefined` no bundle e a tela "Backend não configurado"
  aparece. `.env` voltou a ser versionado; `.env.local` / `.env.*.local`
  continuam ignorados para overrides locais. O fallback hardcoded em
  `src/integrations/supabase/client.ts` foi removido para falhar alto em vez
  de conectar silenciosamente no projeto Cloud errado em qualquer remix.
