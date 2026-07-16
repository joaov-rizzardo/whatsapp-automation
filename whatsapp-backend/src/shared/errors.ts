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
