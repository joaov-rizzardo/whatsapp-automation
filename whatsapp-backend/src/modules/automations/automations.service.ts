import { NotFoundError, NotPublishedError } from "../../shared/errors.js";
import type {
  AutomationRecord,
  AutomationsRepository,
} from "./automations.repository.js";
import {
  toAutomationView,
  type AutomationView,
  type CreateAutomationInput,
  type UpdateAutomationInput,
} from "./automations.schema.js";
import type { FlowRepository } from "./flow.repository.js";
import {
  countBlocks,
  createInitialDocument,
  deriveTrigger,
} from "./flow.service.js";

/**
 * A automação como entidade de produto: criar, renomear, ativar, duplicar,
 * excluir. O fluxo dela é o `FlowService`, no mesmo módulo porque os dois são
 * um agregado só — a automação nunca existe sem rascunho.
 */
export class AutomationsService {
  constructor(
    private readonly automations: AutomationsRepository,
    private readonly flows: FlowRepository,
  ) {}

  /** Id de outra organização responde 404, nunca 403: um 403 confirmaria que o
   *  recurso existe. */
  private async requireAutomation(
    id: string,
    organizationId: string,
  ): Promise<AutomationRecord> {
    const automation = await this.automations.findById(id, organizationId);
    if (!automation) throw new NotFoundError("Automação não encontrada.");
    return automation;
  }

  async list(organizationId: string): Promise<AutomationView[]> {
    const records = await this.automations.findMany(organizationId);
    return records.map(toAutomationView);
  }

  async get(id: string, organizationId: string): Promise<AutomationView> {
    return toAutomationView(await this.requireAutomation(id, organizationId));
  }

  /** A automação e o rascunho nascem juntos, então `GET .../flow` nunca precisa
   *  tratar "não tem". */
  async create(
    organizationId: string,
    { name }: CreateAutomationInput,
  ): Promise<AutomationView> {
    const document = createInitialDocument();

    const created = await this.automations.create({
      organizationId,
      name: name.trim(),
      document,
      trigger: deriveTrigger(document),
      blockCount: countBlocks(document),
    });

    return toAutomationView(created);
  }

  async update(
    id: string,
    organizationId: string,
    input: UpdateAutomationInput,
  ): Promise<AutomationView> {
    const automation = await this.requireAutomation(id, organizationId);

    // Ativar exige publicação; desativar é sempre permitido — pausar algo que
    // não deveria estar no ar não pode depender de nada.
    if (input.isActive === true && automation.publishedVersionNumber === null) {
      throw new NotPublishedError();
    }

    const updated = await this.automations.update(id, organizationId, {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });
    if (!updated) throw new NotFoundError("Automação não encontrada.");

    return toAutomationView(updated);
  }

  /**
   * A cópia leva o desenho do fluxo e os derivados dele, e nada mais: nasce
   * rascunho, inativa e sem versões. O que estava no ar é da original.
   */
  async duplicate(id: string, organizationId: string): Promise<AutomationView> {
    const source = await this.requireAutomation(id, organizationId);

    const draft = await this.flows.findDraft(id);
    if (!draft) throw new NotFoundError("Automação não encontrada.");

    const created = await this.automations.create({
      organizationId,
      name: `${source.name} (cópia)`,
      document: draft.document,
      trigger: deriveTrigger(draft.document),
      blockCount: countBlocks(draft.document),
    });

    return toAutomationView(created);
  }

  /** O cascade do banco leva rascunho e versões junto. */
  async remove(id: string, organizationId: string): Promise<void> {
    const deleted = await this.automations.delete(id, organizationId);
    if (!deleted) throw new NotFoundError("Automação não encontrada.");
  }
}
