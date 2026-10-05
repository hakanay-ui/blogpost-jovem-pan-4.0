import { describe, it, expect } from "vitest";
import {
  articleTextFromHtml,
  buildPhotoPrompt,
  canUseSourcePhoto,
  extractOgImage,
  isUsablePage,
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
  const corpus =
    "A prefeitura vacina 1.200 pessoas por dia em 15 Cais, das 8h às 17h, até 30 de outubro.";

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
    expect(findForbiddenExpressions("Vale destacar que a obra atrasou.")).toEqual([
      "vale destacar",
    ]);
  });

  it("encontra anunciantes da lista", () => {
    expect(mentionedAdvertisers("Promoção no Supermercado Bretas", "Bretas, Hot Park")).toEqual([
      "Bretas",
    ]);
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
    expect(slugify("Vacinação nos Cais: horário ampliado!")).toBe(
      "vacinacao-nos-cais-horario-ampliado",
    );
  });

  it("conta palavras ignorando markdown", () => {
    expect(wordCount("## Título\n\n- item um\n- item [dois](x)")).toBe(5);
  });
});

describe("capa: foto da fonte e prompt realista", () => {
  const page = "https://www.goiania.go.gov.br/noticia/vacinacao";

  it("extrai og:image em qualquer ordem de atributos e resolve URL relativa", () => {
    expect(
      extractOgImage('<meta property="og:image" content="https://x.gov.br/f.jpg">', page),
    ).toBe("https://x.gov.br/f.jpg");
    expect(extractOgImage('<meta content="/wp/f.jpg" property="og:image" />', page)).toBe(
      "https://www.goiania.go.gov.br/wp/f.jpg",
    );
    expect(
      extractOgImage('<meta name="twitter:image" content="https://x.gov.br/t.jpg">', page),
    ).toBe("https://x.gov.br/t.jpg");
  });

  it("aceita foto em pasta chamada default (Agência Brasil)", () => {
    const ab =
      "https://imagens.ebc.com.br/x=/1600x800/https://agenciabrasil.ebc.com.br/sites/default/files/thumbnails/image/2026/10/05/carol_gil.jpg?itok=A";
    expect(extractOgImage(`<meta property="og:image" content="${ab}" />`, page)).toBe(ab);
  });

  it("recusa logotipo e página sem imagem", () => {
    expect(
      extractOgImage(
        '<meta property="og:image" content="https://x.gov.br/logo-prefeitura.png">',
        page,
      ),
    ).toBeNull();
    expect(extractOgImage("<html><p>sem imagem</p></html>", page)).toBeNull();
  });

  it("só usa foto de fonte oficial ou da Agência Brasil", () => {
    expect(canUseSourcePhoto("https://www.goiania.go.gov.br/n", "oficial")).toBe(true);
    expect(canUseSourcePhoto("https://agenciabrasil.ebc.com.br/geral/noticia/x", "veiculo")).toBe(
      true,
    );
    expect(canUseSourcePhoto("https://g1.globo.com/go/goias/noticia/x.ghtml", "veiculo")).toBe(
      false,
    );
  });

  it("o prompt pede fotografia realista e proíbe ilustração e rostos", () => {
    const p = buildPhotoPrompt("posto de saúde em Goiânia pela manhã");
    expect(p).toContain("Photorealistic");
    expect(p).toContain("posto de saúde em Goiânia pela manhã");
    expect(p).toContain("Not an illustration");
    expect(p).toContain("No identifiable faces");
  });

  it("extrai o texto dos parágrafos do <article>", () => {
    const html =
      "<script>x()</script><article><p>Primeiro parágrafo com conteúdo suficiente para contar como texto.</p><p>curto</p></article>";
    expect(articleTextFromHtml(html)).toBe(
      "Primeiro parágrafo com conteúdo suficiente para contar como texto.",
    );
  });
});

describe("páginas das fontes (casos reais)", () => {
  const big = "<html>" + "x".repeat(25_000) + "<article><p>Matéria</p></article></html>";

  it("aceita o 404 falso da Prefeitura de Goiânia quando a matéria está na página", () => {
    const u = "https://www.goiania.go.gov.br/agora/praca-tamandare";
    expect(isUsablePage(404, big, u, u)).toBe(true);
    expect(isUsablePage(404, "<html>Não encontrado</html>", u, u)).toBe(false);
  });

  it("recusa matéria redirecionada para o comunicado eleitoral do Governo de Goiás", () => {
    expect(
      isUsablePage(
        200,
        big,
        "https://goias.gov.br/basileu-franca-apresenta/",
        "https://goias.gov.br/comunicado/",
      ),
    ).toBe(false);
  });

  it("tolera barra final e www no redirecionamento", () => {
    expect(
      isUsablePage(200, "", "https://www.dm.com.br/noticia/x", "https://dm.com.br/noticia/x/"),
    ).toBe(true);
  });

  it("usa a foto de destaque do WordPress e recusa a imagem padrão do tema", () => {
    const page = "https://www.goiania.go.gov.br/agora/x";
    const wp =
      '<img width="1280" height="720" src="https://www.goiania.go.gov.br/agora/wp-content/uploads/2026/10/Praca-Tamandare.jpeg" class="attachment-post-thumbnail size-post-thumbnail wp-post-image" alt="">';
    expect(extractOgImage(wp, page)).toBe(
      "https://www.goiania.go.gov.br/agora/wp-content/uploads/2026/10/Praca-Tamandare.jpeg",
    );
    const theme =
      '<meta property="og:image" content="https://www.bombeiros.go.gov.br/wp-content/themes/bombeiros/img/opengraph_image.jpg"/>';
    expect(extractOgImage(theme, page)).toBeNull();
    expect(extractOgImage(theme + wp, page)).toContain("Praca-Tamandare.jpeg");
  });
});
