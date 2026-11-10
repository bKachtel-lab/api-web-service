// src/auth/policy.ts
import { Role, PublicationStatus } from "@prisma/client";

export interface UserContext {
  id: string;
  role: Role;
}

export interface AnnonceContext {
  id: string;
  agentId: string;
  statusPublication: PublicationStatus;
}

export const Can = {
  /**
   * Une annonce publiée est visible par tous.
   * Un brouillon n'est visible que par l'Agent propriétaire ou un ADMIN.
   */
  readAnnonce: (user: UserContext | null, annonce: AnnonceContext): boolean => {
    if (annonce.statusPublication === PublicationStatus.PUBLIEE) return true;
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;
    return user.role === Role.AGENT && user.id === annonce.agentId;
  },

  /**
   * Seul l'Agent propriétaire de l'annonce ou un ADMIN peut la modifier/supprimer.
   * (Anti-IDOR)
   */
  mutateAnnonce: (user: UserContext, annonce: AnnonceContext): boolean => {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;
    return user.role === Role.AGENT && user.id === annonce.agentId;
  },

  /**
   * Seul l'Agent propriétaire de l'annonce liée (ou un ADMIN) peut répondre à une question.
   */
  respondToQuestion: (user: UserContext, annonceAgentId: string): boolean => {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;
    return user.role === Role.AGENT && user.id === annonceAgentId;
  },
};