import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Variantes do ZapBot mapeadas sobre os nomes do shadcn, para que blocos e
// componentes que consomem `buttonVariants` continuem funcionando:
// default = primário (roxo), secondary/outline = secundário, destructive = perigo.
// No máximo um botão `default` por tela.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding font-sans font-semibold whitespace-nowrap outline-none select-none transition-[transform,filter,background-color,box-shadow] duration-fast ease-standard focus-visible:ring-4 focus-visible:ring-ring/20 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-[var(--purple-700)] bg-[linear-gradient(180deg,var(--purple-500),var(--purple-600))] text-primary-foreground shadow-[var(--shadow-zap-sm),var(--shadow-inset-top)] hover:-translate-y-px hover:brightness-[1.06]",
        secondary:
          "border-[var(--border-default)] bg-card text-foreground shadow-xs hover:-translate-y-px hover:bg-muted",
        outline:
          "border-[var(--border-default)] bg-card text-foreground shadow-xs hover:-translate-y-px hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive:
          "border-[oklch(0.42_0.19_25)] bg-[linear-gradient(180deg,var(--danger),oklch(0.48_0.19_25))] text-white shadow-[var(--shadow-zap-sm),var(--shadow-inset-top)] hover:-translate-y-px hover:brightness-[1.06] focus-visible:ring-destructive/25",
        link: "font-medium text-[var(--text-link)] underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-8 gap-1.5 px-3.5 text-sm",
        default: "h-10 gap-2 px-[18px] text-base",
        lg: "h-12 gap-2.5 px-6 text-lg",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  fullWidth,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
