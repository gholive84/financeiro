const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function seed() {
  const config = { user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME };
  if (process.env.DB_SOCKET) config.socketPath = process.env.DB_SOCKET;
  else { config.host = process.env.DB_HOST; config.port = process.env.DB_PORT; }

  const conn = await mysql.createConnection(config);

  const hash = await bcrypt.hash('c@rloS1330', 10);
  await conn.query(
    `INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    ['gholive', hash, 'Gustavo', 'admin']
  );

  console.log('Usuário admin criado: gholive');
  await conn.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
