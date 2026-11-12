import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { serve } from "@hono/node-server";
import { prisma } from "./lib/db.js";
import { signToken } from "./lib/jwt.js";
import * as argon2 from "argon2";
import "dotenv/config";

// Import de tes modules
import { annoncesApp } from "./modules/annonces/annonces.controller.js";
import { questionsApp } from "./modules/questions/questions.controller.js";

const app = new OpenAPIHono();

// ==========================================
// 1. Documentation OpenAPI 3.1 & Swagger UI
// ==========================================
app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "ImmoService API",
    version: "1.0.0",
    description: "API de gestion immobilière - TP2",
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
});

app.get("/docs", swaggerUI({ url: "/openapi.json" }));

// ==========================================
// 2. Routes de base & Auth (Binôme A)
// ==========================================
app.get("/", (c) => {
  return c.json({ message: "Bienvenue sur l'API ImmoService 🏠" });
});

app.post("/api/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: "Email et mot de passe requis" }, 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return c.json({ error: "Identifiants invalides" }, 401);
    }

    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      return c.json({ error: "Identifiants invalides" }, 401);
    }

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

// ==========================================
// 3. Montage de tes sous-applications (Binôme B)
// ==========================================
app.route("/api/v1/annonces", annoncesApp);
app.route("/api/v1", questionsApp);

// ==========================================
// 4. Démarrage du serveur
// ==========================================
const port = Number(process.env.PORT) || 3000;
console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
console.log(`📚 Documentation Swagger sur http://localhost:${port}/docs`);

serve({
  fetch: app.fetch,
  port,
});