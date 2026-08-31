/*
  Warnings:

  - You are about to drop the column `masterCheck` on the `User` table. All the data in the column will be lost.
  - Added the required column `recoveryKey` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "wrappedDataKey" TEXT NOT NULL,
    "recoveryKey" TEXT NOT NULL,
    "masterSalt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "masterSalt", "passwordHash", "updatedAt", "wrappedDataKey") SELECT "createdAt", "email", "id", "masterSalt", "passwordHash", "updatedAt", "wrappedDataKey" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
