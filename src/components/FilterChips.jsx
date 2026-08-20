import { Button } from "@/components/ui/button"
import { CATEGORIES, COLORS } from "@/lib/constants"
import { ColorSwatch } from "@/components/ColorSwatch"
import { cn } from "@/lib/utils"

export function FilterChips({
  value,
  onChange,
  type = "category",
  includeAll = true,
}) {
  const options =
    type === "color"
      ? COLORS
      : CATEGORIES

  return (
    <div className="flex flex-wrap gap-2">
      {includeAll ? (
        <Chip active={!value} onClick={() => onChange("")}>
          전체
        </Chip>
      ) : null}
      {options.map((option) => (
        <Chip
          key={option.value}
          active={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {type === "color" ? (
            <span className="flex items-center gap-1.5">
              <ColorSwatch color={option.value} className="size-3" />
              {option.label}
            </span>
          ) : (
            option.label
          )}
        </Chip>
      ))}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-3",
        active
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "text-muted-foreground",
      )}
    >
      {children}
    </Button>
  )
}
