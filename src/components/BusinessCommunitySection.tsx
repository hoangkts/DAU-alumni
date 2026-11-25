import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  Mail,
  Search,
  AlertCircle,
  ArrowRight,
  Plus,
  Globe,
  Check,
  Compass,
  ChevronDown,
  Phone,
  MapPin,
  UserCheck,
  ExternalLink,
  Layers,
  RotateCcw,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Camera,
  Crop,
  Sparkles,
  Trash2,
  Pin,
  Pencil,
  X,
} from 'lucide-react';
import {
  BUSINESS_INDUSTRIES,
  BUSINESS_SCALES,
  BusinessRecord,
  MemberProfileRecord,
  VIETNAM_34_PROVINCES_2025,
} from '../data/constants';
import {
  BusinessFormInput,
  buildZaloChatUrl,
  isConfirmedNetworkMember,
  maskPhoneKeepLast4,
  sanitizeExternalUrl,
  validateBusinessForm,
} from '../utils/alumniLogic';
import { autoResizeAndOptimizeFile } from '../utils/imageOptimizer';
import { BusinessDashboard } from './BusinessDashboard';
import { ImageCropperModal } from './ImageCropperModal';
import { ZaloConnectModal, ZaloMemberInfo } from './ZaloConnectModal';

interface BusinessCommunitySectionProps {
  currentUser: {
    uid: string;
    email: string;
    displayName: string;
    isAdmin?: boolean;
    authMode?: 'password' | 'google' | 'demo';
  } | null;
  isAdmin?: boolean;
  currentMemberProfile: MemberProfileRecord | null;
  businesses: BusinessRecord[];
  onRegisterBusiness: (input: BusinessFormInput) => Promise<void>;
  onUpdateBusiness?: (bizId: string, input: BusinessFormInput) => Promise<void>;
  onDeleteBusiness?: (bizId: string) => Promise<void>;
  onNavigateToNetwork: () => void;
  onGoogleLogin?: () => Promise<void> | void;
  onOpenProfileModal?: () => void;
  onOpenEmailOutbox: () => void;
  pinnedBusinessIds?: string[];
  onTogglePinBusiness?: (businessId: string) => void;
}

export const BusinessCommunitySection: React.FC<
  BusinessCommunitySectionProps
