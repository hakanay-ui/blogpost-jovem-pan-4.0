# Story 1.5 — SEO SSR, sitemap e RSS próprio

**Status:** Draft
**Epic:** Finalização e Go-live
**Prioridade:** 🔴 Alta
**Estimativa:** 5h
**Sprint:** 1
**Dependencies:** Story 1.4 (precisa do domínio final para URLs absolutas)

---

## Problema

Hoje `post.$slug.tsx` atualiza `document.title` e `<meta>` client-side — crawlers/compartilhamento social (WhatsApp, LinkedIn, Twitter/X) não pegam. Não há `sitemap.xml` nem feed RSS próprio.

## Solução proposta

Usar `HeadContent` do TanStack Start para emitir meta tags server-side. Criar rotas server-only `/sitemap.xml` e `/feed.xml` geradas a partir do Supabase.

## Acceptance Criteria

1. `GET /` retorna HTML com `<title>` correto antes de hidratar (verificável com `curl`).
2. `GET /post/<slug>` retorna `<meta property="og:*">` completo.
3. `GET /sitemap.xml` retorna XML válido com todos os posts published.
4. `GET /feed.xml` retorna RSS 2.0 com últimos 20 posts.
5. Compartilhar URL de post no WhatsApp mostra título + excerpt + capa.
6. Lighthouse SEO ≥ 90 em home e em post.

## Tasks

- [ ] Criar `src/routes/__root.tsx` ou configurar `head` da rota para emitir meta defaults.
- [ ] Em `post.$slug.tsx` usar `createFileRoute().head()` ou `HeadContent` com dados do post (precisa ser server-loaded).
- [ ] Converter loader de posts para server fn / loader TanStack.
- [ ] Criar route `src/routes/sitemap[.]xml.ts` (raw response).
- [ ] Criar route `src/routes/feed[.]xml.ts`.
- [ ] Adicionar `<link rel="alternate" type="application/rss+xml" href="/feed.xml">` no head.
- [ ] Configurar OG image fallback (gerado dinamicamente ou `cover_image_url`).

## Dev Notes

- TanStack Start tem `HeadContent` + loaders server-side — essencial para SSR.
- Cover image: se `cover_image_url` for null, fallback para OG default do site.
- Canonical URL: usar `env.VITE_SITE_URL` configurado em produção.

## Testes

- [ ] `curl https://<domain>/post/<slug> | grep og:title` retorna tag correta.
- [ ] Validar sitemap em https://www.xml-sitemaps.com/validate-xml-sitemap.html.
- [ ] Validar RSS em https://validator.w3.org/feed/.
- [ ] Lighthouse SEO rodando em CI (opcional).

## Change Log
- 2026-04-20: story criada (@pm)
