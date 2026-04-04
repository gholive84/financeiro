CREATE TABLE IF NOT EXISTS savings_boxes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#10B981',
  target_amount DECIMAL(15,2),
  current_amount DECIMAL(15,2) DEFAULT 0,
  deadline DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  savings_box_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description VARCHAR(255),
  date DATE NOT NULL,
  type ENUM('deposit', 'withdraw') NOT NULL,
  FOREIGN KEY (savings_box_id) REFERENCES savings_boxes(id) ON DELETE CASCADE
);
