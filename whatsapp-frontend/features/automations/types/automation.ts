import type { Automation, AutomationStatus } from "../schemas/automation";

/**
 * O que sobrou de tipo escrito à mão nesta feature: só o que é estado de tela.
 * A automação em si vem do schema Zod da resposta (`schemas/automation.ts`) —
 * era isto que a spec 004 antecipava quando dizia "quando a persistência
 * chegar, o tipo sai de um schema".
 *
 * As métricas (`conversations`, `completionRate`) saíram: dependem do motor de
 * execução, e número falso é pior que número ausente.
 */
export type { Automation, AutomationStatus };

export type AutomationStatusFilter = AutomationStatus | "all";

export type AutomationSort = "recent" | "name";
