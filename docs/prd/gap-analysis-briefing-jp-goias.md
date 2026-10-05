# Gap analysis — Briefing Jovem Pan Goiás × código atual (05/10/2026)

Referência: `docs/brand/briefing-editorial.md`. Legenda: ✅ existe · 🟡 parcial · ❌ falta.

| # | Requisito do briefing | Status | Situação atual | O que fazer |
|---|---|---|---|---|
| 1 | Feeds gerenciados pelo painel | ✅ | `admin.feeds.tsx` + `rss_feeds` (name, url, topic_id, active) | Cadastrar os 22 feeds + 6 buscas Google News; marcar Google News como "só pauta, não citar" |
| 2 | 12 horários fixos com categoria por slot, dia útil × fim de semana | ❌ | Scheduler por tópico (interval / daily_window em UTC / per_new_item), cron horário | Tabela `schedule_slots` (dia, hora America/Sao_Paulo, categoria, fallback); scheduler escolhe a melhor notícia do slot ou pula |
| 3 | 9 categorias + praça | 🟡 | `posts.topic_id` → `editorial_topics`; tags livres | Usar `editorial_topics` como categorias (9) + campo `praca` (goiania / caldas / ambas) |
| 4 | Fila de aprovação por categoria, timeout 4h, e-mail ao aprovador | 🟡 | Status draft/scheduled/published/archived; `publish_mode` auto/review por tópico | Status `pending_review`; regra por categoria + detecção de risco (política, polícia, acusação, saúde, anunciante); expira em 4h; e-mail (Resend) |
| 5 | Bloqueios automáticos (duplicado 72h, placeholder, fonte inválida, dado sem fonte, sem imagem/categoria) | ❌ | Só tratamento de slug duplicado | Função `validate-post` antes de publicar; duplicado por similaridade de assunto |
| 6 | Tom de voz e regras de escrita | 🟡 | Prompt hardcoded em `generate-post`; tom só por descrição do tópico; Perplexity `sonar` + Gemini 3 Flash (Lovable Gateway) | Reescrever system prompt com as 9 regras + lista de proibidos + o que fica de fora; guardar prompt em `project_config` |
| 7 | Formato (linha fina, "O que muda pra você", Contexto, Fontes, assinatura, nota fixa, chamada da rádio) | 🟡 | excerpt, sources, AuthorBio | Campo `subtitle`; seções no schema da tool; assinatura fixa "Redação Jovem Pan Goiás (com IA)"; nota e chamada no template |
| 8 | Imagem (foto oficial com crédito → IA sem rosto real; 1200×675 WebP + alt) | 🟡 | Gemini image, formato do modelo (PNG), alt = título | Extrair imagem do RSS de fontes oficiais/Agência Brasil; converter para WebP 1200×675; campos `cover_alt`, `cover_credit` |
| 9 | SEO (URL `/categoria/slug`, NewsArticle, news sitemap, meta ≤155) | 🟡 | `/post/$slug`, og/twitter, sitemap simples, `/feed.xml` | Rota `/$categoria/$slug` (redirect do antigo), JSON-LD NewsArticle, `news-sitemap.xml`, validar 155 |
| 10 | Compartilhar, newsletter 06h (LGPD), anúncios, Anuncie, Política editorial, correções com data | ❌ | Nada | Implementar no front; newsletter com double opt-in e envio diário |
| 11 | Custo / uso de IA | 🟡 | `generation_runs` sem tokens/custo | Registrar tokens e custo por run; painel de custo mensal |
| — | Visual da marca (vermelho #DD0510, Gotham/Montserrat, logo) | ❌ | Tema genérico (Geist) | Novo tema + front do blog |

## Respostas às perguntas do cliente
1. **Fila de aprovação por categoria com tempo-limite?** Hoje existe só auto × revisão por tópico. Fila com regra por categoria, timeout de 4h e e-mail precisa ser implementada (item 4).
2. **Custo mensal (12 posts/dia ≈ 360/mês)?** Ver estimativa na conversa; validar preços vigentes antes de enviar ao cliente.
3. **Adicionar/retirar feeds pelo painel?** Sim, já existe.
