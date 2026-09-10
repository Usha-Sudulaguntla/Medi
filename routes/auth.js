import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail } from '../lib/email.js';
import { createOtpForUser, verifyOtpForUser, createPasswordResetToken, consumePasswordResetToken } from '../lib/otp.js';

export const authRouter = Router();

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ---------------------------------------------------------------------------
// POST /api/auth/register  { email, password }
// Creates an unverified account and emails a 6-digit OTP. No token is issued
// yet — the frontend follows up with /verify-otp. Re-registering an
// unverified email just re-sends a fresh code (so an abandoned signup isn't
// a dead end); a verified email returns 409.
// ---------------------------------------------------------------------------
authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = await query('SELECT * FROM users WHERE email = $1', [email]);
    let user = existing.rows[0];

    if (user && user.email_verified) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    if (user) {
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, user.id]);
    } else {
      const result = await query(
        'INSERT INTO users (email, password_hash, role, email_verified) VALUES ($1, $2, $3, false) RETURNING *',
        [email, password_hash, 'user']
      );
      user = result.rows[0];
    }

    const code = await createOtpForUser(user.id);
    await sendEmail({ to: email, subject: 'Your MediKiosk verification code', text: `Your verification code is ${code}. It expires in 10 minutes.` });

    res.json({ message: 'otp_sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/verify-otp  { email, otpCode }
authRouter.post('/verify-otp', async (req, res) => {
  const { email, otpCode } = req.body || {};
  if (!email || !otpCode) return res.status(400).json({ error: 'email and otpCode are required' });

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) return res.status(400).json({ error: 'Invalid code' });

  const ok = await verifyOtpForUser(user.id, otpCode);
  if (!ok) return res.status(400).json({ error: 'Invalid or expired code' });

  await query('UPDATE users SET email_verified = true WHERE id = $1', [user.id]);
  res.json({ access_token: signToken(user) });
});

// POST /api/auth/resend-otp  { email }
authRouter.post('/resend-otp', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  const { rows } = await query('SELECT * FROM users WHERE email = $1 AND email_verified = false', [email]);
  const user = rows[0];
  if (user) {
    const code = await createOtpForUser(user.id);
    await sendEmail({ to: email, subject: 'Your MediKiosk verification code', text: `Your verification code is ${code}. It expires in 10 minutes.` });
  }
  res.json({ message: 'ok' }); // always ok — don't reveal whether the email exists
});

// POST /api/auth/login  { email, password }
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.email_verified) return res.status(401).json({ error: 'Please verify your email first' });

  res.json({ token: signToken(user), user: { id: user.id, email: user.email, role: user.role } });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req, res) => {
  const result = await query('SELECT id, email, role FROM users WHERE id = $1', [req.user.id]);
  if (!result.rows.length) return res.status(401).json({ error: 'Unauthorized' });
  res.json(result.rows[0]);
});

// ---------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------
authRouter.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (email) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (user) {
      const token = await createPasswordResetToken(user.id);
      const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
      await sendEmail({ to: email, subject: 'Reset your MediKiosk password', text: `Reset your password: ${link}\n\nThis link expires in 1 hour.` });
    }
  }
  res.json({ message: 'ok' }); // always ok — don't reveal whether the email exists
});

authRouter.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body || {};
  if (!resetToken || !newPassword) return res.status(400).json({ error: 'resetToken and newPassword are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const userId = await consumePasswordResetToken(resetToken);
  if (!userId) return res.status(400).json({ error: 'This reset link is invalid or has expired' });

  const password_hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1, email_verified = true WHERE id = $2', [password_hash, userId]);
  res.json({ message: 'ok' });
});

// ---------------------------------------------------------------------------
// Google OAuth (Authorization Code flow, plain fetch — no extra SDK)
// GET /api/auth/google?returnTo=/kiosk  -> redirects to Google
// GET /api/auth/google/callback         -> exchanges code, issues JWT,
//                                          redirects to FRONTEND_URL+returnTo?token=...
// ---------------------------------------------------------------------------
authRouter.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).send('Google sign-in is not configured on this server (GOOGLE_CLIENT_ID missing).');
  }
  const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state: returnTo,
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

authRouter.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const returnTo = typeof state === 'string' && state.startsWith('/') ? state : '/';
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    if (!code) throw new Error('Missing authorization code');

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResp.ok) throw new Error('Google token exchange failed');
    const { access_token } = await tokenResp.json();

    const profileResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!profileResp.ok) throw new Error('Could not fetch Google profile');
    const profile = await profileResp.json(); // { sub, email, email_verified, name, ... }

    let { rows } = await query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [profile.sub, profile.email]);
    let user = rows[0];
    if (!user) {
      const inserted = await query(
        'INSERT INTO users (email, role, email_verified, google_id) VALUES ($1, $2, true, $3) RETURNING *',
        [profile.email, 'user', profile.sub]
      );
      user = inserted.rows[0];
    } else if (!user.google_id) {
      await query('UPDATE users SET google_id = $1, email_verified = true WHERE id = $2', [profile.sub, user.id]);
    }

    const jwtToken = signToken(user);
    const dest = new URL(returnTo, frontend);
    dest.searchParams.set('token', jwtToken);
    res.redirect(dest.toString());
  } catch (error) {
    const dest = new URL('/login', frontend);
    dest.searchParams.set('error', 'google_auth_failed');
    res.redirect(dest.toString());
  }
});
