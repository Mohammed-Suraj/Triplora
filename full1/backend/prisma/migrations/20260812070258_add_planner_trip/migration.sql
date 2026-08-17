-- CreateTable
CREATE TABLE "planner_trips" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "days" JSONB NOT NULL DEFAULT '[]',
    "packing" JSONB NOT NULL DEFAULT '[]',
    "shareCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "planner_trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planner_trips_shareCode_key" ON "planner_trips"("shareCode");

-- CreateIndex
CREATE INDEX "planner_trips_userId_idx" ON "planner_trips"("userId");

-- AddForeignKey
ALTER TABLE "planner_trips" ADD CONSTRAINT "planner_trips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
