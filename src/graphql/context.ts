// src/graphql/context.ts
// RÔLE : contexte construit à CHAQUE requête GraphQL et transmis à tous les resolvers.
//  - actor   : l'utilisateur identifié par le JWT, ou null (visiteur anonyme)
//  - loaders : DataLoaders neufs (cache isolé par requête, donc pas de fuite entre utilisateurs)

import { verifyToken } from "../lib/jwt.js";
import type { Actor } from "../auth/policy.js";
import { createLoaders, type Loaders } from "./loaders.js";

export interface GraphQLContext {
  actor: Actor | null;
  loaders: Loaders;
}

/**
 * Même logique que getOptionalActor du REST : jeton absent ou invalide = anonyme.
 * On ne rejette PAS ici : c'est chaque resolver qui décide si l'authentification
 * est obligatoire (requireActor). Les lectures publiques restent donc possibles.
 */
function readActor(request: Request): Actor | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    return { id: payload.sub, role: payload.role };
  } catch {
    return null; // jeton invalide ou expiré : traité comme anonyme
  }
}

export function buildContext(request: Request): GraphQLContext {
  return { actor: readActor(request), loaders: createLoaders() };
}
