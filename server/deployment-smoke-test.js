import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"

const baseUrl = (process.argv[2] || "").replace(/\/$/, "")

if (!baseUrl || !baseUrl.startsWith("https://")) {
  throw new Error("Usage: npm run test:deploy -- https://your-deployment.example")
}

const email = `deployment-smoke-${randomUUID()}@example.com`
const password = "deployment-smoke-password"
let token

async function api(path, { body, ...options } = {}) {
  const headers = new Headers(options.headers)
  if (body !== undefined) headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = response.status === 204 ? null : await response.json()
  return { response, payload }
}

function assertStatus(result, expected, label) {
  assert.equal(
    result.response.status,
    expected,
    `${label}: ${JSON.stringify(result.payload)}`,
  )
}

try {
  const health = await api("/api/health")
  assert.equal(health.response.status, 200)
  assert.deepEqual(health.payload, { status: "ok", database: "ok" })

  const specification = await api("/api/openapi.json")
  assert.equal(specification.response.status, 200)
  assert.equal(specification.payload.info.title, "있니 API")
  assert.ok(specification.payload.paths["/api/wants/{id}/buy"])

  const signup = await api("/api/auth/signup", {
    method: "POST",
    body: { email, password },
  })
  assert.equal(signup.response.status, 201)
  token = signup.payload.token
  assert.equal(signup.payload.user.email, email)

  const me = await api("/api/auth/me")
  assert.equal(me.response.status, 200)
  assert.equal(me.payload.user.email, email)

  const createdWant = await api("/api/wants", {
    method: "POST",
    body: {
      title: "배포 검증 재킷",
      category: "outer",
      color: "black",
      price: 129000,
      note: "production smoke test",
    },
  })
  assert.equal(createdWant.response.status, 201)
  assert.equal(createdWant.payload.want.status, "pending")
  const wantId = createdWant.payload.want.id

  const wants = await api("/api/wants?status=pending&category=outer")
  assertStatus(wants, 200, "Filtered wants request failed")
  assert.ok(wants.payload.wants.some((want) => want.id === wantId))

  const manualOwn = await api("/api/owns", {
    method: "POST",
    body: {
      title: "배포 검증 셔츠",
      category: "top",
      color: "other",
      colorDetail: "하늘색",
    },
  })
  assert.equal(manualOwn.response.status, 201)
  assert.equal(manualOwn.payload.own.source, "manual")

  const bought = await api(`/api/wants/${wantId}/buy`, { method: "POST" })
  assert.equal(bought.response.status, 200)
  assert.equal(bought.payload.want.status, "bought")
  assert.equal(bought.payload.own.source, "bought")
  assert.equal(bought.payload.own.fromWantId, wantId)

  const owns = await api("/api/owns")
  assert.equal(owns.response.status, 200)
  assert.ok(owns.payload.owns.some((own) => own.id === manualOwn.payload.own.id))
  assert.ok(owns.payload.owns.some((own) => own.id === bought.payload.own.id))

  console.log(`Production API smoke test passed: ${baseUrl}`)
} finally {
  if (token) {
    const cleanup = await api("/api/auth/me", { method: "DELETE" })
    assertStatus(cleanup, 204, "Deployment smoke-test account cleanup failed")
  }
}
