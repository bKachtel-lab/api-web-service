-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "BienType" AS ENUM ('VENTE', 'LOCATION');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('BROUILLON', 'PUBLIEE');

-- CreateEnum
CREATE TYPE "BienStatus" AS ENUM ('DISPONIBLE', 'LOUE', 'VENDU');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annonce" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "BienType" NOT NULL,
    "statusPublication" "PublicationStatus" NOT NULL DEFAULT 'BROUILLON',
    "statusBien" "BienStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "prix" DOUBLE PRECISION NOT NULL,
    "dateDisponibilite" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,

    CONSTRAINT "annonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "annonceId" TEXT NOT NULL,

    CONSTRAINT "photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "reponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "annonceId" TEXT NOT NULL,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favori" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "annonceId" TEXT NOT NULL,

    CONSTRAINT "favori_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "annonce_statusPublication_createdAt_idx" ON "annonce"("statusPublication", "createdAt");

-- CreateIndex
CREATE INDEX "annonce_agentId_idx" ON "annonce"("agentId");

-- CreateIndex
CREATE INDEX "photo_annonceId_idx" ON "photo"("annonceId");

-- CreateIndex
CREATE INDEX "question_annonceId_idx" ON "question"("annonceId");

-- CreateIndex
CREATE UNIQUE INDEX "favori_userId_annonceId_key" ON "favori"("userId", "annonceId");

-- AddForeignKey
ALTER TABLE "annonce" ADD CONSTRAINT "annonce_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo" ADD CONSTRAINT "photo_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "annonce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "annonce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favori" ADD CONSTRAINT "favori_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favori" ADD CONSTRAINT "favori_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "annonce"("id") ON DELETE CASCADE ON UPDATE CASCADE;
