import { createContext, useContext, useMemo, useState } from "react"
import * as auth from "@/lib/auth"
import { wait } from "@/lib/delay"
import { getUsers } from "@/lib/storage"

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => auth.getSession())
  const [pending, setPending] = useState(false)

  const user = useMemo(() => {
    if (!session?.userId) return null
    return getUsers().find((item) => item.id === session.userId) ?? null
  }, [session])

  const value = useMemo(
    () => ({
      session,
      user,
      pending,
      isLoggedIn: Boolean(session?.userId),
      async login(payload) {
        setPending(true)
        try {
          await wait(300)
          const next = auth.login(payload)
          setSession(next)
          return next
        } finally {
          setPending(false)
        }
      },
      async signUp(payload) {
        setPending(true)
        try {
          await wait(300)
          const next = auth.signUp(payload)
          setSession(next)
          return next
        } finally {
          setPending(false)
        }
      },
      logout() {
        auth.logout()
        setSession(null)
      },
    }),
    [session, user, pending],
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
