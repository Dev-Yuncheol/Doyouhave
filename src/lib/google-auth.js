import { createClient } from "@supabase/supabase-js"

let client
export function getGoogleAuthClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error("구글 로그인 설정을 확인해 주세요.")
  client ??= createClient(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      autoRefreshToken: false,
      persistSession: true,
      storage: window.sessionStorage,
      storageKey: "inni_google_auth",
    },
  })
  return client
}

export async function startGoogleLogin() {
  callbackPromise = undefined
  const { error } = await getGoogleAuthClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) throw new Error("구글 로그인을 시작하지 못했습니다. 다시 시도해 주세요.")
}

let callbackPromise
export function exchangeGoogleCallback() {
  // Share one exchange across React StrictMode's repeated effects.
  callbackPromise ??= (async () => {
    const params = new URLSearchParams(window.location.search)
    window.history.replaceState(null, "", "/auth/callback")
    if (params.has("error") || !params.get("code")) {
      throw new Error("구글 로그인이 취소되었거나 만료되었습니다. 다시 시도해 주세요.")
    }
    const { data, error } = await getGoogleAuthClient().auth.exchangeCodeForSession(params.get("code"))
    if (error || !data.session) throw new Error("구글 인증이 만료되었습니다. 다시 시도해 주세요.")
    return data.session.access_token
  })()
  return callbackPromise
}

export async function clearGoogleSession() {
  if (client) await client.auth.signOut({ scope: "local" })
}
