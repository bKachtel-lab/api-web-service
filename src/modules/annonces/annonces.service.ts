import { PublicationStatus, Role } from "@prisma/client";
import {
  QueryAnnoncesInput,
  CreateAnnonceInput,
  UpdateAnnonceInput,
} from "./annonces.schema.js";
import { prisma } from "../../lib/db.js";
import { Actor } from "../../auth/policy.js";

export class AnnoncesService {
  /**
   * Lister les annonces avec pagination et filtres
   * Masque les brouillons sauf si c'est l'agent propriétaire ou un ADMIN
   */
  async findAll(query: QueryAnnoncesInput, currentUser?: Actor | null) {
    const { page, limit, ville, type, prixMax } = query;
    const skip = (page - 1) * limit;

    // Construction dynamique du WHERE
    const where: any = {};

    // Filtre par ville (insensible à la casse)
    if (ville) {
      where.ville = { contains: ville, mode: "insensitive" };
    }

    if (type) {
      where.type = type;
    }
    if (prixMax) {
      where.prix = { lte: prixMax };
    }

    // Gestion de la visibilité des BROUILLONS
    if (!currentUser || currentUser.role === Role.USER) {
      // Un public ou USER ne voit que les publiées
      where.statusPublication = PublicationStatus.PUBLIEE;
    } else if (currentUser.role === Role.AGENT) {
      // Un AGENT voit les publiées + SES propres brouillons
      where.OR = [
        { statusPublication: PublicationStatus.PUBLIEE },
        { agentId: currentUser.id },
      ];
    }
    // L'ADMIN voit tout par défaut (pas de contrainte de statut imposée)

    const [total, items] = await Promise.all([
      prisma.annonce.count({ where }),
      prisma.annonce.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          photos: true,
          agent: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Récupérer une annonce par son ID
   */
  async findById(id: string) {
    return prisma.annonce.findUnique({
      where: { id },
      include: {
        photos: true,
        agent: { select: { id: true, name: true } },
        questions: true,
      },
    });
  }

  /**
   * Créer une annonce rattachée à l'Agent connecté
   */
  async create(data: CreateAnnonceInput, agentId: string) {
    const { photos, ...annonceData } = data;

    return prisma.annonce.create({
      data: {
        ...annonceData,
        agentId,
        photos: photos && photos.length > 0 ? { create: photos } : undefined,
      },
      include: { photos: true },
    });
  }

  /**
   * Modifier une annonce
   */
  async update(id: string, data: UpdateAnnonceInput) {
    const { photos, ...annonceData } = data;

    return prisma.annonce.update({
      where: { id },
      data: {
        ...annonceData,
        ...(photos
          ? {
              photos: {
                deleteMany: {},
                create: photos,
              },
            }
          : {}),
      },
      include: { photos: true },
    });
  }

  /**
   * Supprimer une annonce
   */
  async delete(id: string) {
    return prisma.annonce.delete({
      where: { id },
    });
  }
}
