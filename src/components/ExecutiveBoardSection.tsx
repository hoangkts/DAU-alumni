import React, { useState, useMemo } from 'react';
import {
  Mail,
  Phone,
  Search,
  Plus,
  X,
  Copy,
  Check,
  Compass,
  Pencil,
  Trash2,
  Shield,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  Pin,
} from 'lucide-react';
import {
  ExecutiveRecord,
  FACULTY_MAJORS_LIST,
  MemberProfileRecord,
} from '../data/constants';
import { filterExecutives, getMajorsByFaculty } from '../utils/alumniLogic';
import { AvatarIllustration } from './AvatarIllustration';

interface ExecutiveBoardSectionProps {
  executives: ExecutiveRecord[];
  members?: MemberProfileRecord[];
  isAdmin: boolean;
  onAddExecutive: (exec: Omit<ExecutiveRecord, 'id'>) => Promise<void>;
  onUpdateExecutive?: (exec: ExecutiveRecord) => Promise<void>;
  onDeleteExecutive?: (id: string) => Promise<void>;
  pinnedExecutiveIds?: string[];
  onTogglePinExecutive?: (execId: string) => void;
}

const AVATAR_OPTIONS = [
  { key: 'president', label: 'Chân dung 1 (Trưởng ban)' },
  { key: 'vice_president_1', label: 'Chân dung 2 (Phó Trưởng ban 1)' },
  { key: 'vice_president_2', label: 'Chân dung 3 (Phó Trưởng ban 2)' },
  { key: 'secretary', label: 'Chân dung 4 (Thư ký / Nữ)' },
  { key: 'member_construction', label: 'Chân dung 5 (Kỹ sư Xây dựng)' },
  { key: 'member_interior', label: 'Chân dung 6 (Kiến trúc / Nội thất)' },
  { key: 'member_it', label: 'Chân dung 7 (Công nghệ / Trẻ)' },
];

