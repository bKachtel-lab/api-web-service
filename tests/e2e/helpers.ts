// tests/e2e/helpers.ts
import { serve } from "@hono/node-server";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/db.js";
import { hashPassword } from "../../src/auth/password.js";
import {
    Configuration,
    AuthApi,
    AnnoncesApi,
    QuestionsApi,
    ResponseError,
} from "../../sdk/index.js";
import { resetRateLimitStore } from "../../src/middlewares/rate-limit.js";

let server: Server | null = null;
export let BASE_URL = "";

export async function startTestServer(): Promise<string> {
    if (server && BASE_URL) return BASE_URL;

    await new Promise<void>((resolve) => {
        server = serve({ fetch: app.fetch, port: 0 }, (info) => {
            BASE_URL = `http://127.0.0.1:${info.port}`;
            resolve();
        }) as unknown as Server;
    });

    return BASE_URL;
}

export async function stopTestServer(): Promise<void> {
    if (server) {
        await new Promise<void>((resolve) => server!.close(() => resolve()));
        server = null;
        BASE_URL = "";
    }
}

export function createClients(token?: string) {
    const config = new Configuration({
        basePath: BASE_URL,
        accessToken: token,
    });
    return {
        auth: new AuthApi(config),
        annonces: new AnnoncesApi(config),
        questions: new QuestionsApi(config),
    };
}

export async function getHttpStatus(
    fn: () => Promise<unknown>,
): Promise<number> {
    try {
        await fn();
        return 200;
    } catch (err) {
        if (err instanceof ResponseError) {
            return err.response.status;
        }
        throw err;
    }
}

export async function resetAndSeedTestDb() {
    resetRateLimitStore();
    await prisma.question.deleteMany();
    await prisma.photo.deleteMany();
    await prisma.favori.deleteMany();
    await prisma.annonce.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await hashPassword("Password123!");

    const [agentA, agentB, user, admin] = await Promise.all([
        prisma.user.create({
            data: {
                name: "Agent Alpha",
                email: "agent1@test.fr",
                passwordHash,
                role: "AGENT",
            },
        }),
        prisma.user.create({
            data: {
                name: "Agent Beta",
                email: "agent2@test.fr",
                passwordHash,
                role: "AGENT",
            },
        }),
        prisma.user.create({
            data: {
                name: "Client Test",
                email: "user@test.fr",
                passwordHash,
                role: "USER",
            },
        }),
        prisma.user.create({
            data: {
                name: "Admin Test",
                email: "admin@test.fr",
                passwordHash,
                role: "ADMIN",
            },
        }),
    ]);

    const annoncePublieeA = await prisma.annonce.create({
        data: {
            titre: "Appartement T3 Le Havre",
            description: "Bel appartement lumineux proche centre.",
            ville: "Le Havre",
            type: "VENTE",
            statusPublication: "PUBLIEE",
            prix: 185000,
            dateDisponibilite: new Date("2026-12-01T00:00:00.000Z"),
            agentId: agentA.id,
        },
    });

    const annonceBrouillonA = await prisma.annonce.create({
        data: {
            titre: "Studio Brouillon Agent A",
            description: "Annonce en cours de rédaction.",
            ville: "Le Havre",
            type: "VENTE",
            statusPublication: "BROUILLON",
            prix: 75000,
            dateDisponibilite: new Date("2026-12-01T00:00:00.000Z"),
            agentId: agentA.id,
        },
    });

    const annoncePublieeB = await prisma.annonce.create({
        data: {
            titre: "Maison Jardin Fécamp",
            description: "Grande maison familiale au calme.",
            ville: "Fécamp",
            type: "VENTE",
            statusPublication: "PUBLIEE",
            prix: 290000,
            dateDisponibilite: new Date("2026-12-01T00:00:00.000Z"),
            agentId: agentB.id,
        },
    });

    return {
        agentA,
        agentB,
        user,
        admin,
        annoncePublieeA,
        annonceBrouillonA,
        annoncePublieeB,
    };
}
