const categories = ["top", "bottom", "outer", "shoes", "bag", "etc"]
const colors = ["black", "white", "gray", "navy", "beige", "brown", "other"]

const errorResponses = {
  400: { $ref: "#/components/responses/ValidationError" },
  401: { $ref: "#/components/responses/Unauthorized" },
}

const idParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
}

const paginationParameters = [
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
  { name: "cursor", in: "query", description: "이전 응답의 nextCursor. 동일 사용자와 필터 안에서 사용하며 삭제된 커서는 400을 반환합니다.", schema: { type: "string", format: "uuid" } },
]
const nextCursorProperty = { type: ["string", "null"], format: "uuid" }
const saveKeyParameter = {
  name: "Idempotency-Key", in: "header", required: false,
  description: "같은 저장 재시도에는 같은 키를 사용합니다. 다른 내용에 재사용하면 409입니다. 생략하면 매번 새 저장입니다.",
  schema: { type: "string", pattern: "^[A-Za-z0-9_-]{1,128}$" },
}
const saveResponses = (name, schema) => {
  const result = { type: "object", required: [name, "membership"], properties: {
    [name]: { $ref: `#/components/schemas/${schema}` }, membership: { $ref: "#/components/schemas/Membership" },
  } }
  return {
    200: jsonResponse("동일 저장 요청 재시도", result),
    201: jsonResponse("신규 저장 성공", result),
    403: jsonResponse("TRIAL_SAVE_LIMIT_REACHED: 일반 회원 누적 50회 소진", { $ref: "#/components/schemas/Error" }),
    409: jsonResponse("IDEMPOTENCY_CONFLICT 또는 SAVE_NO_LONGER_AVAILABLE", { $ref: "#/components/schemas/Error" }),
    ...errorResponses,
  }
}
const purchaseResult = {
  type: "object", required: ["want", "own", "created"],
  properties: {
    want: { $ref: "#/components/schemas/Want" },
    own: { $ref: "#/components/schemas/Own" },
    created: { type: "boolean" },
  },
}

const itemProperties = {
  url: { type: ["string", "null"], format: "uri", maxLength: 2048 },
  price: { type: ["integer", "null"], minimum: 0, maximum: 2147483647 },
  note: { type: ["string", "null"], maxLength: 2000 },
  title: { type: "string", minLength: 1, maxLength: 120, example: "검은 재킷" },
  category: { type: "string", enum: categories, example: "outer" },
  categoryDetail: { type: ["string", "null"], maxLength: 80, example: null },
  color: { type: "string", enum: colors, example: "black" },
  colorDetail: { type: ["string", "null"], maxLength: 80, example: null },
}

const jsonBody = (schema) => ({
  required: true,
  content: { "application/json": { schema } },
})

