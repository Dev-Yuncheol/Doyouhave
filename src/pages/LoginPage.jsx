import { useState } from "react"
import { Link, Navigate, useSearchParams } from "react-router-dom"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useSession } from "@/hooks/useSession"
import { APP_NAME } from "@/lib/constants"
import { startGoogleLogin } from "@/lib/google-auth"

export function LoginPage() {
  const { isLoggedIn, login, signUp, pending } = useSession()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(
    searchParams.get("mode") === "signup" ? "signup" : "login",
  )
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState("")
  const [googlePending, setGooglePending] = useState(false)

  if (isLoggedIn) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    const next = {}
    if (!email.trim()) next.email = "이메일을 적어 주세요"
    if (!password) next.password = "비밀번호를 적어 주세요"
    setErrors(next)
    setFormError("")
    if (Object.keys(next).length) return

    try {
      if (mode === "signup") {
        await signUp({ email, password })
      } else {
        await login({ email, password })
      }
    } catch (error) {
      if (error.code === "EMAIL_CONFLICT") {
        setFormError("이미 있는 이메일입니다")
        return
      }
      if (error.code === "INVALID_CREDENTIALS") {
        setFormError("이메일 또는 비밀번호가 맞지 않습니다")
        return
      }
      if (error.code === "VALIDATION_ERROR") {
        setErrors({
          email: error.fields?.email?.[0],
          password: error.fields?.password?.[0],
        })
      }
      setFormError(error.message || "요청을 처리하지 못했습니다.")
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-4 overflow-y-auto px-5 py-8">
      <div className="text-center">
        <Link to="/" className="text-xl font-semibold leading-[1.3]">
          {APP_NAME}
        </Link>
        <p className="text-[13px] text-muted-foreground">
          집에 비슷한 옷 있니?
        </p>
      </div>

      {formError ? (
        <Alert variant="destructive">
          <AlertTitle>{formError}</AlertTitle>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldGroup className="gap-4">
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="email">이메일</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              aria-invalid={Boolean(errors.email)}
              className="h-10"
            />
            <FieldError>{errors.email}</FieldError>
          </Field>
          <Field data-invalid={errors.password ? true : undefined}>
            <FieldLabel htmlFor="password">비밀번호</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setErrors((prev) => ({ ...prev, password: undefined }))
              }}
              aria-invalid={Boolean(errors.password)}
              className="h-10"
            />
            <FieldError>{errors.password}</FieldError>
          </Field>
        </FieldGroup>

        <Button type="submit" className="h-10 w-full" disabled={pending || googlePending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {mode === "signup" ? "회원가입" : "로그인"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />또는<span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" className="h-10 w-full" disabled={pending || googlePending}
        onClick={async () => {
          setFormError("")
          setGooglePending(true)
          try { await startGoogleLogin() }
          catch (error) { setFormError(error.message); setGooglePending(false) }
        }}>
        {googlePending ? <Spinner /> : <svg aria-hidden="true" viewBox="0 0 48 48" className="size-4">
          <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z" />
          <path fill="#34A853" d="M24 44c5.4 0 9.9-1.8 13.2-4.8l-6.6-5c-1.8 1.2-4 1.9-6.6 1.9-5.2 0-9.6-3.5-11.2-8.2H6v5.2A20 20 0 0 0 24 44Z" />
          <path fill="#FBBC05" d="M12.8 27.9a12 12 0 0 1 0-7.8v-5.2H6a20 20 0 0 0 0 18.2l6.8-5.2Z" />
          <path fill="#EA4335" d="M24 11.9c2.9 0 5.5 1 7.5 2.9l5.6-5.6A19 19 0 0 0 24 4 20 20 0 0 0 6 14.9l6.8 5.2A11.8 11.8 0 0 1 24 11.9Z" />
        </svg>}
        Google로 계속하기
      </Button>

      <p className="text-center text-[13px] text-muted-foreground">
        {mode === "login" ? (
          <>
            계정이 없나요?{" "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => {
                setMode("signup")
                setFormError("")
              }}
            >
              회원가입
            </button>
          </>
        ) : (
          <>
            이미 있나요?{" "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => {
                setMode("login")
                setFormError("")
              }}
            >
              로그인
            </button>
          </>
        )}
      </p>
    </div>
  )
}
