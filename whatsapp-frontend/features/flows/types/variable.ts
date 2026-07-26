/**
 * A flow variable. Custom ones are declared by the user in the variables panel
 * (the single source of truth — there is no variable referenced that doesn't
 * exist); system ones are constants the runtime will fill in.
 *
 * `origin` unifies both under one type so `VariableSelect` and the condition
 * block treat them the same way. System variables are read-only: they can be
 * compared, never written to.
 *
 * Blocks store a variable's **id**, not its name, so renaming in the panel
 * never breaks a select. The one reference by name is `{{name}}` inside a
 * message text, handled by the `renameVariable` hook on the block definition.
 */

export type VariableType = "text" | "number" | "boolean";

export type FlowVariable = {
  id: string;
  name: string; // unique slug: lowercase, digits and _
  type: VariableType;
  initialValue: string; // always a string; `type` says how to read it
  origin: "custom" | "system";
  description?: string; // system variables only, shown in the panel
};

export const variableTypeLabels: Record<VariableType, string> = {
  text: "Texto",
  number: "Número",
  boolean: "Booleano",
};
