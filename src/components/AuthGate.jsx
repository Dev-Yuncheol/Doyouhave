import { Navigate, Outlet } from "react-router-dom"
import { useSession } from "@/hooks/useSession"

export function AuthGate() {
  const { isLoggedIn, restoring } = useSession()
  if (restoring) return null
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <Outlet />
}
