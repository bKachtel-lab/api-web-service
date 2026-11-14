import {
  PrismaClient,
  Role,
  BienType,
  PublicationStatus,
  BienStatus,
} from "@prisma/client";
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

  // ==========================================
  // 1. CRÉATION DES UTILISATEURS
  // ==========================================

  const agents = [];

  const agentConfigs = [
    { email: "agent1@immobilier.fr", name: "Agent Alpha" },
    { email: "agent2@immobilier.fr", name: "Agent Beta" },
    { email: "agent3@immobilier.fr", name: "Agent Gamma" },
    { email: "agent4@immobilier.fr", name: "Agent Delta" },
    { email: "agent5@immobilier.fr", name: "Agent Epsilon" },
  ];

  for (const config of agentConfigs) {
    const agent = await prisma.user.create({
      data: {
        ...config,
        passwordHash: defaultPasswordHash,
        role: Role.AGENT,
      },
    });

    agents.push(agent);
  }

  const users = [];

  const userConfigs = [
    { email: "user1@immobilier.fr", name: "Jean Dupont" },
    { email: "user2@immobilier.fr", name: "Marie Martin" },
    { email: "user3@immobilier.fr", name: "Lucas Bernard" },
    { email: "user4@immobilier.fr", name: "Emma Petit" },
    { email: "user5@immobilier.fr", name: "Thomas Robert" },
    { email: "user6@immobilier.fr", name: "Julie Richard" },
  ];

  for (const config of userConfigs) {
    const user = await prisma.user.create({
      data: {
        ...config,
        passwordHash: defaultPasswordHash,
        role: Role.USER,
      },
    });

    users.push(user);
  }

  await prisma.user.create({
    data: {
      email: "admin@immobilier.fr",
      name: "Administrateur",
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    },
  });

  console.log("👤 12 utilisateurs créés :");
  console.log("   - 5 AGENTS");
  console.log("   - 6 USERS");
  console.log("   - 1 ADMIN");

  // ==========================================
  // 2. DONNÉES DES ANNONCES
  // ==========================================

  const villes = [
    "Le Havre",
    "Rouen",
    "Caen",
    "Fécamp",
    "Honfleur",
    "Dieppe",
    "Évreux",
    "Paris",
    "Lille",
    "Nantes",
  ];

  const biens = [
    {
      titre: "Appartement T2 lumineux",
      description:
        "Bel appartement lumineux avec une chambre, proche des commerces et des transports.",
      prix: 145000,
    },
    {
      titre: "Appartement T3 rénové",
      description:
        "Appartement entièrement rénové avec un séjour spacieux et une cuisine équipée.",
      prix: 185000,
    },
    {
      titre: "Maison familiale avec jardin",
      description:
        "Maison familiale comprenant trois chambres, un grand séjour et un jardin privatif.",
      prix: 320000,
    },
    {
      titre: "Studio proche université",
      description:
        "Studio fonctionnel idéal pour étudiant, situé à proximité des universités et transports.",
      prix: 65000,
    },
    {
      titre: "Villa contemporaine",
      description:
        "Belle villa contemporaine avec terrasse, jardin et prestations haut de gamme.",
      prix: 520000,
    },
    {
      titre: "Appartement avec balcon",
      description:
        "Appartement agréable disposant d'un balcon avec une belle vue sur les environs.",
      prix: 210000,
    },
    {
      titre: "Maison de ville",
      description:
        "Maison de ville avec plusieurs chambres, proche du centre et des commodités.",
      prix: 275000,
    },
    {
      titre: "Local commercial",
      description:
        "Local commercial bien situé, idéal pour développer une activité professionnelle.",
      prix: 1200,
    },
    {
      titre: "Appartement meublé",
      description:
        "Appartement meublé et équipé, idéal pour une location de courte ou longue durée.",
      prix: 850,
    },
    {
      titre: "Maison avec garage",
      description:
        "Maison spacieuse disposant d'un garage, d'une cuisine équipée et d'un espace extérieur.",
      prix: 350000,
    },
  ];

  const descriptionsPhotos = [
    "Vue extérieure du bien",
    "Vue sur le séjour",
    "Cuisine équipée",
  ];

  const annoncesCreees = [];

  // ==========================================
  // 3. GÉNÉRATION DES 50 ANNONCES
  // ==========================================

  for (let i = 0; i < 50; i++) {
    const bien = biens[i % biens.length];
    const ville = villes[i % villes.length];

    // Répartition des annonces entre les 5 agents
    const agent = agents[i % agents.length];

    // Alternance entre vente et location
    const type = i % 2 === 0 ? BienType.VENTE : BienType.LOCATION;

    // Une annonce sur cinq est un brouillon
    const statusPublication =
      i % 5 === 0 ? PublicationStatus.BROUILLON : PublicationStatus.PUBLIEE;

    // Variation des prix pour obtenir des données différentes
    const prix =
      type === BienType.LOCATION
        ? Math.round(bien.prix / 100 + (i % 4) * 100)
        : bien.prix + (i % 7) * 5000;

    // Dates de disponibilité réparties sur plusieurs mois
    const dateDisponibilite = new Date(
      2026,
      9 + Math.floor(i / 10),
      1 + (i % 25),
    );

    // Une partie des annonces possède des photos
    const photos =
      i % 3 === 0
        ? {
            create: [
              {
                url: `https://picsum.photos/seed/annonce-${i}-1/800/600`,
                alt: descriptionsPhotos[i % descriptionsPhotos.length],
              },
              {
                url: `https://picsum.photos/seed/annonce-${i}-2/800/600`,
                alt: "Vue complémentaire du bien",
              },
            ],
          }
        : i % 3 === 1
          ? {
              create: [
                {
                  url: `https://picsum.photos/seed/annonce-${i}/800/600`,
                  alt: "Photo du bien immobilier",
                },
              ],
            }
          : undefined;

    const annonce = await prisma.annonce.create({
      data: {
        titre: `${bien.titre} - ${ville} ${i + 1}`,
        description: bien.description,
        ville,
        type,
        prix,
        dateDisponibilite,
        statusPublication,
        statusBien: BienStatus.DISPONIBLE,
        agentId: agent.id,
        ...(photos && { photos }),
      },
    });

    annoncesCreees.push(annonce);
  }

  console.log("🏠 50 annonces créées avec succès.");

  // ==========================================
  // 4. CRÉATION DES QUESTIONS
  // ==========================================

  const questions = [
    {
      contenu: "Le prix est-il négociable ?",
      reponse: "Une négociation raisonnable peut être étudiée.",
      annonceIndex: 1,
      userIndex: 0,
    },
    {
      contenu: "Le logement dispose-t-il d'un parking ?",
      reponse: "Oui, une place de stationnement est disponible.",
      annonceIndex: 2,
      userIndex: 1,
    },
    {
      contenu: "Les animaux sont-ils acceptés ?",
      reponse: "Cela peut être étudié selon le type d'animal.",
      annonceIndex: 8,
      userIndex: 2,
    },
    {
      contenu: "Le logement est-il proche des transports ?",
      reponse:
        "Oui, plusieurs lignes de transport sont accessibles à proximité.",
      annonceIndex: 12,
      userIndex: 3,
    },
    {
      contenu: "Est-il possible de visiter le bien ce week-end ?",
      reponse: "Oui, nous pouvons convenir d'un rendez-vous.",
      annonceIndex: 20,
      userIndex: 4,
    },
    {
      contenu: "Les charges sont-elles comprises dans le prix ?",
      reponse: "Les modalités seront précisées lors de la visite.",
      annonceIndex: 25,
      userIndex: 5,
    },
  ];

  for (const question of questions) {
    await prisma.question.create({
      data: {
        contenu: question.contenu,
        reponse: question.reponse,
        annonceId: annoncesCreees[question.annonceIndex].id,
        userId: users[question.userIndex].id,
      },
    });
  }

  console.log("❓ 6 questions créées avec succès.");

  // ==========================================
  // 5. RÉCAPITULATIF
  // ==========================================

  const annoncesParStatut = await prisma.annonce.groupBy({
    by: ["statusPublication"],
    _count: {
      id: true,
    },
  });

  console.log("\n========== RÉCAPITULATIF DU SEED ==========");
  console.log(`👤 Utilisateurs : ${agents.length + users.length + 1}`);
  console.log(`🏠 Annonces : ${annoncesCreees.length}`);
  console.log(`❓ Questions : ${questions.length}`);

  for (const statut of annoncesParStatut) {
    console.log(`${statut.statusPublication} : ${statut._count.id}`);
  }

  console.log("===========================================\n");
}

main()
  .catch((error) => {
    console.error("❌ Erreur pendant le seeding :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
