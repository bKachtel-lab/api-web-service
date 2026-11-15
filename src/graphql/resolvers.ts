// src/graphql/resolvers.ts
// RÔLE : implémentation des Query / Mutation / champs relationnels du schéma.
//
// ORDRE DES CONTRÔLES dans chaque mutation (à respecter partout) :
//   1. AUTHENTIFICATION : qui es-tu ?            -> requireActor  (UNAUTHENTICATED)
//   2. AUTORISATION     : as-tu le droit ?       -> Can.*         (FORBIDDEN)
//   3. VALIDATION       : les données sont OK ?  -> Zod           (payload.errors)
//
// Les règles métier ne sont PAS dupliquées : on réutilise Can.* (policy.ts),
// AnnoncesService et les schémas Zod du REST.

import { GraphQLError } from "graphql";
import { z } from "@hono/zod-openapi";
import {
  Prisma,
  PublicationStatus,
  Role,
  type Annonce,
  type Question,
} from "@prisma/client";
import { prisma } from "../lib/db.js";
import { Can, type Actor } from "../auth/policy.js";
import { AnnoncesService } from "../modules/annonces/annonces.service.js";
import {
  CreateAnnonceSchema,
  QueryAnnoncesSchema,
  UpdateAnnonceSchema,
} from "../modules/annonces/annonces.schema.js";
import type { GraphQLContext } from "./context.js";

const service = new AnnoncesService();

// Mêmes règles que les schémas du contrôleur REST des questions.
const AskQuestionSchema = z.object({
  contenu: z.string().min(3, "La question doit faire au moins 3 caractères"),
});
const RespondSchema = z.object({
  reponse: z.string().min(2, "La réponse ne peut pas être vide"),
});

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/** Erreur GraphQL avec un code stable lisible par le client (extensions.code). */
function gqlError(code: string, message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code } });
}

/** Contrôle 1 : authentification obligatoire. */
function requireActor(ctx: GraphQLContext): Actor {
  if (!ctx.actor)
    throw gqlError("UNAUTHENTICATED", "Authentification requise.");
  return ctx.actor;
}

const forbidden = (msg: string) => gqlError("FORBIDDEN", msg);
const notFound = (msg: string) => gqlError("NOT_FOUND", msg);

/** Convertit une erreur Zod en liste de FieldError pour le payload. */
function toFieldErrors(error: z.ZodError) {
  return error.issues.map((i) => ({
    field: i.path.join(".") || "input",
    message: i.message,
  }));
}

/** Charge l'annonce et vérifie le droit de modification (anti-IDOR), comme le REST. */
async function loadMutableAnnonce(id: string, actor: Actor) {
  const existing = await prisma.annonce.findUnique({ where: { id } });
  if (!existing) throw notFound("Annonce introuvable.");
  if (!Can.mutateAnnonce(actor, existing)) {
    throw forbidden("Vous ne pouvez modifier que vos propres annonces.");
  }
  return existing;
}

/**
 * GraphQL envoie null pour un champ optionnel omis ; Zod attend undefined.
 * On retire les null avant de valider pour que les .default() s'appliquent.
 */
function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, stripNulls(v)]),
    );
  }
  return value;
}

/** Visibilité des brouillons : identique à AnnoncesService.findAll (REST). */
function visibilityWhere(actor: Actor | null): Prisma.AnnonceWhereInput {
  if (!actor || actor.role === Role.USER) {
    return { statusPublication: PublicationStatus.PUBLIEE };
  }
  if (actor.role === Role.AGENT) {
    return {
      OR: [
        { statusPublication: PublicationStatus.PUBLIEE },
        { agentId: actor.id },
      ],
    };
  }
  return {}; // ADMIN : voit tout
}

// ---------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------

