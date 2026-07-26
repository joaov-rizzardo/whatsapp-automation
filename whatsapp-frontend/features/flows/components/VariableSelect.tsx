"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFlowVariablesContext } from "@/features/flows/components/FlowVariablesContext";
import { VariableFormDialog } from "@/features/flows/components/VariableFormDialog";
import type { VariableType } from "@/features/flows/types/variable";

/** Sentinel for the "create one" row — not a real variable id. */
const CREATE = "__create__";

/**
 * Picks a variable, grouped into custom and system, with an inline "create
 * one…" row so the user never has to leave a block's modal to declare what they
 * just realised they need.
 *
 * `writableOnly` hides system variables — they can be compared but never
 * written to. `filterType` narrows to one type, for fields that only accept
 * one (the right-hand side of a comparison).
 */
export function VariableSelect({
  value,
  onChange,
  writableOnly = false,
  filterType,
  placeholder = "Escolha uma variável",
  id,
}: {
  value: string | null;
  onChange: (variableId: string) => void;
  writableOnly?: boolean;
  filterType?: VariableType;
  placeholder?: string;
  id?: string;
}) {
  const { variables, createVariable } = useFlowVariablesContext();
  const [creating, setCreating] = useState(false);

  const matches = variables.filter(
    (variable) => !filterType || variable.type === filterType,
  );
  const custom = matches.filter((variable) => variable.origin === "custom");
  const system = writableOnly
    ? []
    : matches.filter((variable) => variable.origin === "system");

  // A reference to a deleted variable must not silently look empty — the block
  // still points at it, and its `validate` says so.
  const isMissing = Boolean(value) && !variables.some((v) => v.id === value);

  return (
    <>
      <Select
        value={value ?? ""}
        onValueChange={(next) => {
          if (next === CREATE) {
            setCreating(true);
            return;
          }
          onChange(next);
        }}
      >
        <SelectTrigger id={id} className="w-full">
          {isMissing ? (
            <span className="text-danger">Variável removida</span>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>

        <SelectContent>
          {custom.length > 0 ? (
            <SelectGroup>
              <SelectLabel>Personalizadas</SelectLabel>
              {custom.map((variable) => (
                <SelectItem key={variable.id} value={variable.id}>
                  {variable.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}

          {system.length > 0 ? (
            <SelectGroup>
              <SelectLabel>Do sistema</SelectLabel>
              {system.map((variable) => (
                <SelectItem key={variable.id} value={variable.id}>
                  {variable.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}

          {custom.length > 0 || system.length > 0 ? <SelectSeparator /> : null}

          <SelectGroup>
            <SelectItem value={CREATE}>＋ Criar variável…</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <VariableFormDialog
        open={creating}
        onOpenChange={setCreating}
        variables={variables.filter((variable) => variable.origin === "custom")}
        onSubmit={(values) => {
          // Select what was just created — the user asked for it here, in this
          // field; making them pick it again would be busywork.
          const created = createVariable(values);
          onChange(created.id);
        }}
      />
    </>
  );
}
