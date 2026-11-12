// src/common/router.ts
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Actor } from "../auth/policy.js";
import { Errors } from "./errors.js";

/** Variables disponibles dans le contexte Hono (posées par le middleware). */
export type AppEnv = { Variables: { actor: Actor } };

/**
 * Chaque routeur doit être créé avec ce hook : toute erreur de validation
 * (body, query, path) est convertie vers la forme d'erreur unique, en 400.
 */
export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const details = result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        }));
        return c.json(Errors.validation(details).toBody(), 400);
      }
    },
  });
}