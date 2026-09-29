# Operations — newsfeed-whisperer

Guia operacional de setup e deploy.

---

## 1. Secrets necessários

### Supabase Edge Functions

Configurar em **Supabase Dashboard → Project → Edge Functions → Secrets**:

| Secret | Fonte | Descrição |
|---|---|---|
| `SUPABASE_URL` | Auto (platform) | Já vem pronto |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto (platform) | Já vem pronto |
| `PERPLEXITY_API_KEY` | https://perplexity.ai/settings/api | Pesquisa factual em `generate-post` |
| `LOVABLE_API_KEY` | Settings → Workspace → AI Gateway no Lovable | Redação em `generate-post` |
| `SCHEDULER_SECRET` | Gerar com `openssl rand -hex 32` | Auth do cron → scheduler |

### Database (para pg_cron)

Via SQL Editor do Supabase:

```sql
ALTER DATABASE postgres SET app.scheduler_secret = '<mesmo valor de SCHEDULER_SECRET>';
```

### Cliente (build time)

Já presentes em `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Nunca** commitar `SUPABASE_SERVICE_ROLE_KEY` ou chaves de API de terceiros no repo.

## 2. Deploy das edge functions

```bash
# Link no projeto
npx supabase link --project-ref optbbttmeulvbqfearfc

# Deploy
npx supabase functions deploy fetch-rss
npx supabase functions deploy generate-post
npx supabase functions deploy scheduler
```

Após deploy, testar auth:

```bash
# Deve retornar 401 (sem JWT)
curl -i https://optbbttmeulvbqfearfc.supabase.co/functions/v1/generate-post \
  -X POST -H "Content-Type: application/json" -d '{"topicId":"x"}'

# Deve retornar 401 (sem SCHEDULER_SECRET)
curl -i https://optbbttmeulvbqfearfc.supabase.co/functions/v1/scheduler -X POST

# Deve executar (com secret correto)
curl -i https://optbbttmeulvbqfearfc.supabase.co/functions/v1/scheduler \
  -X POST -H "Authorization: Bearer $SCHEDULER_SECRET"
```

## 3. Agendamento (pg_cron)

Ver Story 1.2 — migration habilita `pg_cron` + `pg_net` e agenda chamada horária.

```sql
SELECT jobid, jobname, schedule, command
FROM cron.job WHERE jobname = 'scheduler_hourly';

SELECT runid, start_time, end_time, status, return_message
FROM cron.job_run_details
ORDER BY start_time DESC LIMIT 10;
```

## 4. Migrations

```bash
# Aplicar migrations locais no projeto linkado
npx supabase db push

# Gerar nova migration
npx supabase migration new <nome>
```

## 5. Deploy do frontend (Lovable Publish)

Rota escolhida: **Lovable Publish** com subdomínio customizado.

### Passos

1. No painel do Lovable do projeto, clicar em **Publish**.
2. Copiar a URL `*.lovable.app` gerada.
3. Em **Settings → Domains** do projeto Lovable:
   - Adicionar o domínio custom (ex.: `blog.cliente.com.br`).
   - Lovable gera registros DNS — copiar `CNAME` alvo.
4. No provedor de DNS do cliente (Registro.br, Cloudflare, etc.):
   - Criar registro **CNAME** do subdomínio apontando para o alvo do Lovable.
   - TTL sugerido: 300s inicialmente; depois pode subir.
5. Aguardar propagação + emissão automática do certificado SSL (até 1h).
6. Configurar env var de produção no Lovable:
   - `VITE_SITE_URL` = `https://<subdomain>` (usado pelo SEO/sitemap/RSS).
7. Validar:
   - `curl -I https://<subdomain>/` retorna 200.
   - Abrir um post publicado e verificar meta tags.

### Rollback / sem domínio custom
Durante desenvolvimento, o site fica disponível em `*.lovable.app` — usar essa URL em `VITE_SITE_URL`.

### Nota sobre env vars no Lovable
- `VITE_*` são embutidas no bundle no build.
- Alterações em env exigem **republish** (botão Publish novamente).
- Secrets do Supabase Edge Functions são geridos no **painel do Supabase**, não no Lovable.

### Worker secrets necessários para SSR

O `client.ts` não tem mais fallback hardcoded — se as variáveis sumirem, o
app falha alto em vez de conectar no projeto Cloud errado. Para o SSR
(Cloudflare Worker) inicializar o Supabase, estes secrets precisam existir
no Worker do projeto:

| Secret | Quem usa | Obrigatório |
|---|---|---|
| `SUPABASE_URL` | SSR (client.ts), server fns (`requireSupabaseAuth`, admin) | sim |
| `SUPABASE_PUBLISHABLE_KEY` | SSR (client.ts), `requireSupabaseAuth` | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseAdmin` (server-only, bypassa RLS) | sim p/ admin/webhooks |
| `SUPABASE_PROJECT_ID` | scripts/diagnóstico | opcional |

No browser, as três `VITE_SUPABASE_*` em `.env` (versionado) cobrem o
bundle. Em remix, o Lovable Cloud regenera `.env` com as chaves do novo
projeto antes do primeiro build — por isso `.env` precisa permanecer fora
do `.gitignore`.

## 6. Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| Edge function 401 no admin | Sessão expirada | Logout/login |
| `generate-post` falha 429 | Rate limit Lovable | Aguardar; ver Story 2.6 (retry/backoff) |
| `generate-post` falha 402 | Créditos Lovable esgotados | Recarregar em Workspace → Usage |
| Scheduler 401 no cron | `app.scheduler_secret` difere de `SCHEDULER_SECRET` | Sincronizar em ambos |
| Cron não roda | Extensão `pg_cron` não habilitada | Migration da Story 1.2 |
