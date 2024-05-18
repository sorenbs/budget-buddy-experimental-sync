-- CreateTable
CREATE TABLE "AddTransactionView" (
    "typeSelected" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AddTransactionView_typeSelected_key" ON "AddTransactionView"("typeSelected");

-- InsertData
INSERT INTO AddTransactionView VALUES ("Expense")