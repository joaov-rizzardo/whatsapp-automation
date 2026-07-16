import { z } from "zod";

export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullish(),
});

export const sessionSchema = z.object({
  user: sessionUserSchema,
  session: z.object({
    // null when the user has zero organizations or several (the backend hook
    // only picks one when there is exactly one), and absent on sessions created
    // before organizations existed.
    activeOrganizationId: z.string().nullish(),
  }),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type Session = z.infer<typeof sessionSchema>;
