import { AppError } from "../lib/app-error.js"

export function errorHandler(error, _request, response, _next) {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "입력값을 확인해 주세요.",
        fields: {},
      },
    })
    return
  }

  if (error instanceof AppError) {
    const body = {
      code: error.code,
      message: error.message,
    }

    if (error.fields) body.fields = error.fields

    response.status(error.status).json({ error: body })
    return
  }

  console.error(error)
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    },
  })
}
