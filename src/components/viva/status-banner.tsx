import type { ReactNode } from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const bannerVariants = cva(
  "flex shrink-0 items-center gap-3 border-t px-6 py-2.5 text-base leading-[1.4]",
  {
    variants: {
      tone: {
        info: "border-primary bg-accent [&>[data-icon]]:text-primary",
        warning:
          "border-warning-foreground bg-warning [&>[data-icon]]:text-warning-foreground",
      },
    },
  }
)

/**
 * A full-width strip above the turn dock: no voice support (info), microphone
 * blocked or saving failed (warning). `action` is an optional button.
 */
export function StatusBanner({
  tone,
  icon,
  title,
  children,
  action,
  className,
}: {
  tone: "info" | "warning"
  icon: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div role="alert" className={cn(bannerVariants({ tone }), className)}>
      <span data-icon aria-hidden="true" className="flex [&_svg]:size-5">
        {icon}
      </span>
      <div className="grow">
        <strong>{title}</strong> {children}
      </div>
      {action}
    </div>
  )
}
