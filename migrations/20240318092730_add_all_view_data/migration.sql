/*
  Warnings:

  - You are about to drop the column `typeSelected` on the `AddTransactionView` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AddTransactionView" (
    "isAddingTransaction" BOOLEAN NOT NULL DEFAULT false,
    "amount" REAL NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'Expense',
    "categoriesId" INTEGER
);
DROP TABLE "AddTransactionView";
ALTER TABLE "new_AddTransactionView" RENAME TO "AddTransactionView";
CREATE UNIQUE INDEX "AddTransactionView_type_key" ON "AddTransactionView"("type");
CREATE TABLE "new_Categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "Categories_type_fkey" FOREIGN KEY ("type") REFERENCES "AddTransactionView" ("type") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Categories" ("id", "name", "type") SELECT "id", "name", "type" FROM "Categories";
DROP TABLE "Categories";
ALTER TABLE "new_Categories" RENAME TO "Categories";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- AddData
INSERT INTO AddTransactionView (isAddingTransaction, amount, description, type, categoriesId) VALUES (false, 0.0, "", "Expense", null)