> = ({
  currentUser,
  isAdmin = false,
  currentMemberProfile,
  businesses,
  onRegisterBusiness,
  onUpdateBusiness,
  onDeleteBusiness,
  onNavigateToNetwork,
  onGoogleLogin,
  onOpenProfileModal,
  onOpenEmailOutbox,
  pinnedBusinessIds = [],
  onTogglePinBusiness,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('ALL');
  const [scaleFilter, setScaleFilter] = useState('ALL');
  const [provinceFilter, setProvinceFilter] = useState('ALL');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [editingBizId, setEditingBizId] = useState<string | null>(null);
  const [deletingBizId, setDeletingBizId] = useState<string | null>(null);
  const [zaloModalMember, setZaloModalMember] = useState<ZaloMemberInfo | null>(null);
  const [expandedBizIds, setExpandedBizIds] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const [formData, setFormData] = useState<BusinessFormInput>({
    companyName: '',
    industry: BUSINESS_INDUSTRIES[0],
    scale: BUSINESS_SCALES[1],
    province: currentMemberProfile?.workplaceProvince || 'Thành phố Đà Nẵng',
    address: '',
    website: '',
    contactEmail: currentUser?.email || '',
    contactPhone: '',
    description: '',
    logoUrl: '',
    logoAspectRatio: '4:3',
  });

  const [showLogoCropper, setShowLogoCropper] = useState(false);
  const [customProvince, setCustomProvince] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleStartEditBusiness = (biz: BusinessRecord) => {
    const standard34 = VIETNAM_34_PROVINCES_2025.filter(
      (p) => p !== 'Nơi khác (Nước ngoài / Quốc tế)'
    );
    const isStandardProv = standard34.includes(biz.province);
    setEditingBizId(biz.id);
    setCustomProvince(
      isStandardProv ? '' : biz.province.replace(/^Nơi khác:\s*/, '')
    );
    setFormData({
      companyName: biz.companyName || '',
      industry: biz.industry || BUSINESS_INDUSTRIES[0],
      scale: biz.scale || BUSINESS_SCALES[1],
      province: isStandardProv
        ? biz.province
        : 'Nơi khác (Nước ngoài / Quốc tế)',
      address: biz.address || '',
      website: biz.website || '',
      contactEmail: biz.contactEmail || currentUser?.email || '',
      contactPhone: biz.contactPhone || '',
      description: biz.description || '',
      logoUrl: biz.logoUrl || '',
      logoAspectRatio: biz.logoAspectRatio || '4:3',
    });
    setErrors({});
    setSuccessMsg(null);
    setShowRegisterForm(true);
    try {
      document
        .getElementById('business-community-section')
        ?.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  };

  const handleCancelEditBusiness = () => {
    setEditingBizId(null);
    setCustomProvince('');
    setErrors({});
    setFormData({
      companyName: '',
      industry: BUSINESS_INDUSTRIES[0],
      scale: BUSINESS_SCALES[1],
      province: currentMemberProfile?.workplaceProvince || 'Thành phố Đà Nẵng',
      address: '',
      website: '',
      contactEmail: currentUser?.email || '',
      contactPhone: '',
      description: '',
      logoUrl: '',
      logoAspectRatio: '4:3',
    });
  };

  const handleDirectLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tập tin hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).');
      return;
    }

    try {
      const optimized = await autoResizeAndOptimizeFile(file, 'business_logo', formData.logoAspectRatio || '4:3');
      setFormData((prev) => ({
        ...prev,
        logoUrl: optimized.dataUrl,
      }));
      setShowLogoCropper(true);
    } catch (err: any) {
      alert('Không thể tự động nén logo: ' + (err?.message || 'Có lỗi xảy ra'));
    }
    e.target.value = '';
  };

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        contactEmail: prev.contactEmail || currentUser.email,
        province:
          prev.province ||
          currentMemberProfile?.workplaceProvince ||
          'Thành phố Đà Nẵng',
      }));
    }
  }, [currentUser, currentMemberProfile]);

  const hasRegisteredMemberProfile = Boolean(
    currentUser && isConfirmedNetworkMember(currentMemberProfile)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);

    const validation = validateBusinessForm(formData, hasRegisteredMemberProfile);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const resolvedProvince =
        formData.province === 'Nơi khác (Nước ngoài / Quốc tế)'
          ? (customProvince.trim()
              ? `Nơi khác: ${customProvince.trim()}`
              : 'Nơi khác (Nước ngoài / Quốc tế)')
          : formData.province;

      if (editingBizId && onUpdateBusiness) {
        await onUpdateBusiness(editingBizId, {
          ...formData,
          province: resolvedProvince,
        });
        setSuccessMsg(
          `Đã cập nhật thông tin doanh nghiệp "${formData.companyName}" thành công.`
        );
        setEditingBizId(null);
      } else {
        await onRegisterBusiness({
          ...formData,
          province: resolvedProvince,
        });
        setSuccessMsg(
          `Doanh nghiệp "${formData.companyName}" đã được ghi nhận vào Cộng đồng Doanh nghiệp ALUMNI KTD. Hệ thống đã gửi thư xác nhận tự động tới ${currentUser?.email}.`
        );
      }
      setFormData((prev) => ({
        ...prev,
        companyName: '',
        address: '',
        website: '',
        contactPhone: '',
        description: '',
        logoUrl: '',
        logoAspectRatio: '4:3',
      }));
      setCustomProvince('');
    } catch (err: any) {
      console.error('Error saving business record:', err);
      setErrors({
        general: err?.message || 'Có lỗi xảy ra khi lưu thông tin doanh nghiệp. Vui lòng kiểm tra lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter businesses by search, industry, scale, and province
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      // 1. Industry
      if (industryFilter !== 'ALL' && b.industry !== industryFilter) {
        return false;
      }
      // 2. Scale
      if (scaleFilter !== 'ALL' && b.scale !== scaleFilter) {
        return false;
      }
      // 3. Province
      if (
        provinceFilter !== 'ALL' &&
        b.province !== provinceFilter &&
        !(
          provinceFilter === 'Nơi khác (Nước ngoài / Quốc tế)' &&
          (b.province?.includes('Nơi khác') ||
            !VIETNAM_34_PROVINCES_2025.includes(b.province))
        )
      ) {
        return false;
      }
      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = b.companyName?.toLowerCase().includes(q);
        const matchOwner = b.ownerName?.toLowerCase().includes(q);
        const matchFaculty = b.ownerFaculty?.toLowerCase().includes(q);
        const matchIndustry = b.industry?.toLowerCase().includes(q);
        const matchProvince = b.province?.toLowerCase().includes(q);
        const matchDesc = b.description?.toLowerCase().includes(q);
        return Boolean(matchName || matchOwner || matchFaculty || matchIndustry || matchProvince || matchDesc);
      }
      return true;
    });
  }, [businesses, searchQuery, industryFilter, scaleFilter, provinceFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, industryFilter, scaleFilter, provinceFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredBusinesses.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBusinesses = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredBusinesses.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredBusinesses, safeCurrentPage, PAGE_SIZE]);

  const toggleBizDetails = (id: string) => {
    setExpandedBizIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const areAllExpanded =
    paginatedBusinesses.length > 0 &&
    paginatedBusinesses.every((b) => expandedBizIds[b.id]);

  const toggleAllDetails = () => {
    if (areAllExpanded) {
      setExpandedBizIds({});
    } else {
      const all: Record<string, boolean> = {};
      paginatedBusinesses.forEach((b) => {
        all[b.id] = true;
      });
      setExpandedBizIds(all);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setIndustryFilter('ALL');
    setScaleFilter('ALL');
    setProvinceFilter('ALL');
    setCurrentPage(1);
  };

  // Determine active filter for dashboard
  const activeDashboardFilter = useMemo(() => {
    if (industryFilter !== 'ALL') {
      return { type: 'industry' as const, value: industryFilter };
    }
    if (scaleFilter !== 'ALL') {
      return { type: 'scale' as const, value: scaleFilter };
    }
    if (provinceFilter !== 'ALL') {
      return { type: 'province' as const, value: provinceFilter };
    }
    return null;
  }, [industryFilter, scaleFilter, provinceFilter]);

  return (
    <div id="business-community-section" className="space-y-8">
      {/* Architectural Crimson Hero Banner */}
      <section className="dau-crimson-hero rounded-2xl p-6 sm:p-8 lg:p-10 text-white shadow-lg">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-200 flex items-center gap-2">
              <Compass className="w-4 h-4" />
              <span>03. HỆ SINH THÁI DOANH NGHIỆP · ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG</span>
            </p>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Cộng đồng Doanh nghiệp ALUMNI KTD
            </h1>
            <p className="text-sm sm:text-base text-red-100/95 max-w-2xl leading-relaxed">
              Mạng lưới các tổ chức, công ty và văn phòng thiết kế do cựu sinh viên DAU sáng lập,
              quản lý hoặc làm chủ trên khắp 34 tỉnh, thành phố mới của Việt Nam.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRegisterForm((prev) => !prev)}
            className="px-4 py-2.5 bg-white text-[#9E1B20] text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>
              {showRegisterForm
                ? 'Thu gọn Biểu mẫu Đăng ký'
                : 'Đăng ký Doanh nghiệp Mới'}
            </span>
          </button>
        </div>
      </section>

      {/* Business Registration Gate & Form */}
      {showRegisterForm && (
        <section className="bg-white dau-drafting-grid border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9E1B20]">
                {editingBizId ? 'Cập nhật Hồ sơ Doanh nghiệp' : 'Đăng ký Hồ sơ Pháp nhân / Đơn vị'}
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                {editingBizId
                  ? 'Chỉnh sửa Thông tin Doanh nghiệp Cựu sinh viên'
                  : 'Đăng ký Thông tin Doanh nghiệp Cựu sinh viên'}
              </h2>
              <p className="text-sm text-slate-600">
                Điều kiện bắt buộc: Đã xác nhận Thành viên Mạng lưới ALUMNI KTD (đăng nhập tài khoản thành viên + cập nhật thông tin cá nhân + có ảnh đại diện Avatar).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {hasRegisteredMemberProfile && currentMemberProfile && (
                <div className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Người đại diện:</span>
                  <strong className="text-[#9E1B20] font-semibold">{currentMemberProfile.fullName}</strong>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-medium text-slate-700">{currentMemberProfile.faculty}</span>
                </div>
              )}
              {editingBizId && (
                <button
                  type="button"
                  onClick={handleCancelEditBusiness}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy chỉnh sửa</span>
                </button>
              )}
            </div>
          </div>

          {!hasRegisteredMemberProfile ? (
            <div className="bg-[#FEF2F2] border-l-4 border-[#9E1B20] rounded-r-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#9E1B20] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-[#9E1B20]">
                    Chỉ Thành viên Mạng lưới đã xác nhận mới được đăng ký Cộng đồng Doanh nghiệp
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {!currentUser
                      ? 'Bạn chưa đăng nhập tài khoản thành viên. Vui lòng đăng nhập (hoặc đăng ký tài khoản), cập nhật đầy đủ thông tin cá nhân và tải ảnh đại diện (Avatar) để xác nhận Thành viên Mạng lưới trước khi đăng ký doanh nghiệp.'
                      : !currentMemberProfile?.avatarUrl?.trim()
                        ? 'Tài khoản thành viên của bạn chưa hoàn tất hồ sơ hoặc chưa có ảnh đại diện (Avatar). Vui lòng cập nhật đầy đủ thông tin và tải ảnh Avatar để chính thức xác nhận Thành viên Mạng lưới.'
                        : 'Tài khoản của bạn chưa cập nhật đầy đủ thông tin cá nhân bắt buộc trên Mạng lưới ALUMNI KTD. Vui lòng hoàn thiện hồ sơ và ảnh Avatar để mở khóa đăng ký doanh nghiệp.'}
                  </p>
                </div>
              </div>
              {!currentUser && onGoogleLogin ? (
                <button
                  type="button"
                  onClick={() => onGoogleLogin()}
                  className="px-4 py-2.5 bg-[#9E1B20] text-white text-sm font-semibold rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 shadow-xs"
                >
                  <span>Đăng nhập / Đăng ký Thành viên</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => (onOpenProfileModal ? onOpenProfileModal() : onNavigateToNetwork())}
                  className="px-4 py-2.5 bg-[#9E1B20] text-white text-sm font-semibold rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 shadow-xs"
                >
                  <span>Cập nhật Hồ sơ &amp; Ảnh Avatar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {successMsg && (
                <div
                  role="status"
                  className="bg-[#FEF2F2] border-l-4 border-[#9E1B20] rounded-r-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#9E1B20] shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {successMsg}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenEmailOutbox}
                    className="text-sm font-semibold text-[#9E1B20] hover:underline cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1"
                  >
                    <span>Xem thư xác nhận</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Logo Doanh nghiệp & Tùy chọn Tỷ lệ (1:1, 3:4, 4:3, 16:9, Khổ ngang, Khổ dọc) */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  {formData.logoUrl ? (
                    <div className="relative h-24 w-auto min-w-[96px] max-w-[220px] bg-white border border-slate-300 rounded-xl p-2 shadow-xs flex items-center justify-center overflow-hidden">
                      <img
                        src={formData.logoUrl}
                        alt={formData.companyName || 'Logo doanh nghiệp'}
                        className="h-full w-auto max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-28 h-20 rounded-xl bg-red-50 text-[#9E1B20] flex flex-col items-center justify-center border-2 border-dashed border-[#9E1B20]/40 shadow-inner">
                      <Building2 className="w-8 h-8 opacity-60 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Chưa có Logo</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowLogoCropper(true)}
                    className="absolute -bottom-1 -right-1 p-2 bg-[#9E1B20] text-white hover:bg-[#7D1418] rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer"
                    title="Chỉnh sửa & Cắt Logo"
                  >
                    <Crop className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 grow text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      Logo Thương hiệu Doanh nghiệp
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-[#9E1B20] border border-red-200">
                      Tỷ lệ: {formData.logoAspectRatio || '4:3'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Nén thông minh WebP (&lt; 60KB)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-lg">
                    Tùy chỉnh crop theo nhiều tỷ lệ: <strong>1:1 (Vuông)</strong>, <strong>3:4 (Khổ dọc)</strong>, <strong>4:3 (Khổ ngang)</strong>, <strong>16:9 (Banner ngang)</strong> hoặc <strong>Khổ tự do</strong>. Cho phép kéo điều chỉnh tâm logo, zoom và xoay góc.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLogoCropper(true)}
                      className="px-3.5 py-1.5 bg-[#9E1B20] text-white text-xs font-semibold rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>{formData.logoUrl ? 'Chỉnh sửa & Crop lại Logo' : 'Tải lên & Tùy chỉnh Crop Logo'}</span>
                    </button>
                    <label
                      htmlFor="biz-direct-logo-file-input"
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:text-[#9E1B20] hover:border-red-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#9E1B20]" />
                      <span>Tải ảnh từ máy</span>
                    </label>
                    <input
                      id="biz-direct-logo-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleDirectLogoFileSelect}
                      className="hidden"
                    />
                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, logoUrl: '', logoAspectRatio: '4:3' }))}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 hover:text-red-700 hover:border-red-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Xóa logo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Tên doanh nghiệp (*) */}
                <div className="space-y-1.5 lg:col-span-2">
                  <label
                    htmlFor="biz-company-name"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Tên doanh nghiệp <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <input
                    id="biz-company-name"
                    type="text"
                    required
                    placeholder="Ví dụ: Công ty Cổ phần Tư vấn Thiết kế Kiến trúc & Xây dựng..."
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        companyName: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                  {errors.companyName && (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.companyName}</p>
                  )}
                </div>

                {/* Lĩnh vực hoạt động (*) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="biz-industry"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Lĩnh vực hoạt động <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <select
                    id="biz-industry"
                    value={formData.industry}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, industry: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  >
                    {BUSINESS_INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quy mô doanh nghiệp (*) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="biz-scale"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Quy mô nhân sự <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <select
                    id="biz-scale"
                    value={formData.scale}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, scale: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  >
                    {BUSINESS_SCALES.map((scale) => (
                      <option key={scale} value={scale}>
                        {scale}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tỉnh thành (34 tỉnh thành 2025 & Nơi khác) (*) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="biz-province"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Tỉnh / Thành phố trụ sở doanh nghiệp <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <select
                    id="biz-province"
                    value={formData.province}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        province: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  >
                    {VIETNAM_34_PROVINCES_2025.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                  {formData.province === 'Nơi khác (Nước ngoài / Quốc tế)' && (
                    <div className="mt-2 space-y-1 animate-in fade-in duration-150">
                      <label className="text-[11px] font-semibold text-[#9E1B20]">
                        Quốc gia / Tỉnh thành trụ sở tại nước ngoài
                      </label>
                      <input
                        type="text"
                        value={customProvince}
                        onChange={(e) => setCustomProvince(e.target.value)}
                        placeholder="Ví dụ: Tokyo - Nhật Bản, Seoul - Hàn Quốc, California - Mỹ..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-red-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                      />
                    </div>
                  )}
                </div>

                {/* Địa chỉ trụ sở */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="biz-address"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Địa chỉ cụ thể
                  </label>
                  <input
                    id="biz-address"
                    type="text"
                    placeholder="Số nhà, tên đường, phường/xã..."
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="biz-website"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Website doanh nghiệp
                  </label>
                  <input
                    id="biz-website"
                    type="url"
                    placeholder="https://tencongty.vn"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, website: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>

                {/* Email liên hệ (*) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="biz-contact-email"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Email liên hệ <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <input
                    id="biz-contact-email"
                    type="email"
                    required
                    placeholder="contact@tencongty.vn"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactEmail: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                  {errors.contactEmail && (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.contactEmail}</p>
                  )}
                </div>

                {/* Số điện thoại liên hệ (*) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="biz-contact-phone"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Số điện thoại liên hệ <span className="text-[#9E1B20]">(*)</span>
                  </label>
                  <input
                    id="biz-contact-phone"
                    type="tel"
                    required
                    placeholder="Ví dụ: 0905 123 456"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactPhone: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                  {errors.contactPhone && (
                    <p className="text-xs font-medium text-[#9E1B20]">{errors.contactPhone}</p>
                  )}
                </div>

                {/* Mô tả chi tiết hoạt động của công ty */}
                <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="biz-description"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Mô tả về hoạt động của công ty & Sản phẩm dịch vụ chủ lực
                    </label>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {formData.description.length} / 600 ký tự
                    </span>
                  </div>
                  <textarea
                    id="biz-description"
                    rows={3}
                    maxLength={600}
                    placeholder="Nhập chi tiết về quá trình thành lập, lĩnh vực sản xuất - thương mại, sản phẩm dịch vụ chủ lực, dự án tiêu biểu hoặc nhu cầu hợp tác trong Mạng lưới ALUMNI..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  Hệ thống tự động gửi thư xác nhận đăng ký doanh nghiệp qua email{' '}
                  <span className="text-[#9E1B20] font-semibold">
                    {currentUser?.email}
                  </span>
                  .
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#9E1B20] text-white text-sm font-semibold rounded-lg hover:bg-[#7D1418] active:bg-[#5E0D10] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 shadow-sm flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Đang lưu thông tin...'
                      : editingBizId
                        ? 'Lưu Cập nhật Doanh nghiệp'
                        : 'Đăng ký Doanh nghiệp & Gửi Thư Xác nhận'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Business Dashboard with KPIs & Drop Breakdown */}
      <BusinessDashboard
        businesses={businesses}
        onSelectIndustryFilter={(ind) => {
          setIndustryFilter(ind);
          setCurrentPage(1);
        }}
        onSelectScaleFilter={(sc) => {
          setScaleFilter(sc);
          setCurrentPage(1);
        }}
        onSelectProvinceFilter={(prov) => {
          setProvinceFilter(prov);
          setCurrentPage(1);
        }}
        activeFilter={activeDashboardFilter}
        onClearFilter={resetFilters}
      />

      {/* Business Directory & Search Controls */}
      <section className="space-y-4">
        {/* Search, Filter Bar and Space-Saving Expand/Collapse Control */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Tìm kiếm doanh nghiệp ALUMNI KTD"
              placeholder="Tìm theo tên công ty, chủ doanh nghiệp, lĩnh vực, tỉnh thành..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <select
              aria-label="Lọc theo lĩnh vực doanh nghiệp"
              value={industryFilter}
              onChange={(e) => {
                setIndustryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            >
              <option value="ALL">Tất cả lĩnh vực</option>
              {BUSINESS_INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo quy mô nhân sự"
              value={scaleFilter}
              onChange={(e) => {
                setScaleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            >
              <option value="ALL">Tất cả quy mô</option>
              {BUSINESS_SCALES.map((sc) => (
                <option key={sc} value={sc}>
                  {sc.split('(')[0].trim()}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc doanh nghiệp theo tỉnh thành"
              value={provinceFilter}
              onChange={(e) => {
                setProvinceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            >
              <option value="ALL">Tất cả 34 Tỉnh/Thành 2025</option>
              {VIETNAM_34_PROVINCES_2025.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>

            {/* Quick Expand All / Collapse All Droplist Toggle */}
            <button
              type="button"
              onClick={toggleAllDetails}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-xs"
              title={areAllExpanded ? 'Thu gọn tất cả droplist chi tiết' : 'Mở rộng tất cả droplist chi tiết'}
            >
              <Layers className="w-3.5 h-3.5 text-[#9E1B20]" />
              <span>{areAllExpanded ? 'Thu gọn tất cả chi tiết' : 'Mở tất cả chi tiết'}</span>
            </button>
          </div>
        </div>

        {/* Directory Counter & Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">
              Danh sách: {filteredBusinesses.length} doanh nghiệp
            </span>
            {filteredBusinesses.length > PAGE_SIZE && (
              <span className="text-slate-400">
                · Hiển thị tối đa {PAGE_SIZE} DN/trang (Trang {safeCurrentPage}/{totalPages})
              </span>
            )}
          </div>

          {(searchQuery || industryFilter !== 'ALL' || scaleFilter !== 'ALL' || provinceFilter !== 'ALL') && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[#9E1B20] hover:underline font-semibold cursor-pointer w-fit"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại bộ lọc tìm kiếm</span>
            </button>
          )}
        </div>

        {/* Unified Table: Each Business 1 Row with Expandable Drop Drawer */}
        {filteredBusinesses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3 shadow-xs">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              Không tìm thấy doanh nghiệp phù hợp
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Không có doanh nghiệp nào khớp với từ khóa hoặc bộ lọc đã chọn. Hãy thử tìm từ khóa khác hoặc đặt lại bộ lọc.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-semibold bg-[#9E1B20] text-white rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer"
            >
              Đặt lại toàn bộ bộ lọc
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6"># & Tên Doanh nghiệp & Người đại diện</th>
                    <th className="py-3.5 px-4 hidden md:table-cell">Lĩnh vực hoạt động</th>
                    <th className="py-3.5 px-4 hidden lg:table-cell">Quy mô</th>
                    <th className="py-3.5 px-4 hidden sm:table-cell">Trụ sở (34 Tỉnh/Thành 2025)</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Thao tác / Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedBusinesses.map((biz, idx) => {
                    const rowNumber = (safeCurrentPage - 1) * PAGE_SIZE + idx + 1;
                    const isExpanded = Boolean(expandedBizIds[biz.id]);
                    const cleanPhone = biz.contactPhone?.trim();
                    const maskedPhone = maskPhoneKeepLast4(cleanPhone);
                    const zaloUrl = buildZaloChatUrl(cleanPhone);
                    const safeWebsite = sanitizeExternalUrl(biz.website);

                    return (
                      <React.Fragment key={biz.id}>
                        {/* Primary Single Row */}
                        <tr
                          onClick={() => toggleBizDetails(biz.id)}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer select-none ${
                            isExpanded ? 'bg-red-50/20' : ''
                          }`}
                        >
                          {/* Col 1: Company Name & Representative */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-start gap-3">
                              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                                <span
                                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                                    isExpanded
                                      ? 'bg-[#9E1B20] text-white'
                                      : 'bg-red-50 text-[#9E1B20] border border-red-100'
                                  }`}
                                >
                                  {rowNumber < 10 ? `0${rowNumber}` : rowNumber}
                                </span>

                                {biz.logoUrl ? (
                                  <div className="h-10 w-auto min-w-[40px] max-w-[80px] bg-white border border-slate-200 rounded-lg p-1 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                                    <img
                                      src={biz.logoUrl}
                                      alt={biz.companyName}
                                      className="h-full w-auto max-h-full max-w-full object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-red-50 text-[#9E1B20] border border-red-100 flex items-center justify-center shrink-0">
                                    <Building2 className="w-5 h-5 text-[#9E1B20]/60" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 space-y-1">
                                <h3 className="text-sm sm:text-base font-bold text-[#0F172A] hover:text-[#9E1B20] transition-colors leading-snug">
                                  {biz.companyName}
                                </h3>

                                <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                                  <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>
                                    Đại diện:{' '}
                                    <strong className="text-slate-700 font-semibold">
                                      {biz.ownerName}
                                    </strong>
                                  </span>
                                  <span className="text-slate-300">·</span>
                                  <span className="text-slate-500">{biz.ownerFaculty}</span>
                                </p>

                                {/* Responsive compact info chips on smaller screens */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5 md:hidden text-[11px]">
                                  <span className="font-semibold text-[#9E1B20] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                    {biz.industry}
                                  </span>
                                  <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                    {biz.province}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Industry */}
                          <td className="py-4 px-4 hidden md:table-cell align-top">
                            <span className="inline-block text-xs font-semibold text-[#9E1B20] bg-red-50 px-2.5 py-1 rounded-md border border-red-100/80 max-w-[210px] truncate">
                              {biz.industry}
                            </span>
                          </td>

                          {/* Col 3: Scale */}
                          <td className="py-4 px-4 hidden lg:table-cell align-top">
                            <span className="inline-block text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md font-medium whitespace-nowrap">
                              {biz.scale.split('(')[0].trim()}
                            </span>
                          </td>

                          {/* Col 4: Province */}
                          <td className="py-4 px-4 hidden sm:table-cell align-top">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800 whitespace-nowrap">
                              <MapPin className="w-3.5 h-3.5 text-[#9E1B20] shrink-0" />
                              <span>{biz.province}</span>
                            </div>
                          </td>

                          {/* Col 5: Actions & Drop Button */}
                          <td className="py-4 px-4 sm:px-6 align-top text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(isAdmin || currentUser?.isAdmin) && onTogglePinBusiness && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePinBusiness(biz.id);
                                  }}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                                    pinnedBusinessIds.includes(biz.id)
                                      ? 'bg-[#9E1B20] text-white border-[#9E1B20] hover:bg-[#7D1418]'
                                      : 'bg-white hover:bg-red-50 text-slate-700 hover:text-[#9E1B20] border-slate-200'
                                  }`}
                                  title={
                                    pinnedBusinessIds.includes(biz.id)
                                      ? 'Bỏ ghim doanh nghiệp này khỏi Trang chủ'
                                      : 'Ghim doanh nghiệp này lên Trang chủ'
                                  }
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                  <span className="hidden xl:inline">
                                    {pinnedBusinessIds.includes(biz.id) ? 'Đã ghim' : 'Ghim Trang chủ'}
                                  </span>
                                </button>
                              )}

                              {/* Droplist Button: Toggle details */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBizDetails(biz.id);
                                }}
                                aria-expanded={isExpanded}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 shadow-xs ${
                                  isExpanded
                                    ? 'bg-[#9E1B20] text-white hover:bg-[#7D1418]'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200/80'
                                }`}
                                title={isExpanded ? 'Thu gọn chi tiết' : 'Mở droplist chi tiết'}
                              >
                                <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>

                              {safeWebsite && (
                                <a
                                  href={safeWebsite}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 text-slate-500 hover:text-[#9E1B20] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Mở website công ty"
                                >
                                  <Globe className="w-4 h-4" />
                                </a>
                              )}

                              <a
                                href={`mailto:${biz.contactEmail}?subject=${encodeURIComponent(
                                  `[ALUMNI KTD] Kết nối hợp tác doanh nghiệp cùng ${biz.companyName}`
                                )}`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 text-[#9E1B20] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Gửi thư kết nối hợp tác"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>

                        {/* Accordion Drop Drawer Sub-Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/75 border-b-2 border-slate-200 animate-in fade-in slide-in-from-top-1 duration-150">
                            <td colSpan={5} className="p-4 sm:p-6">
                              <div className="border-l-4 border-[#9E1B20] pl-4 sm:pl-6 space-y-4">
                                {/* Company Description / Cooperation intro */}
                                <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed shadow-2xs flex flex-col md:flex-row gap-4 items-start">
                                  {biz.logoUrl && (
                                    <div className="h-20 sm:h-24 w-auto min-w-[80px] max-w-[200px] bg-slate-50 border border-slate-200 rounded-lg p-2 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden">
                                      <img
                                        src={biz.logoUrl}
                                        alt={biz.companyName}
                                        className="h-full w-auto max-h-full max-w-full object-contain"
                                      />
                                    </div>
                                  )}
                                  <div className="grow space-y-1.5">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9E1B20] flex items-center gap-1.5">
                                      <Building2 className="w-3.5 h-3.5" />
                                      <span>Mô tả hoạt động doanh nghiệp, năng lực & Nhu cầu hợp tác B2B</span>
                                    </p>
                                    <p>{biz.description || 'Chưa cập nhật mô tả chi tiết năng lực hợp tác.'}</p>
                                  </div>
                                </div>

                                {/* Key Information Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                  {/* Scale */}
                                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                      <Layers className="w-3 h-3 text-slate-400" />
                                      Quy mô nhân sự:
                                    </span>
                                    <p className="font-semibold text-slate-800">{biz.scale}</p>
                                  </div>

                                  {/* Address */}
                                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      Địa chỉ trụ sở:
                                    </span>
                                    <p className="font-medium text-slate-800 break-words">
                                      {biz.address ? `${biz.address}, ` : ''}
                                      {biz.province}
                                    </p>
                                  </div>

                                  {/* Contact Phone & Zalo */}
                                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      Điện thoại liên hệ:
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <a
                                        href={`tel:${biz.contactPhone}`}
                                        className="font-bold text-[#9E1B20] hover:underline tabular-nums"
                                      >
                                        {maskedPhone || biz.contactPhone}
                                      </a>
                                      {zaloUrl && cleanPhone && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setZaloModalMember({
                                              fullName: `${biz.ownerName} (${biz.companyName})`,
                                              phone: cleanPhone,
                                              faculty: biz.ownerFaculty,
                                              workplace: biz.companyName,
                                              avatarUrl: biz.logoUrl,
                                            })
                                          }
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#0068FF] text-white hover:bg-[#0052cc] transition-colors shadow-2xs cursor-pointer"
                                          title="Mở kết nối Zalo trực tiếp với đại diện doanh nghiệp"
                                        >
                                          <MessageCircle className="w-3 h-3" />
                                          <span>Chat Zalo</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Contact Email */}
                                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                      <Mail className="w-3 h-3 text-slate-400" />
                                      Email giao dịch:
                                    </span>
                                    <a
                                      href={`mailto:${biz.contactEmail}`}
                                      className="font-semibold text-slate-700 hover:text-[#9E1B20] hover:underline truncate block"
                                      title={biz.contactEmail}
                                    >
                                      {biz.contactEmail}
                                    </a>
                                  </div>
                                </div>

                                {/* Drawer Action Bar */}
                                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex flex-wrap items-center gap-3">
                                    {safeWebsite ? (
                                      <a
                                        href={safeWebsite}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9E1B20] hover:underline"
                                      >
                                        <Globe className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate max-w-[220px]">{biz.website}</span>
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                      </a>
                                    ) : (
                                      <span className="text-xs text-slate-400 italic">
                                        Chưa đăng ký website
                                      </span>
                                    )}

                                    {/* Owner / Admin Edit & Delete Controls */}
                                    {(isAdmin ||
                                      currentUser?.isAdmin ||
                                      (currentUser && biz.ownerUid === currentUser.uid)) && (
                                      <div className="flex items-center gap-2">
                                        {onUpdateBusiness && (
                                          <button
                                            type="button"
                                            onClick={() => handleStartEditBusiness(biz)}
                                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                            title="Chỉnh sửa thông tin doanh nghiệp của bạn"
                                          >
                                            <Pencil className="w-3 h-3 text-[#9E1B20]" />
                                            <span>Chỉnh sửa DN</span>
                                          </button>
                                        )}
                                        {onDeleteBusiness &&
                                          (deletingBizId === biz.id ? (
                                            <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg text-xs">
                                              <span className="font-semibold text-red-800">
                                                Xác nhận xóa?
                                              </span>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  await onDeleteBusiness(biz.id);
                                                  setDeletingBizId(null);
                                                }}
                                                className="px-2 py-0.5 bg-red-600 text-white font-bold rounded hover:bg-red-700 cursor-pointer"
                                              >
                                                Xóa
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setDeletingBizId(null)}
                                                className="px-2 py-0.5 bg-white text-slate-600 border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                                              >
                                                Hủy
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setDeletingBizId(biz.id)}
                                              className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                              title="Xóa doanh nghiệp khỏi danh bạ"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Xóa DN</span>
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => toggleBizDetails(biz.id)}
                                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                      Thu gọn
                                    </button>

                                    <a
                                      href={`mailto:${biz.contactEmail}?subject=${encodeURIComponent(
                                        `[ALUMNI KTD] Kết nối hợp tác doanh nghiệp cùng ${biz.companyName}`
                                      )}`}
                                      className="px-4 py-1.5 bg-[#9E1B20] text-white text-xs font-semibold rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                      <span>Gửi thư kết nối hợp tác</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Hiển thị {(safeCurrentPage - 1) * PAGE_SIZE + 1} -{' '}
                  {Math.min(safeCurrentPage * PAGE_SIZE, filteredBusinesses.length)} trên tổng số{' '}
                  <strong className="text-slate-800 font-semibold">{filteredBusinesses.length}</strong>{' '}
                  doanh nghiệp
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-700 transition-colors"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-8 h-8 px-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        safeCurrentPage === page
                          ? 'bg-[#9E1B20] text-white border-[#9E1B20]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-700 transition-colors"
                    title="Trang sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Business Logo Cropper Modal */}
      <ImageCropperModal
        isOpen={showLogoCropper}
        onClose={() => setShowLogoCropper(false)}
        title="Tùy chỉnh & Cắt Logo Doanh nghiệp"
        description="Lựa chọn tỷ lệ hiển thị (1:1, 3:4, 4:3, 16:9, tự do), kéo di chuyển vị trí, zoom và xoay góc. Hệ thống tự động nén tối ưu dung lượng WebP/JPEG."
        mode="business_logo"
        initialImage={formData.logoUrl}
        initialAspectRatio={formData.logoAspectRatio || '4:3'}
        onSave={(result, aspect) => {
          setFormData((prev) => ({
            ...prev,
            logoUrl: result.dataUrl,
            logoAspectRatio: aspect,
          }));
        }}
      />

      {/* Direct Zalo Connect Modal for Business Representatives */}
      <ZaloConnectModal
        isOpen={Boolean(zaloModalMember)}
        onClose={() => setZaloModalMember(null)}
        member={zaloModalMember}
      />
    </div>
  );
};
