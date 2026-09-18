import { Link } from "react-router-dom"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ColorSwatch } from "@/components/ColorSwatch"
import { APP_NAME } from "@/lib/constants"

const STEPS = [
  {
    n: "1",
    title: "살까 싶은 옷 한 줄",
    body: "이름, 카테고리, 색이면 됩니다.",
  },
  {
    n: "2",
    title: "집에 비슷한 게 있으면 바로",
    body: "같은 카테고리와 색이면 겹침으로 보여 줍니다.",
  },
  {
    n: "3",
    title: "샀다 / 안 샀다",
    body: "안 샀다면 그게 성공입니다. 산 옷만 보유로 남습니다.",
  },
]

const NOT_THIS = ["코디 추천 아님", "AI 스타일리스트 아님", "옷장 사진 아님"]

const PLANS = [
  {
    name: "무료",
    price: "0원",
    hint: "누적 50회 저장 · 항목별 30일 보관",
    featured: false,
  },
  {
    name: "유료 회원",
    price: "준비 중",
    hint: "저장 횟수·보관 기간 제한 없음",
    featured: false,
  },
]

export function LandingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b bg-card px-4"
        style={{
          height: "calc(56px + env(safe-area-inset-top))",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <p className="text-xl font-semibold leading-[1.3]">{APP_NAME}</p>
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link to="/login">로그인</Link>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-5 pt-6 pb-4">
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold leading-[1.3]">
            집에 비슷한 옷 있니?
          </h1>
          <p className="text-[15px] text-muted-foreground">
            결제 직전 10초 체크리스트. 디지털 옷장이 아닙니다.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">장바구니는 집을 모릅니다</h2>
          <p className="text-[13px] text-muted-foreground">
            장바구니는 이 가게만 보여 줍니다. 집에 검은 니트가 있는지는 안
            보여 줍니다. 그래서 비슷한 옷을 또 삽니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">10초면 됩니다</h2>
          <ol className="flex flex-col gap-3">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-accent-foreground">
                  {step.n}
                </span>
                <div>
                  <p className="font-medium leading-[1.4]">{step.title}</p>
                  <p className="text-[13px] text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">이런 식으로 뜹니다</h2>
          <Card className="py-0 shadow-none ring-1 ring-border">
            <CardContent className="flex items-center gap-3 py-3.5">
              <ColorSwatch color="black" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold leading-[1.4]">
                  검은 니트
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="text-[13px] text-muted-foreground">
                    집에 있음
                  </span>
                  <Badge variant="secondary">상의</Badge>
                </div>
              </div>
              <span className="shrink-0 text-[13px] text-muted-foreground">
                49,000원
              </span>
            </CardContent>
          </Card>
          <Alert className="border-transparent border-l-4 border-l-primary bg-accent text-accent-foreground">
            <AlertTitle className="text-accent-foreground">
              집에 비슷한 옷 1개
            </AlertTitle>
            <AlertDescription className="text-accent-foreground/80">
              작년 블랙 니트
            </AlertDescription>
          </Alert>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">옷장 채우기는 없습니다</h2>
          <div className="flex flex-wrap gap-1.5">
            {NOT_THIS.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
          <p className="text-[13px] text-muted-foreground">
            살 뻔한 옷과, 그때 떠오른 보유 한 줄만 적습니다.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">확인은 무료입니다</h2>
          <p className="text-[13px] text-muted-foreground">
            일반 회원은 누적 50회 저장으로 체험할 수 있습니다. 각 항목은 저장일부터 30일 보관됩니다.
          </p>
          <Card className="py-0 shadow-none ring-1 ring-border">
            <CardContent className="divide-y divide-border px-0 py-0">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={
                    plan.featured
                      ? "flex items-start gap-3 bg-accent px-4 py-3"
                      : "flex items-start gap-3 px-4 py-3"
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold">{plan.name}</p>
                      {plan.featured ? <Badge>주력</Badge> : null}
                    </div>
                    <p className="text-[13px] text-muted-foreground">{plan.hint}</p>
                  </div>
                  <p className="shrink-0 text-base font-semibold">{plan.price}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <p className="text-[13px] text-muted-foreground">
            삭제해도 체험 횟수는 복구되지 않습니다. 결제 기능은 준비 중입니다.
          </p>
        </section>
      </div>

      <div
        className="border-t bg-background px-5 pt-3"
        style={{
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        }}
      >
        <Button className="h-10 w-full" asChild>
          <Link to="/login?mode=signup">살까 싶은 옷 1개 넣어 보기</Link>
        </Button>
      </div>
    </div>
  )
}
