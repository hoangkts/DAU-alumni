import crypto from 'crypto';
import type { Express, Request } from 'express';
import rateLimit from 'express-rate-limit';
import nodemailer, { type Transporter } from 'nodemailer';
import type {
  BusinessRecord,
  EmailNotificationRecord,
  EventCustomField,
  EventRecord,
  EventRegistrationRecord,
  EventShirtOrder,
  ExecutiveRecord,
  MemberProfileRecord,
} from '../src/data/constants';
import { requireAdmin, requireAuth } from './auth';
import { pool } from './db';
import { persistDataUrlIfNeeded, UploadValidationError } from './uploads';

const VALID_SHIRT_GENDERS = new Set(['Nam', 'Nữ']);
const VALID_SHIRT_SIZES = new Set(['S', 'M', 'L', 'XL', 'XXL', '3XL']);
const VALID_LOGO_RATIOS = new Set(['1:1', '3:4', '4:3', '16:9', 'free']);

let cachedTransporter: Transporter | null | undefined;

function getConfiguredSmtpTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  const host = (process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();

  if (host && user && pass && pass !== '12345@abcde') {
    try {
      cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 4000,
        auth: {
          user,
          pass,
        },
      });
      return cachedTransporter;
    } catch (err) {
      console.warn('[smtp] Failed to initialize SMTP transporter:', err);
    }
  }

  cachedTransporter = null;
  return null;
}

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function maskLast4(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.replace(/[\s.\-()]/g, '');
  if (!clean) return '';
  if (clean.length <= 4) return clean;
  return `••••••${clean.slice(-4)}`;
}

function isValidHttpUrlOrEmpty(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeCustomAnswersForPublic(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const blockedKeys = new Set([
    'phone',
    'payerPhone',
    'zaloPhone',
    'email',
    'total_fee_display',
  ]);
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (blockedKeys.has(k)) continue;
    sanitized[k] = v;
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function mapMemberRow(
  row: Record<string, any>,
  includePii: boolean
): MemberProfileRecord & { zaloPhoneMasked?: string } {
  const base: MemberProfileRecord & { zaloPhoneMasked?: string } = {
    uid: row.uid,
    email: includePii ? row.email || '' : '',
    fullName: row.full_name || '',
    birthDate: includePii ? row.birth_date || '' : '',
    className: row.class_name || '',
    enrollmentYear: row.enrollment_year || '',
    graduationYear: row.graduation_year || '',
    faculty: row.faculty || 'Khoa Kiến trúc',
    major: row.major || 'Ngành Kiến trúc công trình',
    currentProvince: row.current_province || 'Thành phố Đà Nẵng',
    workplace: row.workplace || '',
    workplaceProvince: row.workplace_province || 'Thành phố Đà Nẵng',
    zaloPhone: includePii ? row.zalo_phone || '' : '',
    avatarUrl: row.avatar_url || '',
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at || new Date().toISOString()),
    verificationStatus:
      row.verification_status === 'pending' ? 'pending' : 'verified',
  };

  if (!includePii) {
    base.zaloPhoneMasked = maskLast4(row.zalo_phone);
  }
  return base;
}

function mapExecutiveRow(row: Record<string, any>): ExecutiveRecord {
  return {
    id: row.id,
    fullName: row.full_name || '',
    boardRole: row.board_role || '',
    phone: row.phone || '',
    faculty: row.faculty || '',
    major: row.major || '',
    graduationYear: row.graduation_year || '',
    email: row.email || '',
    workplace: row.workplace || '',
    workPosition: row.work_position || '',
    avatarKey: row.avatar_key || 'president',
  };
}

function mapBusinessRow(row: Record<string, any>): BusinessRecord {
  return {
    id: row.id,
    ownerUid: row.owner_uid,
    ownerName: row.owner_name || '',
    ownerFaculty: row.owner_faculty || '',
    companyName: row.company_name || '',
    industry: row.industry || '',
    scale: row.scale || '',
    province: row.province || '',
    address: row.address || '',
    website: row.website || '',
    contactEmail: row.contact_email || '',
    contactPhone: row.contact_phone || '',
    description: row.description || '',
    logoUrl: row.logo_url || '',
    logoAspectRatio: VALID_LOGO_RATIOS.has(row.logo_aspect_ratio)
      ? row.logo_aspect_ratio
      : '1:1',
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at || new Date().toISOString()),
  };
}

function mapEventRow(row: Record<string, any>): EventRecord {
  return {
    id: row.id,
    title: row.title || '',
    eventDate: row.event_date || '',
    eventTime: row.event_time || '',
    province: row.province || '',
    venue: row.venue || '',
    category: row.category || '',
    capacity: Number(row.capacity) || 100,
    registeredCount: Number(row.registered_count) || 0,
    summary: row.summary || '',
    organizer: row.organizer || '',
    status: row.status === 'closed' ? 'closed' : 'open',
    isGalaWithShirtFee: Boolean(row.is_gala_with_shirt_fee),
    qrImageUrl: row.qr_image_url || '',
    bankName: row.bank_name || '',
    bankAccount: row.bank_account || '',
    bankAccountName: row.bank_account_name || '',
    galaFeeAmount:
      typeof row.gala_fee_amount === 'number' ? row.gala_fee_amount : undefined,
    shirtFeeAmount:
      typeof row.shirt_fee_amount === 'number'
        ? row.shirt_fee_amount
        : undefined,
    transferSyntaxPrefix: row.transfer_syntax_prefix || 'Gala',
    customFields: Array.isArray(row.custom_fields)
      ? row.custom_fields
      : undefined,
    createdBy: row.created_by || undefined,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at || undefined,
  };
}

function mapFullRegistrationRow(
  row: Record<string, any>
): EventRegistrationRecord {
  return {
    eventId: row.event_id,
    uid: row.uid,
    fullName: row.full_name || '',
    email: row.email || '',
    faculty: row.faculty || '',
    graduationYear: row.graduation_year || '',
    className: row.class_name || '',
    workplace: row.workplace || '',
    province: row.province || '',
    note: row.note || '',
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at || new Date().toISOString()),
    customAnswers:
      row.custom_answers && typeof row.custom_answers === 'object'
        ? row.custom_answers
        : undefined,
    attendGala:
      typeof row.attend_gala === 'boolean' ? row.attend_gala : undefined,
    shirtOrders: Array.isArray(row.shirt_orders) ? row.shirt_orders : undefined,
    totalFee: typeof row.total_fee === 'number' ? row.total_fee : 0,
    paymentStatus:
      row.payment_status === 'completed' ? 'completed' : 'pending',
    btcConfirmed: Boolean(row.btc_confirmed),
    btcConfirmedAt:
      row.btc_confirmed_at instanceof Date
        ? row.btc_confirmed_at.toISOString()
        : row.btc_confirmed_at || undefined,
    btcConfirmedBy: row.btc_confirmed_by || undefined,
  };
}

function mapPublicRegistrationRow(
  row: Record<string, any>
): Partial<EventRegistrationRecord> {
  return {
    eventId: row.event_id,
    uid: row.uid,
    fullName: row.full_name || '',
    faculty: row.faculty || '',
    graduationYear: row.graduation_year || '',
    className: row.class_name || '',
    workplace: row.workplace || '',
    province: row.province || '',
    customAnswers: sanitizeCustomAnswersForPublic(row.custom_answers),
    btcConfirmed: Boolean(row.btc_confirmed),
    btcConfirmedAt:
      row.btc_confirmed_at instanceof Date
        ? row.btc_confirmed_at.toISOString()
        : row.btc_confirmed_at || undefined,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at || new Date().toISOString()),
  };
}

function validateAndNormalizeShirtOrders(
  rawOrders: unknown
): { valid: true; orders: EventShirtOrder[] } | { valid: false; error: string } {
  if (rawOrders === undefined || rawOrders === null) {
    return { valid: true, orders: [] };
  }
  if (!Array.isArray(rawOrders)) {
    return { valid: false, error: 'Danh sách áo đặt phải là mảng hợp lệ.' };
  }
  if (rawOrders.length > 50) {
    return { valid: false, error: 'Số dòng đặt áo không được vượt quá 50.' };
  }

  const normalized: EventShirtOrder[] = [];
  for (let i = 0; i < rawOrders.length; i++) {
    const item = rawOrders[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Mục đặt áo không hợp lệ.' };
    }
    const gender = String(item.gender || '');
    const size = String(item.size || '');
    const quantity = Number(item.quantity);

    if (!VALID_SHIRT_GENDERS.has(gender)) {
      return { valid: false, error: 'Form áo phải là Nam hoặc Nữ.' };
    }
    if (!VALID_SHIRT_SIZES.has(size)) {
      return {
        valid: false,
        error: 'Size áo phải thuộc S, M, L, XL, XXL hoặc 3XL.',
      };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return {
        valid: false,
        error: 'Số lượng mỗi size áo phải là số nguyên từ 1 đến 50.',
      };
    }

    normalized.push({
      id:
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim().slice(0, 64)
          : `shirt-${i + 1}-${Date.now()}`,
      gender: gender as 'Nam' | 'Nữ',
      size: size as EventShirtOrder['size'],
      quantity,
    });
  }

  return { valid: true, orders: normalized };
}

