import crypto from 'crypto';
import type { Express } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from './auth';

export type UploadCategory = 'avatar' | 'logo' | 'qr';

const MAX_DECODED_BYTES = 500 * 1024;
const MAX_BASE64_CHARS = 720 * 1024;

const CATEGORY_DIR_MAP: Record<UploadCategory, string> = {
  avatar: 'avatars',
  logo: 'logos',
  qr: 'qr',
};

export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), 'uploads');
}

export async function ensureUploadDirs(): Promise<void> {
  const root = getUploadRoot();
  await Promise.all(
    Object.values(CATEGORY_DIR_MAP).map((sub) =>
      fs.mkdir(path.join(root, sub), { recursive: true })
    )
  );
}

export class UploadValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'UploadValidationError';
    this.statusCode = statusCode;
  }
}

function normalizeCategory(raw: unknown): UploadCategory | null {
  if (raw === 'avatar' || raw === 'avatars') return 'avatar';
  if (raw === 'logo' || raw === 'logos') return 'logo';
  if (raw === 'qr') return 'qr';
  return null;
}

function detectImageExtension(buf: Buffer): 'webp' | 'jpg' | 'png' | null {
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }
  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }
  return null;
}

export async function saveDataUrlImage(
  dataUrl: string,
  category: UploadCategory
): Promise<string> {
  const trimmed = dataUrl.trim();
  if (trimmed.length > MAX_BASE64_CHARS) {
    throw new UploadValidationError(
      'Dung lượng ảnh vượt quá giới hạn tối đa 500 KB.'
    );
  }

  const match = /^data:(image\/(?:webp|jpeg|jpg|png));base64,([A-Za-z0-9+/=\s]+)$/i.exec(
    trimmed
  );
  if (!match) {
    throw new UploadValidationError(
      'Định dạng ảnh không hợp lệ. Chỉ chấp nhận WebP, JPEG hoặc PNG (base64).'
    );
  }

  const base64Body = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Body, 'base64');

  if (buffer.length === 0 || buffer.length > MAX_DECODED_BYTES) {
    throw new UploadValidationError(
      'Kích thước ảnh sau giải mã phải lớn hơn 0 và không vượt quá 500 KB.'
    );
  }

  const ext = detectImageExtension(buffer);
  if (!ext) {
    throw new UploadValidationError(
      'Nội dung tệp ảnh không hợp lệ (chỉ hỗ trợ chữ ký WebP, JPEG, PNG).'
    );
  }

  const dirName = CATEGORY_DIR_MAP[category];
  const targetDir = path.join(getUploadRoot(), dirName);
  await fs.mkdir(targetDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${ext}`;
  const fullPath = path.join(targetDir, filename);
  await fs.writeFile(fullPath, buffer);

  return `/uploads/${dirName}/${filename}`;
}

export async function persistDataUrlIfNeeded(
  val: string | undefined | null,
  category: UploadCategory
): Promise<string> {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:')) {
    return saveDataUrlImage(trimmed, category);
  }

  if (trimmed.startsWith('/uploads/')) {
    if (trimmed.includes('..') || trimmed.includes('\\') || trimmed.length > 300) {
      throw new UploadValidationError('Đường dẫn tệp tải lên không hợp lệ.');
    }
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return trimmed.slice(0, 500);
      }
    } catch {
      throw new UploadValidationError('URL ảnh không hợp lệ.');
    }
  }

  throw new UploadValidationError(
    'Giá trị ảnh không hợp lệ (chỉ chấp nhận data:image WebP/JPEG/PNG hoặc URL /uploads/...).'
  );
}

export function registerUploadRoutes(app: Express): void {
  app.post('/api/uploads/image', requireAuth, async (req, res) => {
    try {
      const category = normalizeCategory(req.body?.category);
      if (!category) {
        res.status(400).json({
          error: 'Danh mục ảnh phải là avatar, logo hoặc qr.',
        });
        return;
      }

      const dataUrl = req.body?.dataUrl;
      if (typeof dataUrl !== 'string' || !dataUrl.trim()) {
        res.status(400).json({ error: 'Thiếu dữ liệu ảnh (dataUrl).' });
        return;
      }

      const url = await saveDataUrlImage(dataUrl, category);
      res.json({ url });
    } catch (err) {
      if (err instanceof UploadValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error('[uploads] Error saving image:', err);
      res.status(500).json({ error: 'Không thể lưu tệp ảnh lên máy chủ.' });
    }
  });
}
