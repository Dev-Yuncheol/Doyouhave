import { Router } from "express"
import bcrypt from "bcrypt"
import { z } from "zod"
import { AppError } from "../lib/app-error.js"
import { signAccessToken } from "../lib/jwt.js"
import { publicUserSelect, serializeUser } from "../lib/user.js"
import { createAuthenticate } from "../middleware/authenticate.js"
import { validateBody } from "../middleware/validate.js"

const emailSchema = z
  .string({ error: "이메일을 입력해 주세요." })
  .trim()
  .max(320, "이메일은 320자 이하여야 합니다.")
  .email("올바른 이메일을 입력해 주세요.")
  .transform((email) => email.toLowerCase())

const passwordSchema = z
  .string({ error: "비밀번호를 입력해 주세요." })
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
    message: "비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.",
  })

const loginPasswordSchema = z
  .string({ error: "비밀번호를 입력해 주세요." })
  .min(1, "비밀번호를 입력해 주세요.")
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
    message: "비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.",
  })

const signupSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
})

const loginSchema = z.strictObject({
  email: emailSchema,
  password: loginPasswordSchema,
})

function invalidCredentials() {
  return new AppError(
    401,
    "INVALID_CREDENTIALS",
    "이메일 또는 비밀번호가 올바르지 않습니다.",
  )
}

function authResponse(user, jwtSecret) {
  return {
    user: serializeUser(user),
    token: signAccessToken(user.id, jwtSecret),
  }
}

export function createAuthRouter({
  database,
  jwtSecret,
  bcryptRounds,
  passwordService = bcrypt,
}) {
  const router = Router()
  const authenticate = createAuthenticate({ database, jwtSecret })

  router.post("/signup", validateBody(signupSchema), async (request, response) => {
    const { email, password } = request.validatedBody
    const existingUser = await database.user.findUnique({ where: { email } })

    if (existingUser) {
      throw new AppError(
        409,
        "EMAIL_CONFLICT",
        "이미 가입된 이메일입니다.",
      )
    }

    const passwordHash = await passwordService.hash(password, bcryptRounds)

    let user
    try {
      user = await database.user.create({
        data: { email, passwordHash },
        select: publicUserSelect,
      })
    } catch (error) {
      if (error?.code === "P2002") {
        throw new AppError(
          409,
          "EMAIL_CONFLICT",
          "이미 가입된 이메일입니다.",
        )
      }
      throw error
    }

    response.status(201).json(authResponse(user, jwtSecret))
  })

  router.post("/login", validateBody(loginSchema), async (request, response) => {
    const { email, password } = request.validatedBody
    const user = await database.user.findUnique({ where: { email } })

    if (!user || !(await passwordService.compare(password, user.passwordHash))) {
      throw invalidCredentials()
    }

    response.json(authResponse(user, jwtSecret))
  })

  router.get("/me", authenticate, (request, response) => {
    response.json({ user: serializeUser(request.user) })
  })

  return router
}