export const resolvers = {
  Query: {
    /** Liste paginée + filtres. Lecture publique, brouillons selon le rôle. */
    annonces: async (
      _parent: unknown,
      args: Record<string, unknown>,
      ctx: GraphQLContext,
    ) => {
      // Même schéma Zod que le REST : même plafond de limit (50) partout.
      const parsed = QueryAnnoncesSchema.safeParse(stripNulls(args));
      if (!parsed.success) {
        throw gqlError(
          "BAD_USER_INPUT",
          toFieldErrors(parsed.error)[0].message,
        );
      }
      const { page, limit, ville, type, prixMax } = parsed.data;

      const filters: Prisma.AnnonceWhereInput = {
        ...(ville ? { ville: { contains: ville, mode: "insensitive" } } : {}),
        ...(type ? { type } : {}),
        ...(prixMax ? { prix: { lte: prixMax } } : {}),
      };
      const where: Prisma.AnnonceWhereInput = {
        AND: [visibilityWhere(ctx.actor), filters],
      };

      // Volontairement SANS include : agent, photos et questions sont chargés
      // par les DataLoaders (1 requête par relation, pas 1 par annonce).
      const [total, items] = await Promise.all([
        prisma.annonce.count({ where }),
        prisma.annonce.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return {
        items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    },

    /** Détail d'une annonce. Brouillon non autorisé = null (existence masquée). */
    annonce: async (
      _parent: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) => {
      const annonce = await prisma.annonce.findUnique({ where: { id } });
      if (!annonce || !Can.readAnnonce(ctx.actor, annonce)) return null;
      return annonce;
    },
  },

  Mutation: {
    /** Créer une annonce : AGENT ou ADMIN uniquement. */
    createAnnonce: async (
      _parent: unknown,
      { input }: { input: unknown },
      ctx: GraphQLContext,
    ) => {
      const actor = requireActor(ctx); // 1. authentification
      if (!Can.createAnnonce(actor)) {
        // 2. autorisation
        throw forbidden(
          "Seuls les agents ou admins peuvent créer des annonces.",
        );
      }
      const parsed = CreateAnnonceSchema.safeParse(stripNulls(input)); // 3. validation
      if (!parsed.success) {
        return { annonce: null, errors: toFieldErrors(parsed.error) };
      }
      const annonce = await service.create(parsed.data, actor.id);
      return { annonce, errors: [] };
    },

    /** Poser une question : tout utilisateur connecté, sur une annonce visible. */
    askQuestion: async (
      _parent: unknown,
      args: { annonceId: string; contenu: string },
      ctx: GraphQLContext,
    ) => {
      const actor = requireActor(ctx); // 1. authentification
      if (!Can.askQuestion(actor)) throw forbidden("Accès interdit."); // 2. autorisation

      const parsed = AskQuestionSchema.safeParse({ contenu: args.contenu }); // 3. validation
      if (!parsed.success) {
        return { question: null, errors: toFieldErrors(parsed.error) };
      }

      // On ne révèle pas l'existence d'un brouillon à quelqu'un qui ne peut pas le lire.
      const annonce = await prisma.annonce.findUnique({
        where: { id: args.annonceId },
      });
      if (!annonce || !Can.readAnnonce(actor, annonce)) {
        throw notFound("Annonce introuvable.");
      }

      const question = await prisma.question.create({
        data: {
          contenu: parsed.data.contenu,
          annonceId: annonce.id,
          userId: actor.id,
        },
      });
      return { question, errors: [] };
    },

    /** Répondre : agent propriétaire de l'annonce liée, ou admin (anti-IDOR). */
    respondToQuestion: async (
      _parent: unknown,
      args: { questionId: string; reponse: string },
      ctx: GraphQLContext,
    ) => {
      const actor = requireActor(ctx); // 1. authentification

      const question = await prisma.question.findUnique({
        where: { id: args.questionId },
        include: { annonce: { select: { agentId: true } } },
      });
      if (!question) throw notFound("Question introuvable.");

      // 2. autorisation : on passe l'agent de l'ANNONCE, pas l'auteur de la question.
      if (
        !Can.respondToQuestion(actor, {
          annonceAgentId: question.annonce.agentId,
        })
      ) {
        throw forbidden("Seul l'agent de cette annonce peut y répondre.");
      }

      const parsed = RespondSchema.safeParse({ reponse: args.reponse }); // 3. validation
      if (!parsed.success) {
        return { question: null, errors: toFieldErrors(parsed.error) };
      }

      const updated = await prisma.question.update({
        where: { id: question.id },
        data: { reponse: parsed.data.reponse },
      });
      return { question: updated, errors: [] };
    },

    /** Modifier : agent propriétaire ou admin. */
    updateAnnonce: async (
      _parent: unknown,
      args: { id: string; input: unknown },
      ctx: GraphQLContext,
    ) => {
      const actor = requireActor(ctx); // 1. authentification
      await loadMutableAnnonce(args.id, actor); // 2. autorisation (Can.mutateAnnonce)
      const parsed = UpdateAnnonceSchema.safeParse(stripNulls(args.input)); // 3. validation
      if (!parsed.success) {
        return { annonce: null, errors: toFieldErrors(parsed.error) };
      }
      const annonce = await service.update(args.id, parsed.data);
      return { annonce, errors: [] };
    },

    /** Supprimer : agent propriétaire ou admin. */
    deleteAnnonce: async (
      _parent: unknown,
      args: { id: string },
      ctx: GraphQLContext,
    ) => {
      const actor = requireActor(ctx);
      await loadMutableAnnonce(args.id, actor);
      await service.delete(args.id);
      return { deletedId: args.id, errors: [] };
    },

    /** Publier / dépublier : même droit que la modification. */
    setAnnoncePublication: async (
      _parent: unknown,
      args: { id: string; publiee: boolean },
      ctx: GraphQLContext,
    ) => {
      const actor = requireActor(ctx);
      await loadMutableAnnonce(args.id, actor);
      const annonce = await service.update(args.id, {
        statusPublication: args.publiee
          ? PublicationStatus.PUBLIEE
          : PublicationStatus.BROUILLON,
      });
      return { annonce, errors: [] };
    },
  },

  // Champs relationnels : toujours via les DataLoaders (jamais un findUnique direct).
  Annonce: {
    agent: (a: Annonce, _args: unknown, ctx: GraphQLContext) =>
      ctx.loaders.auteurById.load(a.agentId),
    photos: (a: Annonce, _args: unknown, ctx: GraphQLContext) =>
      ctx.loaders.photosByAnnonce.load(a.id),
    questions: (a: Annonce, _args: unknown, ctx: GraphQLContext) =>
      ctx.loaders.questionsByAnnonce.load(a.id),
    // Les dates Prisma (Date) sont sérialisées en ISO 8601.
    dateDisponibilite: (a: Annonce) => a.dateDisponibilite.toISOString(),
    createdAt: (a: Annonce) => a.createdAt.toISOString(),
  },

  Question: {
    user: (q: Question, _args: unknown, ctx: GraphQLContext) =>
      ctx.loaders.auteurById.load(q.userId),
    createdAt: (q: Question) => q.createdAt.toISOString(),
  },
};
