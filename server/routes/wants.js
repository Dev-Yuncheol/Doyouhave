import { Router } from "express"
import { AppError } from "../lib/app-error.js"
import {
  createWantSchema,
  idParamsSchema,
  isPrismaNotFound,
  normalizeItemDetails,
  notFound,
  serializeOwn,
  serializeWant,
  updateWantSchema,
  WANT_STATUS_TO_DATABASE,
  wantQuerySchema,
} from "../lib/items.js"
import { createAuthenticate } from "../middleware/authenticate.js"
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js"

export function createWantsRouter({ database, jwtSecret }) {
  const router = Router()
  router.use(createAuthenticate({ database, jwtSecret }))

  router.post("/", validateBody(createWantSchema), async (request, response) => {
    const data = normalizeItemDetails(request.validatedBody)
    const want = await database.want.create({
      data: {
        ...data,
        url: data.url ?? null,
        price: data.price ?? null,
        note: data.note ?? null,
        userId: request.user.id,
      },
    })

    response.status(201).json({ want: serializeWant(want) })
  })

  router.get("/", validateQuery(wantQuerySchema), async (request, response) => {
    const { status, category } = request.validatedQuery
    const wants = await database.want.findMany({
      where: {
        userId: request.user.id,
        ...(status ? { status: WANT_STATUS_TO_DATABASE[status] } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
    })

    response.json({ wants: wants.map(serializeWant) })
  })

  router.get("/:id", validateParams(idParamsSchema), async (request, response) => {
    const want = await database.want.findFirst({
      where: { id: request.validatedParams.id, userId: request.user.id },
    })

    if (!want) throw notFound("구매 후보")

    response.json({ want: serializeWant(want) })
  })

  router.patch(
    "/:id",
    validateParams(idParamsSchema),
    validateBody(updateWantSchema),
    async (request, response) => {
      const where = {
        id: request.validatedParams.id,
        userId: request.user.id,
      }
      const existing = await database.want.findFirst({ where })

      if (!existing) throw notFound("구매 후보")

      const patch = request.validatedBody
      if (existing.status === "BOUGHT" && patch.status) {
        throw new AppError(
          409,
          "WANT_ALREADY_BOUGHT",
          "구매 완료된 후보의 상태는 변경할 수 없습니다.",
        )
      }

      const merged = normalizeItemDetails({
        title: patch.title ?? existing.title,
        url: patch.url === undefined ? existing.url : patch.url,
        category: patch.category ?? existing.category,
        categoryDetail:
          patch.categoryDetail === undefined
            ? existing.categoryDetail
            : patch.categoryDetail,
        color: patch.color ?? existing.color,
        colorDetail:
          patch.colorDetail === undefined ? existing.colorDetail : patch.colorDetail,
        price: patch.price === undefined ? existing.price : patch.price,
        note: patch.note === undefined ? existing.note : patch.note,
      })

      try {
        const want = await database.want.update({
          where,
          data: {
            ...merged,
            ...(patch.status
              ? { status: WANT_STATUS_TO_DATABASE[patch.status] }
              : {}),
          },
        })
        response.json({ want: serializeWant(want) })
      } catch (error) {
        if (isPrismaNotFound(error)) throw notFound("구매 후보")
        throw error
      }
    },
  )

  router.delete(
    "/:id",
    validateParams(idParamsSchema),
    async (request, response) => {
      const result = await database.want.deleteMany({
        where: {
          id: request.validatedParams.id,
          userId: request.user.id,
        },
      })

      if (result.count === 0) throw notFound("구매 후보")

      response.status(204).end()
    },
  )

  router.post(
    "/:id/buy",
    validateParams(idParamsSchema),
    async (request, response) => {
      const wantId = request.validatedParams.id
      const userId = request.user.id

      const result = await database.$transaction(
        async (transaction) => {
          const updated = await transaction.want.updateMany({
            where: { id: wantId, userId, status: "PENDING" },
            data: { status: "BOUGHT" },
          })

          if (updated.count === 0) {
            const existingWant = await transaction.want.findFirst({
              where: { id: wantId, userId },
            })

            if (!existingWant) throw notFound("구매 후보")

            if (existingWant.status === "BOUGHT") {
              const existingOwn = await transaction.own.findUnique({
                where: { fromWantId: wantId },
              })

              if (existingOwn) {
                return { want: existingWant, own: existingOwn }
              }
            }

            throw new AppError(
              409,
              "WANT_NOT_PENDING",
              "진행 중인 구매 후보만 구매 완료할 수 있습니다.",
            )
          }

          const want = await transaction.want.findUniqueOrThrow({
            where: { id: wantId },
          })
          const own = await transaction.own.create({
            data: {
              title: want.title,
              category: want.category,
              categoryDetail: want.categoryDetail,
              color: want.color,
              colorDetail: want.colorDetail,
              source: "BOUGHT",
              fromWantId: want.id,
              userId,
            },
          })

          return { want, own }
        },
        { maxWait: 2_000, timeout: 5_000 },
      )

      response.json({
        want: serializeWant(result.want),
        own: serializeOwn(result.own),
      })
    },
  )

  return router
}
