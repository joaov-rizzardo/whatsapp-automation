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

/** The types a user can declare — the only ones the document ever stores. */
export const customVariableTypes = ["text", "number", "boolean"] as const;

/**
 * The **special** types: hora, data, mês and dia da semana. Only system
 * variables have them, which is exactly what keeps them out of the document —
 * no new persisted shape, no migration.
 *
 * They aren't text because the comparison that matters isn't textual: "está
 * entre 08:00 e 18:00" and "é um dos: dez, jan" need a right-hand side with
 * another shape, and an order between two values.
 */
export const specialVariableTypes = ["time", "date", "month", "weekday"] as const;

export type CustomVariableType = (typeof customVariableTypes)[number];
export type SpecialVariableType = (typeof specialVariableTypes)[number];
export type VariableType = CustomVariableType | SpecialVariableType;

export function isSpecialType(type: VariableType): type is SpecialVariableType {
  return (specialVariableTypes as readonly string[]).includes(type);
}

export type FlowVariable = {
  id: string;
  name: string; // unique slug: lowercase, digits and _
  type: VariableType;
  initialValue: string; // always a string; `type` says how to read it
  origin: "custom" | "system";
  description?: string; // system variables only, shown in the panel
};

/**
 * A variable the user declared — the only kind that travels in the document,
 * which is why its type is the narrow one. Everything that serializes takes it.
 */
export type CustomFlowVariable = FlowVariable & {
  type: CustomVariableType;
  origin: "custom";
};

export const variableTypeLabels: Record<VariableType, string> = {
  text: "Texto",
  number: "Número",
  boolean: "Booleano",
  time: "Hora",
  date: "Data",
  month: "Mês",
  weekday: "Dia da semana",
};

/** What the variable form offers — the special types belong to the runtime. */
export const customVariableTypeLabels: Record<CustomVariableType, string> = {
  text: variableTypeLabels.text,
  number: variableTypeLabels.number,
  boolean: variableTypeLabels.boolean,
};
