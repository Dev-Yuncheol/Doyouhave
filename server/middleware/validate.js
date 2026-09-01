import { AppError } from "../lib/app-error.js"

function validationFields(issues) {
  const fields = {}

  for (const issue of issues) {
    const field = String(issue.path[0] ?? "request")
    fields[field] ??= []
    fields[field].push(issue.message)
  }

  return fields
}

export function validateBody(schema) {
  return validateRequest(schema, "body", "validatedBody")
}

export function validateParams(schema) {
  return validateRequest(schema, "params", "validatedParams")
}

export function validateQuery(schema) {
  return validateRequest(schema, "query", "validatedQuery")
}

function validateRequest(schema, source, target) {
  return function validate(request, _response, next) {
    const input = source === "query"
      ? Object.fromEntries(
          Object.entries(request.query).filter(([key]) => key !== "path"),
        )
      : request[source]
    const result = schema.safeParse(input)

    if (!result.success) {
      next(
        new AppError(
          400,
          "VALIDATION_ERROR",
          "입력값을 확인해 주세요.",
          validationFields(result.error.issues),
        ),
      )
      return
    }

    request[target] = result.data
    next()
  }
}

export function validationError(fields) {
  return new AppError(
    400,
    "VALIDATION_ERROR",
    "입력값을 확인해 주세요.",
    fields,
  )
}
