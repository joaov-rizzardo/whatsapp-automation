type OrganizationError = { code?: string; message?: string };

/**
 * Maps a Better Auth organization error onto a pt-BR message.
 *
 * ORGANIZATION_ALREADY_EXISTS should be near-impossible — the slug carries a
 * random suffix — but the slug is globally unique, so the chance is not zero.
 */
export function getOrganizationErrorMessage(
  error: OrganizationError | null | undefined,
): string {
  switch (error?.code) {
    case "ORGANIZATION_ALREADY_EXISTS":
      return "Já existe uma organização com esse nome. Tente outro.";
    case "USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION":
      return "Você não faz parte dessa organização.";
    case "ORGANIZATION_NOT_FOUND":
      return "Organização não encontrada.";
    case "YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION":
      return "Você não pode criar uma organização.";
    default:
      return "Não foi possível concluir. Tente novamente em instantes.";
  }
}
