-- AlterTable
ALTER TABLE "StoredFile" ADD COLUMN "folder" TEXT;

-- CreateIndex
CREATE INDEX "StoredFile_userId_folder_idx" ON "StoredFile"("userId", "folder");
