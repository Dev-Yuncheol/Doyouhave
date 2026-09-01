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

const itemProperties = {
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
    "/api/health": {
      get: {
        tags: ["System"],
        summary: "서버 상태 확인",
        security: [],
        responses: {
          200: jsonResponse("정상", {
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", const: "ok" } },
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
    },
    "/api/wants": {
      get: {
        tags: ["Wants"], summary: "구매 후보 목록",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "bought", "skipped"] } },
          { name: "category", in: "query", schema: { type: "string", enum: categories } },
        ],
        responses: {
          200: jsonResponse("후보 목록", {
            type: "object", required: ["wants"],
            properties: { wants: { type: "array", items: { $ref: "#/components/schemas/Want" } } },
          }),
          ...errorResponses,
        },
      },
      post: {
        tags: ["Wants"], summary: "구매 후보 생성",
        requestBody: jsonBody({ $ref: "#/components/schemas/CreateWant" }),
        responses: {
          201: jsonResponse("생성 완료", {
            type: "object", required: ["want"],
            properties: { want: { $ref: "#/components/schemas/Want" } },
          }),
          ...errorResponses,
        },
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
        responses: {
          204: { description: "삭제 완료" },
          400: errorResponses[400], 401: errorResponses[401],
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/wants/{id}/buy": {
      post: {
        tags: ["Wants"], summary: "구매 완료 처리", description: "후보를 구매 완료로 바꾸고 보유 의류를 원자적으로 생성합니다.",
        parameters: [idParameter],
        responses: {
          200: jsonResponse("구매 완료", {
            type: "object", required: ["want", "own"],
            properties: {
              want: { $ref: "#/components/schemas/Want" },
              own: { $ref: "#/components/schemas/Own" },
            },
          }),
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
          { name: "category", in: "query", schema: { type: "string", enum: categories } },
          { name: "color", in: "query", schema: { type: "string", enum: colors } },
        ],
        responses: {
          200: jsonResponse("보유 목록", {
            type: "object", required: ["owns"],
            properties: { owns: { type: "array", items: { $ref: "#/components/schemas/Own" } } },
          }),
          ...errorResponses,
        },
      },
      post: {
        tags: ["Owns"], summary: "보유 의류 생성",
        requestBody: jsonBody({ $ref: "#/components/schemas/CreateOwn" }),
        responses: {
          201: jsonResponse("생성 완료", {
            type: "object", required: ["own"],
            properties: { own: { $ref: "#/components/schemas/Own" } },
          }),
          ...errorResponses,
        },
      },
    },
    "/api/owns/{id}": {
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
      User: {
        type: "object", required: ["id", "email", "createdAt", "updatedAt"],
        properties: {
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
      NotFound: { ...jsonResponse("리소스 없음", { $ref: "#/components/schemas/Error" }) },
      Conflict: { ...jsonResponse("현재 상태와 충돌", { $ref: "#/components/schemas/Error" }) },
    },
  },
  security: [{ bearerAuth: [] }],
}
