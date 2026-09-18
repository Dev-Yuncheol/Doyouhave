import { deleteExpiredItems, lockMember } from "./membership.js"

export async function cleanupExpiredBatch(database, { limit = 100, budgetMs = 20_000 } = {}) {
  const now = new Date()
  const deadline = Date.now() + budgetMs
  const where = { OR: [
    { wants: { some: { expiresAt: { lte: now } } } },
    { owns: { some: { expiresAt: { lte: now } } } },
  ] }
  const users = await database.user.findMany({ where, select: { id: true }, orderBy: { id: "asc" }, take: limit })
  let deletedWants = 0
  let deletedOwns = 0
  for (const user of users) {
    if (Date.now() >= deadline) break
    const removed = await database.$transaction(async (transaction) => {
      try {
        await lockMember(transaction, user.id)
      } catch (error) {
        if (error.code === "UNAUTHORIZED") return { wants: 0, owns: 0 }
        throw error
      }
      return deleteExpiredItems(transaction, user.id, now)
    }, { maxWait: 5_000, timeout: 10_000 })
    deletedWants += removed.wants
    deletedOwns += removed.owns
  }
  const remaining = await database.user.findFirst({ where, select: { id: true } })
  return { deletedWants, deletedOwns, hasMore: Boolean(remaining) }
}
