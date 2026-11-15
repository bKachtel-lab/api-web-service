//tests/setup.ts

import "dotenv/config";

// refuss de démarrage si DATABASE_URL_TEST manque
if (!process.env.DATABASE_URL_TEST || process.env.DATABASE_URL_TEST.trim() === "") {
  throw new Error(
    " ERREUR FATALE : La variable d'environnement DATABASE_URL_TEST est manquante. La suite de tests refuse de démarrer."
  );
}

// Sécurité supplémentaire : empêcher d'écraser la base de développement par erreur
if (process.env.DATABASE_URL_TEST === process.env.DATABASE_URL) {
  throw new Error(
    " ERREUR FATALE : DATABASE_URL_TEST doit pointer vers une base distincte de DATABASE_URL."
  );
}

// On bascule DATABASE_URL sur la base de test pour tout le processus Vitest (Prisma & Hono)
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;