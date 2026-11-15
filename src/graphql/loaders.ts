// src/graphql/loaders.ts
// RÔLE : DataLoaders = batching + cache par requête pour éviter le problème N+1.
// Sans eux : lister 20 annonces avec leur auteur = 1 + 20 requêtes SQL.
// Avec eux : 1 + 1 requête, quel que soit le nombre d'annonces.

import DataLoader from "dataloader";
import { prisma } from "../lib/db.js";

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
export function createLoaders() {
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

  return { auteurById, photosByAnnonce, questionsByAnnonce };
}

export type Loaders = ReturnType<typeof createLoaders>;
