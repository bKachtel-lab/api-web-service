// src/schemas/auth.ts : schémas Zod, source unique pour validation ET OpenAPI.
import { z } from "@hono/zod-openapi";

export const RegisterBody = z
  .object({
    name: z.string().trim().min(2).max(100).openapi({ example: "Jean Dupont" }),
    email: z.string().trim().toLowerCase().email().max(254)
      .openapi({ example: "jean@exemple.fr" }),
    // 128 max : évite d'envoyer des mots de passe géants au hachage (déni de service)
    password: z.string().min(8).max(128).openapi({ example: "motdepasse123" }),
  })
  .openapi("RegisterBody");

export const LoginBody = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(128),
  })
  .openapi("LoginBody");

/** Utilisateur exposé : JAMAIS de passwordHash. */
export const UserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(["USER", "AGENT", "ADMIN"]),
  })
  .openapi("User");

export const TokenResponse = z
  .object({
    token: z.string(),
    tokenType: z.literal("Bearer"),
    expiresIn: z.string().openapi({ example: "1h" }),
  })
  .openapi("TokenResponse");