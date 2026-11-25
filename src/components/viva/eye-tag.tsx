import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Eye } from "@/lib/viva/types"

type Side = "right" | "left" | "both" | "none"

const LABELS: Record<Side, string> = {
  right: "Right eye",
  left: "Left eye",
  both: "Both eyes",
  none: "Whole body",
}

const eyeTagVariants = cva("gap-1.75 border-2", {
  variants: {
    side: {
      right: "border-eye-right bg-eye-right text-eye-right-foreground",
      left: "border-eye-left-foreground bg-eye-left text-eye-left-foreground",
      both: "border-foreground bg-card text-foreground",
      none: "border-dashed border-input bg-transparent text-muted-foreground",
    },
    size: {
      default: "h-7.5 text-sm",
      sm: "h-6 text-xs",
    },
  },
})

function Dot({ filled, size }: { filled: boolean; size: "default" | "sm" }) {
  return (
    <span
      className={cn(
        "rounded-full",
        size === "sm" ? "size-2" : "size-2.5",
        filled ? "bg-current" : "border-2 border-current opacity-60"
      )}
    />
  )
}

/** Which eye a finding belongs to; `null` is a whole-body finding. Right is filled, left is outlined. */
export function EyeTag({
  eye,
  size = "default",
  className,
}: {
  eye: Eye
  size?: "default" | "sm"
  className?: string
}) {
  const side: Side = eye ?? "none"
  return (
    <Badge
      variant="outline"
      className={cn(eyeTagVariants({ side, size }), className)}
    >
      <span aria-hidden="true" className="flex items-center gap-0.75">
        {side === "none" ? (
          <span className="h-0.5 w-3 bg-current" />
        ) : (
          <>
            <Dot filled={side !== "left"} size={size} />
            <Dot filled={side !== "right"} size={size} />
          </>
        )}
      </span>
      <span>{LABELS[side]}</span>
    </Badge>
  )
}
