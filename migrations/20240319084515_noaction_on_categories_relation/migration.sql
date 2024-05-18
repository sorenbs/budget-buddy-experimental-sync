-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "Categories_type_fkey" FOREIGN KEY ("type") REFERENCES "AddTransactionView" ("type") ON DELETE RESTRICT ON UPDATE NO ACTION
);
INSERT INTO "new_Categories" ("id", "name", "type") SELECT "id", "name", "type" FROM "Categories";
DROP TABLE "Categories";
ALTER TABLE "new_Categories" RENAME TO "Categories";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
