import express from "express"
import { prisma } from "./lib/prisma.js"
import { AppError } from "./lib/app-error.js"
import { openApiDocument } from "./openapi.js"
import { createAuthRouter } from "./routes/auth.js"
import { createOwnsRouter } from "./routes/owns.js"
import { createWantsRouter } from "./routes/wants.js"
import { errorHandler } from "./middleware/error-handler.js"
import { createAuthRateLimiters } from "./middleware/rate-limit.js"

export function createApp({
  database = prisma,
  jwtSecret,
  bcryptRounds = 12,
  passwordService,
  authRateLimiters = createAuthRateLimiters({
    enabled: process.env.NODE_ENV !== "test",
  }),
} = {}) {
  const app = express()

  app.disable("x-powered-by")
  app.set("trust proxy", 1)
  app.use(express.json({ limit: "100kb" }))

  app.get("/api/health", async (_request, response) => {
    try {
      await database.$queryRaw`SELECT 1`
      response.json({ status: "ok", database: "ok" })
    } catch {
      response.status(503).json({ status: "unavailable", database: "error" })
    }
  })

  app.get("/api/openapi.json", (_request, response) => {
    response.json(openApiDocument)
  })
  app.get("/api/docs", (_request, response) => {
    response.type("html").send(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>있니 API 문서</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>SwaggerUIBundle({ url: "/api/openapi.json", dom_id: "#swagger-ui", deepLinking: true });</script>
  </body>
</html>`)
  })

  app.use(
    "/api/auth",
    createAuthRouter({
      database,
      jwtSecret,
      bcryptRounds,
      passwordService,
      rateLimiters: authRateLimiters,
    }),
  )
  app.use("/api/wants", createWantsRouter({ database, jwtSecret }))
  app.use("/api/owns", createOwnsRouter({ database, jwtSecret }))

  app.use((_request, _response, next) => {
    next(new AppError(404, "NOT_FOUND", "요청한 API를 찾을 수 없습니다."))
  })

  app.use(errorHandler)

  return app
}

export default createApp()
