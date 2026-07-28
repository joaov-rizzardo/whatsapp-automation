import * as React from "react"

import { cn } from "@/lib/utils"
import { fieldVariants } from "@/components/ui/field-base"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldVariants(),
        // Só o que é do input: o campo de arquivo e o mínimo que impede o flex
        // de espremer o campo abaixo do conteúdo.
        "w-full min-w-0 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
