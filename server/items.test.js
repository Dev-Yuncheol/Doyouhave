import request from "supertest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createApp } from "./app.js"
import { signAccessToken } from "./lib/jwt.js"

const JWT_SECRET = "test-secret-that-is-at-least-32-characters-long"
const USER_ID = "3d8ec7d2-c261-4816-9562-0fd28b0faf0f"
const ITEM_ID = "eb853b7a-8068-42f9-a1c0-568ff2f27931"
const OWN_ID = "b7fdafef-8399-459f-95f6-65e227978ed9"
const now = new Date("2026-08-31T00:00:00.000Z")

function currentUser() {
  return { id: USER_ID, email: "user@example.com", createdAt: now, updatedAt: now }
}

function want(overrides = {}) {
  return {
    id: ITEM_ID,
    title: "검은 재킷",
    url: null,
    category: "outer",
    categoryDetail: null,
    color: "black",
    colorDetail: null,
    price: 129000,
    note: null,
    status: "PENDING",
    userId: USER_ID,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function own(overrides = {}) {
  return {
    id: OWN_ID,
    title: "검은 재킷",
    category: "outer",
    categoryDetail: null,
    color: "black",
    colorDetail: null,
    source: "MANUAL",
    fromWantId: null,
    userId: USER_ID,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createDatabase() {
  const database = {
    user: { findUnique: vi.fn(async () => currentUser()), create: vi.fn() },
    want: {
      create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(),
      updateMany: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), deleteMany: vi.fn(),
    },
    own: {
      create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(),
      findUnique: vi.fn(), deleteMany: vi.fn(),
    },
  }
  database.$transaction = vi.fn(async (callback) => callback(database))
  return database
}

describe("wardrobe API", () => {
  let app
  let database
  let authorization

  beforeEach(() => {
    database = createDatabase()
    app = createApp({ database, jwtSecret: JWT_SECRET })
    authorization = `Bearer ${signAccessToken(USER_ID, JWT_SECRET)}`
  })

  it("exposes health and the Swagger OpenAPI document without authentication", async () => {
    const health = await request(app).get("/api/health")
    const specification = await request(app).get("/api/openapi.json")

    expect(health.status).toBe(200)
    expect(health.body).toEqual({ status: "ok" })
    expect(specification.status).toBe(200)
    expect(specification.body.info.title).toBe("있니 API")
    expect(specification.body.paths).toHaveProperty("/api/wants/{id}/buy")
  })

  it("protects wardrobe resources with bearer authentication", async () => {
    const response = await request(app).get("/api/wants")

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe("UNAUTHORIZED")
    expect(database.want.findMany).not.toHaveBeenCalled()
  })

  it("creates a normalized want and lists only the user's filtered wants", async () => {
    database.want.create.mockImplementation(({ data }) => Promise.resolve(want(data)))
    database.want.findMany.mockResolvedValue([want()])

    const created = await request(app)
      .post("/api/wants")
      .set("Authorization", authorization)
      .send({
        title: "  검은 재킷  ", category: "outer", categoryDetail: "무시됨",
        color: "black", colorDetail: "무시됨", price: 129000,
      })
    const listed = await request(app)
      .get("/api/wants?status=pending&category=outer")
      .set("Authorization", authorization)

    expect(created.status).toBe(201)
    expect(created.body.want.status).toBe("pending")
    expect(database.want.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "검은 재킷", categoryDetail: null, colorDetail: null, userId: USER_ID,
      }),
    })
    expect(listed.status).toBe(200)
    expect(database.want.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: "PENDING", category: "outer" },
      orderBy: { createdAt: "desc" },
    })
  })

  it("ignores Vercel's internal path query while keeping filters strict", async () => {
    database.want.findMany.mockResolvedValue([want()])

    const response = await request(app)
      .get("/api/wants?path=wants&status=pending")
      .set("Authorization", authorization)

    expect(response.status).toBe(200)
    expect(database.want.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    })
  })

  it("validates conditional detail fields and rejects unknown input fields", async () => {
    const missingDetail = await request(app)
      .post("/api/owns")
      .set("Authorization", authorization)
      .send({ title: "특이한 옷", category: "etc", color: "other" })
    const unknownField = await request(app)
      .post("/api/owns")
      .set("Authorization", authorization)
      .send({ title: "셔츠", category: "top", color: "white", source: "manual" })

    expect(missingDetail.status).toBe(400)
    expect(missingDetail.body.error.fields).toMatchObject({
      categoryDetail: ["기타 종류를 입력해 주세요."],
      colorDetail: ["기타 색상을 입력해 주세요."],
    })
    expect(unknownField.status).toBe(400)
    expect(database.own.create).not.toHaveBeenCalled()
  })

  it("creates, filters, updates, and deletes a manual own for the current user", async () => {
    database.own.create.mockImplementation(({ data }) => Promise.resolve(own(data)))
    database.own.findMany.mockResolvedValue([own()])
    database.own.findFirst.mockResolvedValue(own())
    database.own.update.mockImplementation(({ data }) => Promise.resolve(own(data)))
    database.own.deleteMany.mockResolvedValue({ count: 1 })

    const created = await request(app)
      .post("/api/owns")
      .set("Authorization", authorization)
      .send({ title: "검은 재킷", category: "outer", color: "black" })
    const listed = await request(app)
      .get("/api/owns?category=outer&color=black")
      .set("Authorization", authorization)
    const updated = await request(app)
      .patch(`/api/owns/${OWN_ID}`)
      .set("Authorization", authorization)
      .send({ title: "검정 재킷" })
    const deleted = await request(app)
      .delete(`/api/owns/${OWN_ID}`)
      .set("Authorization", authorization)

    expect(created.status).toBe(201)
    expect(created.body.own.source).toBe("manual")
    expect(listed.status).toBe(200)
    expect(database.own.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, category: "outer", color: "black" },
      orderBy: { createdAt: "desc" },
    })
    expect(updated.status).toBe(200)
    expect(updated.body.own.title).toBe("검정 재킷")
    expect(deleted.status).toBe(204)
    expect(database.own.deleteMany).toHaveBeenCalledWith({ where: { id: OWN_ID, userId: USER_ID } })
  })

  it("returns not found without mutating another user's resource", async () => {
    database.want.findFirst.mockResolvedValue(null)
    database.want.deleteMany.mockResolvedValue({ count: 0 })

    const update = await request(app)
      .patch(`/api/wants/${ITEM_ID}`)
      .set("Authorization", authorization)
      .send({ title: "수정" })
    const deletion = await request(app)
      .delete(`/api/wants/${ITEM_ID}`)
      .set("Authorization", authorization)

    expect(update.status).toBe(404)
    expect(deletion.status).toBe(404)
    expect(database.want.update).not.toHaveBeenCalled()
  })

  it("atomically marks a pending want bought and creates an owned item", async () => {
    database.want.updateMany.mockResolvedValue({ count: 1 })
    database.want.findUniqueOrThrow.mockResolvedValue(want({ status: "BOUGHT" }))
    database.own.create.mockResolvedValue(own({ source: "BOUGHT", fromWantId: ITEM_ID }))

    const response = await request(app)
      .post(`/api/wants/${ITEM_ID}/buy`)
      .set("Authorization", authorization)

    expect(response.status).toBe(200)
    expect(response.body.want.status).toBe("bought")
    expect(response.body.own).toMatchObject({ source: "bought", fromWantId: ITEM_ID })
    expect(database.$transaction).toHaveBeenCalledOnce()
    expect(database.own.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: USER_ID, fromWantId: ITEM_ID, source: "BOUGHT" }),
    })
  })
})
