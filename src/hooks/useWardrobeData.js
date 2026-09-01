import { useContext } from "react"
import { WardrobeDataContext } from "@/hooks/wardrobe-data-context"

export function useWardrobeData() {
  const context = useContext(WardrobeDataContext)
  if (!context) throw new Error("useWardrobeData must be used within WardrobeDataProvider")
  return context
}
