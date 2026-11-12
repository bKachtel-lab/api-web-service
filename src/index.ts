// src/index.ts : démarre le serveur HTTP, rien d'autre.
import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { assertJwtConfig } from "./lib/jwt.js";

// Sécurité : refuse de démarrer sans JWT_SECRET valide
assertJwtConfig(); 

// Démarrage du serveur
const port = Number(process.env.PORT) || 3000;

serve({
  fetch: app.fetch,
  port,
});

console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
console.log(`📚 Documentation Swagger sur http://localhost:${port}/docs`);