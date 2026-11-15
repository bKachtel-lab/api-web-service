# Web Services — ImmoService API — Backend Immobilier

### Développeurs : **Boussad HAMMOUM & Boukhalfa KACHTEL**

Service web TypeScript de gestion d'annonces immobilières (vente et location) et de questions/réponses entre visiteurs et agents, développé avec **Hono**, **Prisma 7**, **PostgreSQL**, **Zod-OpenAPI** et **GraphQL Yoga**.

---

## 1. Démarrage depuis zéro

### Prérequis
- **Node.js** (v20+)
- **Docker** et **Docker Compose**
- **Git** et **OpenSSL** (pour générer le secret JWT)
- *(Optionnel)* **Java (JRE/JDK)** uniquement si vous souhaitez régénérer le SDK TypeScript (`./sdk`) depuis `openapi.yaml` (le SDK déjà généré est versionné dans le dépôt).

### Installation et lancement étape par étape

1. **Cloner le dépôt et installer les dépendances :**
   ```bash
   git clone <URL_DU_DEPOT>
   cd lab-web-services
   npm install
   ```

2. **Configurer les variables d'environnement :**
   Créez le fichier `.env` à la racine du projet à partir du modèle fourni :
   ```bash
   cp .env.example .env
   ```

   Configurez les variables suivantes dans `.env` :
   ```dotenv
   POSTGRES_USER=user_name
   POSTGRES_PASSWORD=****
   POSTGRES_DB=db_name
   POSTGRES_PORT=5432
   DATABASE_URL="postgresql://user_name:****@localhost:5432/db_name"

   # Authentification JWT
   JWT_SECRET="cle_secrete_de_32_caracteres_minimum"
   JWT_EXPIRES_IN=30m

   # Base de test isolée
   POSTGRES_TEST_USER=user_test
   POSTGRES_TEST_PASSWORD=***
   POSTGRES_TEST_DB=db_test_name
   DATABASE_URL_TEST="postgresql://user_test:***@localhost:5433/db_test_name"
   ```

   Générez une clé secrète aléatoire pour `JWT_SECRET` avec OpenSSL (32 caractères minimum requis) :
   ```bash
   openssl rand -hex 32
   ```

   > **Important :** ne partagez jamais votre fichier `.env` ni vos véritables clés secrètes. Le fichier est exclu du dépôt Git.

3. **Démarrer les bases de données PostgreSQL via Docker :**
   ```bash
   docker compose up -d
   docker compose ps # Vérifier que les conteneurs (dev et test) sont démarrés
   ```

4. **Générer le client Prisma, appliquer les migrations et peupler la base de développement :**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   npx prisma db seed
   ```

5. **Démarrer le serveur en mode développement :**
   ```bash
   npm run dev
   ```
   - **API REST :** `http://localhost:3000`
   - **Documentation interactive (Swagger UI) :** `http://localhost:3000/docs`
   - **Spécification OpenAPI 3.1 :** `http://localhost:3000/openapi.json` (et `openapi.yaml` à la racine)
   - **Endpoint GraphQL :** `http://localhost:3000/graphql`

### Exécuter la suite de tests (Unitaires & E2E)

Les tests E2E utilisent une base PostgreSQL dédiée (`DATABASE_URL_TEST`) et consomment le SDK TypeScript généré depuis le contrat OpenAPI :

```bash
# 1. Appliquer les migrations sur la base de test (à faire une première fois)
npm run db:test:migrate

# 2. Lancer tous les tests (unitaires + E2E)
npx vitest run 

# Pour cibler un groupe de tests
npm run test #tests unitaires seuls
npm run test:e2e #tests e2e seuls
```

> *(Sécurité : la suite refuse de démarrer si `DATABASE_URL_TEST` est absente ou identique à `DATABASE_URL`).*
  
  ### Régénérer le SDK (après modification d'une route ou d'un schéma)

Le SDK versionné dans `./sdk` est généré depuis le contrat OpenAPI. Après toute modification d'une route ou d'un schéma Zod :

```bash
# 1. Exporter le contrat OpenAPI à jour
npx tsx scripts/generate-openapi.ts

# 2. Régénérer le client TypeScript (nécessite Java)
npx openapi-generator-cli generate -i openapi.yaml -g typescript-fetch -o sdk

# 3. Vérifier que tout compile
npx tsc --noEmit
```
---

