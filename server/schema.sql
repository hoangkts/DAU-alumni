-- ALUMNI KTD PostgreSQL Schema (executed idempotently at startup)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  google_sub TEXT UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin1', 'admin2')),
  email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auth_mode TEXT NOT NULL DEFAULT 'password',
  expires_at TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS auth_mode TEXT NOT NULL DEFAULT 'password';

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS members (
  uid TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  birth_date TEXT NOT NULL DEFAULT '',
  class_name TEXT NOT NULL DEFAULT '',
  enrollment_year TEXT NOT NULL DEFAULT '',
  graduation_year TEXT NOT NULL DEFAULT '',
  faculty TEXT NOT NULL DEFAULT 'Khoa Kiến trúc',
  major TEXT NOT NULL DEFAULT 'Ngành Kiến trúc công trình',
  current_province TEXT NOT NULL DEFAULT 'Thành phố Đà Nẵng',
  workplace TEXT NOT NULL DEFAULT '',
  workplace_province TEXT NOT NULL DEFAULT 'Thành phố Đà Nẵng',
  zalo_phone TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'public',
  verification_status TEXT NOT NULL DEFAULT 'verified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executives (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  board_role TEXT NOT NULL,
  phone TEXT NOT NULL,
  faculty TEXT NOT NULL,
  major TEXT NOT NULL,
  graduation_year TEXT NOT NULL,
  email TEXT NOT NULL,
  workplace TEXT NOT NULL,
  work_position TEXT NOT NULL,
  avatar_key TEXT NOT NULL DEFAULT 'president',
  visibility TEXT NOT NULL DEFAULT 'public',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  owner_faculty TEXT NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  scale TEXT NOT NULL,
  province TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  logo_aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  visibility TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner_uid ON businesses(owner_uid);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_time TEXT NOT NULL,
  province TEXT NOT NULL,
  venue TEXT NOT NULL,
  category TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 100,
  summary TEXT NOT NULL,
  organizer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  is_gala_with_shirt_fee BOOLEAN NOT NULL DEFAULT FALSE,
  qr_image_url TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  bank_account TEXT NOT NULL DEFAULT '',
  bank_account_name TEXT NOT NULL DEFAULT '',
  gala_fee_amount INTEGER,
  shirt_fee_amount INTEGER,
  transfer_syntax_prefix TEXT NOT NULL DEFAULT 'Gala',
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'public',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_registrations (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  faculty TEXT NOT NULL DEFAULT '',
  graduation_year TEXT NOT NULL DEFAULT '',
  class_name TEXT NOT NULL DEFAULT '',
  workplace TEXT NOT NULL DEFAULT '',
  province TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  custom_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  attend_gala BOOLEAN,
  shirt_orders JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_fee INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed')),
  btc_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  btc_confirmed_at TIMESTAMPTZ,
  btc_confirmed_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, uid)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_uid ON event_registrations(uid);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  user_uid TEXT,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  sender_name TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  body_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  html_content TEXT,
  message_id TEXT,
  delivery_mode TEXT NOT NULL DEFAULT 'internal_relay',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(LOWER(recipient_email));
CREATE INDEX IF NOT EXISTS idx_email_logs_user_uid ON email_logs(user_uid);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
