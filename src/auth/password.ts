// src/auth/password.ts
import * as argon2 from "argon2";

/** Hache un mot de passe (argon2id). Le sel est généré et inclus dans le hash. */
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

/** Compare un mot de passe à un hash stocké. Renvoie false si le hash est invalide. */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/**
 * Anti-énumération de comptes : si l'email n'existe pas, on fait quand même
 * un calcul argon2 de coût comparable. Sans cela, "email inconnu" répond
 * beaucoup plus vite que "mauvais mot de passe" et révèle quels comptes existent.
 */
export async function burnPasswordCheck(plain: string): Promise<void> {
  await argon2.hash(plain, { type: argon2.argon2id });
}