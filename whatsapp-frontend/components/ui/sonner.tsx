"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      /*
       * Fixo em "light" porque o app não tem dark mode — nada alterna a classe
       * `.dark`, então as superfícies são sempre claras. O padrão do shadcn aqui
       * é `useTheme()` do next-themes, mas não há ThemeProvider montado: o hook
       * devolvia undefined, caía no default "system", e o sonner resolvia
       * `prefers-color-scheme` por conta própria. Num SO em modo escuro ele
       * marcava o toast como dark e pintava a descrição de quase branco sobre o
       * card branco. Ao adicionar dark mode ao design system, revisar isto.
       */
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
