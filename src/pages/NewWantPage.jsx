import { useNavigate } from "react-router-dom"
import { AppHeader } from "@/components/AppHeader"
import { WantForm } from "@/components/WantForm"
import { useOwns } from "@/hooks/useOwns"
import { useWants } from "@/hooks/useWants"

export function NewWantPage() {
  const navigate = useNavigate()
  const { createWant, saving } = useWants()
  const { similar } = useOwns()

  async function handleSubmit(payload) {
    try {
      const want = await createWant(payload)
      navigate(`/wants/${want.id}`, { replace: true })
    } catch {
      /* toast in hook */
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <AppHeader backTo="/" backLabel="취소" showLogout={false} />
      <div
        className="flex flex-1 flex-col gap-4 px-5 pt-4"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <div>
          <h1 className="text-2xl font-semibold leading-[1.3]">살까 싶은 옷</h1>
          <p className="text-[13px] text-muted-foreground">
            이름, 카테고리, 색만 있으면 됩니다.
          </p>
        </div>
        <WantForm
          findSimilar={similar}
          saving={saving}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
