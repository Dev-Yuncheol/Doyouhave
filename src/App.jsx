import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthGate } from "@/components/AuthGate"
import { SessionProvider, useSession } from "@/hooks/useSession"
import { WardrobeDataProvider } from "@/hooks/useWardrobeData.jsx"
import { Spinner } from "@/components/ui/spinner"
import { HomePage } from "@/pages/HomePage"
import { LandingPage } from "@/pages/LandingPage"
import { LandingPageV2 } from "@/pages/LandingPageV2"
import { LoginPage } from "@/pages/LoginPage"
import { NewWantPage } from "@/pages/NewWantPage"
import { OwnsPage } from "@/pages/OwnsPage"
import { WantDetailPage } from "@/pages/WantDetailPage"

function RootPage() {
  const { isLoggedIn, restoring } = useSession()
  if (restoring) return <Spinner className="m-auto size-6" />
  return isLoggedIn ? <HomePage /> : <LandingPageV2 />
}

export default function App() {
  return (
    <SessionProvider>
      <WardrobeDataProvider>
        <BrowserRouter>
        <div className="flex min-h-0 flex-1 flex-col">
          <Routes>
            <Route path="/" element={<RootPage />} />
            <Route path="/v1" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AuthGate />}>
              <Route path="/wants/new" element={<NewWantPage />} />
              <Route path="/wants/:id" element={<WantDetailPage />} />
              <Route path="/owns" element={<OwnsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Toaster />
        </BrowserRouter>
      </WardrobeDataProvider>
    </SessionProvider>
  )
}
