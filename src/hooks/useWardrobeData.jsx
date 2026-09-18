import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"
import { useSession } from "@/hooks/useSession"
import { WardrobeDataContext } from "@/hooks/wardrobe-data-context"
import { apiRequest, fetchCollection } from "@/lib/api"
import { createItemSaver } from "@/lib/save-item"

const SAVE_ERROR = "저장하지 못했습니다. 다시 시도해 주세요."
const EMPTY_LIST = []

export function WardrobeDataProvider({ children }) {
  const { user } = useSession()
  const [saveItem] = useState(() => createItemSaver())
  const [membership, setMembership] = useState(null)
  const [now, setNow] = useState(Date.now)
  const [wants, setWants] = useState([])
  const [owns, setOwns] = useState([])
  const [dataUserId, setDataUserId] = useState(null)
  const [requestUserId, setRequestUserId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    const refresh = () => setRevision((current) => current + 1)
    window.addEventListener("focus", refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", refresh)
    }
  }, [])

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
        const [wantResult, ownResult, session] = await Promise.all([
          fetchCollection("/wants", "wants", { signal: controller.signal }),
          fetchCollection("/owns", "owns", { signal: controller.signal }),
          apiRequest("/auth/me", { signal: controller.signal }),
        ])
        if (controller.signal.aborted) return
        setWants(wantResult)
        setOwns(ownResult)
        setMembership(session.user.membership)
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
      if (error.code === "TRIAL_SAVE_LIMIT_REACHED") setRevision((current) => current + 1)
      throw error
    } finally {
      setSaving(false)
    }
  }, [])

  const hasCurrentUserData = Boolean(user) && dataUserId === user.id
  const isCurrentRequest = Boolean(user) && requestUserId === user.id
  const visibleWants = useMemo(() => hasCurrentUserData ? wants.filter((item) => !item.expiresAt || Date.parse(item.expiresAt) > now) : EMPTY_LIST, [hasCurrentUserData, wants, now])
  const visibleOwns = useMemo(() => hasCurrentUserData ? owns.filter((item) => !item.expiresAt || Date.parse(item.expiresAt) > now) : EMPTY_LIST, [hasCurrentUserData, owns, now])
  const visibleLoading = Boolean(user) && (!isCurrentRequest || loading)
  const visibleLoadError = isCurrentRequest ? loadError : ""

  const value = useMemo(
    () => ({
      now,
      membership: hasCurrentUserData ? membership : user?.membership,
      wants: visibleWants,
      owns: visibleOwns,
      loading: visibleLoading,
      saving,
      loadError: visibleLoadError,
      reload: () => setRevision((current) => current + 1),
      createWant: (payload) => runMutation(async () => {
        const { want, membership: updatedMembership } = await saveItem(user.id, "/wants", payload)
        setMembership(updatedMembership)
        setWants((current) => [want, ...current.filter((item) => item.id !== want.id)])
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
        toast.success(result.created ? "보유 의류에 담았어요" : "이미 담겨 있어요")
        return result.want
      }),
      createOwn: (payload) => runMutation(async () => {
        const { own, membership: updatedMembership } = await saveItem(user.id, "/owns", payload)
        setMembership(updatedMembership)
        setOwns((current) => [own, ...current.filter((item) => item.id !== own.id)])
        return own
      }),
      updateOwn: (id, payload) => runMutation(async () => {
        const { own } = await apiRequest(`/owns/${id}`, { method: "PATCH", body: payload })
        setOwns((current) => current.map((item) => item.id === id ? own : item))
        return own
      }),
      deleteOwn: (id) => runMutation(async () => {
        const fromWantId = visibleOwns.find((item) => item.id === id)?.fromWantId
        await apiRequest(`/owns/${id}`, { method: "DELETE" })
        setOwns((current) => current.filter((item) => item.id !== id))
        if (fromWantId) {
          setWants((current) => current.filter((item) => item.id !== fromWantId))
        }
      }),
    }),
    [visibleWants, visibleOwns, visibleLoading, saving, visibleLoadError, runMutation, membership, hasCurrentUserData, user, saveItem, now],
  )

  return <WardrobeDataContext.Provider value={value}>{children}</WardrobeDataContext.Provider>
}
