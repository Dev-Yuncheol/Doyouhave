import { createClient } from "@supabase/supabase-js"
import { AppError } from "./app-error.js"

export async function verifyGoogleAccessToken(accessToken) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new AppError(503, "GOOGLE_AUTH_UNAVAILABLE", "구글 로그인 설정을 확인해 주세요.")
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) },
  })
  // getUser contacts the trusted Auth server; never trust client-supplied profile data.
  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data?.user) {
    throw new AppError(error?.status >= 500 || !error?.status ? 503 : 401,
      "GOOGLE_AUTH_FAILED", "구글 인증을 확인하지 못했습니다. 다시 로그인해 주세요.")
  }
  const user = data.user
  if (!user.email || !user.email_confirmed_at || user.is_anonymous ||
      !user.identities?.some((identity) => identity.provider === "google")) {
    throw new AppError(401, "GOOGLE_AUTH_FAILED", "이메일이 확인된 구글 계정으로 로그인해 주세요.")
  }
  return { id: user.id, email: user.email.trim().toLowerCase() }
}
