# 미션 9 분석 설정과 제출 절차

있니의 유입과 핵심 행동을 측정하는 구현이다. 2026-10-01 사용자가 Amplitude API Key 및 US 리전, GA4·GTM 생성을 확인했다. GA4 측정 ID는 `G-PZMLDQKR5P`, GTM 컨테이너 ID는 `GTM-TTN868HT`다. 로컬 `.env`와 Vercel Production에 분석 설정 7개를 적용했다. GTM Google 태그는 버전 2로 게시했고 GA4 향상된 측정은 해제했다. 실제 서비스 수신과 홍보 게시 증빙은 별도 검증이 필요하다.

## 1. 준비할 값

| 서비스 | 만들 항목 | 필요한 값 |
|---|---|---|
| Amplitude | 조직과 Analytics 프로젝트. 테스트용 프로젝트도 별도 생성 권장 | 프로젝트 API Key, 데이터 리전 US 또는 EU |
| Google Analytics | 속성, 웹 데이터 스트림. 보고 시간대 Asia/Seoul | 측정 ID `G-…` |
| Google Tag Manager | 웹 컨테이너 | 컨테이너 ID `GTM-…` |

프로젝트 API Key는 이벤트 수집용 공개 키다. Amplitude Secret Key나 관리자 API 토큰을 프론트 환경변수에 넣지 않는다.

## 2. 환경변수

`.env.example`의 분석 항목을 개발 환경 또는 배포 환경에 추가하고 빌드를 다시 실행한다. 현재 로컬 설정은 아래와 같다. 로컬 `.env`는 Git에 포함되지 않으며 Vercel 환경변수에 자동으로 반영되지 않는다.

```dotenv
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_DEBUG=false
VITE_ANALYTICS_ENV=development
VITE_AMPLITUDE_API_KEY=발급받은_프로젝트_API_Key
VITE_AMPLITUDE_SERVER_ZONE=US
VITE_GA4_MEASUREMENT_ID=G-PZMLDQKR5P
VITE_GTM_CONTAINER_ID=GTM-TTN868HT
```

실제 수집 준비가 되면 `ENABLED=true`, 운영은 `ENV=production`, 검증은 `ENV=qa`로 지정한다. `DEBUG=true`는 로컬 확인용 이벤트를 `window.__inniAnalyticsEvents`에 최대 200개 보관하며 GA4 이벤트에 debug_mode를 붙인다. 운영 배포는 DEBUG=false를 사용한다.

GTM ID가 있으면 GTM의 Google 태그가 GA4 라이브러리를 로드하고, 앱이 같은 dataLayer에 명시적 gtag 이벤트 명령을 넣는다. GTM ID가 없고 GA4 ID만 있으면 코드가 Google 태그를 직접 로드한다. 라이브러리는 한 번만 로드한다. Amplitude는 코드에서만 전송하며 GTM에서 다시 설치하지 않는다.

## 3. GTM 설정

1. `GTM-TTN868HT` 컨테이너에 Google 태그를 추가한다. 태그 ID에 `G-PZMLDQKR5P`를 입력한다. 초기화 트리거를 사용한다.
2. 구성 매개변수 `send_page_view=false`, `allow_google_signals=false`를 설정한다. `page_location`은 `https://doyouhave.vercel.app/app`, `page_referrer`는 빈 문자열로 지정한다. 테스트 도메인에서는 해당 테스트 origin의 `/app`을 사용한다. 콜백의 인증 코드가 기본 URL에 포함되지 않게 한다.
3. GA4 웹 스트림의 향상된 측정은 비활성화한다. 페이지 변경, 폼 입력, 링크 클릭 등은 본 Tracking Plan에서 명시한 이벤트만 수집한다. 특히 브라우저 기록 변경에 따른 자동 page_view를 함께 켜지 않는다.
4. 앱이 `gtag("event", 이벤트명, 매개변수)` 명령을 같은 dataLayer에 넣으며 `send_to`에 GA4 측정 ID를 지정한다. 앱이 각 이벤트에 현재 `user_id`와 정규화한 페이지·유입 정보를 전달한다.
5. `inni_event` 객체는 Preview와 QA에서 앱 이벤트를 확인하는 용도다. 여기에 별도 GA4 이벤트 태그를 연결하면 같은 이벤트가 중복되므로 추가하지 않는다. 사용자 지정 트리거와 데이터 영역 변수도 전송을 위해 추가할 필요가 없다.

