import { describe, it, expect } from "vitest";
import {
  findForbiddenExpressions,
  findPlaceholders,
  isBlockedSource,
  mentionedAdvertisers,
  nowInGoias,
  slugify,
  unsupportedNumbers,
  wordCount,
} from "../../supabase/functions/_shared/editorial";

describe("unsupportedNumbers", () => {
  const corpus = "A prefeitura vacina 1.200 pessoas por dia em 15 Cais, das 8h às 17h, até 30 de outubro.";

  it("aceita números presentes nas fontes, inclusive com separador de milhar", () => {
    expect(unsupportedNumbers("Serão 1.200 doses por dia em 15 unidades.", corpus)).toEqual([]);
  });

  it("aponta número inventado", () => {
    expect(unsupportedNumbers("Serão 1.500 doses por dia.", corpus)).toEqual(["1.500"]);
  });

  it("ignora contagens pequenas e os dials da rádio", () => {
    expect(unsupportedNumbers("Em 3 bairros. Ouça na 106,7 e na 105,7.", corpus)).toEqual([]);
  });

  it("compara decimais com vírgula", () => {
    expect(unsupportedNumbers("Alta de 3,5%.", "subiu 3,5% no mês")).toEqual([]);
    expect(unsupportedNumbers("Alta de 4,2%.", "subiu 3,5% no mês")).toEqual(["4,2"]);
  });
});

describe("findPlaceholders", () => {
  it("detecta marcadores de rascunho", () => {
    expect(findPlaceholders("O evento será em xx de outubro")).toContain('"xx"');
    expect(findPlaceholders("Telefone: [inserir telefone]")).toContain("[inserir]");
    expect(findPlaceholders("Lorem ipsum")).toContain("lorem");
    expect(findPlaceholders("O secretário ( ) disse")).toContain("parênteses vazios");
  });

  it("não acusa texto limpo", () => {
    expect(findPlaceholders("Goiânia amplia horário de vacinação nos Cais até sexta.")).toEqual([]);
  });
});

describe("isBlockedSource", () => {
  it("bloqueia Google Notícias e agregadores, inclusive subdomínios", () => {
    expect(isBlockedSource("https://news.google.com/rss/articles/abc")).toBe(true);
    expect(isBlockedSource("https://br.investing.com/news/123")).toBe(true);
    expect(isBlockedSource("https://www.msn.com/pt-br/noticias")).toBe(true);
  });

  it("libera veículos e fontes oficiais", () => {
    expect(isBlockedSource("https://g1.globo.com/go/goias/noticia/x.ghtml")).toBe(false);
    expect(isBlockedSource("https://www.goiania.go.gov.br/noticia")).toBe(false);
  });

  it("bloqueia URL inválida", () => {
    expect(isBlockedSource("não é url")).toBe(true);
  });
});

describe("expressões proibidas e anunciantes", () => {
  it("encontra expressões proibidas sem diferenciar maiúsculas", () => {
    expect(findForbiddenExpressions("Vale destacar que a obra atrasou.")).toEqual(["vale destacar"]);
  });

  it("encontra anunciantes da lista", () => {
    expect(mentionedAdvertisers("Promoção no Supermercado Bretas", "Bretas, Hot Park")).toEqual(["Bretas"]);
    expect(mentionedAdvertisers("Nada aqui", "")).toEqual([]);
  });
});

describe("nowInGoias", () => {
  it("converte UTC para o horário de Goiás (UTC-3)", () => {
    // 2026-10-05 02:30 UTC = 2026-10-04 23:30 em Goiás (domingo)
    const r = nowInGoias(new Date("2026-10-05T02:30:00Z"));
    expect(r.dateStr).toBe("2026-10-04");
    expect(r.minutesOfDay).toBe(23 * 60 + 30);
    expect(r.isWeekend).toBe(true);
  });

  it("segunda-feira 9h30 é dia útil", () => {
    const r = nowInGoias(new Date("2026-10-05T12:30:00Z"));
    expect(r.minutesOfDay).toBe(9 * 60 + 30);
    expect(r.isWeekend).toBe(false);
  });
});

describe("slugify e wordCount", () => {
  it("gera slug curto sem acento", () => {
    expect(slugify("Vacinação nos Cais: horário ampliado!")).toBe("vacinacao-nos-cais-horario-ampliado");
  });

  it("conta palavras ignorando markdown", () => {
    expect(wordCount("## Título\n\n- item um\n- item [dois](x)")).toBe(5);
  });
});
