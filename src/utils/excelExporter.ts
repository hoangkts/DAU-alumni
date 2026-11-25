import * as ExcelJS from 'exceljs';
import {
  EventRecord,
  EventRegistrationRecord,
  EventShirtOrder,
  MemberProfileRecord,
} from '../data/constants';
import { getVietnamDateIso } from './alumniLogic';

export const MALE_SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;
export const FEMALE_SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

export interface EnrichedAttendeeItem {
  stt: number;
  uid: string;
  ticketCode: string;
  fullName: string;
  phone: string;
  email: string;
  className: string;
  faculty: string;
  major: string;
  graduationYear: string;
  workplace: string;
  province: string;
  attendGala?: boolean;
  shirtOrders: EventShirtOrder[];
  shirtDetails?: string;
  shirtTotalCount?: number;
  galaFee?: number;
  shirtFee?: number;
  totalFee?: number;
  paymentStatus?: string;
  btcConfirmed?: boolean;
  btcConfirmedAt?: string;
  btcConfirmedBy?: string;
  customAnswers: Record<string, string | boolean | string[]>;
  note: string;
  registeredAt: string;
  status: string;
}

/**
 * Bảo vệ file Excel khỏi lỗ hổng chèn công thức (CSV/Excel Formula Injection).
 * Các chuỗi do người dùng nhập bắt đầu bằng =, +, -, @ (hoặc ký tự điều khiển dẫn đầu)
 * sẽ được thêm dấu nháy đơn (') ở đầu.
 */
