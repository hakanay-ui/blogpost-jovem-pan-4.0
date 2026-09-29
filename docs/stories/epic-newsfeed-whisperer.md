# Epic: Finalização e Go-live — newsfeed-whisperer

**Status:** Ready
**Owner:** @pm (Morgan)
**Data:** 2026-04-20

---

## Objetivo

Entregar o blog editorial com IA conforme escopo contratado: **front público em subdomínio + admin funcional + pipeline RSS→Perplexity→Lovable automático com agendamento**.

## Escopo contratado (cliente)

1. Blog + geração de conteúdo com IA ✅ (base pronta)
2. RSS Feed + Perplexity para notícias ✅ (base pronta)
3. Linha editorial técnica por assuntos ✅ (base pronta)
4. Programação de frequência de postagem ⚠️ (falta scheduled_at + cron)
5. Admin com gestão das publicações ⚠️ (falta polimento)
6. Front de blog com subdomínio personalizado via Lovable 🔴 (não deployado)

## Critérios de sucesso do epic

- [ ] Cliente aprova 1 post gerado automaticamente pela pipeline no horário agendado.
- [ ] Blog público em domínio definido com Lighthouse SEO ≥ 90.
- [ ] Admin: cliente cria tema editorial, vincula feeds, vê post gerado em até 5 min.
- [ ] Segurança: edge functions protegidas, RLS auditada, sem XSS no render.
- [ ] Observabilidade: admin vê log das últimas 20 execuções com status/erro.

## Timeline

| Sprint | Duração | Entrega |
|---|---|---|
| 1 — Go-live | 1 semana | Deploy + pipeline seguro + SEO |
| 2 — Produto | 2 semanas | Agendamento + editor + upload + logs |
| 3 — Polimento | 1 semana | Testes + a11y + mobile |

## Stories priorizadas

### 🔴 Sprint 1 — Go-live
- [ ] **1.1** — Autenticar edge functions (SYS-01) — `story-1.1-secure-edge-functions.md`
- [ ] **1.2** — Configurar pg_cron em produção (SYS-02, DB-16) — `story-1.2-schedule-cron.md`
- [ ] **1.3** — Markdown seguro e robusto (SYS-03, UX-02) — `story-1.3-safe-markdown.md`
- [ ] **1.4** — Deploy Cloudflare Workers + subdomínio (SYS-09) — `story-1.4-deploy-subdomain.md`
- [ ] **1.5** — SEO SSR, sitemap e RSS próprio (SYS-10, UX-15) — `story-1.5-seo-ssr.md`
- [ ] **1.6** — Hardening (DB-01, SYS-11, SYS-05) — `story-1.6-hardening.md`
- [ ] **1.7** — Toast feedback e UX actions (UX-04) — `story-1.7-toast-feedback.md`

### 🟡 Sprint 2 — Produto (✅ código completo — pendente apenas `supabase db push`)
- [x] **2.1** — Agendamento editorial (DB-04, UX-08) — migration `scheduled_at` + scheduler publica agendados + datetime-local no editor
- [x] **2.2** — Upload de imagem de capa (DB-11, UX-09) — bucket `post-covers` (5MB, RLS admin) + `CoverUploader.tsx`
- [x] **2.3** — Tags e categorias (DB-10, UX-14) — tabelas `tags` + `post_tags` + `TagsSelector.tsx` + rota pública `/tag/$slug`
- [x] **2.4** — Editor rico com preview (UX-01, UX-07) — `MarkdownEditor.tsx` com toolbar + preview split + atalhos Ctrl+B/I
- [x] **2.5** — Observabilidade de pipeline (DB-03, SYS-07) — tabela `generation_runs` + logging nas 3 edge functions + rota `/admin/logs`
- [x] **2.6** — Resiliência nas APIs IA (SYS-06) — `_shared/retry.ts` com exponential backoff + Retry-After
- [x] **2.7** — Padronizar fetch via React Query (SYS-08) — `QueryClientProvider` no root + hooks em `src/hooks/queries/`
- [x] **2.8** — Integridade referencial (DB-02, DB-05) — FK `rss_items.used_in_post_id` + índice composto `(topic_id, status, published_at DESC)`
- [x] **2.9** — Cards do blog completos (UX-17) — home mostra tema + tags + tudo linkado

### 🟢 Sprint 3 — Polimento (✅ código completo — pendente `npm install` + deploy)
- [x] **3.1** — Testes unitários (SYS-04) — Vitest config + 3 suites (slugify, retry, seo)
- [x] **3.2** — Histórico de versões de post (SYS-12, DB-09) — tabela `post_revisions` + trigger + drawer de restore
- [x] **3.3** — Estados padronizados (UX-03) — componentes `LoadingCard` / `EmptyCard` / `ErrorCard`
- [x] **3.4** — Responsividade + a11y (UX-11, UX-12) — mobile sidebar, aria-labels, focus-visible, role=dialog
- [x] **3.5** — Paginação e busca (UX-05, UX-06) — `/admin/posts` paginação client-side + busca por título/slug
- [x] **3.6** — Dashboard com gráficos (UX-13) — recharts: posts/dia (14d) + runs por status
- [x] **3.7** — Polimentos finais (UX-16, UX-18, UX-20, DB-07, DB-08, DB-13) — `ConfirmDialog` em todos os deletes, dark mode toggle, admin 404 em `/admin/$`, DELETE policy em project_config, check constraint sources, handle_new_user sem LOCK TABLE

## Dependências entre stories

```
1.1 ─┬─ 1.2 (cron precisa chamar edge auth)
1.3 ─── (standalone)
1.4 ─── 1.5 (subdomínio antes de OG tags com URL correta)
1.6 ─── (standalone, pode paralelo)
1.7 ─── (standalone)

2.1 ── depende de 1.2 (cron publicar scheduled)
2.2 ── depende de 1.4 (deploy para testar storage)
2.4 ── depende de 1.3 (markdown pipe)
2.5 ── independente, facilita debug de 2.1

3.x ── depende das sprints anteriores
```

## Riscos principais

| Risco | Mitigação |
|---|---|
| DNS/subdomínio demorar | Começar 1.4 na primeira hora da Sprint 1 |
| Custo Perplexity alto | Implementar 1.1 (auth) antes de deixar pipeline rodando |
| Breaking change Lovable AI | Ter fallback (OpenAI key opcional) |
| Cliente adicionar escopo durante sprint | Manter backlog separado "feedback contínuo" |

## Critérios "Definition of Done" do epic

1. ✅ Todas as stories da Sprint 1 em status `Done`.
2. ✅ Cliente validou deploy com domínio.
3. ✅ 1 ciclo completo do scheduler executou sem erro em produção.
4. ✅ Documentação de operação (como adicionar tema/feed) entregue.
5. ✅ Credenciais e acessos transferidos ao cliente.
