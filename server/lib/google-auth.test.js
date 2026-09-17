import { afterEach, beforeEach, expect, it, vi } from "vitest"
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser } }) }))
import { verifyGoogleAccessToken } from "./google-auth.js"
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
})
afterEach(() => vi.unstubAllEnvs())
const valid = { id: "user-id", email: "USER@Example.com", email_confirmed_at: "2026-09-17", identities: [{ provider: "google" }] }
it("validates tokens with the Auth server and normalizes the trusted email", async () => {
  getUser.mockResolvedValue({ data: { user: valid }, error: null })
  expect(await verifyGoogleAccessToken("token")).toEqual({ id: valid.id, email: "user@example.com" })
  expect(getUser).toHaveBeenCalledWith("token")
})
it.each([
  { ...valid, email_confirmed_at: null },
  { ...valid, identities: [{ provider: "email" }], user_metadata: { provider: "google" } },
  { ...valid, is_anonymous: true },
  { ...valid, email: null },
])("rejects unverified/non-Google identities", async (user) => {
  getUser.mockResolvedValue({ data: { user }, error: null })
  await expect(verifyGoogleAccessToken("token")).rejects.toMatchObject({ status: 401 })
})
it("rejects expired tokens", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } })
  await expect(verifyGoogleAccessToken("token")).rejects.toMatchObject({ status: 401 })
})
it("reports a provider outage as retryable", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } })
  await expect(verifyGoogleAccessToken("token")).rejects.toMatchObject({ status: 503 })
})
