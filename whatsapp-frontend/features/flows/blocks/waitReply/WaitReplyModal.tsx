"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DurationField } from "@/features/flows/components/DurationField";
import { VariableSelect } from "@/features/flows/components/VariableSelect";
import type { BlockModalProps } from "@/features/flows/blocks/types";
import type { Duration } from "@/features/flows/types/duration";

/**
 * Seconds of silence before the reply counts as finished. On WhatsApp, someone
 * who answers "oi", "quero saber", "o preço" sent a single reply — the engine
 * waits this long after the last message and treats them as one.
 */
export const DEFAULT_REPLY_GROUPING_SECONDS = 5;

/** The data a wait-reply block configures. */
export type WaitReplyData = {
  /** null = the reply is awaited but not stored. */
  variableId: string | null;
  timeout: Duration;
  /**
   * Optional because the field arrived after the first flows: a block saved
   * without it must keep working. Absent means
   * `DEFAULT_REPLY_GROUPING_SECONDS`; 0 turns the grouping off.
   */
  groupingSeconds?: number;
};

export function WaitReplyModal({
  data,
  onChange,
  onClose,
}: BlockModalProps<WaitReplyData>) {
  const [timeout, setTimeout] = useState<Duration>(data.timeout);
  const [variableId, setVariableId] = useState(data.variableId);
  const [groupingSeconds, setGroupingSeconds] = useState(
    data.groupingSeconds ?? DEFAULT_REPLY_GROUPING_SECONDS,
  );

  function save() {
    onChange({ variableId, timeout, groupingSeconds });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Aguardar resposta</DialogTitle>
        <DialogDescription>
          O fluxo para aqui até o contato responder. Se o tempo acabar antes, ele
          segue pela saída &ldquo;Tempo esgotado&rdquo;.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="wait-reply-timeout">Tempo máximo de espera</Label>
          <DurationField
            id="wait-reply-timeout"
            value={timeout}
            onChange={setTimeout}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="wait-reply-variable">
            Salvar resposta em (opcional)
          </Label>
          <VariableSelect
            id="wait-reply-variable"
            value={variableId}
            writableOnly
            onChange={setVariableId}
            placeholder="Não salvar"
          />
          {variableId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setVariableId(null)}
            >
              Não salvar a resposta
            </Button>
          ) : null}
        </div>

        {/* Fica fechado por padrão: o tempo de agrupamento tem um valor bom
            para quase todo fluxo, e quem abre o bloco quer o timeout. */}
        <Collapsible className="border-t border-border pt-3">
          <CollapsibleTrigger className="group flex w-full items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors duration-fast ease-standard hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none">
            <ChevronRight className="size-4 transition-transform duration-fast ease-standard group-data-[state=open]:rotate-90" />
            Opções avançadas
          </CollapsibleTrigger>

          <CollapsibleContent className="flex flex-col gap-2 pt-3">
            <Label htmlFor="wait-reply-grouping">
              Tempo para agrupar mensagens
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="wait-reply-grouping"
                type="number"
                min={0}
                max={60}
                className="w-28"
                value={groupingSeconds}
                onChange={(event) =>
                  // Preso na faixa aqui: o backend recusa o documento inteiro
                  // fora de 0..60, e o autosave não tem como pedir de volta.
                  setGroupingSeconds(
                    Math.min(60, Math.max(0, Number(event.target.value) || 0)),
                  )
                }
              />
              <span className="text-sm text-muted-foreground">segundos</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Quando o contato manda várias mensagens seguidas, o fluxo espera
              este tempo depois da última e trata todas como uma resposta só.
              Use 0 para seguir já na primeira mensagem.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={timeout.value <= 0}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
