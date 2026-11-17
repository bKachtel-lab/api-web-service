// src/app.ts : construit l'application SANS écouter de port.
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { createRouter } from "./common/router.js";
import { AppError } from "./common/errors.js";
import { openApiConfig } from "./docs.js";
import { authRoutes } from "./auth/routes.js";
import { annoncesApp } from "./modules/annonces/annonces.controller.js";
import { questionsApp } from "./modules/questions/questions.controller.js";
import { yoga } from "./graphql/server.js";
import { httpCache, noStore } from "./middlewares/cache.js";

export const app = createRouter();

// CORS explicite : liste blanche d'origines lue dans .env, jamais "*".
// Le jeton circule dans l'en-tête Authorization, pas dans un cookie : pas de credentials.
// CORS ne protège PAS l'API, il restreint seulement les navigateurs.
const allowed = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  "*",
  cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// Gestionnaire d'erreurs UNIQUE : toute erreur sort sous la même forme.
app.onError((err, c) => {
  if (err instanceof AppError) return c.json(err.toBody(), err.status);
  console.error(err); // le détail reste dans les logs, jamais dans la réponse
  return c.json(
    new AppError("INTERNAL_ERROR", "Erreur interne.").toBody(),
    500,
  );
});
app.notFound((c) =>
  c.json(new AppError("NOT_FOUND", "Route introuvable.").toBody(), 404),
);

app.get("/", (c) => c.json({ message: "ImmoService API", docs: "/docs" }));

// Politique de cache HTTP (étape 7)
app.use("/auth/*", noStore);
app.use("/graphql", noStore);
app.use("/annonces/*", httpCache(60)); // GET: public/private + ETag ; mutations: no-store
// Routes métier
app.route("/auth", authRoutes);
app.route("/annonces", annoncesApp);
app.route("/", questionsApp);
// Endpoint GraphQL : Yoga gère GET (GraphiQL) et POST (requêtes) via l'API Fetch standard.
app.on(["GET", "POST"], "/graphql", (c) => yoga.fetch(c.req.raw));
// Contrat OpenAPI 3.1 + schéma de sécurité bearerAuth
app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});
app.doc31("/openapi.json", openApiConfig);
//app.get("/docs", swaggerUI({ url: "/openapi.json" }));