이벤트 매개변수 목록:

```text
page_name, is_logged_in, cta_location, auth_method, entry_point,
category, similar_count, own_count, decision, action, error_code,
environment, schema_version, event_id,
page_location, page_title, page_referrer,
campaign_source, campaign_medium, campaign_name, campaign_content, campaign_term,
debug_mode
```

GA4의 이벤트별 사용자 정의 매개변수 한도를 고려하여 실제 GA4 태그에는 유입용 핵심 매개변수만 연결한다: `page_name`, `is_logged_in`, `cta_location`, `auth_method`, `entry_point`, `category`, `similar_count`, `own_count`, `decision`, `action`, `error_code`, `environment`, `schema_version`, `event_id`와 표준 페이지·캠페인 필드. `want_id`와 `first_utm_*` 등 후보별 결합·최초 유입 분석은 Amplitude에서 수행한다. 사용자 정의 차원은 `environment`, `cta_location`, `decision` 등 실제 보고서에 쓰는 낮은 카디널리티 속성만 등록한다.

6. Preview에서 한 페이지 진입당 page_view가 한 번인지, signup_completed가 신규 가입 때만 발생하는지 확인한다. 게시 화면을 저장하고 실제 수신을 검증한다.

## 4. Amplitude 설정

- Browser SDK 2.47.2를 고정 사용한다. 자동 수집과 원격 구성은 끄고 Tracking Plan의 명시적 이벤트만 보낸다.
- 익명 방문을 SDK device ID로 수집하다가 인증 성공 시 앱의 내부 사용자 ID로 연결한다. 이메일을 user ID로 사용하지 않는다.
- 사용자 속성: `membership_plan`, 최초 식별 시 `first_utm_*`를 setOnce로 설정한다. 최초 유입은 브라우저 기준 추정치이며, 기존 계정은 이미 설정된 최초 속성을 유지한다.
- 로그아웃 또는 계정 전환 시 SDK reset을 호출한다. GA4의 브라우저 식별자는 유지될 수 있으므로 고유 사용자 수는 두 도구 간 완전히 일치한다고 가정하지 않는다.
- Events/사용자 이벤트 타임라인에서 이벤트명, 속성, 시간, 사용자 ID를 확인한다. 수집 화면 또는 CSV를 저장한다.

## 5. 측정 정의와 한계

