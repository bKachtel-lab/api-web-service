// src/auth/policy.ts
// POLITIQUE D'AUTORISATION PURE : aucune dépendance à Hono, Prisma ni HTTP (sauf les types Prisma).
// Entrées = données, sortie = booléen. Les routes décident ensuite du code HTTP.

import { Role, PublicationStatus } from "@prisma/client";

/** Acteur extrait du JWT. null = visiteur anonyme. */
export interface Actor {
  id: string;
  role: Role;
}

/** Alias pour compatibilité si besoin */
export type UserContext = Actor;

/** Ce que la politique doit savoir d'une annonce (chargée en base). */
export interface AnnonceRef {
  id?: string;
  agentId: string;
  statusPublication: PublicationStatus;
}

/** Pour répondre, on a besoin du propriétaire de l'ANNONCE liée à la question. */
export interface QuestionRef {
  annonceAgentId: string;
}

const isAdmin = (a: Actor | null): boolean => a?.role === Role.ADMIN;
const isOwner = (a: Actor | null, ownerId: string): boolean =>
  a !== null && a.id === ownerId;

export const Can = {
  /** Annonce publiée : publique. Brouillon : auteur et admins seulement. */
  readAnnonce(actor: Actor | null, annonce: AnnonceRef): boolean {
    if (annonce.statusPublication === PublicationStatus.PUBLIEE) return true;
    return isAdmin(actor) || isOwner(actor, annonce.agentId);
  },

  /** Création d'une annonce : AGENT ou ADMIN. */
  createAnnonce(actor: Actor | null): boolean {
    return actor !== null && (actor.role === Role.AGENT || actor.role === Role.ADMIN);
  },

  /**
   * Modifier / supprimer / publier (Anti-IDOR).
   * Le rôle AGENT est exigé en plus de la propriété.
   */
  mutateAnnonce(actor: Actor | null, annonce: AnnonceRef): boolean {
    if (actor === null) return false;
    if (isAdmin(actor)) return true;
    return actor.role === Role.AGENT && isOwner(actor, annonce.agentId);
  },

  /** Poser une question : tout utilisateur authentifié. */
  askQuestion(actor: Actor | null): boolean {
    return actor !== null;
  },

  /** Répondre : agent propriétaire de l'annonce liée, ou admin. */
  respondToQuestion(actor: Actor | null, questionOrAgentId: QuestionRef | string): boolean {
    if (actor === null) return false;
    if (isAdmin(actor)) return true;
    const agentId = typeof questionOrAgentId === "string" ? questionOrAgentId : questionOrAgentId.annonceAgentId;
    return actor.role === Role.AGENT && isOwner(actor, agentId);
  },
} as const;