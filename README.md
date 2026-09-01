# 있니 (Inni)

결제 직전에 **집에 비슷한 옷이 있는지** 확인하는 구매 체크리스트입니다. 구매 후보와 보유 의류를 카테고리·색상 기준으로 비교하고, 구매/보류 결정을 기록합니다.

**서비스:** https://doyouhave.vercel.app

**Swagger UI:** https://doyouhave.vercel.app/api/docs

**OpenAPI JSON:** https://doyouhave.vercel.app/api/openapi.json

## 주요 흐름

1. 이메일과 비밀번호로 회원가입 또는 로그인합니다.
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

요구 사항은 Node.js 20 이상과 PostgreSQL 데이터베이스입니다.

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

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/health` | 상태 확인 |
| `POST` | `/api/auth/signup` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 |
| `GET` | `/api/auth/me` | 현재 사용자 |
| `GET`, `POST` | `/api/wants` | 구매 후보 목록·생성 |
| `GET`, `PATCH`, `DELETE` | `/api/wants/:id` | 구매 후보 상세·수정·삭제 |
| `POST` | `/api/wants/:id/buy` | 구매 완료 및 보유 의류 생성 |
| `GET`, `POST` | `/api/owns` | 보유 의류 목록·생성 |
| `PATCH`, `DELETE` | `/api/owns/:id` | 보유 의류 수정·삭제 |

요청·응답 스키마와 오류 코드는 Swagger UI 또는 [OpenAPI 정의](./server/openapi.js)에서 확인할 수 있습니다.

## 테스트 범위

- 회원가입 이메일 정규화, 비밀번호 해시, 중복/경합 처리
- 로그인 성공/실패, JWT 복원과 잘못된 토큰 처리
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

- `/api/health`: `{ "status": "ok" }`
- `/api/docs`: Swagger UI
- `/`: 랜딩과 로그인/회원가입

`JWT_SECRET`과 DB 연결 문자열은 저장소에 커밋하지 않습니다. `.env.example`에는 예시 형식만 유지합니다.

## 프로젝트 문서

| 파일 | 내용 |
|---|---|
| [PRD.md](./PRD.md) | 제품 범위, 흐름, 데이터 모델 |
| [DESIGN.md](./DESIGN.md) | 디자인 원칙과 UI 토큰 |
| [TASK.md](./TASK.md) | 구현 단계 |
| [design-system.html](./design-system.html) | 스타일 가이드 |
| [app-preview.html](./app-preview.html) | 앱 셸 미리보기 |
