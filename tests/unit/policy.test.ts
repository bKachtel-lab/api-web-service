import { describe, it, expect } from "vitest";
import {
    Can,
    Role,
    PublicationStatus,
    type Actor,
    type AnnonceRef,
} from "../../src/auth/policy.js";

const anon: Actor | null = null;
const user: Actor = { id: "user", role: Role.USER };
const agentA: Actor = { id: "agentA", role: Role.AGENT };
const agentB: Actor = { id: "agentB", role: Role.AGENT };
const admin: Actor = { id: "admin-1", role: Role.ADMIN };

const annoncePublieeA: AnnonceRef = {
    id: "ann1",
    agentId: "agentA",
    statusPublication: PublicationStatus.PUBLIEE,
};

const annonceBrouillonA: AnnonceRef = {
    id: "ann2",
    agentId: "agentA",
    statusPublication: PublicationStatus.BROUILLON,
};

describe("Politique d'autorisation pure (Can)", () => {
    describe("readAnnonce", () => {
        it("autorise tout le monde (y compris anonyme) à lire une annonce publiée", () => {
            expect(Can.readAnnonce(anon, annoncePublieeA)).toBe(true);
            expect(Can.readAnnonce(user, annoncePublieeA)).toBe(true);
            expect(Can.readAnnonce(agentB, annoncePublieeA)).toBe(true);
        });

        it("masque les brouillons aux anonymes, USER et autres AGENT", () => {
            expect(Can.readAnnonce(anon, annonceBrouillonA)).toBe(false);
            expect(Can.readAnnonce(user, annonceBrouillonA)).toBe(false);
            expect(Can.readAnnonce(agentB, annonceBrouillonA)).toBe(false);
        });

        it("autorise l'agent auteur et l'ADMIN à lire un brouillon", () => {
            expect(Can.readAnnonce(agentA, annonceBrouillonA)).toBe(true);
            expect(Can.readAnnonce(admin, annonceBrouillonA)).toBe(true);
        });
    });

    describe("createAnnonce", () => {
        it("refuse la création aux anonymes et aux USER", () => {
            expect(Can.createAnnonce(anon)).toBe(false);
            expect(Can.createAnnonce(user)).toBe(false);
        });

        it("autorise la création aux AGENT et ADMIN", () => {
            expect(Can.createAnnonce(agentA)).toBe(true);
            expect(Can.createAnnonce(admin)).toBe(true);
        });
    });

    describe("mutateAnnonce (Anti-IDOR)", () => {
        it("autorise l'agent propriétaire à modifier/supprimer sa propre annonce", () => {
            expect(Can.mutateAnnonce(agentA, annoncePublieeA)).toBe(true);
            expect(Can.mutateAnnonce(agentA, annonceBrouillonA)).toBe(true);
        });

        it("bloque un autre agent (Agent B sur annonce de Agent A)", () => {
            expect(Can.mutateAnnonce(agentB, annoncePublieeA)).toBe(false);
        });

        it("bloque les USER et anonymes, mais autorise l'ADMIN", () => {
            expect(Can.mutateAnnonce(anon, annoncePublieeA)).toBe(false);
            expect(Can.mutateAnnonce(user, annoncePublieeA)).toBe(false);
            expect(Can.mutateAnnonce(admin, annoncePublieeA)).toBe(true);
        });

        it("bloque un USER même s'il possède le même identifiant que l'agent propriétaire", () => {
            const userWithAgentId: Actor = {
                id: "agentA",
                role: Role.USER,
            };

            expect(Can.mutateAnnonce(userWithAgentId, annoncePublieeA)).toBe(
                false,
            );
        });
    });

    describe("askQuestion & respondToQuestion", () => {
        it("autorise tout utilisateur authentifié à poser une question, mais pas un anonyme", () => {
            expect(Can.askQuestion(anon)).toBe(false);
            expect(Can.askQuestion(user)).toBe(true);
            expect(Can.askQuestion(agentB)).toBe(true);
        });

        it("autorise uniquement l'agent propriétaire de l'annonce (ou ADMIN) à répondre", () => {
            expect(Can.respondToQuestion(anon, "agentA")).toBe(false);
            expect(Can.respondToQuestion(user, "agentA")).toBe(false);
            expect(Can.respondToQuestion(agentB, "agentA")).toBe(false);
            expect(Can.respondToQuestion(agentA, "agentA")).toBe(true);
            expect(Can.respondToQuestion(admin, "agentA")).toBe(true);
        });
    });
});
