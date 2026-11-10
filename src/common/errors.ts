// src/common/errors.ts
// Forme d'erreur UNIQUE pour toute l'API (exigence du sujet).
// Les routes LÈVENT un AppError ; un seul handler (app.onError) le
// convertit en JSON. Un client ne dépend ainsi que d'un `code` stable.

export type ErrorCode =
  | "VALIDATION_ERROR" // 400
  | "UNAUTHENTICATED"  // 401 : jeton absent/invalide/expiré
  | "FORBIDDEN"        // 403 : identifié mais interdit
  | "NOT_FOUND"        // 404
  | "CONFLICT"         // 409 : ex. email déjà pris
  | "RATE_LIMITED"     // 429 (étape 8)
  | "INTERNAL_ERROR";  // 500

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: FieldError[] };
}

const STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: FieldError[];

  constructor(code: ErrorCode, message: string, details?: FieldError[]) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }

  get status(): 400 | 401 | 403 | 404 | 409 | 429 | 500 {
    return STATUS[this.code];
  }

  toBody(): ErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export const Errors = {
  validation: (details: FieldError[]) =>
    new AppError("VALIDATION_ERROR", "Données invalides.", details),
  unauthenticated: (m = "Authentification requise.") =>
    new AppError("UNAUTHENTICATED", m),
  forbidden: (m = "Accès interdit.") => new AppError("FORBIDDEN", m),
  notFound: (m = "Ressource introuvable.") => new AppError("NOT_FOUND", m),
  conflict: (m: string) => new AppError("CONFLICT", m),
};