import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { AppHeader } from "@/components/AppHeader"
import { ColorSwatch } from "@/components/ColorSwatch"
import { DataLoadState } from "@/components/DataLoadState"
import { SimilarOwns } from "@/components/SimilarOwns"
import { StatusBadge } from "@/components/StatusBadge"
import { useOwns } from "@/hooks/useOwns"
import { useWants } from "@/hooks/useWants"
import { categoryLabel, colorLabel } from "@/lib/constants"

function formatPrice(price) {
  if (price == null || price === "") return null
  return `${Number(price).toLocaleString("ko-KR")}원`
}

export function WantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getWant, markBought, markSkipped, deleteWant, saving, loading, loadError, reload } =
    useWants()
  const { similar, createOwn, saving: ownSaving } = useOwns()
  const [ownTitle, setOwnTitle] = useState("")
  const [ownError, setOwnError] = useState("")

  const want = getWant(id)
  const similarOwns = want
    ? similar({
        category: want.category,
        categoryDetail: want.categoryDetail,
        color: want.color,
        colorDetail: want.colorDetail,
      })
    : []
  const pending = want?.status === "pending"
  const busy = saving || ownSaving

  if (loading || loadError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <AppHeader backTo="/" showLogout={false} />
        <div className="px-5 pt-6">
          <DataLoadState loading={loading} error={loadError} onRetry={reload} />
        </div>
      </div>
    )
  }

  if (!want) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <AppHeader backTo="/" showLogout={false} />
        <div className="px-5 pt-10 text-center">
          <p className="font-semibold">없는 후보입니다</p>
          <Button variant="ghost" className="mt-3" asChild>
            <Link to="/">살까로 가기</Link>
          </Button>
        </div>
      </div>
    )
  }

  async function handleAddOwn() {
    if (!ownTitle.trim()) {
      setOwnError("이름을 적어 주세요")
      return
    }
    setOwnError("")
    try {
      await createOwn({
        title: ownTitle.trim(),
        category: want.category,
        categoryDetail: want.categoryDetail,
        color: want.color,
        colorDetail: want.colorDetail,
      })
      setOwnTitle("")
    } catch {
      /* toast in hook */
    }
  }

  async function handleBought() {
    try {
      await markBought(want)
      navigate("/")
    } catch {
      /* toast in hook */
    }
  }

  async function handleSkipped() {
    try {
      await markSkipped(want.id)
      navigate("/")
    } catch {
      /* toast in hook */
    }
  }

  async function handleDelete() {
    try {
      await deleteWant(want.id)
      navigate("/")
    } catch {
      /* toast in hook */
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <AppHeader backTo="/" showLogout={false} />
      <div
        className="flex flex-1 flex-col gap-4 px-5 pt-4"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        {similarOwns.length > 0 ? <SimilarOwns owns={similarOwns} /> : null}

        <div className="flex flex-wrap items-center gap-2">
          <ColorSwatch color={want.color} colorDetail={want.colorDetail} />
          <span className="text-[13px] text-muted-foreground">
            {colorLabel(want.color, want.colorDetail)}
          </span>
          <Badge variant="secondary">
            {categoryLabel(want.category, want.categoryDetail)}
          </Badge>
          <StatusBadge status={want.status} />
        </div>

        <div>
          <h1 className="text-2xl font-semibold leading-[1.3]">{want.title}</h1>
          {formatPrice(want.price) ? (
            <p className="text-[13px] text-muted-foreground">
              {formatPrice(want.price)}
            </p>
          ) : null}
          {want.url ? (
            <a
              href={want.url}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-muted-foreground underline underline-offset-2"
            >
              링크 열기
            </a>
          ) : null}
          {want.note ? (
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {want.note}
            </p>
          ) : null}
        </div>

        {pending ? (
          <>
            <Field data-invalid={ownError ? true : undefined}>
              <FieldLabel htmlFor="own-title">집에 이런 거 있음</FieldLabel>
              <Input
                id="own-title"
                placeholder="예: 검정 목폴라"
                value={ownTitle}
                onChange={(event) => {
                  setOwnTitle(event.target.value)
                  setOwnError("")
                }}
                aria-invalid={Boolean(ownError)}
                className="h-10"
              />
              <FieldError>{ownError}</FieldError>
            </Field>
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-full"
              disabled={busy}
              onClick={handleAddOwn}
            >
              {ownSaving ? <Spinner data-icon="inline-start" /> : null}
              한 줄 추가
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1"
                disabled={busy}
                onClick={handleBought}
              >
                {saving ? <Spinner data-icon="inline-start" /> : null}
                샀다
              </Button>
              <Button
                type="button"
                className="h-10 flex-1"
                disabled={busy}
                onClick={handleSkipped}
              >
                {saving ? <Spinner data-icon="inline-start" /> : null}
                안 샀다
              </Button>
            </div>
          </>
        ) : null}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="mt-auto text-destructive hover:text-destructive"
            >
              이 후보 삭제
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>이 후보를 지울까요?</AlertDialogTitle>
              <AlertDialogDescription>
                목록에서 사라집니다. 이미 남긴 보유는 그대로입니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-2 gap-2">
              <AlertDialogCancel className="h-10 w-full">취소</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="h-10 w-full"
                onClick={handleDelete}
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
