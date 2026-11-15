# AI.md — Usage critique de l'IA dans le projet ImmoService API

## 1. Ce qui a été délégué, ce que nous avons écrit, et pourquoi ce partage

- **Écrit et décidé par nous (architecture, sécurité et logique métier) :** 
  - L'architecture globale du projet (Hono, Zod-OpenAPI, Prisma 7), le schéma de base de données et le jeu de données `prisma/seed.ts` (50 annonces).
  - La conception et l'architecture complète de la couche **GraphQL Yoga** (schéma SDL code-first, resolvers, DataLoaders pour résoudre le problème N+1, limite de profondeur des requêtes).
  - La politique d'autorisation centralisée `Can.*` (`policy.ts`) partagée entre REST et GraphQL, l'authentification JWT (`HS256`), les contrôleurs, les choix de statut (`403` vs `404`), ainsi que la rédaction finale de `SECURITY.md` et du `README.md`.
  - L'exécution des tests manuels, la mesure des requêtes SQL (validation des DataLoaders) et les vérifications de sécurité (contrôle d'accès et anti-IDOR sur REST et GraphQL).

- **Délégué à l'IA (tâches répétitives et briques standardisées) :** 
  - L'amorçage de briques techniques normées et répétitives : squelette du middleware de limitation de débit (`rate-limit.ts`) et du cache HTTP (`cache.ts` avec gestion d'ETag), que nous avons ensuite audités et ajustés.
  - Le squelette des tests E2E, la relecture du typage strict (`tsc`), le diagnostic d'erreurs système/CLI (Prisma, PowerShell) et la proposition de messages de commit.

- **Pourquoi ce partage :** 
  - L'IA nous fait gagner du temps sur les tâches répétitives ou le boilerplate technique à faible valeur ajoutée (configuration de base, mise en forme, diagnostics d'erreurs système).
  - La grande majorité du projet (logique métier, architecture REST et GraphQL, DataLoaders, rôles et sécurité) a été entièrement rédigée et maîtrisée par nous pour garantir la conformité, la performance et la robustesse de l'API.

---

## 2. Deux suggestions rejetées (avec justification technique)

1. **Appliquer un cache HTTP `public` global sur tous les `GET /annonces` :** 
   - *Suggestion rejetée :* Simplifier le middleware de cache avec `Cache-Control: public, max-age=60` sur l'ensemble des routes de consultation.
   - *Justification technique :* La réponse dépend de l'authentification (un agent voit ses propres brouillons). Un cache public partagé aurait risqué d'exposer ces brouillons à des utilisateurs anonymes. Nous avons imposé `private, no-cache` lorsqu'un JWT valide est présent, `public, max-age=60` sinon, couplé à l'en-tête `Vary: Authorization`.

2. **Changer l'import du client Prisma vers `./generated/prisma/client` :** 
   - *Suggestion rejetée :* Face à une erreur de compilation signalée sans stacktrace complète, l'IA a supposé un changement de générateur lié à Prisma 7.
   - *Justification technique :* Le projet compilait déjà avec `@prisma/client` partout ; modifier l'import aurait cassé tout le dépôt. La vraie cause était de simples backticks perdus lors d'un copier-coller dans un `console.log`. *Leçon : une suggestion formulée sans message d'erreur complet est une hypothèse, pas un diagnostic.*

---

## 3. Bugs introduits par génération : détection et correction

- **Cas 1 — Un test de sécurité E2E qui ne pouvait pas échouer :**
  - *Le bug :* Un test E2E *« ne renvoie jamais `passwordHash` »*, écrit via le SDK généré avec l'aide de l'IA, passait systématiquement au vert, donnant une fausse assurance de sécurité.
  - *Détection :* Par mutation volontaire : nous avons temporairement ajouté `passwordHash: true` dans le `select` Prisma pour provoquer la fuite. Le test SDK est resté vert alors que le serveur renvoyait bien le hash dans le JSON, car le client généré filtre uniquement les champs déclarés dans le contrat OpenAPI.
  - *Correction :* Remplacement par des tests inspectant la **réponse HTTP brute** (`fetch` natif, puis recherche des chaînes `passwordHash` et `$argon2` dans le texte) sur `/auth/register`, `/auth/login` et `/auth/me`.

- **Cas 2 — Échec de revalidation `304 Not Modified` sur la comparaison d'ETag :**
  - *Le bug :* Lors du test du cache HTTP avec une commande `curl` générée par l'IA (`-H 'If-None-Match: "ETAG"'`), le serveur renvoyait systématiquement `200 OK` au lieu de `304 Not Modified`.
  - *Détection :* Observation répétée des en-têtes de réponse en terminal : l'ETag renvoyé par le serveur était identique, mais la condition `If-None-Match` échouait à cause du retrait des guillemets doubles par l'interpréteur PowerShell (le serveur recevait `HGOj...` au lieu de `"HGOj..."`).
  - *Correction :* Ajout d'une fonction `normalizeTag` dans `cache.ts` pour nettoyer les guillemets et le préfixe faible `W/` avant comparaison, validant ensuite le statut `304` attendu.

> **Bilan critique :** Un test de sécurité ou de performance n'est crédible que s'il a déjà été observé en échec. L'IA produit volontiers des tests qui passent et des diagnostics plausibles ; notre rôle est de vérifier expérimentalement que chaque garde-fou casse réellement lorsqu'on introduit l'anomalie correspondante.