- 기본 분석 기간은 유입 시작일부터 7일이며, 전환은 해당 사용자 첫 방문 또는 가입 이후 7일 창으로 계산한다. 7일 관찰이 끝나지 않은 사용자는 별도 표시한다.
- 주요 퍼널: page_viewed(landing) → signup_completed → want_created → comparison_viewed → decision_recorded. CTA 클릭은 진단 단계이며 직접 가입을 핵심 전환에서 제외하지 않는다.
- 후보별 단계는 동일 want_id로 연결한다. 비교 후 결정은 비교와 결정의 같은 후보 ID 및 시간 순서를 충족해야 한다. 사용자만 일치하는 서로 다른 후보를 연결하지 않는다.
- comparison_viewed는 로딩 성공 후 상세 화면에 결과가 표시된 시점이다. 읽거나 숙고했다는 증거가 아니다. 한 상세 진입당 1회이며 해당 화면에서 보유 의류를 추가해도 다시 발생하지 않는다. decision_recorded의 similar_count는 결정 직전 값을 기록한다.
- want_created·own_created는 API 성공 후 후보/보유 ID로 중복 제거한다. 구매 전환에 따라 자동 생성된 Own은 own_created로 기록하지 않는다. decision_recorded는 신규 구매 전환 또는 pending→skipped 성공 때만 기록한다.
- 중복 제거 저장소는 브라우저 탭 기준 최대 최근 500개 키다. 여러 기기·탭의 완전한 exactly-once나 전송 보장은 제공하지 않는다. 광고 차단, 브라우저 종료, 네트워크 손실로 누락될 수 있다. 결제·정산용 원장은 아니다.
- UTM은 영문·숫자·하이픈·밑줄 1~80자만 허용한다. 임의 쿼리, 해시, 인증 코드, 이메일, 의류 제목·메모·상품 URL은 전달하지 않는다.
- 명시적 새 UTM 또는 30분 비활동 시 현재 유입을 갱신한다. OAuth 복귀와 앱 내부 이동은 유입을 유지한다. 태그 없는 최초 방문은 direct/none으로 분류한다. 현재 설계는 UTM 채널 비교 중심이며 자연 검색·리퍼러 분류를 구현하지 않는다.
- FREE/PAID는 이용 정책 구분이다. PAID를 실제 결제나 매출 이벤트로 해석하지 않는다.

## 6. 로컬 QA

```bash
npm run dev:analytics-qa
```

http://127.0.0.1:5179 로 접속한다. 이 명령은 메모리 PostgreSQL에 마이그레이션을 적용하고 가짜 계정·옷 데이터로만 실행한다. 운영 DB URL을 사용하지 않고 분석 전송은 끈다. 종료하면 데이터가 사라진다. 구글 외부 인증은 이 QA 서버에서 검증하지 않는다. 구글 신규/기존/계정 연결/경합의 응답 분류는 서버 자동 테스트로 확인한다.

브라우저 개발자 도구에서 `window.__inniAnalyticsEvents`를 확인한다. QA 이벤트는 실제 Amplitude·GA4 수신 증빙이 아니다.

```bash
npm test
npm run lint
npm run build
```

## 7. 실제 수집과 제출 완료 조건

- [x] Amplitude 프로젝트·GA4 속성·GTM 컨테이너 생성 (사용자 확인)
- [x] 로컬 `.env`에 GA4·GTM ID 입력
- [x] 로컬 `.env`에 Amplitude 프로젝트 API Key 입력
- [x] Amplitude US 리전 확인 (사용자 확인)
- [ ] GTM Google 태그·GA4 이벤트 태그·트리거 설정 및 게시
- [ ] 테스트 키로 QA 환경 전송 확인
- [ ] Amplitude 실제 수신 화면 또는 CSV 저장
- [ ] GA4 DebugView 및 실시간 보고서 확인, 처리 후 유입 획득 보고서 확인
- [ ] 운영 환경 키 설정·배포 후 주요 경로 재검증
- [ ] 카카오톡·네이버 블로그·인스타그램 중 사용 가능한 3개 채널에 게시
- [ ] UTM 목록에 게시 URL·게시일·소재 버전 기록
- [ ] 최소 7일 데이터 수집 후 9-2 분석 진행

`outputs/mission9`의 문서와 증빙 ZIP을 사용한다. ZIP 안의 상태표에서 로컬 검증과 외부 미완료 항목을 구분한다. 현재 ZIP은 최종 외부 수신 증빙을 대신하지 않는다.

## 공식 참고 문서

- [Amplitude Browser SDK 2](https://amplitude.com/docs/sdks/analytics/browser/browser-sdk-2)
- [GA4 수동 페이지 조회 측정](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [GTM 데이터 영역](https://developers.google.com/tag-platform/tag-manager/datalayer)

공식 문서는 SDK·태그 API의 근거다. 지표 정의, 이벤트명, 퍼널과 UTM 규칙은 있니 서비스에 맞춰 정한 설계다.
