import { useMemo } from "react"
import { useWardrobeData } from "@/hooks/useWardrobeData.js"

export function useWants({ status, category } = {}) {
  const data = useWardrobeData()
  const wants = useMemo(
    () =>
      data.wants
        .filter((want) => !status || want.status === status)
        .filter((want) => !category || want.category === category),
    [data.wants, status, category],
  )

  return {
    wants,
    loading: data.loading,
    loadError: data.loadError,
    reload: data.reload,
    saving: data.saving,
    getWant: (id) => data.wants.find((want) => want.id === id) ?? null,
    createWant: data.createWant,
    updateWant: data.updateWant,
    deleteWant: data.deleteWant,
    markBought: (want) => data.markBought(want.id),
    markSkipped: (id) => data.updateWant(id, { status: "skipped" }),
  }
}