## 2. Comptes de test & Données initiales (Seed)

Le script `prisma/seed.ts` peuple la base avec **12 utilisateurs**, **50 annonces** (40 publiées et 10 brouillons, réparties équitablement entre les 5 agents) et **6 questions** accompagnées de leurs réponses.

Tous les comptes utilisent le mot de passe unique : `Password123!`

| Rôle      | Nom                                               | Email                  | Mot de passe   | Périmètre dans les tests                                           |
| :-------- | :------------------------------------------------ | :--------------------- | :------------- | :----------------------------------------------------------------- |
| **AGENT** | Agent Alpha                                       | `agent1@immobilier.fr` | `Password123!` | Propriétaire des annonces #1, #6, #11… (dont des brouillons)       |
| **AGENT** | Agent Beta                                        | `agent2@immobilier.fr` | `Password123!` | Propriétaire des annonces #2, #7, #12… (cible des tests anti-IDOR) |
| **AGENT** | Agent Gamma                                       | `agent3@immobilier.fr` | `Password123!` | Propriétaire des annonces #3, #8, #13…                             |
| **AGENT** | Agent Delta                                       | `agent4@immobilier.fr` | `Password123!` | Propriétaire des annonces #4, #9, #14…                             |
| **AGENT** | Agent Epsilon                                     | `agent5@immobilier.fr` | `Password123!` | Propriétaire des annonces #5, #10, #15…                            |
| **USER**  | Jean Dupont *(+ `user2` à `user6@immobilier.fr`)* | `user1@immobilier.fr`  | `Password123!` | Consultation des annonces publiées et dépôt de questions           |
| **ADMIN** | Administrateur                                    | `admin@immobilier.fr`  | `Password123!` | Accès complet en lecture et écriture (brouillons inclus)           |

> *N'utilisez jamais ces identifiants ni ces mots de passe en production.*

---

## 3. Choix techniques et justifications d'architecture

### Choix du framework : Hono (plutôt qu'Express ou NestJS)
- **Typage TypeScript de bout en bout :** Hono infère nativement les types des paramètres de route, des requêtes validées (`c.req.valid(...)`) et des variables de contexte (`c.get('actor')`) sans surcouche de décorateurs.
- **Standards Web (Fetch API) & légèreté :** Hono s'appuie sur les objets standards `Request` et `Response`, ce qui permet d'intégrer **GraphQL Yoga** en deux lignes (`pp.on(["GET","POST"], "/graphql", ...)`), d'exécuter les routes en mémoire et de composer des middlewares légers (CORS, Cache/ETag, Rate Limiting).
- **Intégration native avec Zod :** Le couple `@hono/zod-openapi` permet d'unifier la validation runtime et la documentation OpenAPI dans une seule définition de route.

### Approche OpenAPI : Code-First via `@hono/zod-openapi`
Nous avons retenu une approche **code-first** pilotée par les schémas **Zod** :
1. **Source unique de vérité :** chaque schéma Zod (`CreateAnnonceSchema`, `AnnonceResponseSchema`, etc.) assure simultanément la validation stricte des entrées HTTP à l'exécution, l'inférence des types TypeScript dans les services et la génération automatique du document **OpenAPI 3.1** (`/openapi.json` et `openapi.yaml`).
2. **Zéro dérive entre le code et la documentation :** il est impossible qu'un champ ajouté ou modifié dans un schéma Zod soit oublié dans Swagger UI (`/docs`).
3. **Contrat vérifié par compilation (SDK) :** le client TypeScript (`./sdk`) est généré depuis `openapi.yaml` via `@openapitools/openapi-generator-cli` (`typescript-fetch`) et consommé directement par nos tests E2E. Si un schéma OpenAPI omet un champ ou déclare un mauvais type, les tests E2E ne compilent pas.

