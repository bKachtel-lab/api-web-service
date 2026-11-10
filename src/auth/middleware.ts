// src/auth/middleware.ts
import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/jwt.js";
import { Errors } from "../common/errors.js";
import type { AppEnv } from "../common/router.js";

/** Exige un jeton Bearer valide, puis place l'acteur dans le contexte. */
export const authenticate = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw Errors.unauthenticated();
  }
  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    c.set("actor", { id: payload.sub, role: payload.role });
  } catch {
    // Message volontairement générique : on ne dit pas pourquoi le jeton est refusé.
    throw Errors.unauthenticated("Jeton invalide ou expiré.");
  }
  await next();
});