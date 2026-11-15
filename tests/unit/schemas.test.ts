import { describe, it, expect } from "vitest";
import {
    CreateAnnonceSchema,
    UpdateAnnonceSchema,
    QueryAnnoncesSchema,
} from "../../src/modules/annonces/annonces.schema.js";

describe("Schémas de validation Zod — Annonces", () => {
    it("valide une création d'annonce complète et applique les valeurs par défaut", () => {
        const result = CreateAnnonceSchema.safeParse({
            titre: "Appartement T3 lumineux",
            description:
                "Très bel appartement proche de la gare et des commerces.",
            ville: "Le Havre",
            type: "VENTE",
            prix: 185000,
            dateDisponibilite: "2026-12-01T00:00:00.000Z",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.statusPublication).toBe("BROUILLON");
            expect(result.data.statusBien).toBe("DISPONIBLE");
            expect(result.data.dateDisponibilite).toBeInstanceOf(Date);
        }
    });

    it("rejette une annonce avec un prix négatif ou nul", () => {
        const result = CreateAnnonceSchema.safeParse({
            titre: "Maison avec jardin",
            description: "Belle maison familiale au calme.",
            ville: "Rouen",
            type: "VENTE",
            prix: -100,
            dateDisponibilite: "2026-12-01T00:00:00.000Z",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            const issues = result.error.issues.map((issue) =>
                issue.path.join("."),
            );
            expect(issues).toContain("prix");
        }
    });

    it("rejette une annonce sans ville ou avec un titre trop court", () => {
        const result = CreateAnnonceSchema.safeParse({
            titre: "T2",
            description: "Description valide de plus de 10 caractères.",
            type: "LOCATION",
            prix: 700,
            dateDisponibilite: "2026-12-01T00:00:00.000Z",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            const issues = result.error.issues.map((issue) =>
                issue.path.join("."),
            );
            expect(issues).toContain("ville");
            expect(issues).toContain("titre");
        }
    });

    it("valide une mise à jour partielle (PATCH)", () => {
        const result = UpdateAnnonceSchema.safeParse({
            statusPublication: "PUBLIEE",
            prix: 179000,
        });

        expect(result.success).toBe(true);
        if (result.success) expect(result.data.prix).toBe(179000);
    });

    it("applique les valeurs par défaut et convertit les paramètres de query", () => {
        const emptyQuery = QueryAnnoncesSchema.parse({});
        expect(emptyQuery.page).toBe(1);
        expect(emptyQuery.limit).toBe(10);

        const filteredQuery = QueryAnnoncesSchema.parse({
            page: "2",
            limit: "5",
            ville: "Le Havre",
            type: "VENTE",
            prixMax: "250000",
        });
        expect(filteredQuery.page).toBe(2);
        expect(filteredQuery.limit).toBe(5);
        expect(filteredQuery.prixMax).toBe(250000);
    });

    it("rejette un titre trop long", () => {
        const result = CreateAnnonceSchema.safeParse({
            titre: "123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789",
            description: "Description valide de plus de 10 caractères.",
            ville: "Le Havre",
            type: "VENTE",
            prix: 150000,
            dateDisponibilite: "2026-12-01T00:00:00.000Z",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            const issues = result.error.issues.map((issue) =>
                issue.path.join("."),
            );
            expect(issues).toContain("titre");
        }
    });

    it("rejette une description trop courte", () => {
        const result = CreateAnnonceSchema.safeParse({
            titre: "Appartement T2",
            description: "< 10",
            ville: "Le Havre",
            type: "VENTE",
            prix: 150000,
            dateDisponibilite: "2026-12-01T00:00:00.000Z",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            const issues = result.error.issues.map((issue) =>
                issue.path.join("."),
            );
            expect(issues).toContain("description");
        }
    });

    it("rejette un type de bien inexistant", () => {
        const result = CreateAnnonceSchema.safeParse({
            titre: "Appartement T3",
            description: "Bel appartement proche du centre-ville.",
            ville: "Le Havre",
            type: "LOCATION_VACANCES",
            prix: 150000,
            dateDisponibilite: "2026-12-01T00:00:00.000Z",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            const issues = result.error.issues.map((issue) =>
                issue.path.join("."),
            );
            expect(issues).toContain("type");
        }
    });

    it("rejette une pagination avec une limite supérieure à 100", () => {
        const result = QueryAnnoncesSchema.safeParse({
            page: "1",
            limit: "101",
        });

        expect(result.success).toBe(false);
    });

    it("rejette une page égale à zéro", () => {
        const result = QueryAnnoncesSchema.safeParse({
            page: "0",
        });

        expect(result.success).toBe(false);
    });
});
