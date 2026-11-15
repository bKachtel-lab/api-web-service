//tests/e2e/auth.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
    startTestServer,
    stopTestServer,
    resetAndSeedTestDb,
    createClients,
    getHttpStatus,
    BASE_URL,
} from "./helpers.js";

describe("E2E — Authentification & Profil (via SDK)", () => {
    beforeAll(async () => {
        await startTestServer();
    });

    afterAll(async () => {
        await stopTestServer();
    });

    beforeEach(async () => {
        await resetAndSeedTestDb();
    });

    it("inscrit un utilisateur et force le rôle USER même si role=ADMIN est envoyé", async () => {
        const { auth } = createClients();
        const created = await auth.authRegisterPost({
            registerBody: {
                name: "Hacker Test",
                email: "nouveau@test.fr",
                password: "Password123!",
                role: "ADMIN",
            } as any,
        });

        expect(created.email).toBe("nouveau@test.fr");
        expect(created.role).toBe("USER");
    });

    it("renvoie 409 si l'email est déjà utilisé", async () => {
        const { auth } = createClients();
        const status = await getHttpStatus(() =>
            auth.authRegisterPost({
                registerBody: {
                    name: "Doublon",
                    email: "agent1@test.fr",
                    password: "Password123!",
                },
            }),
        );
        expect(status).toBe(409);
    });

    it("authentifie un agent et retourne son profil via /auth/me", async () => {
        const { auth } = createClients();
        const loginRes = await auth.authLoginPost({
            loginBody: { email: "agent1@test.fr", password: "Password123!" },
        });

        expect(loginRes.token).toBeTruthy();

        const authClient = createClients(loginRes.token).auth;
        const me = await authClient.authMeGet();
        expect(me.email).toBe("agent1@test.fr");
        expect(me.role).toBe("AGENT");
    });

    it("renvoie 401 sur /auth/me sans jeton", async () => {
        const { auth } = createClients();
        const status = await getHttpStatus(() => auth.authMeGet());
        expect(status).toBe(401);
    });

    it("renvoie 401 si le mot de passe est incorrect", async () => {
        const { auth } = createClients();

        const status = await getHttpStatus(() =>
            auth.authLoginPost({
                loginBody: {
                    email: "agent1@test.fr",
                    password: "MauvaisMotDePasse123!",
                },
            }),
        );

        expect(status).toBe(401);
    });

    it("renvoie 401 si l'adresse email n'existe pas", async () => {
        const { auth } = createClients();

        const status = await getHttpStatus(() =>
            auth.authLoginPost({
                loginBody: {
                    email: "inconnu@test.fr",
                    password: "Password123!",
                },
            }),
        );

        expect(status).toBe(401);
    });

    it("authentifie un administrateur et retourne son rôle ADMIN", async () => {
        const { auth } = createClients();

        const loginRes = await auth.authLoginPost({
            loginBody: {
                email: "admin@test.fr",
                password: "Password123!",
            },
        });

        expect(loginRes.token).toBeTruthy();

        const authClient = createClients(loginRes.token).auth;
        const me = await authClient.authMeGet();

        expect(me.email).toBe("admin@test.fr");
        expect(me.role).toBe("ADMIN");
    });

    it("renvoie 401 sur /auth/me avec un jeton invalide", async () => {
        const auth = createClients("jeton-invalide").auth;

        const status = await getHttpStatus(() => auth.authMeGet());

        expect(status).toBe(401);
    });

    it("bloque au-delà de 5 tentatives de connexion sur /auth/login avec un statut 429", async () => {
        const { auth } = createClients();

        // 5 premières tentatives échouées -> 401
        for (let i = 0; i < 5; i++) {
            const status = await getHttpStatus(() =>
                auth.authLoginPost({
                    loginBody: {
                        email: "agent1@test.fr",
                        password: "MauvaisPassword!",
                    },
                }),
            );
            expect(status).toBe(401);
        }

        // 6e tentative -> 429 RATE_LIMITED
        const blockedStatus = await getHttpStatus(() =>
            auth.authLoginPost({
                loginBody: {
                    email: "agent1@test.fr",
                    password: "Password123!",
                },
            }),
        );
        expect(blockedStatus).toBe(429);
    });

    it("renvoie les champs attendus à l'inscription", async () => {
        const { auth } = createClients();
        const created = await auth.authRegisterPost({
            registerBody: {
                name: "Safe User",
                email: "safe@test.fr",
                password: "Password123!",
            },
        });
        expect(
            (created as Record<string, unknown>).passwordHash,
        ).toBeUndefined();

        expect(created).toMatchObject({
            name: "Safe User",
            email: "safe@test.fr",
            role: "USER",
        });
        const { token } = await auth.authLoginPost({
            loginBody: { email: "safe@test.fr", password: "Password123!" },
        });
        const me = await createClients(token).auth.authMeGet();
        expect((me as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it("ne renvoie jamais passwordHash dans la réponse HTTP brute", async () => {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Safe User",
                email: "safe@test.fr",
                password: "Password123!",
            }),
        });
        const raw = await res.text();

        expect(res.status).toBe(201);
        expect(raw).not.toContain("passwordHash");
        expect(raw).not.toContain("$argon2");
    });
    
});
