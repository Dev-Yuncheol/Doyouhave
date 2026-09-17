import { afterEach, beforeEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(), exchangeCodeForSession: vi.fn(), signOut: vi.fn(),
}))
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: mocks }) }))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
  vi.stubGlobal("window", {
    location: { origin: "https://inni.example", search: "?code=one-time-code" },
    history: { replaceState: vi.fn() }, sessionStorage: {},
  })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it("redirects Google OAuth to this site's callback", async () => {
  mocks.signInWithOAuth.mockResolvedValue({ error: null })
  const { startGoogleLogin } = await import("./google-auth.js")
  await startGoogleLogin()
  expect(mocks.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: "https://inni.example/auth/callback" } })
})
it("exchanges a one-time code exactly once across duplicate effects and clears the URL", async () => {
  mocks.exchangeCodeForSession.mockResolvedValue({ data: { session: { access_token: "token" } }, error: null })
  const { exchangeGoogleCallback } = await import("./google-auth.js")
  expect(await Promise.all([exchangeGoogleCallback(), exchangeGoogleCallback()])).toEqual(["token", "token"])
  expect(mocks.exchangeCodeForSession).toHaveBeenCalledTimes(1)
  expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "/auth/callback")
})
it("rejects a cancelled callback without exchanging any code", async () => {
  window.location.search = "?error=access_denied&error_description=untrusted"
  const { exchangeGoogleCallback } = await import("./google-auth.js")
  await expect(exchangeGoogleCallback()).rejects.toThrow("취소")
  expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled()
})
it("reports expired codes and permits a new login attempt", async () => {
  mocks.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: { message: "expired" } })
    .mockResolvedValueOnce({ data: { session: { access_token: "fresh-token" } }, error: null })
  mocks.signInWithOAuth.mockResolvedValue({ error: null })
  const { exchangeGoogleCallback, startGoogleLogin } = await import("./google-auth.js")
  await expect(exchangeGoogleCallback()).rejects.toThrow("만료")
  await startGoogleLogin()
  expect(await exchangeGoogleCallback()).toBe("fresh-token")
})
