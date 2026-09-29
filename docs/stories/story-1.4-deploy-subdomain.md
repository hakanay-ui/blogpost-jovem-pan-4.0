# Story 1.4 — Deploy em subdomínio personalizado

**Status:** Draft
**Epic:** Finalização e Go-live
**Prioridade:** 🔴 Alta
**Estimativa:** 4-6h (inclui DNS)
**Sprint:** 1
**Dependencies:** nenhuma

---

## Problema

Cliente pediu "front de blog com url sub dominio personalizada (via lovable)". Hoje o projeto:
- Tem `wrangler.jsonc` configurado para Cloudflare Workers mas não deployado.
- Não tem registro DNS apontado.
- Não tem CI/CD.

## Solução proposta

**Opção A (preferida):** Publicar via Lovable Publish → conectar subdomínio custom via DNS CNAME.
**Opção B:** Deploy direto em Cloudflare Workers via `wrangler deploy` + custom domain no dashboard CF.

Ambas exigem definir o subdomínio (ex.: `blog.cliente.com.br`) e configurar DNS.

## Acceptance Criteria

1. Subdomínio definido e aprovado pelo cliente.
2. Deploy resulta em URL HTTPS válida respondendo com a home do blog.
3. `ENV VITE_SUPABASE_*` corretas em produção.
4. Post published acessível em `https://<subdomain>/post/<slug>`.
5. Admin `/admin` acessível no mesmo domínio (ou decidir se admin fica em subdomínio separado).
6. README atualizado com instruções de deploy.

## Tasks

- [ ] Confirmar com cliente: qual subdomínio? Admin no mesmo domínio?
- [ ] Decidir rota A (Lovable) vs B (Cloudflare direto).
- [ ] **Se A:**
  - Clicar Publish no Lovable, copiar URL `.lovable.app`.
  - Adicionar CNAME do subdomínio para essa URL no DNS do cliente.
  - Configurar custom domain no painel Lovable.
- [ ] **Se B:**
  - `wrangler login`.
  - Configurar secrets (`wrangler secret put SUPABASE_URL` etc).
  - `wrangler deploy`.
  - Adicionar custom domain em dash.cloudflare.com → Workers → domains.
- [ ] Testar E2E: abrir post público em nova aba incógnita.
- [ ] Configurar certificado SSL (normalmente automático).
- [ ] Documentar passos em `docs/architecture/operations.md`.

## Dev Notes

- `VITE_*` env vars precisam estar no build. No Lovable vão no Settings; no CF é `wrangler secret put`.
- Atenção: `SUPABASE_SERVICE_ROLE_KEY` só vai em **edge functions**, nunca no bundle client.

## Testes

- [ ] curl `https://<subdomain>/` retorna HTML da home.
- [ ] Lighthouse no domínio final sem erros de CSP/mixed content.

## Change Log
- 2026-04-20: story criada (@pm)
