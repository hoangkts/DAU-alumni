import crypto from 'crypto';
import type { Express, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from './db';

export const SESSION_COOKIE_NAME = 'alumni_ktd_session';
const OAUTH_STATE_COOKIE_NAME = 'alumni_ktd_oauth_state';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  adminRole?: 'admin1' | 'admin2';
  canConfirmBtc: boolean;
  authMode: 'password' | 'google';
}

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
      sessionTokenHash?: string;
    }
  }
}

interface DbUserRow {
  id: string;
  email: string;
  password_hash: string | null;
  google_sub: string | null;
  display_name: string;
  role: 'member' | 'admin1' | 'admin2';
  email_verified: boolean;
}

function scryptAsync(
  password: string,
  salt: string,
  keylen: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;

  try {
    const expected = Buffer.from(hashHex, 'hex');
    const derived = await scryptAsync(password, salt, expected.length);
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function shouldUseSecureCookie(req: Request): boolean {
  if (req.secure) return true;
  const appUrl = (process.env.APP_URL || '').trim();
  const host = (req.hostname || '').toLowerCase();
  const isLoopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  return !isLoopback && appUrl.startsWith('https://');
}

function getAppUrl(req: Request): string {
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return envUrl;
  }
  const host = req.get('host') || '127.0.0.1:3000';
  return `${req.protocol}://${host}`;
}

export function getGoogleClientId(): string | null {
  const id = (process.env.GOOGLE_CLIENT_ID || '').trim();
  return id || null;
}

export function isGoogleOAuthRedirectEnabled(): boolean {
  return Boolean(
    getGoogleClientId() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

export function isGoogleOAuthEnabled(): boolean {
  return Boolean(getGoogleClientId());
}

interface GoogleJwk extends crypto.JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
  kty: string;
}

let cachedGoogleJwks: { keys: GoogleJwk[]; expiresAt: number } | null = null;

async function fetchGoogleJwks(forceRefresh = false): Promise<GoogleJwk[]> {
  if (!forceRefresh && cachedGoogleJwks && cachedGoogleJwks.expiresAt > Date.now()) {
    return cachedGoogleJwks.keys;
  }

  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!res.ok) {
    throw new Error(`Failed to fetch Google JWKS: HTTP ${res.status}`);
  }
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const ttlMs = maxAgeMatch
    ? Math.max(60, Math.min(86400, Number(maxAgeMatch[1]))) * 1000
    : 3600 * 1000;

  const data = (await res.json()) as { keys?: GoogleJwk[] };
  const keys = Array.isArray(data.keys) ? data.keys : [];
  cachedGoogleJwks = { keys, expiresAt: Date.now() + ttlMs };
  return keys;
}

async function verifyGoogleIdToken(
  idToken: string,
  expectedClientId: string
): Promise<{ sub: string; email: string; name?: string }> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Google ID token');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  if (!headerB64 || !payloadB64 || !sigB64) {
    throw new Error('Empty Google ID token segment');
  }

  const header = JSON.parse(
    Buffer.from(headerB64, 'base64url').toString('utf8')
  ) as { alg?: string; kid?: string };

  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    throw new Error('Unsupported Google ID token header');
  }

  let keys = await fetchGoogleJwks(false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await fetchGoogleJwks(true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new Error('Matching Google signing key not found');
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const isSignatureValid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${headerB64}.${payloadB64}`, 'utf8'),
    publicKey,
    Buffer.from(sigB64, 'base64url')
  );
  if (!isSignatureValid) {
    throw new Error('Invalid Google ID token signature');
  }

  const payload = JSON.parse(
    Buffer.from(payloadB64, 'base64url').toString('utf8')
  ) as {
    iss?: string;
    aud?: string;
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    exp?: number;
  };

  if (
    payload.iss !== 'https://accounts.google.com' &&
    payload.iss !== 'accounts.google.com'
  ) {
    throw new Error('Invalid Google ID token issuer');
  }
  if (payload.aud !== expectedClientId) {
    throw new Error('Invalid Google ID token audience');
  }
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    throw new Error('Expired Google ID token');
  }
  if (
    payload.email_verified !== true ||
    typeof payload.email !== 'string' ||
    !payload.email.includes('@') ||
    typeof payload.sub !== 'string' ||
    !payload.sub
  ) {
    throw new Error('Unverified Google account email');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
  };
}

async function upsertGoogleUserAndCreateSession(
  req: Request,
  res: Response,
  profile: { sub: string; email: string; name?: string }
): Promise<AppUser> {
  const cleanEmail = profile.email.trim().toLowerCase();
  const displayName = (profile.name || cleanEmail.split('@')[0])
    .trim()
    .slice(0, 120);

  // Look up by google_sub OR verified email; never overwrite existing admin role
  const existing = await pool.query<DbUserRow>(
    `SELECT id, email, password_hash, google_sub, display_name, role, email_verified
     FROM users
     WHERE google_sub = $1 OR LOWER(email) = LOWER($2)
     LIMIT 1`,
    [profile.sub, cleanEmail]
  );

  let userRow: DbUserRow;
  if (existing.rows.length > 0) {
    const existingRow = existing.rows[0];
    const updated = await pool.query<DbUserRow>(
      `UPDATE users
       SET google_sub = COALESCE(google_sub, $1),
           email_verified = TRUE,
           display_name = CASE WHEN display_name = '' THEN $2 ELSE display_name END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, password_hash, google_sub, display_name, role, email_verified`,
      [profile.sub, displayName, existingRow.id]
    );
    userRow = updated.rows[0] || existingRow;
  } else {
    const userId = crypto.randomUUID();
    const inserted = await pool.query<DbUserRow>(
      `INSERT INTO users (id, email, google_sub, display_name, role, email_verified)
       VALUES ($1, $2, $3, $4, 'member', TRUE)
       RETURNING id, email, password_hash, google_sub, display_name, role, email_verified`,
      [userId, cleanEmail, profile.sub, displayName]
    );
    userRow = inserted.rows[0];
  }

  await createSessionAndSetCookie(req, res, userRow.id, 'google');
  return toAppUser(userRow, 'google');
}

function toAppUser(
  row: Pick<DbUserRow, 'id' | 'email' | 'display_name' | 'role'>,
  authMode: 'password' | 'google'
): AppUser {
  const adminRole: 'admin1' | 'admin2' | undefined =
    row.role === 'admin1' || row.role === 'admin2' ? row.role : undefined;
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    isAdmin: Boolean(adminRole),
    adminRole,
    canConfirmBtc: adminRole === 'admin2',
    authMode,
  };
}

async function createSessionAndSetCookie(
  req: Request,
  res: Response,
  userId: string,
  authMode: 'password' | 'google'
): Promise<void> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const userAgent = (req.get('user-agent') || '').slice(0, 300);
  const ipAddress = (req.ip || '').slice(0, 100);

  await pool.query(
    `INSERT INTO sessions (token_hash, user_id, auth_mode, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [tokenHash, userId, authMode, expiresAt.toISOString(), userAgent, ipAddress]
  );

  // Opportunistic expired session cleanup
  void pool
    .query('DELETE FROM sessions WHERE expires_at <= NOW()')
    .catch(() => {});

  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(req),
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

export async function attachAuthUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (!rawToken || typeof rawToken !== 'string') {
      next();
      return;
    }

    const tokenHash = hashSessionToken(rawToken);
    const result = await pool.query<{
      id: string;
      email: string;
      display_name: string;
      role: 'member' | 'admin1' | 'admin2';
      auth_mode: string;
    }>(
      `SELECT u.id, u.email, u.display_name, u.role, s.auth_mode
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      req.user = toAppUser(
        row,
        row.auth_mode === 'google' ? 'google' : 'password'
      );
      req.sessionTokenHash = tokenHash;
    }
  } catch (err) {
    console.warn('[auth] Session lookup error:', err);
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Vui lòng đăng nhập để thực hiện thao tác này.',
    });
    return;
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Vui lòng đăng nhập tài khoản quản trị viên.',
    });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({
      error: 'Bạn không có quyền quản trị viên để thực hiện thao tác này.',
    });
    return;
  }
  next();
}

export function requireAdmin2(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Vui lòng đăng nhập tài khoản Ban Tổ Chức (Admin 2).',
    });
    return;
  }
  if (req.user.adminRole !== 'admin2') {
    res.status(403).json({
      error:
        'Chỉ tài khoản Ban Tổ Chức (Admin 2) mới có quyền xác nhận BTC đã nhận.',
    });
    return;
  }
  next();
}

export function registerAuthRoutes(app: Express): void {
  const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error:
        'Bạn đã gửi quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau 15 phút.',
    },
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error:
        'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.',
    },
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({
      user: req.user || null,
      googleOAuthEnabled: isGoogleOAuthEnabled(),
      googleClientId: getGoogleClientId(),
      googleRedirectEnabled: isGoogleOAuthRedirectEnabled(),
    });
  });

  app.post('/api/auth/register', registerLimiter, async (req, res) => {
    try {
      const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
      const rawFullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';

      if (!rawEmail || rawEmail.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        res.status(400).json({ error: 'Địa chỉ email không hợp lệ.' });
        return;
      }
      if (rawPassword.length < 8 || rawPassword.length > 128) {
        res.status(400).json({
          error: 'Mật khẩu phải có từ 8 đến 128 ký tự.',
        });
        return;
      }
      if (rawFullName.length < 2 || rawFullName.length > 120) {
        res.status(400).json({
          error: 'Vui lòng nhập Họ và tên đầy đủ (tối thiểu 2 ký tự).',
        });
        return;
      }

      const existing = await pool.query<{ id: string }>(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [rawEmail]
      );
      if (existing.rows.length > 0) {
        res.status(409).json({
          error: 'Email này đã được đăng ký tài khoản. Vui lòng đăng nhập.',
        });
        return;
      }

      const userId = crypto.randomUUID();
      const passwordHash = await hashPassword(rawPassword);

      const inserted = await pool.query<DbUserRow>(
        `INSERT INTO users (id, email, password_hash, display_name, role, email_verified)
         VALUES ($1, $2, $3, $4, 'member', TRUE)
         RETURNING id, email, display_name, role`,
        [userId, rawEmail, passwordHash, rawFullName]
      );

      const createdUser = inserted.rows[0];
      await createSessionAndSetCookie(req, res, createdUser.id, 'password');

      res.status(201).json({
        user: toAppUser(createdUser, 'password'),
      });
    } catch (err) {
      console.error('[auth] Register error:', err);
      res.status(500).json({
        error: 'Không thể tạo tài khoản lúc này. Vui lòng thử lại.',
      });
    }
  });

  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
      const rawIdentifier =
        typeof req.body?.identifier === 'string'
          ? req.body.identifier
          : typeof req.body?.email === 'string'
            ? req.body.email
            : '';
      const rawPassword =
        typeof req.body?.password === 'string' ? req.body.password : '';

      if (!rawIdentifier.trim() || !rawPassword) {
        res.status(400).json({
          error: 'Vui lòng nhập đầy đủ tài khoản/email và mật khẩu.',
        });
        return;
      }

      const normId = rawIdentifier.trim().toLowerCase().replace(/\s+/g, ' ');
      const compactId = normId.replace(/\s+/g, '');

      let lookupEmail = rawIdentifier.trim().toLowerCase();
      if (normId === 'admin' || normId === 'admin 1' || compactId === 'admin1') {
        const admin1Email = (process.env.ADMIN1_EMAIL || '').trim().toLowerCase();
        if (!admin1Email) {
          res.status(401).json({
            error: 'Tài khoản quản trị Admin 1 chưa được cấu hình trên máy chủ.',
          });
          return;
        }
        lookupEmail = admin1Email;
      } else if (normId === 'admin 2' || compactId === 'admin2') {
        const admin2Email = (process.env.ADMIN2_EMAIL || '').trim().toLowerCase();
        if (!admin2Email) {
          res.status(401).json({
            error: 'Tài khoản quản trị Admin 2 chưa được cấu hình trên máy chủ.',
          });
          return;
        }
        lookupEmail = admin2Email;
      }

      const result = await pool.query<DbUserRow>(
        `SELECT id, email, password_hash, google_sub, display_name, role, email_verified
         FROM users
         WHERE LOWER(email) = LOWER($1)
         LIMIT 1`,
        [lookupEmail]
      );

      const userRow = result.rows[0];
      if (!userRow || !userRow.password_hash) {
        res.status(401).json({
          error: 'Tài khoản hoặc mật khẩu không chính xác.',
        });
        return;
      }

      const valid = await verifyPassword(rawPassword, userRow.password_hash);
      if (!valid) {
        res.status(401).json({
          error: 'Tài khoản hoặc mật khẩu không chính xác.',
        });
        return;
      }

      await createSessionAndSetCookie(req, res, userRow.id, 'password');

      res.json({
        user: toAppUser(userRow, 'password'),
      });
    } catch (err) {
      console.error('[auth] Login error:', err);
      res.status(500).json({
        error: 'Không thể đăng nhập lúc này. Vui lòng thử lại.',
      });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
      if (rawToken && typeof rawToken === 'string') {
        const tokenHash = hashSessionToken(rawToken);
        await pool.query('DELETE FROM sessions WHERE token_hash = $1', [
          tokenHash,
        ]);
      }
    } catch (err) {
      console.warn('[auth] Logout DB delete warning:', err);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookie(req),
      path: '/',
    });
    res.json({ success: true });
  });

  app.post('/api/auth/google/token', loginLimiter, async (req, res) => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      res.status(501).json({
        error: 'Đăng nhập Google chưa được cấu hình trên máy chủ.',
      });
      return;
    }

    const credential =
      typeof req.body?.credential === 'string' ? req.body.credential.trim() : '';
    if (!credential) {
      res.status(400).json({ error: 'Thiếu mã xác thực Google (credential).' });
      return;
    }

    try {
      const profile = await verifyGoogleIdToken(credential, clientId);
      const user = await upsertGoogleUserAndCreateSession(req, res, profile);
      res.json({ user });
    } catch (err) {
      console.warn(
        '[auth] Google ID token verification failed:',
        err instanceof Error ? err.message : String(err)
      );
      res.status(401).json({
        error: 'Phiên xác thực Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
      });
    }
  });

  app.get('/api/auth/google', (req, res) => {
    if (!isGoogleOAuthRedirectEnabled()) {
      res.status(501).json({
        error: 'Đăng nhập Google OAuth redirect chưa được cấu hình trên máy chủ.',
      });
      return;
    }

    const state = crypto.randomBytes(24).toString('hex');
    res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookie(req),
      path: '/api/auth/google',
      maxAge: 10 * 60 * 1000,
    });

    const redirectUri = `${getAppUrl(req)}/api/auth/google/callback`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!.trim());
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');

    res.redirect(authUrl.toString());
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    if (!isGoogleOAuthRedirectEnabled()) {
      res.status(501).json({
        error: 'Đăng nhập Google OAuth redirect chưa được cấu hình trên máy chủ.',
      });
      return;
    }

    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE_NAME];
    const actualState = typeof req.query.state === 'string' ? req.query.state : '';

    res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookie(req),
      path: '/api/auth/google',
    });

    if (
      !expectedState ||
      !actualState ||
      typeof expectedState !== 'string' ||
      expectedState.length !== actualState.length ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedState, 'utf8'),
        Buffer.from(actualState, 'utf8')
      )
    ) {
      res.status(400).redirect('/?auth_error=invalid_oauth_state');
      return;
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code) {
      res.redirect('/?auth_error=google_cancelled');
      return;
    }

    try {
      const redirectUri = `${getAppUrl(req)}/api/auth/google/callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
          client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        console.error('[auth] Google token exchange failed:', tokenRes.status);
        res.redirect('/?auth_error=google_token_failed');
        return;
      }

      const tokenData = (await tokenRes.json()) as { access_token?: string };
      if (!tokenData.access_token) {
        res.redirect('/?auth_error=google_no_token');
        return;
      }

      const userInfoRes = await fetch(
        'https://openidconnect.googleapis.com/v1/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );

      if (!userInfoRes.ok) {
        console.error('[auth] Google userinfo failed:', userInfoRes.status);
        res.redirect('/?auth_error=google_userinfo_failed');
        return;
      }

      const profile = (await userInfoRes.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
      };

      if (!profile.sub || !profile.email || profile.email_verified !== true) {
        res.redirect('/?auth_error=google_unverified_email');
        return;
      }

      await upsertGoogleUserAndCreateSession(req, res, {
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
      });
      res.redirect('/');
    } catch (err) {
      console.error('[auth] Google OAuth callback error:', err);
      res.redirect('/?auth_error=google_callback_error');
    }
  });
}
