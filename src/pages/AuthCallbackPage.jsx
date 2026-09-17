import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useSession } from "@/hooks/useSession"
import { loginWithGoogle } from "@/lib/auth"
import { clearGoogleSession, exchangeGoogleCallback } from "@/lib/google-auth"

export function AuthCallbackPage() {
  const { acceptSession } = useSession()
  const navigate = useNavigate()
  const started = useRef(false)
  const token = useRef(null)
  const [error, setError] = useState("")
  const [linkRequired, setLinkRequired] = useState(false)
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(true)

  const finish = useCallback(async (accessToken, existingPassword) => {
    setPending(true)
    setError("")
    try {
      const result = await loginWithGoogle(accessToken, existingPassword)
      acceptSession(result)
      token.current = null
      await clearGoogleSession().catch(() => {})
      navigate("/", { replace: true })
    } catch (failure) {
      if (failure.code === "GOOGLE_LINK_REQUIRED") setLinkRequired(true)
      setError(failure.message || "로그인을 완료하지 못했습니다.")
    } finally {
      setPending(false)
    }
  }, [acceptSession, navigate])

  useEffect(() => {
    if (started.current) return
    started.current = true
    exchangeGoogleCallback().then((accessToken) => {
      token.current = accessToken
      return finish(accessToken)
    }).catch((failure) => { setError(failure.message); setPending(false) })
  }, [finish])

  return <div className="flex flex-1 flex-col justify-center gap-4 px-5 py-8">
    <h1 className="text-center text-lg font-semibold">{linkRequired ? "기존 계정 연결" : "구글 로그인"}</h1>
    {pending && <p role="status" className="flex items-center justify-center gap-2"><Spinner />로그인을 확인하고 있어요</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {linkRequired && <form className="flex flex-col gap-3" onSubmit={(event) => {
      event.preventDefault()
      void finish(token.current, password)
    }}>
      <label htmlFor="link-password" className="text-sm">기존 계정 비밀번호</label>
      <Input id="link-password" type="password" autoComplete="current-password" required
        value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} />
      <Button disabled={pending}>구글 계정 연결하고 로그인</Button>
    </form>}
    {!pending && <Link to="/login" className="text-center text-sm underline" onClick={() => {
      token.current = null
      void clearGoogleSession().catch(() => {})
    }}>로그인 화면으로 돌아가기</Link>}
  </div>
}
