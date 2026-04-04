ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS installment_total INT NULL,
  ADD COLUMN IF NOT EXISTS installment_current INT NULL,
  ADD COLUMN IF NOT EXISTS installment_group_id VARCHAR(36) NULL;
