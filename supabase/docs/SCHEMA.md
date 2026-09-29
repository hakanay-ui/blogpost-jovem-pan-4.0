# SCHEMA — newsfeed-whisperer

**Database:** Supabase (Postgres 15) — projeto `optbbttmeulvbqfearfc`
**Autor:** @data-engineer (Dara)
**Data:** 2026-04-20
**Fase:** 2 / 10 (Brownfield Discovery)

---

## 1. Enums

```sql
app_role       ENUM('admin', 'editor', 'user')
post_status    ENUM('draft', 'scheduled', 'published', 'archived')
publish_mode   ENUM('auto', 'review')
```

> **Nota:** `post_status.scheduled` existe mas **não é usado pelo código atual**.

## 2. Tabelas

### 2.1 `profiles`

Perfil estendido ligado 1:1 a `auth.users`. PK = `auth.users.id`.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | FK `auth.users(id)` ON DELETE CASCADE |
| `full_name` | TEXT NOT NULL | |
| `email` | TEXT NOT NULL | Sincronizado no trigger |
| `avatar_url` | TEXT | |
| `status` | TEXT | CHECK `online/offline/away/busy`, default `offline` |
| `is_active` | BOOLEAN | default `true` |
| `is_approved` | BOOLEAN | default `false` (primeiro user = true via trigger) |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**RLS:** ENABLED.
- `profiles_select_own` — SELECT próprio
- `profiles_admin_select` — SELECT admin
- `profiles_update_own` / `profiles_admin_update`
- `profiles_insert_self`
- `profiles_admin_delete`

**Trigger:** `trg_profiles_updated_at` atualiza `updated_at`.

### 2.2 `user_roles`

Múltiplos papéis por usuário (1:N).

| Coluna | Tipo |
|---|---|
| `id` | UUID PK |
| `user_id` | UUID FK `auth.users` CASCADE |
| `role` | `app_role` |
| `created_at` | TIMESTAMPTZ |

UNIQUE(`user_id`, `role`).

**RLS:**
- `user_roles_select_own` — próprio ou admin
- `user_roles_admin_all` — admin full

**Função:** `has_role(_user_id, _role)` — `SECURITY DEFINER STABLE`, usada em policies.

### 2.3 `project_config`

Configurações globais chave-valor.

| Coluna | Tipo | Valores iniciais |
|---|---|---|
| `key` | TEXT PK | `restrict_signup_by_domain`, `allowed_email_domains`, `require_account_approval` |
| `value` | TEXT | |
| `updated_at` | TIMESTAMPTZ | |

**RLS:** admin-only (SELECT/UPDATE/INSERT). ⚠️ Sem policy DELETE.

### 2.4 `editorial_topics` ⭐

Linha editorial.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `description` | TEXT | |
| `keywords` | TEXT[] | default `{}` |
| `publish_mode` | `publish_mode` | default `review` |
| `frequency_hours` | INT NOT NULL | default 24 |
| `active` | BOOLEAN | default true |
| `last_generated_at` | TIMESTAMPTZ | atualizado pelo `generate-post` |
| `created_by` | UUID FK `auth.users` | SET NULL |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**RLS:**
- `topics_select_all` — SELECT público (USING `true`) ⚠️ **expõe linha editorial inteira**
- `topics_admin_all` — admin full

### 2.5 `rss_feeds`

Fontes RSS.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `url` | TEXT NOT NULL UNIQUE | |
| `topic_id` | UUID FK `editorial_topics` SET NULL | |
| `active` | BOOLEAN | default true |
| `last_fetched_at` | TIMESTAMPTZ | |

**RLS:** `feeds_admin_all` — admin only (sem policy de SELECT público).

### 2.6 `rss_items`

Itens coletados dos feeds.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `feed_id` | UUID FK `rss_feeds` CASCADE | |
| `guid` | TEXT NOT NULL | |
| `title` | TEXT NOT NULL | |
| `link` | TEXT NOT NULL | |
| `description` | TEXT | |
| `published_at` | TIMESTAMPTZ | |
| `used_in_post_id` | UUID | ⚠️ **sem FK para `posts`** |
| `created_at` | TIMESTAMPTZ | |

UNIQUE(`feed_id`, `guid`) — dedup.
Index: `rss_items_feed_published (feed_id, published_at DESC)`.

**RLS:** `rss_items_admin_all` — admin only.

### 2.7 `posts` ⭐

Posts do blog.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `topic_id` | UUID FK `editorial_topics` SET NULL | |
| `author_id` | UUID FK `auth.users` SET NULL | |
| `title` | TEXT NOT NULL | |
| `slug` | TEXT NOT NULL UNIQUE | |
| `excerpt` | TEXT | |
| `content` | TEXT NOT NULL | markdown |
| `cover_image_url` | TEXT | |
| `status` | `post_status` | default `draft` |
| `meta_title` / `meta_description` | TEXT | SEO |
| `sources` | JSONB | default `[]` (citações Perplexity) |
| `ai_generated` | BOOLEAN | default false |
| `published_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**Indexes:**
- `posts_status_published (status, published_at DESC)`
- `posts_slug (slug)`

**RLS:**
- `posts_select_published` — status='published' OR admin
- `posts_admin_all` — admin full

## 3. Funções

| Nome | Tipo | Propósito |
|---|---|---|
| `has_role(user_id, role)` | STABLE SECURITY DEFINER | Evita recursão em RLS |
| `update_updated_at_column()` | Trigger fn | `updated_at = now()` |
| `handle_new_user()` | SECURITY DEFINER | Cria profile + role; primeiro usuário vira admin+approved |
| `check_email_domain()` | BEFORE INSERT auth.users | Valida domínio por `project_config` |

## 4. Triggers

| Trigger | Tabela | Quando |
|---|---|---|
| `on_auth_user_created` | `auth.users` | AFTER INSERT → `handle_new_user` |
| `check_domain_before_signup` | `auth.users` | BEFORE INSERT → `check_email_domain` |
| `trg_profiles_updated_at` | `profiles` | BEFORE UPDATE |
| `topics_updated_at` | `editorial_topics` | BEFORE UPDATE |
| `feeds_updated_at` | `rss_feeds` | BEFORE UPDATE |
| `posts_updated_at` | `posts` | BEFORE UPDATE |

## 5. Diagrama de relacionamentos

```
auth.users (1) ─┬─ (1) profiles
                ├─ (N) user_roles
                ├─ (N) editorial_topics.created_by
                └─ (N) posts.author_id

editorial_topics (1) ─┬─ (N) rss_feeds.topic_id
                      └─ (N) posts.topic_id

rss_feeds (1) ── (N) rss_items
                          │
                          └─ (?) used_in_post_id ⚠️ sem FK

project_config (standalone)
```

## 6. Migrations

| Arquivo | Data | Conteúdo |
|---|---|---|
| `20260420174023_*.sql` | 2026-04-20 17:40 | Enums, profiles v1, user_roles, has_role, handle_new_user, editorial_topics, rss_feeds, rss_items, posts |
| `20260420181913_*.sql` | 2026-04-20 18:19 | **Recria** profiles (id=auth.users.id), adiciona `is_approved`, `status`, `project_config`, `check_email_domain` |

> ⚠️ Migrations geradas no mesmo dia. Segunda destrói e recria `profiles`. Em produção real isso seria problema.
