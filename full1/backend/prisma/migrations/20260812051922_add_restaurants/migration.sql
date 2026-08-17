-- CreateEnum
CREATE TYPE "RestaurantCategory" AS ENUM ('KERALA', 'SEAFOOD', 'VEGETARIAN', 'CAFE', 'FINE_DINING', 'BAKERY', 'FAST_FOOD');

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL DEFAULT '',
    "category" "RestaurantCategory" NOT NULL DEFAULT 'KERALA',
    "cuisines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceRange" TEXT NOT NULL,
    "priceLevel" INTEGER NOT NULL DEFAULT 2,
    "openingHours" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googleMapsUrl" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingNote" TEXT NOT NULL DEFAULT 'Sample rating',
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "bestFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image" TEXT NOT NULL,
    "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE INDEX "restaurants_category_idx" ON "restaurants"("category");

-- CreateIndex
CREATE INDEX "restaurants_city_idx" ON "restaurants"("city");

-- CreateIndex
CREATE INDEX "restaurants_isActive_idx" ON "restaurants"("isActive");
