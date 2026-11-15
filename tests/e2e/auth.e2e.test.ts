//tests/e2e/auth.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
    startTestServer,
    stopTestServer,
    resetAndSeedTestDb,
    createClients,
    getHttpStatus,
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
});
