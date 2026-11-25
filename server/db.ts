import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { OFFICIAL_GALA_EVENT } from '../src/data/constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn(
    '[db] DATABASE_URL is not set; PostgreSQL queries will fail until configured.'
  );
}

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected PostgreSQL pool error:', err.message);
});

async function loadSchemaSql(): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), 'server', 'schema.sql'),
    path.resolve(__dirname, 'schema.sql'),
    path.resolve(__dirname, '..', 'server', 'schema.sql'),
  ];

  for (const filePath of candidates) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      // Try next candidate
    }
  }
  throw new Error(
    `Could not locate server/schema.sql. Checked: ${candidates.join(', ')}`
  );
}

async function seedAdminAccount(params: {
  label: string;
  defaultId: string;
  emailEnv?: string;
  passwordEnv?: string;
  role: 'admin1' | 'admin2';
  displayName: string;
  hashPassword: (password: string) => Promise<string>;
}): Promise<void> {
  const email = (params.emailEnv || '').trim().toLowerCase();
  const password = (params.passwordEnv || '').trim();

  if (!email || !password) {
    console.warn(
      `[db] ${params.label} env vars (${params.role.toUpperCase()}_EMAIL / ${params.role.toUpperCase()}_PASSWORD) not set; skipping admin seed.`
    );
    return;
  }

  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  if (existing.rows.length > 0) {
    return;
  }

  const passwordHash = await params.hashPassword(password);
  const idTaken = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE id = $1 LIMIT 1',
    [params.defaultId]
  );
  const userId =
    idTaken.rows.length === 0 ? params.defaultId : `${params.role}-${crypto.randomUUID().slice(0, 8)}`;

  await pool.query(
    `INSERT INTO users (id, email, password_hash, display_name, role, email_verified)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (email) DO NOTHING`,
    [userId, email, passwordHash, params.displayName, params.role]
  );
  console.info(`[db] Seeded ${params.label} account (${email}).`);
}

export async function initDatabase(
  hashPassword: (password: string) => Promise<string>
): Promise<void> {
  const schemaSql = await loadSchemaSql();
  await pool.query(schemaSql);

  // Seed OFFICIAL_GALA_EVENT if events table is empty
  const eventCountRes = await pool.query<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM events'
  );
  if ((eventCountRes.rows[0]?.count ?? 0) === 0) {
    await pool.query(
      `INSERT INTO events (
         id, title, event_date, event_time, province, venue, category,
         capacity, summary, organizer, status, is_gala_with_shirt_fee,
         qr_image_url, bank_name, bank_account, bank_account_name,
         gala_fee_amount, shirt_fee_amount, transfer_syntax_prefix,
         custom_fields, visibility, created_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12,
         $13, $14, $15, $16,
         $17, $18, $19,
         $20::jsonb, 'public', 'system'
       ) ON CONFLICT (id) DO NOTHING`,
      [
        OFFICIAL_GALA_EVENT.id,
        OFFICIAL_GALA_EVENT.title,
        OFFICIAL_GALA_EVENT.eventDate,
        OFFICIAL_GALA_EVENT.eventTime,
        OFFICIAL_GALA_EVENT.province,
        OFFICIAL_GALA_EVENT.venue,
        OFFICIAL_GALA_EVENT.category,
        OFFICIAL_GALA_EVENT.capacity,
        OFFICIAL_GALA_EVENT.summary,
        OFFICIAL_GALA_EVENT.organizer,
        OFFICIAL_GALA_EVENT.status,
        Boolean(OFFICIAL_GALA_EVENT.isGalaWithShirtFee),
        OFFICIAL_GALA_EVENT.qrImageUrl || '',
        OFFICIAL_GALA_EVENT.bankName || '',
        OFFICIAL_GALA_EVENT.bankAccount || '',
        OFFICIAL_GALA_EVENT.bankAccountName || '',
        OFFICIAL_GALA_EVENT.galaFeeAmount ?? 350000,
        OFFICIAL_GALA_EVENT.shirtFeeAmount ?? 110000,
        OFFICIAL_GALA_EVENT.transferSyntaxPrefix || 'Gala',
        JSON.stringify(OFFICIAL_GALA_EVENT.customFields || []),
      ]
    );
    console.info(`[db] Seeded default Gala event (${OFFICIAL_GALA_EVENT.id}).`);
  }

  // Seed default pinned settings if absent
  const defaultPinned = {
    events: [OFFICIAL_GALA_EVENT.id],
    businesses: [],
    executives: [],
    members: [],
  };
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_by)
     VALUES ('pinned', $1::jsonb, 'system')
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(defaultPinned)]
  );

  // Seed Admin 1 & Admin 2 accounts from environment variables only
  await seedAdminAccount({
    label: 'Admin 1',
    defaultId: 'admin1-ktd-uid',
    emailEnv: process.env.ADMIN1_EMAIL,
    passwordEnv: process.env.ADMIN1_PASSWORD,
    role: 'admin1',
    displayName: 'Ban Điều Hành ALUMNI KTD (Admin 1)',
    hashPassword,
  });

  await seedAdminAccount({
    label: 'Admin 2',
    defaultId: 'admin2-btc-uid',
    emailEnv: process.env.ADMIN2_EMAIL,
    passwordEnv: process.env.ADMIN2_PASSWORD,
    role: 'admin2',
    displayName: 'Ban Tổ Chức - Xác nhận Đại biểu (Admin 2)',
    hashPassword,
  });
}
