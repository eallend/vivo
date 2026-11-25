import { cn } from "cn"
import { RiLoader4Line } from "@remixicon/react"

function Spinner({
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "children">) {
  return (
    <RiLoader4Line
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin text-primary", className)}
      {...props}
    />
  )
}

export { Spinner }
