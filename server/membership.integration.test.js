import { readFile, readdir } from "node:fs/promises"
import { once } from "node:events"
import { PGlite } from "@electric-sql/pglite"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"
import { PrismaClient } from "@prisma/client"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createApp } from "./app.js"
import { signAccessToken } from "./lib/jwt.js"
import { activeItems, changeMembership, deleteExpiredItems, lockMember } from "./lib/membership.js"

const SECRET = "membership-test-secret-at-least-32-characters"
const body = { title: "검은 재킷", category: "outer", color: "black" }

// A fresh in-memory PostgreSQL engine only: never reads DATABASE_URL or .env.
describe("membership with Prisma and isolated PostgreSQL", () => {
  let pg, socket, database, http, api, user, token
  let migratedUser
  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE "_prisma_migrations" (id text);')
    const root = new URL("../prisma/migrations/", import.meta.url)
    for (const name of (await readdir(root)).filter((name) => name < "20260918090000" && /^\d/.test(name)).sort()) {
      await pg.exec(await readFile(new URL(`${name}/migration.sql`, root), "utf8"))
    }
    // A purchased pair plus one manual item is two historical saves.
    await pg.exec(`
      INSERT INTO "User" (id,email,"updatedAt") VALUES ('00000000-0000-4000-8000-000000000001','legacy@example.com',now());
      INSERT INTO "Want" (id,title,category,color,status,"userId","createdAt","updatedAt") VALUES
        ('00000000-0000-4000-8000-000000000002','legacy','outer','black','BOUGHT','00000000-0000-4000-8000-000000000001',now()-interval '90 days',now());
      INSERT INTO "Own" (id,title,category,color,source,"fromWantId","userId","updatedAt") VALUES
        ('00000000-0000-4000-8000-000000000003','bought','outer','black','BOUGHT','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',now()),
        ('00000000-0000-4000-8000-000000000004','manual','outer','black','MANUAL',null,'00000000-0000-4000-8000-000000000001',now());
    `)
    await pg.exec(await readFile(new URL("20260918090000_membership/migration.sql", root), "utf8"))
    socket = new PGLiteSocketServer({ db: pg, host: "127.0.0.1", port: 0, maxConnections: 6 })
    let port
    socket.addEventListener("listening", (event) => { port = event.detail.port })
    await socket.start()
    database = new PrismaClient({ datasources: { db: { url: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?connection_limit=4&pgbouncer=true` } } })
    migratedUser = await database.user.findUnique({ where: { email: "legacy@example.com" }, include: { wants: true, owns: true } })
    http = createApp({ database, jwtSecret: SECRET, cronSecret: SECRET }).listen(0, "127.0.0.1")
    await once(http, "listening")
    api = request(`http://127.0.0.1:${http.address().port}`)
  }, 30_000)

  afterAll(async () => {
    if (http) await new Promise((resolve) => http.close(resolve))
    await database?.$disconnect()
    await socket?.stop()
    await pg?.close()
  })

  beforeEach(async () => {
    await database.user.deleteMany()
    user = await database.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } })
    token = `Bearer ${signAccessToken(user.id, SECRET)}`
  })

  function save(resource = "wants", key = crypto.randomUUID(), payload = body) {
    return api.post(`/api/${resource}`).set("Authorization", token).set("Idempotency-Key", key).send(payload)
  }

  it("migrates existing logical saves with a full retention grace period and server-only receipts", async () => {
    expect(migratedUser.trialSaveCount).toBe(2)
    expect(migratedUser.plan).toBe("FREE")
    const expires = migratedUser.wants[0].expiresAt
    expect(expires.getTime() - Date.now()).toBeGreaterThan(29 * 86_400_000)
    expect(migratedUser.owns.every((item) => item.expiresAt.getTime() === expires.getTime())).toBe(true)
    const rls = await database.$queryRaw`SELECT relrowsecurity FROM pg_class WHERE relname = 'SaveRequest'`
    expect(rls[0].relrowsecurity).toBe(true)
  })

  it("allows only the 50th save across concurrent Want and Own requests", async () => {
    await database.user.update({ where: { id: user.id }, data: { trialSaveCount: 49 } })
    const results = await Promise.all([save("wants"), save("owns"), save("wants")])
    expect(results.map((result) => result.status).sort()).toEqual([201, 403, 403])
    expect(results.filter((result) => result.status === 403).every((result) => result.body.error.code === "TRIAL_SAVE_LIMIT_REACHED")).toBe(true)
    expect((await database.user.findUnique({ where: { id: user.id } })).trialSaveCount).toBe(50)
    expect(await database.want.count({ where: { userId: user.id } }) + await database.own.count({ where: { userId: user.id } })).toBe(1)
  })

  it("replays concurrent requests once and rejects changed payloads and deleted receipts", async () => {
    const key = crypto.randomUUID()
    const results = await Promise.all([save("wants", key), save("wants", key)])
    expect(results.map((result) => result.status).sort()).toEqual([200, 201])
    expect(results[0].body.want.id).toBe(results[1].body.want.id)
    const conflict = await save("wants", key, { ...body, title: "다른 옷" })
    expect(conflict.status).toBe(409)
    await api.delete(`/api/wants/${results[0].body.want.id}`).set("Authorization", token).expect(204)
    expect((await save("wants", key)).body.error.code).toBe("SAVE_NO_LONGER_AVAILABLE")
    const newSave = await save()
    expect(newSave.body.membership.trialSaveCount).toBe(2)
  })

  it("does not spend quota on invalid or failed writes", async () => {
    expect((await save("wants", crypto.randomUUID(), { ...body, plan: "PAID" })).status).toBe(400)
    const { createSavedItem } = await import("./lib/membership.js")
    await expect(createSavedItem(database, { userId: user.id, model: "want", key: "failed", data: { ...body, title: 123 } })).rejects.toBeDefined()
    expect((await database.user.findUnique({ where: { id: user.id } })).trialSaveCount).toBe(0)
    expect(await database.saveRequest.count({ where: { userId: user.id } })).toBe(0)
  })

  it("allows purchase and edits at the limit without resetting expiry or spending quota", async () => {
    const saved = await save()
    const id = saved.body.want.id
    await database.user.update({ where: { id: user.id }, data: { trialSaveCount: 50 } })
    await api.patch(`/api/wants/${id}`).set("Authorization", token).send({ title: "수정" }).expect(200)
    const bought = await api.post(`/api/wants/${id}/buy`).set("Authorization", token).expect(201)
    expect(bought.body.own.expiresAt).toBe(saved.body.want.expiresAt)
    await api.post(`/api/wants/${id}/buy`).set("Authorization", token).expect(200)
    await api.delete(`/api/owns/${bought.body.own.id}`).set("Authorization", token).expect(204)
    expect((await save()).status).toBe(403)
    expect(await database.want.count({ where: { userId: user.id } })).toBe(0)
  })

  it("hides expired records from all pages, detail, edits and purchase; deletes linked pairs together", async () => {
    const first = await save()
    const bought = await api.post(`/api/wants/${first.body.want.id}/buy`).set("Authorization", token).expect(201)
    const second = await save()
    const third = await save()
    const cutoff = new Date()
    await database.want.update({ where: { id: first.body.want.id }, data: { expiresAt: cutoff } })
    await database.own.update({ where: { id: bought.body.own.id }, data: { expiresAt: cutoff } })
    for (const [resource, id] of [["wants", first.body.want.id], ["owns", bought.body.own.id]]) {
      await api.get(`/api/${resource}/${id}`).set("Authorization", token).expect(404)
      await api.patch(`/api/${resource}/${id}`).set("Authorization", token).send({ title: "수정" }).expect(404)
    }
    await api.post(`/api/wants/${first.body.want.id}/buy`).set("Authorization", token).expect(404)
    const page = await api.get("/api/wants?limit=1").set("Authorization", token).expect(200)
    expect(page.body.wants[0].id).toBe(third.body.want.id)
    const last = await api.get(`/api/wants?limit=1&cursor=${page.body.nextCursor}`).set("Authorization", token).expect(200)
    expect(last.body.wants.map((item) => item.id)).toEqual([second.body.want.id])
    expect(last.body.nextCursor).toBeNull()
    await api.get(`/api/wants?cursor=${first.body.want.id}`).set("Authorization", token).expect(400)
    expect((await api.get("/api/owns").set("Authorization", token)).body.owns).toEqual([])
    const deleted = await database.$transaction(async (tx) => {
      await lockMember(tx, user.id)
      return deleteExpiredItems(tx, user.id, cutoff)
    })
    expect(deleted).toEqual({ wants: 1, owns: 1 })
    expect((await database.user.findUnique({ where: { id: user.id } })).trialSaveCount).toBe(3)
    // Exact cutoff is excluded, not just items older than the cutoff.
    expect(await database.want.count({ where: { userId: user.id, ...activeItems(new Date(third.body.want.expiresAt)) } })).toBe(0)
  })

  it("keeps paid saves unlimited and preserves the old trial counter on downgrade", async () => {
    const first = await save()
    await database.user.update({ where: { id: user.id }, data: { trialSaveCount: 50 } })
    await changeMembership(database, user.id, "PAID")
    expect((await database.want.findUnique({ where: { id: first.body.want.id } })).expiresAt).toBeNull()
    const paid = await save("owns")
    expect(paid.status).toBe(201)
    expect(paid.body.own.expiresAt).toBeNull()
    expect(paid.body.membership).toMatchObject({ plan: "PAID", trialSaveCount: 50, savesRemaining: null, canSave: true })
    await changeMembership(database, user.id, "FREE")
    const before = await database.own.findUnique({ where: { id: paid.body.own.id } })
    expect(before.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 86_400_000)
    await changeMembership(database, user.id, "FREE")
    expect((await database.own.findUnique({ where: { id: before.id } })).expiresAt).toEqual(before.expiresAt)
    expect((await save()).status).toBe(403)
  })

  it("does not resurrect expired items on upgrade or expose another member's records", async () => {
    const saved = await save()
    await database.want.update({ where: { id: saved.body.want.id }, data: { expiresAt: new Date(0) } })
    await changeMembership(database, user.id, "PAID")
    expect(await database.want.findUnique({ where: { id: saved.body.want.id } })).toBeNull()
    const other = await database.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } })
    const item = await database.want.create({ data: { ...body, userId: other.id } })
    await api.get(`/api/wants/${item.id}`).set("Authorization", token).expect(404)
    await api.post(`/api/wants/${item.id}/buy`).set("Authorization", token).expect(404)
  })

  it("protects scheduled deletion and safely repeats cleanup without refunding quota", async () => {
    const saved = await save()
    await database.want.update({ where: { id: saved.body.want.id }, data: { expiresAt: new Date(0) } })
    await api.get("/api/cron/cleanup-expired").expect(401)
    await api.get("/api/cron/cleanup-expired").set("Authorization", token).expect(401)
    expect(await database.want.findUnique({ where: { id: saved.body.want.id } })).not.toBeNull()
    const cleaned = await api.get("/api/cron/cleanup-expired").set("Authorization", `Bearer ${SECRET}`).expect(200)
    expect(cleaned.body).toEqual({ deletedWants: 1, deletedOwns: 0, hasMore: false })
    const repeated = await api.get("/api/cron/cleanup-expired").set("Authorization", `Bearer ${SECRET}`).expect(200)
    expect(repeated.body.deletedWants).toBe(0)
    expect((await database.user.findUnique({ where: { id: user.id } })).trialSaveCount).toBe(1)
  })
})
