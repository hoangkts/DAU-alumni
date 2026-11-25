import {
  BusinessRecord,
  EmailNotificationRecord,
  EventCustomField,
  EventRecord,
  EventShirtOrder,
  ExecutiveRecord,
  FACULTY_MAJORS_MAP,
  MemberProfileRecord,
  VIETNAM_34_PROVINCES_2025,
} from '../data/constants';

export interface MemberFormInput {
  email: string;
  fullName: string;
  birthDate: string;
  className: string;
  enrollmentYear: string;
  graduationYear: string;
  faculty: string;
  major: string;
  currentProvince: string;
  workplace: string;
  workplaceProvince: string;
  zaloPhone?: string;
  avatarUrl?: string;
}

export interface BusinessFormInput {
  companyName: string;
  industry: string;
  scale: string;
  province: string;
  address: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  logoUrl?: string;
  logoAspectRatio?: '1:1' | '3:4' | '4:3' | '16:9' | 'free';
}

export interface EventFormInput {
  title: string;
  eventDate: string;
  eventTime: string;
  province: string;
  venue: string;
  category: string;
  capacity: number;
  summary: string;
  organizer: string;
  status?: 'open' | 'closed';
  isGalaWithShirtFee?: boolean;
  customFields?: EventCustomField[];
  qrImageUrl?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  galaFeeAmount?: number;
  shirtFeeAmount?: number;
  transferSyntaxPrefix?: string;
}

/**
 * Trả về danh sách Ngành phụ thuộc vào Khoa đã chọn
 */
export function getMajorsByFaculty(faculty: string): string[] {
  if (!faculty || !FACULTY_MAJORS_MAP[faculty]) {
    return [];
  }
  return FACULTY_MAJORS_MAP[faculty];
}

/**
 * Kiểm tra cặp Khoa và Ngành có hợp lệ theo danh mục đào tạo KTD hay không
 */
export function isValidFacultyMajorPair(faculty: string, major: string): boolean {
  const majors = getMajorsByFaculty(faculty);
  return majors.includes(major);
}

/**
 * Kiểm tra tỉnh/thành có nằm trong danh sách 34 tỉnh thành mới sau sáp nhập 2025
 */
export function isValidVietnam2025Province(province: string): boolean {
  return VIETNAM_34_PROVINCES_2025.includes(province);
}

/**
 * Kiểm tra tài khoản đã đủ điều kiện xác nhận là Thành viên Mạng lưới ALUMNI KTD:
 * Đã cập nhật thông tin cá nhân thiết yếu (Họ tên, Lớp, Khoa, Ngành, SĐT) VÀ có ảnh đại diện (Avatar).
 */
export function isConfirmedNetworkMember(
  profile?: MemberProfileRecord | null
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.fullName &&
      profile.fullName.trim().length >= 2 &&
      profile.className &&
      profile.className.trim().length >= 1 &&
      profile.faculty &&
      profile.faculty.trim().length >= 2 &&
      profile.major &&
      profile.major.trim().length >= 2 &&
      profile.zaloPhone &&
      profile.zaloPhone.replace(/[\s.\-()]/g, '').length >= 9 &&
      profile.avatarUrl &&
      profile.avatarUrl.trim().length >= 5
  );
}

/**
 * Xác thực dữ liệu cập nhật thông tin cá nhân thành viên Mạng lưới ALUMNI KTD
 * Bắt buộc đầy đủ thông tin cá nhân + ảnh đại diện (Avatar) để xác nhận Thành viên Mạng lưới
 */
