-- CreateEnum
CREATE TYPE "HotelType" AS ENUM ('HOTEL', 'RESORT', 'VILLA', 'HOMESTAY', 'BACKPACKER');

-- CreateEnum
CREATE TYPE "HotelBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL,
    "gallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "starRating" INTEGER NOT NULL DEFAULT 3,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "popularityScore" INTEGER NOT NULL DEFAULT 0,
    "priceFrom" INTEGER NOT NULL,
    "hotelType" "HotelType" NOT NULL DEFAULT 'HOTEL',
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "distanceFromAttraction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "checkIn" TEXT NOT NULL DEFAULT '2:00 PM',
    "checkOut" TEXT NOT NULL DEFAULT '11:00 AM',
    "cancellationPolicy" TEXT NOT NULL,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "familyFriendly" BOOLEAN NOT NULL DEFAULT false,
    "coupleFriendly" BOOLEAN NOT NULL DEFAULT false,
    "freeBreakfast" BOOLEAN NOT NULL DEFAULT false,
    "freeWiFi" BOOLEAN NOT NULL DEFAULT true,
    "swimmingPool" BOOLEAN NOT NULL DEFAULT false,
    "parking" BOOLEAN NOT NULL DEFAULT false,
    "airConditioning" BOOLEAN NOT NULL DEFAULT false,
    "nearbyAttractions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nearbyRestaurants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nearbyTransport" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destinationId" TEXT NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePerNight" INTEGER NOT NULL,
    "maxGuests" INTEGER NOT NULL DEFAULT 2,
    "bedType" TEXT NOT NULL DEFAULT 'King',
    "totalRooms" INTEGER NOT NULL DEFAULT 5,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hotelId" TEXT NOT NULL,

    CONSTRAINT "hotel_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_bookings" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "guests" INTEGER NOT NULL,
    "rooms" INTEGER NOT NULL DEFAULT 1,
    "nights" INTEGER NOT NULL,
    "pricePerNight" INTEGER NOT NULL,
    "taxes" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "specialRequests" TEXT,
    "status" "HotelBookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "orderId" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "hotel_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_reviews" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stayDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,

    CONSTRAINT "hotel_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotels_slug_key" ON "hotels"("slug");

-- CreateIndex
CREATE INDEX "hotels_destinationId_idx" ON "hotels"("destinationId");

-- CreateIndex
CREATE INDEX "hotels_hotelType_idx" ON "hotels"("hotelType");

-- CreateIndex
CREATE INDEX "hotels_isActive_idx" ON "hotels"("isActive");

-- CreateIndex
CREATE INDEX "hotel_rooms_hotelId_idx" ON "hotel_rooms"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_rooms_hotelId_name_key" ON "hotel_rooms"("hotelId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_bookings_bookingId_key" ON "hotel_bookings"("bookingId");

-- CreateIndex
CREATE INDEX "hotel_bookings_userId_idx" ON "hotel_bookings"("userId");

-- CreateIndex
CREATE INDEX "hotel_bookings_hotelId_idx" ON "hotel_bookings"("hotelId");

-- CreateIndex
CREATE INDEX "hotel_bookings_status_idx" ON "hotel_bookings"("status");

-- CreateIndex
CREATE INDEX "hotel_bookings_checkIn_idx" ON "hotel_bookings"("checkIn");

-- CreateIndex
CREATE INDEX "hotel_reviews_hotelId_idx" ON "hotel_reviews"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_reviews_userId_hotelId_key" ON "hotel_reviews"("userId", "hotelId");

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_rooms" ADD CONSTRAINT "hotel_rooms_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "hotel_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
