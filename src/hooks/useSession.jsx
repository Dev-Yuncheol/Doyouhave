import { createContext, useContext, useEffect, useMemo, useState } from "react"
import * as auth from "@/lib/auth"
import {
  clearLegacyStorage,
  getAccessToken,
  saveAccessToken,
  subscribeToUnauthorized,
} from "@/lib/api"

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [restoring, setRestoring] = useState(() => Boolean(getAccessToken()))
  const [pending, setPending] = useState(false)

  useEffect(() => {
    clearLegacyStorage()
    const unsubscribe = subscribeToUnauthorized(() => setUser(null))
    const token = getAccessToken()

    if (!token) {
      setRestoring(false)
      return unsubscribe
    }

    const controller = new AbortController()
    auth
      .getMe(controller.signal)
      .then(({ user: restoredUser }) => setUser(restoredUser))
      .catch((error) => {
        if (error.name !== "AbortError") setUser(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestoring(false)
      })

    return () => {
      controller.abort()
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      pending,
      restoring,
      isLoggedIn: Boolean(user),
      async login(payload) {
        setPending(true)
        try {
          const result = await auth.login(payload)
          saveAccessToken(result.token)
          setUser(result.user)
          return result
        } finally {
          setPending(false)
        }
      },
      async signUp(payload) {
        setPending(true)
        try {
          const result = await auth.signUp(payload)
          saveAccessToken(result.token)
          setUser(result.user)
          return result
        } finally {
          setPending(false)
        }
      },
      logout() {
        saveAccessToken(null)
        setUser(null)
      },
    }),
    [user, pending, restoring],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSession must be used within SessionProvider")
  }
  return context
}
