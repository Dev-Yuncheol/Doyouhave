# 미션 9-1 증빙 상태

2026-10-01 기준. 구현·운영 적용·검증 결과를 구분한다. 실제 이벤트 수신과 홍보 게시가 확인되기 전에는 미션 전체 완료로 제출하지 않는다.

## 완료한 항목

- 지표 5개, 이벤트 10개, 사용자·유입 속성 및 16개 QA 시나리오 정의
- 분석 코드, 구글 신규 계정 응답 구분과 OpenAPI 구현
- 분석·어댑터·Google 로그인 관련 24개 집중 테스트 통과
- 빌드·린트 통과. 번들 크기 경고와 기존 경고 6개 있음
- 로컬 QA: UTM 방문, CTA, 이메일 가입, 후보 작성·저장, 비교 0개 표시, 직접 보유 등록, 유사 의류 1개, 샀다 기록 확인
- 구매로 자동 생성된 Own은 own_created로 중복 기록하지 않음
- Amplitude US 리전·프로젝트 API Key, GA4 G-PZMLDQKR5P, GTM GTM-TTN868HT 설정
- Vercel Production에 수집 설정 7개 적용, DEBUG=false 및 environment=production
- GTM 버전 2 Google 태그 게시. 자동 page_view와 Google Signals 끄기, 기본 URL 정규화
- GA4 향상된 측정 해제
- GitHub codex/mission9-analytics 브랜치 업로드, Vercel 운영 직접 배포
- 운영 https://doyouhave.vercel.app DB health 및 OpenAPI 정상, 배포 파일 ID와 게시된 GTM Google 태그 확인
- 운영 랜딩 → 가입 CTA → 가입 화면 표시 확인
- 3개 채널 홍보 문구와 UTM 링크 준비. 실제 게시하지 않음

## 증빙 파일

- production-verification.json: 운영 배포 dpl_7SiBae8UdVYwAsXoefhFNT13hNDf, 코드 d798873 및 읽기 전용 검증 결과
- gtm-published.png: GTM 버전 2 게시 화면
- ga4-stream-settings.png: GA4 웹 스트림 설정 화면
- production-login.png: 운영 가입 화면
- production-browser-errors.json: 운영 Amplitude 전송 실패 로그. 수신 성공 증빙이 아니다
- amplitude-ingestion-check.json: US 수집 서버 연결 실패. HTTP 성공 응답 없음, 수신 검증 미완료
- analytics-unit-results.json: 최종 집중 테스트 24/24 통과
- test-results.json: Node 24 전체 104개 중 103개 통과, Google 로그인 테스트 1개 read ECONNRESET 실패
- test-results-node22.json: Node 22 전체 104개 중 103개 통과, 다른 인증 테스트 1개 같은 연결 오류
- baseline-test-results.json: 변경 전 코드 91개 중 90개 통과, 같은 연결 오류 1개. 기존 테스트를 완화하거나 삭제하지 않음
- local-comparison.png: 임시 DB에서 보유 의류 1개가 표시된 화면
- local-events-before-redirect-fix.json: 로컬 QA 이벤트 원본. 가입 직후 중간 로그인 화면 이벤트가 포함된 수정 전 자료다. 인증된 /login 제외 수정은 단위 테스트로 검증했으며 해당 경로의 수정 후 브라우저 재검증은 미완료다

## 실제 수신과 남은 검증

- Amplitude 앱에서 page_viewed 수신을 조회했으나 결과가 없었다. 현재 기기에서 api2.amplitude.com 이름 조회/연결이 실패하고 브라우저 SDK도 Failed to fetch를 기록했다. API Key가 잘못됐다는 근거는 없다. 다른 정상 네트워크에서 실제 수신을 확인해야 한다
- GA4 실시간 보고서에서 활성 사용자 1명, page_view 2건(landing 1·login 1), signup_cta_clicked 1건을 확인했다. ga4-realtime.png 및 ga4-realtime.txt 참조. DebugView 속성 검증과 유입 획득 보고서는 추가 확인이 필요하다
- 저장 실패 action_failed, 보유 등록 후 상세 재진입, 안 샀다, 수정 후 가입 리다이렉트 및 계정 전환의 전체 브라우저 검증은 남아 있다
- 전체 테스트의 간헐적 연결 오류 원인은 확정하지 못했다
- 테스트 방문의 utm_source=qa는 실제 홍보 성과에서 제외한다
- 3개 채널 게시 URL·날짜·스크린샷을 추가하고 관찰 기간을 채워야 한다

GitHub main 반영은 최초 자동 승인 검토에서 차단되었으나, 이후 사용자에게 main 반영·푸시의 명시적 추가 승인을 받았다. 작업 브랜치 코드의 운영 직접 배포를 확인했고 main에도 fast-forward 반영과 원격 푸시를 완료했다.
