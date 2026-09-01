import { Router } from "express"
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
    const own = await database.own.create({
      data: {
        ...data,
        source: "MANUAL",
        userId: request.user.id,
      },
    })

    response.status(201).json({ own: serializeOwn(own) })
  })

  router.get("/", validateQuery(ownQuerySchema), async (request, response) => {
    const { category, color } = request.validatedQuery
    const owns = await database.own.findMany({
      where: {
        userId: request.user.id,
        ...(category ? { category } : {}),
        ...(color ? { color } : {}),
      },
      orderBy: { createdAt: "desc" },
    })

    response.json({ owns: owns.map(serializeOwn) })
  })

  router.patch(
    "/:id",
    validateParams(idParamsSchema),
    validateBody(updateOwnSchema),
    async (request, response) => {
      const where = {
        id: request.validatedParams.id,
        userId: request.user.id,
      }
      const existing = await database.own.findFirst({ where })

      if (!existing) throw notFound("보유 의류")

      const patch = request.validatedBody
      const merged = normalizeItemDetails({
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
      const result = await database.own.deleteMany({
        where: {
          id: request.validatedParams.id,
          userId: request.user.id,
        },
      })

      if (result.count === 0) throw notFound("보유 의류")

      response.status(204).end()
    },
  )

  return router
}
