import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Can } from '../../auth/policy.ts';
import { prisma } from '../../lib/db.js';

export const questionsApp = new OpenAPIHono();

// Schemas Zod pour Questions / Réponses
const CreateQuestionSchema = z.object({
  contenu: z.string().min(3, "La question doit faire au moins 3 caractères").openapi({ example: 'Est-ce qu\'une cave est incluse ?' }),
}).openapi('CreateQuestionInput');

const CreateReponseSchema = z.object({
  reponse: z.string().min(2, "La réponse ne peut pas être vide").openapi({ example: 'Oui, une cave de 6m2 est incluse.' }),
}).openapi('CreateReponseInput');

// ====================================================
// 1. POST /annonces/:id/questions (Poser une question)
// ====================================================
const askQuestionRoute = createRoute({
  method: 'post',
  path: '/annonces/{id}/questions',
  summary: 'Poser une question sur une annonce',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ param: { name: 'id', in: 'path' } }) }),
    body: { content: { 'application/json': { schema: CreateQuestionSchema } } },
  },
  responses: {
    201: { description: 'Question posée avec succès' },
    401: { description: 'Non authentifié' },
    404: { description: 'Annonce introuvable' },
  },
});

questionsApp.openapi(askQuestionRoute, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ code: 'UNAUTHORIZED', message: 'Non authentifié' }, 401);

  const annonceId = c.req.param('id');
  const annonce = await prisma.annonce.findUnique({ where: { id: annonceId } });
  if (!annonce) return c.json({ code: 'NOT_FOUND', message: 'Annonce introuvable' }, 404);

  const body = c.req.valid('json');
  const question = await prisma.question.create({
    data: {
      contenu: body.contenu,
      annonceId,
      userId: user.id,
    },
  });

  return c.json(question, 201);
});

// ====================================================
// 2. POST /questions/:id/reponse (Répondre à une question)
// ====================================================
const answerQuestionRoute = createRoute({
  method: 'post',
  path: '/questions/{id}/reponse',
  summary: 'Répondre à une question (Agent propriétaire)',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ param: { name: 'id', in: 'path' } }) }),
    body: { content: { 'application/json': { schema: CreateReponseSchema } } },
  },
  responses: {
    200: { description: 'Réponse enregistrée' },
    403: { description: 'Vous n\'êtes pas l\'agent propriétaire de cette annonce' },
    404: { description: 'Question introuvable' },
  },
});

questionsApp.openapi(answerQuestionRoute, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ code: 'UNAUTHORIZED', message: 'Non authentifié' }, 401);

  const questionId = c.req.param('id');
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { annonce: true },
  });

  if (!question) return c.json({ code: 'NOT_FOUND', message: 'Question introuvable' }, 404);

  // Vérification : Seul l'agent de l'annonce ou l'admin peut répondre
  if (!Can.respondToQuestion(user, question.annonce.agentId)) {
    return c.json({ code: 'FORBIDDEN', message: 'Seul l\'agent de cette annonce peut y répondre' }, 403);
  }

  const body = c.req.valid('json');
  const updatedQuestion = await prisma.question.update({
    where: { id: questionId },
    data: { reponse: body.reponse },
  });

  return c.json(updatedQuestion, 200);
});