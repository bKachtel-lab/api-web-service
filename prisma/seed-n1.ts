// prisma/seed-n1.ts
// RÔLE : ajoute 20 annonces PUBLIEES (photos + questions) pour mesurer le N+1.
// N'efface rien : à lancer APRES `prisma db seed` (il a besoin des agents et du user).

import {
  PrismaClient,
  BienType,
  PublicationStatus,
  BienStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
import "dotenv/config";

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const VILLES = ["Le Havre", "Rouen", "Fécamp", "Caen", "Dieppe"];

async function main() {
  const agents = await prisma.user.findMany({ where: { role: "AGENT" } });
  const user = await prisma.user.findFirst({ where: { role: "USER" } });
  if (agents.length === 0 || !user) {
    throw new Error(
      "Lancez d'abord `npx.cmd prisma db seed` (agents et user manquants).",
    );
  }

  for (let i = 1; i <= 20; i++) {
    const agent = agents[i % agents.length];
    await prisma.annonce.create({
      data: {
        titre: `Annonce N+1 numéro ${i}`,
        description: `Annonce générée pour le test de performance ${i}.`,
        ville: VILLES[i % VILLES.length],
        type: i % 2 === 0 ? BienType.VENTE : BienType.LOCATION,
        statusPublication: PublicationStatus.PUBLIEE,
        statusBien: BienStatus.DISPONIBLE,
        prix: 50000 + i * 5000,
        dateDisponibilite: new Date("2026-12-01"),
        agentId: agent.id,
        photos: {
          create: [
            {
              url: `https://picsum.photos/seed/n1-${i}-a/800/600`,
              alt: `Photo A ${i}`,
            },
            {
              url: `https://picsum.photos/seed/n1-${i}-b/800/600`,
              alt: `Photo B ${i}`,
            },
          ],
        },
        questions: {
          create: [
            { contenu: `Question de test numéro ${i} ?`, userId: user.id },
          ],
        },
      },
    });
  }
  console.log("20 annonces N+1 ajoutées.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
