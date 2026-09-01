import { z } from "zod"
import { AppError } from "./app-error.js"
import { validationError } from "../middleware/validate.js"

export const CATEGORIES = ["top", "bottom", "outer", "shoes", "bag", "etc"]
export const COLORS = [
  "black",
  "white",
  "gray",
  "navy",
  "beige",
  "brown",
  "other",
]

export const WANT_STATUS_TO_DATABASE = {
  pending: "PENDING",
  bought: "BOUGHT",
  skipped: "SKIPPED",
}

const WANT_STATUS_FROM_DATABASE = {
  PENDING: "pending",
  BOUGHT: "bought",
  SKIPPED: "skipped",
}

const OWN_SOURCE_FROM_DATABASE = {
  MANUAL: "manual",
  BOUGHT: "bought",
}

export const idParamsSchema = z.strictObject({
  id: z.uuid("올바른 ID가 아닙니다."),
})

const titleSchema = z
  .string({ error: "이름을 입력해 주세요." })
  .trim()
  .min(1, "이름을 입력해 주세요.")
  .max(120, "이름은 120자 이하여야 합니다.")

const categorySchema = z.enum(CATEGORIES, {
  error: "올바른 카테고리를 선택해 주세요.",
})

const colorSchema = z.enum(COLORS, {
  error: "올바른 색상을 선택해 주세요.",
})

const detailSchema = z
  .string()
  .trim()
  .min(1, "값을 입력해 주세요.")
  .max(80, "80자 이하로 입력해 주세요.")
  .nullable()

const nullableUrlSchema = z
  .string()
  .trim()
  .url("올바른 URL을 입력해 주세요.")
  .max(2048, "URL은 2048자 이하여야 합니다.")
  .nullable()

const nullablePriceSchema = z
  .number()
  .int("가격은 정수로 입력해 주세요.")
  .min(0, "가격은 0 이상이어야 합니다.")
  .max(2_147_483_647, "가격이 너무 큽니다.")
  .nullable()

const nullableNoteSchema = z
  .string()
  .trim()
  .max(2000, "메모는 2000자 이하여야 합니다.")
  .nullable()

export const createWantSchema = z.strictObject({
  title: titleSchema,
  url: nullableUrlSchema.optional(),
  category: categorySchema,
  categoryDetail: detailSchema.optional(),
  color: colorSchema,
  colorDetail: detailSchema.optional(),
  price: nullablePriceSchema.optional(),
  note: nullableNoteSchema.optional(),
})

export const updateWantSchema = z
  .strictObject({
    title: titleSchema.optional(),
    url: nullableUrlSchema.optional(),
    category: categorySchema.optional(),
    categoryDetail: detailSchema.optional(),
    color: colorSchema.optional(),
    colorDetail: detailSchema.optional(),
    price: nullablePriceSchema.optional(),
    note: nullableNoteSchema.optional(),
    status: z.enum(["pending", "skipped"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "수정할 값을 입력해 주세요.",
  })

export const wantQuerySchema = z.strictObject({
  status: z.enum(["pending", "bought", "skipped"]).optional(),
  category: categorySchema.optional(),
})

export const createOwnSchema = z.strictObject({
  title: titleSchema,
  category: categorySchema,
  categoryDetail: detailSchema.optional(),
  color: colorSchema,
  colorDetail: detailSchema.optional(),
})

export const updateOwnSchema = z
  .strictObject({
    title: titleSchema.optional(),
    category: categorySchema.optional(),
    categoryDetail: detailSchema.optional(),
    color: colorSchema.optional(),
    colorDetail: detailSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "수정할 값을 입력해 주세요.",
  })

export const ownQuerySchema = z.strictObject({
  category: categorySchema.optional(),
  color: colorSchema.optional(),
})

export function normalizeItemDetails(item) {
  const fields = {}
  const categoryDetail = item.categoryDetail?.trim() || null
  const colorDetail = item.colorDetail?.trim() || null

  if (item.category === "etc" && !categoryDetail) {
    fields.categoryDetail = ["기타 종류를 입력해 주세요."]
  }

  if (item.color === "other" && !colorDetail) {
    fields.colorDetail = ["기타 색상을 입력해 주세요."]
  }

  if (Object.keys(fields).length > 0) throw validationError(fields)

  return {
    ...item,
    categoryDetail: item.category === "etc" ? categoryDetail : null,
    colorDetail: item.color === "other" ? colorDetail : null,
  }
}

export function serializeWant(want) {
  return {
    id: want.id,
    title: want.title,
    url: want.url,
    category: want.category,
    categoryDetail: want.categoryDetail,
    color: want.color,
    colorDetail: want.colorDetail,
    price: want.price,
    note: want.note,
    status: WANT_STATUS_FROM_DATABASE[want.status],
    userId: want.userId,
    createdAt: want.createdAt,
    updatedAt: want.updatedAt,
  }
}

export function serializeOwn(own) {
  return {
    id: own.id,
    title: own.title,
    category: own.category,
    categoryDetail: own.categoryDetail,
    color: own.color,
    colorDetail: own.colorDetail,
    source: OWN_SOURCE_FROM_DATABASE[own.source],
    fromWantId: own.fromWantId,
    userId: own.userId,
    createdAt: own.createdAt,
    updatedAt: own.updatedAt,
  }
}

export function notFound(resource = "데이터") {
  return new AppError(404, "NOT_FOUND", `${resource}를 찾을 수 없습니다.`)
}

export function isPrismaNotFound(error) {
  return error?.code === "P2025"
}
