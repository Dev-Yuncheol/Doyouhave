import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"
import { useSession } from "@/hooks/useSession"
import { WardrobeDataContext } from "@/hooks/wardrobe-data-context"
import { apiRequest } from "@/lib/api"

const SAVE_ERROR = "저장하지 못했습니다. 다시 시도해 주세요."
const EMPTY_LIST = []

export function WardrobeDataProvider({ children }) {
  const { user } = useSession()
  const [wants, setWants] = useState([])
  const [owns, setOwns] = useState([])
  const [dataUserId, setDataUserId] = useState(null)
  const [requestUserId, setRequestUserId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!user) {
      return
    }

    const controller = new AbortController()
    async function loadData() {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setRequestUserId(user.id)
      setLoading(true)
      setLoadError("")

      try {
        const [wantResult, ownResult] = await Promise.all([
          apiRequest("/wants", { signal: controller.signal }),
          apiRequest("/owns", { signal: controller.signal }),
        ])
        setWants(wantResult.wants)
        setOwns(ownResult.owns)
        setDataUserId(user.id)
      } catch (error) {
        if (error.name !== "AbortError") setLoadError(error.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadData()

    return () => controller.abort()
  }, [user, revision])

  const runMutation = useCallback(async (action) => {
    setSaving(true)
    try {
      return await action()
    } catch (error) {
      toast.error(error.message || SAVE_ERROR)
      throw error
    } finally {
      setSaving(false)
    }
  }, [])

  const hasCurrentUserData = Boolean(user) && dataUserId === user.id
  const isCurrentRequest = Boolean(user) && requestUserId === user.id
  const visibleWants = hasCurrentUserData ? wants : EMPTY_LIST
  const visibleOwns = hasCurrentUserData ? owns : EMPTY_LIST
  const visibleLoading = Boolean(user) && (!isCurrentRequest || loading)
  const visibleLoadError = isCurrentRequest ? loadError : ""

  const value = useMemo(
    () => ({
      wants: visibleWants,
      owns: visibleOwns,
      loading: visibleLoading,
      saving,
      loadError: visibleLoadError,
      reload: () => setRevision((current) => current + 1),
      createWant: (payload) => runMutation(async () => {
        const { want } = await apiRequest("/wants", { method: "POST", body: payload })
        setWants((current) => [want, ...current])
        return want
      }),
      updateWant: (id, payload) => runMutation(async () => {
        const { want } = await apiRequest(`/wants/${id}`, { method: "PATCH", body: payload })
        setWants((current) => current.map((item) => item.id === id ? want : item))
        return want
      }),
      deleteWant: (id) => runMutation(async () => {
        await apiRequest(`/wants/${id}`, { method: "DELETE" })
        setWants((current) => current.filter((item) => item.id !== id))
      }),
      markBought: (id) => runMutation(async () => {
        const result = await apiRequest(`/wants/${id}/buy`, { method: "POST" })
        setWants((current) => current.map((item) => item.id === id ? result.want : item))
        setOwns((current) => [result.own, ...current.filter((item) => item.id !== result.own.id)])
        return result.want
      }),
      createOwn: (payload) => runMutation(async () => {
        const { own } = await apiRequest("/owns", { method: "POST", body: payload })
        setOwns((current) => [own, ...current])
        return own
      }),
      updateOwn: (id, payload) => runMutation(async () => {
        const { own } = await apiRequest(`/owns/${id}`, { method: "PATCH", body: payload })
        setOwns((current) => current.map((item) => item.id === id ? own : item))
        return own
      }),
      deleteOwn: (id) => runMutation(async () => {
        await apiRequest(`/owns/${id}`, { method: "DELETE" })
        setOwns((current) => current.filter((item) => item.id !== id))
      }),
    }),
    [visibleWants, visibleOwns, visibleLoading, saving, visibleLoadError, runMutation],
  )

  return <WardrobeDataContext.Provider value={value}>{children}</WardrobeDataContext.Provider>
}
