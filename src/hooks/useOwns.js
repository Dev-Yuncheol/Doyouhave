import { useMemo } from "react"
import { useWardrobeData } from "@/hooks/useWardrobeData.js"
import { findSimilarOwns } from "@/lib/match"

export function useOwns({ category, color } = {}) {
  const data = useWardrobeData()
  const owns = useMemo(
    () =>
      data.owns
        .filter((own) => !category || own.category === category)
        .filter((own) => !color || own.color === color),
    [data.owns, category, color],
  )

  return {
    owns,
    allOwns: data.owns,
    loading: data.loading,
    loadError: data.loadError,
    reload: data.reload,
    saving: data.saving,
    similar: (query) => findSimilarOwns(data.owns, query),
    createOwn: data.createOwn,
    updateOwn: data.updateOwn,
    deleteOwn: data.deleteOwn,
  }
}
