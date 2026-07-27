"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

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
import { ConditionValueField } from "@/features/flows/blocks/condition/ConditionValueField";
import {
  findVariable,
  useFlowVariablesContext,
} from "@/features/flows/components/FlowVariablesContext";
import { VariableSelect } from "@/features/flows/components/VariableSelect";
import { getDefaultOperator, getOperator, getOperators } from "@/features/flows/lib/operators";
import type { BlockModalProps } from "@/features/flows/blocks/types";
import {
  emptyLiteral,
  emptyValueFor,
  type ComparisonValue,
} from "@/features/flows/types/comparisonValue";
import type { VariableType } from "@/features/flows/types/variable";

export type Comparison = {
  id: string;
  variableId: string | null;
  operator: string;
  right: ComparisonValue;
};

export type ConditionLogic = "and" | "or";

/** The data a condition block configures. */
export type ConditionData = {
  logic: ConditionLogic;
  comparisons: Comparison[];
};

export const conditionLogicLabels: Record<ConditionLogic, string> = {
  and: "E",
  or: "OU",
};

let sequence = 0;

export function createComparison(): Comparison {
  sequence += 1;
  return {
    id: `cmp-${Date.now()}-${sequence}`,
    variableId: null,
    operator: "eq",
    right: emptyLiteral,
  };
}

export function ConditionModal({
  data,
  onChange,
  onClose,
}: BlockModalProps<ConditionData>) {
  const { variables } = useFlowVariablesContext();
  const [logic, setLogic] = useState<ConditionLogic>(data.logic);
  const [comparisons, setComparisons] = useState<Comparison[]>(data.comparisons);

  function update(id: string, patch: Partial<Comparison>) {
    setComparisons((current) =>
      current.map((comparison) =>
        comparison.id === id ? { ...comparison, ...patch } : comparison,
      ),
    );
  }

  /**
   * Changing the left-hand variable can invalidate everything to its right: a
   * `>` makes no sense once the variable is text. Reset the operator to the
   * first of the new type and clear the value, rather than leaving a state that
   * can't be evaluated.
   */
  function changeVariable(comparison: Comparison, variableId: string) {
    const variable = findVariable(variables, variableId);
    const operator = variable ? getDefaultOperator(variable.type) : "eq";
    const kind = variable
      ? getOperator(variable.type, operator)?.value
      : undefined;

    update(comparison.id, {
      variableId,
      operator,
      right: emptyValueFor(kind ?? "single"),
    });
  }

  /**
   * The value's shape belongs to the operator, so switching from `está entre`
   * to `é depois de` has to drop the range — keeping it would leave a value
   * nothing on screen can edit, and publishing would refuse it.
   */
  function changeOperator(comparison: Comparison, type: VariableType, next: string) {
    update(comparison.id, {
      operator: next,
      right: emptyValueFor(getOperator(type, next)?.value ?? "single"),
    });
  }

  function save() {
    onChange({ logic, comparisons });
    onClose();
  }

  const canSave =
    comparisons.length > 0 &&
    comparisons.every((comparison) => Boolean(comparison.variableId));

  return (
    <>
      <DialogHeader>
        <DialogTitle>Configurar condição</DialogTitle>
        <DialogDescription>
          O fluxo segue por &ldquo;Verdadeiro&rdquo; quando as condições forem
          satisfeitas, e por &ldquo;Falso&rdquo; caso contrário.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-2">
        {comparisons.length > 1 ? (
          <div className="flex items-center gap-3">
            <Label htmlFor="condition-logic">Combinar condições com</Label>
            <Select
              value={logic}
              onValueChange={(next) => setLogic(next as ConditionLogic)}
            >
              <SelectTrigger id="condition-logic" size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">E (todas)</SelectItem>
                <SelectItem value="or">OU (qualquer uma)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {comparisons.map((comparison, index) => {
            const variable = findVariable(variables, comparison.variableId);
            const operators = variable ? getOperators(variable.type) : [];
            const operator = variable
              ? getOperator(variable.type, comparison.operator)
              : undefined;

            return (
              <div key={comparison.id} className="flex flex-col gap-2">
                {index > 0 ? (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {conditionLogicLabels[logic]}
                  </span>
                ) : null}

                <div className="flex items-start gap-2">
                  <div className="flex flex-1 flex-col gap-2">
                    <VariableSelect
                      value={comparison.variableId}
                      onChange={(variableId) =>
                        changeVariable(comparison, variableId)
                      }
                    />

                    {variable ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={comparison.operator}
                          onValueChange={(next) =>
                            changeOperator(comparison, variable.type, next)
                          }
                        >
                          <SelectTrigger className="w-44 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Operators with no right-hand side ("está vazio",
                            "é fim de semana") lose the field, not enable it. */}
                        {operator ? (
                          <ConditionValueField
                            variable={variable}
                            valueKind={operator.value}
                            value={comparison.right}
                            onChange={(right) =>
                              update(comparison.id, { right })
                            }
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover condição"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      setComparisons((current) =>
                        current.filter((item) => item.id !== comparison.id),
                      )
                    }
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() =>
            setComparisons((current) => current.concat(createComparison()))
          }
        >
          <Plus className="size-4" />
          Adicionar condição
        </Button>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={!canSave}>
          Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
