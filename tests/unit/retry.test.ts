import { describe, it, expect, vi } from "vitest";
import { withRetry, fetchWithRetry } from "../../supabase/functions/_shared/retry";

describe("withRetry", () => {
  it("retorna imediatamente quando função sucede", async () => {
    const fn = vi.fn(async () => "ok");
    await expect(withRetry(fn, { baseDelayMs: 1, maxDelayMs: 5 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("tenta novamente até sucesso", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw new Error("transient");
      return "ok";
    });
    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 }),
    ).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("propaga erro após esgotar tentativas", async () => {
    const fn = vi.fn(async () => {
      throw new Error("always fails");
    });
    await expect(
      withRetry(fn, { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 5 }),
    ).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respeita retryOn=false (short-circuit)", async () => {
    const fn = vi.fn(async () => {
      throw new Error("4xx");
    });
    const retryOn = vi.fn(() => false);
    await expect(
      withRetry(fn, { maxAttempts: 3, retryOn, baseDelayMs: 1, maxDelayMs: 5 }),
    ).rejects.toThrow("4xx");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("fetchWithRetry", () => {
  it("retorna 200 sem retry", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const res = await fetchWithRetry("https://example.com", undefined, {
      baseDelayMs: 1,
      maxDelayMs: 5,
    });
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it("retenta em 5xx", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("fail", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const res = await fetchWithRetry("https://example.com", undefined, {
      maxAttempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 5,
    });
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it("retenta em 429 e respeita Retry-After", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("rate limit", { status: 429, headers: { "retry-after": "0" } }),
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const res = await fetchWithRetry("https://example.com", undefined, {
      maxAttempts: 2,
      baseDelayMs: 1,
      maxDelayMs: 5,
    });
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it("para depois de maxAttempts e devolve o último response 5xx", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("down", { status: 500 }));
    const res = await fetchWithRetry("https://example.com", undefined, {
      maxAttempts: 2,
      baseDelayMs: 1,
      maxDelayMs: 5,
    });
    expect(res.status).toBe(500);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });
});
