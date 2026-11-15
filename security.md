# SECURITY.md — Audit de Sécurité (ImmoService API)

## 1. Failles OWASP API Top 10 recherchées

| Code | Faille | Périmètre audité |
| :--- | :--- | :--- |
| **API1** | Broken Object Level Authorization (IDOR) | `PATCH`/`DELETE` d'annonces, réponse aux questions, lecture des brouillons |
| **API2** | Broken Authentication | `/auth/login`, `/auth/me`, jeton absent / falsifié / expiré, timing attack |
| **API3** | Broken Object Property Level Authorization | Fuite de `passwordHash` ou d'e-mails, mass assignment (`role`, `agentId`) |
| **API4** | Unrestricted Resource Consumption | Pagination illimitée, force brute sur `/auth/login`, profondeur GraphQL |
| **API5** | Broken Function Level Authorization | Création d'annonce réservée aux `AGENT`/`ADMIN` (REST & GraphQL) |
| **API8** | Security Misconfiguration | CORS, fuite de stack traces (`500`), secret JWT faible, GraphiQL |

---

## 2. Failles trouvées et corrigées dans le code

- **IDOR & visibilité des brouillons (API1) :** chaque mutation charge la ressource puis applique `Can.mutateAnnonce` ou `Can.respondToQuestion` (`403` si non propriétaire). Les brouillons d'autrui sont masqués (`404` sur détail REST, filtrés dans la liste via JWT optionnel `getOptionalActor`, `null` en GraphQL). Validé par un test E2E à double assertion (`403` + intégrité vérifiée en base).
- **Mass Assignment (API3) :** Zod supprime les champs inconnus ; le rôle est forcé côté serveur à `USER` sur `POST /auth/register`, et `agentId` est exclu de `UpdateAnnonceSchema` (impossible de réattribuer une annonce).
- **Exposition excessive de données (API3) :** `select` explicites en liste blanche sur toutes les requêtes Prisma ; `passwordHash` n'est lu en mémoire qu'au login, et l'e-mail des agents a été retiré des réponses publiques.  
- **Les tests de fuite** inspectent la réponse HTTP brute (le SDK masquerait le champ) et ont été validés en cassant volontairement le `select`.
- **Authentification robuste (API2) :** hachage Argon2 ; message d'erreur unique pour « email inconnu » et « mauvais mot de passe » avec `burnPasswordCheck` (durée équivalente contre l'énumération temporelle) ; JWT vérifié avec `algorithms: ["HS256"]` et secret refusé sous 32 caractères.
- **Consommation de ressources (API4) :** rate limiting en mémoire sur `POST /auth/login` (`429 RATE_LIMITED` au-delà de 5 tentatives/min) ; plafond serveur `limit <= 50` partagé entre REST et GraphQL ; profondeur GraphQL limitée à `6` (`depth.ts`).
- **Configuration & GraphQL (API5 / API8) :** CORS en liste blanche explicite (jamais `*`) ; `no-store` sur `/auth` et `/graphql` ; erreurs `500` génériques et `maskedErrors: true` en GraphQL ; resolvers GraphQL protégés un par un dans l'ordre *Authentification $\rightarrow$ Autorisation (`Can.*`) $\rightarrow$ Validation (Zod)*.

---

## 3. Risques résiduels connus (acceptés ou hors périmètre)

- **Énumération de comptes à l'inscription :** `POST /auth/register` renvoie `409 Conflict` si l'e-mail existe déjà. Risque **accepté** pour l'ergonomie utilisateur (l'éviter imposerait une confirmation par e-mail asynchrone).
- **Schémas d'URL des photos :** `z.string().url()` accepte d'autres protocoles que `http(s)` (ex. `javascript:`). Sans impact tant qu'aucun front ne les rend ; à restreindre avant l'intégration d'un client web.
- **Complexité GraphQL & Rate Limit distribué :** la limite GraphQL contrôle la profondeur (`6`) mais pas le coût par alias multiples, et le compteur de rate limiting est stocké en mémoire locale (nécessiterait Redis en multi-instances).

---

## 4. Stockage du JWT côté client

Aucun front-end n'est encore couplé : l'API attend le jeton via l'en-tête `Authorization: Bearer <token>` et n'émet aucun cookie (`CORS` sans `credentials`).
- **Recommandation :** stocker le jeton en **mémoire vive** dans une SPA (protège contre le vol par XSS, au prix d'une reconnexion au rechargement) ou dans un cookie **`HttpOnly; Secure; SameSite=Strict`** posé par un *Backend-for-Frontend* (protège du XSS et du CSRF).
- **À proscrire :** `localStorage` et `sessionStorage`, directement lisibles par tout script injecté en cas de faille XSS.

---

## 5. Vol d'un JWT et révocation

Notre authentification étant **sans état (stateless)** (`HS256`, expiration `30min` via `JWT_EXPIRES_IN`), le serveur ne conserve aucune session : **un jeton volé ne peut pas être révoqué individuellement** avant son expiration, et le voleur agit avec les droits inscrits dans le payload (seul `/auth/me` revérifie l'existence du compte en base ; une rétrogradation de rôle ne prend effet qu'à expiration).

- **Mitigations en place :** durée de vie courte (`30min`), signature stricte `HS256`, transport *HTTPS* à imposer au déploiement (reverse proxy).
- **Pistes d'évolution :** ajouter un identifiant unique `jti` vérifié dans une *blacklist* Redis lors de la déconnexion, mettre en place un couple *Access Token court (15 min) + Refresh Token rotatif* en base, ou effectuer une rotation de `JWT_SECRET` en cas de compromission majeure (invalide immédiatement tous les jetons actifs).