/*
  Warnings:

  - Added the required column `ville` to the `annonce` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "annonce" ADD COLUMN     "ville" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "annonce_ville_idx" ON "annonce"("ville");
