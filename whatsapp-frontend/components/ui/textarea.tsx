import * as React from "react"

import { cn } from "@/lib/utils"
import { fieldVariants } from "@/components/ui/field-base"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldVariants(),
        // A altura fixa do campo não vale para o textarea: ele cresce com o
        // conteúdo a partir de um mínimo.
        "field-sizing-content h-auto min-h-20 w-full py-2.5",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
