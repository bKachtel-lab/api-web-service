//src/modules/annonces/annonces.controller.ts

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { AnnoncesService } from "./annonces.service.js";
import { createRouter } from "../../common/router.js";
import { Actor } from "../../auth/policy.js";

import {
  AnnonceIdParamSchema,
  QueryAnnoncesSchema,
  CreateAnnonceSchema,
  UpdateAnnonceSchema,
  AnnoncePageResponseSchema,
  AnnonceResponseSchema,
} from "./annonces.schema.js";
import { Can } from "../../auth/policy.js";
import { authenticate } from "../../auth/middleware.js";
import { Errors } from "../../common/errors.js";
import { verifyToken } from "../../lib/jwt.js";
import { errorResponse } from "../../common/error-schema.js";

export const annoncesApp = createRouter();
const service = new AnnoncesService();

// ==========================================
// 1. GET /annonces (Liste paginée + filtres)
// ==========================================
const getAnnoncesRoute = createRoute({
  method: "get",
  path: "/",
  operationId: "listerAnnonces",
  tags: ["Annonces"],
  summary: "Lister les annonces",
  security: [{ bearerAuth: [] }], // <-- Permet à Swagger d'envoyer le JWT s'il est renseigné
  description:
    "Récupère les annonces publiées avec pagination et filtres. Les brouillons ne sont visibles que par leur auteur ou un admin.",
  request: {
    query: QueryAnnoncesSchema,
  },
  responses: {
    200: {
      description: "Liste paginée des annonces",
      content: { "application/json": { schema: AnnoncePageResponseSchema } },
    },
    400: errorResponse("Paramètres de requête invalides"),
  },
});

annoncesApp.openapi(getAnnoncesRoute, async (c) => {
  const query = c.req.valid("query");
  const actor = getOptionalActor(c.req.header("Authorization"));
  const result = await service.findAll(query, actor ?? undefined);
  return c.json(result, 200);
});

// ==========================================
// 2. GET /annonces/:id (Détail)
// ==========================================
const getAnnonceByIdRoute = createRoute({
  method: "get",
  path: "/{id}",
  summary: "Détail d'une annonce",
  operationId: "obtenirAnnonce",
  tags: ["Annonces"],
  security: [{ bearerAuth: [] }], // <-- Permet à Swagger d'envoyer le JWT s'il est renseigné
  request: {
    params: AnnonceIdParamSchema,
  },
  responses: {
    200: {
      description: "Détail de l'annonce",
      content: { "application/json": { schema: AnnonceResponseSchema } },
    },
    404: errorResponse("Annonce introuvable ou brouillon non accessible"),
  },
});

annoncesApp.openapi(getAnnonceByIdRoute, async (c) => {
  const { id } = c.req.valid("param");
  const actor = getOptionalActor(c.req.header("Authorization"));
  const annonce = await service.findById(id);

  if (!annonce) {
    throw Errors.notFound("Annonce introuvable.");
  }
  /*
  // Vérification autorisation pure pour la lecture (visibilité brouillon)
  if (!Can.readAnnonce(actor, annonce)) {
    // Rendu en 404 pour masquer l'existence d'un brouillon non autorisé
    throw Errors.notFound("Annonce introuvable.");
  }
*/
  if (!annonce || !Can.readAnnonce(actor, annonce)) {
    throw Errors.notFound("Annonce non trouvée");
  }

  return c.json(annonce, 200);
});

// ==========================================
// 3. POST /annonces (Créer une annonce)
// ==========================================
const createAnnonceRoute = createRoute({
  method: "post",
  path: "/",
  summary: "Créer une annonce (Agent / Admin)",
  operationId: "creerAnnonce",
  tags: ["Annonces"],
  security: [{ bearerAuth: [] }],
  middleware: [authenticate] as const,
  request: {
    body: {
      content: { "application/json": { schema: CreateAnnonceSchema } },
    },
  },
  responses: {
    201: {
      description: "Annonce créée",
      content: { "application/json": { schema: AnnonceResponseSchema } },
    },
    400: errorResponse("Données invalides"),
    401: errorResponse("Non authentifié"),
    403: errorResponse("Réservé aux agents et admins"),
  },
});

annoncesApp.openapi(createAnnonceRoute, async (c) => {
  const actor = c.get("actor");

  if (!Can.createAnnonce(actor)) {
    throw Errors.forbidden(
      "Seuls les agents ou admins peuvent créer des annonces",
    );
  }

  const body = c.req.valid("json");
  const annonce = await service.create(body, actor.id);
  return c.json(annonce, 201);
});

// ==========================================
// 4. PATCH /annonces/:id (Modifier une annonce)
// ==========================================
const updateAnnonceRoute = createRoute({
  method: "patch",
  path: "/{id}",
  operationId: "modifierAnnonce",
  tags: ["Annonces"],
  summary: "Modifier une annonce",
  security: [{ bearerAuth: [] }],
  middleware: [authenticate] as const,
  request: {
    params: AnnonceIdParamSchema,
    body: { content: { "application/json": { schema: UpdateAnnonceSchema } } },
  },
  responses: {
    200: {
      description: "Annonce modifiée",
      content: { "application/json": { schema: AnnonceResponseSchema } },
    },
    400: errorResponse("Données invalides"),
    401: errorResponse("Non authentifié"),
    403: errorResponse("Accès interdit (Anti-IDOR)"),
    404: errorResponse("Annonce introuvable"),
  },
});

annoncesApp.openapi(updateAnnonceRoute, async (c) => {
  const actor = c.get("actor");
  const { id } = c.req.valid("param");

  const existing = await service.findById(id);
  if (!existing) {
    throw Errors.notFound("Annonce introuvable");
  }

  // Contrôle d'accès IDOR pure
  if (!Can.mutateAnnonce(actor, existing)) {
    throw Errors.forbidden("Vous ne pouvez modifier que vos propres annonces");
  }

  const body = c.req.valid("json");
  const updated = await service.update(id, body);
  return c.json(updated, 200);
});

// ==========================================
// 5. DELETE /annonces/:id (Supprimer une annonce)
// ==========================================
const deleteAnnonceRoute = createRoute({
  method: "delete",
  path: "/{id}",
  operationId: 'supprimerAnnonce',
  tags: ['Annonces'],
  summary: "Supprimer une annonce",
  security: [{ bearerAuth: [] }],
  middleware: [authenticate] as const,
  request: {
    params: AnnonceIdParamSchema,
  },
  responses: {
    204: { description: 'Annonce supprimée' },
    401: errorResponse('Non authentifié'),
    403: errorResponse('Accès interdit (Anti-IDOR)'),
    404: errorResponse('Annonce introuvable'),
  },
});

annoncesApp.openapi(deleteAnnonceRoute, async (c) => {
  const actor = c.get("actor");
  const { id } = c.req.valid("param");

  const existing = await service.findById(id);
  if (!existing) {
    throw Errors.notFound("Annonce introuvable");
  }

  // Contrôle d'accès IDOR pure
  if (!Can.mutateAnnonce(actor, existing)) {
    throw Errors.forbidden("Vous ne pouvez supprimer que vos propres annonces");
  }

  await service.delete(id);
  return c.body(null, 204);
});

// Helper : lit le JWT s'il est fourni, sinon renvoie null (visiteur anonyme)
function getOptionalActor(authHeader?: string): Actor | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const payload = verifyToken(authHeader.slice("Bearer ".length));
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
