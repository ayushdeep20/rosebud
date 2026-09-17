/*
  Warnings:

  - A unique constraint covering the columns `[admissionNumber]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `admissionNumber` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "aadhaarEncrypted" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "admissionNumber" TEXT NOT NULL,
ADD COLUMN     "apaarId" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "busFacility" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "busNo" TEXT,
ADD COLUMN     "busPoint" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "fathersOccupation" TEXT,
ADD COLUMN     "fathersQualification" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "hostelFacility" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "penNo" TEXT,
ADD COLUMN     "previousSchool" TEXT,
ADD COLUMN     "regNo" TEXT,
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "IdCounter" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IdCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdCounter_key_key" ON "IdCounter"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");
