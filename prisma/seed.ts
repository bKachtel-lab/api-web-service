import { PrismaClient, Role, BienType, PublicationStatus, BienStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
import * as argon2 from "argon2";
import "dotenv/config";

const { Pool } = pkg;

// Configuration de l'adaptateur PostgreSQL pour Prisma 7
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Nettoyage de la base de données...");
  await prisma.favori.deleteMany();
  await prisma.question.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.annonce.deleteMany();
  await prisma.user.deleteMany();

  console.log("🌱 Début du seeding TP2...");

  // Hachage du mot de passe universel pour les tests
  const defaultPasswordHash = await argon2.hash("Password123!");

  // 1. Création des utilisateurs (2 Agents, 1 User, 1 Admin)
  const agent1 = await prisma.user.create({
    data: {
      email: "agent1@immobilier.fr",
      name: "Agent Alpha",
      passwordHash: defaultPasswordHash,
      role: Role.AGENT,
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      email: "agent2@immobilier.fr",
      name: "Agent Beta",
      passwordHash: defaultPasswordHash,
      role: Role.AGENT,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: "user@immobilier.fr",
      name: "Jean Dupont",
      passwordHash: defaultPasswordHash,
      role: Role.USER,
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@immobilier.fr",
      name: "Administrateur",
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    },
  });

  console.log("👤 4 Utilisateurs créés (2 AGENTs, 1 USER, 1 ADMIN).");

  // 2. Annonces Agent 1
  const annonce1 = await prisma.annonce.create({
    data: {
      titre: "Appartement T3 lumineux - Le Havre Centre",
      description: "Magnifique T3 entièrement rénové proche des commerces et des transports.",
      ville: "Le Havre",
      type: BienType.VENTE,
      statusPublication: PublicationStatus.PUBLIEE,
      statusBien: BienStatus.DISPONIBLE,
      prix: 185000,
      dateDisponibilite: new Date("2026-10-01"),
      agentId: agent1.id,
      photos: {
        create: [
          { url: "https://picsum.photos/seed/t3-1/800/600", alt: "Vue sur le séjour" },
          { url: "https://picsum.photos/seed/t3-2/800/600", alt: "Cuisine équipée" },
        ],
      },
    },
  });

  await prisma.annonce.create({
    data: {
      titre: "Maison d'architecte avec jardin",
      description: "Superbe villa contemporaine au calme absolu.",
      ville: "Rouen",
      type: BienType.VENTE,
      statusPublication: PublicationStatus.PUBLIEE,
      statusBien: BienStatus.DISPONIBLE,
      prix: 420000,
      dateDisponibilite: new Date("2026-11-15"),
      agentId: agent1.id,
      photos: {
        create: [{ url: "https://picsum.photos/seed/villa/800/600", alt: "Façade extérieure" }],
      },
    },
  });

  await prisma.annonce.create({
    data: {
      titre: "Studio étudiant à rénover [Brouillon]",
      description: "Projet d'investissement locatif idéal.",
      ville: "Le Havre",
      type: BienType.VENTE,
      statusPublication: PublicationStatus.BROUILLON,
      statusBien: BienStatus.DISPONIBLE,
      prix: 65000,
      dateDisponibilite: new Date("2026-12-01"),
      agentId: agent1.id,
    },
  });

  // 3. Annonce Agent 2 (Indispensable pour le test IDOR de l'Étape 4 / 5)
  await prisma.annonce.create({
    data: {
      titre: "Local commercial vue mer",
      description: "Emplacement n°1 pour votre activité commerciale.",
      ville: "Fécamp",
      type: BienType.LOCATION,
      statusPublication: PublicationStatus.PUBLIEE,
      statusBien: BienStatus.DISPONIBLE,
      prix: 1200,
      dateDisponibilite: new Date("2026-10-10"),
      agentId: agent2.id,
      photos: {
        create: [{ url: "https://picsum.photos/seed/local/800/600", alt: "Vitrine extérieure" }],
      },
    },
  });

  // 4. Question & Réponse
  await prisma.question.create({
    data: {
      contenu: "Est-ce qu'une place de parking est incluse ?",
      reponse: "Oui, un garage fermé en sous-sol est inclus.",
      annonceId: annonce1.id,
      userId: user.id,
    },
  });

  console.log("🏠 Annonces et questions initialisées avec succès !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });