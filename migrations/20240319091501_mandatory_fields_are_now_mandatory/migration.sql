/*
  Warnings:

  - Made the column `category_id` on table `Transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "date" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    CONSTRAINT "Transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_Transactions" ("amount", "category_id", "date", "description", "id", "type") SELECT "amount", "category_id", "date", coalesce("description", '') AS "description", "id", "type" FROM "Transactions";
DROP TABLE "Transactions";
ALTER TABLE "new_Transactions" RENAME TO "Transactions";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
