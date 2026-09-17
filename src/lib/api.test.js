import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchCollection } from "./api"

afterEach(() => vi.unstubAllGlobals())

describe("paginated wardrobe loading", () => {
  it("follows pages and preserves items beyond the first page", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ wants: [{ id: "one" }], nextCursor: "one" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ wants: [{ id: "two" }], nextCursor: null })))
    vi.stubGlobal("fetch", fetch)
    const signal = new AbortController().signal
    expect(await fetchCollection("/wants", "wants", { signal })).toEqual([{ id: "one" }, { id: "two" }])
    expect(fetch.mock.calls[1][0]).toBe("/api/wants?limit=100&cursor=one")
    expect(fetch.mock.calls[1][1].signal).toBe(signal)
  })

  it("does not silently return a partial collection when a later page fails", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ owns: [{ id: "one" }], nextCursor: "one" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "목록 변경" } }), { status: 400 })))
    await expect(fetchCollection("/owns", "owns")).rejects.toThrow("목록 변경")
  })

  it("stops malformed repeated cursors instead of looping indefinitely", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ wants: [{ id: "one" }], nextCursor: "one" }))))
    await expect(fetchCollection("/wants", "wants")).rejects.toThrow("다시 시도")
  })
})
