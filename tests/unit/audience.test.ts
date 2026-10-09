import { describe, expect, it } from "vitest";
import { externalReferrer, isPublicPage, audienceDateLabel } from "@/lib/audience";

describe("audience privacy", () => {
  it("keeps only the external referring hostname", () => {
    expect(externalReferrer("https://www.google.com/search?q=private", "https://jp.example")).toBe("google.com");
  });
  it("does not classify internal navigation as acquisition", () => {
    expect(externalReferrer("https://jp.example/post?email=private", "https://jp.example")).toBeNull();
  });
  it("excludes administration and non-content endpoints", () => {
    for (const path of ["/admin", "/admin/audiencia", "/api/public/event", "/mcp", "/feed.xml"]) {
      expect(isPublicPage(path)).toBe(false);
    }
    expect(isPublicPage("/goiania/noticia-local")).toBe(true);
  });
  it("labels calendar days without shifting their timezone", () => {
    expect(audienceDateLabel("2026-10-09")).toBe("09/10");
  });
});