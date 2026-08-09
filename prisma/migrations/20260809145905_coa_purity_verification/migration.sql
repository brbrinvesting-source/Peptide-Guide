-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Coa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "lotId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "testingDate" DATETIME,
    "laboratory" TEXT,
    "coaNumber" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "purityVerified" BOOLEAN NOT NULL DEFAULT false,
    "purityPercent" REAL,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Coa_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Coa_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Coa_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Coa" ("active", "coaNumber", "createdAt", "fileSizeBytes", "id", "isCurrent", "laboratory", "lotId", "mimeType", "originalFilename", "productId", "storageKey", "testingDate", "updatedAt", "uploadedById") SELECT "active", "coaNumber", "createdAt", "fileSizeBytes", "id", "isCurrent", "laboratory", "lotId", "mimeType", "originalFilename", "productId", "storageKey", "testingDate", "updatedAt", "uploadedById" FROM "Coa";
DROP TABLE "Coa";
ALTER TABLE "new_Coa" RENAME TO "Coa";
CREATE INDEX "Coa_productId_isCurrent_active_idx" ON "Coa"("productId", "isCurrent", "active");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
