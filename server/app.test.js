import request from "supertest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createApp } from "./app.js"
import { signAccessToken } from "./lib/jwt.js"

const JWT_SECRET = "test-secret-that-is-at-least-32-characters-long"
const now = new Date("2026-08-31T00:00:00.000Z")

function user(overrides = {}) {
  return {
    id: "3d8ec7d2-c261-4816-9562-0fd28b0faf0f",
    email: "user@example.com",
    passwordHash: "unused",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createDatabase() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  }
}

describe("authentication API", () => {
  let database
  let app
  let passwordService

  beforeEach(() => {
    database = createDatabase()
    passwordService = {
      hash: vi.fn(async (password) => `hashed:${password}`),
      compare: vi.fn(async (password, hash) => hash === `hashed:${password}`),
    }
    app = createApp({
      database,
      jwtSecret: JWT_SECRET,
      bcryptRounds: 4,
      passwordService,
    })
  })

  it("creates a user with a normalized email and hashed password", async () => {
    database.user.findUnique.mockResolvedValue(null)
    database.user.create.mockImplementation(({ data }) =>
      Promise.resolve(user({ email: data.email })),
    )

    const response = await request(app).post("/api/auth/signup").send({
      email: "  USER@Example.com ",
      password: "password123",
    })

    expect(response.status).toBe(201)
    expect(response.body.user.email).toBe("user@example.com")
    expect(response.body.token).toEqual(expect.any(String))

    const passwordHash = database.user.create.mock.calls[0][0].data.passwordHash
    expect(passwordHash).not.toBe("password123")
    expect(passwordHash).toBe("hashed:password123")
  })

  it("rejects an already registered email", async () => {
    database.user.findUnique.mockResolvedValue(user())

    const response = await request(app).post("/api/auth/signup").send({
      email: "user@example.com",
      password: "password123",
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe("EMAIL_CONFLICT")
    expect(database.user.create).not.toHaveBeenCalled()
  })

  it("handles a unique-email race as a conflict", async () => {
    database.user.findUnique.mockResolvedValue(null)
    database.user.create.mockRejectedValue({ code: "P2002" })

    const response = await request(app).post("/api/auth/signup").send({
      email: "user@example.com",
      password: "password123",
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe("EMAIL_CONFLICT")
  })

  it("returns validation fields for an invalid signup", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      email: "not-an-email",
      password: "short",
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe("VALIDATION_ERROR")
    expect(response.body.error.fields).toHaveProperty("email")
    expect(response.body.error.fields).toHaveProperty("password")
  })

  it("rejects a login for an unknown user", async () => {
    database.user.findUnique.mockResolvedValue(null)

    const response = await request(app).post("/api/auth/login").send({
      email: "missing@example.com",
      password: "password123",
    })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS")
  })

  it("logs in with valid credentials", async () => {
    const passwordHash = "hashed:password123"
    database.user.findUnique.mockResolvedValue(user({ passwordHash }))

    const response = await request(app).post("/api/auth/login").send({
      email: "USER@example.com",
      password: "password123",
    })

    expect(response.status).toBe(200)
    expect(response.body.user.email).toBe("user@example.com")
    expect(response.body.token).toEqual(expect.any(String))
  })

  it("rejects an incorrect password", async () => {
    const passwordHash = "hashed:correct-password"
    database.user.findUnique.mockResolvedValue(user({ passwordHash }))

    const response = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: "wrong-password",
    })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS")
  })

  it("requires a bearer token for the current user", async () => {
    const response = await request(app).get("/api/auth/me")

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe("UNAUTHORIZED")
  })

  it("rejects a malformed bearer token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-jwt")

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe("UNAUTHORIZED")
    expect(database.user.findUnique).not.toHaveBeenCalled()
  })

  it("restores the current user from a valid token", async () => {
    const currentUser = user()
    database.user.findUnique.mockResolvedValue(currentUser)
    const token = signAccessToken(currentUser.id, JWT_SECRET)

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.user).toEqual({
      id: currentUser.id,
      email: currentUser.email,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })
  })
})
