import { useWardrobeData } from "@/hooks/useWardrobeData"

export function MembershipStatus() {
  const { membership } = useWardrobeData()
  if (!membership) return null
  const paid = membership.plan === "PAID"
  return (
    <section aria-label="회원 이용 안내" className="rounded-lg border bg-muted/30 px-3 py-2.5 text-[13px]" aria-live="polite">
      <p className="font-medium">
        {paid ? "유료 회원 · 저장 횟수와 보관 기간 제한 없음" : `일반 회원 · 체험 저장 ${membership.trialSaveCount}/50회 사용 · ${membership.savesRemaining}회 남음`}
      </p>
      {!paid && <p className="mt-1 text-muted-foreground">저장일부터 30일 보관됩니다. 삭제·만료되어도 횟수는 복구되지 않으며, 매달 초기화되지 않습니다.</p>}
      {!membership.canSave && <p className="mt-1 text-destructive">체험 저장을 모두 사용했습니다. 남아 있는 항목은 보관 기간 내에 확인·수정할 수 있습니다.</p>}
    </section>
  )
}

export function RetentionLabel({ expiresAt }) {
  const { now } = useWardrobeData()
  if (!expiresAt) return null
  const date = new Date(expiresAt)
  const days = Math.max(0, Math.ceil((date.getTime() - now) / 86_400_000))
  return <p className="mt-1 text-xs text-muted-foreground">{days <= 7 ? `보관 ${days}일 남음 · ` : ""}{date.toLocaleDateString("ko-KR")}까지 보관</p>
}
