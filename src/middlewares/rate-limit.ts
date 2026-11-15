import { createMiddleware } from "hono/factory";
import { AppError } from "../common/errors.js";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitBucket>();

/**
 * Middleware de limitation de débit sur la route de connexion.
 * Bloque au-delà de `maxAttempts` requêtes sur une fenêtre de `windowMs` ms
 * et renvoie une erreur 429 RATE_LIMITED avec l'en-tête Retry-After.
 */
export function rateLimitLogin(maxAttempts = 5, windowMs = 60_000) {
  return createMiddleware(async (c, next) => {
    const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    const realIp = c.req.header("x-real-ip")?.trim();
    const key = forwarded || realIp || "default-client";

    const now = Date.now();
    const bucket = store.get(key);

    if (!bucket || now > bucket.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    if (bucket.count >= maxAttempts) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      c.header("Retry-After", String(retryAfterSec));
      throw new AppError(
        "RATE_LIMITED",
        `Trop de tentatives de connexion. Réessayez dans ${retryAfterSec} secondes.`
      );
    }

    bucket.count += 1;
    await next();
  });
}

/** Utilitaire pour réinitialiser le compteur entre deux tests automatisés. */
export function resetRateLimitStore() {
  store.clear();
}