function computeServerRegistrationFee(
  eventRow: Record<string, any>,
  attendGala: boolean | undefined,
  shirtOrders: EventShirtOrder[]
): number {
  if (!eventRow.is_gala_with_shirt_fee) {
    return 0;
  }
  const unitGala =
    typeof eventRow.gala_fee_amount === 'number'
      ? eventRow.gala_fee_amount
      : 350000;
  const unitShirt =
    typeof eventRow.shirt_fee_amount === 'number'
      ? eventRow.shirt_fee_amount
      : 110000;
  const shirtQty = shirtOrders.reduce((sum, item) => sum + item.quantity, 0);
  return (attendGala ? unitGala : 0) + shirtQty * unitShirt;
}

function buildOfficialDauHtmlEmail(payload: {
  subject: string;
  to: string;
  category: string;
  bodyLines: string[];
  memberProfile?: {
    fullName: string;
    email: string;
    birthDate: string;
    className: string;
    enrollmentYear: string;
    graduationYear: string;
    faculty: string;
    major: string;
    currentProvince: string;
    workplace: string;
    workplaceProvince: string;
  };
}): string {
  const { subject, to, bodyLines, memberProfile } = payload;
  const sentDateStr = new Date().toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  const memberTableHtml = memberProfile
    ? `
      <div style="margin: 24px 0; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #FEF2F2; border-bottom: 1px solid #FECACA; padding: 12px 16px; font-weight: 700; color: #9E1B20; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em;">
          Thông tin Hồ sơ Cựu sinh viên Đã Xác nhận
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #0F172A;">
          <tbody>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 10px 16px; color: #64748B; width: 38%;">Họ và tên</td>
              <td style="padding: 10px 16px; font-weight: 700;">${escapeHtml(memberProfile.fullName)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9; background-color: #F8FAFC;">
              <td style="padding: 10px 16px; color: #64748B;">Email xác thực</td>
              <td style="padding: 10px 16px; font-weight: 600; color: #9E1B20;">${escapeHtml(memberProfile.email)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 10px 16px; color: #64748B;">Ngày tháng năm sinh</td>
              <td style="padding: 10px 16px; font-weight: 500;">${escapeHtml(memberProfile.birthDate)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9; background-color: #F8FAFC;">
              <td style="padding: 10px 16px; color: #64748B;">Lớp &amp; Niên khóa</td>
              <td style="padding: 10px 16px; font-weight: 600;">${escapeHtml(memberProfile.className)} (${escapeHtml(memberProfile.enrollmentYear || '—')} – ${escapeHtml(memberProfile.graduationYear || '—')})</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 10px 16px; color: #64748B;">Khoa đào tạo</td>
              <td style="padding: 10px 16px; font-weight: 700;">${escapeHtml(memberProfile.faculty)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9; background-color: #F8FAFC;">
              <td style="padding: 10px 16px; color: #64748B;">Ngành đào tạo</td>
              <td style="padding: 10px 16px; font-weight: 600;">${escapeHtml(memberProfile.major)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 10px 16px; color: #64748B;">Nơi ở hiện nay</td>
              <td style="padding: 10px 16px; font-weight: 600;">${escapeHtml(memberProfile.currentProvince)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color: #64748B;">Đơn vị &amp; Nơi công tác</td>
              <td style="padding: 10px 16px; font-weight: 600;">${escapeHtml(memberProfile.workplace || 'Đang cập nhật')} (${escapeHtml(memberProfile.workplaceProvince || '—')})</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
    : '';

  const paragraphsHtml = (bodyLines || [])
    .map(
      (line) =>
        `<p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #1E293B;">${escapeHtml(
          line
        )}</p>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #F8FAFC; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0F172A;">
  <div style="max-width: 640px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);">
    <div style="background: linear-gradient(135deg, #9E1B20 0%, #7D1418 100%); padding: 24px 28px; color: #FFFFFF;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #FECACA; margin-bottom: 6px;">
        TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG (DAU) · MẠNG LƯỚI ALUMNI KTD
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; line-height: 1.35; color: #FFFFFF;">
        ${escapeHtml(subject)}
      </h1>
    </div>
    <div style="padding: 28px;">
      ${paragraphsHtml}
      ${memberTableHtml}
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; line-height: 1.5;">
        <div><strong>Người nhận:</strong> ${escapeHtml(to)}</div>
        <div><strong>Thời gian xác nhận:</strong> ${escapeHtml(sentDateStr)}</div>
        <div><strong>Cơ quan phát hành:</strong> Ban Điều hành Mạng lưới Cựu sinh viên Trường Đại học Kiến trúc Đà Nẵng (566 Núi Thành, TP. Đà Nẵng)</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function removePinnedId(
  categoryKey: 'events' | 'businesses' | 'executives' | 'members',
  targetId: string
): Promise<void> {
  const res = await pool.query<{ value: Record<string, string[]> }>(
    `SELECT value FROM app_settings WHERE key = 'pinned' LIMIT 1`
  );
  if (res.rows.length === 0) return;
  const current = res.rows[0].value || {};
  const list = Array.isArray(current[categoryKey]) ? current[categoryKey] : [];
  if (!list.includes(targetId)) return;

  const updated = {
    events: Array.isArray(current.events) ? current.events : [],
    businesses: Array.isArray(current.businesses) ? current.businesses : [],
    executives: Array.isArray(current.executives) ? current.executives : [],
    members: Array.isArray(current.members) ? current.members : [],
    [categoryKey]: list.filter((id) => id !== targetId),
  };

  await pool.query(
    `UPDATE app_settings SET value = $1::jsonb, updated_at = NOW() WHERE key = 'pinned'`,
    [JSON.stringify(updated)]
  );
}

async function fetchEventWithCount(
  eventId: string
): Promise<EventRecord | null> {
  const res = await pool.query(
    `SELECT e.*, COALESCE(rc.cnt, 0)::int AS registered_count
     FROM events e
     LEFT JOIN (
       SELECT event_id, COUNT(*)::int AS cnt
       FROM event_registrations
       GROUP BY event_id
     ) rc ON rc.event_id = e.id
     WHERE e.id = $1
     LIMIT 1`,
    [eventId]
  );
  return res.rows[0] ? mapEventRow(res.rows[0]) : null;
}

