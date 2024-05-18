-- CreateTable
CREATE TABLE "Categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER,
    "amount" REAL NOT NULL,
    "date" INTEGER NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    CONSTRAINT "Transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
