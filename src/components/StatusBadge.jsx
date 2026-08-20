import { Badge } from "@/components/ui/badge"
import { statusLabel } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function StatusBadge({ status, className }) {
  if (status === "skipped") {
    return (
      <Badge
        className={cn(
          "border-transparent bg-accent text-accent-foreground",
          className,
        )}
      >
        {statusLabel(status)}
      </Badge>
    )
  }

  return (
    <Badge
      variant={status === "bought" ? "secondary" : "outline"}
      className={cn(status === "bought" && "text-muted-foreground", className)}
    >
      {statusLabel(status)}
    </Badge>
  )
}
