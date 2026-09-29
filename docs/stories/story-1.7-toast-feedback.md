# Story 1.7 — Toast feedback em ações admin

**Status:** Draft
**Epic:** Finalização e Go-live
**Prioridade:** 🟡 Média
**Estimativa:** 2h
**Sprint:** 1
**Dependencies:** nenhuma

---

## Problema

`sonner` está instalado e usado só em `admin.integrations.tsx`. Nas demais rotas admin (topics, feeds, posts) ações como criar/salvar/excluir/publicar não mostram feedback — usuário não sabe se deu certo.

## Acceptance Criteria

1. Criar tema, feed, post → toast "Criado com sucesso".
2. Atualizar → toast "Salvo".
3. Excluir → toast "Excluído".
4. Publicar/despublicar post → toast apropriado.
5. Erros de Supabase → `toast.error(error.message)`.
6. `<Toaster />` configurado globalmente (em `__root.tsx` ou `AdminLayout`).

## Tasks

- [ ] Adicionar `<Toaster richColors position="top-right" />` no root layout.
- [ ] Refatorar `admin.topics.tsx` (create/update/remove).
- [ ] Refatorar `admin.feeds.tsx`.
- [ ] Refatorar `admin.posts.tsx` (publish/unpublish/delete).
- [ ] Refatorar `admin.posts.$id.tsx` (save/publish).
- [ ] Em `admin.generate.tsx`, trocar bloco de erro custom por toast (ou manter ambos).

## Dev Notes

Padrão:
```tsx
try {
  const { error } = await supabase.from("...").insert(...);
  if (error) throw error;
  toast.success("Criado com sucesso");
  load();
} catch (e: any) {
  toast.error(e.message ?? "Erro ao criar");
}
```

## Testes

- [ ] Smoke manual em cada rota admin.

## Change Log
- 2026-04-20: story criada (@pm)
