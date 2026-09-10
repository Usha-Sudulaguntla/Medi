// Bootstraps (or promotes) an admin account, since self-registration only
// ever creates role='user' accounts and ManageDoctors requires an admin.
//
// Usage:
//   npm run create-admin -- admin@example.com "a-strong-password"
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, query } from '../db/pool.js';

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: npm run create-admin -- <email> <password>');
  process.exit(1);
}
if (password.length < 6) {
  console.error('Password must be at least 6 characters');
  process.exit(1);
}

const password_hash = await bcrypt.hash(password, 10);
const existing = await query('SELECT id FROM users WHERE email = $1', [email]);

if (existing.rows.length) {
  await query('UPDATE users SET password_hash = $1, role = $2, email_verified = true WHERE email = $3', [password_hash, 'admin', email]);
  console.log(`Existing user ${email} promoted to admin.`);
} else {
  await query(
    'INSERT INTO users (email, password_hash, role, email_verified) VALUES ($1, $2, $3, true)',
    [email, password_hash, 'admin']
  );
  console.log(`Admin account created: ${email}`);
}

await pool.end();
