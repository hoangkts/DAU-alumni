import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  LogIn,
  Search,
  UserCheck,
  Compass,
  Download,
  RefreshCw,
  Bell,
  Mail,
  ArrowRight,
  Phone,
  MessageCircle,
  UserCog,
  ChevronUp,
  ChevronDown,
  Edit3,
  Camera,
  Trash2,
  Crop,
  Sparkles,
  Pin,
  AlertTriangle,
  X,
  BookOpen,
  Smartphone,
} from 'lucide-react';
import {
  EmailNotificationRecord,
  FACULTY_MAJORS_LIST,
  MemberProfileRecord,
  VIETNAM_34_PROVINCES_2025,
} from '../data/constants';
import {
  buildZaloChatUrl,
  buildZaloDeepLink,
  escapeHtml,
  getMajorsByFaculty,
  isConfirmedNetworkMember,
  maskPhoneKeepLast4,
  MemberFormInput,
  validateMemberForm,
} from '../utils/alumniLogic';
import { autoResizeAndOptimizeFile } from '../utils/imageOptimizer';
import { AlumniDashboard } from './AlumniDashboard';
import { ImageCropperModal } from './ImageCropperModal';
import { ZaloConnectModal, ZaloMemberInfo } from './ZaloConnectModal';

interface NetworkSectionProps {
  currentUser: {
    uid: string;
    email: string;
    displayName: string;
    isAdmin: boolean;
    authMode: 'password' | 'google' | 'demo';
  } | null;
  currentMemberProfile: MemberProfileRecord | null;
  members: MemberProfileRecord[];
  emails: EmailNotificationRecord[];
  onGoogleLogin: () => Promise<void> | void;
  onLogout: () => Promise<void>;
  onSaveMemberProfile: (input: MemberFormInput) => Promise<EmailNotificationRecord | null>;
  onSaveUserPhone?: (phone: string, fullName?: string) => Promise<void>;
  savedUserPhone?: string;
  onResendMemberEmail: (profile: MemberProfileRecord) => Promise<EmailNotificationRecord>;
  onOpenEmailOutbox: () => void;
  latestMemberEmail: EmailNotificationRecord | null;
  authError?: string | null;
  isLoggingIn?: boolean;
  isProfileEditing?: boolean;
  onToggleProfileEditing?: (editing: boolean) => void;
  onOpenProfileModal?: () => void;
  pinnedSpotlightNode?: React.ReactNode;
  pinnedMemberIds?: string[];
  onTogglePinMember?: (uid: string) => void;
  onDeleteMember?: (uid: string) => Promise<void>;
  onOpenUserGuide?: (initialSection?: 'newbie' | 'ios') => void;
}

const PROFILE_DRAFT_STORAGE_KEY = 'alumni_ktd_profile_draft_v2';

