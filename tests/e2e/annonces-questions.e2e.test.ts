// tests/e2e/annonces-questions.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../../src/lib/db.js";
import {
    startTestServer,
    stopTestServer,
    resetAndSeedTestDb,
    createClients,
    getHttpStatus,
} from "./helpers.js";

describe("E2E — Annonces, Questions & Sécurité Anti-IDOR (via SDK)", () => {
    let seedData: Awaited<ReturnType<typeof resetAndSeedTestDb>>;

    beforeAll(async () => {
        await startTestServer();
    });

    afterAll(async () => {
        await stopTestServer();
    });

    beforeEach(async () => {
        seedData = await resetAndSeedTestDb();
    });

    async function loginAs(email: string) {
        const { auth } = createClients();
        const { token } = await auth.authLoginPost({
            loginBody: { email, password: "Password123!" },
        });
        return createClients(token);
    }

    describe("Liste et visibilité des annonces", () => {
        it("liste uniquement les annonces publiées pour un visiteur anonyme, et inclut ses brouillons pour l'agent connecté", async () => {
            const anonClient = createClients();
            const pageAnon = await anonClient.annonces.listerAnnonces({
                page: 1,
                limit: 10,
            });
            expect(pageAnon.items.length).toBe(2); // Seulement les 2 publiées

            const agentAClient = await loginAs("agent1@test.fr");
            const pageAgentA = await agentAClient.annonces.listerAnnonces({
                page: 1,
                limit: 10,
            });
            expect(pageAgentA.items.length).toBe(3); // Les 2 publiées + son brouillon
        });

        it("montre toutes les annonces (brouillons inclus) à un ADMIN", async () => {
            const adminClient = await loginAs("admin@test.fr");
            const page = await adminClient.annonces.listerAnnonces({
                page: 1,
                limit: 50,
            });

            const totalInDb = await prisma.annonce.count();
            expect(page.items.length).toBe(totalInDb);
        });
    });

    describe("Filtres et pagination", () => {
        it("filtre les annonces par ville et prixMax", async () => {
            const { annonces } = createClients();
            const page = await annonces.listerAnnonces({
                ville: "Le Havre",
                prixMax: 200000,
            });
            expect(page.items.length).toBe(1);
            expect(page.items[0].ville).toBe("Le Havre");
        });

        it("filtre la ville sans tenir compte de la casse", async () => {
            const { annonces } = createClients();
            const page = await annonces.listerAnnonces({ ville: "LE HavRe" });

            expect(page.items.length).toBeGreaterThan(0);
            expect(
                page.items.every((a) =>
                    a.ville.toLowerCase().includes("le havre"),
                ),
            ).toBe(true);
        });

        it("renvoie une liste vide quand aucun critère ne correspond", async () => {
            const { annonces } = createClients();
            const page = await annonces.listerAnnonces({
                ville: "VilleInexistante",
            });

            expect(page.items).toEqual([]);
            expect(page.meta.total).toBe(0);
        });

        it("pagine correctement les résultats", async () => {
            const { annonces } = createClients();

            const page1 = await annonces.listerAnnonces({ page: 1, limit: 1 });
            const page2 = await annonces.listerAnnonces({ page: 2, limit: 1 });

            expect(page1.items.length).toBe(1);
            expect(page2.items.length).toBe(1);
            expect(page1.items[0].id).not.toBe(page2.items[0].id);
        });
    });

    describe("Détail d'une annonce", () => {
        it("renvoie 404 pour une annonce inexistante", async () => {
            const { annonces } = createClients();
            const status = await getHttpStatus(() =>
                annonces.obtenirAnnonce({ id: "id-qui-nexiste-pas" }),
            );
            expect(status).toBe(404);
        });
    });

    describe("Création, modification et suppression", () => {
        it("permet à un agent de créer, publier et supprimer sa propre annonce (CRUD)", async () => {
            const agentAClient = await loginAs("agent1@test.fr");

            // Création (201)
            const created = await agentAClient.annonces.creerAnnonce({
                createAnnonceInput: {
                    titre: "Loft Industriel Rouen",
                    description: "Superbe loft rénové proche des quais.",
                    ville: "Rouen",
                    type: "VENTE",
                    prix: 240000,
                    dateDisponibilite: new Date("2026-12-15T00:00:00.000Z"),
                    statusPublication: "BROUILLON",
                },
            });
            expect(created.id).toBeTruthy();
            expect(created.statusPublication).toBe("BROUILLON");

            // Publication via PATCH (200)
            const published = await agentAClient.annonces.modifierAnnonce({
                id: created.id,
                updateAnnonceInput: { statusPublication: "PUBLIEE" },
            });
            expect(published.statusPublication).toBe("PUBLIEE");

            // Suppression via DELETE (204)
            await agentAClient.annonces.supprimerAnnonce({ id: created.id });

            // Vérification 404 après suppression
            const statusAfterDelete = await getHttpStatus(() =>
                agentAClient.annonces.obtenirAnnonce({ id: created.id }),
            );
            expect(statusAfterDelete).toBe(404);
        });

        it("refuse à un USER simple de créer une annonce (403)", async () => {
            const userClient = await loginAs("user@test.fr");
            const status = await getHttpStatus(() =>
                userClient.annonces.creerAnnonce({
                    createAnnonceInput: {
                        titre: "Annonce illégale",
                        description:
                            "Tentative de création par un simple utilisateur.",
                        ville: "Le Havre",
                        type: "LOCATION",
                        prix: 700,
                        dateDisponibilite: new Date("2026-12-01T00:00:00.000Z"),
                    },
                }),
            );
            expect(status).toBe(403);
        });

        it("renvoie 401 si on crée une annonce sans être connecté", async () => {
            const { annonces } = createClients();
            const status = await getHttpStatus(() =>
                annonces.creerAnnonce({
                    createAnnonceInput: {
                        titre: "Annonce anonyme",
                        description: "Tentative de création sans jeton.",
                        ville: "Rouen",
                        type: "VENTE",
                        prix: 100000,
                        dateDisponibilite: new Date("2026-12-01T00:00:00.000Z"),
                    },
                }),
            );
            expect(status).toBe(401);
        });

        it("renvoie 400 si les données de création sont invalides", async () => {
            const agentAClient = await loginAs("agent1@test.fr");
            const status = await getHttpStatus(() =>
                agentAClient.annonces.creerAnnonce({
                    createAnnonceInput: {
                        titre: "",
                        description: 2,
                        ville: "Rouen",
                        type: "VENTE",
                        prix: -5,
                        dateDisponibilite: new Date("2026-12-01T00:00:00.000Z"),
                    } as any,
                }),
            );
            expect(status).toBe(400);
        });

        it("permet à un ADMIN de modifier et supprimer l'annonce d'un agent", async () => {
            const adminClient = await loginAs("admin@test.fr");
            const targetId = seedData.annoncePublieeB.id;

            const updated = await adminClient.annonces.modifierAnnonce({
                id: targetId,
                updateAnnonceInput: { prix: 1000 },
            });
            expect(updated.prix).toBe(1000);

            await adminClient.annonces.supprimerAnnonce({ id: targetId });
            const inDb = await prisma.annonce.findUnique({
                where: { id: targetId },
            });
            expect(inDb).toBeNull();
        });
    });

    describe("Sécurité Anti-IDOR", () => {
        it("Agent A ne peut ni modifier ni supprimer l'annonce de Agent B (statut 403 + base intacte)", async () => {
            const agentAClient = await loginAs("agent1@test.fr");
            const targetId = seedData.annoncePublieeB.id;

            // 1. Tentative de modification (PATCH)
            const patchStatus = await getHttpStatus(() =>
                agentAClient.annonces.modifierAnnonce({
                    id: targetId,
                    updateAnnonceInput: { prix: 1 },
                }),
            );
            expect(patchStatus).toBe(403);

            // 2. Tentative de suppression (DELETE)
            const deleteStatus = await getHttpStatus(() =>
                agentAClient.annonces.supprimerAnnonce({ id: targetId }),
            );
            expect(deleteStatus).toBe(403);

            // 3. La base est intacte
            const annonceInDb = await prisma.annonce.findUnique({
                where: { id: targetId },
            });
            expect(annonceInDb).not.toBeNull();
            expect(annonceInDb?.prix).toBe(290000);
            expect(annonceInDb?.agentId).toBe(seedData.agentB.id);
        });
    });

    describe("Questions et réponses", () => {
        it("permet à un USER de poser une question et uniquement à l'agent propriétaire d'y répondre", async () => {
            const userClient = await loginAs("user@test.fr");
            const agentAClient = await loginAs("agent1@test.fr");
            const agentBClient = await loginAs("agent2@test.fr");

            // USER pose une question sur l'annonce de Agent A
            const question = await userClient.questions.poserQuestion({
                id: seedData.annoncePublieeA.id,
                createQuestionInput: {
                    contenu: "Y a-t-il un ascenseur dans l'immeuble ?",
                },
            });
            expect(question.id).toBeTruthy();

            // Agent B tente de répondre -> 403 (Anti-IDOR)
            const forbiddenReply = await getHttpStatus(() =>
                agentBClient.questions.repondreQuestion({
                    id: question.id,
                    createReponseInput: {
                        reponse: "Réponse pirate de Agent B",
                    },
                }),
            );
            expect(forbiddenReply).toBe(403);

            // Agent A répond légitimement -> 200
            const answered = await agentAClient.questions.repondreQuestion({
                id: question.id,
                createReponseInput: {
                    reponse: "Oui, ascenseur jusqu'au 4e étage.",
                },
            });
            expect(answered.reponse).toBe("Oui, ascenseur jusqu'au 4e étage.");
        });

        it("renvoie 404 si on pose une question sur une annonce inexistante", async () => {
            const userClient = await loginAs("user@test.fr");
            const status = await getHttpStatus(() =>
                userClient.questions.poserQuestion({
                    id: "id-qui-nexiste-pas",
                    createQuestionInput: { contenu: "Y a-t-il un parking ?" },
                }),
            );
            expect(status).toBe(404);
        });

        it("renvoie 400 si la question fait moins de 3 caractères", async () => {
            const userClient = await loginAs("user@test.fr");
            const status = await getHttpStatus(() =>
                userClient.questions.poserQuestion({
                    id: seedData.annoncePublieeA.id,
                    createQuestionInput: { contenu: "?" },
                }),
            );
            expect(status).toBe(400);
        });

        it("permet à un ADMIN de répondre à une question", async () => {
            const userClient = await loginAs("user@test.fr");
            const adminClient = await loginAs("admin@test.fr");

            const question = await userClient.questions.poserQuestion({
                id: seedData.annoncePublieeA.id,
                createQuestionInput: {
                    contenu: "Quelle est la surface exacte ?",
                },
            });

            const answered = await adminClient.questions.repondreQuestion({
                id: question.id,
                createReponseInput: { reponse: "Environ 45 m²." },
            });
            expect(answered.reponse).toBe("Environ 45 m².");
        });
    });
});
