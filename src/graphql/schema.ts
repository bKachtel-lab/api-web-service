// src/graphql/schema.ts
// RÔLE : contrat de l'API GraphQL (schema-first, en SDL).
// Choix de conception :
//  - User n'expose que id et name : jamais passwordHash ni email.
//  - Erreurs de VALIDATION  -> dans le type de retour (payload.errors), HTTP 200.
//  - Erreurs d'AUTH/ACCÈS   -> dans le tableau "errors" standard GraphQL (extensions.code).

export const typeDefs = /* GraphQL */ `
  enum Role {
    USER
    AGENT
    ADMIN
  }
  input UpdateAnnonceInput {
    titre: String
    description: String
    ville: String
    type: BienType
    prix: Float
    dateDisponibilite: String
    photos: [PhotoInput!]
    statusPublication: PublicationStatus
    statusBien: BienStatus
  }

  type DeleteAnnoncePayload {
    deletedId: ID
    errors: [FieldError!]!
  }

  enum BienType {
    VENTE
    LOCATION
  }
  enum PublicationStatus {
    BROUILLON
    PUBLIEE
  }
  enum BienStatus {
    DISPONIBLE
    LOUE
    VENDU
  }

  type User {
    id: ID!
    name: String!
  }

  type Photo {
    id: ID!
    url: String!
    alt: String
  }

  type Question {
    id: ID!
    contenu: String!
    reponse: String
    createdAt: String!
    annonceId: ID!
    user: User!
  }

  type Annonce {
    id: ID!
    titre: String!
    description: String!
    ville: String!
    type: BienType!
    statusPublication: PublicationStatus!
    statusBien: BienStatus!
    prix: Float!
    dateDisponibilite: String!
    createdAt: String!
    agent: User!
    photos: [Photo!]!
    questions: [Question!]!
  }

  # Pagination : même forme que le REST (items + meta).
  type PageMeta {
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
  }

  type AnnoncePage {
    items: [Annonce!]!
    meta: PageMeta!
  }

  # Erreur de validation rattachée à un champ.
  type FieldError {
    field: String!
    message: String!
  }

  # Payloads : l'objet créé OU la liste d'erreurs de validation.
  type AnnoncePayload {
    annonce: Annonce
    errors: [FieldError!]!
  }

  type QuestionPayload {
    question: Question
    errors: [FieldError!]!
  }

  input PhotoInput {
    url: String!
    alt: String
  }

  input CreateAnnonceInput {
    titre: String!
    description: String!
    ville: String!
    type: BienType!
    prix: Float!
    dateDisponibilite: String!
    photos: [PhotoInput!]
    statusPublication: PublicationStatus
    statusBien: BienStatus
  }

  type Query {
    annonces(
      page: Int = 1
      limit: Int = 10
      ville: String
      type: BienType
      prixMax: Float
    ): AnnoncePage!
    annonce(id: ID!): Annonce
  }

  type Mutation {
    createAnnonce(input: CreateAnnonceInput!): AnnoncePayload!
    updateAnnonce(id: ID!, input: UpdateAnnonceInput!): AnnoncePayload!
    deleteAnnonce(id: ID!): DeleteAnnoncePayload!
    setAnnoncePublication(id: ID!, publiee: Boolean!): AnnoncePayload!
    askQuestion(annonceId: ID!, contenu: String!): QuestionPayload!
    respondToQuestion(questionId: ID!, reponse: String!): QuestionPayload!
  }
`;
