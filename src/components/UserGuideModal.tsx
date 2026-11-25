import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Smartphone,
  LogIn,
  UserCheck,
  Calendar,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Share,
  Compass,
  ShieldCheck,
  ArrowRight,
  Building2,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  initialSection?: 'newbie' | 'ios';
  onClose: () => void;
  onNavigateToTab?: (tab: 'network' | 'executive' | 'business' | 'events' | 'admin') => void;
  onTriggerGoogleLogin?: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  initialSection = 'newbie',
  onClose,
  onNavigateToTab,
  onTriggerGoogleLogin,
}) => {
  const [activeSection, setActiveSection] = useState<'newbie' | 'ios'>(initialSection);
  const [copiedUrl, setCopiedUrl] = useState(false);

  React.useEffect(() => {
    if (isOpen && initialSection) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const input = document.createElement('input');
        input.value = currentUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    } catch {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-guide-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Top Crimson Rule */}
        <div className="h-1.5 w-full bg-[#9E1B20] shrink-0" />

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-50 text-[#9E1B20] border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#9E1B20]">
                CẨM NANG THÀNH VIÊN · ALUMNI KTD
              </div>
              <h2
                id="user-guide-modal-title"
                className="text-base sm:text-xl font-bold text-[#0F172A] leading-snug"
              >
                Hướng dẫn Sử dụng cho Người mới &amp; Lưu ý trên Thiết bị iOS (iPhone/iPad)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Quy trình chuẩn hóa giúp cựu sinh viên định danh hồ sơ, đăng ký sự kiện và thao tác mượt mà trên mọi thiết bị.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="Đóng hướng dẫn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Section Switcher (Segmented Control) */}
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveSection('newbie')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeSection === 'newbie'
                  ? 'bg-[#9E1B20] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#0F172A] hover:bg-white/60'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>1. Hướng dẫn 4 bước cho Người mới</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('ios')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeSection === 'ios'
                  ? 'bg-[#9E1B20] text-white shadow-xs'
                  : 'text-slate-700 hover:text-[#0F172A] hover:bg-white/60'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>2. Lưu ý quan trọng cho iOS (iPhone / iPad)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#F8FAFC]">
          {activeSection === 'newbie' ? (
            <div className="space-y-6">
              {/* Quick Intro Banner */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#9E1B20]">
                    BẮT ĐẦU NHANH TRONG 1 PHÚT
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0F172A]">
                    Chào mừng bạn đến với Cổng Kết nối Cựu sinh viên Đại học Kiến trúc Đà Nẵng (ALUMNI KTD)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hệ thống sử dụng cơ chế định danh tự động qua tài khoản Google (Gmail), không cần tạo mật khẩu mới. Thực hiện lần lượt 4 bước dưới đây để hoàn tất kết nối.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('ios')}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1.5 transition-colors self-start sm:self-center"
                >
                  <Smartphone className="w-4 h-4 text-[#9E1B20]" />
                  <span>Đang dùng iPhone? Xem lưu ý iOS →</span>
                </button>
              </div>

              {/* 4 Steps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#9E1B20]">
                        <span className="w-6 h-6 rounded-lg bg-[#9E1B20] text-white flex items-center justify-center text-xs">
                          01
                        </span>
                        <span>BƯỚC 1 · ĐĂNG NHẬP XÁC THỰC</span>
                      </span>
                      <LogIn className="w-4 h-4 text-slate-400" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">
                      Đăng nhập bằng Tài khoản Google (Gmail)
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Tại trang chủ <strong>01. Mạng lưới ALUMNI</strong>, bấm nút màu đỏ <strong>&quot;Đăng nhập bằng tài khoản Google&quot;</strong>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Chọn tài khoản Gmail cá nhân của bạn. Hệ thống tự động định danh và bảo mật thông tin mà không cần nhớ mật khẩu riêng.
                        </span>
                      </li>
                    </ul>
                  </div>
                  {onTriggerGoogleLogin && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onTriggerGoogleLogin();
                        }}
                        className="w-full py-2 px-3 bg-red-50 hover:bg-[#9E1B20] text-[#9E1B20] hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Thực hiện Bước 1: Đăng nhập ngay</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 2 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#9E1B20]">
                        <span className="w-6 h-6 rounded-lg bg-[#9E1B20] text-white flex items-center justify-center text-xs">
                          02
                        </span>
                        <span>BƯỚC 2 · HỒ SƠ CÁ NHÂN</span>
                      </span>
                      <UserCheck className="w-4 h-4 text-slate-400" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">
                      Khai báo Hồ sơ Cựu sinh viên KTD
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Ngay sau khi đăng nhập lần đầu, biểu mẫu <strong>Cập nhật Hồ sơ Thành viên</strong> sẽ tự động mở ra.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Điền <strong>Họ tên, SĐT/Zalo, Lớp sinh hoạt, Niên khóa</strong>, chọn <strong>Khoa đào tạo</strong> (1 trong 8 Khoa) và <strong>Tỉnh/Thành công tác</strong> (theo danh mục 34 tỉnh/thành mới).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Bấm <strong>Lưu thông tin</strong> — hồ sơ được lưu tức thì và chuyển về màn hình chính.
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>SĐT và ngày sinh được bảo mật, chỉ phục vụ kết nối nội bộ mạng lưới.</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#9E1B20]">
                        <span className="w-6 h-6 rounded-lg bg-[#9E1B20] text-white flex items-center justify-center text-xs">
                          03
                        </span>
                        <span>BƯỚC 3 · ĐĂNG KÝ SỰ KIỆN &amp; ÁO</span>
                      </span>
                      <Calendar className="w-4 h-4 text-slate-400" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">
                      Đăng ký Sự kiện, Tiệc Gala &amp; Đặt Áo Kỷ niệm
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Vào mục <strong>04. Theo dòng Sự kiện</strong> (hoặc bấm trực tiếp trên Sự kiện ghim ở Trang chủ) và chọn <strong>&quot;Đăng ký tham gia sự kiện&quot;</strong>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Tùy chọn tham dự <strong>Tiệc Gala</strong> và <strong>Đặt áo đồng phục kỷ niệm</strong> (hệ thống tự gợi ý size chuẩn theo chiều cao &amp; cân nặng, cho phép đặt thêm nhiều áo Form Nam/Nữ).
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Quét <strong>Mã VietQR cá nhân hóa</strong> (đã tự động điền sẵn số tiền + cú pháp Họ tên &amp; SĐT của bạn) rồi bấm <strong>Xác nhận Đăng ký</strong>.
                        </span>
                      </li>
                    </ul>
                  </div>
                  {onNavigateToTab && (
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToTab('events');
                        }}
                        className="w-full py-2 px-3 bg-slate-100 hover:bg-[#9E1B20] text-slate-800 hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Chuyển đến mục 04. Theo dòng Sự kiện</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 4 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#9E1B20]">
                        <span className="w-6 h-6 rounded-lg bg-[#9E1B20] text-white flex items-center justify-center text-xs">
                          04
                        </span>
                        <span>BƯỚC 4 · TRA CỨU ĐƠN &amp; KẾT NỐI B2B</span>
                      </span>
                      <QrCode className="w-4 h-4 text-slate-400" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-[#0F172A]">
                      Xem lại Mã QR Thanh toán, Trạng thái BTC &amp; Doanh nghiệp
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Bấm vào <strong>Tên tài khoản của bạn</strong> ở góc trên bên phải màn hình -&gt; Chọn <strong>&quot;Đơn đăng ký &amp; Mã QR Sự kiện&quot;</strong> để xem lại chi tiết đơn và mã QR thanh toán riêng của bạn bất kỳ lúc nào.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Sau khi chuyển khoản, Ban Tổ chức sẽ đối soát và tích <strong>&quot;[✓] BTC đã xác nhận&quot;</strong> ngay bên cạnh tên của bạn trong Danh sách đại biểu.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Tại mục <strong>03. Cộng đồng Doanh nghiệp</strong>, các thành viên đã hoàn tất hồ sơ cá nhân có thể đăng tải thông tin doanh nghiệp để kết nối giao thương.
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#9E1B20] shrink-0" />
                    <span>Lưu ý: Sau khi chốt đăng ký sự kiện, nếu cần đổi size áo vui lòng báo Ban Tổ chức hỗ trợ.</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SECTION 2: LƯU Ý QUAN TRỌNG CHO THIẾT BỊ iOS (iPHONE / iPAD) */
            <div className="space-y-5">
              {/* Top Critical Warning for iOS Zalo/FB In-App Browser */}
              <div className="bg-amber-50 border-l-4 border-[#9E1B20] rounded-r-xl p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#9E1B20] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#9E1B20]">
                      LƯU Ý SỐ 1 QUAN TRỌNG NHẤT TRÊN iPHONE / iPAD (iOS)
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0F172A]">
                      Không đăng nhập Google trực tiếp bên trong cửa sổ chat Zalo, Facebook hoặc Messenger
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Trên hệ điều hành <strong>iOS (iPhone/iPad)</strong>, khi bạn bấm vào đường link gửi qua <strong>Zalo</strong> hoặc <strong>Facebook Messenger</strong>, máy sẽ mở bằng <em>trình duyệt nhúng thu gọn</em>. Cơ chế bảo mật của Apple (WebKit) sẽ chặn cửa sổ xác thực Google hoặc báo lỗi <code>disallowed_useragent / missing initial state</code>.
                    </p>
                  </div>
                </div>

                {/* 2-Step Fix on iPhone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#9E1B20] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-[#0F172A]">
                        Bấm vào biểu tượng 3 chấm <code className="px-1.5 py-0.5 bg-slate-100 rounded font-extrabold">•••</code> ở góc trên bên phải màn hình Zalo / Facebook
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        Biểu tượng nằm ngay góc trên cùng bên phải của cửa sổ xem trang web trong Zalo.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#9E1B20] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-[#0F172A]">
                        Chọn &quot;Mở bằng trình duyệt&quot; (Mở bằng Safari hoặc Chrome)
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        Trang web sẽ chuyển sang trình duyệt <strong>Safari</strong> chính thức của iPhone và đăng nhập Google mượt mà trong 2 giây.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Copy Link Button for Safari */}
                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white/90 p-3 rounded-xl border border-amber-200/80">
                  <div className="text-xs text-slate-700">
                    <strong>Cách nhanh nhất:</strong> Sao chép đường dẫn dưới đây rồi mở ứng dụng <strong>Safari</strong> trên iPhone và dán vào thanh địa chỉ:
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-3.5 py-2 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã chép link! Hãy dán vào Safari</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép liên kết mở Safari</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 3 Additional iOS-Specific Tips Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* iOS Tip 2: Safari Pop-up & Private Mode */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#9E1B20]">
                    <Compass className="w-4 h-4 shrink-0" />
                    <span>LƯU Ý 2 · CÀI ĐẶT SAFARI</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    Khi bấm &quot;Đăng nhập Google&quot; trên Safari nhưng không hiện cửa sổ
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nếu iPhone đang bật chặn cửa sổ bật lên, Safari sẽ hỏi <em>&quot;Trang web này đang cố mở cửa sổ bật lên&quot;</em> — hãy bấm <strong>&quot;Cho phép&quot; (Allow)</strong>.
                  </p>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-700 space-y-1">
                    <p className="font-semibold text-slate-900">Cách bật vĩnh viễn trên iPhone:</p>
                    <p>
                      Vào <strong>Cài đặt (Settings)</strong> &rarr; <strong>Safari</strong> &rarr; Tắt mục <strong>&quot;Chặn cửa sổ bật lên&quot; (Block Pop-ups)</strong>. Hạn chế dùng chế độ <em>Duyệt riêng tư (Private)</em> để không bị thoát phiên đăng nhập.
                    </p>
                  </div>
                </div>

                {/* iOS Tip 3: Saving VietQR Image & Zalo Deep Link */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#9E1B20]">
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span>LƯU Ý 3 · QUÉT QR &amp; MỞ ZALO</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    Cách lưu ảnh Mã QR Thanh toán &amp; Kết nối Zalo trên iPhone
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Lưu ảnh VietQR:</strong> Trên Safari iOS, bạn chỉ cần <strong>nhấn giữ ngón tay (2 giây)</strong> trực tiếp vào hình Mã QR và chọn <strong>&quot;Thêm vào Ảnh&quot; (Save to Photos)</strong>, hoặc bấm nút <strong>Chép</strong> số tài khoản &amp; lệnh chuyển khoản.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Kết nối Zalo đồng môn:</strong> Khi bấm nút Zalo của thành viên trên iPhone và hộp thoại hỏi <em>&quot;Mở trang này trong Zalo?&quot;</em>, hãy bấm <strong>Mở (Open)</strong> để chuyển thẳng tới trang cá nhân Zalo.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* iOS Tip 4: Add to Home Screen (PWA-like experience) */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#9E1B20]">
                    <Share className="w-4 h-4 shrink-0" />
                    <span>LƯU Ý 4 · MẸO TIỆN ÍCH iOS</span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    Đưa biểu tượng ALUMNI KTD ra Màn hình chính iPhone
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Để tra cứu danh bạ cựu sinh viên và đơn đăng ký sự kiện nhanh như một ứng dụng cài sẵn trên iPhone:
                  </p>
                  <ol className="space-y-1.5 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 list-decimal list-inside">
                    <li>
                      Mở trang web bằng trình duyệt <strong>Safari</strong> trên iPhone.
                    </li>
                    <li>
                      Bấm nút <strong>Chia sẻ (Share)</strong> (biểu tượng ô vuông có mũi tên hướng lên ở thanh dưới cùng).
                    </li>
                    <li>
                      Cuộn xuống chọn <strong>&quot;Thêm vào Màn hình chính&quot; (Add to Home Screen)</strong> &rarr; Bấm <strong>Thêm</strong>.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Cần hỗ trợ trực tiếp về tài khoản hoặc điều chỉnh thông tin đăng ký sự kiện, vui lòng liên hệ <strong>Ban Điều hành ALUMNI KTD</strong>.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeSection === 'newbie' ? (
              <button
                type="button"
                onClick={() => setActiveSection('ios')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Xem Lưu ý iOS (iPhone/iPad)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSection('newbie')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Xem 4 bước cho Người mới
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Đã hiểu &amp; Đóng hướng dẫn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
