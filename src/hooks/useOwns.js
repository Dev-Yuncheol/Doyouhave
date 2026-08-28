import { useMemo, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"
import { wait } from "@/lib/delay"
import { useSession } from "@/hooks/useSession"
import { findSimilarOwns } from "@/lib/match"
import {
  createOwn as saveOwn,
  deleteOwn as removeOwn,
  getOwns as readOwns,
  getVersion,
  subscribe,
  updateOwn as patchOwn,
} from "@/lib/storage"

const SAVE_ERROR = "저장하지 못했습니다. 다시 시도해 주세요."

export function useOwns({ category, color } = {}) {
  const { session } = useSession()
  const userId = session?.userId
  const [saving, setSaving] = useState(false)
  const version = useSyncExternalStore(subscribe, getVersion, getVersion)

  const owns = useMemo(() => {
    if (!userId) return []
    return readOwns({ userId, category, color })
  }, [userId, category, color, version])

  const allOwns = useMemo(() => {
    if (!userId) return []
    return readOwns({ userId })
  }, [userId, version])

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
    owns,
    allOwns,
    saving,
    similar: (query) => findSimilarOwns(allOwns, query),
    createOwn(payload) {
      return run(() => saveOwn({ ...payload, userId }))
    },
    updateOwn(id, payload) {
      return run(() => patchOwn(id, payload, userId))
    },
    deleteOwn(id) {
      return run(() => removeOwn(id, userId))
    },
  }
}
