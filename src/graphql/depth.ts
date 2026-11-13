// src/graphql/depth.ts
// RÔLE : règle de validation GraphQL qui limite la profondeur des requêtes.
// Sans elle, un client malveillant peut imbriquer des relations à l'infini
// et saturer le serveur (déni de service). Rejet AVANT toute exécution.

import {
  GraphQLError,
  Kind,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type ValidationRule,
} from "graphql";

export function depthLimit(max: number): ValidationRule {
  return (context) => ({
    Document(doc) {
      // Les fragments (...F) peuvent cacher de la profondeur : on les indexe.
      const fragments = new Map<string, FragmentDefinitionNode>();
      for (const d of doc.definitions) {
        if (d.kind === Kind.FRAGMENT_DEFINITION) fragments.set(d.name.value, d);
      }

      // Calcule récursivement la profondeur maximale d'une sélection.
      // `seen` évite une boucle infinie si des fragments se référencent entre eux.
      const measure = (
        ss: SelectionSetNode,
        depth: number,
        seen: Set<string>,
      ): number => {
        let deepest = depth;
        for (const sel of ss.selections) {
          if (sel.kind === Kind.FIELD) {
            if (sel.name.value.startsWith("__")) continue; // introspection ignorée
            const d = sel.selectionSet
              ? measure(sel.selectionSet, depth + 1, seen)
              : depth + 1;
            deepest = Math.max(deepest, d);
          } else if (sel.kind === Kind.INLINE_FRAGMENT) {
            deepest = Math.max(deepest, measure(sel.selectionSet, depth, seen));
          } else {
            const name = sel.name.value;
            const frag = fragments.get(name);
            if (frag && !seen.has(name)) {
              deepest = Math.max(
                deepest,
                measure(frag.selectionSet, depth, new Set(seen).add(name)),
              );
            }
          }
        }
        return deepest;
      };

      for (const d of doc.definitions) {
        if (d.kind !== Kind.OPERATION_DEFINITION) continue;
        const depth = measure(d.selectionSet, 0, new Set());
        if (depth > max) {
          context.reportError(
            new GraphQLError(`Requête trop profonde (${depth} > ${max}).`, {
              nodes: [d],
            }),
          );
        }
      }
    },
  });
}
