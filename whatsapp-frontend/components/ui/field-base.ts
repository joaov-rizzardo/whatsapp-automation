import { cva, type VariantProps } from "class-variance-authority"

// ZapBot: a forma de um campo de formulário, em um lugar só.
//
// Input, Textarea, SelectTrigger e qualquer gatilho com cara de campo (o
// MonthPicker, por exemplo) consomem daqui — sem isso cada um herdava a medida
// que o shadcn trouxe de fábrica e a mesma linha do modal misturava alturas,
// raios e tamanhos de texto diferentes.
//
// Altura 40px (par do Button md), raio 12px, texto 15px e brilho roxo no foco.
// Largura fica de fora de propósito: quem monta a linha decide (`w-full` no
// input, `flex-1` no par "5 minutos").
const fieldVariants = cva(
  "rounded-md border border-input bg-card font-sans transition-[color,box-shadow,border-color] duration-fast ease-standard outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50",
  {
    variants: {
      size: {
        default: "h-10 px-3.5 text-base",
        sm: "h-8 px-3 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

type FieldSize = NonNullable<VariantProps<typeof fieldVariants>["size"]>

export { fieldVariants, type FieldSize }
