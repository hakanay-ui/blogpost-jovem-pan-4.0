# DB-AUDIT — newsfeed-whisperer

**Autor:** @data-engineer (Dara)
**Data:** 2026-04-20
**Fase:** 2 / 10

---

## 1. Resumo

Schema coerente para o escopo MVP (blog + pipeline IA). RLS geralmente bem aplicada, com duas fraquezas: (1) exposição pública de `editorial_topics` via policy `USING true`, (2) ausência de FK em `rss_items.used_in_post_id`. Falta infra de auditoria/logs e suporte nativo a agendamento por data/horário.

## 2. Débitos de Database

| ID | Débito | Severidade | Horas | Notas |
|---|---|---|---|---|
| DB-01 | `editorial_topics` RLS `USING true` expõe keywords/descrição publicamente | **Alto** | 1h | Trocar para admin-only ou filtrar campos |
| DB-02 | `rss_items.used_in_post_id` sem FK para `posts(id)` | Médio | 1h | Dados órfãos se post for deletado |
| DB-03 | Falta tabela `generation_runs` para auditoria de pipeline IA | **Alto** | 3h | Sem ela, erros Perplexity/Lovable invisíveis |
| DB-04 | Falta `scheduled_at` em `posts` (status `scheduled` do enum sem uso) | **Alto** | 2h | Cliente pediu programação |
| DB-05 | Falta índice `posts(topic_id, status, published_at DESC)` | Médio | 0.5h | Dashboard faz count por status |
| DB-06 | Falta índice `posts(slug)` — existe mas UNIQUE já cria | Baixo | 0h | Redundante |
| DB-07 | `project_config` sem DELETE policy | Baixo | 0.5h | Admin não consegue remover chaves |
| DB-08 | `sources` JSONB sem schema validation | Médio | 1h | Adicionar CHECK ou migrar para tabela |
| DB-09 | Falta tabela `post_revisions` (histórico de edição) | Médio | 4h | Cliente pode pedir depois |
| DB-10 | Falta `tags` / `categories` | Médio | 3h | Blog precisa para navegação |
| DB-11 | Storage bucket para `cover_image_url` não configurado | **Alto** | 2h | Hoje só aceita URL externa |
| DB-12 | Sem `rls` em alguma policy SELECT para `rss_feeds` (admin-only, OK) | Info | 0h | Front nunca mostra — OK |
| DB-13 | `handle_new_user()` usa `LOCK TABLE` — pode causar contention | Baixo | 1h | Alto volume raro nesse escopo |
| DB-14 | Duas migrations no mesmo dia, a 2ª destrói tabela da 1ª | Info | 0h | Só se migrar para outro ambiente |
| DB-15 | `posts.content` TEXT sem limite — potencial bloat | Baixo | 0h | Monitorar |
| DB-16 | `pg_cron` / Supabase Cron não configurado | **Crítico** | 1h | Scheduler nunca roda |

**Total estimado DB:** ~18-20 horas.

## 3. Segurança

### ✅ Bem feito
- `has_role()` SECURITY DEFINER evita recursão RLS.
- RLS habilitado em todas as tabelas públicas.
- Separação `profiles` (próprio) vs `profiles_admin_*`.
- `handle_new_user` em SECURITY DEFINER com `search_path = public`.
- `check_email_domain` permite bootstrap (primeiro user sempre passa).

### ⚠️ Corrigir
- **`topics_select_all USING true`** — qualquer user autenticado ou anônimo lê linha editorial completa. Se o cliente considera isso IP, bloquear.
- **Edge Functions com `verify_jwt=false`** (fora do DB mas relacionado) — `generate-post` pode ser chamada por qualquer um, gastando quota Perplexity/Lovable.
- **`user_roles_select_own`** retorna role próprio ou admin — OK, mas confirma se é esperado usuário ver seu próprio role.

## 4. Performance

- Volumes previstos: baixos (dezenas a centenas de posts/items por dia). Os índices atuais são suficientes para o MVP.
- Atenção futura:
  - `rss_items` cresce sem TTL. Adicionar job de purge (itens > 90 dias não usados).
  - `posts.content` full-text search não indexado (GIN com `to_tsvector('portuguese', content)`).

## 5. Recomendações priorizadas

### Fase 1 — Críticos antes de ir para produção
1. **DB-16** — Agendar `pg_cron` chamando `scheduler` a cada 1h (obrigatório).
2. **DB-01** — Restringir `topics_select_all` (manter só admin; blog não precisa).
3. **DB-11** — Criar bucket `post-covers` com RLS.
4. **DB-03** — Tabela `generation_runs` com status, erro, tokens, latência.

### Fase 2 — Produto
5. **DB-04** — `scheduled_at` em posts + lógica no scheduler.
6. **DB-10** — Tags/categorias.
7. **DB-02** — FK em `used_in_post_id` com `ON DELETE SET NULL`.
8. **DB-05** — Índice composto para dashboard.

### Fase 3 — Robustez
9. **DB-09** — `post_revisions`.
10. **DB-08** — Schema validation para `sources`.

## 6. Script sugerido para auditoria (runtime)

```sql
-- Tabelas sem RLS
SELECT schemaname, tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- Índices faltantes em FKs
SELECT c.conname, c.conrelid::regclass
FROM pg_constraint c
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND c.conkey[1] = ANY(i.indkey)
  );

-- Tamanho por tabela
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;
```