export function validateMemberForm(input: MemberFormInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.email || !input.email.includes('@')) {
    errors.email = 'Địa chỉ email từ tài khoản Google không hợp lệ.';
  }
  if (!input.avatarUrl || input.avatarUrl.trim().length < 5) {
    errors.avatarUrl =
      'Vui lòng tải lên ảnh đại diện (Avatar) để xác nhận thành viên mạng lưới (*).';
  }
  if (!input.fullName || input.fullName.trim().length < 2) {
    errors.fullName = 'Vui lòng nhập Họ và tên đầy đủ (*).';
  }
  if (!input.birthDate || input.birthDate.trim().length < 4) {
    errors.birthDate = 'Vui lòng chọn Ngày tháng năm sinh (*).';
  }
  if (!input.className || input.className.trim().length < 1) {
    errors.className = 'Vui lòng nhập Lớp sinh hoạt (*), ví dụ: 10KT1.';
  }
  if (!input.faculty || !FACULTY_MAJORS_MAP[input.faculty]) {
    errors.faculty = 'Vui lòng chọn Khoa đào tạo (*).';
  }
  if (!input.major || !isValidFacultyMajorPair(input.faculty, input.major)) {
    errors.major = 'Vui lòng chọn Ngành đào tạo thuộc Khoa đã chọn (*).';
  }
  if (!input.currentProvince || !isValidVietnam2025Province(input.currentProvince)) {
    errors.currentProvince = 'Vui lòng chọn Nơi ở hiện nay từ 34 tỉnh/thành phố mới (*).';
  }
  if (input.workplaceProvince && !isValidVietnam2025Province(input.workplaceProvince)) {
    errors.workplaceProvince = 'Nơi công tác phải thuộc danh sách 34 tỉnh/thành phố mới.';
  }
  if (!input.zaloPhone || input.zaloPhone.trim().length === 0) {
    errors.zaloPhone = 'Vui lòng nhập Zalo / Số điện thoại (*).';
  } else {
    const cleanPhone = input.zaloPhone.replace(/[\s.\-()]/g, '');
    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      errors.zaloPhone = 'Số điện thoại Zalo chưa đúng định dạng (Ví dụ: 0905123456 hoặc 038...).';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Chuyển đổi số điện thoại thành mã quốc tế 84 (ví dụ 0919132858 -> 84919132858)
 */
export function normalizePhoneTo84(phone?: string): string | null {
  if (!phone) return null;
  const clean = phone.replace(/[\s.\-()]/g, '');
  if (!clean) return null;
  if (clean.startsWith('+84')) return clean.slice(1);
  if (clean.startsWith('84')) return clean;
  if (clean.startsWith('0')) return '84' + clean.slice(1);
  return clean;
}

/**
 * Định dạng số điện thoại đẹp mắt để hiển thị (ví dụ 0919 132 858)
 */
export function formatPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const clean = phone.replace(/[\s.\-()]/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  if (clean.length === 11 && clean.startsWith('84')) {
    return `+84 ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8)}`;
  }
  return phone;
}

/**
 * Tạo deep link mở trực tiếp ứng dụng Zalo (Zalo PC hoặc Zalo Mobile)
 * Giao thức zalo://conversation?phone=84... mở thẳng cuộc hội thoại với thành viên
 * hoàn toàn không bị chuyển hướng sang trang quét mã QR đăng nhập của Zalo Web
 */
export function buildZaloDeepLink(phone?: string): string | null {
  const p84 = normalizePhoneTo84(phone);
  if (!p84) return null;
  return `zalo://conversation?phone=${p84}`;
}

/**
 * Tạo đường dẫn Zalo Web (zalo.me) dự phòng
 */
export function buildZaloWebUrl(phone?: string): string | null {
  if (!phone) return null;
  const clean = phone.replace(/[\s.\-()]/g, '');
  if (!clean) return null;
  const normalized = clean.startsWith('+84') ? '0' + clean.slice(3) : clean;
  return `https://zalo.me/${normalized}`;
}

/**
 * Tạo đường dẫn mở trực tiếp cuộc trò chuyện Zalo 1-chạm
 * Ưu tiên deep link mở thẳng ứng dụng Zalo, tránh trang web QR code
 */
export function buildZaloChatUrl(phone?: string): string | null {
  return buildZaloDeepLink(phone) || buildZaloWebUrl(phone);
}

/**
 * Định dạng số điện thoại bảo mật thông tin cá nhân: chỉ hiển thị 4 số cuối
 * Ví dụ: "0905128689" -> "••••••8689"
 */
export function maskPhoneKeepLast4(phone?: string): string {
  if (!phone) return '';
  const clean = phone.replace(/[\s.\-()]/g, '');
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `••••••${last4}`;
}

/**
 * Xác thực đăng ký doanh nghiệp trên Cộng đồng doanh nghiệp ALUMNI KTD
 * Bắt buộc cá nhân đã đăng ký tài khoản cá nhân trên Mạng lưới ALUMNI KTD
 */
export function validateBusinessForm(
  input: BusinessFormInput,
  hasRegisteredMemberProfile: boolean
): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!hasRegisteredMemberProfile) {
    errors.memberGate =
      'Chỉ Thành viên Mạng lưới đã xác nhận (đăng nhập Google, cập nhật đầy đủ thông tin cá nhân và có ảnh đại diện Avatar) mới được đăng ký tham gia Cộng đồng Doanh nghiệp.';
  }
  if (!input.companyName || input.companyName.trim().length < 2) {
    errors.companyName = 'Vui lòng nhập Tên doanh nghiệp (*).';
  }
  if (!input.industry || input.industry.trim().length < 2) {
    errors.industry = 'Vui lòng chọn Lĩnh vực hoạt động (*).';
  }
  if (!input.scale || input.scale.trim().length < 2) {
    errors.scale = 'Vui lòng chọn Quy mô doanh nghiệp (*).';
  }
  if (!input.province || !isValidVietnam2025Province(input.province)) {
    errors.province = 'Vui lòng chọn Địa điểm (Tỉnh/Thành phố) từ 34 tỉnh thành (*).';
  }
  if (!input.contactEmail || !input.contactEmail.includes('@')) {
    errors.contactEmail = 'Vui lòng nhập Email liên hệ hợp lệ (*).';
  }
  if (!input.contactPhone || input.contactPhone.trim().length < 6) {
    errors.contactPhone = 'Vui lòng nhập Số điện thoại liên hệ (*).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Xác thực form tạo sự kiện mới dành cho Admin
 */
export function validateEventForm(input: EventFormInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim().length < 3) {
    errors.title = 'Vui lòng nhập tên sự kiện tối thiểu 3 ký tự.';
  }
  if (!input.eventDate) {
    errors.eventDate = 'Vui lòng chọn ngày tổ chức sự kiện.';
  }
  if (!input.eventTime) {
    errors.eventTime = 'Vui lòng nhập khung giờ tổ chức.';
  }
  if (!input.province || !isValidVietnam2025Province(input.province)) {
    errors.province = 'Vui lòng chọn Tỉnh/Thành phố tổ chức sự kiện.';
  }
  if (!input.venue || input.venue.trim().length < 2) {
    errors.venue = 'Vui lòng nhập địa điểm tổ chức chi tiết.';
  }
  if (!input.capacity || input.capacity < 1) {
    errors.capacity = 'Quy mô tối đa phải lớn hơn 0.';
  }
  if (!input.summary || input.summary.trim().length < 5) {
    errors.summary = 'Vui lòng nhập mô tả nội dung sự kiện.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Tạo nội dung thư chào mừng cựu sinh viên chính thức gia nhập Mạng lưới ALUMNI KTD
 */
export function buildMemberWelcomeEmail(
  member: MemberProfileRecord,
  customSenderTitle?: string,
  customFooterNote?: string
): EmailNotificationRecord {
  const senderHeader =
    customSenderTitle || 'Ban Điều hành Mạng lưới ALUMNI KTD - Trường Đại học Kiến trúc Đà Nẵng';
  const footerLine =
    customFooterNote ||
    'Chào mừng bạn đã gia nhập Mạng lưới ALUMNI KTD! Hãy kết nối cùng Cộng đồng Doanh nghiệp và tham gia các Sự kiện kết nối thường niên.';

  return {
    id: `mail-welcome-${Date.now()}`,
    to: member.email,
    recipientName: member.fullName,
    senderName: senderHeader,
    subject: `[ALUMNI KTD] Thư Chào mừng Cựu sinh viên: ${member.fullName}`,
    category: 'MEMBER_WELCOME',
    sentAt: new Date().toISOString(),
    memberSnapshot: member,
    bodyLines: [
      `Kính gửi Cựu sinh viên: ${member.fullName},`,
      `${senderHeader} nhiệt liệt chào mừng bạn đã chính thức kết nối vào Mạng lưới Cựu sinh viên Trường Đại học Kiến trúc Đà Nẵng (ALUMNI KTD).`,
      `Tài khoản đăng nhập của bạn: ${member.email} (Đã xác thực qua tài khoản Google).`,
      `--------------------------------------------------`,
      `THÔNG TIN HỒ SƠ CỰU SINH VIÊN ĐÃ GHI NHẬN:`,
      `• Họ và tên: ${member.fullName}`,
      `• Lớp sinh hoạt: ${member.className} (Niên khóa ${member.enrollmentYear || '—'} – ${member.graduationYear || '—'})`,
      `• Khoa đào tạo: ${member.faculty}`,
      `• Ngành đào tạo: ${member.major}`,
      `• Nơi ở hiện nay: ${member.currentProvince}`,
      `• Đơn vị & Nơi công tác: ${member.workplace || 'Đang cập nhật'} (${member.workplaceProvince || '—'})`,
      `• Zalo / Số điện thoại: ${member.zaloPhone || 'Chưa cung cấp'}`,
      `--------------------------------------------------`,
      `QUYỀN LỢI THÀNH VIÊN ALUMNI KTD:`,
      `1. Đăng ký & quảng bá hồ sơ Doanh nghiệp cựu sinh viên trên Hệ sinh thái Doanh nghiệp KTD.`,
      `2. Nhận vé mời và giữ chỗ ưu tiên tại các Diễn đàn, Hội thảo chuyên môn và Ngày hội Cựu sinh viên toàn quốc.`,
      `3. Kết nối mạng lưới chuyên gia, đối tác hợp tác nghề nghiệp và đồng hành cùng Quỹ học bổng DAU.`,
      footerLine,
    ],
  };
}

/**
 * Tạo nội dung thư xác nhận cập nhật hồ sơ thành viên Mạng lưới ALUMNI KTD
 */
export function buildMemberConfirmationEmail(
  member: MemberProfileRecord,
  customSenderTitle?: string,
  customFooterNote?: string
): EmailNotificationRecord {
  const senderHeader =
    customSenderTitle || 'Ban Điều hành Mạng lưới ALUMNI KTD - ĐH Kiến trúc Đà Nẵng';
  const footerLine =
    customFooterNote ||
    'Từ bây giờ, bạn đã có đầy đủ quyền đăng ký Doanh nghiệp trên Cộng đồng Doanh nghiệp ALUMNI KTD và đăng ký tham gia các Sự kiện của mạng lưới.';

  return {
    id: `mail-member-${Date.now()}`,
    to: member.email,
    recipientName: member.fullName,
    senderName: senderHeader,
    subject: `[ALUMNI KTD] Xác nhận đăng ký thông tin thành viên: ${member.fullName}`,
    category: 'MEMBER_CONFIRM',
    sentAt: new Date().toISOString(),
    memberSnapshot: member,
    bodyLines: [
      `Kính gửi cựu sinh viên ${member.fullName},`,
      `${senderHeader} xác nhận bạn đã đăng ký và cập nhật thành công thông tin thành viên gắn với tài khoản Google (${member.email}).`,
      `Thông tin hồ sơ đã lưu trữ:`,
      `• Họ và tên: ${member.fullName} | Ngày sinh: ${member.birthDate}`,
      `• Lớp: ${member.className} (${member.enrollmentYear || '—'} - ${member.graduationYear || '—'})`,
      `• Khoa: ${member.faculty} — ${member.major}`,
      `• Nơi ở hiện nay: ${member.currentProvince}`,
      `• Đơn vị công tác: ${member.workplace || 'Chưa cập nhật'} (${member.workplaceProvince || '—'})`,
      `• Zalo / Số điện thoại: ${member.zaloPhone || 'Chưa cung cấp'}`,
      footerLine,
    ],
  };
}

/**
 * Tạo đường dẫn mở trực tiếp khung soạn thảo Gmail Web (1-Click Gmail Compose)
 * Không cần cấu hình máy chủ SMTP phức tạp — Quản trị viên chỉ cần bấm Gửi trên Gmail
 */
export function buildGmailComposeUrl(params: {
  to?: string;
  bcc?: string[];
  subject: string;
  body: string;
}): string {
  const url = new URL('https://mail.google.com/mail/');
  url.searchParams.set('view', 'cm');
  url.searchParams.set('fs', '1');
  if (params.to) {
    url.searchParams.set('to', params.to);
  }
  if (params.bcc && params.bcc.length > 0) {
    url.searchParams.set('bcc', params.bcc.join(','));
  }
  url.searchParams.set('su', params.subject);
  url.searchParams.set('body', params.body);
  return url.toString();
}

/**
 * Tạo đường dẫn mailto: chuẩn mở ứng dụng Email mặc định trên máy tính / điện thoại
 */
export function buildMailtoUrl(params: {
  to?: string;
  bcc?: string[];
  subject: string;
  body: string;
}): string {
  const recipient = params.to ? encodeURIComponent(params.to) : '';
  const queryParts: string[] = [];
  if (params.bcc && params.bcc.length > 0) {
    queryParts.push(`bcc=${encodeURIComponent(params.bcc.join(','))}`);
  }
  queryParts.push(`subject=${encodeURIComponent(params.subject)}`);
  queryParts.push(`body=${encodeURIComponent(params.body)}`);
  return `mailto:${recipient}?${queryParts.join('&')}`;
}

/**
 * Tạo nội dung thư xác nhận đăng ký thông tin doanh nghiệp trong Cộng đồng Doanh nghiệp ALUMNI KTD
 */
export function buildBusinessConfirmationEmail(
  biz: BusinessRecord,
  recipientEmail: string
): EmailNotificationRecord {
  return {
    id: `mail-biz-${Date.now()}`,
    to: recipientEmail,
    subject: `[ALUMNI KTD] Xác nhận đăng ký Doanh nghiệp: ${biz.companyName}`,
    category: 'BUSINESS_CONFIRM',
    sentAt: new Date().toISOString(),
    bodyLines: [
      `Kính gửi Đại diện Doanh nghiệp ${biz.ownerName},`,
      `Ban Điều hành Cộng đồng Doanh nghiệp ALUMNI KTD trân trọng xác nhận doanh nghiệp của bạn đã được ghi nhận vào Danh bạ Hệ sinh thái Doanh nghiệp Cựu sinh viên KTD:`,
      `• Tên doanh nghiệp: ${biz.companyName}`,
      `• Lĩnh vực hoạt động: ${biz.industry}`,
      `• Quy mô nhân sự: ${biz.scale}`,
      `• Địa điểm: ${biz.address ? `${biz.address}, ` : ''}${biz.province}`,
      `• Website: ${biz.website || 'Đang cập nhật'}`,
      `• Liên hệ giao thương: ${biz.contactEmail} | ${biz.contactPhone}`,
      `Doanh nghiệp của bạn sẽ được kết nối ưu tiên trong các kỳ B2B Matching và chương trình hợp tác đào tạo với Nhà trường.`,
    ],
  };
}

/**
 * Tạo tự động 2 thư email khi thành viên đăng ký sự kiện:
 * 1. Thư xác nhận đăng ký tham gia sự kiện thành công
 * 2. Thư nhắc lịch sự kiện tự động (kèm file lịch .ics)
 */
export function buildEventRegistrationEmails(
  event: EventRecord,
  member: MemberProfileRecord,
  note: string,
  customAnswers?: Record<string, any>,
  regDetails?: {
    attendGala?: boolean;
    shirtOrders?: EventShirtOrder[];
    totalFee?: number;
  }
): EmailNotificationRecord[] {
  const nowIso = new Date().toISOString();

  const customLines: string[] = [];

  const unitGala = event.galaFeeAmount ?? 350000;
  const unitShirt = event.shirtFeeAmount ?? 110000;

  // Chi tiết đăng ký Gala và Áo kỷ niệm nếu có
  if (regDetails?.attendGala !== undefined) {
    customLines.push(
      regDetails.attendGala
        ? `• Đăng ký tham dự Gala: CÓ THAM GIA (Lệ phí: ${unitGala.toLocaleString('vi-VN')} VNĐ)`
        : '• Đăng ký tham dự Gala: Không tham gia (0 VNĐ)'
    );
  }

  if (regDetails?.shirtOrders && regDetails.shirtOrders.length > 0) {
    const totalShirtCount = regDetails.shirtOrders.reduce((sum, s) => sum + s.quantity, 0);
    const shirtTotalFee = totalShirtCount * unitShirt;
    customLines.push(`• Đăng ký áo kỷ niệm: ${totalShirtCount} áo (Tổng tiền áo: ${shirtTotalFee.toLocaleString('vi-VN')} VNĐ)`);
    regDetails.shirtOrders.forEach((so, idx) => {
      customLines.push(
        `   + Áo ${idx + 1}: Form ${so.gender} · Size ${so.size} · Số lượng: ${so.quantity} áo (${(so.quantity * unitShirt).toLocaleString('vi-VN')} VNĐ)`
      );
    });
  }

  if (regDetails?.totalFee !== undefined) {
    const syntaxStr = buildTransferSyntax({
      fullName: member.fullName,
      phone: member.zaloPhone || 'SDT',
      suffix: event.transferSyntaxPrefix || 'Gala',
    });
    customLines.push(`• TỔNG LỆ PHÍ THANH TOÁN: ${regDetails.totalFee.toLocaleString('vi-VN')} VNĐ`);
    if (regDetails.totalFee > 0) {
      customLines.push(
        `• Hướng dẫn chuyển khoản: Ngân hàng ${event.bankName || 'Vietcombank (Chi nhánh Đà Nẵng)'} | STK: ${event.bankAccount || '1018 2026 88'} | Chủ TK: ${event.bankAccountName || 'MANG LUOI ALUMNI KTD - BTC GALA'} | Nội dung chuyển khoản: ${syntaxStr}`
      );
    }
  }

  if (customAnswers && Object.keys(customAnswers).length > 0) {
    for (const [key, val] of Object.entries(customAnswers)) {
      if (key === 'cf_attend_gala' && regDetails?.attendGala !== undefined) continue;
      const fieldDef = event.customFields?.find((f) => f.id === key);
      const label = fieldDef?.label || key;
      let displayVal = '';
      if (Array.isArray(val)) {
        displayVal = val.join(', ');
      } else if (typeof val === 'boolean') {
        displayVal = val ? 'Có' : 'Không';
      } else {
        displayVal = String(val);
      }
      if (displayVal.trim()) {
        customLines.push(`• ${label}: ${displayVal}`);
      }
    }
  }

  const confirmationMail: EmailNotificationRecord = {
    id: `mail-evt-confirm-${Date.now()}-1`,
    to: member.email,
    subject: `[ALUMNI KTD] Xác nhận đăng ký tham gia: ${event.title}`,
    category: 'EVENT_CONFIRM',
    sentAt: nowIso,
    bodyLines: [
      `Xin chào ${member.fullName} (${member.faculty} - Lớp ${member.className || 'KTD'}),`,
      `Hệ thống Theo dòng Sự kiện ALUMNI KTD xác nhận bạn đã hoàn tất đăng ký tham gia sự kiện:`,
      `• Sự kiện: ${event.title}`,
      `• Thời gian: ${event.eventTime} | Ngày ${event.eventDate}`,
      `• Địa điểm: ${event.venue} (${event.province})`,
      `• Đơn vị tổ chức: ${event.organizer}`,
      `--------------------------------------------------`,
      `CHI TIẾT NỘI DUNG ĐĂNG KÝ & LỆ PHÍ:`,
      ...customLines,
      note ? `• Ghi chú / Đề xuất kiến nghị của bạn: "${note}"` : `• Ghi chú: Không có đề xuất thêm`,
      `--------------------------------------------------`,
      regDetails?.totalFee && regDetails.totalFee > 0
        ? `Quý đại biểu vui lòng chuyển khoản lệ phí ${regDetails.totalFee.toLocaleString('vi-VN')} VNĐ theo thông tin trên để Ban Tổ chức chuẩn bị chu đáo tiệc và áo kỷ niệm.`
        : `Vui lòng xuất trình email này hoặc vé điện tử tại bàn đón tiếp khi tham dự chương trình.`,
    ],
    icsEvent: event,
  };

  const reminderMail: EmailNotificationRecord = {
    id: `mail-evt-reminder-${Date.now()}-2`,
    to: member.email,
    subject: `[NHẮC LỊCH SỰ KIỆN ALUMNI KTD] Sắp diễn ra: ${event.title} (${event.eventDate})`,
    category: 'EVENT_REMINDER',
    sentAt: nowIso,
    bodyLines: [
      `Thư nhắc lịch tự động gửi tới thành viên ${member.fullName} (${member.email}),`,
      `Đừng quên lịch hẹn sự kiện của Mạng lưới ALUMNI KTD mà bạn đã đăng ký:`,
      `• Sự kiện: ${event.title}`,
      `• Thời gian bắt đầu: ${event.eventTime} ngày ${event.eventDate}`,
      `• Địa điểm đón tiếp: ${event.venue}, ${event.province}`,
      `• Nhắc lịch tự động: Đã kích hoạt thông báo trước 24 giờ và 2 giờ trước giờ khai mạc. Bạn có thể tải tệp lịch (.ics) đính kèm để đồng bộ trực tiếp vào Google Calendar.`,
    ],
    icsEvent: event,
  };

  return [confirmationMail, reminderMail];
}

/**
 * Tạo nội dung file lịch .ics để người dùng thêm vào lịch cá nhân
 */
export function generateIcsCalendarContent(event: EventRecord): string {
  const cleanDate = event.eventDate.replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ALUMNI KTD//Event Reminder//VI',
    'BEGIN:VEVENT',
    `UID:${event.id}@alumni-ktd.edu.vn`,
    `DTSTART:${cleanDate}T080000`,
    `DTEND:${cleanDate}T120000`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.venue}, ${event.province}`,
    `DESCRIPTION:${event.summary}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Tìm kiếm và lọc danh sách Ban Điều hành
 */
export function filterExecutives(
  executives: ExecutiveRecord[],
  searchQuery: string,
  facultyFilter: string
): ExecutiveRecord[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return executives.filter((exec) => {
    const matchesFaculty =
      !facultyFilter || facultyFilter === 'ALL' || exec.faculty === facultyFilter;

    if (!matchesFaculty) return false;
    if (!normalizedQuery) return true;

    const haystack = [
      exec.fullName,
      exec.boardRole,
      exec.phone,
      exec.faculty,
      exec.major,
      exec.graduationYear,
      exec.email,
      exec.workplace,
      exec.workPosition,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

/**
 * Tìm kiếm và lọc danh sách Cộng đồng Doanh nghiệp
 */
export function filterBusinesses(
  businesses: BusinessRecord[],
  searchQuery: string,
  industryFilter: string,
  provinceFilter: string
): BusinessRecord[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return businesses.filter((biz) => {
    const matchesIndustry =
      !industryFilter || industryFilter === 'ALL' || biz.industry === industryFilter;
    const matchesProvince =
      !provinceFilter || provinceFilter === 'ALL' || biz.province === provinceFilter;

    if (!matchesIndustry || !matchesProvince) return false;
    if (!normalizedQuery) return true;

    const haystack = [
      biz.companyName,
      biz.ownerName,
      biz.industry,
      biz.province,
      biz.address,
      biz.website,
      biz.contactEmail,
      biz.contactPhone,
      biz.description,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

/**
 * Nén và thu gọn ảnh mã QR thanh toán trên trình duyệt client
 * Đảm bảo kích thước tối ưu, dung lượng dưới 150KB để lưu trực tiếp vào Firestore mà không bị cắt chuỗi
 */
export function compressQrImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const renderAtDim = (maxDim: number, quality: number): string => {
          let w = img.width || 400;
          let h = img.height || 400;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return rawResult;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL('image/jpeg', quality);
        };

        let dataUrl = renderAtDim(500, 0.86);
        if (dataUrl.length > 170000) {
          dataUrl = renderAtDim(380, 0.78);
        }
        if (dataUrl.length > 170000) {
          dataUrl = renderAtDim(300, 0.7);
        }
        resolve(dataUrl);
      };
      img.onerror = () => {
        if (rawResult && rawResult.startsWith('data:image/') && rawResult.length <= 190000) {
          resolve(rawResult);
        } else {
          reject(new Error('Không thể đọc file ảnh.'));
        }
      };
      img.src = rawResult;
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Tự động tạo URL ảnh mã QR chuyển khoản chuẩn VietQR (Napas 247)
 * từ thông tin Ngân hàng, Số tài khoản, Chủ tài khoản, Số tiền và Nội dung chuyển khoản
 */
export function buildVietQrImageUrl(params: {
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  amount?: number;
  transferSyntax?: string;
}): string {
  const rawBank = (params.bankName || 'Vietcombank').toLowerCase();
  let bankCode = 'VCB';

  if (rawBank.includes('vietcombank') || rawBank.includes('vcb') || rawBank.includes('ngoại thương')) {
    bankCode = 'VCB';
  } else if (rawBank.includes('vietinbank') || rawBank.includes('icb') || rawBank.includes('công thương') || rawBank.includes('cong thuong')) {
    bankCode = 'ICB';
  } else if (rawBank.includes('bidv') || rawBank.includes('đầu tư')) {
    bankCode = 'BIDV';
  } else if (rawBank.includes('agribank') || rawBank.includes('vba') || rawBank.includes('nông nghiệp')) {
    bankCode = 'VBA';
  } else if (rawBank.includes('techcombank') || rawBank.includes('tcb') || rawBank.includes('kỹ thương')) {
    bankCode = 'TCB';
  } else if (rawBank.includes('mbbank') || rawBank.includes('quân đội') || /\bmb\b/.test(rawBank)) {
    bankCode = 'MB';
  } else if (rawBank.includes('acb') || rawBank.includes('á châu')) {
    bankCode = 'ACB';
  } else if (rawBank.includes('vpbank') || rawBank.includes('vpb') || rawBank.includes('thịnh vượng')) {
    bankCode = 'VPB';
  } else if (rawBank.includes('tpbank') || rawBank.includes('tpb') || rawBank.includes('tiên phong')) {
    bankCode = 'TPB';
  } else if (rawBank.includes('sacombank') || rawBank.includes('stb') || rawBank.includes('sài gòn thương tín')) {
    bankCode = 'STB';
  } else if (rawBank.includes('shb') || rawBank.includes('sài gòn - hà nội') || rawBank.includes('sài gòn hà nội')) {
    bankCode = 'SHB';
  } else if (rawBank.includes('hdbank') || rawBank.includes('hdb')) {
    bankCode = 'HDB';
  } else if (rawBank.includes('vib') || rawBank.includes('quốc tế')) {
    bankCode = 'VIB';
  } else if (rawBank.includes('msb') || rawBank.includes('hàng hải')) {
    bankCode = 'MSB';
  } else if (rawBank.includes('ocb') || rawBank.includes('phương đông')) {
    bankCode = 'OCB';
  } else if (rawBank.includes('seabank')) {
    bankCode = 'SEAB';
  } else if (rawBank.includes('lpbank') || rawBank.includes('lienviet') || rawBank.includes('lpb') || rawBank.includes('lộc phát')) {
    bankCode = 'LPB';
  } else if (rawBank.includes('eximbank') || rawBank.includes('eib')) {
    bankCode = 'EIB';
  } else if (rawBank.includes('nam a') || rawBank.includes('namabank') || rawBank.includes('nam á')) {
    bankCode = 'NAB';
  } else if (rawBank.includes('bac a') || rawBank.includes('bacabank') || rawBank.includes('bắc á')) {
    bankCode = 'BAB';
  } else if (rawBank.includes('pvcombank')) {
    bankCode = 'PVCB';
  } else if (rawBank.includes('shinhan')) {
    bankCode = 'SHBVN';
  }

  const cleanAccount = (params.bankAccount || '1018202688').replace(/[^a-zA-Z0-9]/g, '') || '1018202688';
  const accountName = (params.bankAccountName || 'MANG LUOI ALUMNI KTD - BTC GALA').trim();
  const amount = Math.max(0, Math.round(Number(params.amount) || 0));
  const addInfo = (params.transferSyntax || 'HO VA TEN - SDT - Gala').trim();

  const queryParams = new URLSearchParams();
  if (amount > 0) {
    queryParams.set('amount', String(amount));
  }
  if (addInfo) {
    queryParams.set('addInfo', addInfo);
  }
  if (accountName) {
    queryParams.set('accountName', accountName);
  }

  return `https://img.vietqr.io/image/${bankCode}-${cleanAccount}-compact2.png?${queryParams.toString()}`;
}

/**
 * Chuyển đổi chuỗi tiếng Việt có dấu sang chữ IN HOA KHÔNG DẤU chuẩn ngân hàng
 * Ví dụ: "Nguyễn Văn Đạt" -> "NGUYEN VAN DAT"
 */
export function toUpperCaseNoAccents(str?: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Tạo cú pháp nội dung chuyển khoản cá nhân hóa theo từng người đăng ký:
 * Định dạng chuẩn: "HO VA TEN (không dấu) - Số điện thoại - Gala"
 * Ví dụ: "NGUYEN VAN AN - 0905128689 - Gala"
 */
export function buildTransferSyntax(params: {
  fullName?: string;
  phone?: string;
  suffix?: string;
}): string {
  const cleanName = toUpperCaseNoAccents(params.fullName) || 'HO VA TEN';
  const cleanPhone = (params.phone || '').replace(/[^0-9+]/g, '').trim() || '0905128689';
  const rawSuffix = (params.suffix || '').trim();
  const finalSuffix =
    !rawSuffix || rawSuffix.toUpperCase() === 'GALA KTD' ? 'Gala' : rawSuffix;

  return `${cleanName} - ${cleanPhone} - ${finalSuffix}`;
}

/**
 * Làm sạch văn bản mô tả thông tin sự kiện / nhãn câu hỏi bên ngoài để đảm bảo
 * giá tiệc và giá áo CHỈ xuất hiện trên Form đăng ký, không hiển thị ở phần thông tin chung gây nhầm lẫn.
 */
export function sanitizeEventInfoText(text?: string): string {
  if (!text) return '';
  return text
    // Xóa cụm giá tiền kèm dấu phẩy trong ngoặc: ví dụ "(110.000 VNĐ/áo, có thể..." -> "(Có thể..."
    .replace(/\(\s*(?:lệ phí\s*)?\d[\d.,]*\s*(?:k|đ|vnđ|vnd|đồng)(?:\s*\/\s*[^\s,)]+)?\s*,\s*/gi, '(')
    // Xóa các cụm ngoặc chứa giá tiền kiểu (350k), (110k), (350.000đ), (Lệ phí 350.000 VNĐ / người), (110.000 VNĐ / áo)...
    .replace(/\s*\([^)]*(?:\d[\d.,]*\s*(?:k|đ|vnđ|vnd|đồng)|lệ phí|giá tiệc|giá áo)[^)]*\)/gi, '')
    // Xóa các câu/mệnh đề ghi giá áo, giá tiệc trong phần mô tả thông tin chung nếu có
    .replace(/(?:[.;•|-]\s*)?(?:lệ phí|phí tham gia|giá tiệc|giá áo)[^.;\n]*(?:\d[\d.,]*\s*(?:k|đ|vnđ|vnd|đồng))[^.;\n]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Chuẩn hóa bản ghi sự kiện để loại bỏ mọi thông tin giá áo / giá tiệc bị lưu cứng
 * ở phần mô tả thông tin (summary) hoặc nhãn câu hỏi tùy chỉnh (customFields).
 */
export function sanitizeEventRecord(event: EventRecord): EventRecord {
  const cleanedSummary = sanitizeEventInfoText(event.summary) || event.summary;
  const cleanedCustomFields = event.customFields?.map((cf) => ({
    ...cf,
    label: sanitizeEventInfoText(cf.label) || cf.label,
    options: cf.options?.map((opt) => sanitizeEventInfoText(opt) || opt),
  }));

  return {
    ...event,
    summary: cleanedSummary,
    customFields: cleanedCustomFields,
  };
}

/**
 * Làm sạch URL bên ngoài trước khi gắn vào href:
 * Chỉ cho phép http:// hoặc https:// (hoặc tên miền trần như example.vn -> tự thêm https://).
 * Chặn các giao thức nguy hiểm như javascript:, data:, vbscript:, file:, v.v.
 */
export function sanitizeExternalUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const cleaned = url.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleaned);
  if (hasScheme && !/^https?:\/\//i.test(cleaned)) {
    return null;
  }
  if (cleaned.startsWith('/')) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(cleaned)
    ? cleaned.replace(/^https?:\/\//i, (m) => m.toLowerCase())
    : `https://${cleaned}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Mã hóa các ký tự HTML đặc biệt để phòng chống XSS khi xuất HTML / email
 */
export function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Trả về ngày hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7) định dạng YYYY-MM-DD
 */
export function getVietnamDateIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

