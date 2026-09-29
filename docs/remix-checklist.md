# Checklist pós-remix — Blogpost 4.0

Execute estes passos **antes** de criar o primeiro usuário no projeto remixado.

## 1. Verificar que as migrations aplicaram sem erro

Este é o passo mais importante. A causa raiz do bug de "primeiro usuário não
vira admin" era uma migration que abortava por violação de chave estrangeira,
levando junto (por rollback) os `CREATE TRIGGER` do mesmo arquivo.

No Supabase do projeto remixado, abrir o SQL Editor e rodar:

```sql
SELECT version
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 5;
```

A versão `20260720000001` precisa aparecer. Se a lista parar em
`20260609161642` ou antes, alguma migration falhou — checar os logs de deploy
antes de continuar.

## 2. Verificar trigger ativo

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'check_email_domain_trigger')
ORDER BY trigger_name;
```

Deve retornar 2 linhas. Se não retornar, rodar:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS check_email_domain_trigger ON auth.users;
CREATE TRIGGER check_email_domain_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_email_domain();
```

## 3. Verificar banco limpo

```sql
-- Deve retornar 0
SELECT count(*) FROM auth.users;

-- Devem retornar 0
SELECT count(*) FROM public.profiles;
SELECT count(*) FROM public.user_roles;
```

`profiles` e `user_roles` têm FK para `auth.users(id)`, então linhas órfãs não
conseguem existir — se `auth.users` está vazia, as outras duas também estarão.

Se `auth.users` **não** estiver vazia (alguém já testou o cadastro antes do
fix), o caminho mais rápido antes de uma apresentação é apagar os usuários de
teste e recomeçar do zero. O `ON DELETE CASCADE` limpa profile e role junto:

```sql
DELETE FROM auth.users;
```

## 4. Criar primeiro usuário

Acessar `/admin/login`, clicar em "Criar conta" e cadastrar com o email do
administrador.

## 5. Verificar se virou admin

```sql
SELECT
  p.full_name,
  p.email,
  p.is_approved,
  ur.role
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id;
```

Deve retornar 1 linha com `role = admin` e `is_approved = true`.

Se o role vier como `user`, corrigir manualmente:

```sql
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'SEU-EMAIL@aqui.com');

UPDATE public.profiles
SET is_approved = true
WHERE email = 'SEU-EMAIL@aqui.com';
```

Se o usuário aparecer em `auth.users` mas **não** em `profiles`, o trigger não
estava ativo no momento do cadastro. Voltar ao passo 2, e depois promover o
usuário existente:

```sql
INSERT INTO public.profiles (id, full_name, email, is_approved)
SELECT id, split_part(email, '@', 1), email, true
FROM auth.users
ORDER BY created_at
LIMIT 1
ON CONFLICT (id) DO UPDATE SET is_approved = true;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
ORDER BY created_at
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;
```

## 6. Verificar URL do scheduler no cron

No SQL Editor do Supabase do projeto remixado, rodar:

```sql
SELECT key, value FROM public.project_config
WHERE key IN ('supabase_url', 'scheduler_secret');

SELECT jobname, command FROM cron.job WHERE jobname = 'scheduler_hourly';
```

A primeira query precisa retornar **duas** linhas com valores preenchidos.

Se `supabase_url` não aparecer, gravar a URL do projeto remixado — este passo é
manual e obrigatório em todo remix. Não existe campo para isso no painel Admin,
e o Postgres não tem como descobrir a própria URL sozinho:

```sql
INSERT INTO public.project_config (key, value)
VALUES ('supabase_url', 'https://SEU_REF.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

O `SEU_REF` é a parte inicial da URL do Supabase (ex: `optbbttmeulvbqfearfc`).
Gravar **sem barra no final** — o cron concatena `/functions/v1/scheduler`.

Atenção ao modo de falha: se `supabase_url` estiver ausente, a URL montada pelo
cron vira NULL e o job roda de hora em hora sem chamar nada — sem erro visível.
O sintoma é apenas nada ser publicado. Por isso a verificação acima importa.

Para testar sem esperar uma hora, agendar temporariamente a cada minuto e
depois restaurar:

```sql
SELECT cron.schedule('scheduler_hourly', '* * * * *', (
  SELECT command FROM cron.job WHERE jobname = 'scheduler_hourly'
));

-- aguardar ~1 min, conferir as chamadas:
SELECT status, url, created FROM net._http_response ORDER BY created DESC LIMIT 5;

-- restaurar:
SELECT cron.schedule('scheduler_hourly', '0 * * * *', (
  SELECT command FROM cron.job WHERE jobname = 'scheduler_hourly'
));
```
