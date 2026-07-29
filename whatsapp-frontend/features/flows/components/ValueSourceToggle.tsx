"use client";

import { Braces, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ValueSource = "literal" | "variable";

/**
 * Escolhe de onde vem o valor de um campo: digitado agora ou lido de uma
 * variável do fluxo.
 *
 * É um segmentado de duas opções, e não um botão único que alterna, porque um
 * botão só mostra a *ação* — nunca o estado atual. Com dois segmentos a opção
 * ativa fica visível sem clicar, que era o que faltava.
 *
 * O `Braces` é o mesmo ícone que o compositor de mensagem usa para
 * `{{variáveis}}`: dentro do editor, chaves significam variável em todo lugar.
 */
export function ValueSourceToggle({
  value,
  onChange,
}: {
  value: ValueSource;
  onChange: (value: ValueSource) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Origem do valor"
      // Trilho na altura do campo ao lado (40px) para a linha não desalinhar.
      className="flex h-10 shrink-0 items-center gap-0.5 rounded-md border border-input bg-secondary p-1"
    >
      <Segment
        active={value === "literal"}
        label="Valor fixo"
        hint="Digite o valor aqui mesmo."
        onSelect={() => onChange("literal")}
      >
        <Pencil className="size-4" />
      </Segment>

      <Segment
        active={value === "variable"}
        label="Valor de uma variável"
        hint="Usa o que estiver guardado numa variável do fluxo."
        onSelect={() => onChange("variable")}
      >
        <Braces className="size-4" />
      </Segment>
    </div>
  );
}

/**
 * Só avisa quando a opção muda: trocar de origem descarta o valor anterior, e
 * clicar de novo no segmento já ativo não pode apagar o que a pessoa digitou.
 */
function Segment({
  active,
  label,
  hint,
  onSelect,
  children,
}: {
  active: boolean;
  label: string;
  hint: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={active}
          aria-label={label}
          onClick={() => {
            if (!active) onSelect();
          }}
          className={cn(
            "flex size-7 items-center justify-center rounded-sm transition-[color,box-shadow,background-color] duration-fast ease-standard",
            "focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none",
            active
              ? "bg-card text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className="flex-col items-start gap-0.5">
        <span className="font-semibold">{label}</span>
        <span className="text-background/75">{hint}</span>
      </TooltipContent>
    </Tooltip>
  );
}
