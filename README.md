# 있니 (Inni)

**회원 정책:** [일반·유료 회원, 체험 50회, 30일 보관 및 운영 적용](./MEMBERSHIP.md). 결제 연동은 없습니다. 새 마이그레이션과 `CRON_SECRET` 설정 후 배포해야 합니다.

결제 직전에 **집에 비슷한 옷이 있는지** 확인하는 구매 체크리스트입니다. 구매 후보와 보유 의류를 카테고리·색상 기준으로 비교하고, 구매/보류 결정을 기록합니다.

**서비스:** https://doyouhave.vercel.app

**Swagger UI:** https://doyouhave.vercel.app/api/docs

**OpenAPI JSON:** https://doyouhave.vercel.app/api/openapi.json

## 주요 흐름

1. 이메일과 비밀번호 또는 Google로 회원가입·로그인합니다.
2. 구매 후보의 이름, 카테고리, 색상과 선택 정보를 입력합니다.
3. 같은 카테고리·색상의 보유 의류가 있는지 확인합니다.
4. 후보를 `샀다` 또는 `안 샀다`로 처리합니다.
5. `샀다`로 처리하면 같은 내용의 보유 의류가 트랜잭션으로 생성됩니다.

사용자 데이터는 JWT로 격리되며 PostgreSQL에 저장됩니다. 비밀번호는 bcrypt로 해시됩니다.

## 기술 스택

- Frontend: React 19, Vite, React Router, Tailwind CSS, shadcn/ui
- API: Express 5, Zod, JWT, bcrypt
- Database: PostgreSQL(Supabase), Prisma 6
- Test: Vitest, Supertest, 실DB 스모크 테스트
- Deploy: Vercel Static Build + Node.js Function

## 로컬 실행

요구 사항은 Node.js `^20.19.0 || >=22.12.0`과 PostgreSQL 데이터베이스입니다.

```powershell
npm install
Copy-Item .env.example .env
npm run db:generate
npm run db:deploy
```

`.env`에 실제 값을 입력합니다.

```dotenv
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="32자 이상의 충분히 긴 임의 문자열"
VITE_APP_NAME="있니"
```

개발 중에는 터미널 두 개에서 API와 프론트를 실행합니다. Vite가 `/api` 요청을 3000번 포트로 프록시합니다.

```bash
npm run dev:api
npm run dev
```

Vite가 출력한 주소를 브라우저에서 열고, API 상태는 `http://localhost:3000/api/health`, Swagger UI는 `http://localhost:3000/api/docs`에서 확인할 수 있습니다.

## 명령어

### Google 로그인 설정

Supabase Google provider를 활성화한 뒤 아래 공개 설정을 로컬 `.env`와 배포 환경에 모두 추가합니다.
`VITE_` 값은 빌드 시 반영되므로 배포 환경 수정 후 재빌드가 필요합니다.

```dotenv
SUPABASE_URL="https://PROJECT_REF.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_SUPABASE_URL="https://PROJECT_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

- Supabase Authentication → URL Configuration → Redirect URLs에 `http://localhost:5173/auth/callback`과 `https://doyouhave.vercel.app/auth/callback`을 등록합니다. 다른 포트·프리뷰 도메인은 정확한 URL을 별도로 등록합니다.
- Google Cloud의 승인된 리디렉션 URI는 Supabase의 `https://PROJECT_REF.supabase.co/auth/v1/callback`입니다.
- Google Client Secret은 Supabase에만 보관하고 앱 환경변수에는 publishable key만 사용합니다.
- `npm run db:deploy`로 `20260917100000_google_auth` 마이그레이션을 적용한 뒤 새 API를 실행합니다.
- 신규 Google 계정은 비밀번호 없이 생성합니다. 같은 이메일의 기존 계정은 기존 비밀번호를 한 번 확인한 뒤 연결하며 기존 사용자 ID와 옷장 데이터를 유지합니다.
- 프론트는 PKCE로 받은 토큰을 `/api/auth/google`에 전송합니다. 서버는 Supabase `getUser`로 검증하고 Google identity와 이메일 확인 여부를 검사한 뒤 기존 앱 JWT를 발급합니다. 연결 후에는 이메일이 바뀌어도 Supabase 사용자 ID로 식별합니다.
- 계정 삭제는 기존과 같이 앱의 User/옷장 데이터를 삭제합니다. Supabase Auth 사용자 자체는 삭제하지 않으며, 이후 Google로 로그인하면 새 앱 계정이 생성됩니다.

