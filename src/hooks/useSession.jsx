import { createContext, useContext, useEffect, useMemo, useState } from "react"
import * as auth from "@/lib/auth"
import { analytics, trackFailure } from "@/lib/analytics"
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
    const unsubscribe = subscribeToUnauthorized(() => { analytics.setUser(null); setUser(null) })
    const token = getAccessToken()

    if (!token) {
      setRestoring(false)
      return unsubscribe
    }

    const controller = new AbortController()
    auth
      .getMe(controller.signal)
      .then(({ user: restoredUser }) => {
        if (controller.signal.aborted) return
        analytics.setUser(restoredUser)
        setUser(restoredUser)
      })
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
      acceptSession(result) {
        saveAccessToken(result.token)
        analytics.setUser(result.user)
        analytics.track(result.isNewUser ? "signup_completed" : "login_completed", { auth_method: "google" }, result.isNewUser ? result.user.id : undefined)
        setUser(result.user)
      },
      async login(payload) {
        setPending(true)
        try {
          const result = await auth.login(payload)
          saveAccessToken(result.token)
          analytics.setUser(result.user)
          analytics.track("login_completed", { auth_method: "email" })
          setUser(result.user)
          return result
        } catch (error) {
          trackFailure("login", error)
          throw error
        } finally {
          setPending(false)
        }
      },
      async signUp(payload) {
        setPending(true)
        try {
          const result = await auth.signUp(payload)
          saveAccessToken(result.token)
          analytics.setUser(result.user)
          analytics.track("signup_completed", { auth_method: "email" }, result.user.id)
          setUser(result.user)
          return result
        } catch (error) {
          trackFailure("signup", error)
          throw error
        } finally {
          setPending(false)
        }
      },
      logout() {
        saveAccessToken(null)
        analytics.setUser(null)
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
