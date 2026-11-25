export interface FacultyMajorConfig {
  faculty: string;
  majors: string[];
}

/**
 * Danh sách Khoa và Ngành đào tạo theo đúng mô tả của ALUMNI KTD (Droplist phụ thuộc)
 */
export const FACULTY_MAJORS_LIST: FacultyMajorConfig[] = [
  {
    faculty: 'Khoa Kiến trúc',
    majors: [
      'Ngành Kiến trúc công trình',
      'Ngành Quy hoạch vùng và đô thị',
      'Ngành Thiết kế đồ họa',
    ],
  },
  {
    faculty: 'Khoa Thiết kế nội thất',
    majors: ['Ngành Thiết kế Nội thất'],
  },
  {
    faculty: 'Khoa Xây dựng',
    majors: [
      'Ngành Kỹ thuật xây dựng',
      'Ngành Quản lý xây dựng',
      'Ngành Kỹ thuật xây dựng công trình giao thông',
      'Ngành Kỹ thuật xây dựng hạ tầng',
    ],
  },
  {
    faculty: 'Khoa Công nghệ thông tin',
    majors: ['Ngành Công nghệ thông tin'],
  },
  {
    faculty: 'Khoa Kỹ thuật Điện - Điện tử',
    majors: ['Ngành Công nghệ kỹ thuật Điện - Điện tử'],
  },
  {
    faculty: 'Khoa Kinh tế',
    majors: [
      'Ngành Quản trị kinh doanh',
      'Ngành Kế toán',
      'Ngành Tài chính - Ngân hàng',
      'Ngành Logistics và Quản lý chuỗi cung ứng',
    ],
  },
  {
    faculty: 'Khoa Du lịch',
    majors: [
      'Ngành Quản trị dịch vụ du lịch và lữ hành',
      'Ngành Quản trị khách sạn',
    ],
  },
  {
    faculty: 'Khoa Ngoại Ngữ',
    majors: ['Ngành Ngôn ngữ Anh', 'Ngành Ngôn ngữ Trung Quốc'],
  },
];

export const FACULTY_MAJORS_MAP: Record<string, string[]> = Object.fromEntries(
  FACULTY_MAJORS_LIST.map((item) => [item.faculty, item.majors])
);

/**
 * Danh sách 34 tỉnh, thành phố mới của Việt Nam sau sáp nhập năm 2025
 * (Gồm 6 thành phố trực thuộc Trung ương và 28 tỉnh)
 */
export const VIETNAM_34_PROVINCES_2025: string[] = [
  'Thành phố Hà Nội',
  'Thành phố Hồ Chí Minh',
  'Thành phố Hải Phòng',
  'Thành phố Đà Nẵng',
  'Thành phố Huế',
  'Thành phố Cần Thơ',
  'Tỉnh An Giang',
  'Tỉnh Bắc Ninh',
  'Tỉnh Cà Mau',
  'Tỉnh Cao Bằng',
  'Tỉnh Đắk Lắk',
  'Tỉnh Điện Biên',
  'Tỉnh Đồng Nai',
  'Tỉnh Đồng Tháp',
  'Tỉnh Gia Lai',
  'Tỉnh Hà Tĩnh',
  'Tỉnh Hưng Yên',
  'Tỉnh Khánh Hòa',
  'Tỉnh Lai Châu',
  'Tỉnh Lâm Đồng',
  'Tỉnh Lạng Sơn',
  'Tỉnh Lào Cai',
  'Tỉnh Nghệ An',
  'Tỉnh Ninh Bình',
  'Tỉnh Phú Thọ',
  'Tỉnh Quảng Ngãi',
  'Tỉnh Quảng Ninh',
  'Tỉnh Quảng Trị',
  'Tỉnh Sơn La',
  'Tỉnh Tây Ninh',
  'Tỉnh Thái Nguyên',
  'Tỉnh Thanh Hóa',
  'Tỉnh Tuyên Quang',
  'Tỉnh Vĩnh Long',
  'Nơi khác (Nước ngoài / Quốc tế)',
];

export const BUSINESS_INDUSTRIES: string[] = [
  'Tư vấn Thiết kế Kiến trúc & Quy hoạch',
  'Thiết kế & Thi công Nội thất',
  'Tổng thầu Xây dựng & Hạ tầng',
  'Vật liệu Xây dựng & Trang thiết bị',
  'Bất động sản & Quản lý Dự án',
  'Sản xuất & Thương mại',
  'Công nghệ thông tin & Phần mềm BIM',
  'Kỹ thuật Cơ điện (M&E) & Năng lượng',
  'Tài chính, Thương mại & Logistics',
  'Du lịch, Khách sạn & Dịch vụ Lưu trú',
  'Giáo dục, Đào tạo & Ngoại ngữ',
  'Lĩnh vực khác',
];

export const BUSINESS_SCALES: string[] = [
  'Dưới 10 nhân sự (Startup / Studio)',
  '10 - 49 nhân sự (Doanh nghiệp nhỏ)',
  '50 - 199 nhân sự (Doanh nghiệp vừa)',
  '200 - 499 nhân sự (Doanh nghiệp lớn)',
  'Trên 500 nhân sự (Tập đoàn / Tổng công ty)',
];

export interface MemberProfileRecord {
  uid: string;
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
  zaloPhoneMasked?: string;
  avatarUrl?: string; // Ảnh chân dung thành viên (đã tối ưu nén client-side)
  updatedAt: string;
  verificationStatus?: 'verified' | 'pending';
}

export interface AdminNotificationConfig {
  autoSendWelcomeEmail: boolean; // Tự động gửi thư chào mừng & xác nhận khi cựu sinh viên lưu hồ sơ
  deliveryMethod: 'in_app_instant' | 'admin_gmail_compose' | 'smtp_auto';
  senderTitle: string;
  replyToEmail: string;
  customFooterNote: string;
}

