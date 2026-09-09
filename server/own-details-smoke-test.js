import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { prisma } from "./lib/prisma.js"

const rollback = new Error("ROLLBACK_TEST_DATA")
try {
  await prisma.$transaction(async (db) => {
    const user = await db.user.create({ data: {
      email: `own-details-${randomUUID()}@example.com`, passwordHash: "test-only",
    } })
    const details = { price: 10000, url: "https://example.com/shirt", note: "탑텐" }
    const own = await db.own.create({ data: {
      title: "반팔", category: "top", color: "other", colorDetail: "보라",
      userId: user.id, ...details,
    } })
    const stored = await db.own.findUniqueOrThrow({ where: { id: own.id } })
    for (const field of Object.keys(details)) assert.equal(stored[field], details[field])
    await db.own.update({ where: { id: own.id }, data: { price: 0, note: "수정" } })
    const edited = await db.own.findUniqueOrThrow({ where: { id: own.id } })
    assert.equal(edited.price, 0)
    assert.equal(edited.note, "수정")
    assert.equal(edited.url, details.url)
    await db.own.update({ where: { id: own.id }, data: { price: null, url: null, note: null } })
    const cleared = await db.own.findUniqueOrThrow({ where: { id: own.id } })
    for (const field of Object.keys(details)) assert.equal(cleared[field], null)
    throw rollback
  }, { timeout: 15000 })
} catch (error) {
  if (error !== rollback) throw error
  console.log("Own details create/read/update/clear passed; test transaction rolled back.")
} finally {
  await prisma.$disconnect()
}
