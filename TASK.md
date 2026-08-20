# TASK

구현 체크리스트. 요구사항은 여기에 추가하지 않는다.

| 문서 | 역할 |
|------|------|
| `PRD.md` | 무엇을, 데이터, 함수, 라우트 |
| `DESIGN.md` | 어떻게 보이는지, 390px 셸 |
| `TASK.md` | 지금 무엇을 짜는지 |
| `README.md` | 남이 어떻게 켜는지 |

막히면 PRD → DESIGN 순으로 본다. P1·제외 기능은 만들지 않는다.

---

## 0. 가드레일

- 페이지는 localStorage를 직접 쓰지 않는다. hook만 부른다.
- 겹침은 `lib/match.js` 한곳. `category` + `color`. 기타는 `categoryDetail` / `colorDetail`까지.
- 필수 입력은 이름·카테고리·색. 옷 이미지 업로드 없음. 랜딩 사진은 `src/assets`만.
- 레이아웃 분기 없음. `sm:` / `md:` / `lg:`로 그리드를 키우지 않는다.
- 앱은 `#root` `max-w-[390px] mx-auto min-h-dvh`. 모달도 셸 안.
- 카피: 살까 / 집에 / 있니. DESIGN 7절.

**이번 주 밖:** 월간 요약, 옷 이미지 업로드, 24시간 대기, 서버, 소셜 로그인, 미션 5 시안.

---

## 1. 초기화 · 셸

- [x] Vite + React + Tailwind 생성
- [x] React Router
- [x] shadcn 초기화. DESIGN 2.1 토큰으로 zinc/blue 덮기. `radius` 10px. Pretendard
- [x] 컴포넌트만 추가: `Button`, `Card`, `Input`, `Select`, `Badge`, `Alert`, `AlertDialog`, `Tabs`, `Form` 또는 Field, `Sonner`, `Empty`, `Spinner`
- [x] 390px 앱 셸. PC desk 배경. 헤더 56px (로고 / 보유 / 로그아웃)
- [x] 라우트 뼈대: `/login` `/` `/v1` `/wants/new` `/wants/:id` `/owns`

**확인:** PC에서 창을 넓혀도 가운데 390px만 UI다. 바깥에 카피가 없다.

---

## 2. 인증 (F1)

- [x] `lib/storage.js` — `inni_users` `inni_session` 읽기/쓰기
- [x] `lib/auth.js` — `getSession` `signUp` `login` `logout`
- [x] `hooks/useSession.jsx`
- [x] `/login` 로그인·회원가입. Alert: “실습용이에요. 서버는 없습니다.”
- [x] `AuthGate` — 세션 없으면 보호 라우트 → `/login`

**확인:** 가입 후 로그인된다. 새로고침해도 세션이 남는다. 홈에서 로그아웃하면 `/` 랜딩. 비밀번호는 브라우저에만 남는다(해시 없음).

---

## 3. 살까 CRUD (F2, F6 일부)

- [x] `lib/storage.js` — `inni_wants`
- [x] `hooks/useWants.js` — 목록/단건/생성/수정/삭제. 현재 `userId`만
- [x] `WantForm` — 필수 3개 + 선택 링크·가격·메모. 카테고리·색 기타 직접 입력
- [x] 로그인 후 `/` 진행 중 카드 리스트. 카드 클릭 → 상세
- [x] `/wants/new` 넣기
- [x] `/wants/:id` 제목·스와치·카테고리·가격/링크

**확인:** 후보를 만들고 목록·상세가 보인다. 다른 유저 데이터는 안 보인다. 기타면 `종류를 입력하세요` / 색 이름이 열린다.

---

## 4. 보유 · 겹침 · 샀다/안 샀다 (F3–F5)

- [x] `lib/storage.js` — `inni_owns`
- [x] `lib/match.js` — `findSimilarOwns({ category, color, categoryDetail, colorDetail })`
- [x] `hooks/useOwns.js`
- [x] 상세: “집에 이런 거 있음” 한 줄 → Own (`source: 'manual'`) → 겹침 갱신
- [x] 작성: 카테고리+색이 있으면 겹침 미리보기 (기타는 상세까지)
- [x] 상세 최상단 겹침 Alert: “집에 비슷한 옷 n개”
- [x] 샀다 → `status: 'bought'` + Own (`source: 'bought'`, `fromWantId`)
- [x] 안 샀다 → `status: 'skipped'` (성공). Own 없음
- [x] 삭제 `AlertDialog`. `pending`이 아니면 샀다/안 샀다/보유 추가 숨김
- [x] `/owns` 짧은 리스트. 출처 `샀을 때` / `직접 적음`. 길게 눌러 수정. 게이지 없음

