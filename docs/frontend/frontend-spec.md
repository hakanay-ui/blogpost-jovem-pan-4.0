# Frontend Spec — newsfeed-whisperer

**Autor:** @ux-design-expert (Uma)
**Data:** 2026-04-20
**Fase:** 3 / 10

---

## 1. Visão geral

Dois "produtos" no mesmo bundle:

1. **Blog público** (`/`, `/post/$slug`) — consumo, SEO, leitura.
2. **Admin** (`/admin/*`) — gestão (tema admin escuro/sidebar, brand "EditorIA").

Design system próprio (tokens Tailwind customizados: `bg-bg-base`, `text-text-primary`, `accent`, `lp-card-elevated`, `lp-btn-primary-indigo`, etc). Visual premium, animações `ScrollReveal` (framer-motion) e `animate-fade-in-up`.

## 2. Inventário de rotas

| Rota | Público | Componente | Notas |
|---|---|---|---|
| `/` | ✅ | `BlogIndex` | Hero + grid de posts |
| `/post/$slug` | ✅ | `PostPage` | Artigo + fontes |
| `/admin/login` | ✅ | `LoginSignupForm` | Login/Signup |
| `/pending-approval` | ✅ | Tela de espera | Pós-signup se `require_account_approval` |
| `/admin` | 🔒 | `AdminLayout` + `Dashboard` | Stats |
| `/admin/topics` | 🔒 | `TopicsPage` | CRUD linha editorial |
| `/admin/feeds` | 🔒 | `FeedsPage` | CRUD + presets RSS |
| `/admin/posts` | 🔒 | `PostsPage` | Lista/filtros/publicar |
| `/admin/posts/$id` | 🔒 | `EditPost` | Editor markdown textarea |
| `/admin/generate` | 🔒 | `GeneratePage` | Disparo manual IA |
| `/admin/team` | 🔒 | — | Gestão usuários (330 linhas) |
| `/admin/security` | 🔒 | — | Config aprovação/domínio |
| `/admin/integrations` | 🔒 | `IntegrationsPage` | Status API keys |

Guard admin: `AdminLayout` redireciona não-admins e usuários não-aprovados.

## 3. Componentes / Design System

### Tokens Tailwind detectados
```
bg-bg-base, bg-bg-elevated, bg-bg-surface-1, bg-bg-surface-2, bg-bg-subtle-accent
text-text-primary, text-text-secondary, text-text-tertiary, text-text-on-dark
accent, accent-hover, accent-light, warm, success, destructive, muted
sidebar-background, sidebar-foreground, sidebar-primary, sidebar-accent
```

### Classes utilitárias custom
- `lp-card-elevated` — card com sombra + borda.
- `lp-btn-primary-indigo`, `lp-btn-secondary` — botões.
- `lp-section-dark` — seções hero escuras.
- `stat-value`, `stat-label` — métricas dashboard.
- `prose-blog` — estilização markdown renderizado.
- `animate-fade-in-up` — animação (com `--stagger`).

### Componentes reutilizáveis
- `ScrollReveal` (framer-motion wrapper) — usado no blog.
- `PublicLayout`, `AdminLayout` — shells.
- `ProtectedRoute` — guard por role.
- `components/ui/*` (Radix + shadcn-style) — 27+ primitivos.

## 4. Fluxos principais

### 4.1 Leitor do blog
`/` → vê lista → clica card → `/post/$slug` → lê markdown + fontes.

### 4.2 Admin gerando post
`/admin/login` → dashboard → Topics (cria) → Feeds (adiciona) → Generate (seleciona topic → "Gerar post" → espera 30-60s) → Posts (revisa → publicar).

### 4.3 Admin gestão contínua
Dashboard com 4 cards + 2 atalhos; rotas laterais via sidebar com ícones Lucide.

## 5. Débitos de UX/Frontend

