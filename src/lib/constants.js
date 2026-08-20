export const APP_NAME = import.meta.env.VITE_APP_NAME || "있니"

export const CATEGORIES = [
  { value: "top", label: "상의" },
  { value: "bottom", label: "하의" },
  { value: "outer", label: "아우터" },
  { value: "shoes", label: "신발" },
  { value: "bag", label: "가방" },
  { value: "etc", label: "기타" },
]

export const COLORS = [
  { value: "black", label: "블랙", hex: "#1C1917" },
  { value: "white", label: "화이트", hex: "#FAFAF8" },
  { value: "gray", label: "그레이", hex: "#8A8580" },
  { value: "navy", label: "네이비", hex: "#1E3A5F" },
  { value: "beige", label: "베이지", hex: "#D4C4A8" },
  { value: "brown", label: "브라운", hex: "#C4B5A0" },
  { value: "other", label: "기타", hex: "#C4B5A0" },
]

export const STATUS = {
  pending: { value: "pending", label: "진행 중" },
  bought: { value: "bought", label: "샀다" },
  skipped: { value: "skipped", label: "안 샀다" },
}

export function categoryLabel(value, categoryDetail) {
  if (value === "etc" && categoryDetail?.trim()) return categoryDetail.trim()
  return CATEGORIES.find((item) => item.value === value)?.label ?? value
}

export function colorLabel(value, colorDetail) {
  if (value === "other" && colorDetail?.trim()) return colorDetail.trim()
  return COLORS.find((item) => item.value === value)?.label ?? value
}

export function colorHex(value) {
  return COLORS.find((item) => item.value === value)?.hex ?? "#C4B5A0"
}

export function statusLabel(value) {
  return STATUS[value]?.label ?? value
}
