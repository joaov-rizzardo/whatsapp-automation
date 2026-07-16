import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Chip de rótulo removível para filtros e segmentos de contato.
 *
 * O shadcn não tem equivalente — este é um componente próprio do design system
 * do ZapBot, construído sobre os mesmos tokens do Badge. Quando `onRemove` é
 * omitido, o Tag vira um chip estático (sem botão de remoção).
 */
function Tag({
  className,
  children,
  onRemove,
  removeLabel = "Remover",
  ...props
}: React.ComponentProps<"span"> & {
  onRemove?: () => void
  removeLabel?: string
}) {
  return (
    <span
      data-slot="tag"
      className={cn(
        "inline-flex h-7 w-fit shrink-0 items-center gap-1.5 rounded-full border border-border bg-card py-0.5 pl-3 font-sans text-xs font-medium text-foreground",
        onRemove ? "pr-1" : "pr-3",
        className
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${removeLabel}: ${typeof children === "string" ? children : ""}`.trim()}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast ease-standard outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <XIcon className="size-3" />
        </button>
      )}
    </span>
  )
}

export { Tag }
