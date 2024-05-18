INSERT INTO Categories (name, type) VALUES ('Utilities', 'Expense');
INSERT INTO Categories (name, type) VALUES ('Electronics', 'Expense');
INSERT INTO Categories (name, type) VALUES ('Dining Out', 'Expense');
INSERT INTO Categories (name, type) VALUES ('Breakfast Supplies', 'Expense');
INSERT INTO Categories (name, type) VALUES ('Household Items', 'Expense');
INSERT INTO Categories (name, type) VALUES ('Christmas Gifts', 'Expense');
INSERT INTO Categories (name, type) VALUES ('New Year Party Supplies', 'Expense');
INSERT INTO Categories (name, type) VALUES ('Thanksgiving Groceries', 'Expense');
INSERT INTO Categories (name, type) VALUES ('Bonus', 'Income');
INSERT INTO Categories (name, type) VALUES ('Consulting Work', 'Income');
INSERT INTO Categories (name, type) VALUES ('Part-time Job', 'Income');
INSERT INTO Categories (name, type) VALUES ('Online Sales', 'Income');
INSERT INTO Categories (name, type) VALUES ('Freelance Writing', 'Income');
INSERT INTO Categories (name, type) VALUES ('End of Year Bonus', 'Income');
INSERT INTO Categories (name, type) VALUES ('Thanksgiving Freelance', 'Income');

-- Expenses
-- February 2024
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (1, 100.50, 1709814000, 'Weekly groceries', 'Expense');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (1, 75.25, 1709900400, 'More groceries', 'Expense');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (2, 1200, 1707740400, 'Monthly rent', 'Expense');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (1, 45.99, 1710082800, 'Snacks and drinks', 'Expense');

-- January 2024
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (1, 60.00, 1707154800, 'Breakfast supplies', 'Expense');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (1, 110.75, 1707241200, 'Household items', 'Expense');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (2, 50.25, 1707327600, 'Utilities bill', 'Expense');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (1, 200.50, 1707414000, 'Electronics', 'Expense');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (1, 15.99, 1707500400, 'Dining out', 'Expense');

-- December 2023
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (1, 90.00, 1704562800, 'Christmas Gifts', 'Expense');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (1, 120.75, 1704649200, 'New Year Party Supplies', 'Expense');

-- November 2023
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (1, 85.50, 1701970800, 'Thanksgiving Groceries', 'Expense');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (2, 900, 1702057200, 'Rent November', 'Expense');


-- Income
-- February 2024
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (3, 3000, 1709914800, 'Monthly salary', 'Income');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (4, 500, 1710001200, 'Freelance project', 'Income');

-- January 2024
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (3, 3200, 1707266800, 'Bonus', 'Income');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (4, 450, 1707353200, 'Consulting work', 'Income');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (3, 2800, 1707439600, 'Part-time job', 'Income');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (4, 600, 1707526000, 'Online sales', 'Income');
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (3, 1500, 1707612400, 'Freelance writing', 'Income');

-- December 2023
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (3, 3100, 1704675600, 'End of Year Bonus', 'Income');

-- November 2023
INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (4, 700, 1702083600, 'Thanksgiving Freelance', 'Income');
