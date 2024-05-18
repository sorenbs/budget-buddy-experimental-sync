-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER,
    "amount" REAL NOT NULL,
    "date" INTEGER NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    CONSTRAINT "Transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "Transactions_type_fkey" FOREIGN KEY ("type") REFERENCES "AddTransactionView" ("typeSelected") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transactions" ("amount", "category_id", "date", "description", "id", "type") SELECT "amount", "category_id", "date", "description", "id", "type" FROM "Transactions";
DROP TABLE "Transactions";
ALTER TABLE "new_Transactions" RENAME TO "Transactions";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
