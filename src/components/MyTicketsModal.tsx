import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Download,
  Sparkles,
  QrCode,
  FileText,
  Shirt,
  DollarSign,
  Copy,
  Check,
  ArrowRight,
  Lock,
  UserCheck,
} from 'lucide-react';
import {
  EventRecord,
  EventRegistrationRecord,
  MemberProfileRecord,
} from '../data/constants';
import {
  buildTransferSyntax,
  buildVietQrImageUrl,
  generateIcsCalendarContent,
} from '../utils/alumniLogic';

interface MyTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    uid: string;
    email: string;
    displayName: string;
    isAdmin: boolean;
    authMode?: 'password' | 'google' | 'demo';
  } | null;
  currentMemberProfile: MemberProfileRecord | null;
  savedUserPhone?: string;
  events: EventRecord[];
  userRegistrations: Record<string, EventRegistrationRecord>;
  onExploreEvents: () => void;
  onNavigateToEventDetail?: (eventId: string) => void;
}

export const MyTicketsModal: React.FC<MyTicketsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentMemberProfile,
  savedUserPhone = '',
  events,
  userRegistrations,
  onExploreEvents,
  onNavigateToEventDetail,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Chức năng xem Đơn đăng ký & Mã QR thanh toán chỉ dành riêng cho thành viên đã đăng nhập
  if (!isOpen || !currentUser) return null;

  // Chỉ lấy các đơn đăng ký gắn đúng với UID của thành viên đang đăng nhập
  const myRegisteredEvents = events.filter((ev) => {
    const reg = userRegistrations[ev.id];
    return Boolean(reg && reg.uid === currentUser.uid);
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleDownloadIcs = (event: EventRecord) => {
    const icsContent = generateIcsCalendarContent(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alumni-ktd-${event.id}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-registrations-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-5 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#9E1B20] shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="my-registrations-title"
                  className="text-lg sm:text-xl font-bold text-[#0F172A]"
                >
                  Đơn Đăng ký Sự kiện & Mã QR Thanh toán Cá nhân
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold text-[#9E1B20] bg-red-50 rounded-full border border-[#9E1B20]/20">
                  {myRegisteredEvents.length} Đơn đăng ký
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Thông tin đơn đăng ký và mã VietQR chuyển khoản được gắn định danh riêng với tài khoản thành viên{' '}
                <strong className="text-slate-800">
                  {currentMemberProfile?.fullName || currentUser.displayName}
                </strong>
                .
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ đơn đăng ký"
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-5 overflow-y-auto flex-1 pr-1">
          {myRegisteredEvents.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mx-auto shadow-xs">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0F172A]">
                  Bạn chưa có đơn đăng ký tham gia sự kiện nào
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Khám phá các chương trình hội ngộ, tọa đàm chuyên môn và đêm tiệc Gala của ALUMNI KTD để đăng ký tham dự.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExploreEvents();
                }}
                className="px-5 py-2.5 bg-[#9E1B20] text-white text-sm font-semibold rounded-lg hover:bg-[#7D1418] cursor-pointer inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>Xem Sự kiện & Đăng ký tham gia</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start sm:items-center gap-3 text-xs sm:text-sm text-emerald-900">
                <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  Đơn đăng ký và Mã QR thanh toán dưới đây được bảo mật và chỉ hiển thị riêng cho tài khoản thành viên của bạn (<strong>{currentUser.email}</strong>).
                </span>
              </div>

              {myRegisteredEvents.map((event) => {
                const reg = userRegistrations[event.id];
                if (!reg || reg.uid !== currentUser.uid) return null;

                const cleanId = event.id
                  .replace(/[^a-zA-Z0-9]/g, '')
                  .slice(-4)
                  .toUpperCase();
                const userTag = currentUser.uid.slice(0, 5).toUpperCase();
                const regCode = `KTD-DK${cleanId}-${userTag}`;

                const isGalaEvent = Boolean(
                  event.isGalaWithShirtFee ||
                    event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
                    event.id === 'evt-gala-can-bo-doan'
                );

                const unitGalaFee = event.galaFeeAmount ?? 350000;
                const unitShirtFee = event.shirtFeeAmount ?? 110000;
                const attendGala =
                  reg.attendGala !== undefined ? reg.attendGala : true;
                const shirtOrders = reg.shirtOrders || [];
                const totalShirts = shirtOrders.reduce(
                  (sum, item) => sum + item.quantity,
                  0
                );
                const computedFee = isGalaEvent
                  ? (attendGala ? unitGalaFee : 0) + totalShirts * unitShirtFee
                  : 0;
                const totalFee =
                  typeof reg.totalFee === 'number' ? reg.totalFee : computedFee;

                const memberFullName =
                  reg.fullName ||
                  currentMemberProfile?.fullName ||
                  currentUser.displayName ||
                  'Cựu sinh viên KTD';
                const memberPhone =
                  reg.customAnswers?.zaloPhone ||
                  currentMemberProfile?.zaloPhone ||
                  savedUserPhone ||
                  '';
                const memberClass = currentMemberProfile?.className || 'KTD';
                const memberFaculty =
                  reg.faculty || currentMemberProfile?.faculty || 'Khoa Kiến trúc';

                const bankName =
                  event.bankName || 'Vietcombank (Chi nhánh Đà Nẵng)';
                const bankAccount = event.bankAccount || '1018 2026 88';
                const bankAccountName =
                  event.bankAccountName || 'MANG LUOI ALUMNI KTD - BTC GALA';
                const suffix = event.transferSyntaxPrefix || 'Gala';

                const transferSyntax = buildTransferSyntax({
                  fullName: memberFullName,
                  phone: memberPhone || 'SĐT',
                  suffix,
                });

                const vietQrUrl = buildVietQrImageUrl({
                  bankName,
                  bankAccount,
                  bankAccountName,
                  amount: totalFee,
                  transferSyntax,
                });

                const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
                  `Ngân hàng: ${bankName} | STK: ${bankAccount} | Chủ TK: ${bankAccountName} | Số tiền: ${totalFee} VND | Nội dung: ${transferSyntax}`
                )}`;

                const isPaid = reg.paymentStatus === 'completed';

                return (
                  <div
                    key={event.id}
                    className="border-2 border-slate-200 rounded-2xl p-4 sm:p-6 bg-white shadow-xs space-y-5"
                  >
                    {/* Event Title & Status Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 text-[11px] font-bold text-[#9E1B20] bg-red-50 rounded-md border border-[#9E1B20]/20">
                            {event.category}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Mã đơn: {regCode}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-[#0F172A] leading-snug">
                          {event.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#9E1B20]" />
                            <strong>Ngày:</strong> {event.eventDate} ({event.eventTime})
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#9E1B20]" />
                            <strong>Địa điểm:</strong> {event.venue}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã ghi nhận đơn ĐK
                        </span>
                        {totalFee > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {isPaid ? 'Đã chuyển khoản' : 'Chờ thanh toán CK'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Member Identity & Registration Details + Personal QR Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Left Column: Chi tiết Đơn đăng ký của Thành viên */}
                      <div
                        className={`${
                          totalFee > 0 ? 'lg:col-span-7' : 'lg:col-span-12'
                        } space-y-4`}
                      >
                        {/* 1. Thông tin Thành viên */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wider text-[#9E1B20] flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>1. Thông tin Thành viên Đăng ký</span>
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {reg.createdAt
                                ? new Date(reg.createdAt).toLocaleDateString('vi-VN')
                                : 'Đã xác nhận'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-700">
                            <div>
                              <span className="text-slate-500">Họ và tên: </span>
                              <strong className="text-slate-900">{memberFullName}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Lớp / Khoa: </span>
                              <strong className="text-slate-900">
                                {memberClass} · {memberFaculty}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500">SĐT / Zalo: </span>
                              <strong className="text-slate-900 font-mono">
                                {memberPhone || 'Chưa cập nhật'}
                              </strong>
                            </div>
                            <div className="truncate">
                              <span className="text-slate-500">Email: </span>
                              <strong className="text-slate-900">{reg.email || currentUser.email}</strong>
                            </div>
                          </div>
                        </div>

                        {/* 2. Chi tiết nội dung đăng ký & lệ phí */}
                        {isGalaEvent && (
                          <div className="p-3.5 bg-red-50/30 border border-red-200/80 rounded-xl space-y-3 text-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-red-100">
                              <span className="font-bold uppercase tracking-wider text-[#9E1B20] flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>2. Chi tiết Nội dung Đăng ký & Lệ phí</span>
                              </span>
                            </div>

                            <div className="space-y-2 text-slate-700">
                              <div className="flex items-center justify-between gap-2">
                                <span>• Tham dự Đêm Tiệc Gala:</span>
                                <span
                                  className={`font-bold ${
                                    attendGala ? 'text-[#9E1B20]' : 'text-slate-600'
                                  }`}
                                >
                                  {attendGala
                                    ? `Có tham dự (${unitGalaFee.toLocaleString('vi-VN')} VNĐ)`
                                    : 'Không tham dự (0 VNĐ)'}
                                </span>
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <span className="flex items-center gap-1">
                                  <Shirt className="w-3.5 h-3.5 text-[#9E1B20] shrink-0" />
                                  <span>Đặt áo đồng phục kỷ niệm:</span>
                                </span>
                                <span className="font-bold text-slate-900 text-right">
                                  {totalShirts > 0
                                    ? `${totalShirts} áo (${(
                                        totalShirts * unitShirtFee
                                      ).toLocaleString('vi-VN')} VNĐ)`
                                    : 'Không đặt áo (0 VNĐ)'}
                                </span>
                              </div>

                              {shirtOrders.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {shirtOrders.map((o, idx) => (
                                    <span
                                      key={o.id || idx}
                                      className="px-2.5 py-1 bg-white border border-red-200 rounded-lg font-bold text-[#9E1B20] text-[11px]"
                                    >
                                      Áo {idx + 1}: Form {o.gender} · Size{' '}
                                      {o.size === 'XXL' ? '2XL (XXL)' : o.size} · SL:{' '}
                                      {o.quantity}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="pt-2.5 border-t border-red-200/80 flex items-center justify-between">
                                <span className="font-extrabold text-slate-900 uppercase">
                                  TỔNG LỆ PHÍ ĐƠN ĐĂNG KÝ:
                                </span>
                                <span className="text-base font-extrabold text-[#9E1B20] font-mono">
                                  {totalFee.toLocaleString('vi-VN')} VNĐ
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. Ghi chú & Câu trả lời bổ sung */}
                        {(reg.note ||
                          (reg.customAnswers &&
                            Object.keys(reg.customAnswers).filter(
                              (k) =>
                                k !== 'cf_attend_gala' &&
                                k !== 'cf_uniform_shirt' &&
                                k !== 'total_fee_display' &&
                                k !== 'zaloPhone'
                            ).length > 0)) && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                            <span className="font-bold uppercase tracking-wider text-slate-600 block">
                              Thông tin bổ sung & Ghi chú:
                            </span>
                            {reg.note && (
                              <p className="text-slate-700">
                                <strong>Ghi chú:</strong> {reg.note}
                              </p>
                            )}
                            {reg.customAnswers && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {Object.entries(reg.customAnswers)
                                  .filter(
                                    ([k]) =>
                                      k !== 'cf_attend_gala' &&
                                      k !== 'cf_uniform_shirt' &&
                                      k !== 'total_fee_display' &&
                                      k !== 'zaloPhone'
                                  )
                                  .map(([k, v]) => {
                                    const fieldDef = event.customFields?.find(
                                      (f) => f.id === k
                                    );
                                    const label = fieldDef?.label || k;
                                    const display =
                                      typeof v === 'boolean'
                                        ? v
                                          ? 'Có'
                                          : 'Không'
                                        : Array.isArray(v)
                                          ? v.join(', ')
                                          : String(v);
                                    if (!display) return null;
                                    return (
                                      <span
                                        key={k}
                                        className="px-2 py-0.5 bg-white text-slate-700 rounded border border-slate-200"
                                      >
                                        <strong>{label}:</strong> {display}
                                      </span>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Mã QR Thanh toán gắn riêng với Thành viên */}
                      {totalFee > 0 && (
                        <div className="lg:col-span-5 p-4 bg-slate-50 border-2 border-[#9E1B20]/30 rounded-xl flex flex-col items-center text-center space-y-3">
                          <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Mã QR Thanh toán Cá nhân</span>
                          </span>

                          <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200">
                            <img
                              src={vietQrUrl}
                              alt={`Mã VietQR Thanh toán của ${memberFullName}`}
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (target.src !== fallbackQrUrl) {
                                  target.src = fallbackQrUrl;
                                }
                              }}
                              className="w-44 h-44 object-contain rounded-lg bg-white"
                            />
                          </div>

                          <div className="w-full bg-white p-3 rounded-xl border border-slate-200 text-left text-xs space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Ngân hàng:</span>
                              <span className="font-bold text-slate-900 text-right">
                                {bankName.split('(')[0].trim()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                              <div>
                                <span className="text-slate-500 block text-[11px]">
                                  Số tài khoản:
                                </span>
                                <span className="font-mono font-bold text-[#9E1B20]">
                                  {bankAccount}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    bankAccount.replace(/\s+/g, ''),
                                    `stk-${event.id}`
                                  )
                                }
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1"
                              >
                                {copiedKey === `stk-${event.id}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-700">Đã chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Chép STK</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                              <div>
                                <span className="text-slate-500 block text-[11px]">
                                  Số tiền chuyển khoản:
                                </span>
                                <span className="font-mono font-extrabold text-[#9E1B20]">
                                  {totalFee.toLocaleString('vi-VN')} VNĐ
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(String(totalFee), `amt-${event.id}`)
                                }
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1"
                              >
                                {copiedKey === `amt-${event.id}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-700">Đã chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Chép tiền</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 text-[11px]">
                                  Nội dung chuyển khoản định danh:
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopy(transferSyntax, `syn-${event.id}`)
                                  }
                                  className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-[#9E1B20] border border-red-200 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1"
                                >
                                  {copiedKey === `syn-${event.id}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-700">Đã chép</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Chép nội dung</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="font-mono font-bold text-xs text-[#9E1B20] bg-amber-50/80 border border-amber-200 px-2.5 py-1.5 rounded-lg break-words select-all">
                                {transferSyntax}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        Cần thay đổi thông tin đơn đăng ký hoặc size áo? Vui lòng liên hệ Ban Điều hành (Admin cấp 1).
                      </span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadIcs(event)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-[#9E1B20] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200 flex items-center gap-1.5"
                          title="Lưu lịch sự kiện vào Google / Apple Calendar"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span>Lưu lịch (.ics)</span>
                        </button>
                        {onNavigateToEventDetail && (
                          <button
                            type="button"
                            onClick={() => onNavigateToEventDetail(event.id)}
                            className="px-4 py-1.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <span>Mở tại trang Sự kiện</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Hệ thống Quản lý Đăng ký Sự kiện · Mạng lưới ALUMNI KTD</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
