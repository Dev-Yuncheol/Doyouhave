import { describe, expect, it, vi } from "vitest"
import { createAnalytics, pageName, readCampaign } from "./analytics-core"

function storage() {
  const data = new Map()
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) }
}
function setup(options = {}) {
  const send = vi.fn(), identify = vi.fn(), reset = vi.fn(), inspect = vi.fn()
  const config = { enabled: true, send, identify, reset, inspect, local: storage(), session: storage(),
    uuid: () => "event-test-id", href: () => "https://example.com/?utm_source=kakao&utm_medium=messenger", ...options }
  return { ...config, client: createAnalytics(config) }
}
describe("analytics contract", () => {
  it("is inert without opt-in configuration", () => {
    const { client, send, identify, inspect } = setup({ enabled: false })
    client.setUser({ id: "user-1" }); client.track("page_viewed")
    expect(send).not.toHaveBeenCalled(); expect(identify).not.toHaveBeenCalled(); expect(inspect).not.toHaveBeenCalled()
  })
  it("supports local QA without sending to a provider", () => {
    const { client, send, inspect } = setup({ enabled: false, debug: true })
    client.track("page_viewed", { page_name: "landing" })
    expect(send).not.toHaveBeenCalled(); expect(inspect).toHaveBeenCalledTimes(1)
  })
  it("excludes unplanned properties, free text, OAuth codes and invalid UTM values", () => {
    const { client, send } = setup({ href: () => "https://example.com/auth/callback?code=secret&utm_source=user%40example.com#access_token=secret" })
    client.track("want_created", { want_id: "want-1", category: "top", email: "private", token: "secret", title: "personal" })
    const output = JSON.stringify(send.mock.calls)
    expect(output).not.toMatch(/private|secret|personal|access_token|user%40/)
    expect(send.mock.calls[0][0].properties.utm_source).toBe("direct")
    client.track("unknown", { anything: true })
    expect(send).toHaveBeenCalledTimes(1)
  })
  it("preserves first touch and current campaign through OAuth, then updates explicit campaigns", () => {
    let url = "https://example.com/?utm_source=kakao&utm_medium=messenger"
    const { client, send } = setup({ href: () => url })
    client.track("page_viewed")
    url = "https://example.com/auth/callback?code=secret"
    client.setUser({ id: "user-1" }); client.track("signup_completed", { auth_method: "google" })
    expect(send.mock.calls[1][0].properties.utm_source).toBe("kakao")
    url = "https://example.com/?utm_source=instagram&utm_medium=social"
    client.track("page_viewed")
    expect(send.mock.calls[2][0].properties).toMatchObject({ utm_source: "instagram", first_utm_source: "kakao" })
  })
  it("expires visit attribution after 30 minutes of inactivity but retains first touch", () => {
    let timestamp = 1, url = "https://example.com/?utm_source=kakao"
    const { client, send } = setup({ now: () => timestamp, href: () => url })
    client.track("page_viewed")
    timestamp += 31 * 60 * 1000; url = "https://example.com/owns"
    client.track("page_viewed")
    expect(send.mock.calls[1][0].properties).toMatchObject({ utm_source: "direct", first_utm_source: "kakao" })
  })
  it("deduplicates saved items across repeated callbacks and page reloads", () => {
    const fixture = setup()
    fixture.client.setUser({ id: "user-1" })
    fixture.client.track("want_created", { want_id: "want-1" }, "want-1", "user-1")
    fixture.client.track("want_created", { want_id: "want-1" }, "want-1", "user-1")
    const reloaded = createAnalytics(fixture)
    reloaded.setUser({ id: "user-1" })
    reloaded.track("want_created", { want_id: "want-1" }, "want-1", "user-1")
    expect(fixture.send).toHaveBeenCalledTimes(1)
  })
  it("separates accounts and drops late results from a logged-out account", () => {
    const { client, send, reset } = setup()
    client.setUser({ id: "user-1" }); client.track("login_completed")
    client.setUser(null); client.setUser({ id: "user-2" })
    client.track("want_created", { want_id: "old-want" }, "old-want", "user-1")
    client.track("login_completed")
    expect(reset).toHaveBeenCalledTimes(1)
    expect(send.mock.calls.map(([event]) => event.userId)).toEqual(["user-1", "user-2"])
  })
  it("never throws provider or storage failures into a business action", () => {
    const broken = () => { throw new Error("blocked") }
    const { client } = setup({ send: broken, identify: broken, reset: broken, local: { getItem: broken, setItem: broken }, session: { getItem: broken, setItem: broken } })
    expect(() => { client.setUser({ id: "user-1" }); client.track("want_created"); client.setUser(null) }).not.toThrow()
  })
  it("maps only known pages, without exposing item IDs or auth callbacks", () => {
    expect(pageName("/wants/private-id", true)).toBe("want_detail")
    expect(pageName("/auth/callback", false)).toBeNull()
    expect(pageName("/login", true)).toBeNull()
    expect(pageName("/", false)).toBe("landing")
    expect(pageName("/", true)).toBe("home")
    expect(readCampaign("https://example.com/?utm_source=kakao&utm_content=card_a&email=secret")).toEqual({ utm_source: "kakao", utm_content: "card_a" })
  })
})
