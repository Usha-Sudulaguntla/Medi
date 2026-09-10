import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export function generateOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function createOtpForUser(userId) {
  const code = generateOtpCode();
  const code_hash = await bcrypt.hash(code, 10);
  const expires_at = new Date(Date.now() + OTP_TTL_MS);
  await query('DELETE FROM otp_codes WHERE user_id = $1', [userId]); // one active code at a time
  await query('INSERT INTO otp_codes (user_id, code_hash, expires_at) VALUES ($1, $2, $3)', [userId, code_hash, expires_at]);
  return code;
}

export async function verifyOtpForUser(userId, code) {
  const { rows } = await query('SELECT * FROM otp_codes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
  const row = rows[0];
  if (!row) return false;
  if (new Date(row.expires_at) < new Date()) return false;
  const ok = await bcrypt.compare(code, row.code_hash);
  if (ok) await query('DELETE FROM otp_codes WHERE id = $1', [row.id]);
  return ok;
}

export async function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const token_hash = await bcrypt.hash(token, 10);
  const expires_at = new Date(Date.now() + RESET_TTL_MS);
  await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  await query('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, token_hash, expires_at]);
  return token;
}

/** Returns the matching user_id if the token is valid, else null. Consumes the token (single-use). */
export async function consumePasswordResetToken(token) {
  const { rows } = await query('SELECT * FROM password_reset_tokens WHERE expires_at > now()');
  for (const row of rows) {
    if (await bcrypt.compare(token, row.token_hash)) {
      await query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]);
      return row.user_id;
    }
  }
  return null;
}
