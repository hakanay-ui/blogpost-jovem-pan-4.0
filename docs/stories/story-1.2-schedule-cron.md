# Story 1.2 — Configurar pg_cron em produção

**Status:** Draft
**Epic:** Finalização e Go-live
**Prioridade:** 🔴 Crítica
**Estimativa:** 1-2h
**Sprint:** 1
**Dependencies:** Story 1.1 (secret do scheduler)

---

## Problema

O `scheduler` edge function existe mas nada o invoca automaticamente. Toda geração é manual via admin. Cliente pediu "programação de frequência de postagem" — sem cron, não há programação.

## Solução proposta

Usar **Supabase Cron** (extensão `pg_cron` + `pg_net`) para chamar `https://optbbttmeulvbqfearfc.supabase.co/functions/v1/scheduler` a cada 1 hora, com header `Authorization: Bearer $SCHEDULER_SECRET`.

## Acceptance Criteria

1. `pg_cron` e `pg_net` estão habilitados no projeto Supabase.
2. Job `scheduler_hourly` criado que executa a cada hora cheia.
3. Job chama URL da edge function com secret correto.
4. Após 1 execução, `editorial_topics.last_generated_at` dos temas vencidos está atualizado (se havia temas ativos).
5. Logs visíveis em `cron.job_run_details`.

## Tasks

- [ ] Criar migration `supabase/migrations/*_enable_cron.sql` com:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;

  SELECT cron.schedule(
    'scheduler_hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
      url := 'https://optbbttmeulvbqfearfc.supabase.co/functions/v1/scheduler',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.scheduler_secret'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    $$
  );
  ```
- [ ] Configurar `app.scheduler_secret` via `ALTER DATABASE ... SET app.scheduler_secret = '...'`.
- [ ] Verificar `SELECT * FROM cron.job` — job listado.
- [ ] Aguardar 1 hora cheia ou forçar `SELECT cron.schedule(...)` test.
- [ ] Checar `cron.job_run_details ORDER BY start_time DESC LIMIT 5`.

## Dev Notes

- Alternativa: usar external cron (EasyCron, cron-job.org) apontando para edge — mais frágil, preferir pg_cron.
- Frequência 1h é padrão; topic com `frequency_hours=24` só gerará 1x por dia.

## Testes

- [ ] Criar tema ativo com `frequency_hours=1` e rodar scheduler manualmente (`curl`). Confirmar que gera post.
- [ ] Após 1h, ver `cron.job_run_details` com status `succeeded`.

## Change Log
- 2026-04-20: story criada (@pm)
