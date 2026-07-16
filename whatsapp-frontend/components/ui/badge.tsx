import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// No ZapBot o Badge comunica status (ativo, pausado, erro) e anda sempre com um
// tom semântico. Os tons ficam expostos como `variant` — a convenção do shadcn —
// em vez da prop `tone` dos specimens originais do design system.
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 font-sans text-xs font-semibold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        brand: "bg-brand-subtle text-[var(--purple-700)]",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success: "bg-success-bg text-[oklch(0.45_0.15_145)]",
        warning: "bg-warning-bg text-[oklch(0.45_0.15_80)]",
        danger: "bg-danger-bg text-[oklch(0.45_0.19_25)]",
        info: "bg-info-bg text-[oklch(0.45_0.15_230)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const dotVariants = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    variant: {
      default: "bg-primary-foreground",
      brand: "bg-brand",
      secondary: "bg-muted-foreground",
      outline: "bg-muted-foreground",
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-info",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function Badge({
  className,
  variant = "default",
  dot = false,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean; dot?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dot && <span data-slot="badge-dot" className={dotVariants({ variant })} />}
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