export const DEFAULT_ADMIN_NOTIFICATION_CONFIG: AdminNotificationConfig = {
  autoSendWelcomeEmail: true,
  deliveryMethod: 'in_app_instant',
  senderTitle: 'Ban Điều hành Mạng lưới CSV KTD - ĐH Kiến trúc Đà Nẵng',
  replyToEmail: 'alumni@ktd.edu.vn',
  customFooterNote:
    'Mọi thắc mắc vui lòng liên hệ Văn phòng Kết nối Cựu sinh viên KTD - 566 Núi Thành, TP. Đà Nẵng.',
};

export interface ExecutiveRecord {
  id: string;
  fullName: string;
  boardRole: string;
  phone: string;
  faculty: string;
  major: string;
  graduationYear: string;
  email: string;
  workplace: string;
  workPosition: string;
  avatarKey: string;
}

export interface BusinessRecord {
  id: string;
  ownerUid: string;
  ownerName: string;
  ownerFaculty: string;
  companyName: string;
  industry: string;
  scale: string;
  province: string;
  address: string;
  website: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  logoUrl?: string; // Logo thương hiệu doanh nghiệp (đã tối ưu nén)
  logoAspectRatio?: '1:1' | '3:4' | '4:3' | '16:9' | 'free'; // Tỷ lệ khung hình logo tùy chỉnh
  createdAt: string;
}

export interface EventShirtOrder {
  id: string;
  gender: 'Nam' | 'Nữ';
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';
  quantity: number;
}

export type EventCustomFieldType =
  | 'text'
  | 'select'
  | 'checkbox'
  | 'textarea'
  | 'radio'
  | 'multicheckbox';

export interface EventCustomField {
  id: string;
  label: string;
  type: EventCustomFieldType;
  required: boolean;
  options?: string[]; // Cho dạng select, radio, multicheckbox
  placeholder?: string;
  description?: string;
}

export interface EventRecord {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string;
  province: string;
  venue: string;
  category: string;
  capacity: number;
  summary: string;
  organizer: string;
  status: 'open' | 'closed';
  registeredCount: number;
  customFields?: EventCustomField[];
  isGalaWithShirtFee?: boolean;
  qrImageUrl?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  galaFeeAmount?: number;
  shirtFeeAmount?: number;
  transferSyntaxPrefix?: string;
  createdBy?: string;
  createdAt?: any;
}

export interface EventRegistrationRecord {
  eventId: string;
  uid: string;
  fullName: string;
  email: string;
  faculty: string;
  graduationYear: string;
  className?: string;
  workplace?: string;
  province?: string;
  note: string;
  createdAt: string;
  customAnswers?: Record<string, any>;
  attendGala?: boolean;
  shirtOrders?: EventShirtOrder[];
  totalFee?: number;
  paymentStatus?: 'pending' | 'completed';
  btcConfirmed?: boolean;
  btcConfirmedAt?: string;
  btcConfirmedBy?: string;
}

export interface EmailNotificationRecord {
  id: string;
  to: string;
  recipientName?: string;
  senderName?: string;
  subject: string;
  category:
    | 'MEMBER_WELCOME'
    | 'MEMBER_CONFIRM'
    | 'BUSINESS_CONFIRM'
    | 'EVENT_CONFIRM'
    | 'EVENT_REMINDER'
    | 'BOARD_NOTIFICATION';
  sentAt: string;
  bodyLines: string[];
  icsEvent?: EventRecord;
  memberSnapshot?: MemberProfileRecord;
  messageId?: string;
  deliveryMode?: string;
  previewUrl?: string | null;
  htmlContent?: string;
}

export const INITIAL_EXECUTIVES: ExecutiveRecord[] = [];

export const INITIAL_MEMBERS: MemberProfileRecord[] = [];

export const INITIAL_BUSINESSES: BusinessRecord[] = [];

export const OFFICIAL_GALA_EVENT: EventRecord = {
  id: 'evt-gala-can-bo-doan',
  title: 'Gala Gặp mặt Cán bộ Đoàn, Cán sự lớp qua các thời kỳ',
  eventDate: '2026-11-24',
  eventTime: '11:00',
  province: 'Thành phố Đà Nẵng',
  venue: 'Nhà hàng Quảng Đại Gold, số 187 đường 30/4 - Tp Đà Nẵng',
  category: 'Gala Truyền thống & Họp mặt',
  capacity: 250,
  registeredCount: 0,
  summary:
    'Đêm hội ngộ và gặp mặt thân mật tri ân các thế hệ Cán bộ Đoàn trường, Ban Cán sự Lớp và Hội Sinh viên Đại học Kiến trúc Đà Nẵng qua các thời kỳ. Chương trình gồm: Lễ kỷ niệm ngày truyền thống, giao lưu truyền lửa giữa các thế hệ cán bộ Đoàn - Lớp, vinh danh và Tiệc Gala hội ngộ ấm cúng.',
  organizer: 'Ban Thường vụ Đoàn trường & Ban Điều hành Mạng lưới CSV KTD',
  status: 'open',
  isGalaWithShirtFee: true,
  bankName: 'Vietcombank (Chi nhánh Đà Nẵng)',
  bankAccount: '1018 2026 88',
  bankAccountName: 'MANG LUOI ALUMNI KTD - BTC GALA',
  qrImageUrl: '',
  galaFeeAmount: 350000,
  shirtFeeAmount: 110000,
  transferSyntaxPrefix: 'Gala',
};

export const INITIAL_EVENTS: EventRecord[] = [OFFICIAL_GALA_EVENT];

