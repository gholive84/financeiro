ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expense_nature ENUM('fixed', 'variable') DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fixed_group_id VARCHAR(36) DEFAULT NULL;
