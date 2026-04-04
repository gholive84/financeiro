ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id INT NULL,
  ADD CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;
