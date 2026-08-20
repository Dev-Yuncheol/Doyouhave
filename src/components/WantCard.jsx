import { useRef } from "react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ColorSwatch } from "@/components/ColorSwatch"
import { StatusBadge } from "@/components/StatusBadge"
import { categoryLabel, colorLabel } from "@/lib/constants"
import { cn } from "@/lib/utils"

function formatPrice(price) {
  if (price == null || price === "") return null
  return `${Number(price).toLocaleString("ko-KR")}원`
}

export function WantCard({ want, hasSimilar }) {
  const price = formatPrice(want.price)

  return (
    <Link to={`/wants/${want.id}`} className="block">
      <Card className="py-0 shadow-none ring-1 ring-border transition-colors hover:ring-foreground/25">
        <CardContent className="flex items-center gap-3 py-3.5">
          <ColorSwatch color={want.color} colorDetail={want.colorDetail} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold leading-[1.4]">
                {want.title}
              </h3>
              {price ? (
                <span className="ml-auto shrink-0 text-[13px] text-muted-foreground">
                  {price}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {hasSimilar ? (
                <>
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="text-[13px] text-muted-foreground">
                    집에 있음
                  </span>
                </>
              ) : (
                <Badge variant="secondary">
                  {categoryLabel(want.category, want.categoryDetail)}
                </Badge>
              )}
              <StatusBadge status={want.status} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function OwnCard({ own, onLongPress }) {
  const timerRef = useRef(null)
  const startPos = useRef(null)

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function trigger() {
    clearTimer()
    onLongPress?.(own)
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-pointer py-0 shadow-none ring-1 ring-border select-none transition-colors hover:ring-foreground/25",
      )}
      style={{ WebkitTouchCallout: "none" }}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return
        startPos.current = { x: event.clientX, y: event.clientY }
        timerRef.current = setTimeout(trigger, 500)
      }}
      onPointerMove={(event) => {
        if (!startPos.current || !timerRef.current) return
        const dx = event.clientX - startPos.current.x
        const dy = event.clientY - startPos.current.y
        if (dx * dx + dy * dy > 100) clearTimer()
      }}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onPointerLeave={clearTimer}
      onContextMenu={(event) => {
        event.preventDefault()
        trigger()
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onLongPress?.(own)
        }
      }}
    >
      <CardContent className="flex items-center gap-3 py-3.5">
        <ColorSwatch color={own.color} colorDetail={own.colorDetail} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold leading-[1.4]">
            {own.title}
          </h3>
          <p className="text-[13px] text-muted-foreground">
            {categoryLabel(own.category, own.categoryDetail)}
            {own.color === "other" && own.colorDetail
              ? ` · ${colorLabel(own.color, own.colorDetail)}`
              : ""}
            {" · "}
            {own.source === "bought" ? "샀을 때" : "직접 적음"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