const jsonResponse = (description, schema) => ({
  description,
  content: { "application/json": { schema } },
})

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "있니 API",
    version: "1.0.0",
    description: "구매 후보와 보유 의류를 관리하는 있니(Inni) MVP REST API",
  },
  servers: [{ url: "/", description: "현재 호스트" }],
  tags: [
    { name: "System", description: "상태 및 문서" },
    { name: "Auth", description: "회원가입과 인증" },
    { name: "Wants", description: "구매 후보" },
    { name: "Owns", description: "보유 의류" },
  ],
  paths: {
    "/api/auth/google": {
      post: {
        tags: ["Auth"], summary: "Supabase 구글 인증 및 기존 계정 연결", security: [],
        requestBody: jsonBody({
          type: "object", additionalProperties: false, required: ["accessToken"],
          properties: {
            accessToken: { type: "string", minLength: 1, maxLength: 16384, description: "Supabase OAuth access token" },
            password: { type: "string", description: "GOOGLE_LINK_REQUIRED 응답 시 기존 계정 비밀번호 (최대 72 UTF-8 바이트)" },
          },
        }),
        responses: {
          200: jsonResponse("로그인 완료", { $ref: "#/components/schemas/AuthResult" }),
          ...errorResponses,
          409: { description: "GOOGLE_LINK_REQUIRED: 비밀번호 확인 필요 / GOOGLE_LINK_CONFLICT: 다른 계정 연결됨" },
          429: { $ref: "#/components/responses/RateLimited" },
          503: { description: "Supabase 설정 누락 또는 인증 서비스 연결 실패" },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "서버 상태 확인",
        security: [],
        responses: {
          200: jsonResponse("정상", {
            type: "object",
            required: ["status", "database"],
            properties: {
              status: { type: "string", const: "ok" },
              database: { type: "string", const: "ok" },
            },
          }),
          503: jsonResponse("데이터베이스 연결 불가", {
            type: "object",
            required: ["status", "database"],
            properties: {
              status: { type: "string", const: "unavailable" },
              database: { type: "string", const: "error" },
            },
          }),
        },
      },
    },
    "/api/auth/signup": {
      post: {
        tags: ["Auth"], summary: "회원가입", security: [],
        requestBody: jsonBody({ $ref: "#/components/schemas/Credentials" }),
        responses: {
          201: jsonResponse("가입 완료", { $ref: "#/components/schemas/AuthResult" }),
          400: errorResponses[400],
          409: { $ref: "#/components/responses/EmailConflict" },
          429: { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"], summary: "로그인", security: [],
        requestBody: jsonBody({ $ref: "#/components/schemas/Credentials" }),
        responses: {
          200: jsonResponse("로그인 완료", { $ref: "#/components/schemas/AuthResult" }),
          400: errorResponses[400],
          401: { $ref: "#/components/responses/InvalidCredentials" },
          429: { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"], summary: "현재 사용자 조회",
        responses: {
          200: jsonResponse("현재 사용자", {
            type: "object", required: ["user"],
            properties: { user: { $ref: "#/components/schemas/User" } },
          }),
          401: errorResponses[401],
        },
      },
      delete: {
        tags: ["Auth"],
        summary: "현재 사용자 계정 삭제",
        description: "인증된 본인의 계정과 연결된 구매 후보 및 보유 의류를 삭제합니다.",
        responses: {
          204: { description: "계정 삭제 완료" },
          401: errorResponses[401],
        },
      },
    },
    "/api/wants": {
      get: {
        tags: ["Wants"], summary: "구매 후보 목록",
        parameters: [
          ...paginationParameters,
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "bought", "skipped"] } },
          { name: "category", in: "query", schema: { type: "string", enum: categories } },
        ],
        responses: {
          200: jsonResponse("후보 목록", {
            type: "object", required: ["wants", "nextCursor"],
            properties: { wants: { type: "array", items: { $ref: "#/components/schemas/Want" } }, nextCursor: nextCursorProperty },
          }),
          ...errorResponses,
        },
      },
      post: {
        tags: ["Wants"], summary: "구매 후보 생성",
        parameters: [saveKeyParameter],
        requestBody: jsonBody({ $ref: "#/components/schemas/CreateWant" }),
        responses: saveResponses("want", "Want"),
      },
    },
    "/api/wants/{id}": {
      get: {
        tags: ["Wants"], summary: "구매 후보 상세", parameters: [idParameter],
        responses: {
          200: jsonResponse("후보 상세", {
            type: "object", required: ["want"],
            properties: { want: { $ref: "#/components/schemas/Want" } },
          }),
          ...errorResponses,
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Wants"], summary: "구매 후보 수정", parameters: [idParameter],
        requestBody: jsonBody({ $ref: "#/components/schemas/UpdateWant" }),
        responses: {
          200: jsonResponse("수정 완료", {
            type: "object", required: ["want"],
            properties: { want: { $ref: "#/components/schemas/Want" } },
          }),
          ...errorResponses,
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
      delete: {
        tags: ["Wants"], summary: "구매 후보 삭제", parameters: [idParameter],
        description: "구매 완료 후보는 409로 거절합니다. 연결된 보유 의류에서 삭제해야 합니다.",
        responses: {
          204: { description: "삭제 완료" },
          400: errorResponses[400], 401: errorResponses[401],
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/wants/{id}/buy": {
      post: {
        tags: ["Wants"], summary: "구매 완료 처리", description: "후보를 구매 완료로 바꾸고 보유 의류를 원자적으로 생성합니다.",
        parameters: [idParameter],
        responses: {
          200: jsonResponse("이미 구매 완료됨 (created: false)", purchaseResult),
          201: {
            ...jsonResponse("보유 의류 생성 완료 (created: true)", purchaseResult),
            headers: { Location: { description: "생성된 보유 의류 주소", schema: { type: "string", example: "/api/owns/00000000-0000-4000-8000-000000000001" } } },
          },
          ...errorResponses,
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/owns": {
      get: {
        tags: ["Owns"], summary: "보유 의류 목록",
        parameters: [
          ...paginationParameters,
          { name: "category", in: "query", schema: { type: "string", enum: categories } },
          { name: "color", in: "query", schema: { type: "string", enum: colors } },
        ],
        responses: {
          200: jsonResponse("보유 목록", {
            type: "object", required: ["owns", "nextCursor"],
            properties: { owns: { type: "array", items: { $ref: "#/components/schemas/Own" } }, nextCursor: nextCursorProperty },
          }),
          ...errorResponses,
        },
      },
      post: {
        tags: ["Owns"], summary: "보유 의류 생성",
        parameters: [saveKeyParameter],
        requestBody: jsonBody({ $ref: "#/components/schemas/CreateOwn" }),
        responses: saveResponses("own", "Own"),
      },
    },
    "/api/owns/{id}": {
      get: {
        tags: ["Owns"], summary: "보유 의류 상세", parameters: [idParameter],
        responses: {
          200: jsonResponse("보유 상세", { type: "object", required: ["own"], properties: { own: { $ref: "#/components/schemas/Own" } } }),
          ...errorResponses,
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Owns"], summary: "보유 의류 수정", parameters: [idParameter],
        requestBody: jsonBody({ $ref: "#/components/schemas/UpdateOwn" }),
        responses: {
          200: jsonResponse("수정 완료", {
            type: "object", required: ["own"],
            properties: { own: { $ref: "#/components/schemas/Own" } },
          }),
          ...errorResponses,
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Owns"], summary: "보유 의류 삭제", parameters: [idParameter],
        description: "연결된 구매 후보 기록이 있으면 보유 의류와 함께 삭제합니다.",
        responses: {
          204: { description: "삭제 완료" },
          400: errorResponses[400], 401: errorResponses[401],
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Membership: {
        type: "object", required: ["plan", "trialSaveCount", "saveLimit", "savesRemaining", "retentionDays", "canSave"],
        properties: {
          plan: { type: "string", enum: ["FREE", "PAID"] },
          trialSaveCount: { type: "integer", minimum: 0, description: "삭제/만료/유료 전환으로 초기화되지 않는 누적 체험 저장 횟수" },
          saveLimit: { type: ["integer", "null"], enum: [50, null] },
          savesRemaining: { type: ["integer", "null"], minimum: 0 },
          retentionDays: { type: ["integer", "null"], enum: [30, null] },
          canSave: { type: "boolean" },
        },
      },
      User: {
        type: "object", required: ["id", "email", "createdAt", "updatedAt", "membership"],
        properties: {
          membership: { $ref: "#/components/schemas/Membership" },
          id: { type: "string", format: "uuid" }, email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
        },
      },
      Credentials: {
        type: "object", additionalProperties: false, required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", maxLength: 320 },
          password: { type: "string", format: "password", minLength: 8, maxLength: 72 },
        },
      },
      AuthResult: {
        type: "object", required: ["user", "token"],
        properties: { user: { $ref: "#/components/schemas/User" }, token: { type: "string" } },
      },
      CreateWant: {
        type: "object", additionalProperties: false, required: ["title", "category", "color"],
        properties: {
          ...itemProperties,
          url: { type: ["string", "null"], format: "uri", maxLength: 2048 },
          price: { type: ["integer", "null"], minimum: 0, maximum: 2147483647 },
          note: { type: ["string", "null"], maxLength: 2000 },
        },
      },
      UpdateWant: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          ...itemProperties,
          url: { type: ["string", "null"], format: "uri", maxLength: 2048 },
          price: { type: ["integer", "null"], minimum: 0, maximum: 2147483647 },
          note: { type: ["string", "null"], maxLength: 2000 },
          status: { type: "string", enum: ["pending", "skipped"] },
        },
      },
      Want: {
        allOf: [
          { $ref: "#/components/schemas/CreateWant" },
          {
            type: "object", required: ["id", "status", "userId", "createdAt", "updatedAt"],
            properties: {
              id: { type: "string", format: "uuid" }, status: { type: "string", enum: ["pending", "bought", "skipped"] },
              userId: { type: "string", format: "uuid" }, createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
              expiresAt: { type: ["string", "null"], format: "date-time", description: "보관 만료 시각. null이면 만료 없음." },
            },
          },
        ],
      },
      CreateOwn: {
        type: "object", additionalProperties: false, required: ["title", "category", "color"], properties: itemProperties,
      },
      UpdateOwn: {
        type: "object", additionalProperties: false, minProperties: 1, properties: itemProperties,
      },
      Own: {
        allOf: [
          { $ref: "#/components/schemas/CreateOwn" },
          {
            type: "object", required: ["id", "source", "userId", "createdAt", "updatedAt"],
            properties: {
              id: { type: "string", format: "uuid" }, source: { type: "string", enum: ["manual", "bought"] },
              fromWantId: { type: ["string", "null"], format: "uuid" }, userId: { type: "string", format: "uuid" },
              createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
              expiresAt: { type: ["string", "null"], format: "date-time", description: "연결된 구매 후보의 만료일을 그대로 유지합니다." },
            },
          },
        ],
      },
      Error: {
        type: "object", required: ["error"],
        properties: {
          error: {
            type: "object", required: ["code", "message"],
            properties: {
              code: { type: "string" }, message: { type: "string" },
              fields: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
            },
          },
        },
      },
    },
    responses: {
      ValidationError: { ...jsonResponse("입력값 오류", { $ref: "#/components/schemas/Error" }) },
      Unauthorized: { ...jsonResponse("인증 필요", { $ref: "#/components/schemas/Error" }) },
      InvalidCredentials: { ...jsonResponse("이메일 또는 비밀번호 불일치", { $ref: "#/components/schemas/Error" }) },
      EmailConflict: { ...jsonResponse("이미 가입된 이메일", { $ref: "#/components/schemas/Error" }) },
      RateLimited: { ...jsonResponse("요청 제한 초과", { $ref: "#/components/schemas/Error" }) },
      NotFound: { ...jsonResponse("리소스 없음", { $ref: "#/components/schemas/Error" }) },
      Conflict: { ...jsonResponse("현재 상태와 충돌", { $ref: "#/components/schemas/Error" }) },
    },
  },
  security: [{ bearerAuth: [] }],
}