| ID | Débito | Severidade | Horas | Impacto UX |
|---|---|---|---|---|
| UX-01 | Editor markdown é `textarea` puro (admin.posts.$id) | **Alto** | 8h | Editor sofre: sem preview, sem toolbar, sem upload inline |
| UX-02 | Markdown renderer caseiro em `/post/$slug` (95 linhas) | **Alto** | 3h | Risco XSS + sem suporte a tabelas, task lists, footnotes |
| UX-03 | Estados loading/error/empty inconsistentes entre rotas admin | Médio | 5h | "Carregando…" em texto, sem skeletons em muitos lugares |
| UX-04 | Sem toast/feedback após ações (salvar, excluir, publicar) | Médio | 2h | sonner instalado mas usado só em integrations |
| UX-05 | Sem paginação em `/admin/posts` e `/` (limit 50) | Médio | 3h | Quebra com >50 posts |
| UX-06 | Sem busca/filtro por título ou topic em `/admin/posts` | Médio | 2h | Filtro só por status |
| UX-07 | Sem preview do post antes de publicar | Alto | 3h | Admin publica "às cegas" |
| UX-08 | Sem calendário editorial / agendamento visual | **Alto** | 8h | Cliente pediu programação |
| UX-09 | Sem upload de imagem de capa (URL externa apenas) | **Alto** | 6h | Depende de DB-11 (storage) |
| UX-10 | Sem OG/meta tags SSR (SEO client-side frágil) | **Alto** | 4h | Compartilhamento em redes social quebra |
| UX-11 | Responsividade admin não testada em mobile | Médio | 4h | Sidebar fixa de 64 units não adapta |
| UX-12 | Acessibilidade: botões com `title` mas sem `aria-label`, contrastes não auditados | Médio | 4h | Precisa audit WCAG AA |
| UX-13 | Dashboard admin: 4 cards estáticos, sem gráficos/tendências | Baixo | 4h | Recharts instalado mas não usado |
| UX-14 | Sem página de categorias/tags no blog público | Médio | 4h | Depende de DB-10 |
| UX-15 | Sem RSS feed do próprio blog | Médio | 2h | Blog gerando conteúdo mas sem export |
| UX-16 | `confirm()` nativo (delete) em vez de AlertDialog Radix | Baixo | 1h | UI inconsistente |
| UX-17 | Blog home não mostra tema/categoria nem autor | Baixo | 2h | Só data e flag IA |
| UX-18 | Página 404 do blog: ok, mas admin não tem 404 próprio | Baixo | 1h | |
| UX-19 | Animações `animate-fade-in-up` dependem de `style={["--stagger"]}` — compatibilidade inline style | Info | 0h | Funciona |
| UX-20 | Sem dark/light toggle (só tema claro no admin, dark no sidebar) | Baixo | 3h | Preferência usuário |

**Total estimado UX:** ~65 horas.

## 6. Acessibilidade (preliminar)

- ✅ Estrutura semântica (`<article>`, `<header>`, `<nav>`).
- ✅ Labels em inputs do admin.
- ⚠️ Botões-ícone sem texto visível precisam `aria-label` (apenas `title`).
- ⚠️ Contrastes não auditados (tokens customizados).
- ⚠️ `dangerouslySetInnerHTML` em post render — se XSS passar, acessibilidade é menor problema.
- ⚠️ Sem skip-link.
- ⚠️ Focus-visible styles dependem do Radix padrão.

## 7. Performance

- ✅ Vite + build Cloudflare Workers — rápido.
- ✅ `loading="lazy"` em imagens do grid.
- ⚠️ `supabase.from().select()` inline sem cache — recarrega a cada mount.
- ⚠️ Bundle: 27 pacotes Radix + framer-motion + recharts — possível tree-shaking agressivo precisa validar.
- ⚠️ Sem analytics (Plausible/Umami/PostHog) para medir Core Web Vitals.

## 8. Sugestões de priorização

### Quick wins (1 semana)
- UX-02: trocar por `react-markdown` + `rehype-sanitize` + `remark-gfm`.
- UX-04: padronizar `toast.success` / `toast.error` (sonner já instalado).
- UX-16: `<AlertDialog>` Radix para deletes.
- UX-17: adicionar tema/autor nos cards da home.

### Sprint de produção (2 semanas)
- UX-01 + UX-07: editor com preview (Tiptap/BlockNote ou MDXEditor).
- UX-09: upload cover (Supabase Storage).
- UX-10: SEO SSR (TanStack Start head/meta).
- UX-08 + DB-04: calendário editorial + scheduled_at.

### Polimento (1 semana)
- UX-03: skeletons padronizados.
- UX-05 + UX-06: paginação + busca.
- UX-12: audit WCAG AA com axe-core.

## 9. Respostas ao @architect (perguntas da Fase 1)

- **Editor:** recomendo [BlockNote](https://www.blocknotejs.org/) (editor WYSIWYG com markdown under the hood) ou [MDXEditor](https://mdxeditor.dev/) se quisermos manter markdown pelo source. Textarea com preview lado a lado é o mínimo aceitável.
- **Calendário:** `react-day-picker` (já instalado) para o picker; lista semanal mostrando posts `scheduled` por dia.
- **Estados loading/error/empty:** criar 3 componentes em `components/ui/`: `<Loading>`, `<EmptyState>`, `<ErrorState>` e usar em todas as rotas admin.
- **Acessibilidade das fontes:** ordered list está ok, mas adicionar `<nav aria-label="Fontes citadas">` ao redor.
