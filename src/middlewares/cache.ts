// src/middlewares/cache.ts
// RÔLE : politique de cache HTTP (Cache-Control + ETag/304).
//  - no-store : données sensibles ou changeantes (/auth/*, mutations, erreurs)
//  - public   : lectures anonymes, partageables par les caches intermédiaires
//  - private  : la réponse dépend de l'utilisateur (brouillons visibles) -> jamais en cache partagé
//  - ETag     : le client revalide avec If-None-Match, le serveur répond 304 si rien n'a changé

import { createHash } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/jwt.js";

/** Interdit tout stockage : /auth/*, /graphql, mutations. */
export const noStore = createMiddleware(async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

/** Un jeton valide = réponse potentiellement personnalisée (brouillons). */
function isAuthenticated(authHeader?: string): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  try {
    verifyToken(authHeader.slice("Bearer ".length));
    return true;
  } catch {
    return false; // jeton invalide : traité comme anonyme
  }
}

/** Retire espaces, préfixe faible W/ et guillemets : "abc", W/"abc" et abc sont équivalents. */
const normalizeTag = (t: string): string =>
  t.trim().replace(/^W\//, "").replace(/^"|"$/g, "");

function parseIfNoneMatch(value?: string): Set<string> {
  if (!value) return new Set();
  return new Set(value.split(",").map(normalizeTag));
}

export const httpCache = (maxAgeSeconds = 60) =>
  createMiddleware(async (c, next) => {
    await next();

    // Mutations, erreurs et tout ce qui n'est pas une lecture réussie : jamais de cache.
    if (c.req.method !== "GET" || c.res.status !== 200) {
      c.header("Cache-Control", "no-store");
      return;
    }

    const connected = isAuthenticated(c.req.header("Authorization"));
    const cacheControl = connected
      ? "private, no-cache" // stockable seulement par le navigateur, revalidation obligatoire
      : `public, max-age=${maxAgeSeconds}`;

    // ETag = empreinte du corps exact de la réponse.
    const body = await c.res.clone().text();
    const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;

    const headers = new Headers(c.res.headers);
    headers.set("Cache-Control", cacheControl);
    headers.set("ETag", etag);
    headers.append("Vary", "Authorization");

    if (
      parseIfNoneMatch(c.req.header("If-None-Match")).has(normalizeTag(etag))
    ) {
      headers.delete("Content-Type");
      headers.delete("Content-Length");
      c.res = new Response(null, { status: 304, headers }); // rien à renvoyer
      return;
    }

    c.res = new Response(body, { status: 200, headers });
  });
