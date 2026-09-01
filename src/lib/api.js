const TOKEN_KEY = "inni_auth_token:v1"
const UNAUTHORIZED_EVENT = "inni:unauthorized"

export class ApiError extends Error {
  constructor(status, error = {}) {
    super(error.message || "요청을 처리하지 못했습니다.")
    this.name = "ApiError"
    this.status = status
    this.code = error.code || "UNKNOWN_ERROR"
    this.fields = error.fields || {}
  }
}

export function getAccessToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveAccessToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    throw new Error("브라우저에 로그인 정보를 저장하지 못했습니다.")
  }
}

export function clearLegacyStorage() {
  try {
    ;["inni_users", "inni_session", "inni_wants", "inni_owns"].forEach((key) =>
      localStorage.removeItem(key),
    )
  } catch {
    // 저장소 접근이 차단되어도 서버 기반 기능은 계속 사용할 수 있습니다.
  }
}

export function subscribeToUnauthorized(listener) {
  window.addEventListener(UNAUTHORIZED_EVENT, listener)
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, listener)
}

export async function apiRequest(path, { body, auth = true, ...options } = {}) {
  const headers = new Headers(options.headers)
  const token = auth ? getAccessToken() : null

  if (body !== undefined) headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)

  let response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (error.name === "AbortError") throw error
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    })
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    if (auth && response.status === 401) {
      saveAccessToken(null)
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    throw new ApiError(response.status, payload?.error)
  }

  return payload
}
