import jwt from "jsonwebtoken"
import { AppError } from "./app-error.js"

const TOKEN_CLAIMS = {
  audience: "inni-web",
  issuer: "inni-api",
}

function requireSecret(configuredSecret) {
  const secret = configuredSecret ?? process.env.JWT_SECRET

  if (!secret || secret.length < 32) {
    throw new AppError(
      500,
      "SERVER_MISCONFIGURED",
      "서버 인증 설정을 확인해 주세요.",
    )
  }

  return secret
}

export function signAccessToken(userId, configuredSecret) {
  return jwt.sign({}, requireSecret(configuredSecret), {
    ...TOKEN_CLAIMS,
    algorithm: "HS256",
    expiresIn: "7d",
    subject: userId,
  })
}

export function verifyAccessToken(token, configuredSecret) {
  const payload = jwt.verify(token, requireSecret(configuredSecret), {
    ...TOKEN_CLAIMS,
    algorithms: ["HS256"],
  })

  if (typeof payload !== "object" || typeof payload.sub !== "string") {
    throw new Error("INVALID_TOKEN_SUBJECT")
  }

  return payload
}
