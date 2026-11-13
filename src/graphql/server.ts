// src/graphql/server.ts
// RÔLE : assemble le serveur GraphQL (graphql-yoga) à partir des briques précédentes.
//  - schéma + resolvers
//  - contexte par requête (acteur JWT + loaders)
//  - limite de profondeur à 6
//  - maskedErrors : une erreur inattendue (bug, base indisponible) devient
//    "Unexpected error." côté client, le détail reste dans les logs serveur.
//    Les GraphQLError que NOUS lançons (UNAUTHENTICATED, FORBIDDEN...) restent visibles.

import { createSchema, createYoga, type Plugin } from "graphql-yoga";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";
import { buildContext, type GraphQLContext } from "./context.js";
import { depthLimit } from "./depth.js";

const depthPlugin: Plugin = {
  onValidate({ addValidationRule }) {
    addValidationRule(depthLimit(6));
  },
};

export const yoga = createYoga({
  schema: createSchema<GraphQLContext>({ typeDefs, resolvers }),
  graphqlEndpoint: "/graphql",
  maskedErrors: true,
  landingPage: false,
  // L'interface GraphiQL sert au développement, désactivée en production.
  graphiql: process.env.NODE_ENV !== "production",
  context: ({ request }) => buildContext(request),
  plugins: [depthPlugin],
});
