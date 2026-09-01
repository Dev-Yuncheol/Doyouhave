export const MAX_PRICE = 2_147_483_647

export function getPriceError(value) {
  if (value === "") return undefined

  const price = Number(value)
  if (!Number.isFinite(price)) return "가격은 유한한 숫자로 입력해 주세요"
  if (!Number.isInteger(price)) return "가격은 정수로 입력해 주세요"
  if (price < 0) return "가격은 0 이상이어야 합니다"
  if (price > MAX_PRICE) return `가격은 ${MAX_PRICE} 이하여야 합니다`

  return undefined
}