**확인:** 같은 카테고리+색 Own이 있으면 상세에 겹침이 보인다. 기타는 적은 이름이 같을 때만. 샀다 후 보유에 생긴다. 새로고침 후에도 남는다.

---

## 5. 필터 · 상태 UI (F6, F7)

- [x] 홈 Tabs: 진행 중 / 샀다 / 안 샀다. 기본 진행 중
- [x] 홈·보유 카테고리 칩 (단일 선택). 보유는 색 필터도
- [x] 홈 empty: “살까 싶은 옷을 넣어 보세요”
- [x] 보유 empty: “확인할 때 한 줄만 추가하면 됩니다”
- [x] 필터 결과 empty: “이 조건의 옷이 없습니다”
- [x] 필수값 없으면 필드 에러 (예: “이름을 적어 주세요”, 기타 빈칸 “종류를 입력하세요”)
- [x] 저장 중 버튼 `disabled` + Spinner (200–400ms delay 허용)
- [x] 저장 실패 토스트 또는 Alert: “저장하지 못했습니다. 다시 시도해 주세요.”
- [x] 홈 카드 겹침 힌트: 테라코타 점 + “집에 있음”

**확인:** 빈 목록, 이름 없이 제출, 저장 중이 각각 보인다.

---

## 6. 랜딩 (F8)

- [x] 비로그인 `/` → `LandingPageV2` (2시안, `src/assets` 사진 6구역)
- [x] 1시안 `LandingPage`는 `/v1` 백업
- [x] CTA → `/login?mode=signup`. 헤더 로그인
- [x] 요금은 무료 0원 카드 + Pro 한 줄. 결제 UI 없음
- [x] 버튼 아래 자물쇠·“무료로 확인” 문구 없음

**확인:** 로그아웃 후 `/`에 2시안이 보인다. CTA로 회원가입까지 간다.

---

## 7. 스타일 · 제출

- [x] Quiet Pause. 안 샀다 = primary, 샀다 = outline
- [x] 앱에서 옷은 스와치+라벨. 후보·보유 사진 그리드 없음
- [x] DESIGN 11절 하지 말 것 (랜딩 소개 사진은 허용)
- [x] `app-preview.html`과 톤이 같다 (토큰·폭)
- [ ] GitHub Public
- [ ] Vercel 배포. SPA fallback
- [ ] `README.md`에 URL·데모 계정

**확인:** PRD 13 과제 체크가 모두 된다.

---

## 수동 QA

배포 전에 한 계정으로 끝까지.

1. 비로그인 `/` → 2시안 랜딩. CTA → 회원가입
2. 가입 → 로그인 → 홈 empty
3. 이름 없이 넣기 → 필드 에러. 카테고리 기타만 고르고 종류 비움 → “종류를 입력하세요”
4. 검은 상의 후보 저장 → 목록
5. 상세에서 “검정 목폴라” 한 줄 추가 → “집에 비슷한 옷 1개”
6. 안 샀다 → 안 샀다 탭에 있음. 보유는 목폴라만
7. 같은 색·카테고리 후보를 또 넣고 샀다 → 보유 2개
8. 새로고침 → 목록 유지
9. 홈에서 로그아웃 → `/` 랜딩. 보호 라우트는 `/login`
10. PC에서 넓혀도 390px 컬럼만
11. Vercel URL이 비로그인이면 랜딩을 연다

---

## 완료 기준 (PRD 13)

- [x] 로그인 후 후보를 만들고, 목록·상세가 동작한다
- [x] 같은 카테고리+색 보유가 있으면 상세에 겹침이 보인다
- [x] 샀다/안 샀다가 반영되고, 새로고침 후에도 남는다
- [x] 빈 목록 empty, 필수값 에러, 저장 중 로딩이 보인다
- [x] 비로그인 `/`에서 랜딩이 보이고, CTA로 회원가입까지 간다
- [ ] GitHub Public + Vercel URL이 열린다
