type AuthError = { code?: string; message?: string };

/**
 * Maps a Better Auth error onto a pt-BR message.
 *
 * Sign-in failures deliberately collapse into one message: telling the person
 * whether the email or the password was wrong turns the form into an account
 * enumeration oracle.
 */
export function getAuthErrorMessage(error: AuthError | null | undefined): string {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
      return "E-mail ou senha inválidos.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Este e-mail já está cadastrado.";
    case "PASSWORD_TOO_SHORT":
      return "A senha precisa ter no mínimo 8 caracteres.";
    case "PASSWORD_TOO_LONG":
      return "A senha é longa demais.";
    case "INVALID_EMAIL":
      return "E-mail inválido.";
    default:
      return "Não foi possível concluir. Tente novamente em instantes.";
  }
}
