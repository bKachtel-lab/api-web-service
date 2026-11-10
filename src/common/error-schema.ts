import { z } from "@hono/zod-openapi";

export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.enum([
        "VALIDATION_ERROR", "UNAUTHENTICATED", "FORBIDDEN",
        "NOT_FOUND", "CONFLICT", "RATE_LIMITED", "INTERNAL_ERROR",
      ]),
      message: z.string(),
      details: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
    }),
  })
  .openapi("Error");

/** Raccourci pour déclarer une réponse d'erreur dans createRoute. */
export const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: ErrorSchema } },
});