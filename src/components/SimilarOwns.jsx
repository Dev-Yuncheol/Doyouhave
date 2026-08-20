import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function SimilarOwns({ owns }) {
  if (!owns?.length) return null

  return (
    <Alert className="border-transparent bg-accent text-accent-foreground border-l-4 border-l-primary">
      <AlertTitle className="text-accent-foreground">
        집에 비슷한 옷 {owns.length}개
      </AlertTitle>
      <AlertDescription className="text-accent-foreground/80">
        {owns.map((own) => own.title).join(" · ")}
      </AlertDescription>
    </Alert>
  )
}