[공식 Google OAuth 설정 문서](https://supabase.com/docs/guides/auth/social-login/auth-google)

### 실행 명령

| 명령 | 설명 |
|---|---|
| `npm run dev` | Vite 프론트 개발 서버 |
| `npm run dev:api` | Express API 개발 서버 |
| `npm run build` | 프로덕션 프론트 빌드 |
| `npm run lint` | Oxlint 정적 검사 |
| `npm test` | 격리된 mock DB 기반 API 테스트 |
| `npm run test:db` | 실제 DB 인증·CRUD·트랜잭션 스모크 테스트 |
| `npm run test:deploy -- https://배포주소` | 배포된 API 전체 흐름 검증 후 테스트 데이터 정리 |
| `npm run db:validate` | Prisma 스키마 검증 |
| `npm run db:deploy` | 배포 환경 마이그레이션 적용 |

## API 요약

인증이 필요한 API는 `Authorization: Bearer <JWT>` 헤더를 사용합니다.
회원가입은 클라이언트 IP별 15분에 5회, 로그인은 별도로 15분에 10회로 제한되며 초과 시 JSON 429 응답을 반환합니다.

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/health` | API 및 DB 연결 상태 확인 |
| `POST` | `/api/auth/signup` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 |
| `POST` | `/api/auth/google` | 구글 인증 검증·앱 JWT 발급·기존 계정 연결 |
| `GET`, `DELETE` | `/api/auth/me` | 현재 사용자 조회·본인 계정 삭제 |
| `GET`, `POST` | `/api/wants` | 구매 후보 목록·생성 |
| `GET`, `PATCH`, `DELETE` | `/api/wants/:id` | 구매 후보 상세·수정·삭제 |
| `POST` | `/api/wants/:id/buy` | 구매 완료 및 보유 의류 생성 |
| `GET`, `POST` | `/api/owns` | 보유 의류 목록·생성 |
| `GET`, `PATCH`, `DELETE` | `/api/owns/:id` | 보유 의류 상세·수정·삭제 |

요청·응답 스키마와 오류 코드는 Swagger UI 또는 [OpenAPI 정의](./server/openapi.js)에서 확인할 수 있습니다.

## 테스트 범위

- 회원가입 이메일 정규화, 비밀번호 해시, 중복/경합 처리
- 로그인 성공/실패, JWT 복원과 잘못된 토큰 처리
- 회원가입·로그인의 독립된 IP별 요청 제한과 JSON 429 응답
- 본인 계정 삭제와 구매 후보·보유 의류 cascade 삭제
- 실제 DB 연결을 확인하는 health check와 안전한 503 응답
- 인증 없는 데이터 접근 차단
- 후보·보유 생성, 조회 필터, 수정, 삭제
- 사용자별 리소스 격리와 404 처리
- 기타 카테고리/색상 세부값 및 알 수 없는 필드 검증
- 구매 완료 트랜잭션과 보유 의류 자동 생성
- 실제 PostgreSQL 기반 전체 CRUD 스모크 흐름

```bash
npm run lint
npm test
npm run test:db
npm run build
```

## Vercel 배포

프로젝트에는 [vercel.json](./vercel.json)이 포함되어 있습니다. `/api/*`는 Express Function으로, 그 밖의 경로는 Vite SPA의 `index.html`로 연결됩니다.

Vercel 프로젝트의 Production 환경에 `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `VITE_APP_NAME`을 설정한 뒤 배포합니다.

```bash
npm run db:deploy
npx vercel deploy --prod
```

배포 후 다음 주소를 확인합니다.

- `/api/health`: DB 연결이 정상이면 `{ "status": "ok", "database": "ok" }`, 연결 실패 시 503과 `{ "status": "unavailable", "database": "error" }`
- `/api/docs`: Swagger UI
- `/`: 랜딩과 로그인/회원가입

`JWT_SECRET`과 DB 연결 문자열은 저장소에 커밋하지 않습니다. `.env.example`에는 예시 형식만 유지합니다.

## 프로젝트 문서

| 파일 | 내용 |
|---|---|
| [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md) | 현재 구현 기준 기능명세서: 화면, 처리 규칙, API, 인수 확인 시나리오 |
| [PRD.md](./PRD.md) | 제품 범위, 흐름, 데이터 모델 |
| [DESIGN.md](./DESIGN.md) | 디자인 원칙과 UI 토큰 |
| [TASK.md](./TASK.md) | 구현 단계 |
| [design-system.html](./design-system.html) | 스타일 가이드 |
| [app-preview.html](./app-preview.html) | 앱 셸 미리보기 |

### Issue #2 리뷰 반영

- 구매 완료 후보는 직접 삭제할 수 없습니다(409). 내 옷장에서 보유 의류를 삭제하면 연결된 구매 후보도 함께 삭제합니다.
- 구매 확정 최초 요청은 201과 Location, 재요청은 200을 반환합니다. 본문의 created로 안내 문구를 구분합니다.
- 목록은 limit(기본 50, 최대 100), cursor를 받고 nextCursor를 반환합니다. 같은 필터로 다음 페이지를 조회하며 없어진 커서는 400입니다. 생성 시각이 같으면 ID 내림차순으로 정렬합니다.
- 현재 화면은 전체 데이터가 필요한 필터·비슷한 옷 검색을 유지하기 위해 100개 단위로 페이지를 자동 수집합니다. 한 요청의 조회량은 제한되지만 전체 전송량과 브라우저 보관량은 줄지 않습니다.
- 카테고리·색상은 기존 소문자 값을 보존하는 PostgreSQL enum입니다.

배포 시 Prisma 마이그레이션(20260917090000_item_enums)을 먼저 적용하고 새 서버를 배포합니다. SQL은 트랜잭션으로 실행되며 허용되지 않은 기존 값이 있으면 전체를 취소합니다. 운영 적용 전 기존 category/color 값과 백업을 확인하세요. 로컬 검증만으로 운영 DB에 자동 적용되지는 않습니다.
