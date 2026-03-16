import * as SwitchPrimitives from "@radix-ui/react-switch"
import * as React from "react"
import { cn } from "@/lib/utils"

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    style={{
      backgroundColor: props.checked ? "hsl(var(--primary))" : "hsl(var(--muted))",
      borderColor: props.checked ? "hsl(var(--primary))" : "hsl(var(--border))",
    }}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      style={{ backgroundColor: "hsl(var(--background))" }}
      className={cn(
        "pointer-events-none block size-5 rounded-full border border-border bg-background ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName
