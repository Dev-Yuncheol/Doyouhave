import { CircleHelpIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const COPY = {
  home: {
    title: "살까 싶은 옷을 넣어 보세요",
    description: "지금 장바구니에 있는 것 1개면 됩니다.",
  },
  owns: {
    title: "확인할 때 한 줄만 추가하면 됩니다",
    description: "옷장 전체를 올리지 않아도 됩니다.",
    action: { to: "/", label: "살까로 가기" },
  },
  filter: {
    title: "이 조건의 옷이 없습니다",
    description: "필터를 바꿔 보세요.",
  },
}

export function EmptyState({ kind, onClear }) {
  const copy = COPY[kind]
  return (
    <Empty className="border-0 py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleHelpIcon />
        </EmptyMedia>
        <EmptyTitle className="text-base font-semibold">{copy.title}</EmptyTitle>
        <EmptyDescription className="text-[13px]">
          {copy.description}
        </EmptyDescription>
      </EmptyHeader>
      {copy.action ? (
        <EmptyContent>
          <Button
            variant={kind === "home" ? "default" : "ghost"}
            className={kind === "home" ? "h-10" : undefined}
            asChild
          >
            <Link to={copy.action.to}>{copy.action.label}</Link>
          </Button>
        </EmptyContent>
      ) : null}
      {kind === "filter" && onClear ? (
        <EmptyContent>
          <Button variant="ghost" onClick={onClear}>
            필터 해제
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}
