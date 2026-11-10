// src/auth/policy.ts
// POLITIQUE D'AUTORISATION PURE : aucune dépendance à Hono, Prisma ni HTTP.
// Entrées = données, sortie = booléen. Les routes décident ensuite du code
// HTTP (403 ou 404) ; la politique, elle, répond seulement "a-t-il le droit ?".

export type Role = "USER" | "AGENT" | "ADMIN";

/** Acteur extrait du JWT. null = visiteur anonyme. */
export interface Actor {
  id: string;
  role: Role;
}

/** Ce que la politique doit savoir d'une annonce (chargée en base). */
export interface AnnonceRef {
  agentId: string;
  statusPublication: "BROUILLON" | "PUBLIEE";
}

/** Pour répondre, on a besoin du propriétaire de l'ANNONCE liée à la question. */
export interface QuestionRef {
  annonceAgentId: string;
}

const isAdmin = (a: Actor | null): boolean => a?.role === "ADMIN";
const isOwner = (a: Actor | null, ownerId: string): boolean =>
  a !== null && a.id === ownerId;

export const Can = {
  /** Annonce publiée : publique. Brouillon : auteur et admins seulement. */
  readAnnonce(actor: Actor | null, annonce: AnnonceRef): boolean {
    if (annonce.statusPublication === "PUBLIEE") return true;
    return isAdmin(actor) || isOwner(actor, annonce.agentId);
  },

  /** Création : AGENT ou ADMIN. */
  createAnnonce(actor: Actor | null): boolean {
    return actor !== null && (actor.role === "AGENT" || actor.role === "ADMIN");
  },

  /**
   * Modifier / supprimer / publier. C'est le contrôle ANTI-IDOR : on compare
   * l'id du jeton au propriétaire réel chargé en base, jamais à un id fourni
   * par le client. Le rôle AGENT est exigé en plus (défense en profondeur).
   */
  mutateAnnonce(actor: Actor | null, annonce: AnnonceRef): boolean {
    if (actor === null) return false;
    if (isAdmin(actor)) return true;
    return actor.role === "AGENT" && isOwner(actor, annonce.agentId);
  },

  /** Poser une question : tout utilisateur authentifié. */
  askQuestion(actor: Actor | null): boolean {
    return actor !== null;
  },

  /** Répondre : agent propriétaire de l'annonce liée, ou admin. */
  respondToQuestion(actor: Actor | null, question: QuestionRef): boolean {
    if (actor === null) return false;
    if (isAdmin(actor)) return true;
    return actor.role === "AGENT" && isOwner(actor, question.annonceAgentId);
  },
} as const;