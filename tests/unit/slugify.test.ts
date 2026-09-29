import { describe, it, expect } from "vitest";

// Réplica da função de slug usada em generate-post e TagsSelector.
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

describe("slugify", () => {
  it("remove diacríticos", () => {
    expect(slugify("Programação Orientada à Ação")).toBe("programacao-orientada-a-acao");
  });

  it("colapsa espaços consecutivos", () => {
    expect(slugify("Olá   Mundo")).toBe("ola-mundo");
  });

  it("descarta caracteres especiais", () => {
    expect(slugify("C++ & TypeScript?!")).toBe("c-typescript");
  });

  it("limita em 80 caracteres", () => {
    const long = "a".repeat(120);
    expect(slugify(long).length).toBe(80);
  });

  it("vazio retorna vazio", () => {
    expect(slugify("")).toBe("");
  });
});
