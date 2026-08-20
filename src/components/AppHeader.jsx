import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useSession } from "@/hooks/useSession"
import { APP_NAME } from "@/lib/constants"

export function AppHeader({ backTo, backLabel = "뒤로", showLogout = true }) {
  const { logout } = useSession()

  return (
    <header
      className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b bg-card px-4"
      style={{
        height: "calc(56px + env(safe-area-inset-top))",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <Link to="/" className="text-xl font-semibold leading-[1.3]">
        {APP_NAME}
      </Link>
      <nav className="flex items-center gap-1 text-[13px] text-muted-foreground">
        {backTo ? (
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link to={backTo}>{backLabel}</Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link to="/owns">보유</Link>
          </Button>
        )}
        {showLogout ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={logout}
          >
            로그아웃
          </Button>
        ) : null}
      </nav>
    </header>
  )
}
