export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";

  constructor(message = "Recurso não encontrado") {
    super(message);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";

  constructor(message = "Recurso já existe") {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message = "Não autenticado") {
    super(message);
  }
}

/**
 * 403, not 401: the user *is* authenticated, they just have no active
 * organization. The frontend tells the two apart — 401 goes to /login, this one
 * goes to /select-organization.
 */
export class OrganizationRequiredError extends AppError {
  readonly statusCode = 403;
  readonly code = "ORGANIZATION_REQUIRED";

  constructor(message = "Nenhuma organização ativa na sessão") {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";

  constructor(message = "Requisição inválida") {
    super(message);
  }
}

/**
 * 409 — tentaram ativar uma automação que nunca foi publicada. Ativar é "pode
 * atender": sem versão no ar não há o que atender.
 */
export class NotPublishedError extends AppError {
  readonly statusCode = 409;
  readonly code = "NOT_PUBLISHED";

  constructor(message = "Publique o fluxo antes de ativar a automação") {
    super(message);
  }
}

/**
 * 400 — o documento traz um tipo de bloco que este backend não conhece. Código
 * próprio porque diz uma coisa específica ao cliente: "atualize o app" (ou, em
 * desenvolvimento, "faltou o arquivo do bloco deste lado").
 */
export class UnknownBlockTypeError extends AppError {
  readonly statusCode = 400;
  readonly code = "UNKNOWN_BLOCK_TYPE";

  constructor(readonly blockType: string) {
    super(`Tipo de bloco desconhecido: ${blockType}`);
  }
}

/** Um problema atribuído a um nó do fluxo. Mora aqui porque é o que o
 *  FlowInvalidError carrega até o cliente; o registry de blocos o reexporta. */
export type ValidationIssue = { nodeId: string; message: string };

/**
 * 409 — o rascunho avançou desde que o cliente o carregou. Código próprio, e
 * não o ConflictError genérico, porque o frontend trata este caso de um jeito
 * específico: para o autosave e oferece recarregar.
 */
export class VersionConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "FLOW_VERSION_CONFLICT";

  constructor(message = "Este fluxo foi alterado em outro lugar") {
    super(message);
  }
}

/**
 * 422 — o fluxo está estruturalmente válido mas não pode entrar no ar. Carrega
 * a lista de problemas por nó, que é a única informação extra que o
 * error-handler repassa — e é segura, são mensagens sobre o que o próprio
 * usuário montou.
 */
export class FlowInvalidError extends AppError {
  readonly statusCode = 422;
  readonly code = "FLOW_INVALID";

  constructor(
    readonly issues: ValidationIssue[],
    message = "Corrija os problemas do fluxo antes de publicar",
  ) {
    super(message);
  }
}
