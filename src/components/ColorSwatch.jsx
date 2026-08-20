import { cn } from "@/lib/utils"
import { colorHex, colorLabel } from "@/lib/constants"

export function ColorSwatch({ color, colorDetail, className }) {
  const label = colorLabel(color, colorDetail)

  if (color === "other") {
    return (
      <span
        title={label}
        className={cn("size-4 shrink-0 rounded-full", className)}
        style={{
          background:
            "conic-gradient(#b86f6f 0 25%, #6f86ad 25% 50%, #7f9b7a 50% 75%, #c2aa6b 75% 100%)",
          boxShadow:
            "inset 0 0 0 1px rgba(255, 255, 255, 0.25), 0 1px 2px rgba(0, 0, 0, 0.08)",
        }}
      />
    )
  }

  return (
    <span
      title={label}
      className={cn(
        "size-4 shrink-0 rounded-full",
        color === "white" ? "border border-border" : "border border-transparent",
        color === "brown" &&
          "bg-[repeating-linear-gradient(135deg,#C4B5A0_0_2px,#b9a890_2px_3px)]",
        className,
      )}
      style={color === "brown" ? undefined : { backgroundColor: colorHex(color) }}
    />
  )
}
