import { createHash } from "node:crypto"
import { AppError } from "./app-error.js"

export const TRIAL_SAVE_LIMIT = 50
export const RETENTION_DAYS = 30
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000

export function membership(user) {
  const paid = user.plan === "PAID"
  const used = user.trialSaveCount ?? 0
  return {
    plan: paid ? "PAID" : "FREE",
    trialSaveCount: used,
    saveLimit: paid ? null : TRIAL_SAVE_LIMIT,
    savesRemaining: paid ? null : Math.max(0, TRIAL_SAVE_LIMIT - used),
    retentionDays: paid ? null : RETENTION_DAYS,
    canSave: paid || used < TRIAL_SAVE_LIMIT,
  }
}

export function expirationDate(now = new Date()) {
  return new Date(now.getTime() + RETENTION_MS)
}

// AND keeps this predicate intact when cursor pagination adds its own OR.
export function activeItems(now = new Date()) {
  return { AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }] }
}

export async function lockMember(transaction, userId) {
  await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`
  const user = await transaction.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError(401, "UNAUTHORIZED", "로그인이 필요합니다.")
  return user
}

export function idempotencyKey(request) {
  const key = request.get("Idempotency-Key")
  if (key !== undefined && !/^[A-Za-z0-9_-]{1,128}$/.test(key)) {
    throw new AppError(400, "INVALID_IDEMPOTENCY_KEY", "저장 요청 ID가 올바르지 않습니다.")
  }
  return key
}

export async function createSavedItem(database, { userId, model, data, key }) {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([model, Object.keys(data).sort().map((name) => [name, data[name]])]))
    .digest("hex")

  return database.$transaction(async (transaction) => {
    // All saves and plan transitions for one account serialize on this row.
    // A failed item insert rolls back the counter and request receipt together.
    let user = await lockMember(transaction, userId)
    const now = new Date()
    if (key) {
      const previous = await transaction.saveRequest.findUnique({ where: { userId_key: { userId, key } } })
      if (previous) {
        if (previous.fingerprint !== fingerprint) {
          throw new AppError(409, "IDEMPOTENCY_CONFLICT", "이미 다른 저장에 사용된 요청 ID입니다.")
        }
        const item = await transaction[model].findFirst({ where: { id: previous.itemId, userId, ...activeItems(now) } })
        if (!item) throw new AppError(409, "SAVE_NO_LONGER_AVAILABLE", "이미 삭제되거나 보관 기간이 끝난 저장 요청입니다.")
        return { item, membership: membership(user), created: false }
      }
    }
    if (!membership(user).canSave) {
      throw new AppError(403, "TRIAL_SAVE_LIMIT_REACHED", "체험 저장 50회를 모두 사용했습니다. 삭제해도 저장 횟수는 복구되지 않습니다.")
    }
    if (user.plan !== "PAID") {
      user = await transaction.user.update({
        where: { id: userId }, data: { trialSaveCount: { increment: 1 } },
      })
    }
    const item = await transaction[model].create({
      data: { ...data, userId, expiresAt: user.plan === "PAID" ? null : expirationDate(now) },
    })
    if (key) await transaction.saveRequest.create({ data: { userId, key, fingerprint, itemId: item.id } })
    return { item, membership: membership(user), created: true }
  }, { maxWait: 5_000, timeout: 10_000 })
}

// Caller holds the member row lock, also used by purchase and plan changes.
export async function deleteExpiredItems(transaction, userId, now = new Date()) {
  const where = { userId, expiresAt: { lte: now } }
  const owns = await transaction.own.deleteMany({ where })
  const wants = await transaction.want.deleteMany({ where })
  return { owns: owns.count, wants: wants.count }
}

export async function changeMembership(database, userId, plan) {
  if (!["FREE", "PAID"].includes(plan)) throw new Error("등급은 FREE 또는 PAID여야 합니다.")
  return database.$transaction(async (transaction) => {
    const user = await lockMember(transaction, userId)
    const now = new Date()
    await deleteExpiredItems(transaction, userId, now)
    // Repeating FREE must not extend retention; repeating PAID changes nothing.
    if (user.plan === plan) return membership(user)
    const expiresAt = plan === "PAID" ? null : expirationDate(now)
    await transaction.want.updateMany({ where: { userId }, data: { expiresAt } })
    await transaction.own.updateMany({ where: { userId }, data: { expiresAt } })
    return membership(await transaction.user.update({ where: { id: userId }, data: { plan } }))
  }, { maxWait: 5_000, timeout: 10_000 })
}