export const ExecutiveBoardSection: React.FC<ExecutiveBoardSectionProps> = ({
  executives,
  members = [],
  isAdmin,
  onAddExecutive,
  onUpdateExecutive,
  onDeleteExecutive,
  pinnedExecutiveIds = [],
  onTogglePinExecutive,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExec, setEditingExec] = useState<ExecutiveRecord | null>(null);
  const [deletingExecId, setDeletingExecId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Phone lookup states for adding new executive from registered members
  const [searchPhone, setSearchPhone] = useState('');
  const [foundMember, setFoundMember] = useState<MemberProfileRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('Ủy viên Ban Điều hành');
  const [selectedAvatar, setSelectedAvatar] = useState('president');
  const [customWorkPosition, setCustomWorkPosition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [execToastMsg, setExecToastMsg] = useState<string | null>(null);

  const filteredExecutives = useMemo(
    () => filterExecutives(executives, searchQuery, facultyFilter),
    [executives, searchQuery, facultyFilter]
  );

  const normalizePhone = (p?: string): string => {
    if (!p) return '';
    const clean = p.replace(/[\s.\-()]/g, '');
    if (clean.startsWith('+84')) return '0' + clean.slice(3);
    return clean;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handlePhoneSearch = (phoneToSearch?: string) => {
    const rawQuery = (phoneToSearch !== undefined ? phoneToSearch : searchPhone).trim();
    setLookupError(null);
    setFormError(null);

    if (!rawQuery) {
      setFoundMember(null);
      setLookupError('Vui lòng nhập số điện thoại thành viên để tìm kiếm.');
      return;
    }

    const cleanInput = normalizePhone(rawQuery);

    // Find in system members list
    const matched = members.find((m) => {
      if (!m.zaloPhone) return false;
      const cleanMemberPhone = normalizePhone(m.zaloPhone);
      return (
        cleanMemberPhone === cleanInput ||
        (cleanInput.length >= 4 && cleanMemberPhone.endsWith(cleanInput))
      );
    });

    if (matched) {
      setFoundMember(matched);
      setCustomWorkPosition(
        matched.workplace.includes('–')
          ? matched.workplace.split('–')[1]?.trim() || 'Ủy viên'
          : 'Ủy viên Chuyên môn'
      );
      setLookupError(null);
    } else {
      setFoundMember(null);
      setLookupError(
        `Không tìm thấy cựu sinh viên có số điện thoại "${rawQuery}" trong hệ thống. Bắt buộc thành viên phải đã đăng ký tài khoản và cập nhật hồ sơ trên Mạng lưới ALUMNI KTD trước khi được chỉ định vào Ban Điều hành.`
      );
    }
  };

  const handleAddMemberToBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundMember) {
      setFormError('Vui lòng tìm và chọn một thành viên từ hệ thống.');
      return;
    }

    if (!customWorkPosition.trim()) {
      setFormError('Vui lòng nhập chức vụ cụ thể của thành viên.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const newExecRecord: Omit<ExecutiveRecord, 'id'> = {
        fullName: foundMember.fullName,
        boardRole: selectedRole,
        phone: foundMember.zaloPhone || searchPhone,
        faculty: foundMember.faculty,
        major: foundMember.major,
        graduationYear: foundMember.graduationYear || foundMember.enrollmentYear || '2015',
        email: foundMember.email,
        workplace: foundMember.workplace || 'Trường Đại học Kiến trúc Đà Nẵng',
        workPosition: customWorkPosition.trim(),
        avatarKey: selectedAvatar,
      };

      await onAddExecutive(newExecRecord);
      setExecToastMsg(`Đã bổ sung thành viên "${foundMember.fullName}" vào Ban Điều hành thành công!`);
      setTimeout(() => setExecToastMsg(null), 5000);

      // Reset modal state
      setShowAddModal(false);
      setSearchPhone('');
      setFoundMember(null);
      setLookupError(null);
      setCustomWorkPosition('');
      setSelectedRole('Ủy viên Ban Điều hành');
    } catch (err: any) {
      console.error('Error adding executive member:', err);
      setFormError(err?.message || 'Có lỗi xảy ra khi lưu nhân sự Ban Điều hành.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExec) return;
    if (
      !editingExec.fullName.trim() ||
      !editingExec.phone.trim() ||
      !editingExec.email.trim() ||
      !editingExec.workplace.trim() ||
      !editingExec.workPosition.trim()
    ) {
      setFormError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      if (onUpdateExecutive) {
        await onUpdateExecutive(editingExec);
      }
      setExecToastMsg(`Đã cập nhật thông tin thành viên "${editingExec.fullName}" thành công!`);
      setTimeout(() => setExecToastMsg(null), 5000);
      setEditingExec(null);
    } catch (err: any) {
      console.error('Error updating executive member:', err);
      setFormError(err?.message || 'Có lỗi xảy ra khi cập nhật thông tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingExecId || !onDeleteExecutive) return;
    setIsSubmitting(true);
    try {
      await onDeleteExecutive(deletingExecId);
      setExecToastMsg('Đã xóa nhân sự khỏi Ban Điều hành thành công!');
      setTimeout(() => setExecToastMsg(null), 5000);
      setDeletingExecId(null);
    } catch (err: any) {
      console.error('Error deleting executive member:', err);
      alert(err?.message || 'Có lỗi xảy ra khi xóa nhân sự khỏi Ban Điều hành.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick suggestions of system members not yet in executive board
  const systemMemberSuggestions = members
    .filter((m) => Boolean(m.zaloPhone))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Architectural Crimson Hero & Filter Controls */}
      <section className="dau-crimson-hero rounded-2xl p-6 sm:p-8 lg:p-10 text-white shadow-lg space-y-6">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-200 flex items-center gap-2">
              <Compass className="w-4 h-4" />
              <span>02. CƠ CẤU TỔ CHỨC · NHIỆM KỲ 2025 – 2030</span>
            </p>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Ban Điều hành Mạng lưới ALUMNI KTD
            </h1>
            <p className="text-sm sm:text-base text-red-100/95 max-w-2xl leading-relaxed">
              Các cá nhân tiêu biểu đại diện cho các thế hệ cựu sinh viên 8 Khoa chuyên ngành,
              điều phối kết nối hội viên, phát triển cộng đồng doanh nghiệp và quỹ học bổng sinh viên DAU.
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setLookupError(null);
                setFoundMember(null);
                setSearchPhone('');
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 bg-white text-[#9E1B20] text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Thành viên Ban Điều hành</span>
            </button>
          )}
        </div>

        {/* Search & Faculty Filter Bar inside Pure White Floating Dock */}
        <div className="relative z-10 bg-white text-[#0F172A] rounded-xl p-4 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Tìm kiếm thành viên Ban Điều hành"
              placeholder="Tìm nhanh theo Họ tên, Số điện thoại, Email, Đơn vị công tác, Chức vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <label htmlFor="exec-faculty-filter" className="text-sm font-semibold text-slate-600">
              Khoa đào tạo:
            </label>
            <select
              id="exec-faculty-filter"
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="px-3.5 py-2 text-sm font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            >
              <option value="ALL">Tất cả 8 Khoa ({executives.length})</option>
              {FACULTY_MAJORS_LIST.map((f) => (
                <option key={f.faculty} value={f.faculty}>
                  {f.faculty}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Exec Toast Banner */}
      {execToastMsg && (
        <div
          role="status"
          className="bg-emerald-50 border-l-4 border-emerald-600 rounded-r-xl p-4 shadow-sm flex items-center justify-between gap-4 animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-bold text-emerald-900">{execToastMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setExecToastMsg(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline shrink-0"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Visual Executive Dossier Cards Grid */}
      {filteredExecutives.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <p className="text-sm font-semibold text-slate-700">
            Không tìm thấy thành viên Ban Điều hành khớp với từ khóa tìm kiếm.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFacultyFilter('ALL');
            }}
            className="px-4 py-2 text-sm font-semibold text-[#9E1B20] hover:underline cursor-pointer"
          >
            Hiển thị toàn bộ Ban Điều hành
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExecutives.map((exec, index) => (
            <article
              key={exec.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between dau-card-hover group relative"
            >
              {/* Top Crimson Structural Bar */}
              <div className="h-1.5 w-full bg-[#9E1B20]" aria-hidden="true" />

              <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Unboxed Editorial Role Kicker & Admin Actions */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#9E1B20] uppercase tracking-wider truncate">
                      {index + 1 < 10 ? `0${index + 1}` : index + 1}. {exec.boardRole}
                    </span>
                    <span className="text-slate-500 font-medium tabular-nums shrink-0">
                      Khóa TN {exec.graduationYear}
                    </span>
                  </div>

                  {/* Portrait + Full Name + Academic Line */}
                  <div className="flex items-start gap-4">
                    <AvatarIllustration
                      avatarKey={exec.avatarKey}
                      name={exec.fullName}
                      className="w-16 h-16 group-hover:scale-105 transition-transform shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-[#0F172A] leading-snug group-hover:text-[#9E1B20] transition-colors truncate">
                        {exec.fullName}
                      </h2>
                      <p className="text-sm text-slate-600 font-medium truncate">
                        <span>{exec.faculty}</span>
                        <span aria-hidden="true" className="text-slate-300"> · </span>
                        <span className="text-slate-500">{exec.major}</span>
                      </p>
                    </div>
                  </div>

                  {/* Structured Dossier Specification Table */}
                  <dl className="pt-4 border-t border-slate-200/80 space-y-2 text-xs sm:text-sm">
                    <div className="grid grid-cols-12 gap-2">
                      <dt className="col-span-4 text-slate-500">Khoa / Ngành:</dt>
                      <dd className="col-span-8 text-[#0F172A] font-semibold truncate">
                        {exec.faculty} — {exec.major}
                      </dd>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <dt className="col-span-4 text-slate-500">Năm tốt nghiệp:</dt>
                      <dd className="col-span-8 text-[#9E1B20] font-semibold tabular-nums">
                        {exec.graduationYear}
                      </dd>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <dt className="col-span-4 text-slate-500">Đơn vị công tác:</dt>
                      <dd className="col-span-8 text-[#0F172A] font-semibold break-words">
                        {exec.workplace}
                      </dd>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <dt className="col-span-4 text-slate-500">Chức vụ cụ thể:</dt>
                      <dd className="col-span-8 text-slate-800 font-medium truncate">
                        {exec.workPosition}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Contact Action & Admin Toolbar Footer */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#9E1B20]" />
                      <span>Số điện thoại:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${exec.phone.replace(/\s+/g, '')}`}
                        className="font-semibold text-[#0F172A] hover:text-[#9E1B20] tabular-nums"
                      >
                        {exec.phone}
                      </a>
                      <button
                        type="button"
                        aria-label="Sao chép số điện thoại"
                        onClick={() => handleCopy(exec.phone, `phone-${exec.id}`)}
                        className="p-1 text-slate-400 hover:text-[#9E1B20] rounded cursor-pointer transition-colors"
                      >
                        {copiedId === `phone-${exec.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                      <Mail className="w-3.5 h-3.5 text-[#9E1B20]" />
                      <span>Email:</span>
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <a
                        href={`mailto:${exec.email}`}
                        className="text-slate-700 hover:text-[#9E1B20] truncate font-medium"
                      >
                        {exec.email}
                      </a>
                      <button
                        type="button"
                        aria-label="Sao chép địa chỉ email"
                        onClick={() => handleCopy(exec.email, `email-${exec.id}`)}
                        className="p-1 text-slate-400 hover:text-[#9E1B20] rounded cursor-pointer transition-colors shrink-0"
                      >
                        {copiedId === `email-${exec.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Pin to Homepage & Admin Direct Configuration Toolbar */}
                  <div className="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between gap-2">
                    {isAdmin && onTogglePinExecutive ? (
                      <button
                        type="button"
                        onClick={() => onTogglePinExecutive(exec.id)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer flex items-center gap-1 ${
                          pinnedExecutiveIds.includes(exec.id)
                            ? 'bg-[#9E1B20] text-white border-[#9E1B20] hover:bg-[#7D1418]'
                            : 'bg-white hover:bg-red-50 text-slate-700 hover:text-[#9E1B20] border-slate-200'
                        }`}
                        title={
                          pinnedExecutiveIds.includes(exec.id)
                            ? 'Bỏ ghim thành viên BĐH này khỏi Trang chủ'
                            : 'Ghim thành viên BĐH này lên Trang chủ'
                        }
                      >
                        <Pin className="w-3 h-3" />
                        <span>
                          {pinnedExecutiveIds.includes(exec.id)
                            ? 'Đã ghim Trang chủ'
                            : 'Ghim Trang chủ'}
                        </span>
                      </button>
                    ) : (
                      <span />
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(null);
                            setEditingExec({ ...exec });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                          title="Chỉnh sửa thông tin thành viên BĐH"
                        >
                          <Pencil className="w-3 h-3 text-[#9E1B20]" />
                          <span>Sửa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingExecId(exec.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                          title="Xóa thành viên khỏi BĐH"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Admin Modal to Add Executive Member VIA PHONE NUMBER LOOKUP */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-exec-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-6 bg-[#9E1B20] rounded-xs" />
                <div>
                  <h2 id="add-exec-modal-title" className="text-lg font-bold text-[#0F172A]">
                    Thêm Thành viên vào Ban Điều hành
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chỉ định thành viên hệ thống vào Ban Điều hành bằng số điện thoại đăng ký
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setFoundMember(null);
                  setSearchPhone('');
                  setLookupError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Requirement Notice */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p>
                <strong>Quy định bảo mật & định danh:</strong> Thành viên được thêm vào Ban Điều hành <em>bắt buộc phải là thành viên đã có hồ sơ trong hệ thống</em>. Admin chỉ cần nhập số điện thoại để hệ thống tự động tìm và trích xuất hồ sơ định danh.
              </p>
            </div>

            {/* Step 1: Phone Search Field */}
            <div className="space-y-2">
              <label htmlFor="lookup-phone-input" className="block text-sm font-bold text-[#0F172A]">
                Nhập số điện thoại thành viên hệ thống (*)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="lookup-phone-input"
                    type="tel"
                    placeholder="Ví dụ: 0905128689, 0913456210 hoặc 0988712345..."
                    value={searchPhone}
                    onChange={(e) => {
                      setSearchPhone(e.target.value);
                      if (lookupError) setLookupError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePhoneSearch();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handlePhoneSearch()}
                  className="px-4 py-2.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 shrink-0 shadow-xs"
                >
                  <Search className="w-4 h-4" />
                  <span>Tìm thành viên</span>
                </button>
              </div>

              {/* Quick suggestion tags for testing convenience */}
              {systemMemberSuggestions.length > 0 && !foundMember && (
                <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px]">Gợi ý nhanh từ danh bạ:</span>
                  {systemMemberSuggestions.map((m) => (
                    <button
                      key={m.uid}
                      type="button"
                      onClick={() => {
                        setSearchPhone(m.zaloPhone || '');
                        handlePhoneSearch(m.zaloPhone || '');
                      }}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-red-50 hover:text-[#9E1B20] text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
                    >
                      {m.fullName} ({m.zaloPhone})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Error state if not found */}
            {lookupError && (
              <div className="p-3.5 bg-red-50 border-l-4 border-[#9E1B20] rounded-r-xl text-xs text-red-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-[#9E1B20]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Không tìm thấy thành viên</span>
                </div>
                <p className="leading-relaxed">{lookupError}</p>
              </div>
            )}

            {/* Step 2: Found Member Preview & Role Assignment Form */}
            {foundMember && (
              <form onSubmit={handleAddMemberToBoard} className="space-y-4 pt-2 border-t border-slate-200 animate-in fade-in duration-200">
                {/* Verified Member Dossier Card */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đã xác thực thành viên hệ thống ALUMNI KTD</span>
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      UID: {foundMember.uid.slice(0, 12)}...
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg shrink-0">
                      {foundMember.fullName.charAt(0)}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className="text-base font-bold text-[#0F172A]">
                        {foundMember.fullName}
                      </h4>
                      <p className="text-xs text-slate-600">
                        <strong className="text-slate-800">{foundMember.faculty}</strong> · {foundMember.major}
                      </p>
                      <p className="text-xs text-slate-500">
                        Lớp: <span className="font-semibold text-[#9E1B20]">{foundMember.className}</span> · Khóa TN: {foundMember.graduationYear || foundMember.enrollmentYear}
                      </p>
                      <p className="text-xs text-slate-700">
                        Đơn vị công tác: <span className="font-medium">{foundMember.workplace}</span> ({foundMember.workplaceProvince})
                      </p>
                    </div>
                  </div>

                  {/* Warning if already in Executive Board */}
                  {executives.some(
                    (e) =>
                      normalizePhone(e.phone) === normalizePhone(foundMember.zaloPhone) ||
                      e.fullName.toLowerCase() === foundMember.fullName.toLowerCase()
                  ) && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Lưu ý: Thành viên này hiện đã có tên trong Ban Điều hành. Bạn vẫn có thể cập nhật thêm vị trí mới nếu cần.</span>
                    </div>
                  )}
                </div>

                {/* Role and Avatar Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Chức vụ chỉ định trong Ban Điều hành (*)
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    >
                      <option value="Trưởng Ban Điều hành ALUMNI KTD">Trưởng Ban Điều hành ALUMNI KTD</option>
                      <option value="Phó Trưởng ban Thường trực">Phó Trưởng ban Thường trực</option>
                      <option value="Phó Trưởng ban Điều hành">Phó Trưởng ban Điều hành</option>
                      <option value="Trưởng Ban Thư ký & Đối ngoại">Trưởng Ban Thư ký & Đối ngoại</option>
                      <option value="Trưởng Ban Doanh nghiệp & Việc làm">Trưởng Ban Doanh nghiệp & Việc làm</option>
                      <option value="Trưởng Ban Truyền thông & Sự kiện">Trưởng Ban Truyền thông & Sự kiện</option>
                      <option value="Ủy viên Ban Điều hành">Ủy viên Ban Điều hành</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Chức vụ chuyên môn công tác (*)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Giám đốc, Tổng Giám đốc, Trưởng phòng..."
                      value={customWorkPosition}
                      onChange={(e) => setCustomWorkPosition(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Hình đại diện minh họa (Avatar)
                    </label>
                    <select
                      value={selectedAvatar}
                      onChange={(e) => setSelectedAvatar(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    >
                      {AVATAR_OPTIONS.map((av) => (
                        <option key={av.key} value={av.key}>
                          {av.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-[#9E1B20] font-semibold">{formError}</p>
                )}

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFoundMember(null);
                      setSearchPhone('');
                    }}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Tìm số khác
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-lg cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{isSubmitting ? 'Đang thêm...' : 'Xác nhận Thêm vào Ban Điều hành'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin Modal to Edit Existing Executive Member */}
      {editingExec && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-exec-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-6 bg-[#9E1B20] rounded-xs" />
                <h2 id="edit-exec-modal-title" className="text-lg font-bold text-[#0F172A]">
                  Chỉnh sửa Thông tin Thành viên Ban Điều hành
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingExec(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-[#9E1B20]">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Họ và tên thành viên (*)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingExec.fullName}
                    onChange={(e) =>
                      setEditingExec((prev) =>
                        prev ? { ...prev, fullName: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Chức vụ trong Ban Điều hành (*)
                  </label>
                  <select
                    value={editingExec.boardRole}
                    onChange={(e) =>
                      setEditingExec((prev) =>
                        prev ? { ...prev, boardRole: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  >
                    <option value="Trưởng Ban Điều hành ALUMNI KTD">Trưởng Ban Điều hành ALUMNI KTD</option>
                    <option value="Phó Trưởng ban Thường trực">Phó Trưởng ban Thường trực</option>
                    <option value="Phó Trưởng ban Điều hành">Phó Trưởng ban Điều hành</option>
                    <option value="Trưởng Ban Thư ký & Đối ngoại">Trưởng Ban Thư ký & Đối ngoại</option>
                    <option value="Trưởng Ban Doanh nghiệp & Việc làm">Trưởng Ban Doanh nghiệp & Việc làm</option>
                    <option value="Trưởng Ban Truyền thông & Sự kiện">Trưởng Ban Truyền thông & Sự kiện</option>
                    <option value="Ủy viên Ban Điều hành">Ủy viên Ban Điều hành</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Hình đại diện (Avatar)
                  </label>
                  <select
                    value={editingExec.avatarKey}
                    onChange={(e) =>
                      setEditingExec((prev) =>
                        prev ? { ...prev, avatarKey: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  >
                    {AVATAR_OPTIONS.map((av) => (
                      <option key={av.key} value={av.key}>
                        {av.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Số điện thoại liên hệ (*)
                  </label>
                  <input
                    type="tel"
                    required
                    value={editingExec.phone}
                    onChange={(e) =>
                      setEditingExec((prev) =>
                        prev ? { ...prev, phone: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Email liên hệ (*)
                  </label>
                  <input
                    type="email"
                    required
                    value={editingExec.email}
                    onChange={(e) =>
                      setEditingExec((prev) =>
                        prev ? { ...prev, email: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Khoa đào tạo (*)
                  </label>
                  <select
                    value={editingExec.faculty}
                    onChange={(e) => {
                      const f = e.target.value;
                      const majors = getMajorsByFaculty(f);
                      setEditingExec((prev) =>
                        prev
                          ? {
                              ...prev,
                              faculty: f,
                              major: majors[0] || '',
                            }
                          : null
                      );
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  >
                    {FACULTY_MAJORS_LIST.map((f) => (
                      <option key={f.faculty} value={f.faculty}>
                        {f.faculty}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Ngành đào tạo (*)
                  </label>
                  <select
                    value={editingExec.major}
                    onChange={(e) =>
                      setEditingExec((prev) =>
                        prev ? { ...prev, major: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  >
                    {getMajorsByFaculty(editingExec.faculty).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Năm tốt nghiệp (*)
                  </label>
                  <input
                    type="number"
                    min="2004"
                    max="2035"
                    required
                    value={editingExec.graduationYear}
                    onChange={(e) =>
                      setEditingExec((prev) =>
                        prev ? { ...prev, graduationYear: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Chức vụ chuyên môn (*)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingExec.workPosition}
                    onChange={(e) =>
                      setEditingExec((prev) =>
                        prev ? { ...prev, workPosition: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Đơn vị công tác (*)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingExec.workplace}
                    onChange={(e) =>
                      setEditingExec((prev) =>
                        prev ? { ...prev, workplace: e.target.value } : null
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingExec(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExecId && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#9E1B20] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-[#0F172A]">
                Xác nhận Xóa Thành viên?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa thành viên này khỏi danh sách Ban Điều hành Mạng lưới ALUMNI KTD? Hành động này không thể hoàn tác.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingExecId(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Đang xóa...' : 'Xác nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
