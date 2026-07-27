"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComparisonValueField } from "@/features/flows/components/ComparisonValueField";
import {
  findVariable,
  useFlowVariablesContext,
} from "@/features/flows/components/FlowVariablesContext";
import { VariableSelect } from "@/features/flows/components/VariableSelect";
import type { BlockModalProps } from "@/features/flows/blocks/types";
import {
  emptyLiteral,
  type ComparisonValue,
} from "@/features/flows/types/comparisonValue";
import { isSpecialType } from "@/features/flows/types/variable";

export type SetVariableOperation = "set" | "increment" | "decrement";

/** The data a set-variable block configures. */
export type SetVariableData = {
  variableId: string | null;
  operation: SetVariableOperation;
  value: ComparisonValue;
};

export const setVariableOperationLabels: Record<SetVariableOperation, string> = {
  set: "Definir como",
  increment: "Somar",
  decrement: "Subtrair",
};

export function SetVariableModal({
  data,
  onChange,
  onClose,
}: BlockModalProps<SetVariableData>) {
  const { variables } = useFlowVariablesContext();
  const [variableId, setVariableId] = useState(data.variableId);
  const [operation, setOperation] = useState(data.operation);
  const [value, setValue] = useState(data.value);

  const target = findVariable(variables, variableId);
  // Arithmetic only makes sense on a number, so the operation select simply
  // isn't there for the other types — and a leftover "somar" from a previous
  // pick is reset when the target changes.
  const supportsArithmetic = target?.type === "number";

  // O alvo sai de um seletor `writableOnly`, então nunca é do sistema — e só as
  // do sistema têm tipo especial. O fallback é para o compilador, não para a UI.
  const targetType =
    target && !isSpecialType(target.type) ? target.type : "text";

  function save() {
    onChange({ variableId, operation, value });
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Definir variável</DialogTitle>
        <DialogDescription>
          Grava um valor numa variável para usar mais adiante no fluxo.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="set-variable-target">Variável</Label>
          <VariableSelect
            id="set-variable-target"
            value={variableId}
            writableOnly
            onChange={(next) => {
              setVariableId(next);
              setOperation("set");
              setValue(emptyLiteral);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Só variáveis personalizadas — as do sistema são somente leitura.
          </p>
        </div>

        {supportsArithmetic ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="set-variable-operation">Operação</Label>
            <Select
              value={operation}
              onValueChange={(next) =>
                setOperation(next as SetVariableOperation)
              }
            >
              <SelectTrigger id="set-variable-operation" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(setVariableOperationLabels).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {target ? (
          <div className="flex flex-col gap-2">
            <Label>Valor</Label>
            <ComparisonValueField
              value={value}
              onChange={setValue}
              type={supportsArithmetic ? "number" : targetType}
            />
          </div>
        ) : null}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={!target}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
