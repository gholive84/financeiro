CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  amount_planned DECIMAL(15,2) NOT NULL,
  UNIQUE KEY unique_budget (category_id, month, year),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
