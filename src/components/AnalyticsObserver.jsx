import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { useSession } from "@/hooks/useSession"
import { analytics } from "@/lib/analytics"
import { pageName } from "@/lib/analytics-core"

export function AnalyticsObserver() {
  const location = useLocation()
  const { user, restoring } = useSession()
  const previous = useRef(null)
  useEffect(() => {
    if (restoring) return
    const name = pageName(location.pathname, Boolean(user))
    if (!name || (!user && ["want_form", "want_detail", "owns"].includes(name))) return
    const signature = `${location.key}:${name}:${user?.id || "anonymous"}`
    if (previous.current === signature) return
    previous.current = signature
    analytics.setUser(user)
    analytics.track("page_viewed", { page_name: name, is_logged_in: Boolean(user) })
    if (name === "want_form") analytics.track("want_form_viewed", { entry_point: "want_form" })
  }, [location.key, location.pathname, user, restoring])
  return null
}
