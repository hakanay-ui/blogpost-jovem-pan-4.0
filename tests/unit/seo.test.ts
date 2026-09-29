import { describe, it, expect } from "vitest";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

describe("xmlEscape (SEO)", () => {
  it("escapa ampersand e tags", () => {
    expect(xmlEscape("<script>&")).toBe("&lt;script&gt;&amp;");
  });

  it("escapa aspas", () => {
    expect(xmlEscape(`"quote" 'apos'`)).toBe("&quot;quote&quot; &apos;apos&apos;");
  });

  it("não mexe em string sem caracteres especiais", () => {
    expect(xmlEscape("hello world 123")).toBe("hello world 123");
  });
});
