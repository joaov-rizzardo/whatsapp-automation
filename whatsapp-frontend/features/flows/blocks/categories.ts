/**
 * Block categories do two jobs at once: they group the palette and they give a
 * block its colour. A definition declares `category`, never a loose colour —
 * that's what keeps two blocks of the same kind from drifting apart visually.
 *
 * The class strings are written out in full on purpose. Tailwind scans source
 * text, so a class assembled at runtime (`text-block-${key}`) is never
 * generated — it would compile to nothing, silently. Same reason the
 * `--color-block-*` entries must exist in `@theme inline` in globals.css.
 */

export type BlockCategoryKey = "message" | "input" | "logic" | "data" | "time";

export type BlockCategory = {
  key: BlockCategoryKey;
  label: string;
  order: number; // section order in the palette
  accentClass: string; // icon/text colour
  surfaceClass: string; // icon tile background
  dotClass: string; // the category dot next to the section title
};

export const blockCategories: Record<BlockCategoryKey, BlockCategory> = {
  message: {
    key: "message",
    label: "Mensagem",
    order: 1,
    accentClass: "text-block-message",
    surfaceClass: "bg-block-message-bg",
    dotClass: "bg-block-message",
  },
  input: {
    key: "input",
    label: "Interação",
    order: 2,
    accentClass: "text-block-input",
    surfaceClass: "bg-block-input-bg",
    dotClass: "bg-block-input",
  },
  logic: {
    key: "logic",
    label: "Lógica",
    order: 3,
    accentClass: "text-block-logic",
    surfaceClass: "bg-block-logic-bg",
    dotClass: "bg-block-logic",
  },
  data: {
    key: "data",
    label: "Dados",
    order: 4,
    accentClass: "text-block-data",
    surfaceClass: "bg-block-data-bg",
    dotClass: "bg-block-data",
  },
  time: {
    key: "time",
    label: "Tempo",
    order: 5,
    accentClass: "text-block-time",
    surfaceClass: "bg-block-time-bg",
    dotClass: "bg-block-time",
  },
};

export const orderedCategories = Object.values(blockCategories).sort(
  (a, b) => a.order - b.order,
);

export function getCategory(key: BlockCategoryKey): BlockCategory {
  return blockCategories[key];
}
