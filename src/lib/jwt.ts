// src/lib/jwt.ts
// JWT sans état : le serveur ne stocke rien, il vérifie juste la signature.
// pas de table session, et un jeton volé reste
// valide jusqu'à expiration, d'où une durée courte.
import jwt from "jsonwebtoken";
import type { Role } from "../auth/policy.js";

export interface JwtPayload {
  sub: string; // identifiant de l'utilisateur (claim standard)
  role: Role;
}

const ROLES: readonly string[] = ["USER", "AGENT", "ADMIN"];

/** Lit le secret ; refuse de démarrer s'il manque ou est trop court. */
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET manquant ou trop court (32 caractères minimum).");
  }
  return secret;
}

export function getExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? "1h";
}

/** À appeler au démarrage : échec immédiat plutôt qu'au premier login. */
export function assertJwtConfig(): void {
  getSecret();
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign({ role: payload.role }, getSecret(), {
    subject: payload.sub,
    expiresIn: getExpiresIn() as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

/** Lève une erreur si le jeton est invalide, falsifié ou expiré. */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.role !== "string" ||
    !ROLES.includes(decoded.role)
  ) {
    throw new Error("Jeton invalide.");
  }
  return { sub: decoded.sub, role: decoded.role as Role };
}