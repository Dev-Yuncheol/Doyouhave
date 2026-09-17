import { AppError } from "./app-error.js"

// A timestamp plus UUID handles identical creation times deterministically.
// Resolve the UUID within this user's filtered collection first; a missing
// anchor asks the client to refresh rather than silently truncating the list.
export async function listPage(model, where, { limit, cursor }) {
  let boundary = {}
  if (cursor) {
    const anchor = await model.findFirst({ where: { ...where, id: cursor } })
    if (!anchor) {
      throw new AppError(400, "INVALID_CURSOR", "목록이 변경되었습니다. 새로고침해 주세요.")
    }
    boundary = {
      OR: [
        { createdAt: { lt: anchor.createdAt } },
        { createdAt: anchor.createdAt, id: { lt: anchor.id } },
      ],
    }
  }
  const rows = await model.findMany({
    where: { ...where, ...boundary },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  })
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  return { items, nextCursor: hasMore ? items.at(-1).id : null }
}
