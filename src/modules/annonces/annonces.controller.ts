import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { AnnoncesService } from './annonces.service.js';
import {
  AnnonceIdParamSchema,
  QueryAnnoncesSchema,
  CreateAnnonceSchema,
  UpdateAnnonceSchema,
} from './annonces.schema.js';
import { Can } from '../../auth/policy.js'; 

export const annoncesApp = new OpenAPIHono();
const service = new AnnoncesService();

// ==========================================
// 1. GET /annonces (Liste paginée + filtres)
// ==========================================
const getAnnoncesRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Lister les annonces',
  description: 'Récupère les annonces publiées avec pagination et filtres. Les brouillons ne sont visibles que par leur auteur ou un admin.',
  request: {
    query: QueryAnnoncesSchema,
  },
  responses: {
    200: {
      description: 'Liste d\'annonces récupérée avec succès',
    },
  },
});

annoncesApp.openapi(getAnnoncesRoute, async (c) => {
  const query = c.req.valid('query');
  const user = c.get('user'); //  par le middleware Auth JWT 
  const result = await service.findAll(query, user);
  return c.json(result, 200);
});

// ==========================================
// 2. GET /annonces/:id (Détail)
// ==========================================
const getAnnonceByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  summary: 'Détail d\'une annonce',
  request: {
    params: AnnonceIdParamSchema,
  },
  responses: {
    200: { description: 'Détail de l\'annonce' },
    404: { description: 'Annonce non trouvée ou non accessible' },
  },
});

annoncesApp.openapi(getAnnonceByIdRoute, async (c) => {
  const { id } = c.req.valid('param');
  const user = c.get('user');
  const annonce = await service.findById(id);

  if (!annonce) {
    return c.json({ code: 'NOT_FOUND', message: 'Annonce non trouvée' }, 404);
  }

  // Vérification autorisation pure pour la lecture (visibilité brouillon)
  if (!Can.readAnnonce(user, annonce)) {
    // Rendu en 404 pour masquer l'existence d'un brouillon non autorisé
    return c.json({ code: 'NOT_FOUND', message: 'Annonce non trouvée' }, 404);
  }

  return c.json(annonce, 200);
});

// ==========================================
// 3. POST /annonces (Créer une annonce)
// ==========================================
const createAnnonceRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Créer une annonce (Agent / Admin)',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreateAnnonceSchema } },
    },
  },
  responses: {
    201: { description: 'Annonce créée avec succès' },
    401: { description: 'Non authentifié' },
    403: { description: 'Accès réservé aux agents et admins' },
  },
});

annoncesApp.openapi(createAnnonceRoute, async (c) => {
  const user = c.get('user');
  
  if (!user || (user.role !== 'AGENT' && user.role !== 'ADMIN')) {
    return c.json({ code: 'FORBIDDEN', message: 'Seuls les agents ou admins peuvent créer des annonces' }, 403);
  }

  const body = c.req.valid('json');
  const annonce = await service.create(body, user.id);
  return c.json(annonce, 201);
});

// ==========================================
// 4. PATCH /annonces/:id (Modifier une annonce)
// ==========================================
const updateAnnonceRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  summary: 'Modifier une annonce',
  security: [{ bearerAuth: [] }],
  request: {
    params: AnnonceIdParamSchema,
    body: { content: { 'application/json': { schema: UpdateAnnonceSchema } } },
  },
  responses: {
    200: { description: 'Annonce modifiée' },
    403: { description: 'Interdit : cette annonce ne vous appartient pas (Anti-IDOR)' },
    404: { description: 'Annonce non trouvée' },
  },
});

annoncesApp.openapi(updateAnnonceRoute, async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');

  if (!user) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Authentification requise' }, 401);
  }

  const existing = await service.findById(id);
  if (!existing) {
    return c.json({ code: 'NOT_FOUND', message: 'Annonce introuvable' }, 404);
  }

  // Contrôle d'accès IDOR pure
  if (!Can.mutateAnnonce(user, existing)) {
    return c.json({ code: 'FORBIDDEN', message: 'Vous ne pouvez modifier que vos propres annonces' }, 403);
  }

  const body = c.req.valid('json');
  const updated = await service.update(id, body);
  return c.json(updated, 200);
});

// ==========================================
// 5. DELETE /annonces/:id (Supprimer une annonce)
// ==========================================
const deleteAnnonceRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  summary: 'Supprimer une annonce',
  security: [{ bearerAuth: [] }],
  request: {
    params: AnnonceIdParamSchema,
  },
  responses: {
    204: { description: 'Annonce supprimée sans contenu retourné' },
    403: { description: 'Interdit : cette annonce ne vous appartient pas (Anti-IDOR)' },
    404: { description: 'Annonce non trouvée' },
  },
});

annoncesApp.openapi(deleteAnnonceRoute, async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');

  if (!user) {
    return c.json({ code: 'UNAUTHORIZED', message: 'Authentification requise' }, 401);
  }

  const existing = await service.findById(id);
  if (!existing) {
    return c.json({ code: 'NOT_FOUND', message: 'Annonce introuvable' }, 404);
  }

  // Contrôle d'accès IDOR pure
  if (!Can.mutateAnnonce(user, existing)) {
    return c.json({ code: 'FORBIDDEN', message: 'Vous ne pouvez supprimer que vos propres annonces' }, 403);
  }

  await service.delete(id);
  return c.body(null, 204);
});