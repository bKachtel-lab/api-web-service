// src/index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { prisma } from "./lib/db.js";
import { signToken } from "./lib/jwt.js";
import * as argon2 from "argon2";
import "dotenv/config";

const app = new Hono();

// Route de test de l'API
app.get("/", (c) => {
  return c.json({ message: "Bienvenue sur l'API ImmoService 🏠" });
});

// Route de Connexion (Login) -> Génère un JWT
app.post("/api/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: "Email et mot de passe requis" }, 400);
    }

    // 1. Rechercher l'utilisateur en base
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return c.json({ error: "Identifiants invalides" }, 401);
    }

    // 2. Vérifier le mot de passe avec Argon2
    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      return c.json({ error: "Identifiants invalides" }, 401);
    }

    // 3. Générer le JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return c.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Erreur serveur interne" }, 500);
  }
});

const port = Number(process.env.PORT) || 3000;
console.log(`🚀 Serveur démarré sur le port ${port}`);

serve({
  fetch: app.fetch,
  port,
});