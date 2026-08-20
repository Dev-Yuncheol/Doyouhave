export function normalizeColorDetail(value) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/색$/u, "")
}

export function normalizeCategoryDetail(value) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
}

export function findSimilarOwns(
  owns,
  { category, color, colorDetail, categoryDetail } = {},
) {
  if (!category || !color) return []
  return owns.filter((own) => {
    if (own.category !== category || own.color !== color) return false
    if (category === "etc") {
      const a = normalizeCategoryDetail(categoryDetail)
      const b = normalizeCategoryDetail(own.categoryDetail)
      if (!a || a !== b) return false
    }
    if (color !== "other") return true
    const a = normalizeColorDetail(colorDetail)
    const b = normalizeColorDetail(own.colorDetail)
    return Boolean(a) && a === b
  })
}
