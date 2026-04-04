CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#6366F1',
  type ENUM('income', 'expense') NOT NULL
);

INSERT IGNORE INTO categories (name, icon, color, type) VALUES
('Salário', 'briefcase', '#10B981', 'income'),
('Freelance', 'laptop', '#6366F1', 'income'),
('Investimentos', 'trending-up', '#F59E0B', 'income'),
('Outros (receita)', 'plus-circle', '#8B5CF6', 'income'),
('Alimentação', 'utensils', '#F59E0B', 'expense'),
('Transporte', 'car', '#3B82F6', 'expense'),
('Moradia', 'home', '#EF4444', 'expense'),
('Saúde', 'heart', '#EC4899', 'expense'),
('Educação', 'book', '#8B5CF6', 'expense'),
('Lazer', 'gamepad-2', '#14B8A6', 'expense'),
('Vestuário', 'shirt', '#F97316', 'expense'),
('Supermercado', 'shopping-cart', '#22C55E', 'expense'),
('Assinaturas', 'credit-card', '#6366F1', 'expense'),
('Outros (despesa)', 'more-horizontal', '#64748B', 'expense');
