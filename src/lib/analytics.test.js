import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ init: vi.fn(), track: vi.fn(), setUserId: vi.fn(), identify: vi.fn(), reset: vi.fn() }))
vi.mock("@amplitude/analytics-browser", () => ({ ...sdk, Identify: class { set() {} setOnce() {} } }))
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); vi.resetModules() })

async function load(config = {}) {
  vi.stubEnv("VITE_ANALYTICS_ENABLED", "true")
  vi.stubEnv("VITE_ANALYTICS_DEBUG", "false")
  vi.stubEnv("VITE_AMPLITUDE_API_KEY", "test-public-key")
  vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TEST12345")
  vi.stubEnv("VITE_GTM_CONTAINER_ID", "")
  for (const [key, value] of Object.entries(config)) vi.stubEnv(key, value)
  const scripts = []
  vi.stubGlobal("document", { createElement: () => ({}), head: { appendChild: (element) => scripts.push(element.src) } })
  vi.stubGlobal("window", { location: { origin: "https://example.com", pathname: "/auth/callback", href: "https://example.com/auth/callback?code=private-oauth-code#access_token=private" } })
  return { ...(await import("./analytics")), scripts }
}
describe("analytics provider routing", () => {
  it("uses only GTM when both Google IDs exist and clears stale parameter objects", async () => {
    const { analytics, scripts } = await load({ VITE_GTM_CONTAINER_ID: "GTM-TEST123" })
    analytics.setUser({ id: "internal-user" })
    analytics.track("signup_completed", { auth_method: "google" })
    analytics.track("page_viewed", { page_name: "home", is_logged_in: true })
    expect(scripts).toEqual(["https://www.googletagmanager.com/gtm.js?id=GTM-TEST123"])
    const events = window.dataLayer.filter((entry) => entry.event === "inni_event")
    expect(events.map((entry) => entry.inni_event_name)).toEqual(["signup_completed", "page_view"])
    expect(window.dataLayer.filter((entry) => entry.inni_parameters === null)).toHaveLength(2)
    const commands = window.dataLayer.filter((entry) => entry[0] === "event").map((entry) => Array.from(entry))
    expect(commands.map((entry) => entry[1])).toEqual(["signup_completed", "page_view"])
    expect(commands.every((entry) => entry[2].send_to === "G-TEST12345")).toBe(true)
    expect(JSON.stringify(window.dataLayer)).not.toMatch(/private-oauth-code|access_token/)
  })
  it("disables automatic pageviews and maps explicit page events in direct GA4 mode", async () => {
    const { analytics, scripts } = await load()
    analytics.track("page_viewed", { page_name: "landing", is_logged_in: false })
    expect(scripts).toEqual(["https://www.googletagmanager.com/gtag/js?id=G-TEST12345"])
    const commands = window.dataLayer.map((args) => Array.from(args))
    expect(commands[1][2]).toMatchObject({ send_page_view: false, page_location: "https://example.com/app" })
    expect(commands[2][1]).toBe("page_view")
    expect(commands[2][2].page_location).toBe("https://example.com/landing")
    expect(Object.keys(commands[2][2]).length).toBeLessThanOrEqual(25)
    expect(JSON.stringify(commands)).not.toMatch(/private-oauth-code|access_token/)
    expect(sdk.init).toHaveBeenCalledWith("test-public-key", expect.objectContaining({ autocapture: false, defaultTracking: false, fetchRemoteConfig: false }))
  })
  it("does not initialize providers or create tags while disabled", async () => {
    const { analytics, scripts } = await load({ VITE_ANALYTICS_ENABLED: "false" })
    analytics.setUser({ id: "user-1" }); analytics.track("signup_completed")
    expect(scripts).toEqual([]); expect(sdk.init).not.toHaveBeenCalled()
  })
  it("keeps provider exceptions out of successful business operations", async () => {
    const { analytics } = await load()
    sdk.track.mockImplementationOnce(() => { throw new Error("blocked SDK") })
    expect(() => analytics.track("want_created", { want_id: "item-1" })).not.toThrow()
    expect(window.dataLayer).toBeDefined()
  })
})
