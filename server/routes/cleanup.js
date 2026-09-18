import { timingSafeEqual } from "node:crypto"
import { AppError } from "../lib/app-error.js"
import { cleanupExpiredBatch } from "../lib/cleanup.js"

export function createCleanupHandler({ database, secret }) {
  return async (request, response) => {
    if (!secret || secret.length < 32) throw new AppError(503, "CRON_NOT_CONFIGURED", "정리 작업이 설정되지 않았습니다.")
    const actual = Buffer.from(request.get("Authorization") ?? "")
    const expected = Buffer.from(`Bearer ${secret}`)
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new AppError(401, "UNAUTHORIZED", "인증이 필요합니다.")
    }
    const result = await cleanupExpiredBatch(database)
    if (result.hasMore) console.warn("Expired item cleanup has a remaining backlog; run items:cleanup to drain it.")
    response.set("Cache-Control", "no-store").json(result)
  }
}
