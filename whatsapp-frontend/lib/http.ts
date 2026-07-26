/**
 * O cliente HTTP da API. Existe porque, a partir da persistência dos fluxos, o
 * frontend precisa distinguir *qual* erro veio: um 409 de versão para o autosave
 * e um 422 com a lista de problemas para o Publicar. Um `throw new Error(texto)`
 * não carrega isso.
 *
 * `credentials: "include"` em toda chamada: a API é outra origem (`:3333`) e sem
 * isso o navegador nunca manda o cookie de sessão.
 */

export type ApiIssue = { nodeId: string; message: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    /** O código estável do backend (`FLOW_VERSION_CONFLICT`, `NOT_PUBLISHED`…). */
    readonly code: string,
    message: string,
    /** Só o 422 da publicação traz: os problemas por bloco. */
    readonly issues?: ApiIssue[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorBody = { code?: unknown; message?: unknown; issues?: unknown };

function isIssueList(value: unknown): value is ApiIssue[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as ApiIssue).nodeId === "string" &&
        typeof (item as ApiIssue).message === "string",
    )
  );
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Resposta sem corpo JSON (um 502 de proxy, por exemplo).
  }

  return new ApiError(
    response.status,
    typeof body.code === "string" ? body.code : "UNKNOWN",
    typeof body.message === "string" ? body.message : "Não foi possível concluir a ação.",
    isIssueList(body.issues) ? body.issues : undefined,
  );
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: init.body ? { "content-type": "application/json", ...init.headers } : init.headers,
  });

  if (!response.ok) throw await toApiError(response);
  return response;
}

/** Faz a chamada e devolve o JSON cru — quem chama valida com o Zod dele. */
export async function apiRequest(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const response = await request(path, init);
  return response.status === 204 ? null : response.json();
}

export function apiJsonBody(payload: unknown): string {
  return JSON.stringify(payload);
}