### Choix de conception REST
- **Découpage en ressources :** `/auth` (inscription, connexion, profil `/auth/me`), `/annonces` (collection et détail `/annonces/{id}`), et `/annonces/{id}/questions` + `/questions/{id}/reponse` pour les échanges.
- **Publication d'une annonce via `PATCH /annonces/{id}` :** plutôt que de multiplier les endpoints RPC (`/publier`, `/depublier`), le statut de publication (`BROUILLON` / `PUBLIEE`) est modélisé comme un attribut d'état de la ressource `Annonce`, modifiable partiellement via `PATCH` (tout comme le prix ou le statut du bien `DISPONIBLE` / `LOUE` / `VENDU`).
- **Sous-ressource `Question` et champ `reponse` :** une annonce peut recevoir plusieurs questions provenant de différents utilisateurs (d'où la sous-ressource `POST /annonces/{id}/questions`). En revanche, une question n'appelle qu'une seule réponse officielle de l'agent propriétaire de l'annonce : modéliser `reponse` comme un champ nullable sur `Question` (mis à jour via `POST /questions/{id}/reponse`) évite une jointure supplémentaire tout en garantissant l'unicité de la réponse.
- **Choix `403` vs `404` :**
  - Sur `GET /annonces/{id}` : un brouillon appartenant à un autre agent renvoie **`404 Not Found`** afin de ne pas révéler l'existence d'une ressource non publiée.
  - Sur `PATCH` / `DELETE /annonces/{id}` et `POST /questions/{id}/reponse` : l'annonce ou la question étant publique, une tentative par un agent non propriétaire renvoie **`403 Forbidden`** (contrôlé par la politique pure `src/auth/policy.ts`).

---

## 4. Fonctionnalités complémentaires & Sécurité

- **API GraphQL (`/graphql`) :** schéma complet (Queries paginées/filtrables, Mutations avec erreurs métier typées dans le payload `FieldError[]`), authentification par contexte, autorisation `Can.*` explicite dans chaque resolver, limite de profondeur (`6`) et **DataLoaders** instanciés par requête HTTP (`Annonce.auteur`, `photos`, `questions`) supprimant le problème N+1.
- **Cache HTTP (`src/middlewares/cache.ts`) :** `Cache-Control: public, max-age=60` pour les lectures anonymes, `private, no-cache` avec `Vary: Authorization` dès qu'un jeton JWT est fourni, `no-store` sur `/auth` et `/graphql`, et support complet de **`ETag` / `If-None-Match` (`304 Not Modified`)**.
- **Durcissement & Audit :** voir [`SECURITY.md`](./SECURITY.md) pour le détail des protections OWASP API Top 10 (anti-IDOR, Argon2 + timing-safe login, rate limiting `429` sur `/auth/login`, plafond de pagination à `50`, `select` Prisma explicites sans `passwordHash`).

---

## 5. Stack technique & Scripts principaux

### Stack technique

| Technologie                                | Utilisation                                                             |
| :----------------------------------------- | :---------------------------------------------------------------------- |
| **Hono & `@hono/zod-openapi`**             | Framework web, routage typé et génération OpenAPI 3.1                   |
| **Prisma 7 & PostgreSQL**                  | ORM, migrations versionnées et bases de données relationnelles          |
| **GraphQL Yoga & DataLoader**              | Endpoint `/graphql` et résolution par lots (anti-N+1)                   |
| **Argon2 & JWT (`jsonwebtoken`)**          | Hachage de mots de passe et authentification stateless HS256            |
| **OpenAPI Generator (`typescript-fetch`)** | Génération du SDK client consommé par les tests                         |
| **Vitest**                                 | Tests unitaires et tests E2E avec garde de sécurité `DATABASE_URL_TEST` |

### Scripts NPM

| Commande                      | Description                                                                                         |
| :---------------------------- | :-------------------------------------------------------------------------------------------------- |
| `npm run dev`                 | Démarre le serveur de développement sur `http://localhost:3000`.                                    |
| `npm run build` / `npm start` | Compile en `dist/` puis lance le serveur compilé.                                                   |
| `npm test`                    | Tests unitaires (`tests/unit`).                                                                     |
| `npm run test:e2e`            | Tests E2E via le SDK (`tests/e2e`).                                                                 |
| `npx tsc --noEmit`            | Vérifie le typage TypeScript strict sur tout le projet et le SDK.                                   |
| `npm run db:migrate`          | Crée et applique une migration en développement (`prisma migrate dev`).                             |
| `npm run db:test:migrate`     | Applique les migrations sur la base de test.                                                        |
| `npm run db:seed`             | Peuple la base avec les 12 comptes, 50 annonces et 6 questions (**efface les données existantes**). |
| `npm run generate:openapi`    | Exporte la spécification OpenAPI 3.1 dans `openapi.yaml`.                                           |
| `npm run generate:sdk`        | Exporte le contrat puis régénère le SDK TypeScript (nécessite Java).                                |

---

## 6. Organisation générale

```text
lab-web-services/
├── prisma/
│   ├── migrations/               # Migrations SQL versionnées
│   ├── schema.prisma             # Modèle de données PostgreSQL
│   ├── seed.ts                   # Données initiales (12 comptes, 50 annonces, 6 questions)
│   └── seed-n1.ts                # Jeu de données complémentaire pour mesurer le N+1 GraphQL
├── scripts/
│   └── generate-openapi.ts       # Export automatique de openapi.yaml
├── sdk/                          # Client TypeScript généré depuis openapi.yaml
├── src/
│   ├── index.ts                  # Point d'entrée serveur HTTP (Node.js)
│   ├── app.ts                    # Configuration Hono, CORS, montage des routes REST & GraphQL
│   ├── docs.ts                   # Configuration OpenAPI 3.1 et interface Swagger UI (/docs)
│   ├── auth/                     # Authentification et règles d'autorisation
│   │   ├── middleware.ts         # Vérification du JWT et injection de l'acteur dans le contexte
│   │   ├── password.ts           # Hachage Argon2 et protection timing-safe (burnPasswordCheck)
│   │   ├── policy.ts             # Politique d'autorisation pure (Can.*) partagée REST/GraphQL
│   │   └── routes.ts             # Endpoints /auth/register, /auth/login et /auth/me
│   ├── common/                   # Utilitaires transverses
│   │   ├── error-schema.ts       # Schémas OpenAPI des réponses d'erreur
│   │   ├── errors.ts             # Gestionnaire centralisé et format d'erreur unique (AppError)
│   │   └── router.ts             # Fabrique de routeurs OpenAPI typés
│   ├── graphql/                  # API GraphQL (/graphql)
│   │   ├── context.ts            # Extraction JWT et instanciation des DataLoaders par requête
│   │   ├── depth.ts              # Garde-fou limitant la profondeur des requêtes GraphQL (max 6)
│   │   ├── loaders.ts            # DataLoaders (auteur, photos, questions) contre le problème N+1
│   │   ├── resolvers.ts          # Queries et Mutations avec autorisation resolver par resolver
│   │   ├── schema.ts             # Types, enums, inputs et payloads avec erreurs de validation
│   │   └── server.ts             # Configuration du serveur GraphQL Yoga
│   ├── lib/                      # Bibliothèques techniques
│   │   ├── db.ts                     # Client Prisma 7 connecté à PostgreSQL
│   │   └── jwt.ts                    # Signature et vérification des jetons JWT (HS256)
│   ├── middlewares/              # Middlewares HTTP
│   │   ├── cache.ts              # Politique Cache-Control (public/private/no-store) et ETag/304
│   │   └── rate-limit.ts         # Limitation de débit (429 RATE_LIMITED) sur /auth/login
│   ├── modules/                  # Domaines métier REST
│   │   ├── annonces/             # CRUD, publication (PATCH), pagination et filtres des annonces
│   │   │   ├── annonces.controller.ts
│   │   │   ├── annonces.schema.ts
│   │   │   └── annonces.service.ts
│   │   └── questions/            # Questions des utilisateurs et réponses des agents propriétaires
│   │       └── questions.controller.ts
│   └── schemas/                  # Schémas de validation Zod
│       └── auth.ts               # Validation des corps de requête et réponses d'authentification
├── tests/
│   ├── setup.ts                  # Garde vérifiant la présence de DATABASE_URL_TEST
│   ├── unit/                     # Tests unitaires (policy.ts et schémas Zod)
│   └── e2e/                      # Tests E2E via le SDK (Auth, CRUD, Questions, Anti-IDOR)
├── docker-compose.yml            # Conteneurs PostgreSQL (développement et test)
├── openapi.yaml                  # Spécification OpenAPI 3.1 générée
├── SECURITY.md                   # Audit de sécurité OWASP API Top 10
└── README.md                     # Documentation du projet
```