export const NetworkSection: React.FC<NetworkSectionProps> = ({
  currentUser,
  currentMemberProfile,
  members,
  emails,
  onGoogleLogin,
  onLogout,
  onSaveMemberProfile,
  onSaveUserPhone,
  savedUserPhone = '',
  onResendMemberEmail,
  onOpenEmailOutbox,
  latestMemberEmail,
  authError,
  isLoggingIn,
  isProfileEditing,
  onToggleProfileEditing,
  onOpenProfileModal,
  pinnedSpotlightNode,
  pinnedMemberIds = [],
  onTogglePinMember,
  onDeleteMember,
  onOpenUserGuide,
}) => {
  const defaultFaculty = FACULTY_MAJORS_LIST[0].faculty;
  const defaultMajor = FACULTY_MAJORS_LIST[0].majors[0];

  const hasCompletedProfile = isConfirmedNetworkMember(currentMemberProfile);
  const confirmedMembers = useMemo(
    () => members.filter((m) => isConfirmedNetworkMember(m)),
    [members]
  );

  const [localSectionExpanded, setLocalSectionExpanded] = useState(false);
  const [localEditing, setLocalEditing] = useState(false);
  const isEditing = isProfileEditing !== undefined ? isProfileEditing : localEditing;
  const setEditing = (val: boolean) => {
    setLocalEditing(val);
    onToggleProfileEditing?.(val);
  };
  const isSectionExpanded = Boolean(isProfileEditing || localSectionExpanded);

  const [formData, setFormData] = useState<MemberFormInput>(() => {
    let draft: Partial<MemberFormInput> = {};
    try {
      const raw = localStorage.getItem(PROFILE_DRAFT_STORAGE_KEY);
      if (raw) {
        draft = JSON.parse(raw) || {};
      }
    } catch (e) {
      console.warn('Could not read profile draft:', e);
    }
    const cleanBirthDate =
      currentMemberProfile?.birthDate && currentMemberProfile.birthDate !== '—'
        ? currentMemberProfile.birthDate
        : draft.birthDate && draft.birthDate !== '—'
          ? draft.birthDate
          : '';
    return {
      email: currentUser?.email || draft.email || '',
      fullName:
        currentMemberProfile?.fullName ||
        draft.fullName ||
        currentUser?.displayName ||
        '',
      birthDate: cleanBirthDate,
      className: currentMemberProfile?.className || draft.className || '',
      enrollmentYear:
        currentMemberProfile?.enrollmentYear || draft.enrollmentYear || '',
      graduationYear:
        currentMemberProfile?.graduationYear || draft.graduationYear || '',
      faculty: currentMemberProfile?.faculty || draft.faculty || defaultFaculty,
      major: currentMemberProfile?.major || draft.major || defaultMajor,
      currentProvince:
        currentMemberProfile?.currentProvince ||
        draft.currentProvince ||
        'Thành phố Đà Nẵng',
      workplace: currentMemberProfile?.workplace || draft.workplace || '',
      workplaceProvince:
        currentMemberProfile?.workplaceProvince ||
        draft.workplaceProvince ||
        'Thành phố Đà Nẵng',
      zaloPhone:
        currentMemberProfile?.zaloPhone ||
        savedUserPhone ||
        draft.zaloPhone ||
        '',
      avatarUrl: currentMemberProfile?.avatarUrl || draft.avatarUrl || '',
    };
  });

  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deletingMember, setDeletingMember] = useState<MemberProfileRecord | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [directoryToastMsg, setDirectoryToastMsg] = useState<string | null>(null);

  // Zalo Connection Modal State
  const [zaloModalMember, setZaloModalMember] = useState<ZaloMemberInfo | null>(null);

  const handleOpenZaloModal = (m: {
    fullName: string;
    zaloPhone?: string;
    phone?: string;
    className?: string;
    faculty?: string;
    workplace?: string;
    avatarUrl?: string;
  }) => {
    const phone = m.zaloPhone || m.phone;
    if (!phone) return;
    setZaloModalMember({
      fullName: m.fullName,
      phone,
      className: m.className,
      faculty: m.faculty,
      workplace: m.workplace,
      avatarUrl: m.avatarUrl,
    });
  };

  const handleConfirmDeleteMember = async () => {
    if (!deletingMember || !onDeleteMember) return;
    setIsDeletingMember(true);
    try {
      const targetName = deletingMember.fullName;
      await onDeleteMember(deletingMember.uid);
      setDeletingMember(null);
      setDirectoryToastMsg(`Đã xóa thành viên "${targetName}" khỏi hệ thống thành công!`);
      setTimeout(() => setDirectoryToastMsg(null), 5000);
    } catch (err: any) {
      console.error('Error deleting member:', err);
      const rawMsg = err?.message || '';
      const displayMsg = rawMsg.includes('insufficient permissions') || rawMsg.includes('Missing or insufficient') || rawMsg.includes('403')
        ? 'Bạn không có đủ quyền trên máy chủ hệ thống (PostgreSQL / RBAC) để xóa thành viên này. Vui lòng liên hệ quản trị viên.'
        : (rawMsg.startsWith('{') ? 'Có lỗi xảy ra khi thực hiện thao tác xóa.' : (rawMsg || 'Có lỗi xảy ra khi xóa thành viên.'));
      alert(displayMsg);
    } finally {
      setIsDeletingMember(false);
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const handleDirectAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tập tin hình ảnh hợp lệ (PNG, JPG, WebP).');
      return;
    }

    try {
      const optimized = await autoResizeAndOptimizeFile(file, 'avatar', 'free');
      setFormData((prev) => ({ ...prev, avatarUrl: optimized.dataUrl }));
      setShowAvatarCropper(true);
    } catch (err: any) {
      alert('Không thể xử lý ảnh: ' + (err?.message || 'Có lỗi xảy ra'));
    }
    e.target.value = '';
  };

  // Directory filters & Pagination (20 members per page)
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [directoryFaculty, setDirectoryFaculty] = useState('ALL');
  const [directoryProvince, setDirectoryProvince] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [activeDashboardFilter, setActiveDashboardFilter] = useState<{
    type: 'faculty' | 'year' | 'province';
    value: string;
  } | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [directoryQuery, directoryFaculty, directoryProvince, activeDashboardFilter]);

  const handleSelectFacultyFilter = (fac: string) => {
    setActiveDashboardFilter({ type: 'faculty', value: fac });
    setDirectoryFaculty(fac);
    setDirectoryQuery('');
    const el = document.getElementById('alumni-directory-table');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectYearFilter = (yr: string) => {
    setActiveDashboardFilter({ type: 'year', value: yr });
    setDirectoryQuery(yr);
    const el = document.getElementById('alumni-directory-table');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectProvinceFilter = (prov: string) => {
    setActiveDashboardFilter({ type: 'province', value: prov });
    setDirectoryProvince(prov);
    setDirectoryQuery('');
    const el = document.getElementById('alumni-directory-table');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClearDashboardFilter = () => {
    setActiveDashboardFilter(null);
    setDirectoryFaculty('ALL');
    setDirectoryProvince('ALL');
    setDirectoryQuery('');
  };

  useEffect(() => {
    if (currentUser) {
      let draft: Partial<MemberFormInput> = {};
      try {
        const raw = localStorage.getItem(PROFILE_DRAFT_STORAGE_KEY);
        if (raw) {
          draft = JSON.parse(raw) || {};
        }
      } catch {
        // ignore
      }
      setFormData((prev) => {
        const profileBirth =
          currentMemberProfile?.birthDate && currentMemberProfile.birthDate !== '—'
            ? currentMemberProfile.birthDate
            : '';
        const prevBirth =
          prev.birthDate && prev.birthDate !== '—' ? prev.birthDate : '';
        const draftBirth =
          draft.birthDate && draft.birthDate !== '—' ? draft.birthDate : '';

        return {
          ...prev,
          email: currentUser.email,
          fullName:
            currentMemberProfile?.fullName ||
            prev.fullName ||
            draft.fullName ||
            currentUser.displayName ||
            '',
          birthDate: profileBirth || prevBirth || draftBirth || '',
          className:
            currentMemberProfile?.className ||
            prev.className ||
            draft.className ||
            '',
          enrollmentYear:
            currentMemberProfile?.enrollmentYear ||
            prev.enrollmentYear ||
            draft.enrollmentYear ||
            '',
          graduationYear:
            currentMemberProfile?.graduationYear ||
            prev.graduationYear ||
            draft.graduationYear ||
            '',
          faculty:
            currentMemberProfile?.faculty ||
            prev.faculty ||
            draft.faculty ||
            defaultFaculty,
          major:
            currentMemberProfile?.major ||
            prev.major ||
            draft.major ||
            defaultMajor,
          currentProvince:
            currentMemberProfile?.currentProvince ||
            prev.currentProvince ||
            draft.currentProvince ||
            'Thành phố Đà Nẵng',
          workplace:
            currentMemberProfile?.workplace ||
            prev.workplace ||
            draft.workplace ||
            '',
          workplaceProvince:
            currentMemberProfile?.workplaceProvince ||
            prev.workplaceProvince ||
            draft.workplaceProvince ||
            'Thành phố Đà Nẵng',
          zaloPhone:
            currentMemberProfile?.zaloPhone ||
            savedUserPhone ||
            prev.zaloPhone ||
            draft.zaloPhone ||
            '',
          avatarUrl:
            currentMemberProfile?.avatarUrl ||
            prev.avatarUrl ||
            draft.avatarUrl ||
            '',
        };
      });
    }
  }, [currentUser, currentMemberProfile, savedUserPhone, defaultFaculty, defaultMajor]);

  // Persist form draft with 400ms debounce so typing doesn't block the main thread
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (formData.zaloPhone || formData.fullName || formData.className) {
          localStorage.setItem(PROFILE_DRAFT_STORAGE_KEY, JSON.stringify(formData));
        }
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formData]);

  const availableMajors = getMajorsByFaculty(formData.faculty);

  const handleFacultyChange = (newFaculty: string) => {
    const majorsForNewFaculty = getMajorsByFaculty(newFaculty);
    setFormData((prev) => ({
      ...prev,
      faculty: newFaculty,
      major: majorsForNewFaculty[0] || '',
    }));
    setErrors((prev) => ({ ...prev, faculty: '', major: '' }));
  };

  const handleDownloadEmailHtml = (mail: EmailNotificationRecord) => {
    const safeSubject = escapeHtml(mail.subject);
    const bodyText = mail.bodyLines
      ? mail.bodyLines.join('\n')
      : (mail as unknown as { body?: string }).body || '';
    const safeBody = escapeHtml(bodyText);
    const html =
      mail.htmlContent ||
      `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${safeSubject}</title></head><body style="font-family:sans-serif;padding:24px;"><h2>${safeSubject}</h2><pre style="font-family:sans-serif;white-space:pre-wrap;">${safeBody}</pre></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thu-xac-nhan-alumni-ktd-${mail.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResendClick = async () => {
    if (!currentMemberProfile) return;
    setIsResending(true);
    setSaveErrorMessage(null);
    try {
      const sent = await onResendMemberEmail(currentMemberProfile);
      setSaveSuccessMessage(
        `Hệ thống đã gửi lại Thư xác nhận thông tin hồ sơ tới địa chỉ ${sent.to}.`
      );
    } catch (err: any) {
      setSaveErrorMessage(err?.message || 'Không thể gửi lại thư xác nhận. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    const validation = validateMemberForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSaveMemberProfile(formData);
      setSaveSuccessMessage(
        `Đã lưu hồ sơ thành viên gắn với tài khoản (${formData.email}) và gửi Thư xác nhận thông tin.`
      );
      setEditing(false);
      onToggleProfileEditing?.(false);
    } catch (err: any) {
      setSaveErrorMessage(err?.message || 'Không thể lưu hồ sơ thành viên. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = useMemo(() => {
    return confirmedMembers.filter((m) => {
      const matchesFaculty =
        directoryFaculty === 'ALL' || m.faculty === directoryFaculty;
      const matchesProvince =
        directoryProvince === 'ALL' ||
        m.currentProvince === directoryProvince ||
        m.workplaceProvince === directoryProvince ||
        (directoryProvince === 'Nơi khác (Nước ngoài / Quốc tế)' &&
          (m.currentProvince?.includes('Nơi khác') ||
            m.workplaceProvince?.includes('Nơi khác') ||
            (m.currentProvince && !VIETNAM_34_PROVINCES_2025.includes(m.currentProvince)) ||
            (m.workplaceProvince && !VIETNAM_34_PROVINCES_2025.includes(m.workplaceProvince))));
      if (!matchesFaculty || !matchesProvince) return false;
      if (!directoryQuery.trim()) return true;

      const q = directoryQuery.trim().toLowerCase();
      return [
        m.fullName,
        m.className,
        m.faculty,
        m.major,
        m.currentProvince,
        m.workplace,
        m.workplaceProvince,
        m.graduationYear,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [confirmedMembers, directoryFaculty, directoryProvince, directoryQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMembers.slice(startIndex, startIndex + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Architectural Crimson Hero & Google Auth Dock */}
      <section className="dau-crimson-hero rounded-2xl p-4 sm:p-8 lg:p-10 text-white shadow-lg">
        {/* Background Geometric Architectural Wireframe SVG */}
        <svg
          className="absolute right-0 bottom-0 w-96 h-96 text-white/10 pointer-events-none select-none"
          viewBox="0 0 320 320"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M40 280 L160 40 L280 280 Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M80 280 L160 110 L240 280"
            stroke="currentColor"
            strokeWidth="1"
          />
          <line
            x1="20"
            y1="210"
            x2="300"
            y2="210"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="160" cy="40" r="6" stroke="currentColor" strokeWidth="1.5" />
          <rect
            x="110"
            y="210"
            width="100"
            height="70"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          {/* Left Column: Editorial Headline & Metrics */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-5 sm:space-y-6">
            <div className="space-y-2.5 sm:space-y-3">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-red-200 flex items-center gap-2">
                <Compass className="w-4 h-4 shrink-0" />
                <span>01. CỔNG KẾT NỐI CỰU SINH VIÊN · ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG</span>
              </p>
              <h1
                className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Mạng lưới ALUMNI KTD
              </h1>
              <p className="text-xs sm:text-base text-red-100/95 leading-relaxed max-w-2xl">
                Đăng nhập bằng Email &amp; Mật khẩu (chạy mượt ngay cả trong trình duyệt Zalo, Facebook) hoặc tài khoản Google để xác thực định danh cựu sinh viên theo 8 Khoa đào tạo và nhận thông báo trực tiếp từ Ban Điều hành
                trên khắp 34 tỉnh, thành phố mới sau sáp nhập năm 2025.
              </p>
            </div>

            {/* Unboxed Architectural Telemetry Row */}
            <div className="pt-4 sm:pt-6 border-t border-white/15 grid grid-cols-3 gap-2.5 sm:gap-8">
              <div>
                <div className="text-xl sm:text-3xl font-bold text-white tabular-nums">
                  {confirmedMembers.length}
                </div>
                <div className="text-[11px] sm:text-sm text-red-100/85 mt-0.5 leading-snug">
                  Thành viên Mạng lưới xác nhận
                </div>
              </div>
              <div className="border-l border-white/15 pl-3 sm:pl-6">
                <div className="text-xl sm:text-3xl font-bold text-white tabular-nums">
                  08
                </div>
                <div className="text-[11px] sm:text-sm text-red-100/85 mt-0.5 leading-snug">
                  Khoa & Ngành phụ thuộc
                </div>
              </div>
              <div className="border-l border-white/15 pl-3 sm:pl-6">
                <div className="text-xl sm:text-3xl font-bold text-white tabular-nums">
                  34
                </div>
                <div className="text-[11px] sm:text-sm text-red-100/85 mt-0.5 leading-snug">
                  Tỉnh/Thành mới 2025
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Pure White Authentication Card */}
          <div
            id="network-login-card"
            className="lg:col-span-5 bg-white text-[#0F172A] rounded-xl p-4 sm:p-6 shadow-xl flex flex-col justify-between space-y-4"
          >
            {!currentUser ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#9E1B20] bg-red-50 px-2.5 py-1 rounded-md border border-[#9E1B20]/20">
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Đăng nhập / Đăng ký Thành viên</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">
                    Đăng nhập Cựu sinh viên
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hỗ trợ đăng nhập hoặc tạo tài khoản bằng Email &amp; Mật khẩu (hoạt động trực tiếp ngay trong Zalo/Facebook) hoặc xác thực nhanh bằng Google.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {authError && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                      <span className="font-bold text-amber-900 shrink-0">Lưu ý:</span>
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={onGoogleLogin}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-[#9E1B20] text-white text-sm font-semibold rounded-lg hover:bg-[#7D1418] active:bg-[#5E0D10] transition-colors cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {isLoggingIn ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span className="whitespace-nowrap font-bold">
                      {isLoggingIn ? 'Đang mở cổng đăng nhập...' : 'Đăng nhập / Đăng ký Thành viên'}
                    </span>
                  </button>

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenUserGuide?.('newbie')}
                      className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#9E1B20] shrink-0" />
                      <span className="truncate">Hướng dẫn người mới</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenUserGuide?.('ios')}
                      className="py-2 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#9E1B20] shrink-0" />
                      <span className="truncate">Lưu ý máy iOS (iPhone)</span>
                    </button>
                  </div>

                  <div className="pt-1 text-center text-xs text-slate-500">
                    Khu vực quản trị Ban Điều hành được bảo mật độc lập tại tab <strong>Quản trị</strong>.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                      <UserCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>
                        {currentUser.isAdmin
                          ? 'Quản trị viên đã xác thực'
                          : currentUser.authMode === 'google'
                            ? 'Đã xác thực Google'
                            : 'Thành viên đã xác thực'}
                      </span>
                      {currentUser.isAdmin && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-[#9E1B20] font-bold">Ban Điều hành</span>
                        </>
                      )}
                    </div>
                    <p className="text-lg font-bold text-[#0F172A]">
                      {currentMemberProfile?.fullName || currentUser.displayName}
                    </p>
                    <p className="text-sm text-slate-600">{currentUser.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 hover:text-[#9E1B20] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Đăng xuất
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600">
                    Trạng thái:{' '}
                    {currentUser.isAdmin ? (
                      <strong className="text-[#0F172A] font-semibold">
                        Ban Điều hành (Quản trị hệ thống)
                      </strong>
                    ) : hasCompletedProfile ? (
                      <strong className="text-emerald-700 font-semibold">
                        ✓ Đã xác nhận Thành viên Mạng lưới
                      </strong>
                    ) : (
                      <strong className="text-amber-700 font-semibold">
                        Tài khoản thành viên (Cần cập nhật thông tin &amp; Avatar để vào Mạng lưới)
                      </strong>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {!hasCompletedProfile && onOpenProfileModal && (
                      <button
                        type="button"
                        onClick={onOpenProfileModal}
                        className="px-2.5 py-1 bg-[#9E1B20] text-white text-xs font-semibold rounded-md hover:bg-[#7D1418] cursor-pointer"
                      >
                        Xác nhận Thành viên
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenUserGuide?.('newbie')}
                      className="text-xs font-semibold text-[#9E1B20] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Hướng dẫn &amp; Lưu ý iOS</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pinned Important Content Spotlight from all tabs */}
      {pinnedSpotlightNode}

      {/* Alumni Network Statistics Dashboard */}
      <AlumniDashboard
        members={confirmedMembers}
        activeFilter={activeDashboardFilter}
        onSelectFacultyFilter={handleSelectFacultyFilter}
        onSelectYearFilter={handleSelectYearFilter}
        onSelectProvinceFilter={handleSelectProvinceFilter}
        onClearFilter={handleClearDashboardFilter}
      />

      {/* Cập nhật Thông tin Hồ sơ Cá nhân (Mặc định thu gọn - Đã có trong Hồ sơ thành viên) */}
      <section
        id="profile-update-section"
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#9E1B20] border border-slate-200 flex items-center justify-center shrink-0">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Cập nhật Thông tin Cá nhân Thành viên
                </h3>
                {hasCompletedProfile ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ✓ Đã định danh Cựu sinh viên
                  </span>
                ) : currentUser ? (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Chưa hoàn thiện hồ sơ
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {hasCompletedProfile
                  ? `Đại biểu: ${currentMemberProfile?.fullName} · Lớp ${currentMemberProfile?.className || '—'} · Chức năng này đã có sẵn trong mục Hồ sơ thành viên.`
                  : 'Chức năng khai báo và chỉnh sửa thông tin thành viên đã có sẵn trong mục Hồ sơ thành viên.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {onOpenProfileModal && (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="px-3.5 py-2 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                title="Mở bảng Hồ sơ thành viên để xem và cập nhật"
              >
                <UserCog className="w-3.5 h-3.5" />
                <span>Mở Hồ sơ thành viên</span>
              </button>
            )}

            {!currentUser && (
              <button
                type="button"
                onClick={onGoogleLogin}
                className="px-3.5 py-2 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setLocalSectionExpanded((prev) => !prev)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              title={isSectionExpanded ? 'Thu gọn biểu mẫu trên trang này' : 'Hiển thị biểu mẫu cập nhật tại đây'}
            >
              {isSectionExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Thu gọn</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Mở rộng biểu mẫu tại đây</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Biểu mẫu chi tiết chỉ hiển thị khi người dùng chủ động bấm Mở rộng */}
        {isSectionExpanded && (
          <div className="pt-5 mt-4 border-t border-slate-200 space-y-6">
            {!currentUser ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-base font-bold text-[#0F172A]">
                    Vui lòng đăng nhập tài khoản Thành viên trước khi cập nhật hồ sơ
                  </p>
                  <p className="text-sm text-slate-600">
                    Hỗ trợ đăng nhập bằng Email &amp; Mật khẩu (ngay trong Zalo/Facebook) hoặc Google để xác thực chính chủ và gửi thư chào mừng / xác nhận thông tin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-[#9E1B20] rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập / Đăng ký Thành viên</span>
                </button>
              </div>
            ) : currentMemberProfile && hasCompletedProfile && !isEditing ? (
              /* Khung Hồ sơ định danh đã hoàn tất (Ẩn form nhập liệu khi đã cập nhật thông tin) */
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      ✓ Đã định danh Cựu sinh viên
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500 font-medium">
                      Tài khoản thành viên: <strong className="text-slate-700">{currentUser.email}</strong>
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-1">
                    {currentMemberProfile.fullName}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => (onOpenProfileModal ? onOpenProfileModal() : setEditing(true))}
                  className="px-4 py-2.5 bg-[#9E1B20] text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <UserCog className="w-4 h-4" />
                  <span>Chỉnh sửa hồ sơ cá nhân</span>
                </button>

                <button
                  type="button"
                  disabled={isResending}
                  onClick={handleResendClick}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  title="Gửi lại Thư xác nhận thông tin thành viên"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Gửi lại Thư xác nhận</span>
                </button>
              </div>
            </div>

            {/* 4-Card Compact Verified Profile Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Khoa & Ngành</span>
                <p className="font-bold text-slate-900 text-sm">{currentMemberProfile.faculty}</p>
                <p className="text-slate-600 truncate">{currentMemberProfile.major}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Lớp & Niên khóa</span>
                <p className="font-bold text-[#9E1B20] text-sm">{currentMemberProfile.className}</p>
                <p className="text-slate-600 tabular-nums">
                  Khóa {currentMemberProfile.enrollmentYear || '—'} – {currentMemberProfile.graduationYear || '—'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Zalo / Số điện thoại</span>
                <p className="font-bold text-slate-900 text-sm font-mono tracking-wide">
                  {currentMemberProfile.zaloPhone ||
                    savedUserPhone ||
                    formData.zaloPhone ||
                    currentMemberProfile.zaloPhoneMasked ||
                    'Chưa cập nhật'}
                </p>
                {(currentMemberProfile.zaloPhone || savedUserPhone || formData.zaloPhone) ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenZaloModal({
                        fullName: currentMemberProfile.fullName || formData.fullName,
                        zaloPhone: currentMemberProfile.zaloPhone || savedUserPhone || formData.zaloPhone,
                        className: currentMemberProfile.className || formData.className,
                        faculty: currentMemberProfile.faculty || formData.faculty,
                        workplace: currentMemberProfile.workplace || formData.workplace,
                        avatarUrl: currentMemberProfile.avatarUrl || formData.avatarUrl,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-[#0068FF] bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                    title="Mở kết nối Zalo"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>Mở Zalo</span>
                  </button>
                ) : !currentMemberProfile.zaloPhoneMasked ? (
                  <button
                    type="button"
                    onClick={() => (onOpenProfileModal ? onOpenProfileModal() : setEditing(true))}
                    className="text-[11px] font-semibold text-[#9E1B20] hover:underline cursor-pointer"
                  >
                    + Bổ sung số điện thoại
                  </button>
                ) : null}
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Nơi công tác & Cư trú</span>
                <p className="font-bold text-slate-900 text-sm truncate">
                  {currentMemberProfile.workplace || 'Chưa cập nhật'}
                </p>
                <p className="text-slate-600 truncate">
                  {currentMemberProfile.workplaceProvince} · Cư trú: {currentMemberProfile.currentProvince}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Biểu mẫu Cập nhật Thông tin Cá nhân (Mở ra khi chưa có thông tin hoặc khi bấm Chỉnh sửa) */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9E1B20]">
                  Hồ sơ Định danh Cựu sinh viên
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                  Cập nhật Thông tin Cá nhân Thành viên ALUMNI KTD
                </h2>
                <p className="text-sm text-slate-600">
                  Các trường đánh dấu <span className="text-[#9E1B20] font-semibold">(*)</span> là bắt buộc.
                  Chọn Khoa sẽ tự động lọc danh sách Ngành đào tạo phụ thuộc.
                </p>
              </div>
              {hasCompletedProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setLocalSectionExpanded(false);
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Đóng / Thu gọn</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              {(saveSuccessMessage || latestMemberEmail) && (
                <div
                  role="status"
                  className="bg-white border-2 border-[#9E1B20] rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="bg-[#9E1B20] px-5 py-3 text-white flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                      <span className="text-sm font-bold">
                        {saveSuccessMessage ||
                          `Đã lưu hồ sơ thành viên và gửi Thư xác nhận thông tin tới ${
                            latestMemberEmail?.to || formData.email
                          }`}
                      </span>
                    </div>
                    <span className="text-xs font-semibold bg-white/20 px-2.5 py-0.5 rounded-md text-white">
                      {currentUser?.authMode === 'google' ? 'Đã đăng nhập Google' : 'Thành viên đã xác thực'}
                    </span>
                  </div>

                {latestMemberEmail && (
                  <div className="p-5 space-y-4 bg-[#FEF2F2]/40">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#9E1B20]">
                          Thư Xác nhận Thông tin Cựu sinh viên ALUMNI KTD (Hệ thống & Email)
                        </p>
                        <h3 className="text-base font-bold text-[#0F172A]">
                          {latestMemberEmail.subject}
                        </h3>
                        <p className="text-xs text-slate-600">
                          Email nhận thư:{' '}
                          <strong className="text-[#9E1B20]">{latestMemberEmail.to}</strong> · Thời gian:{' '}
                          <span className="tabular-nums">
                            {new Date(latestMemberEmail.sentAt).toLocaleString('vi-VN')}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={onOpenEmailOutbox}
                          className="px-3.5 py-2 bg-[#9E1B20] text-white text-xs font-semibold rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Mở Hộp thư Hệ thống</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadEmailHtml(latestMemberEmail)}
                          className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 hover:text-[#9E1B20] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-[#9E1B20]" />
                          <span>Tải xác nhận (.html)</span>
                        </button>
                      </div>
                    </div>

                    {latestMemberEmail.memberSnapshot && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm bg-white p-4 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-xs text-slate-500 block">Họ và tên & Ngày sinh</span>
                          <strong className="font-semibold text-[#0F172A]">
                            {latestMemberEmail.memberSnapshot.fullName}
                          </strong>
                          <span className="text-xs text-slate-500 block tabular-nums">
                            NS: {latestMemberEmail.memberSnapshot.birthDate}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Lớp & Niên khóa</span>
                          <strong className="font-semibold text-[#9E1B20] tabular-nums">
                            {latestMemberEmail.memberSnapshot.className}
                          </strong>
                          <span className="text-xs text-slate-500 block tabular-nums">
                            {latestMemberEmail.memberSnapshot.enrollmentYear || '—'} –{' '}
                            {latestMemberEmail.memberSnapshot.graduationYear || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Khoa & Ngành đào tạo</span>
                          <strong className="font-semibold text-[#0F172A]">
                            {latestMemberEmail.memberSnapshot.faculty}
                          </strong>
                          <span className="text-xs text-slate-500 block">
                            {latestMemberEmail.memberSnapshot.major}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Nơi ở & Đơn vị công tác</span>
                          <strong className="font-semibold text-[#0F172A]">
                            {latestMemberEmail.memberSnapshot.currentProvince}
                          </strong>
                          <span className="text-xs text-slate-500 block truncate">
                            {latestMemberEmail.memberSnapshot.workplace || 'Đang cập nhật'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Zalo / SĐT</span>
                          <strong className="font-semibold text-[#0F172A] tabular-nums">
                            {latestMemberEmail.memberSnapshot.zaloPhone || 'Chưa cung cấp'}
                          </strong>
                          {latestMemberEmail.memberSnapshot?.zaloPhone && (
                            <button
                              type="button"
                              onClick={() => {
                                const snap = latestMemberEmail.memberSnapshot;
                                if (!snap) return;
                                handleOpenZaloModal({
                                  fullName: snap.fullName,
                                  zaloPhone: snap.zaloPhone,
                                  className: snap.className,
                                  faculty: snap.faculty,
                                  workplace: snap.workplace,
                                  avatarUrl: snap.avatarUrl,
                                });
                              }}
                              className="text-xs text-[#0068FF] hover:underline inline-flex items-center gap-1 mt-0.5 font-medium cursor-pointer"
                              title="Kết nối Zalo"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>Mở Zalo</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Group 1: Thông tin cá nhân & Niên khóa */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span className="text-[#9E1B20] font-bold">Phần 01</span>
                <span aria-hidden="true">·</span>
                <span>Thông tin Cá nhân, Ảnh đại diện & Niên khóa</span>
              </div>

              {/* Ảnh chân dung thành viên & Thuật toán crop / nén */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0 w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md ring-2 ring-[#9E1B20]/20 flex items-center justify-center">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt={formData.fullName || 'Ảnh chân dung'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-red-100/70 text-[#9E1B20] flex flex-col items-center justify-center border-2 border-dashed border-[#9E1B20]/40 shadow-inner">
                      <Camera className="w-8 h-8 opacity-70 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Chưa có ảnh</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAvatarCropper(true)}
                    className="absolute -bottom-1 -right-1 p-2 bg-[#9E1B20] text-white hover:bg-[#7D1418] rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer"
                    title="Chỉnh sửa & Crop ảnh"
                  >
                    <Crop className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 grow text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      Ảnh chân dung Thành viên (Avatar) <span className="text-[#9E1B20]">(*)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Bắt buộc để xác nhận Thành viên Mạng lưới
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-md">
                    Bắt buộc tải lên ảnh đại diện (Avatar) để xác nhận tư cách Thành viên Mạng lưới ALUMNI KTD. Hỗ trợ tự động nén tức thì mọi ảnh camera điện thoại về chuẩn &lt; 50KB WebP và cắt vuông 1:1.
                  </p>
                  {errors.avatarUrl && (
                    <p className="text-xs font-semibold text-[#9E1B20] bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg inline-block">
                      {errors.avatarUrl}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAvatarCropper(true)}
                      className="px-3 py-1.5 bg-[#9E1B20] text-white text-xs font-semibold rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{formData.avatarUrl ? 'Chỉnh sửa & Cắt lại ảnh' : 'Tải & Crop ảnh chân dung *'}</span>
                    </button>
                    <label
                      htmlFor="network-direct-avatar-file-input"
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:text-[#9E1B20] hover:border-red-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#9E1B20]" />
                      <span>Tải ảnh từ máy</span>
                    </label>
                    <input
                      id="network-direct-avatar-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleDirectAvatarFileSelect}
                      className="hidden"
                    />
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: '' }))}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 hover:text-red-700 hover:border-red-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Xóa ảnh</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Họ và tên (*) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="member-fullname"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Họ và tên <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <input
                    id="member-fullname"
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                  />
                  {errors.fullName && (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.fullName}</p>
                  )}
                </div>

                {/* Ngày tháng năm sinh (*) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="member-birthdate"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Ngày tháng năm sinh <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <input
                    id="member-birthdate"
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, birthDate: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                  />
                  {errors.birthDate && (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.birthDate}</p>
                  )}
                </div>

                {/* Zalo / Số điện thoại (*) - Bắt buộc */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="member-zalo-phone"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Zalo / Số điện thoại <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="member-zalo-phone"
                      type="tel"
                      required
                      placeholder="Ví dụ: 0905123456"
                      value={formData.zaloPhone || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, zaloPhone: val }));
                      }}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          onSaveUserPhone?.(e.target.value.trim(), formData.fullName);
                        }
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                    />
                  </div>
                  {errors.zaloPhone ? (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.zaloPhone}</p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Bắt buộc để kết nối trò chuyện Zalo trực tiếp với Ban Điều hành và cựu sinh viên.
                    </p>
                  )}
                </div>

                {/* Lớp (*) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="member-classname"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Lớp <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <input
                    id="member-classname"
                    type="text"
                    required
                    placeholder="Ví dụ: 12KT1, 14XD2..."
                    value={formData.className}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, className: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                  />
                  {errors.className && (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.className}</p>
                  )}
                </div>

                {/* Năm nhập học */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="member-enrollment-year"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Năm nhập học
                  </label>
                  <input
                    id="member-enrollment-year"
                    type="number"
                    min="2000"
                    max="2030"
                    placeholder="Ví dụ: 2012"
                    value={formData.enrollmentYear}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        enrollmentYear: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                  />
                </div>

                {/* Năm tốt nghiệp */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="member-graduation-year"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Năm tốt nghiệp
                  </label>
                  <input
                    id="member-graduation-year"
                    type="number"
                    min="2004"
                    max="2035"
                    placeholder="Ví dụ: 2017"
                    value={formData.graduationYear}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        graduationYear: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                  />
                </div>

                {/* Nơi ở hiện nay (*) - 34 tỉnh thành 2025 */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="member-current-province"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Nơi ở hiện nay (34 tỉnh thành 2025) <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <select
                    id="member-current-province"
                    value={formData.currentProvince}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        currentProvince: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                  >
                    {VIETNAM_34_PROVINCES_2025.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                  {errors.currentProvince && (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.currentProvince}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Group 2: Khoa & Ngành đào tạo phụ thuộc + Đơn vị công tác */}
            <div className="space-y-4 pt-4 border-t border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span className="text-[#9E1B20] font-bold">Phần 02</span>
                <span aria-hidden="true">·</span>
                <span>Chuyên môn Đào tạo (Droplist Phụ thuộc) & Công tác</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Khoa (*) - Droplist cha */}
                <div className="space-y-1.5 lg:col-span-1">
                  <label
                    htmlFor="member-faculty"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Khoa <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <select
                    id="member-faculty"
                    value={formData.faculty}
                    onChange={(e) => handleFacultyChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                  >
                    {FACULTY_MAJORS_LIST.map((f) => (
                      <option key={f.faculty} value={f.faculty}>
                        {f.faculty}
                      </option>
                    ))}
                  </select>
                  {errors.faculty && (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.faculty}</p>
                  )}
                </div>

                {/* Ngành (*) - Droplist phụ thuộc vào Khoa */}
                <div className="space-y-1.5 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="member-major"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Ngành đào tạo (Phụ thuộc theo Khoa) <span className="text-[#9E1B20]">(*)</span>
                    </label>
                    <span className="text-xs font-semibold text-[#9E1B20] tabular-nums">
                      {availableMajors.length} ngành trực thuộc
                    </span>
                  </div>
                  <select
                    id="member-major"
                    value={formData.major}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, major: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                  >
                    {availableMajors.map((majorName) => (
                      <option key={majorName} value={majorName}>
                        {majorName}
                      </option>
                    ))}
                  </select>
                  {errors.major && (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.major}</p>
                  )}
                </div>

                {/* Đơn vị công tác */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label
                    htmlFor="member-workplace"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Đơn vị công tác
                  </label>
                  <input
                    id="member-workplace"
                    type="text"
                    placeholder="Tên công ty, viện thiết kế, ban quản lý dự án, cơ quan..."
                    value={formData.workplace}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, workplace: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                  />
                </div>

                {/* Nơi công tác - 34 tỉnh thành 2025 */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="member-workplace-province"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Nơi công tác (34 tỉnh thành 2025)
                  </label>
                  <select
                    id="member-workplace-province"
                    value={formData.workplaceProvince}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        workplaceProvince: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-[#9E1B20]"
                  >
                    {VIETNAM_34_PROVINCES_2025.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                  {errors.workplaceProvince && (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.workplaceProvince}</p>
                  )}
                </div>
              </div>
            </div>

            {saveErrorMessage && (
              <div
                role="alert"
                className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-[#9E1B20] font-semibold flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{saveErrorMessage}</span>
              </div>
            )}

            <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                Lưu hồ sơ thành viên và gửi Thư xác nhận thông tin tới{' '}
                <span className="text-[#9E1B20] font-semibold">{formData.email}</span>.
              </p>
              <div className="flex items-center gap-2.5">
                {hasCompletedProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setLocalSectionExpanded(false);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Thu gọn
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#9E1B20] text-white text-sm font-semibold rounded-lg hover:bg-[#7D1418] active:bg-[#5E0D10] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 shadow-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Đang lưu & gửi thư...'
                      : 'Lưu Hồ sơ & Cập nhật'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      </div>
    )}
  </section>

      {/* Alumni Network Directory Table (With Direct Action to Send Board Notification/Email to Individual Member) */}
      <section
        id="alumni-directory-table"
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9E1B20]">
              Cơ sở dữ liệu Cựu sinh viên
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
              Danh bạ Thành viên Mạng lưới ALUMNI KTD
            </h2>
            <p className="text-xs text-slate-500">
              Danh bạ cựu sinh viên kết nối mạng lưới Đại học Kiến trúc Đà Nẵng qua 8 Khoa đào tạo. Chế độ bảo mật: Hiển thị Tên · Lớp · Đơn vị công tác nhằm bảo vệ an toàn thông tin cá nhân.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Tìm kiếm thành viên ALUMNI KTD"
                placeholder="Tìm họ tên, lớp, đơn vị..."
                value={directoryQuery}
                onChange={(e) => setDirectoryQuery(e.target.value)}
                className="pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] w-full sm:w-56"
              />
            </div>

            <select
              aria-label="Lọc danh bạ theo Khoa"
              value={directoryFaculty}
              onChange={(e) => setDirectoryFaculty(e.target.value)}
              className="px-3 py-2 text-sm font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            >
              <option value="ALL">Tất cả 8 Khoa</option>
              {FACULTY_MAJORS_LIST.map((f) => (
                <option key={f.faculty} value={f.faculty}>
                  {f.faculty}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc danh bạ theo Tỉnh Thành"
              value={directoryProvince}
              onChange={(e) => setDirectoryProvince(e.target.value)}
              className="px-3 py-2 text-sm font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            >
              <option value="ALL">Tất cả 34 Tỉnh/Thành 2025</option>
              {VIETNAM_34_PROVINCES_2025.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>
        </div>

        {directoryToastMsg && (
          <div
            role="status"
            className="bg-emerald-50 border-l-4 border-emerald-600 rounded-r-xl p-4 shadow-sm flex items-center justify-between gap-4 animate-in fade-in"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-bold text-emerald-900">{directoryToastMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => setDirectoryToastMsg(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline shrink-0"
            >
              Đóng
            </button>
          </div>
        )}

        {filteredMembers.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Không tìm thấy thành viên phù hợp với bộ lọc hiện tại.
            </p>
            <button
              type="button"
              onClick={() => {
                setDirectoryQuery('');
                setDirectoryFaculty('ALL');
                setDirectoryProvince('ALL');
              }}
              className="text-sm font-semibold text-[#9E1B20] hover:underline cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {currentUser?.isAdmin ? (
                    <>
                      <th className="py-3.5 pr-4">Họ và tên &amp; Email</th>
                      <th className="py-3.5 px-4">Lớp · Niên khóa</th>
                      <th className="py-3.5 px-4">Khoa & Ngành đào tạo</th>
                      <th className="py-3.5 px-4">Đơn vị & Nơi công tác</th>
                      {(onTogglePinMember || onDeleteMember) && (
                        <th className="py-3.5 pl-4 text-right">Thao tác Quản trị</th>
                      )}
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 pr-4">Họ và tên</th>
                      <th className="py-3.5 px-4">Lớp</th>
                      <th className="py-3.5 px-4">Đơn vị công tác</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-sm">
                {paginatedMembers.map((member) => (
                  <tr
                    key={member.uid}
                    className="hover:bg-[#FEF2F2]/50 transition-colors"
                  >
                    {currentUser?.isAdmin ? (
                      /* Admin View: Full Details & Contact Links */
                      <>
                        <td className="py-4 pr-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.fullName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-red-100 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-red-50 text-[#9E1B20] font-bold text-sm flex items-center justify-center border border-red-200 shrink-0">
                                {member.fullName.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-[#0F172A]">{member.fullName}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{member.email}</span>
                              </div>
                            </div>
                          </div>
                          {member.zaloPhone ? (
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <a
                                href={`tel:${member.zaloPhone.replace(/[\s.\-()]/g, '')}`}
                                className="text-xs font-semibold text-slate-700 hover:text-[#9E1B20] inline-flex items-center gap-1 font-mono tracking-wider"
                                title="Bấm để gọi điện thoại"
                              >
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{maskPhoneKeepLast4(member.zaloPhone)}</span>
                              </a>
                              <a
                                href={buildZaloDeepLink(member.zaloPhone) || `https://zalo.me/${member.zaloPhone.replace(/[\s.\-()]/g, '')}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  const deepLink = buildZaloDeepLink(member.zaloPhone);
                                  const cleanPhone = member.zaloPhone ? member.zaloPhone.replace(/[\s.\-()]/g, '') : '';
                                  const normalizedPhone = cleanPhone.startsWith('+84') ? '0' + cleanPhone.slice(3) : cleanPhone;
                                  const webUrl = `https://zalo.me/${normalizedPhone}`;
                                  
                                  // Kết nối trực tiếp với Zalo qua deep link, không làm lộ số điện thoại trên giao diện
                                  if (deepLink) {
                                    // Thử mở ứng dụng Zalo trực tiếp qua iframe ẩn hoặc window.location
                                    const iframe = document.createElement('iframe');
                                    iframe.style.display = 'none';
                                    iframe.src = deepLink;
                                    document.body.appendChild(iframe);
                                    setTimeout(() => {
                                      try {
                                        document.body.removeChild(iframe);
                                      } catch {}
                                    }, 1000);

                                    // Dự phòng mở trang kết nối zalo.me an toàn
                                    setTimeout(() => {
                                      window.open(webUrl, '_blank', 'noopener,noreferrer');
                                    }, 300);
                                  } else {
                                    window.open(webUrl, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#0068FF] hover:bg-[#0055d4] active:bg-[#0042a3] rounded-md border border-[#0068FF] transition-colors shadow-2xs group cursor-pointer"
                                title={`Kết nối Zalo với ${member.fullName}`}
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-white" />
                                <span>Chat Zalo</span>
                              </a>
                            </div>
                          ) : member.zaloPhoneMasked ? (
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-mono text-slate-500 tracking-wider">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{member.zaloPhoneMasked}</span>
                            </div>
                          ) : null}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600 tabular-nums whitespace-nowrap">
                          <span className="font-semibold text-[#9E1B20]">{member.className}</span>
                          <span aria-hidden="true" className="text-slate-300"> · </span>
                          <span>
                            {member.enrollmentYear || '—'} – {member.graduationYear || '—'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <div className="font-semibold text-[#0F172A]">{member.faculty}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{member.major}</div>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <div className="font-semibold text-[#0F172A]">
                            {member.workplace || 'Đang cập nhật'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {member.workplaceProvince} · Cư trú: {member.currentProvince}
                          </div>
                        </td>
                        {(onTogglePinMember || onDeleteMember) && (
                          <td className="py-4 pl-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {onTogglePinMember && (
                                <button
                                  type="button"
                                  onClick={() => onTogglePinMember(member.uid)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                    pinnedMemberIds.includes(member.uid)
                                      ? 'bg-[#9E1B20] text-white border-[#9E1B20] hover:bg-[#7D1418]'
                                      : 'bg-white hover:bg-red-50 text-slate-700 hover:text-[#9E1B20] border-slate-200'
                                  }`}
                                  title={
                                    pinnedMemberIds.includes(member.uid)
                                      ? 'Bỏ ghim thành viên này khỏi Trang chủ'
                                      : 'Ghim thành viên này lên Trang chủ'
                                  }
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                  <span>{pinnedMemberIds.includes(member.uid) ? 'Đã ghim' : 'Ghim'}</span>
                                </button>
                              )}
                              {onDeleteMember && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingMember(member)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 bg-white hover:bg-red-50 text-[#9E1B20] transition-colors cursor-pointer"
                                  title={`Xóa thành viên ${member.fullName}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa</span>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </>
                    ) : (
                      /* Member & Guest View: Strict Privacy (Tên - Lớp - Đơn vị công tác only) */
                      <>
                        <td className="py-4 pr-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.fullName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-red-100 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-red-50 text-[#9E1B20] font-bold text-sm flex items-center justify-center border border-red-200 shrink-0">
                                {member.fullName.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-[#0F172A]">{member.fullName}</div>
                              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Cựu sinh viên KTD</span>
                                {(member.zaloPhoneMasked || member.zaloPhone) && (
                                  <>
                                    <span aria-hidden="true" className="text-slate-300">·</span>
                                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 tabular-nums">
                                      <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                      {member.zaloPhoneMasked || maskPhoneKeepLast4(member.zaloPhone)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-700 tabular-nums whitespace-nowrap">
                          <span className="font-bold text-[#9E1B20]">{member.className || 'KTD'}</span>
                          {member.enrollmentYear && (
                            <span className="text-slate-500 text-xs ml-1.5">
                              (Khóa {member.enrollmentYear})
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <div className="font-semibold text-[#0F172A]">
                            {member.workplace || 'Đang cập nhật'}
                          </div>
                          {member.workplaceProvince && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {member.workplaceProvince}
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Compact Pagination Bar: Max 20 members per page */}
            {filteredMembers.length > 0 && (
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-slate-600">
                <div>
                  <span>
                    Hiển thị <strong className="text-slate-900 font-semibold">{(currentPage - 1) * pageSize + 1} – {Math.min(currentPage * pageSize, filteredMembers.length)}</strong> trên tổng số <strong className="text-slate-900 font-semibold">{filteredMembers.length}</strong> thành viên{' '}
                    <span className="text-slate-400">({pageSize} người/trang · Trang {currentPage}/{totalPages})</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-[#9E1B20] text-white shadow-xs'
                          : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Avatar Cropper Modal */}
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

      {/* Delete Member Confirmation Modal */}
      {deletingMember && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#9E1B20] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-[#0F172A]">
                Xác nhận Xóa Thành viên?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa hồ sơ thành viên{' '}
                <strong className="text-[#0F172A]">{deletingMember.fullName}</strong>{' '}
                ({deletingMember.className || 'KTD'} · {deletingMember.faculty}) khỏi hệ thống Mạng lưới ALUMNI KTD?
              </p>
              <p className="text-xs text-[#9E1B20] font-semibold">
                Hành động này sẽ xóa vĩnh viễn dữ liệu thành viên khỏi danh bạ và không thể hoàn tác.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isDeletingMember}
                onClick={() => setDeletingMember(null)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingMember}
                onClick={handleConfirmDeleteMember}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-xl cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingMember ? 'Đang xóa...' : 'Xác nhận Xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KẾT NỐI ZALO TRỰC TIẾP KHÔNG CẦN QUÉT MÃ QR */}
      <ZaloConnectModal
        isOpen={Boolean(zaloModalMember)}
        onClose={() => setZaloModalMember(null)}
        member={zaloModalMember}
      />
    </div>
  );
};
