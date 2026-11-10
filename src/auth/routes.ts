// src/auth/routes.ts
import { createRoute } from "@hono/zod-openapi";
import { prisma } from "../lib/db.js";
import { createRouter } from "../common/router.js";
import { Errors } from "../common/errors.js";
import { errorResponse } from "../common/error-schema.js";
import { hashPassword } from "./password.js";
import { RegisterBody, UserSchema } from "../schemas/auth.js";

export const authRoutes = createRouter();

// Sélection EXPLICITE : passwordHash n'est jamais lu pour la réponse.
const publicUserSelect = { id: true, name: true, email: true, role: true } as const;

const registerRoute = createRoute({
  method: "post",
  path: "/register",
  tags: ["Auth"],
  summary: "Créer un compte (rôle USER)",
  request: {
    body: { content: { "application/json": { schema: RegisterBody } }, required: true },
  },
  responses: {
    201: { description: "Compte créé", content: { "application/json": { schema: UserSchema } } },
    400: errorResponse("Données invalides"),
    409: errorResponse("Email déjà utilisé"),
  },
});

authRoutes.openapi(registerRoute, async (c) => {
  // Zod a déjà validé ET supprimé les champs inconnus (donc tout "role" envoyé).
  const { name, email, password } = c.req.valid("json");

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw Errors.conflict("Cet email est déjà utilisé.");

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: "USER", // FORCÉ côté serveur : le client ne choisit jamais son rôle
      },
      select: publicUserSelect,
    });
    return c.json(user, 201);
  } catch (e) {
    // Course entre deux inscriptions simultanées : contrainte unique Prisma
    if ((e as { code?: string }).code === "P2002") {
      throw Errors.conflict("Cet email est déjà utilisé.");
    }
    throw e;
  }
});