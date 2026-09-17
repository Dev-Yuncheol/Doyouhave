import request from "supertest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createApp } from "./app.js"
import { AppError } from "./lib/app-error.js"
import { verifyAccessToken } from "./lib/jwt.js"

const secret = "google-test-secret-at-least-32-characters"
const identity = { id: "11111111-1111-4111-8111-111111111111", email: "user@example.com" }
const user = { id: "22222222-2222-4222-8222-222222222222", email: identity.email,
  passwordHash: "hash", supabaseUserId: null, createdAt: new Date(), updatedAt: new Date() }

describe("Google authentication bridge", () => {
  let database, verifier, passwordService, app
  beforeEach(() => {
    database = { user: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() } }
    verifier = vi.fn().mockResolvedValue(identity)
    passwordService = { compare: vi.fn().mockResolvedValue(true) }
    app = createApp({ database, jwtSecret: secret, googleTokenVerifier: verifier, passwordService })
  })
  const post = (app, body = {}) => request(app).post("/api/auth/google").send({ accessToken: "verified-token", ...body })

  it("creates a Google-only account and issues the existing app JWT", async () => {
    database.user.findUnique.mockResolvedValue(null)
    database.user.create.mockResolvedValue(user)
    const result = await post(app)
    expect(result.status).toBe(200)
    expect(verifyAccessToken(result.body.token, secret).sub).toBe(user.id)
    expect(database.user.create.mock.calls[0][0].data).toEqual({ email: identity.email, supabaseUserId: identity.id })
    expect(result.body.user).not.toHaveProperty("passwordHash")
    expect(result.body.user).not.toHaveProperty("supabaseUserId")
  })
  it("finds an already linked user by stable identity even after email changes", async () => {
    database.user.findUnique.mockResolvedValue({ ...user, email: "old@example.com" })
    expect((await post(app)).status).toBe(200)
    expect(database.user.findUnique).toHaveBeenCalledWith({ where: { supabaseUserId: identity.id } })
    expect(database.user.create).not.toHaveBeenCalled()
  })
  it("does not automatically merge an existing unverified password account", async () => {
    database.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(user)
    const result = await post(app)
    expect(result.status).toBe(409)
    expect(result.body.error.code).toBe("GOOGLE_LINK_REQUIRED")
    expect(database.user.updateMany).not.toHaveBeenCalled()
  })
  it("links only after password verification and retains the existing user ID", async () => {
    database.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(user).mockResolvedValueOnce(user)
    database.user.updateMany.mockResolvedValue({ count: 1 })
    const result = await post(app, { password: "correct-password" })
    expect(result.status).toBe(200)
    expect(result.body.user.id).toBe(user.id)
    expect(passwordService.compare).toHaveBeenCalledWith("correct-password", "hash")
    expect(database.user.updateMany).toHaveBeenCalledWith({ where: { id: user.id, supabaseUserId: null }, data: { supabaseUserId: identity.id } })
  })
  it("rejects wrong linking passwords", async () => {
    database.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(user)
    passwordService.compare.mockResolvedValue(false)
    expect((await post(app, { password: "wrong" })).status).toBe(401)
    expect(database.user.updateMany).not.toHaveBeenCalled()
  })
  it("does not replace another linked identity", async () => {
    database.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(user).mockResolvedValueOnce(null)
    database.user.updateMany.mockResolvedValue({ count: 0 })
    expect((await post(app, { password: "correct" })).body.error.code).toBe("GOOGLE_LINK_CONFLICT")
  })
  it("rejects invalid tokens before querying the database", async () => {
    verifier.mockRejectedValue(new AppError(401, "GOOGLE_AUTH_FAILED", "invalid"))
    expect((await post(app)).status).toBe(401)
    expect(database.user.findUnique).not.toHaveBeenCalled()
  })
  it("rejects caller-supplied profile/identity fields", async () => {
    expect((await post(app, { email: "victim@example.com" })).status).toBe(400)
    expect(verifier).not.toHaveBeenCalled()
  })
  it("handles concurrent first Google logins", async () => {
    database.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(user)
    database.user.create.mockRejectedValue({ code: "P2002" })
    expect((await post(app)).status).toBe(200)
  })
  it("requires linking when a concurrent signup takes the email", async () => {
    database.user.findUnique.mockResolvedValue(null)
    database.user.create.mockRejectedValue({ code: "P2002" })
    expect((await post(app)).body.error.code).toBe("GOOGLE_LINK_REQUIRED")
  })
  it("rejects password login for Google-only accounts without calling bcrypt", async () => {
    database.user.findUnique.mockResolvedValue({ ...user, passwordHash: null })
    const result = await request(app).post("/api/auth/login").send({ email: user.email, password: "anything" })
    expect(result.status).toBe(401)
    expect(passwordService.compare).not.toHaveBeenCalled()
  })
})
