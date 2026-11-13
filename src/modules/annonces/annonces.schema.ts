import { z } from "@hono/zod-openapi";
import { BienType, PublicationStatus, BienStatus } from "@prisma/client";

// 1. Params d'URL (/annonces/:id)
export const AnnonceIdParamSchema = z.object({
  id: z.string().openapi({
    param: { name: "id", in: "path" },
    example: "clx123456789",
    description: "ID unique de l'annonce",
  }),
});

// 2. Query Parameters (Pagination et Filtres)
export const QueryAnnoncesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .openapi({ example: 10 }),
  ville: z.string().optional().openapi({ example: "Le Havre" }),
  type: z.nativeEnum(BienType).optional().openapi({ example: BienType.VENTE }),
  prixMax: z.coerce.number().positive().optional().openapi({ example: 300000 }),
});

export type QueryAnnoncesInput = z.infer<typeof QueryAnnoncesSchema>;

// 3. Modèle Photo
export const PhotoInputSchema = z.object({
  url: z
    .string()
    .url("URL de photo invalide")
    .openapi({ example: "https://picsum.photos/800/600" }),
  alt: z.string().optional().openapi({ example: "Vue sur le séjour" }),
});

// 4. Body de Création
export const CreateAnnonceSchema = z
  .object({
    titre: z
      .string()
      .min(5)
      .max(120)
      .openapi({ example: "Appartement T3 lumineux" }),
    description: z
      .string()
      .min(10)
      .openapi({ example: "Très bel appartement proche centre-ville" }),
    ville: z
      .string()
      .min(2, "La ville est obligatoire")
      .openapi({ example: "Le Havre" }),
    type: z.nativeEnum(BienType).openapi({ example: BienType.VENTE }),
    prix: z.number().positive().openapi({ example: 185000 }),
    dateDisponibilite: z.coerce
      .date()
      .openapi({ example: "2026-10-01T00:00:00.000Z" }),
    photos: z.array(PhotoInputSchema).optional().default([]),
    statusPublication: z
      .nativeEnum(PublicationStatus)
      .optional()
      .default(PublicationStatus.BROUILLON),
    statusBien: z
      .nativeEnum(BienStatus)
      .optional()
      .default(BienStatus.DISPONIBLE),
  })
  .openapi("CreateAnnonceInput");

export type CreateAnnonceInput = z.infer<typeof CreateAnnonceSchema>;

// 5. Body de Modification (Partial)
export const UpdateAnnonceSchema =
  CreateAnnonceSchema.partial().openapi("UpdateAnnonceInput");
export type UpdateAnnonceInput = z.infer<typeof UpdateAnnonceSchema>;
