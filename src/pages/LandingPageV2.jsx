import { Link } from "react-router-dom"
import { Check } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { APP_NAME } from "@/lib/constants"
import imgHero from "@/assets/1hero src.png"
import imgInput from "@/assets/2input src.png"
import imgFound from "@/assets/3foundhome src.png"
import imgNotBuy from "@/assets/4notbuy src.png"
import imgPrice from "@/assets/5price src.png"
import imgCta from "@/assets/6cta src.png"

const INPUT_STEPS = ["이름", "카테고리", "색"]

function CtaBlock({ to, label }) {
  return (
    <Button className="h-11 w-full rounded-xl text-[15px]" asChild>
      <Link to={to}>{label}</Link>
    </Button>
  )
}

export function LandingPageV2() {
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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <section>
          <img
            src={imgHero}
            alt="검은 니트 카라와 라벨"
            className="h-[220px] w-full object-cover"
          />
          <div className="flex flex-col gap-4 px-5 pt-5 pb-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold leading-[1.3]">
                집에 비슷한 옷 있니?
              </h1>
              <p className="text-[15px] text-muted-foreground">
                결제 직전 10초 체크리스트. 디지털 옷장이 아닙니다.
              </p>
            </div>
            <p className="border-l-2 border-primary pl-3 text-[13px] leading-[1.5]">
              장바구니는 잠시 멈추고,{" "}
              <span className="font-semibold text-primary">후회 없는 선택</span>을
              도와드려요.
            </p>
            <CtaBlock
              to="/login?mode=signup"
              label="살까 싶은 옷 1개 넣어 보기"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 px-5 py-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold leading-[1.3]">10초면 됩니다</h2>
            <p className="text-[13px] text-muted-foreground">
              이름, 카테고리, 색만 있으면 돼요.
            </p>
          </div>
          <img
            src={imgInput}
            alt="이름, 카테고리, 색만 적으면 되는 장면"
            className="h-[200px] w-full rounded-xl object-cover"
          />
          <ul className="flex items-center justify-between px-1">
            {INPUT_STEPS.map((label, index) => (
              <li key={label} className="flex items-center gap-1.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-accent-foreground">
                  {index + 1}
                </span>
                <span className="text-[13px] font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4 px-5 py-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold leading-[1.3]">
              집에 비슷한 게 있으면 바로 보여줘요
            </h2>
            <p className="text-[13px] text-muted-foreground">
              같은 카테고리와 색이면 겹침으로 알려줘요.
            </p>
          </div>
          <div>
            <Card className="gap-0 py-0 shadow-none ring-1 ring-border">
              <img
                src={imgFound}
                alt="검은 니트"
                className="h-40 w-full object-cover"
              />
              <CardContent className="flex items-end gap-3 pt-3.5 pb-6">
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 text-base font-semibold leading-[1.4]">
                    <span className="size-1.5 shrink-0 rounded-full bg-foreground" />
                    검은 니트
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge>집에 있음</Badge>
                    <Badge variant="secondary">상의</Badge>
                  </div>
                </div>
                <span className="shrink-0 pb-0.5 text-[13px] text-muted-foreground">
                  49,000원
                </span>
              </CardContent>
            </Card>
            <Alert className="relative z-10 w-full -mt-4 border-transparent border-l-[3px] border-l-primary bg-accent px-2 py-1.5 text-[12px] text-accent-foreground shadow-sm">
              <AlertTitle className="text-[12px] leading-tight text-accent-foreground">
                집에 비슷한 옷 1개
              </AlertTitle>
              <AlertDescription className="text-[11px] leading-tight text-accent-foreground/80">
                작년 블랙 니트
              </AlertDescription>
            </Alert>
          </div>
        </section>

        <section className="flex flex-col gap-4 px-5 py-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold leading-[1.3]">
              안 사면 그게 성공입니다
            </h2>
            <p className="text-[13px] text-muted-foreground">
              불필요한 지출을 막고, 필요한 옷만 남겨요.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl">
            <img
              src={imgNotBuy}
              alt="접어 둔 니트"
              className="h-64 w-full object-cover"
            />
            <div className="absolute inset-x-3 bottom-3 rounded-xl bg-card p-3.5 shadow-md ring-1 ring-border">
              <p className="mb-3 text-center text-[13px] font-medium">
                이번엔 살까 말까?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="pointer-events-none h-10"
                >
                  샀다
                </Button>
                <Button type="button" className="pointer-events-none h-10">
                  안 샀다
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 px-5 py-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold leading-[1.3]">
              확인은 무료입니다
            </h2>
            <p className="text-[13px] text-muted-foreground">
              부담 없이 한 번 확인해 보세요.
            </p>
          </div>
          <Card className="gap-0 py-0 shadow-none ring-1 ring-border">
            <CardContent className="flex flex-col gap-3 py-5">
              <Badge
                variant="secondary"
                className="bg-accent text-accent-foreground"
              >
                기본 요금제
              </Badge>
              <div>
                <p className="text-lg font-semibold">무료</p>
                <p className="text-2xl font-semibold leading-tight text-primary">
                  0원
                </p>
              </div>
              <div className="border-t pt-3">
                <p className="flex items-start gap-2 text-[13px]">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  후보 추가, 겹침 확인, 샀다/안 샀다
                </p>
              </div>
            </CardContent>
          </Card>
          <p className="text-[13px] text-muted-foreground">
            <span className="font-semibold text-primary">Pro</span> 요금제도
            준비되어 있어요. 더 많은 기능이 필요할 때 선택해 보세요.
          </p>
          <img
            src={imgPrice}
            alt="베이지 니트 결"
            className="h-24 w-full rounded-xl object-cover"
          />
          <CtaBlock
            to="/login?mode=signup"
            label="무료로 확인하기"
          />
        </section>

        <section
          className="flex flex-col gap-4 px-5 pt-8"
          style={{
            paddingBottom: "calc(28px + env(safe-area-inset-bottom))",
          }}
        >
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold leading-[1.3]">
              필요한 옷만 남겨 보세요
            </h2>
            <p className="text-[13px] text-muted-foreground">
              결제 직전 10초, 후회 없는 선택을 도와드려요.
            </p>
          </div>
          <img
            src={imgCta}
            alt="쇼핑백과 개켜 둔 니트"
            className="h-[200px] w-full rounded-xl object-cover"
          />
          <CtaBlock
            to="/login?mode=signup"
            label="살까 싶은 옷 1개 넣어 보기"
          />
        </section>
      </div>
    </div>
  )
}
