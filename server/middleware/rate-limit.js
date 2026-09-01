const FIFTEEN_MINUTES = 15 * 60 * 1000

function noLimit(_request, _response, next) {
  next()
}

export function createFixedWindowRateLimiter({
  windowMs = FIFTEEN_MINUTES,
  max,
  code,
  message,
  now = Date.now,
} = {}) {
  if (!Number.isInteger(max) || max < 1) {
    throw new TypeError("Rate limit max must be a positive integer.")
  }

  const clients = new Map()

  return function rateLimit(request, response, next) {
    const currentTime = now()
    const key = request.ip
    let client = clients.get(key)

    if (!client || client.resetAt <= currentTime) {
      client = { count: 0, resetAt: currentTime + windowMs }
      clients.set(key, client)
    }

    const remaining = Math.max(0, max - client.count - 1)
    response.set({
      "RateLimit-Limit": String(max),
      "RateLimit-Remaining": String(remaining),
      "RateLimit-Reset": String(
        Math.max(1, Math.ceil((client.resetAt - currentTime) / 1000)),
      ),
    })

    if (client.count >= max) {
      response
        .set(
          "Retry-After",
          String(Math.max(1, Math.ceil((client.resetAt - currentTime) / 1000))),
        )
        .status(429)
        .json({ error: { code, message } })
      return
    }

    client.count += 1
    next()
  }
}

export function createAuthRateLimiters({ enabled = true } = {}) {
  if (!enabled) return { signup: noLimit, login: noLimit }

  return {
    signup: createFixedWindowRateLimiter({
      max: 5,
      code: "SIGNUP_RATE_LIMITED",
      message: "회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    }),
    login: createFixedWindowRateLimiter({
      max: 10,
      code: "LOGIN_RATE_LIMITED",
      message: "로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    }),
  }
}
