import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  GraduationCap,
  Building2,
  Phone,
  Mail,
  Calendar,
  MapPin,
  CheckCircle2,
  Sparkles,
  Camera,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  FACULTY_MAJORS_LIST,
  FACULTY_MAJORS_MAP,
  MemberProfileRecord,
  VIETNAM_34_PROVINCES_2025,
} from '../data/constants';
import { MemberFormInput } from '../utils/alumniLogic';
import { autoResizeAndOptimizeFile } from '../utils/imageOptimizer';
import { ImageCropperModal } from './ImageCropperModal';

interface MemberProfileModalProps {
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
  isFirstLogin?: boolean;
  onSaveMemberProfile: (input: MemberFormInput) => Promise<any>;
  onSaveUserPhone?: (phone: string, fullName?: string) => Promise<void>;
  onNavigateToTab?: (tab: 'network' | 'events' | 'business') => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentMemberProfile,
  savedUserPhone = '',
  isFirstLogin = false,
  onSaveMemberProfile,
  onSaveUserPhone,
  onNavigateToTab,
}) => {
  const defaultFaculty = FACULTY_MAJORS_LIST[0].faculty;
  const defaultMajor = FACULTY_MAJORS_LIST[0].majors[0];

  const [formData, setFormData] = useState<MemberFormInput>({
    email: '',
    fullName: '',
    birthDate: '1995-01-01',
    className: '',
    enrollmentYear: '2006',
    graduationYear: '2011',
    faculty: defaultFaculty,
    major: defaultMajor,
    currentProvince: 'Thành phố Đà Nẵng',
    workplace: '',
    workplaceProvince: 'Thành phố Đà Nẵng',
    zaloPhone: '',
    avatarUrl: undefined,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);

  const [customCurrentProvince, setCustomCurrentProvince] = useState('');
  const [customWorkplaceProvince, setCustomWorkplaceProvince] = useState('');

  // Sync form data whenever modal opens or profile changes
  useEffect(() => {
    if (isOpen && currentUser) {
      const cleanBirthDate =
        currentMemberProfile?.birthDate && currentMemberProfile.birthDate !== '—'
          ? currentMemberProfile.birthDate
          : '1995-01-01';

      const initialFaculty = currentMemberProfile?.faculty || defaultFaculty;
      const validMajors = FACULTY_MAJORS_MAP[initialFaculty] || [];
      const initialMajor =
        currentMemberProfile?.major && validMajors.includes(currentMemberProfile.major)
          ? currentMemberProfile.major
          : validMajors[0] || defaultMajor;

      const standard34 = VIETNAM_34_PROVINCES_2025.filter(
        (p) => p !== 'Nơi khác (Nước ngoài / Quốc tế)'
      );

      const rawCurrProv = currentMemberProfile?.currentProvince || 'Thành phố Đà Nẵng';
      const isCurrStandard = standard34.includes(rawCurrProv);
      const selCurrProv = isCurrStandard ? rawCurrProv : 'Nơi khác (Nước ngoài / Quốc tế)';
      const custCurrProv = isCurrStandard ? '' : rawCurrProv.replace(/^Nơi khác:\s*/, '');

      const rawWorkProv = currentMemberProfile?.workplaceProvince || 'Thành phố Đà Nẵng';
      const isWorkStandard = standard34.includes(rawWorkProv);
      const selWorkProv = isWorkStandard ? rawWorkProv : 'Nơi khác (Nước ngoài / Quốc tế)';
      const custWorkProv = isWorkStandard ? '' : rawWorkProv.replace(/^Nơi khác:\s*/, '');

      setCustomCurrentProvince(custCurrProv);
      setCustomWorkplaceProvince(custWorkProv);

      setFormData({
        email: currentUser.email || currentMemberProfile?.email || '',
        fullName:
          currentMemberProfile?.fullName ||
          currentUser.displayName ||
          (currentUser.email ? currentUser.email.split('@')[0] : ''),
        birthDate: cleanBirthDate,
        className: currentMemberProfile?.className || '',
        enrollmentYear: currentMemberProfile?.enrollmentYear || '2006',
        graduationYear: currentMemberProfile?.graduationYear || '2011',
        faculty: initialFaculty,
        major: initialMajor,
        currentProvince: selCurrProv,
        workplace: currentMemberProfile?.workplace || '',
        workplaceProvince: selWorkProv,
        zaloPhone:
          currentMemberProfile?.zaloPhone ||
          savedUserPhone ||
          '',
        avatarUrl: currentMemberProfile?.avatarUrl,
      });

      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, currentUser, currentMemberProfile, savedUserPhone]);

  if (!isOpen || !currentUser) return null;

  const currentMajors = FACULTY_MAJORS_MAP[formData.faculty] || [];

  const handleFacultyChange = (newFaculty: string) => {
    const majors = FACULTY_MAJORS_MAP[newFaculty] || [];
    setFormData((prev) => ({
      ...prev,
      faculty: newFaculty,
      major: majors[0] || '',
    }));
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn tập tin hình ảnh hợp lệ (PNG, JPG, WebP).');
      return;
    }

    try {
      // Tự động nén & resize ngay lập tức mọi dung lượng ảnh gốc từ camera điện thoại (kể cả 20MB-50MB) xuống chuẩn < 50KB WebP ở khung tự do
      const optimized = await autoResizeAndOptimizeFile(file, 'avatar', 'free');
      setFormData((prev) => ({ ...prev, avatarUrl: optimized.dataUrl }));
      setShowAvatarCropper(true);
    } catch (err: any) {
      setErrorMessage('Không thể xử lý ảnh: ' + (err?.message || 'Có lỗi xảy ra'));
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation: Bắt buộc có ảnh đại diện (Avatar) + thông tin cá nhân để xác nhận Thành viên Mạng lưới
    if (!formData.avatarUrl || formData.avatarUrl.trim().length < 5) {
      setErrorMessage(
        'Vui lòng tải lên ảnh đại diện (Avatar) để xác nhận tư cách Thành viên Mạng lưới ALUMNI KTD (*).'
      );
      return;
    }

    if (!formData.fullName.trim()) {
      setErrorMessage('Vui lòng nhập Họ và tên thành viên.');
      return;
    }

    if (!formData.className.trim()) {
      setErrorMessage('Vui lòng nhập Tên lớp (Ví dụ: 06X1, 11KT1, 15XD...).');
      return;
    }

    if (!formData.faculty) {
      setErrorMessage('Vui lòng chọn Khoa đào tạo tại Đại học Kiến trúc Đà Nẵng.');
      return;
    }

    if (!formData.major) {
      setErrorMessage('Vui lòng chọn Ngành đào tạo.');
      return;
    }

    const cleanPhone = (formData.zaloPhone || '').trim();
    if (!cleanPhone) {
      setErrorMessage('Vui lòng nhập Số điện thoại Zalo để phục vụ liên lạc.');
      return;
    }

    const phoneRegex = /^(0|\+84)[1-9][0-9]{8}$/;
    const sanitizedPhone = cleanPhone.replace(/[\s.\-()]/g, '');
    if (!phoneRegex.test(sanitizedPhone)) {
      setErrorMessage('Số điện thoại không đúng định dạng Việt Nam (10 chữ số, ví dụ 0905123456).');
      return;
    }

    setIsSaving(true);
    try {
      const resolvedCurrentProvince =
        formData.currentProvince === 'Nơi khác (Nước ngoài / Quốc tế)'
          ? (customCurrentProvince.trim()
              ? `Nơi khác: ${customCurrentProvince.trim()}`
              : 'Nơi khác (Nước ngoài / Quốc tế)')
          : formData.currentProvince;

      const resolvedWorkplaceProvince =
        formData.workplaceProvince === 'Nơi khác (Nước ngoài / Quốc tế)'
          ? (customWorkplaceProvince.trim()
              ? `Nơi khác: ${customWorkplaceProvince.trim()}`
              : 'Nơi khác (Nước ngoài / Quốc tế)')
          : formData.workplaceProvince;

      // 1. Save member profile
      await onSaveMemberProfile({
        ...formData,
        fullName: formData.fullName.trim(),
        className: formData.className.trim(),
        enrollmentYear: formData.enrollmentYear.trim(),
        graduationYear: formData.graduationYear.trim(),
        currentProvince: resolvedCurrentProvince,
        workplaceProvince: resolvedWorkplaceProvince,
        workplace: formData.workplace.trim(),
        zaloPhone: sanitizedPhone,
      });

      // 2. Also save phone if handler available
      if (onSaveUserPhone) {
        await onSaveUserPhone(sanitizedPhone, formData.fullName.trim());
      }

      // 3. Mark completed flag in localStorage
      try {
        localStorage.setItem(`alumni_ktd_profile_done_${currentUser.uid}`, 'true');
      } catch {}

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error saving member profile:', err);
      setErrorMessage(
        err?.message || 'Có lỗi xảy ra khi lưu thông tin. Vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-profile-modal-title"
      >
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="bg-[#9E1B20] text-white p-5 sm:p-6 flex items-start justify-between gap-4 relative overflow-hidden">
            {/* Background Decorative Accent */}
            <div className="absolute right-0 top-0 -mr-10 -mt-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />

            <div className="space-y-1.5 relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-white/20 text-red-100 border border-white/20">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  {isFirstLogin
                    ? currentUser.authMode === 'google'
                      ? 'Đăng nhập lần đầu bằng Google'
                      : 'Chào mừng Thành viên mới'
                    : 'Hồ sơ Cựu sinh viên'}
                </span>
                <span className="text-red-200 text-xs hidden sm:inline">·</span>
                <span className="text-red-100 text-xs font-medium hidden sm:inline">
                  Đại học Kiến trúc Đà Nẵng (DAU)
                </span>
              </div>
              <h2
                id="member-profile-modal-title"
                className="text-lg sm:text-2xl font-black text-white tracking-tight"
              >
                Cập nhật Thông tin Thành viên ALUMNI KTD
              </h2>
              <p className="text-xs sm:text-sm text-red-100/90 max-w-xl leading-relaxed">
                {isFirstLogin
                  ? 'Cập nhật đầy đủ thông tin cá nhân và tải lên ảnh đại diện (Avatar) để chính thức xác nhận Thành viên Mạng lưới ALUMNI KTD và mở khóa Cộng đồng Doanh nghiệp.'
                  : 'Vui lòng cập nhật đầy đủ thông tin chính xác và ảnh đại diện (Avatar) để xác nhận Thành viên Mạng lưới ALUMNI KTD.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer shrink-0 relative z-10"
              title="Đóng cửa sổ"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-7 max-h-[80vh] overflow-y-auto">
            {isSuccess ? (
              /* Success Screen */
              <div className="py-8 text-center space-y-5 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-xl font-bold text-[#0F172A]">
                    Hồ sơ Cựu sinh viên đã hoàn tất!
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Chúc mừng <strong>{formData.fullName}</strong> ({formData.className} · {formData.faculty}).
                    Thông tin của bạn đã được lưu trữ an toàn và sẵn sàng để tham gia tất cả các hoạt động của Mạng lưới ALUMNI KTD.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToTab?.('events');
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#9E1B20] text-white text-sm font-semibold rounded-xl hover:bg-[#7D1418] transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <span>Xem & Đăng ký Gala 2026</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Tiếp tục duyệt Trang chủ
                  </button>
                </div>
              </div>
            ) : (
              /* Profile Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Verified Member Account Welcome Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-[#9E1B20] font-bold flex items-center justify-center shrink-0">
                      {(currentUser.displayName || currentUser.email || 'K').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {currentUser.displayName || currentUser.email}
                      </p>
                      <p className="text-slate-500 truncate">{currentUser.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>
                      {currentUser.authMode === 'google'
                        ? 'Tài khoản Google đã xác thực'
                        : 'Tài khoản thành viên đã xác thực'}
                    </span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5 animate-shake">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Section 1: Thông tin cá nhân & Ảnh đại diện */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <User className="w-4 h-4 text-[#9E1B20]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">
                      1. Thông tin cá nhân & Liên lạc
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    {/* Avatar Upload / Preview */}
                    <div className="sm:col-span-4 flex flex-col items-center text-center p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                      <div className="relative group w-24 h-24 rounded-full overflow-hidden shrink-0 border-2 border-red-200 shadow-sm">
                        {formData.avatarUrl ? (
                          <img
                            src={formData.avatarUrl}
                            alt={formData.fullName || 'Avatar'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-red-50 text-[#9E1B20] text-3xl font-black flex items-center justify-center">
                            {(formData.fullName || 'A').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <label
                          htmlFor="modal-avatar-file-input"
                          className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Camera className="w-5 h-5 mb-0.5" />
                          <span>Đổi ảnh</span>
                        </label>
                      </div>

                      <div className="space-y-1 w-full">
                        <label
                          htmlFor="modal-avatar-file-input"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-[#9E1B20] text-slate-700 hover:text-[#9E1B20] text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#9E1B20]" />
                          <span>
                            {formData.avatarUrl ? 'Đổi ảnh đại diện' : 'Tải ảnh đại diện *'}
                          </span>
                        </label>
                        <input
                          id="modal-avatar-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileSelect}
                          className="hidden"
                        />
                        <p className="text-[11px] text-[#9E1B20] font-semibold">
                          * Bắt buộc có ảnh Avatar để xác nhận thành viên mạng lưới
                        </p>
                      </div>
                    </div>

                    {/* Personal Inputs */}
                    <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-700">
                          Họ và tên thành viên <span className="text-[#9E1B20]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                          }
                          placeholder="Ví dụ: Nguyễn Văn An"
                          className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">
                          Số điện thoại Zalo <span className="text-[#9E1B20]">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            value={formData.zaloPhone}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, zaloPhone: e.target.value }))
                            }
                            placeholder="Ví dụ: 0905123456"
                            className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">
                          Ngày sinh
                        </label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, birthDate: e.target.value }))
                            }
                            className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-700">
                          {currentUser.authMode === 'google'
                            ? 'Email xác thực (Google)'
                            : 'Email tài khoản thành viên'}
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            readOnly
                            disabled
                            value={formData.email}
                            className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Khóa & Chuyên ngành tại DAU */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <GraduationCap className="w-4 h-4 text-[#9E1B20]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">
                      2. Khóa học & Khoa đào tạo tại Đại học Kiến trúc Đà Nẵng
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Lớp sinh hoạt <span className="text-[#9E1B20]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.className}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, className: e.target.value }))
                        }
                        placeholder="Ví dụ: 06X1, 11KT1, 15XD..."
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Khóa nhập học <span className="text-[#9E1B20]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.enrollmentYear}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, enrollmentYear: e.target.value }))
                        }
                        placeholder="Ví dụ: 2006"
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Năm tốt nghiệp
                      </label>
                      <input
                        type="text"
                        value={formData.graduationYear}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, graduationYear: e.target.value }))
                        }
                        placeholder="Ví dụ: 2011"
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                      />
                    </div>

                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Khoa đào tạo <span className="text-[#9E1B20]">*</span>
                      </label>
                      <select
                        required
                        value={formData.faculty}
                        onChange={(e) => handleFacultyChange(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                      >
                        {FACULTY_MAJORS_LIST.map((f) => (
                          <option key={f.faculty} value={f.faculty}>
                            {f.faculty}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Ngành đào tạo <span className="text-[#9E1B20]">*</span>
                      </label>
                      <select
                        required
                        value={formData.major}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, major: e.target.value }))
                        }
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                      >
                        {currentMajors.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Cư trú & Nơi công tác */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Building2 className="w-4 h-4 text-[#9E1B20]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">
                      3. Nơi cư trú & Cơ quan / Đơn vị công tác
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Tỉnh / Thành phố hiện cư trú <span className="text-[#9E1B20]">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          required
                          value={formData.currentProvince}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, currentProvince: e.target.value }))
                          }
                          className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                        >
                          {VIETNAM_34_PROVINCES_2025.map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                      </div>
                      {formData.currentProvince === 'Nơi khác (Nước ngoài / Quốc tế)' && (
                        <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          <label className="text-[11px] font-semibold text-[#9E1B20]">
                            Tên Quốc gia / Thành phố sinh sống (Tự điền nếu ở Nước ngoài)
                          </label>
                          <input
                            type="text"
                            value={customCurrentProvince}
                            onChange={(e) => setCustomCurrentProvince(e.target.value)}
                            placeholder="Ví dụ: Tokyo - Nhật Bản, Sydney - Úc, California - Mỹ..."
                            className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-red-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Tỉnh / Thành phố nơi làm việc
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={formData.workplaceProvince}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              workplaceProvince: e.target.value,
                            }))
                          }
                          className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                        >
                          {VIETNAM_34_PROVINCES_2025.map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                      </div>
                      {formData.workplaceProvince === 'Nơi khác (Nước ngoài / Quốc tế)' && (
                        <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                          <label className="text-[11px] font-semibold text-[#9E1B20]">
                            Tên Quốc gia / Thành phố làm việc (Tự điền nếu ở Nước ngoài)
                          </label>
                          <input
                            type="text"
                            value={customWorkplaceProvince}
                            onChange={(e) => setCustomWorkplaceProvince(e.target.value)}
                            placeholder="Ví dụ: Singapore, Seoul - Hàn Quốc, Berlin - Đức..."
                            className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-white border border-red-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                          />
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Cơ quan / Đơn vị công tác hiện nay
                      </label>
                      <input
                        type="text"
                        value={formData.workplace}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, workplace: e.target.value }))
                        }
                        placeholder="Ví dụ: Công ty CP Tư vấn Thiết kế Xây dựng ABC, Sở Xây dựng..."
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="pt-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                  >
                    Cập nhật sau
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu thông tin...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Lưu & Kích hoạt Hồ sơ Thành viên</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Cropper Modal integration */}
      <ImageCropperModal
        isOpen={showAvatarCropper}
        onClose={() => setShowAvatarCropper(false)}
        title="Chỉnh sửa & Cắt Ảnh Chân dung Thành viên"
        description="Mở khung tự do theo tỷ lệ ảnh gốc hoặc tự do lựa chọn tỷ lệ (Vuông, Ngang, Dọc). Kéo di chuyển vị trí, phóng to thu nhỏ (Zoom) và xoay 90°."
        mode="avatar"
        initialImage={formData.avatarUrl}
        initialAspectRatio="free"
        onSave={(result) => {
          setFormData((prev) => ({ ...prev, avatarUrl: result.dataUrl }));
        }}
      />
    </>
  );
};
