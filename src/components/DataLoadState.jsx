import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function DataLoadState({ loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Spinner />
        불러오는 중
      </div>
    )
  }

  if (!error) return null

  return (
    <Alert variant="destructive">
      <AlertTitle>데이터를 불러오지 못했습니다</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{error}</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      </AlertDescription>
    </Alert>
  )
}
