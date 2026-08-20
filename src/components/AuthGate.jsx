import { Navigate, Outlet } from "react-router-dom"
import { useSession } from "@/hooks/useSession"

export function AuthGate() {
  const { isLoggedIn } = useSession()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <Outlet />
}
