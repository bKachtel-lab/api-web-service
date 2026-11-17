// src/graphql/loaders.ts
// RÔLE : DataLoaders = batching + cache par requête pour éviter le problème N+1.
// Sans eux : lister 20 annonces avec leur auteur = 1 + 20 requêtes SQL.
// Avec eux : 1 + 1 requête, quel que soit le nombre d'annonces.

import DataLoader from "dataloader";
import { prisma } from "../lib/db.js";
import { Can, type Actor } from "../auth/policy.js";

/** Auteur exposé publiquement : jamais d'email ni de passwordHash. */
export interface AuteurPublic {
  id: string;
  name: string;
}

/** Regroupe des lignes par clé (ex. photos par annonceId). */
function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/**
 * Fabrique les loaders. Appelée UNE FOIS PAR REQUÊTE HTTP (voir context.ts) :
 * le cache d'un DataLoader ne doit jamais être partagé entre deux utilisateurs.
 *
 * Règle d'or d'un batch : renvoyer un tableau de MÊME LONGUEUR et dans le MÊME
 * ORDRE que les clés reçues, sinon DataLoader associe les mauvaises données.
 */
export function createLoaders(actor: Actor | null) {
  // Auteur d'une annonce / auteur d'une question.
  // `select` explicite : seuls id et name sortent de la base (sécurité).
  const auteurById = new DataLoader<string, AuteurPublic | null>(
    async (ids) => {
      const users = await prisma.user.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, name: true },
      });
      const byId = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => byId.get(id) ?? null);
    },
  );

  // Photos d'une annonce (relation 1-N).
  const photosByAnnonce = new DataLoader(
    async (annonceIds: readonly string[]) => {
      const photos = await prisma.photo.findMany({
        where: { annonceId: { in: [...annonceIds] } },
      });
      const grouped = groupBy(photos, (p) => p.annonceId);
      return annonceIds.map((id) => grouped.get(id) ?? []);
    },
  );

  // Questions d'une annonce (relation 1-N), de la plus ancienne à la plus récente.
  const questionsByAnnonce = new DataLoader(
    async (annonceIds: readonly string[]) => {
      const questions = await prisma.question.findMany({
        where: { annonceId: { in: [...annonceIds] } },
        orderBy: { createdAt: "asc" },
      });
      const grouped = groupBy(questions, (q) => q.annonceId);
      return annonceIds.map((id) => grouped.get(id) ?? []);
    },
  );
  // Annonces d'un agent, filtrées par la politique de lecture.
  const annoncesByAgent = new DataLoader(async (agentIds: readonly string[]) => {
    const rows = await prisma.annonce.findMany({
      where: { agentId: { in: [...agentIds] } },
      orderBy: { createdAt: "desc" },
    });
    const visibles = rows.filter((a) => Can.readAnnonce(actor, a));
    return agentIds.map((id) => visibles.filter((a) => a.agentId === id));
  });

  // Questions posées par un utilisateur : seulement sur des annonces lisibles.
  const questionsByUser = new DataLoader(async (userIds: readonly string[]) => {
    const rows = await prisma.question.findMany({
      where: { userId: { in: [...userIds] } },
      orderBy: { createdAt: "desc" },
      include: { annonce: { select: { agentId: true, statusPublication: true } } },
    });
    return userIds.map((id) => rows.filter((q) => q.userId === id));
  });

  // Une annonce par id (pour Question.annonce et Photo.annonce), filtrée.
  const annonceById = new DataLoader(async (ids: readonly string[]) => {
    const rows = await prisma.annonce.findMany({ where: { id: { in: [...ids] } } });
    const byId = new Map(rows.filter((a) => Can.readAnnonce(actor, a)).map((a) => [a.id, a]));
    return ids.map((id) => byId.get(id) ?? null);
  });


return {
    auteurById,
    photosByAnnonce,
    questionsByAnnonce,
    annoncesByAgent,
    questionsByUser,
    annonceById,
  };}

export type Loaders = ReturnType<typeof createLoaders>;