export function registerApiRoutes(app: Express): void {
  // Healthcheck
  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({
        status: 'ok',
        db: 'connected',
        uptime: Math.round(process.uptime()),
      });
    } catch (err) {
      console.error('[health] DB check failed:', err);
      res.status(503).json({
        status: 'error',
        db: 'disconnected',
        uptime: Math.round(process.uptime()),
      });
    }
  });

  // ---------------- MEMBERS ----------------
  app.get('/api/members', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM members
         WHERE visibility = 'public' AND class_name <> '' AND avatar_url <> ''
         ORDER BY updated_at DESC`
      );
      const members = result.rows.map((row) => {
        const includePii = Boolean(
          req.user && (req.user.isAdmin || req.user.uid === row.uid)
        );
        return mapMemberRow(row, includePii);
      });
      res.json({ members });
    } catch (err) {
      console.error('[members] GET /api/members error:', err);
      res.status(500).json({ error: 'Không thể tải danh sách thành viên.' });
    }
  });

  app.get('/api/members/me', requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM members WHERE uid = $1 LIMIT 1',
        [req.user!.uid]
      );
      const member = result.rows[0]
        ? mapMemberRow(result.rows[0], true)
        : null;
      res.json({ member });
    } catch (err) {
      console.error('[members] GET /api/members/me error:', err);
      res.status(500).json({ error: 'Không thể tải hồ sơ cá nhân.' });
    }
  });

  app.put('/api/members/me', requireAuth, async (req, res) => {
    try {
      const body = req.body || {};
      const fullName = String(body.fullName || '').trim();
      const birthDate = String(body.birthDate || '').trim();
      const className = String(body.className || '').trim();
      const enrollmentYear = String(body.enrollmentYear || '').trim();
      const graduationYear = String(body.graduationYear || '').trim();
      const faculty = String(body.faculty || '').trim();
      const major = String(body.major || '').trim();
      const currentProvince = String(body.currentProvince || '').trim();
      const workplace = String(body.workplace || '').trim();
      const workplaceProvince = String(
        body.workplaceProvince || currentProvince || 'Thành phố Đà Nẵng'
      ).trim();
      const zaloPhone = String(body.zaloPhone || '').trim();
      const rawAvatarUrl = String(body.avatarUrl || '').trim();

      if (fullName.length < 2 || fullName.length > 120) {
        res.status(400).json({ error: 'Vui lòng nhập Họ và tên đầy đủ.' });
        return;
      }
      if (birthDate.length < 4 || birthDate.length > 30) {
        res.status(400).json({ error: 'Vui lòng nhập Ngày tháng năm sinh.' });
        return;
      }
      if (className.length < 1 || className.length > 60) {
        res.status(400).json({ error: 'Vui lòng nhập Lớp sinh hoạt.' });
        return;
      }
      if (faculty.length < 2 || major.length < 2) {
        res.status(400).json({
          error: 'Vui lòng chọn Khoa và Ngành đào tạo hợp lệ.',
        });
        return;
      }
      if (currentProvince.length < 2 || currentProvince.length > 100) {
        res.status(400).json({ error: 'Vui lòng chọn Nơi ở hiện nay.' });
        return;
      }
      const cleanDigits = zaloPhone.replace(/[\s.\-()]/g, '');
      if (cleanDigits.length < 9 || zaloPhone.length > 30) {
        res.status(400).json({
          error: 'Vui lòng nhập Số điện thoại / Zalo hợp lệ (tối thiểu 9 số).',
        });
        return;
      }

      const avatarUrl = await persistDataUrlIfNeeded(rawAvatarUrl, 'avatar');
      if (!avatarUrl || avatarUrl.length < 5) {
        res.status(400).json({
          error:
            'Vui lòng tải lên ảnh đại diện (Avatar) hợp lệ để xác nhận thành viên mạng lưới.',
        });
        return;
      }

      const memberEmail = req.user!.email;
      const result = await pool.query(
        `INSERT INTO members (
           uid, email, full_name, birth_date, class_name,
           enrollment_year, graduation_year, faculty, major,
           current_province, workplace, workplace_province,
           zalo_phone, avatar_url, visibility, verification_status
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9,
           $10, $11, $12,
           $13, $14, 'public', 'verified'
         )
         ON CONFLICT (uid) DO UPDATE SET
           email = EXCLUDED.email,
           full_name = EXCLUDED.full_name,
           birth_date = EXCLUDED.birth_date,
           class_name = EXCLUDED.class_name,
           enrollment_year = EXCLUDED.enrollment_year,
           graduation_year = EXCLUDED.graduation_year,
           faculty = EXCLUDED.faculty,
           major = EXCLUDED.major,
           current_province = EXCLUDED.current_province,
           workplace = EXCLUDED.workplace,
           workplace_province = EXCLUDED.workplace_province,
           zalo_phone = EXCLUDED.zalo_phone,
           avatar_url = EXCLUDED.avatar_url,
           updated_at = NOW()
         RETURNING *`,
        [
          req.user!.uid,
          memberEmail.slice(0, 160),
          fullName.slice(0, 120),
          birthDate.slice(0, 30),
          className.slice(0, 60),
          enrollmentYear.slice(0, 10),
          graduationYear.slice(0, 10),
          faculty.slice(0, 120),
          major.slice(0, 120),
          currentProvince.slice(0, 100),
          workplace.slice(0, 160),
          workplaceProvince.slice(0, 100),
          zaloPhone.slice(0, 30),
          avatarUrl,
        ]
      );

      res.json({ member: mapMemberRow(result.rows[0], true) });
    } catch (err) {
      if (err instanceof UploadValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error('[members] PUT /api/members/me error:', err);
      res.status(500).json({ error: 'Không thể lưu hồ sơ thành viên.' });
    }
  });

  app.patch('/api/members/me/phone', requireAuth, async (req, res) => {
    try {
      const rawPhone = String(
        req.body?.zaloPhone ?? req.body?.phone ?? ''
      ).trim();
      const rawFullName =
        typeof req.body?.fullName === 'string'
          ? req.body.fullName.trim().slice(0, 120)
          : '';

      const cleanDigits = rawPhone.replace(/[\s.\-()]/g, '');
      if (cleanDigits.length < 9 || rawPhone.length > 30) {
        res.status(400).json({ error: 'Số điện thoại Zalo không hợp lệ.' });
        return;
      }

      const existing = await pool.query(
        'SELECT * FROM members WHERE uid = $1 LIMIT 1',
        [req.user!.uid]
      );
      if (existing.rows.length === 0) {
        res.json({ member: null });
        return;
      }

      const updated = await pool.query(
        `UPDATE members
         SET zalo_phone = $1,
             full_name = CASE WHEN $2 <> '' THEN $2 ELSE full_name END,
             updated_at = NOW()
         WHERE uid = $3
         RETURNING *`,
        [rawPhone.slice(0, 30), rawFullName, req.user!.uid]
      );

      res.json({ member: mapMemberRow(updated.rows[0], true) });
    } catch (err) {
      console.error('[members] PATCH /api/members/me/phone error:', err);
      res.status(500).json({ error: 'Không thể cập nhật số điện thoại.' });
    }
  });

  app.delete('/api/members/:uid', requireAdmin, async (req, res) => {
    const targetUid = String(req.params.uid || '').trim();
    if (!targetUid) {
      res.status(400).json({ error: 'Thiếu mã thành viên (uid).' });
      return;
    }

    try {
      await pool.query('DELETE FROM members WHERE uid = $1', [targetUid]);
      await removePinnedId('members', targetUid);
      res.json({ success: true });
    } catch (err) {
      console.error('[members] DELETE /api/members/:uid error:', err);
      res.status(500).json({ error: 'Không thể xóa hồ sơ thành viên.' });
    }
  });

  // ---------------- EXECUTIVES ----------------
  app.get('/api/executives', async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM executives WHERE visibility = 'public' ORDER BY created_at DESC`
      );
      res.json({ executives: result.rows.map(mapExecutiveRow) });
    } catch (err) {
      console.error('[executives] GET error:', err);
      res.status(500).json({ error: 'Không thể tải danh sách Ban Điều hành.' });
    }
  });

  app.post('/api/executives', requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const fullName = String(b.fullName || '').trim();
      const boardRole = String(b.boardRole || 'Ủy viên Ban Điều hành').trim();
      const phone = String(b.phone || '').trim();
      const faculty = String(b.faculty || 'Khoa Kiến trúc').trim();
      const major = String(b.major || 'Ngành Kiến trúc công trình').trim();
      const graduationYear = String(b.graduationYear || '').trim();
      const email = String(b.email || '').trim();
      const workplace = String(b.workplace || '').trim();
      const workPosition = String(b.workPosition || '').trim();
      const avatarKey = String(b.avatarKey || 'president').trim();

      if (fullName.length < 2) {
        res.status(400).json({ error: 'Vui lòng nhập Họ và tên thành viên Ban Điều hành.' });
        return;
      }

      const id = `exec-${crypto.randomUUID().slice(0, 8)}`;
      const result = await pool.query(
        `INSERT INTO executives (
           id, full_name, board_role, phone, faculty, major,
           graduation_year, email, workplace, work_position,
           avatar_key, visibility, created_by
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10,
           $11, 'public', $12
         ) RETURNING *`,
        [
          id,
          fullName.slice(0, 120),
          boardRole.slice(0, 120),
          phone.slice(0, 30),
          faculty.slice(0, 120),
          major.slice(0, 120),
          graduationYear.slice(0, 20),
          email.slice(0, 160),
          workplace.slice(0, 160),
          workPosition.slice(0, 120),
          avatarKey.slice(0, 40),
          req.user!.uid,
        ]
      );

      res.status(201).json({ executive: mapExecutiveRow(result.rows[0]) });
    } catch (err) {
      console.error('[executives] POST error:', err);
      res.status(500).json({ error: 'Không thể thêm thành viên Ban Điều hành.' });
    }
  });

  app.put('/api/executives/:id', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      const b = req.body || {};
      const fullName = String(b.fullName || '').trim();
      if (fullName.length < 2) {
        res.status(400).json({ error: 'Vui lòng nhập Họ và tên hợp lệ.' });
        return;
      }

      const result = await pool.query(
        `UPDATE executives SET
           full_name = $1,
           board_role = $2,
           phone = $3,
           faculty = $4,
           major = $5,
           graduation_year = $6,
           email = $7,
           workplace = $8,
           work_position = $9,
           avatar_key = $10,
           updated_at = NOW()
         WHERE id = $11
         RETURNING *`,
        [
          fullName.slice(0, 120),
          String(b.boardRole || 'Ủy viên Ban Điều hành').trim().slice(0, 120),
          String(b.phone || '').trim().slice(0, 30),
          String(b.faculty || 'Khoa Kiến trúc').trim().slice(0, 120),
          String(b.major || 'Ngành Kiến trúc công trình').trim().slice(0, 120),
          String(b.graduationYear || '').trim().slice(0, 20),
          String(b.email || '').trim().slice(0, 160),
          String(b.workplace || '').trim().slice(0, 160),
          String(b.workPosition || '').trim().slice(0, 120),
          String(b.avatarKey || 'president').trim().slice(0, 40),
          id,
        ]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Không tìm thấy thành viên Ban Điều hành.' });
        return;
      }

      res.json({ executive: mapExecutiveRow(result.rows[0]) });
    } catch (err) {
      console.error('[executives] PUT error:', err);
      res.status(500).json({ error: 'Không thể cập nhật thông tin Ban Điều hành.' });
    }
  });

  app.delete('/api/executives/:id', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      await pool.query('DELETE FROM executives WHERE id = $1', [id]);
      await removePinnedId('executives', id);
      res.json({ success: true });
    } catch (err) {
      console.error('[executives] DELETE error:', err);
      res.status(500).json({ error: 'Không thể xóa thành viên Ban Điều hành.' });
    }
  });

  // ---------------- BUSINESSES ----------------
  app.get('/api/businesses', async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM businesses WHERE visibility = 'public' ORDER BY created_at DESC`
      );
      res.json({ businesses: result.rows.map(mapBusinessRow) });
    } catch (err) {
      console.error('[businesses] GET error:', err);
      res.status(500).json({ error: 'Không thể tải danh sách doanh nghiệp.' });
    }
  });

  app.post('/api/businesses', requireAuth, async (req, res) => {
    try {
      const memberRes = await pool.query(
        'SELECT * FROM members WHERE uid = $1 LIMIT 1',
        [req.user!.uid]
      );
      const member = memberRes.rows[0];
      if (
        !member ||
        !String(member.class_name || '').trim() ||
        !String(member.avatar_url || '').trim()
      ) {
        res.status(403).json({
          error:
            'Chỉ Thành viên Mạng lưới đã xác nhận (cập nhật thông tin cá nhân và có ảnh đại diện) mới được đăng ký Doanh nghiệp.',
        });
        return;
      }

      const b = req.body || {};
      const companyName = String(b.companyName || '').trim();
      const industry = String(b.industry || '').trim();
      const scale = String(b.scale || '').trim();
      const province = String(b.province || '').trim();
      const address = String(b.address || '').trim();
      const website = String(b.website || '').trim();
      const contactEmail = String(b.contactEmail || '').trim();
      const contactPhone = String(b.contactPhone || '').trim();
      const description = String(b.description || '').trim();
      const logoAspectRatio = VALID_LOGO_RATIOS.has(String(b.logoAspectRatio))
        ? String(b.logoAspectRatio)
        : '1:1';

      if (companyName.length < 2) {
        res.status(400).json({ error: 'Vui lòng nhập Tên doanh nghiệp.' });
        return;
      }
      if (industry.length < 2 || scale.length < 2 || province.length < 2) {
        res.status(400).json({
          error: 'Vui lòng chọn đầy đủ Lĩnh vực, Quy mô và Tỉnh/Thành phố.',
        });
        return;
      }
      if (!contactEmail.includes('@') || contactPhone.length < 6) {
        res.status(400).json({
          error: 'Vui lòng nhập Email và Số điện thoại liên hệ hợp lệ.',
        });
        return;
      }
      if (!isValidHttpUrlOrEmpty(website)) {
        res.status(400).json({
          error:
            'Website doanh nghiệp phải để trống hoặc bắt đầu bằng http:// hoặc https://.',
        });
        return;
      }

      const logoUrl = await persistDataUrlIfNeeded(b.logoUrl, 'logo');
      const id = `biz-${crypto.randomUUID().slice(0, 8)}`;
      const ownerFaculty = `${member.faculty} (${member.graduation_year || 'Cựu SV'})`;

      const result = await pool.query(
        `INSERT INTO businesses (
           id, owner_uid, owner_name, owner_faculty, company_name,
           industry, scale, province, address, website,
           contact_email, contact_phone, description, logo_url,
           logo_aspect_ratio, visibility
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10,
           $11, $12, $13, $14,
           $15, 'public'
         ) RETURNING *`,
        [
          id,
          req.user!.uid,
          String(member.full_name).slice(0, 120),
          ownerFaculty.slice(0, 120),
          companyName.slice(0, 160),
          industry.slice(0, 120),
          scale.slice(0, 80),
          province.slice(0, 100),
          address.slice(0, 240),
          website.slice(0, 200),
          contactEmail.slice(0, 160),
          contactPhone.slice(0, 30),
          description.slice(0, 600),
          logoUrl,
          logoAspectRatio,
        ]
      );

      res.status(201).json({ business: mapBusinessRow(result.rows[0]) });
    } catch (err) {
      if (err instanceof UploadValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error('[businesses] POST error:', err);
      res.status(500).json({ error: 'Không thể đăng ký doanh nghiệp.' });
    }
  });

  app.put('/api/businesses/:id', requireAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      const existingRes = await pool.query(
        'SELECT * FROM businesses WHERE id = $1 LIMIT 1',
        [id]
      );
      const existing = existingRes.rows[0];
      if (!existing) {
        res.status(404).json({ error: 'Không tìm thấy hồ sơ doanh nghiệp.' });
        return;
      }
      if (existing.owner_uid !== req.user!.uid && !req.user!.isAdmin) {
        res.status(403).json({
          error: 'Bạn không có quyền chỉnh sửa doanh nghiệp này.',
        });
        return;
      }

      const b = req.body || {};
      const companyName = String(b.companyName || '').trim();
      const industry = String(b.industry || '').trim();
      const scale = String(b.scale || '').trim();
      const province = String(b.province || '').trim();
      const address = String(b.address || '').trim();
      const website = String(b.website || '').trim();
      const contactEmail = String(b.contactEmail || '').trim();
      const contactPhone = String(b.contactPhone || '').trim();
      const description = String(b.description || '').trim();
      const logoAspectRatio = VALID_LOGO_RATIOS.has(String(b.logoAspectRatio))
        ? String(b.logoAspectRatio)
        : existing.logo_aspect_ratio || '1:1';

      if (companyName.length < 2) {
        res.status(400).json({ error: 'Vui lòng nhập Tên doanh nghiệp.' });
        return;
      }
      if (!isValidHttpUrlOrEmpty(website)) {
        res.status(400).json({
          error:
            'Website doanh nghiệp phải để trống hoặc bắt đầu bằng http:// hoặc https://.',
        });
        return;
      }

      const logoUrl =
        b.logoUrl !== undefined
          ? await persistDataUrlIfNeeded(b.logoUrl, 'logo')
          : existing.logo_url || '';

      const result = await pool.query(
        `UPDATE businesses SET
           company_name = $1,
           industry = $2,
           scale = $3,
           province = $4,
           address = $5,
           website = $6,
           contact_email = $7,
           contact_phone = $8,
           description = $9,
           logo_url = $10,
           logo_aspect_ratio = $11,
           updated_at = NOW()
         WHERE id = $12
         RETURNING *`,
        [
          companyName.slice(0, 160),
          industry.slice(0, 120),
          scale.slice(0, 80),
          province.slice(0, 100),
          address.slice(0, 240),
          website.slice(0, 200),
          contactEmail.slice(0, 160),
          contactPhone.slice(0, 30),
          description.slice(0, 600),
          logoUrl,
          logoAspectRatio,
          id,
        ]
      );

      res.json({ business: mapBusinessRow(result.rows[0]) });
    } catch (err) {
      if (err instanceof UploadValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error('[businesses] PUT error:', err);
      res.status(500).json({ error: 'Không thể cập nhật doanh nghiệp.' });
    }
  });

  app.delete('/api/businesses/:id', requireAuth, async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      const existingRes = await pool.query(
        'SELECT owner_uid FROM businesses WHERE id = $1 LIMIT 1',
        [id]
      );
      const existing = existingRes.rows[0];
      if (!existing) {
        res.status(404).json({ error: 'Không tìm thấy doanh nghiệp.' });
        return;
      }
      if (existing.owner_uid !== req.user!.uid && !req.user!.isAdmin) {
        res.status(403).json({ error: 'Bạn không có quyền xóa doanh nghiệp này.' });
        return;
      }

      await pool.query('DELETE FROM businesses WHERE id = $1', [id]);
      await removePinnedId('businesses', id);
      res.json({ success: true });
    } catch (err) {
      console.error('[businesses] DELETE error:', err);
      res.status(500).json({ error: 'Không thể xóa doanh nghiệp.' });
    }
  });

  // ---------------- EVENTS ----------------
  app.get('/api/events', async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT e.*, COALESCE(rc.cnt, 0)::int AS registered_count
         FROM events e
         LEFT JOIN (
           SELECT event_id, COUNT(*)::int AS cnt
           FROM event_registrations
           GROUP BY event_id
         ) rc ON rc.event_id = e.id
         WHERE e.visibility = 'public'
         ORDER BY e.created_at DESC`
      );
      res.json({ events: result.rows.map(mapEventRow) });
    } catch (err) {
      console.error('[events] GET error:', err);
      res.status(500).json({ error: 'Không thể tải danh sách sự kiện.' });
    }
  });

  app.post('/api/events', requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const title = String(b.title || '').trim();
      const eventDate = String(b.eventDate || '').trim();
      const eventTime = String(b.eventTime || '').trim();
      const province = String(b.province || '').trim();
      const venue = String(b.venue || '').trim();
      const category = String(b.category || 'Sự kiện ALUMNI').trim();
      const capacity = Number(b.capacity);
      const summary = String(b.summary || '').trim();
      const organizer = String(
        b.organizer || 'Ban Điều hành Mạng lưới ALUMNI KTD'
      ).trim();
      const status = b.status === 'closed' ? 'closed' : 'open';
      const isGalaWithShirtFee = Boolean(b.isGalaWithShirtFee);

      if (title.length < 3) {
        res.status(400).json({ error: 'Tên sự kiện tối thiểu 3 ký tự.' });
        return;
      }
      if (!eventDate || !eventTime || !province || venue.length < 2) {
        res.status(400).json({
          error: 'Vui lòng nhập đầy đủ ngày, giờ, tỉnh/thành và địa điểm.',
        });
        return;
      }
      if (!Number.isFinite(capacity) || capacity < 1) {
        res.status(400).json({ error: 'Quy mô sự kiện phải lớn hơn 0.' });
        return;
      }
      if (summary.length < 5) {
        res.status(400).json({ error: 'Vui lòng nhập mô tả sự kiện.' });
        return;
      }

      const qrImageUrl = await persistDataUrlIfNeeded(b.qrImageUrl, 'qr');
      const customFields: EventCustomField[] = Array.isArray(b.customFields)
        ? b.customFields
        : [];
      const galaFeeAmount =
        b.galaFeeAmount !== undefined && b.galaFeeAmount !== null
          ? Math.max(0, Math.round(Number(b.galaFeeAmount) || 0))
          : isGalaWithShirtFee
            ? 350000
            : null;
      const shirtFeeAmount =
        b.shirtFeeAmount !== undefined && b.shirtFeeAmount !== null
          ? Math.max(0, Math.round(Number(b.shirtFeeAmount) || 0))
          : isGalaWithShirtFee
            ? 110000
            : null;

      const id = `evt-${crypto.randomUUID().slice(0, 8)}`;
      const result = await pool.query(
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
           $20::jsonb, 'public', $21
         ) RETURNING *`,
        [
          id,
          title.slice(0, 180),
          eventDate.slice(0, 40),
          eventTime.slice(0, 40),
          province.slice(0, 100),
          venue.slice(0, 200),
          category.slice(0, 80),
          Math.round(capacity),
          summary.slice(0, 800),
          organizer.slice(0, 140),
          status,
          isGalaWithShirtFee,
          qrImageUrl,
          String(b.bankName || '').trim().slice(0, 100),
          String(b.bankAccount || '').trim().slice(0, 60),
          String(b.bankAccountName || '').trim().slice(0, 120),
          galaFeeAmount,
          shirtFeeAmount,
          String(b.transferSyntaxPrefix || 'Gala').trim().slice(0, 80),
          JSON.stringify(customFields),
          req.user!.uid,
        ]
      );

      res.status(201).json({
        event: mapEventRow({ ...result.rows[0], registered_count: 0 }),
      });
    } catch (err) {
      if (err instanceof UploadValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error('[events] POST error:', err);
      res.status(500).json({ error: 'Không thể tạo sự kiện mới.' });
    }
  });

  app.put('/api/events/:id', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      const existingRes = await pool.query(
        'SELECT * FROM events WHERE id = $1 LIMIT 1',
        [id]
      );
      const existing = existingRes.rows[0];
      if (!existing) {
        res.status(404).json({ error: 'Không tìm thấy sự kiện.' });
        return;
      }

      const b = req.body || {};
      const title = String(b.title ?? existing.title).trim();
      const eventDate = String(b.eventDate ?? existing.event_date).trim();
      const eventTime = String(b.eventTime ?? existing.event_time).trim();
      const province = String(b.province ?? existing.province).trim();
      const venue = String(b.venue ?? existing.venue).trim();
      const category = String(b.category ?? existing.category).trim();
      const capacity =
        b.capacity !== undefined ? Number(b.capacity) : Number(existing.capacity);
      const summary = String(b.summary ?? existing.summary).trim();
      const organizer = String(b.organizer ?? existing.organizer).trim();
      const status =
        b.status === 'closed' || (b.status === undefined && existing.status === 'closed')
          ? 'closed'
          : 'open';
      const isGalaWithShirtFee =
        b.isGalaWithShirtFee !== undefined
          ? Boolean(b.isGalaWithShirtFee)
          : Boolean(existing.is_gala_with_shirt_fee);

      if (title.length < 3 || !Number.isFinite(capacity) || capacity < 1) {
        res.status(400).json({ error: 'Thông tin cập nhật sự kiện không hợp lệ.' });
        return;
      }

      const qrImageUrl =
        b.qrImageUrl !== undefined
          ? await persistDataUrlIfNeeded(b.qrImageUrl, 'qr')
          : existing.qr_image_url || '';

      const galaFeeAmount =
        b.galaFeeAmount !== undefined && b.galaFeeAmount !== null
          ? Math.max(0, Math.round(Number(b.galaFeeAmount) || 0))
          : existing.gala_fee_amount;
      const shirtFeeAmount =
        b.shirtFeeAmount !== undefined && b.shirtFeeAmount !== null
          ? Math.max(0, Math.round(Number(b.shirtFeeAmount) || 0))
          : existing.shirt_fee_amount;
      const customFields =
        b.customFields !== undefined
          ? Array.isArray(b.customFields)
            ? b.customFields
            : []
          : existing.custom_fields || [];

      await pool.query(
        `UPDATE events SET
           title = $1,
           event_date = $2,
           event_time = $3,
           province = $4,
           venue = $5,
           category = $6,
           capacity = $7,
           summary = $8,
           organizer = $9,
           status = $10,
           is_gala_with_shirt_fee = $11,
           qr_image_url = $12,
           bank_name = $13,
           bank_account = $14,
           bank_account_name = $15,
           gala_fee_amount = $16,
           shirt_fee_amount = $17,
           transfer_syntax_prefix = $18,
           custom_fields = $19::jsonb,
           updated_at = NOW()
         WHERE id = $20`,
        [
          title.slice(0, 180),
          eventDate.slice(0, 40),
          eventTime.slice(0, 40),
          province.slice(0, 100),
          venue.slice(0, 200),
          category.slice(0, 80),
          Math.round(capacity),
          summary.slice(0, 800),
          organizer.slice(0, 140),
          status,
          isGalaWithShirtFee,
          qrImageUrl,
          String(b.bankName ?? existing.bank_name ?? '').trim().slice(0, 100),
          String(b.bankAccount ?? existing.bank_account ?? '').trim().slice(0, 60),
          String(b.bankAccountName ?? existing.bank_account_name ?? '').trim().slice(0, 120),
          galaFeeAmount,
          shirtFeeAmount,
          String(b.transferSyntaxPrefix ?? existing.transfer_syntax_prefix ?? 'Gala')
            .trim()
            .slice(0, 80),
          JSON.stringify(customFields),
          id,
        ]
      );

      // Recalculate pending unpaid registrations if Gala/Shirt fees were updated
      if (
        isGalaWithShirtFee &&
        (b.galaFeeAmount !== undefined || b.shirtFeeAmount !== undefined)
      ) {
        const unitGala = typeof galaFeeAmount === 'number' ? galaFeeAmount : 350000;
        const unitShirt = typeof shirtFeeAmount === 'number' ? shirtFeeAmount : 110000;
        const regsRes = await pool.query(
          `SELECT uid, attend_gala, shirt_orders, custom_answers
           FROM event_registrations
           WHERE event_id = $1 AND btc_confirmed = FALSE AND payment_status = 'pending'`,
          [id]
        );
        for (const r of regsRes.rows) {
          const orders = Array.isArray(r.shirt_orders) ? r.shirt_orders : [];
          const qty = orders.reduce(
            (s: number, o: EventShirtOrder) => s + (Number(o.quantity) || 0),
            0
          );
          const nextTotal = (r.attend_gala ? unitGala : 0) + qty * unitShirt;
          const nextCustom = {
            ...(r.custom_answers || {}),
            total_fee_display: `${nextTotal.toLocaleString('vi-VN')} VNĐ`,
          };
          await pool.query(
            `UPDATE event_registrations
             SET total_fee = $1, custom_answers = $2::jsonb, updated_at = NOW()
             WHERE event_id = $3 AND uid = $4`,
            [nextTotal, JSON.stringify(nextCustom), id, r.uid]
          );
        }
      }

      const event = await fetchEventWithCount(id);
      res.json({ event });
    } catch (err) {
      if (err instanceof UploadValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error('[events] PUT error:', err);
      res.status(500).json({ error: 'Không thể cập nhật sự kiện.' });
    }
  });

  app.put('/api/events/:id/custom-fields', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      const rawFields = Array.isArray(req.body)
        ? req.body
        : req.body?.customFields ?? req.body?.fields;
      if (!Array.isArray(rawFields)) {
        res.status(400).json({ error: 'customFields phải là một mảng hợp lệ.' });
        return;
      }

      const updateRes = await pool.query(
        `UPDATE events SET custom_fields = $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING id`,
        [JSON.stringify(rawFields), id]
      );
      if (updateRes.rows.length === 0) {
        res.status(404).json({ error: 'Không tìm thấy sự kiện.' });
        return;
      }

      const event = await fetchEventWithCount(id);
      res.json({ event });
    } catch (err) {
      console.error('[events] PUT custom-fields error:', err);
      res.status(500).json({ error: 'Không thể cập nhật trường tùy chỉnh.' });
    }
  });

  app.delete('/api/events/:id', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      await pool.query('DELETE FROM events WHERE id = $1', [id]);
      await removePinnedId('events', id);
      res.json({ success: true });
    } catch (err) {
      console.error('[events] DELETE error:', err);
      res.status(500).json({ error: 'Không thể xóa sự kiện.' });
    }
  });

  // ---------------- EVENT REGISTRATIONS ----------------
  app.get('/api/events/:id/registrations', async (req, res) => {
    try {
      const eventId = String(req.params.id || '').trim();
      const result = await pool.query(
        `SELECT * FROM event_registrations WHERE event_id = $1 ORDER BY created_at DESC`,
        [eventId]
      );
      const isAdmin = Boolean(req.user?.isAdmin);
      const registrations = result.rows.map((row) =>
        isAdmin ? mapFullRegistrationRow(row) : mapPublicRegistrationRow(row)
      );
      res.json({ registrations });
    } catch (err) {
      console.error('[registrations] GET /api/events/:id/registrations error:', err);
      res.status(500).json({ error: 'Không thể tải danh sách đại biểu.' });
    }
  });

  app.get('/api/registrations/me', requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM event_registrations WHERE uid = $1 ORDER BY created_at DESC`,
        [req.user!.uid]
      );
      const registrations: Record<string, EventRegistrationRecord> = {};
      for (const row of result.rows) {
        registrations[row.event_id] = mapFullRegistrationRow(row);
      }
      res.json({ registrations });
    } catch (err) {
      console.error('[registrations] GET /api/registrations/me error:', err);
      res.status(500).json({ error: 'Không thể tải danh sách vé sự kiện của bạn.' });
    }
  });

  app.post('/api/events/:id/registrations', requireAuth, async (req, res) => {
    try {
      const eventId = String(req.params.id || '').trim();
      const eventRes = await pool.query(
        'SELECT * FROM events WHERE id = $1 LIMIT 1',
        [eventId]
      );
      const eventRow = eventRes.rows[0];
      if (!eventRow) {
        res.status(404).json({ error: 'Không tìm thấy sự kiện.' });
        return;
      }
      if (eventRow.status !== 'open') {
        res.status(400).json({
          error: 'Sự kiện đã đóng cổng đăng ký.',
        });
        return;
      }

      const existingRes = await pool.query(
        `SELECT * FROM event_registrations WHERE event_id = $1 AND uid = $2 LIMIT 1`,
        [eventId, req.user!.uid]
      );
      const existingReg = existingRes.rows[0];
      if (existingReg && !req.user!.isAdmin) {
        res.status(409).json({
          error:
            'Đăng ký của bạn đã được chốt trên hệ thống. Vui lòng liên hệ Ban Điều hành (Admin 1) để được hỗ trợ điều chỉnh.',
        });
        return;
      }

      if (!existingReg) {
        const countRes = await pool.query<{ cnt: number }>(
          'SELECT COUNT(*)::int AS cnt FROM event_registrations WHERE event_id = $1',
          [eventId]
        );
        if ((countRes.rows[0]?.cnt ?? 0) >= Number(eventRow.capacity || 100)) {
          res.status(400).json({
            error: 'Sự kiện đã đạt số lượng đại biểu tối đa.',
          });
          return;
        }
      }

      const b = req.body || {};
      const shirtValidation = validateAndNormalizeShirtOrders(b.shirtOrders);
      if (shirtValidation.valid === false) {
        res.status(400).json({ error: shirtValidation.error });
        return;
      }

      const memberRes = await pool.query(
        'SELECT * FROM members WHERE uid = $1 LIMIT 1',
        [req.user!.uid]
      );
      const member = memberRes.rows[0];

      const fullName = String(
        b.payerName ||
          b.fullName ||
          member?.full_name ||
          req.user!.displayName ||
          'Cựu sinh viên KTD'
      )
        .trim()
        .slice(0, 120);
      const faculty = String(
        b.faculty || member?.faculty || 'Khoa Kiến trúc'
      )
        .trim()
        .slice(0, 120);
      const graduationYear = String(
        b.graduationYear || member?.graduation_year || ''
      )
        .trim()
        .slice(0, 20);
      const rawCustom =
        b.customAnswers && typeof b.customAnswers === 'object'
          ? { ...(b.customAnswers as Record<string, unknown>) }
          : {};
      const className = String(
        b.className || member?.class_name || rawCustom.className || ''
      )
        .trim()
        .slice(0, 60);
      const workplace = String(
        b.workplace || member?.workplace || rawCustom.workplace || ''
      )
        .trim()
        .slice(0, 160);
      const province = String(
        b.province ||
          member?.current_province ||
          rawCustom.province ||
          'Thành phố Đà Nẵng'
      )
        .trim()
        .slice(0, 100);
      const note = String(b.note || '').trim().slice(0, 300);

      const attendGala: boolean | undefined = eventRow.is_gala_with_shirt_fee
        ? b.attendGala !== undefined
          ? Boolean(b.attendGala)
          : true
        : b.attendGala !== undefined
          ? Boolean(b.attendGala)
          : undefined;

      const totalFee = computeServerRegistrationFee(
        eventRow,
        attendGala,
        shirtValidation.orders
      );
      const paymentStatus: 'pending' | 'completed' =
        totalFee > 0 ? 'pending' : 'completed';

      const payerPhone = String(
        b.payerPhone ||
          rawCustom.payerPhone ||
          rawCustom.phone ||
          member?.zalo_phone ||
          ''
      )
        .trim()
        .slice(0, 30);

      if (payerPhone) {
        rawCustom.payerPhone = payerPhone;
        rawCustom.phone = payerPhone;
      }
      if (className) rawCustom.className = className;
      if (workplace) rawCustom.workplace = workplace;
      if (province) rawCustom.province = province;
      if (eventRow.is_gala_with_shirt_fee) {
        const unitGala =
          typeof eventRow.gala_fee_amount === 'number'
            ? eventRow.gala_fee_amount
            : 350000;
        rawCustom.cf_attend_gala = attendGala
          ? `Có tham gia Đêm Gala (${unitGala.toLocaleString('vi-VN')} VNĐ)`
          : 'Không tham gia Gala (0 VNĐ)';
        rawCustom.cf_uniform_shirt =
          shirtValidation.orders.length > 0
            ? shirtValidation.orders
                .map((s) => `Form ${s.gender} · Size ${s.size} (SL: ${s.quantity})`)
                .join(', ')
            : 'Không đặt áo';
        rawCustom.total_fee_display = `${totalFee.toLocaleString('vi-VN')} VNĐ`;
      }

      const result = await pool.query(
        `INSERT INTO event_registrations (
           event_id, uid, full_name, email, faculty, graduation_year,
           class_name, workplace, province, note, custom_answers,
           attend_gala, shirt_orders, total_fee, payment_status,
           btc_confirmed, btc_confirmed_at, btc_confirmed_by
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10, $11::jsonb,
           $12, $13::jsonb, $14, $15,
           FALSE, NULL, ''
         )
         ON CONFLICT (event_id, uid) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           faculty = EXCLUDED.faculty,
           graduation_year = EXCLUDED.graduation_year,
           class_name = EXCLUDED.class_name,
           workplace = EXCLUDED.workplace,
           province = EXCLUDED.province,
           note = EXCLUDED.note,
           custom_answers = EXCLUDED.custom_answers,
           attend_gala = EXCLUDED.attend_gala,
           shirt_orders = EXCLUDED.shirt_orders,
           total_fee = EXCLUDED.total_fee,
           payment_status = EXCLUDED.payment_status,
           btc_confirmed = FALSE,
           btc_confirmed_at = NULL,
           btc_confirmed_by = '',
           updated_at = NOW()
         RETURNING *`,
        [
          eventId,
          req.user!.uid,
          fullName,
          req.user!.email.slice(0, 160),
          faculty,
          graduationYear,
          className,
          workplace,
          province,
          note,
          JSON.stringify(rawCustom),
          attendGala ?? null,
          JSON.stringify(shirtValidation.orders),
          totalFee,
          paymentStatus,
        ]
      );

      res.status(201).json({
        registration: mapFullRegistrationRow(result.rows[0]),
      });
    } catch (err) {
      console.error('[registrations] POST error:', err);
      res.status(500).json({ error: 'Không thể hoàn tất đăng ký sự kiện.' });
    }
  });

  app.patch(
    '/api/events/:id/registrations/:uid',
    requireAuth,
    async (req, res) => {
      try {
        const eventId = String(req.params.id || '').trim();
        const targetUid = String(req.params.uid || '').trim();
        const b = req.body || {};

        if (b.btcConfirmed !== undefined && req.user!.adminRole !== 'admin2') {
          res.status(403).json({
            error:
              'Chỉ tài khoản Ban Tổ Chức (Admin 2) mới có quyền xác nhận BTC đã nhận.',
          });
          return;
        }

        const hasFieldEdits =
          b.attendGala !== undefined ||
          b.shirtOrders !== undefined ||
          b.paymentStatus !== undefined ||
          b.note !== undefined;

        if ((hasFieldEdits || b.btcConfirmed === undefined) && !req.user!.isAdmin) {
          res.status(403).json({
            error: 'Chỉ Quản trị viên mới có quyền điều chỉnh đăng ký.',
          });
          return;
        }

        const eventRes = await pool.query(
          'SELECT * FROM events WHERE id = $1 LIMIT 1',
          [eventId]
        );
        const eventRow = eventRes.rows[0];
        if (!eventRow) {
          res.status(404).json({ error: 'Không tìm thấy sự kiện.' });
          return;
        }

        const existingRes = await pool.query(
          `SELECT * FROM event_registrations WHERE event_id = $1 AND uid = $2 LIMIT 1`,
          [eventId, targetUid]
        );
        const existing = existingRes.rows[0];
        if (!existing) {
          res.status(404).json({ error: 'Không tìm thấy đơn đăng ký của đại biểu.' });
          return;
        }

        let nextShirtOrders: EventShirtOrder[] = Array.isArray(
          existing.shirt_orders
        )
          ? existing.shirt_orders
          : [];
        if (b.shirtOrders !== undefined) {
          const shirtValidation = validateAndNormalizeShirtOrders(b.shirtOrders);
          if (shirtValidation.valid === false) {
            res.status(400).json({ error: shirtValidation.error });
            return;
          }
          nextShirtOrders = shirtValidation.orders;
        }

        const nextAttendGala: boolean | null =
          b.attendGala !== undefined
            ? Boolean(b.attendGala)
            : typeof existing.attend_gala === 'boolean'
              ? existing.attend_gala
              : eventRow.is_gala_with_shirt_fee
                ? true
                : null;

        const nextTotalFee = eventRow.is_gala_with_shirt_fee
          ? computeServerRegistrationFee(
              eventRow,
              nextAttendGala ?? undefined,
              nextShirtOrders
            )
          : Number(existing.total_fee) || 0;

        const nextBtcConfirmed =
          b.btcConfirmed !== undefined
            ? Boolean(b.btcConfirmed)
            : Boolean(existing.btc_confirmed);
        const nextBtcConfirmedAt =
          b.btcConfirmed !== undefined
            ? nextBtcConfirmed
              ? new Date()
              : null
            : existing.btc_confirmed_at;
        const nextBtcConfirmedBy =
          b.btcConfirmed !== undefined
            ? nextBtcConfirmed
              ? req.user!.email
              : ''
            : existing.btc_confirmed_by || '';

        let nextPaymentStatus: 'pending' | 'completed';
        if (b.paymentStatus === 'pending' || b.paymentStatus === 'completed') {
          nextPaymentStatus = b.paymentStatus;
        } else if (b.btcConfirmed !== undefined) {
          nextPaymentStatus = nextBtcConfirmed
            ? 'completed'
            : nextTotalFee > 0
              ? 'pending'
              : 'completed';
        } else {
          nextPaymentStatus =
            existing.payment_status === 'completed'
              ? 'completed'
              : nextTotalFee > 0
                ? 'pending'
                : 'completed';
        }

        const nextNote =
          b.note !== undefined
            ? String(b.note).trim().slice(0, 300)
            : existing.note || '';

        const nextCustomAnswers: Record<string, unknown> = {
          ...(existing.custom_answers || {}),
        };
        if (eventRow.is_gala_with_shirt_fee) {
          const unitGala =
            typeof eventRow.gala_fee_amount === 'number'
              ? eventRow.gala_fee_amount
              : 350000;
          nextCustomAnswers.cf_attend_gala = nextAttendGala
            ? `Có tham gia Đêm Gala (${unitGala.toLocaleString('vi-VN')} VNĐ)`
            : 'Không tham gia Gala (0 VNĐ)';
          nextCustomAnswers.cf_uniform_shirt =
            nextShirtOrders.length > 0
              ? nextShirtOrders
                  .map((s) => `Form ${s.gender} · Size ${s.size} (SL: ${s.quantity})`)
                  .join(', ')
              : 'Không đặt áo';
          nextCustomAnswers.total_fee_display = `${nextTotalFee.toLocaleString('vi-VN')} VNĐ`;
        }
        nextCustomAnswers.btcConfirmed = nextBtcConfirmed;
        nextCustomAnswers.btcConfirmedAt = nextBtcConfirmedAt
          ? nextBtcConfirmedAt instanceof Date
            ? nextBtcConfirmedAt.toISOString()
            : String(nextBtcConfirmedAt)
          : '';
        nextCustomAnswers.btcConfirmedBy = nextBtcConfirmedBy;

        const updated = await pool.query(
          `UPDATE event_registrations SET
             attend_gala = $1,
             shirt_orders = $2::jsonb,
             total_fee = $3,
             payment_status = $4,
             btc_confirmed = $5,
             btc_confirmed_at = $6,
             btc_confirmed_by = $7,
             note = $8,
             custom_answers = $9::jsonb,
             updated_at = NOW()
           WHERE event_id = $10 AND uid = $11
           RETURNING *`,
          [
            nextAttendGala,
            JSON.stringify(nextShirtOrders),
            nextTotalFee,
            nextPaymentStatus,
            nextBtcConfirmed,
            nextBtcConfirmedAt,
            nextBtcConfirmedBy,
            nextNote,
            JSON.stringify(nextCustomAnswers),
            eventId,
            targetUid,
          ]
        );

        res.json({
          registration: mapFullRegistrationRow(updated.rows[0]),
        });
      } catch (err) {
        console.error('[registrations] PATCH error:', err);
        res.status(500).json({ error: 'Không thể cập nhật đơn đăng ký.' });
      }
    }
  );

  app.delete(
    '/api/events/:id/registrations/:uid',
    requireAdmin,
    async (req, res) => {
      try {
        const eventId = String(req.params.id || '').trim();
        const targetUid = String(req.params.uid || '').trim();
        await pool.query(
          `DELETE FROM event_registrations WHERE event_id = $1 AND uid = $2`,
          [eventId, targetUid]
        );
        res.json({ success: true });
      } catch (err) {
        console.error('[registrations] DELETE single error:', err);
        res.status(500).json({ error: 'Không thể xóa đại biểu khỏi sự kiện.' });
      }
    }
  );

  app.delete(
    '/api/events/:id/registrations',
    requireAdmin,
    async (req, res) => {
      const eventId = String(req.params.id || '').trim();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `DELETE FROM event_registrations WHERE event_id = $1`,
          [eventId]
        );
        await client.query('COMMIT');
        res.json({ success: true });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[registrations] DELETE reset error:', err);
        res.status(500).json({
          error: 'Không thể làm mới danh sách đăng ký sự kiện.',
        });
      } finally {
        client.release();
      }
    }
  );

  // ---------------- PINNED SETTINGS ----------------
  app.get('/api/settings/pinned', async (_req, res) => {
    try {
      const result = await pool.query<{ value: Record<string, unknown> }>(
        `SELECT value FROM app_settings WHERE key = 'pinned' LIMIT 1`
      );
      const val = result.rows[0]?.value || {};
      const pinned = {
        events: Array.isArray(val.events) ? val.events : ['evt-gala-can-bo-doan'],
        businesses: Array.isArray(val.businesses) ? val.businesses : [],
        executives: Array.isArray(val.executives) ? val.executives : [],
        members: Array.isArray(val.members) ? val.members : [],
      };
      res.json({ pinned });
    } catch (err) {
      console.error('[settings] GET pinned error:', err);
      res.status(500).json({ error: 'Không thể tải cấu hình ghim.' });
    }
  });

  app.put('/api/settings/pinned', requireAdmin, async (req, res) => {
    try {
      const b = req.body || {};
      const sanitizeList = (arr: unknown): string[] =>
        Array.isArray(arr)
          ? Array.from(
              new Set(
                arr
                  .filter((item): item is string => typeof item === 'string')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            ).slice(0, 100)
          : [];

      const pinned = {
        events: sanitizeList(b.events),
        businesses: sanitizeList(b.businesses),
        executives: sanitizeList(b.executives),
        members: sanitizeList(b.members),
      };

      await pool.query(
        `INSERT INTO app_settings (key, value, updated_by, updated_at)
         VALUES ('pinned', $1::jsonb, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
        [JSON.stringify(pinned), req.user!.email]
      );

      res.json({ pinned });
    } catch (err) {
      console.error('[settings] PUT pinned error:', err);
      res.status(500).json({ error: 'Không thể lưu cấu hình ghim.' });
    }
  });

  // ---------------- EMAILS ----------------
  const emailSendLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req: Request) =>
      req.user?.uid ? `user:${req.user.uid}` : 'anon',
    message: {
      error:
        'Bạn đã gửi quá nhiều email trong 1 phút. Vui lòng đợi một lát rồi thử lại.',
    },
  });

  app.get('/api/emails', requireAuth, async (req, res) => {
    try {
      const result = req.user!.isAdmin
        ? await pool.query(
            `SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 200`
          )
        : await pool.query(
            `SELECT * FROM email_logs
             WHERE LOWER(recipient_email) = LOWER($1) OR user_uid = $2
             ORDER BY sent_at DESC
             LIMIT 200`,
            [req.user!.email, req.user!.uid]
          );

      const emails: EmailNotificationRecord[] = result.rows.map((row) => ({
        id: row.id,
        to: row.recipient_email,
        recipientName: row.recipient_name || undefined,
        senderName: row.sender_name || undefined,
        subject: row.subject,
        category: row.category,
        sentAt:
          row.sent_at instanceof Date
            ? row.sent_at.toISOString()
            : String(row.sent_at),
        bodyLines: Array.isArray(row.body_lines) ? row.body_lines : [],
        htmlContent: row.html_content || undefined,
        messageId: row.message_id || undefined,
        deliveryMode: row.delivery_mode || 'internal_relay',
      }));

      res.json({ emails });
    } catch (err) {
      console.error('[emails] GET error:', err);
      res.status(500).json({ error: 'Không thể tải hộp thư thông báo.' });
    }
  });

  app.post('/api/send-email', requireAuth, emailSendLimiter, async (req, res) => {
    try {
      const {
        to,
        recipients,
        recipientName,
        senderName,
        subject,
        category,
        bodyLines,
        memberProfile,
        icsContent,
        icsFilename,
      } = req.body || {};

      const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
      if (!cleanSubject || cleanSubject.length > 240) {
        res.status(400).json({
          success: false,
          error: 'Tiêu đề thư (subject) không hợp lệ.',
        });
        return;
      }

      const rawTargets: string[] = Array.isArray(recipients)
        ? recipients
            .filter((r: unknown): r is string => typeof r === 'string')
            .map((s) => s.trim())
            .filter(Boolean)
        : typeof to === 'string' && to.trim()
          ? [to.trim()]
          : [];

      if (rawTargets.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Thiếu địa chỉ email người nhận (to).',
        });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const addr of rawTargets) {
        if (!emailRegex.test(addr) || addr.length > 160) {
          res.status(400).json({
            success: false,
            error: `Địa chỉ email người nhận không hợp lệ: ${addr}`,
          });
          return;
        }
      }

      if (!req.user!.isAdmin) {
        const ownEmail = req.user!.email.trim().toLowerCase();
        if (
          rawTargets.length !== 1 ||
          rawTargets[0].toLowerCase() !== ownEmail
        ) {
          res.status(403).json({
            success: false,
            error:
              'Thành viên chỉ được phép gửi email xác nhận về địa chỉ email của chính mình.',
          });
          return;
        }
      } else if (rawTargets.length > 500) {
        res.status(400).json({
          success: false,
          error: 'Số lượng người nhận mỗi lần gửi tối đa là 500.',
        });
        return;
      }

      const safeBodyLines: string[] = Array.isArray(bodyLines)
        ? bodyLines
            .slice(0, 200)
            .map((line: unknown) => String(line ?? '').slice(0, 2000))
        : [];
      const cleanCategory =
        typeof category === 'string' && category.trim()
          ? category.trim().slice(0, 60)
          : 'MEMBER_CONFIRM';

      const senderFrom =
        process.env.SMTP_FROM ||
        '"Ban Điều hành Mạng lưới CSV KTD" <alumni@ktd.edu.vn>';
      const transporter = getConfiguredSmtpTransporter();
      const textContent = safeBodyLines.join('\n\n');
      const attachments =
        typeof icsContent === 'string' &&
        icsContent.trim() &&
        typeof icsFilename === 'string' &&
        icsFilename.trim()
          ? [
              {
                filename: pathSafeFilename(icsFilename),
                content: icsContent,
                contentType: 'text/calendar; charset=utf-8',
              },
            ]
          : undefined;

      const results: Array<{
        to: string;
        messageId: string;
        deliveryMode: 'smtp' | 'smtp_failed' | 'internal_relay';
        htmlContent: string;
        sentAt: string;
      }> = [];

      for (const recipientEmail of rawTargets) {
        const htmlContent = buildOfficialDauHtmlEmail({
          subject: cleanSubject,
          to: recipientEmail,
          category: cleanCategory,
          bodyLines: safeBodyLines,
          memberProfile,
        });

        let messageId = `<alumni-ktd-${Date.now()}-${crypto.randomUUID().slice(0, 6)}@ktd.edu.vn>`;
        let deliveryMode: 'smtp' | 'smtp_failed' | 'internal_relay' =
          'internal_relay';

        if (transporter) {
          try {
            const info = await transporter.sendMail({
              from: senderFrom,
              replyTo: 'alumni@ktd.edu.vn',
              to: recipientEmail,
              subject: cleanSubject,
              text: textContent,
              html: htmlContent,
              attachments,
            });
            deliveryMode = 'smtp';
            if (info?.messageId) {
              messageId = info.messageId;
            }
          } catch (smtpErr) {
            deliveryMode = 'smtp_failed';
            console.warn(
              '[smtp] Outbound dispatch failed:',
              smtpErr instanceof Error ? smtpErr.message : String(smtpErr)
            );
          }
        }

        const sentAtIso = new Date().toISOString();
        const logId = `mail-${crypto.randomUUID().slice(0, 12)}`;
        const targetUid =
          recipientEmail.toLowerCase() === req.user!.email.toLowerCase()
            ? req.user!.uid
            : null;

        await pool.query(
          `INSERT INTO email_logs (
             id, user_uid, recipient_email, recipient_name, sender_name,
             subject, category, body_lines, html_content, message_id,
             delivery_mode, sent_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8::jsonb, $9, $10,
             $11, $12
           )`,
          [
            logId,
            targetUid,
            recipientEmail,
            typeof recipientName === 'string' ? recipientName.slice(0, 120) : null,
            typeof senderName === 'string'
              ? senderName.slice(0, 140)
              : req.user!.displayName,
            cleanSubject,
            cleanCategory,
            JSON.stringify(safeBodyLines),
            htmlContent,
            messageId,
            deliveryMode,
            sentAtIso,
          ]
        );

        results.push({
          to: recipientEmail,
          messageId,
          deliveryMode,
          htmlContent,
          sentAt: sentAtIso,
        });
      }

      const first = results[0];
      res.json({
        success: true,
        messageId: first.messageId,
        accepted: rawTargets,
        deliveryMode: first.deliveryMode,
        previewUrl: null,
        htmlContent: first.htmlContent,
        sentAt: first.sentAt,
        ...(results.length > 1 ? { results } : {}),
      });
    } catch (err) {
      console.error('[emails] POST /api/send-email error:', err);
      res.status(500).json({
        success: false,
        error: 'Không thể gửi hoặc lưu thông báo email.',
      });
    }
  });
}

function pathSafeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'event.ics';
}
