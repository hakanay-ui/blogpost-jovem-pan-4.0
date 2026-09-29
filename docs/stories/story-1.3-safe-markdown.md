# Story 1.3 — Markdown seguro e robusto

**Status:** Draft
**Epic:** Finalização e Go-live
**Prioridade:** 🔴 Alta
**Estimativa:** 3-4h
**Sprint:** 1
**Dependencies:** nenhuma

---

## Problema

`src/routes/post.$slug.tsx` implementa parser markdown manual com regex + `dangerouslySetInnerHTML`. Dois problemas:

1. **Segurança:** escapa básico mas não sanitiza HTML produzido. Se conteúdo do AI ou edição admin injetar `<script>`, vaza.
2. **Qualidade:** não suporta tabelas, task lists, footnotes, imagens inline.

## Solução proposta

Substituir por `react-markdown` + `remark-gfm` + `rehype-sanitize`.

## Acceptance Criteria

1. `renderMarkdown` removido de `post.$slug.tsx`.
2. Post com `<script>alert(1)</script>` no content **não executa** JS (script escapado/removido).
3. Post com tabela GFM renderiza como `<table>`.
4. Post com `- [ ] task` renderiza checkbox.
5. Links abrem em nova aba.
6. `prose-blog` styles continuam aplicados.
7. Bundle size do blog não aumenta > 30KB gzipped.

## Tasks

- [ ] `bun add react-markdown remark-gfm rehype-sanitize rehype-raw`.
- [ ] Criar componente `src/components/blog/Markdown.tsx` com schema de sanitização custom (permite classes Tailwind nos blocos).
- [ ] Substituir em `post.$slug.tsx`.
- [ ] Testar com conteúdo existente do admin.
- [ ] Testar com payload malicioso.

## Dev Notes

```tsx
// src/components/blog/Markdown.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), ["target"], ["rel"]],
  },
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      className="prose-blog"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, schema]]}
      components={{
        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
```

## Testes

- [ ] Post com `<img onerror=alert(1)>` → imagem removida ou sem handler.
- [ ] Post com ```` ```ts ```` code block → renderiza com classe.
- [ ] Post com `> blockquote` → renderiza.

## Change Log
- 2026-04-20: story criada (@pm)