export function sanitizeExcelText(value: unknown): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (!str) return '';
  const trimmedLeading = str.replace(/^[\s]+/, '');
  if (/^[=+\-@\t\r]/.test(str) || /^[=+\-@]/.test(trimmedLeading)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Chuyển đổi chỉ số cột 0-based (0 -> A, 25 -> Z, 26 -> AA) thành chữ cái cột Excel
 */
function encodeExcelCol(colIdx: number): string {
  let n = colIdx;
  let colName = '';
  while (n >= 0) {
    colName = String.fromCharCode((n % 26) + 65) + colName;
    n = Math.floor(n / 26) - 1;
  }
  return colName;
}

function getWorkbookConstructor(): typeof ExcelJS.Workbook {
  const mod = ExcelJS as unknown as {
    Workbook?: typeof ExcelJS.Workbook;
    default?: { Workbook?: typeof ExcelJS.Workbook };
  };
  return mod.default?.Workbook || mod.Workbook || ExcelJS.Workbook;
}

/**
 * Chuẩn hóa danh sách đơn áo của 1 đại biểu từ dữ liệu đăng ký
 */
function normalizeShirtOrders(orders?: EventShirtOrder[]): EventShirtOrder[] {
  if (!orders || !Array.isArray(orders) || orders.length === 0) return [];
  return orders
    .filter((o) => o && (Number(o.quantity) || 0) > 0)
    .map((o, idx) => ({
      id: o.id || `shirt-${idx + 1}`,
      gender: o.gender === 'Nữ' ? 'Nữ' : 'Nam',
      size: (o.size || 'L') as EventShirtOrder['size'],
      quantity: Math.max(1, Number(o.quantity) || 1),
    }));
}

/**
 * Định dạng chuỗi tóm tắt đơn áo dễ đọc
 */
export function formatShirtDetails(orders?: EventShirtOrder[]): string {
  const normalized = normalizeShirtOrders(orders);
  if (normalized.length === 0) return 'Không đặt áo';
  return normalized
    .map((s) => `${s.quantity} áo ${s.gender} (Size ${s.size})`)
    .join(' + ');
}

/**
 * Tính tổng số lượng áo của 1 đại biểu
 */
export function getShirtCount(orders?: EventShirtOrder[]): number {
  const normalized = normalizeShirtOrders(orders);
  return normalized.reduce((sum, s) => sum + s.quantity, 0);
}

/**
 * Đếm số lượng áo của 1 đại biểu theo đúng Form (Nam/Nữ) và Size (S, M, L, XL, XXL, 3XL)
 * Phục vụ tách cột riêng biệt trong Excel để tính hàm SUM / SUMIFS
 */
export function getShirtQtyByGenderAndSize(
  orders: EventShirtOrder[] | undefined,
  gender: 'Nam' | 'Nữ',
  size: string
): number {
  const normalized = normalizeShirtOrders(orders);
  return normalized
    .filter((s) => s.gender === gender && s.size.toUpperCase() === size.toUpperCase())
    .reduce((sum, s) => sum + s.quantity, 0);
}

/**
 * Tạo danh sách đại biểu đăng ký đầy đủ cho sự kiện
 */
export function buildEnrichedAttendeeList(
  event: EventRecord,
  members: MemberProfileRecord[],
  userRegistrations: Record<string, EventRegistrationRecord>,
  serverRegistrations: EventRegistrationRecord[] = []
): EnrichedAttendeeItem[] {
  const result: EnrichedAttendeeItem[] = [];
  const registeredUids = new Set<string>();

  const eventCode =
    event.id.replace(/[^a-zA-Z0-9]/g, '').slice(-3).toUpperCase() || 'EVT';
  const isGala = Boolean(
    event.isGalaWithShirtFee ||
      event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
      event.id === 'evt-gala-can-bo-doan'
  );

  const unitGalaFee = event.galaFeeAmount ?? 350000;
  const unitShirtFee = event.shirtFeeAmount ?? 110000;

  const appendRegistration = (reg: EventRegistrationRecord, fallbackWorkplace: string) => {
    if (registeredUids.has(reg.uid)) return;
    registeredUids.add(reg.uid);

    const member = members.find(
      (m) => m.uid === reg.uid || (reg.email && m.email === reg.email)
    );
    const regDate = reg.createdAt
      ? new Date(reg.createdAt).toLocaleString('vi-VN', { hour12: false })
      : 'Mới đăng ký';

    const attendGala = reg.attendGala;
    const normalizedOrders = normalizeShirtOrders(reg.shirtOrders);
    const shirtDetails = formatShirtDetails(normalizedOrders);
    const shirtTotalCount = getShirtCount(normalizedOrders);
    const galaFee = isGala ? (attendGala ? unitGalaFee : 0) : 0;
    const shirtFee = isGala ? shirtTotalCount * unitShirtFee : 0;
    const totalFee = isGala ? galaFee + shirtFee : reg.totalFee;

    const paymentStatus =
      reg.paymentStatus === 'completed'
        ? 'Đã chuyển khoản'
        : totalFee && totalFee > 0
          ? 'Chờ thanh toán'
          : 'Miễn phí';

    const btcConfirmed = Boolean(reg.btcConfirmed || reg.customAnswers?.btcConfirmed);

    const resolvedPhone =
      (reg.customAnswers?.zaloPhone ? String(reg.customAnswers.zaloPhone) : '') ||
      (reg.customAnswers?.payerPhone ? String(reg.customAnswers.payerPhone) : '') ||
      (reg.customAnswers?.phone ? String(reg.customAnswers.phone) : '') ||
      member?.zaloPhone ||
      member?.zaloPhoneMasked ||
      'Chưa cập nhật';
    const resolvedClassName =
      reg.className ||
      (reg.customAnswers?.className ? String(reg.customAnswers.className) : '') ||
      member?.className ||
      'KTD';
    const resolvedWorkplace =
      reg.workplace ||
      (reg.customAnswers?.workplace ? String(reg.customAnswers.workplace) : '') ||
      member?.workplace ||
      fallbackWorkplace;
    const resolvedProvince =
      reg.province ||
      (reg.customAnswers?.province ? String(reg.customAnswers.province) : '') ||
      member?.workplaceProvince ||
      member?.currentProvince ||
      event.province;

    result.push({
      stt: result.length + 1,
      uid: reg.uid,
      ticketCode: `KTD-${eventCode}-${reg.uid.slice(0, 4).toUpperCase()}`,
      fullName: reg.fullName || member?.fullName || 'Cựu sinh viên KTD',
      phone: resolvedPhone,
      email: reg.email || member?.email || '',
      className: resolvedClassName,
      faculty: reg.faculty || member?.faculty || 'Khoa Kiến trúc',
      major: member?.major || 'Kiến trúc công trình',
      graduationYear: reg.graduationYear || member?.graduationYear || '2015',
      workplace: resolvedWorkplace,
      province: resolvedProvince,
      attendGala,
      shirtOrders: normalizedOrders,
      shirtDetails,
      shirtTotalCount,
      galaFee,
      shirtFee,
      totalFee,
      paymentStatus,
      btcConfirmed,
      btcConfirmedAt:
        reg.btcConfirmedAt ||
        (reg.customAnswers?.btcConfirmedAt ? String(reg.customAnswers.btcConfirmedAt) : undefined),
      btcConfirmedBy:
        reg.btcConfirmedBy ||
        (reg.customAnswers?.btcConfirmedBy ? String(reg.customAnswers.btcConfirmedBy) : undefined),
      customAnswers: reg.customAnswers || {},
      note: reg.note || '',
      registeredAt: regDate,
      status: btcConfirmed ? 'BTC đã xác nhận' : 'Chờ BTC xác nhận',
    });
  };

  serverRegistrations.forEach((reg) =>
    appendRegistration(reg, 'Đơn vị công tác ngành Xây dựng - Kiến trúc')
  );

  const localReg = userRegistrations[event.id];
  if (localReg) {
    appendRegistration(localReg, 'Doanh nghiệp ALUMNI KTD');
  }

  return result;
}

/**
 * Xuất dữ liệu đăng ký theo sự kiện ra file Excel (.xlsx) chuẩn khoa học bằng ExcelJS,
 * tối ưu hóa cho thống kê bằng hàm Excel (SUM, SUMIFS, COUNTIF, PivotTable)
 */
export async function exportEventRegistrationsToExcel(
  event: EventRecord,
  attendees: EnrichedAttendeeItem[]
): Promise<void> {
  const WorkbookCtor = getWorkbookConstructor();
  const workbook = new WorkbookCtor();
  workbook.creator = 'ALUMNI KTD';
  workbook.created = new Date();

  const isGala = Boolean(
    event.isGalaWithShirtFee ||
      event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
      event.id === 'evt-gala-can-bo-doan'
  );
  const unitGalaFee = event.galaFeeAmount ?? 350000;
  const unitShirtFee = event.shirtFeeAmount ?? 110000;

  const customFields = (event.customFields || []).filter(
    (f) => !isGala || (f.id !== 'cf_attend_gala' && f.id !== 'cf_uniform_shirt')
  );
  const customHeaders = customFields.map((f) => sanitizeExcelText(f.label.toUpperCase()));

  const exportDate = new Date().toLocaleString('vi-VN', { hour12: false });
  const safeEventTitle = sanitizeExcelText(event.title);

  // ============================================================================
  // SHEET 1: DANH SÁCH ĐẠI BIỂU (TÁCH CỘT MA TRẬN SIZE ÁO NAM/NỮ + HÀM SUM)
  // ============================================================================
  const ws1 = workbook.addWorksheet('1. Danh sách đại biểu');

  const titleRows: (string | number)[][] = [
    ['TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG - MẠNG LƯỚI ALUMNI KTD'],
    ['DANH SÁCH ĐẠI BIỂU & BẢNG PHÂN TÁCH SỐ LƯỢNG ÁO THEO TỪNG FORM - SIZE'],
    [`Sự kiện: ${event.title}`],
    [
      `Thời gian: ${event.eventTime} | Ngày: ${event.eventDate} | Địa điểm: ${event.venue} (${event.province})`,
    ],
    [
      `Đơn vị tổ chức: ${event.organizer} | Tổng số đại biểu: ${attendees.length} người | Ngày xuất: ${exportDate}`,
    ],
    [
      isGala
        ? 'Hướng dẫn thống kê: Mỗi loại Form & Size áo (NAM S..3XL, NỮ S..XXL) được tách thành 1 cột số nguyên riêng biệt. Một người đặt nhiều áo khác form/size sẽ hiển thị số lượng tại đúng các cột tương ứng (cộng ngang = Tổng SL áo; cộng dọc bằng hàm SUM = Tổng từng size).'
        : 'Danh sách tổng hợp thông tin đại biểu và các câu trả lời khảo sát theo sự kiện.',
    ],
  ];

  const maleShirtCols = MALE_SHIRT_SIZES.map((s) => `ÁO NAM - ${s}`);
  const femaleShirtCols = FEMALE_SHIRT_SIZES.map((s) => `ÁO NỮ - ${s}`);

  const tableHeader = [
    'STT',
    'MÃ VÉ / ĐĂNG KÝ',
    'HỌ VÀ TÊN ĐẠI BIỂU',
    'SỐ ĐIỆN THOẠI',
    'EMAIL LIÊN HỆ',
    'LỚP',
    'KHOA ĐÀO TẠO',
    'NGÀNH ĐÀO TẠO',
    'KHÓA TN',
    'ĐƠN VỊ CÔNG TÁC',
    'TỈNH / THÀNH',
    ...(isGala
      ? [
          'THAM DỰ GALA (1=CÓ, 0=KHÔNG)',
          'TIỀN GALA (VNĐ)',
          ...maleShirtCols,
          ...femaleShirtCols,
          'TỔNG SL ÁO',
          'TIỀN ÁO (VNĐ)',
          'TÓM TẮT ĐƠN ÁO (ĐỂ ĐỐI CHIẾU)',
          'TỔNG LỆ PHÍ (VNĐ)',
          'TRẠNG THÁI NỘP PHÍ',
        ]
      : []),
    ...customHeaders,
    'GHI CHÚ THAM DỰ',
    'THỜI GIAN ĐĂNG KÝ',
    'BTC ĐÃ XÁC NHẬN',
  ];

  const dataRows = attendees.map((item) => {
    const customValues = customFields.map((cf) => {
      const val = item.customAnswers[cf.id];
      if (val === undefined || val === null || val === '') return '—';
      if (Array.isArray(val)) return sanitizeExcelText(val.join(', '));
      if (typeof val === 'boolean') return val ? 'Có' : 'Không';
      return sanitizeExcelText(String(val));
    });

    let galaAndShirtCells: (string | number)[] = [];
    if (isGala) {
      const galaFlag = item.attendGala ? 1 : 0;
      const galaFee = item.attendGala ? unitGalaFee : 0;
      const maleQtys = MALE_SHIRT_SIZES.map((sz) =>
        getShirtQtyByGenderAndSize(item.shirtOrders, 'Nam', sz)
      );
      const femaleQtys = FEMALE_SHIRT_SIZES.map((sz) =>
        getShirtQtyByGenderAndSize(item.shirtOrders, 'Nữ', sz)
      );
      const totalShirts =
        item.shirtTotalCount !== undefined
          ? item.shirtTotalCount
          : getShirtCount(item.shirtOrders);
      const shirtFee = totalShirts * unitShirtFee;
      const totalFee = galaFee + shirtFee;

      galaAndShirtCells = [
        galaFlag,
        galaFee,
        ...maleQtys,
        ...femaleQtys,
        totalShirts,
        shirtFee,
        sanitizeExcelText(item.shirtDetails || formatShirtDetails(item.shirtOrders)),
        totalFee,
        sanitizeExcelText(item.paymentStatus || 'Chờ thanh toán'),
      ];
    }

    return [
      item.stt,
      sanitizeExcelText(item.ticketCode),
      sanitizeExcelText(item.fullName),
      sanitizeExcelText(item.phone),
      sanitizeExcelText(item.email),
      sanitizeExcelText(item.className),
      sanitizeExcelText(item.faculty),
      sanitizeExcelText(item.major),
      sanitizeExcelText(item.graduationYear),
      sanitizeExcelText(item.workplace),
      sanitizeExcelText(item.province),
      ...galaAndShirtCells,
      ...customValues,
      sanitizeExcelText(item.note || '—'),
      sanitizeExcelText(item.registeredAt),
      sanitizeExcelText(item.status),
    ];
  });

  const headerRowIndex1Based = titleRows.length + 1;
  const firstDataRow1Based = headerRowIndex1Based + 1;
  const lastDataRow1Based = firstDataRow1Based + attendees.length - 1;

  const totalRow: (string | number | { formula: string; result: number })[] = new Array(
    tableHeader.length
  ).fill('');
  totalRow[2] = 'TỔNG CỘNG (HÀM =SUM TỰ ĐỘNG)';

  if (isGala && attendees.length > 0) {
    const sumColIndices = [
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27,
    ];
    sumColIndices.forEach((colIdx) => {
      const colLetter = encodeExcelCol(colIdx);
      const numericFallback = dataRows.reduce(
        (acc, r) => acc + (Number(r[colIdx]) || 0),
        0
      );
      totalRow[colIdx] = {
        formula: `SUM(${colLetter}${firstDataRow1Based}:${colLetter}${lastDataRow1Based})`,
        result: numericFallback,
      };
    });
  }

  titleRows.forEach((r) => ws1.addRow(r));
  const headerRow1 = ws1.addRow(tableHeader);
  headerRow1.font = { bold: true };
  dataRows.forEach((r) => ws1.addRow(r));
  const totalRow1 = ws1.addRow(totalRow);
  totalRow1.font = { bold: true };

  const colWidths1: number[] = [
    6, 16, 28, 15, 28, 10, 24, 24, 10, 36, 20,
  ];
  if (isGala) {
    colWidths1.push(
      22,
      16,
      ...MALE_SHIRT_SIZES.map(() => 12),
      ...FEMALE_SHIRT_SIZES.map(() => 12),
      14,
      16,
      34,
      18,
      18
    );
  }
  customFields.forEach((cf) => {
    colWidths1.push(Math.max(cf.label.length + 4, 24));
  });
  colWidths1.push(36, 18, 20);
  colWidths1.forEach((w, idx) => {
    ws1.getColumn(idx + 1).width = w;
  });

  // ============================================================================
  // SHEET 2: CHI TIẾT ĐẶT ÁO (TÁCH DÒNG - 1 DÒNG = 1 LOẠI ÁO CHO SUMIFS / PIVOT)
  // ============================================================================
  if (isGala) {
    const wsShirtLines = workbook.addWorksheet('2. Chi tiết Đặt áo (Tách dòng)');

    const shirtLineHeader = [
      'STT DÒNG',
      'MÃ VÉ ĐẠI BIỂU',
      'HỌ VÀ TÊN NGƯỜI ĐẶT',
      'SỐ ĐIỆN THOẠI',
      'LỚP',
      'KHOA ĐÀO TẠO',
      'FORM ÁO (NAM / NỮ)',
      'SIZE ÁO (S..3XL)',
      'MÃ PHÂN LOẠI (FORM - SIZE)',
      'SỐ LƯỢNG (ÁO)',
      'ĐƠN GIÁ (VNĐ)',
      'THÀNH TIỀN (VNĐ)',
      'TRẠNG THÁI NỘP PHÍ',
    ];

    const shirtLineRows: (string | number)[][] = [];
    let lineStt = 1;

    attendees.forEach((att) => {
      const orders = normalizeShirtOrders(att.shirtOrders);
      orders.forEach((ord) => {
        const amount = ord.quantity * unitShirtFee;
        shirtLineRows.push([
          lineStt++,
          sanitizeExcelText(att.ticketCode),
          sanitizeExcelText(att.fullName),
          sanitizeExcelText(att.phone),
          sanitizeExcelText(att.className),
          sanitizeExcelText(att.faculty),
          ord.gender,
          ord.size,
          `${ord.gender} - ${ord.size}`,
          ord.quantity,
          unitShirtFee,
          amount,
          sanitizeExcelText(att.paymentStatus || 'Chờ thanh toán'),
        ]);
      });
    });

    const shirtSheetTitle: (string | number)[][] = [
      ['BẢNG CHI TIẾT ĐẶT ÁO ĐỒNG PHỤC (CHUẨN HÓA 1 DÒNG = 1 HẠNG MỤC ÁO)'],
      [`Sự kiện: ${safeEventTitle}`],
      [
        'Quy tắc xử lý người đặt nhiều áo: Nếu 1 đại biểu đăng ký 1 áo Nam size M và 1 áo Nữ size L, hệ thống tự động tách thành 2 dòng độc lập dưới đây để dùng hàm =SUMIFS(), =COUNTIFS() hoặc kéo PivotTable chính xác 100%.',
      ],
      [],
    ];

    const firstShirtDataRow = shirtSheetTitle.length + 2;
    const lastShirtDataRow = firstShirtDataRow + shirtLineRows.length - 1;

    const totalShirtQty = shirtLineRows.reduce((s, r) => s + Number(r[9]), 0);
    const totalShirtMoney = shirtLineRows.reduce((s, r) => s + Number(r[11]), 0);

    const shirtTotalRow: (string | number | { formula: string; result: number })[] = [
      '',
      '',
      'TỔNG CỘNG ĐƠN ÁO',
      '',
      '',
      '',
      '',
      '',
      '',
      shirtLineRows.length > 0
        ? {
            formula: `SUM(J${firstShirtDataRow}:J${lastShirtDataRow})`,
            result: totalShirtQty,
          }
        : 0,
      '',
      shirtLineRows.length > 0
        ? {
            formula: `SUM(L${firstShirtDataRow}:L${lastShirtDataRow})`,
            result: totalShirtMoney,
          }
        : 0,
      '',
    ];

    shirtSheetTitle.forEach((r) => wsShirtLines.addRow(r));
    const shirtHeaderRow = wsShirtLines.addRow(shirtLineHeader);
    shirtHeaderRow.font = { bold: true };
    shirtLineRows.forEach((r) => wsShirtLines.addRow(r));
    const shirtSumRow = wsShirtLines.addRow(shirtTotalRow);
    shirtSumRow.font = { bold: true };

    const colWidths2 = [10, 16, 28, 15, 10, 24, 18, 16, 24, 16, 16, 18, 18];
    colWidths2.forEach((w, idx) => {
      wsShirtLines.getColumn(idx + 1).width = w;
    });
  }

  // ============================================================================
  // SHEET 3: BÁO CÁO TỔNG HỢP & BẢNG CHỐT SỐ LƯỢNG NHÀ MAY
  // ============================================================================
  const wsSummary = workbook.addWorksheet(
    isGala ? '3. Báo cáo tổng hợp' : '2. Báo cáo tổng hợp'
  );

  const facultyCounts: Record<string, number> = {};
  const provinceCounts: Record<string, number> = {};

  attendees.forEach((a) => {
    facultyCounts[a.faculty] = (facultyCounts[a.faculty] || 0) + 1;
    provinceCounts[a.province] = (provinceCounts[a.province] || 0) + 1;
  });

  const summaryRows: (string | number)[][] = [
    ['BÁO CÁO THỐNG KÊ TỔNG HỢP & BẢNG CHỐT SỐ LƯỢNG ÁO GỬI NHÀ MAY'],
    [`Sự kiện: ${safeEventTitle}`],
    [`Tổng số đại biểu: ${attendees.length} người | Thời điểm lập: ${exportDate}`],
    [],
  ];

  if (isGala) {
    const galaYesCount = attendees.filter((a) => a.attendGala).length;
    const galaNoCount = attendees.length - galaYesCount;
    const totalShirts = attendees.reduce(
      (sum, a) => sum + (a.shirtTotalCount ?? getShirtCount(a.shirtOrders)),
      0
    );
    const totalExpectedRevenue = attendees.reduce(
      (sum, a) => sum + (a.totalFee || 0),
      0
    );
    const paidRevenue = attendees
      .filter((a) => a.paymentStatus === 'Đã chuyển khoản')
      .reduce((sum, a) => sum + (a.totalFee || 0), 0);
    const pendingRevenue = totalExpectedRevenue - paidRevenue;

    summaryRows.push([
      'I. BẢNG TỔNG HỢP SỐ LƯỢNG ÁO THEO TỪNG FORM & SIZE (DÙNG ĐỂ ĐẶT XƯỞNG MAY)',
    ]);
    summaryRows.push([
      'SIZE ÁO',
      'SỐ LƯỢNG ÁO FORM NAM',
      'SỐ LƯỢNG ÁO FORM NỮ',
      'TỔNG SỐ LƯỢNG (NAM + NỮ)',
      `THÀNH TIỀN (${unitShirtFee.toLocaleString('vi-VN')}Đ/ÁO)`,
    ]);

    let sumMaleAll = 0;
    let sumFemaleAll = 0;

    MALE_SHIRT_SIZES.forEach((sz) => {
      const mCount = attendees.reduce(
        (acc, a) => acc + getShirtQtyByGenderAndSize(a.shirtOrders, 'Nam', sz),
        0
      );
      const fCount = attendees.reduce(
        (acc, a) => acc + getShirtQtyByGenderAndSize(a.shirtOrders, 'Nữ', sz),
        0
      );
      sumMaleAll += mCount;
      sumFemaleAll += fCount;
      const rowTotal = mCount + fCount;
      summaryRows.push([
        `Size ${sz}`,
        mCount,
        sz === '3XL' ? 0 : fCount,
        rowTotal,
        rowTotal * unitShirtFee,
      ]);
    });

    summaryRows.push([
      'TỔNG CỘNG SỐ ÁO',
      sumMaleAll,
      sumFemaleAll,
      sumMaleAll + sumFemaleAll,
      (sumMaleAll + sumFemaleAll) * unitShirtFee,
    ]);

    summaryRows.push([]);
    summaryRows.push(['II. TỔNG HỢP LỆ PHÍ GALA & ĐỐI SOÁT TÀI CHÍNH']);
    summaryRows.push(['Hạng mục', 'Số lượng', 'Thành tiền (VNĐ)', 'Ghi chú']);
    summaryRows.push([
      `1. Đại biểu tham dự Đêm Gala (${unitGalaFee.toLocaleString('vi-VN')}đ/người)`,
      galaYesCount,
      galaYesCount * unitGalaFee,
      `${((galaYesCount / Math.max(attendees.length, 1)) * 100).toFixed(1)}% đại biểu tham dự tiệc`,
    ]);
    summaryRows.push([
      '2. Đại biểu không tham dự tiệc Gala',
      galaNoCount,
      0,
      'Chỉ tham dự phiên họp mặt chung',
    ]);
    summaryRows.push([
      `3. Tổng số áo đồng phục đã đặt (${unitShirtFee.toLocaleString('vi-VN')}đ/áo)`,
      totalShirts,
      totalShirts * unitShirtFee,
      `Nam: ${sumMaleAll} áo | Nữ: ${sumFemaleAll} áo`,
    ]);
    summaryRows.push([
      '4. TỔNG KINH PHÍ DỰ THU (GALA + ÁO)',
      attendees.length,
      totalExpectedRevenue,
      'Tổng cộng toàn sự kiện',
    ]);
    summaryRows.push([
      '• Đã chuyển khoản (Đã đối soát)',
      attendees.filter((a) => a.paymentStatus === 'Đã chuyển khoản').length,
      paidRevenue,
      'Đã nhận vào TK Ban Điều hành Mạng lưới CSV KTD',
    ]);
    summaryRows.push([
      '• Chờ thanh toán (Cần nhắc chuyển khoản)',
      attendees.filter((a) => a.paymentStatus === 'Chờ thanh toán').length,
      pendingRevenue,
      'Đang chờ đối soát',
    ]);
    summaryRows.push([]);
  }

  summaryRows.push([
    `${isGala ? 'III' : 'I'}. PHÂN BỐ ĐẠI BIỂU THEO KHOA ĐÀO TẠO`,
  ]);
  summaryRows.push(['STT', 'KHOA ĐÀO TẠO', 'SỐ LƯỢNG (ĐẠI BIỂU)', 'TỶ LỆ (%)']);

  let facIdx = 1;
  Object.entries(facultyCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([fac, count]) => {
      const pct = ((count / Math.max(attendees.length, 1)) * 100).toFixed(1) + '%';
      summaryRows.push([facIdx++, sanitizeExcelText(fac), count, pct]);
    });

  summaryRows.push([]);
  summaryRows.push([
    `${isGala ? 'IV' : 'II'}. PHÂN BỐ ĐẠI BIỂU THEO TỈNH / THÀNH PHỐ`,
  ]);
  summaryRows.push(['STT', 'TỈNH / THÀNH PHỐ', 'SỐ LƯỢNG', 'TỶ LỆ (%)']);

  let provIdx = 1;
  Object.entries(provinceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([prov, count]) => {
      const pct = ((count / Math.max(attendees.length, 1)) * 100).toFixed(1) + '%';
      summaryRows.push([provIdx++, sanitizeExcelText(prov), count, pct]);
    });

  if (customFields.length > 0) {
    summaryRows.push([]);
    summaryRows.push([
      `${isGala ? 'V' : 'III'}. THỐNG KÊ CÂU TRẢ LỜI KHẢO SÁT TÙY CHỈNH`,
    ]);

    customFields.forEach((cf, cIdx) => {
      summaryRows.push([
        sanitizeExcelText(
          `${cIdx + 1}. ${cf.label.toUpperCase()} (${cf.required ? 'Bắt buộc' : 'Tùy chọn'})`
        ),
      ]);
      summaryRows.push(['Phương án trả lời', 'Số lượng phản hồi', 'Tỷ lệ (%)']);

      const answerCounts: Record<string, number> = {};
      attendees.forEach((att) => {
        const val = att.customAnswers[cf.id];
        let key = 'Chưa điền / Bỏ qua';
        if (Array.isArray(val)) {
          if (val.length === 0) {
            key = 'Chưa chọn mục nào';
            answerCounts[key] = (answerCounts[key] || 0) + 1;
          } else {
            val.forEach((item) => {
              const itemKey = String(item);
              answerCounts[itemKey] = (answerCounts[itemKey] || 0) + 1;
            });
            return;
          }
        } else if (typeof val === 'boolean') {
          key = val ? 'Có / Đồng ý' : 'Không';
        } else if (val) {
          key = String(val);
        }
        answerCounts[key] = (answerCounts[key] || 0) + 1;
      });

      Object.entries(answerCounts).forEach(([ansKey, cnt]) => {
        const pct = ((cnt / Math.max(attendees.length, 1)) * 100).toFixed(1) + '%';
        summaryRows.push([sanitizeExcelText(ansKey), cnt, pct]);
      });
      summaryRows.push([]);
    });
  }

  summaryRows.forEach((r) => wsSummary.addRow(r));
  [44, 24, 24, 24, 24].forEach((w, idx) => {
    wsSummary.getColumn(idx + 1).width = w;
  });

  const cleanEventTitle = event.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 40);
  const dateStr = getVietnamDateIso().replace(/-/g, '');
  const fileName = `Danh_sach_dang_ky_${cleanEventTitle}_${dateStr}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
