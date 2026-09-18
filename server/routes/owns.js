import { Router } from "express"
import { activeItems, createSavedItem, idempotencyKey, lockMember } from "../lib/membership.js"
import { listPage } from "../lib/pagination.js"
import {
  createOwnSchema,
  idParamsSchema,
  isPrismaNotFound,
  normalizeItemDetails,
  notFound,
  ownQuerySchema,
  serializeOwn,
  updateOwnSchema,
} from "../lib/items.js"
import { createAuthenticate } from "../middleware/authenticate.js"
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js"

export function createOwnsRouter({ database, jwtSecret }) {
  const router = Router()
  router.use(createAuthenticate({ database, jwtSecret }))

  router.post("/", validateBody(createOwnSchema), async (request, response) => {
    const data = normalizeItemDetails(request.validatedBody)
    const result = await createSavedItem(database, {
      userId: request.user.id, model: "own", key: idempotencyKey(request),
      data: {
        ...data,
        source: "MANUAL",
        userId: request.user.id,
      },
    })

    response.status(result.created ? 201 : 200).json({ own: serializeOwn(result.item), membership: result.membership })
  })

  router.get("/", validateQuery(ownQuerySchema), async (request, response) => {
    const { category, color } = request.validatedQuery
    const page = await listPage(
      database.own,
      {
        userId: request.user.id,
        ...activeItems(),
        ...(category ? { category } : {}),
        ...(color ? { color } : {}),
      },
      request.validatedQuery,
    )

    response.json({ owns: page.items.map(serializeOwn), nextCursor: page.nextCursor })
  })

  router.get("/:id", validateParams(idParamsSchema), async (request, response) => {
    const own = await database.own.findFirst({
      where: { id: request.validatedParams.id, userId: request.user.id, ...activeItems() },
    })
    if (!own) throw notFound("보유 의류")
    response.json({ own: serializeOwn(own) })
  })

  router.patch(
    "/:id",
    validateParams(idParamsSchema),
    validateBody(updateOwnSchema),
    async (request, response) => {
      const where = {
        id: request.validatedParams.id,
        userId: request.user.id,
        ...activeItems(),
      }
      const existing = await database.own.findFirst({ where })

      if (!existing) throw notFound("보유 의류")

      const patch = request.validatedBody
      const merged = normalizeItemDetails({
        url: patch.url === undefined ? existing.url : patch.url,
        price: patch.price === undefined ? existing.price : patch.price,
        note: patch.note === undefined ? existing.note : patch.note,
        title: patch.title ?? existing.title,
        category: patch.category ?? existing.category,
        categoryDetail:
          patch.categoryDetail === undefined
            ? existing.categoryDetail
            : patch.categoryDetail,
        color: patch.color ?? existing.color,
        colorDetail:
          patch.colorDetail === undefined ? existing.colorDetail : patch.colorDetail,
      })

      try {
        const own = await database.own.update({ where, data: merged })
        response.json({ own: serializeOwn(own) })
      } catch (error) {
        if (isPrismaNotFound(error)) throw notFound("보유 의류")
        throw error
      }
    },
  )

  router.delete(
    "/:id",
    validateParams(idParamsSchema),
    async (request, response) => {
      await database.$transaction(async (transaction) => {
        await lockMember(transaction, request.user.id)
        const where = {
          id: request.validatedParams.id,
          userId: request.user.id,
        }
        const own = await transaction.own.findFirst({ where })
        if (!own) throw notFound("보유 의류")

        const result = await transaction.own.deleteMany({ where })
        if (result.count === 0) throw notFound("보유 의류")

        if (own.fromWantId) {
          await transaction.want.deleteMany({
            where: { id: own.fromWantId, userId: request.user.id },
          })
        }
      })

      response.status(204).end()
    },
  )

  return router
}
