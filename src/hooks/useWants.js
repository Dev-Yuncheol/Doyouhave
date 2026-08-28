import { useMemo, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { wait } from "@/lib/delay"
import { useSession } from "@/hooks/useSession"
import {
  createOwn,
  createWant as saveWant,
  deleteWant as removeWant,
  getWant as readWant,
  getWants as readWants,
  getVersion,
  subscribe,
  updateWant as patchWant,
} from "@/lib/storage"

const SAVE_ERROR = "저장하지 못했습니다. 다시 시도해 주세요."

export function useWants({ status, category } = {}) {
  const { session } = useSession()
  const userId = session?.userId
  const [saving, setSaving] = useState(false)
  const version = useSyncExternalStore(subscribe, getVersion, getVersion)

  const wants = useMemo(() => {
    if (!userId) return []
    return readWants({ userId, status, category })
  }, [userId, status, category, version])

  async function run(action) {
    setSaving(true)
    try {
      await wait(300)
      return action()
    } catch (error) {
      toast.error(SAVE_ERROR)
      throw error
    } finally {
      setSaving(false)
    }
  }

  return {
    wants,
    saving,
    getWant(id) {
      if (!userId) return null
      return readWant(id, userId)
    },
    createWant(payload) {
      return run(() => saveWant({ ...payload, userId }))
    },
    updateWant(id, payload) {
      return run(() => patchWant(id, payload, userId))
    },
    deleteWant(id) {
      return run(() => removeWant(id, userId))
    },
    markBought(want) {
      return run(() => {
        const next = patchWant(want.id, { status: "bought" }, userId)
        createOwn({
          userId,
          title: want.title,
          category: want.category,
          color: want.color,
          colorDetail: want.colorDetail,
          categoryDetail: want.categoryDetail,
          source: "bought",
          fromWantId: want.id,
        })
        return next
      })
    },
    markSkipped(id) {
      return run(() => patchWant(id, { status: "skipped" }, userId))
    },
  }
}
