import { AppError } from "../lib/app-error.js"
import { verifyAccessToken } from "../lib/jwt.js"
import { publicUserSelect } from "../lib/user.js"

function unauthorized() {
  return new AppError(401, "UNAUTHORIZED", "로그인이 필요합니다.")
}

export function createAuthenticate({ database, jwtSecret }) {
  return async function authenticate(request, _response, next) {
    const authorization = request.get("authorization")
    const match = authorization?.match(/^Bearer\s+(.+)$/i)

    if (!match) {
      next(unauthorized())
      return
    }

    let payload
    try {
      payload = verifyAccessToken(match[1], jwtSecret)
    } catch (error) {
      if (error instanceof AppError && error.status === 500) {
        next(error)
        return
      }
      next(unauthorized())
      return
    }

    try {
      const user = await database.user.findUnique({
        where: { id: payload.sub },
        select: publicUserSelect,
      })

      if (!user) {
        next(unauthorized())
        return
      }

      request.user = user
      next()
    } catch (error) {
      next(error)
    }
  }
}
