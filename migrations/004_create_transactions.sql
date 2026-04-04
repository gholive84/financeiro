CREATE TABLE IF NOT EXISTS recurring_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  day_of_month INT NOT NULL,
  account_id INT,
  credit_card_id INT NULL,
  category_id INT,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  account_id INT,
  credit_card_id INT NULL,
  category_id INT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_template_id INT NULL,
  status ENUM('paid', 'pending') DEFAULT 'paid',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
