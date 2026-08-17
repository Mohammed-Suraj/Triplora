-- CreateEnum
CREATE TYPE "ExperienceCategory" AS ENUM ('ADVENTURE', 'CULTURE', 'WILDLIFE', 'FOOD', 'WELLNESS', 'NATURE', 'WATER_ACTIVITIES');

-- CreateEnum
CREATE TYPE "ExperienceDifficulty" AS ENUM ('EASY', 'MODERATE', 'CHALLENGING');

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL DEFAULT '',
    "category" "ExperienceCategory" NOT NULL DEFAULT 'NATURE',
    "duration" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "difficulty" "ExperienceDifficulty" NOT NULL DEFAULT 'EASY',
    "bestSeason" TEXT NOT NULL,
    "suitableFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingNote" TEXT NOT NULL DEFAULT 'Sample rating',
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT NOT NULL,
    "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "experiences_slug_key" ON "experiences"("slug");

-- CreateIndex
CREATE INDEX "experiences_category_idx" ON "experiences"("category");

-- CreateIndex
CREATE INDEX "experiences_city_idx" ON "experiences"("city");

-- CreateIndex
CREATE INDEX "experiences_isActive_idx" ON "experiences"("isActive");
