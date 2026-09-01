import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import bcrypt from "bcrypt"
import request from "supertest"
import app from "./app.js"
import { prisma } from "./lib/prisma.js"

const email = `mission7-smoke-${randomUUID()}@example.com`
const otherEmail = `mission7-smoke-${randomUUID()}@example.com`
const password = "mission-7-test-password"
const server = app.listen(0)
const api = request.agent(server)

try {
  const signup = await api.post("/api/auth/signup").send({
    email,
    password,
  })

  assert.equal(signup.status, 201)
  assert.equal(signup.body.user.email, email)
  assert.equal(typeof signup.body.token, "string")

  const storedUser = await prisma.user.findUnique({ where: { email } })
  assert.ok(storedUser)
  assert.notEqual(storedUser.passwordHash, password)
  assert.equal(await bcrypt.compare(password, storedUser.passwordHash), true)

  const login = await api.post("/api/auth/login").send({
    email,
    password,
  })

  assert.equal(login.status, 200)
  assert.equal(typeof login.body.token, "string")

  const me = await api
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${login.body.token}`)

  assert.equal(me.status, 200)
  assert.equal(me.body.user.id, storedUser.id)
  assert.equal(me.body.user.email, email)

  const otherSignup = await api.post("/api/auth/signup").send({
    email: otherEmail,
    password,
  })
  assert.equal(otherSignup.status, 201)

  const token = login.body.token
  const otherToken = otherSignup.body.token

  const invalidWant = await api
    .post("/api/wants")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "기타 상의",
      category: "etc",
      color: "black",
    })
  assert.equal(invalidWant.status, 400)
  assert.equal(invalidWant.body.error.code, "VALIDATION_ERROR")

  const createdWant = await api
    .post("/api/wants")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "검은 재킷",
      url: "https://example.com/jacket",
      category: "outer",
      color: "black",
      price: 129000,
      note: "DB CRUD 스모크 테스트",
    })
  assert.equal(createdWant.status, 201)
  assert.equal(createdWant.body.want.status, "pending")
  const wantId = createdWant.body.want.id

  const wantList = await api
    .get("/api/wants?status=pending&category=outer")
    .set("Authorization", `Bearer ${token}`)
  assert.equal(wantList.status, 200)
  assert.equal(wantList.body.wants.length, 1)

  const wantDetail = await api
    .get(`/api/wants/${wantId}`)
    .set("Authorization", `Bearer ${token}`)
  assert.equal(wantDetail.status, 200)

  const isolatedRead = await api
    .get(`/api/wants/${wantId}`)
    .set("Authorization", `Bearer ${otherToken}`)
  assert.equal(isolatedRead.status, 404)

  const isolatedDelete = await api
    .delete(`/api/wants/${wantId}`)
    .set("Authorization", `Bearer ${otherToken}`)
  assert.equal(isolatedDelete.status, 404)

  const skippedWant = await api
    .patch(`/api/wants/${wantId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "skipped" })
  assert.equal(skippedWant.status, 200)
  assert.equal(skippedWant.body.want.status, "skipped")

  const blockedBuy = await api
    .post(`/api/wants/${wantId}/buy`)
    .set("Authorization", `Bearer ${token}`)
  assert.equal(blockedBuy.status, 409)
  assert.equal(blockedBuy.body.error.code, "WANT_NOT_PENDING")

  const restoredWant = await api
    .patch(`/api/wants/${wantId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "pending", note: null })
  assert.equal(restoredWant.status, 200)
  assert.equal(restoredWant.body.want.status, "pending")
  assert.equal(restoredWant.body.want.note, null)

  const bought = await api
    .post(`/api/wants/${wantId}/buy`)
    .set("Authorization", `Bearer ${token}`)
  assert.equal(bought.status, 200)
  assert.equal(bought.body.want.status, "bought")
  assert.equal(bought.body.own.source, "bought")
  assert.equal(bought.body.own.fromWantId, wantId)
  const boughtOwnId = bought.body.own.id

  const repeatedBuy = await api
    .post(`/api/wants/${wantId}/buy`)
    .set("Authorization", `Bearer ${token}`)
  assert.equal(repeatedBuy.status, 200)
  assert.equal(repeatedBuy.body.own.id, boughtOwnId)

  const blockedStatusPatch = await api
    .patch(`/api/wants/${wantId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "pending" })
  assert.equal(blockedStatusPatch.status, 409)
  assert.equal(blockedStatusPatch.body.error.code, "WANT_ALREADY_BOUGHT")

  const transactionState = await prisma.want.findUnique({
    where: { id: wantId },
    include: { own: true },
  })
  assert.equal(transactionState.status, "BOUGHT")
  assert.equal(transactionState.own.id, boughtOwnId)

  const manualOwn = await api
    .post("/api/owns")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "파란 셔츠",
      category: "top",
      color: "other",
      colorDetail: "하늘색",
    })
  assert.equal(manualOwn.status, 201)
  assert.equal(manualOwn.body.own.source, "manual")
  const manualOwnId = manualOwn.body.own.id

  const ownList = await api
    .get("/api/owns?category=outer&color=black")
    .set("Authorization", `Bearer ${token}`)
  assert.equal(ownList.status, 200)
  assert.equal(ownList.body.owns.length, 1)
  assert.equal(ownList.body.owns[0].id, boughtOwnId)

  const isolatedOwnUpdate = await api
    .patch(`/api/owns/${boughtOwnId}`)
    .set("Authorization", `Bearer ${otherToken}`)
    .send({ title: "다른 사용자의 수정" })
  assert.equal(isolatedOwnUpdate.status, 404)

  const updatedOwn = await api
    .patch(`/api/owns/${boughtOwnId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "구매한 검은 재킷" })
  assert.equal(updatedOwn.status, 200)
  assert.equal(updatedOwn.body.own.title, "구매한 검은 재킷")

  const deletedWant = await api
    .delete(`/api/wants/${wantId}`)
    .set("Authorization", `Bearer ${token}`)
  assert.equal(deletedWant.status, 204)

  const detachedOwn = await prisma.own.findUnique({
    where: { id: boughtOwnId },
  })
  assert.equal(detachedOwn.fromWantId, null)

  const deletedBoughtOwn = await api
    .delete(`/api/owns/${boughtOwnId}`)
    .set("Authorization", `Bearer ${token}`)
  assert.equal(deletedBoughtOwn.status, 204)

  const deletedManualOwn = await api
    .delete(`/api/owns/${manualOwnId}`)
    .set("Authorization", `Bearer ${token}`)
  assert.equal(deletedManualOwn.status, 204)

  console.log("Database authentication and CRUD smoke test passed.")
} finally {
  await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail] } } })
  await prisma.$disconnect()
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
}
