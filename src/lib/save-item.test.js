import { describe, expect, it, vi } from "vitest"
import { createItemSaver } from "./save-item"

describe("save retries", () => {
  it("reuses one key after an uncertain failure, then starts a fresh intentional save", async () => {
    const request = vi.fn().mockRejectedValueOnce({ status: 0 }).mockResolvedValue({ want: { id: "saved" } })
    const key = vi.fn().mockReturnValueOnce("first").mockReturnValueOnce("second")
    const save = createItemSaver(request, key)
    const body = { title: "옷" }
    await expect(save("user", "/wants", body)).rejects.toEqual({ status: 0 })
    await save("user", "/wants", body)
    await save("user", "/wants", body)
    expect(request.mock.calls.map(([, options]) => options.headers["Idempotency-Key"])).toEqual(["first", "first", "second"])
  })

  it("shares concurrent clicks but never shares a request across accounts or collections", async () => {
    const request = vi.fn().mockResolvedValue({})
    const key = vi.fn().mockReturnValueOnce("a").mockReturnValueOnce("b").mockReturnValueOnce("c")
    const save = createItemSaver(request, key)
    const first = save("one", "/wants", { title: "옷" })
    expect(save("one", "/wants", { title: "옷" })).toBe(first)
    await Promise.all([first, save("two", "/wants", { title: "옷" }), save("one", "/owns", { title: "옷" })])
    expect(request).toHaveBeenCalledTimes(3)
  })
})
