import React, { useState } from 'react';
import {
  Shield,
  Key,
  Eye,
  EyeOff,
  Mail,
  Send,
  ExternalLink,
  CheckCircle2,
  MailCheck,
  Bell,
  LogOut,
  Users,
  Compass,
  Search,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  Plus,
  X,
  AlertTriangle,
  Building2,
  GraduationCap,
  Briefcase,
  Layers,
  UserCheck,
  RotateCcw,
  Calendar,
  Ticket,
  FileSpreadsheet,
  UserX,
  LayoutDashboard,
  SlidersHorizontal,
  ArrowRight,
  Lock,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  AdminNotificationConfig,
  EmailNotificationRecord,
  EventRecord,
  EventRegistrationRecord,
  EventShirtOrder,
  ExecutiveRecord,
  FACULTY_MAJORS_LIST,
  MemberProfileRecord,
} from '../data/constants';
import {
  buildGmailComposeUrl,
  buildZaloChatUrl,
  buildZaloDeepLink,
  getMajorsByFaculty,
  maskPhoneKeepLast4,
} from '../utils/alumniLogic';
import {
  buildEnrichedAttendeeList,
  exportEventRegistrationsToExcel,
} from '../utils/excelExporter';
import { AvatarIllustration } from './AvatarIllustration';
import { ZaloConnectModal, ZaloMemberInfo } from './ZaloConnectModal';
import { EventStatsDashboard, hasMultiChoiceEventForm } from './EventStatsDashboard';
import {
  AttendeeSmartFilterState,
  DEFAULT_ATTENDEE_SMART_FILTER,
  EventAttendeeSmartFilterBar,
  filterAndSortAttendees,
} from './EventAttendeeSmartFilter';

interface AdminPortalSectionProps {
  currentUser: {
    uid: string;
    email: string;
    displayName: string;
    isAdmin: boolean;
    adminRole?: 'admin1' | 'admin2';
    canConfirmBtc?: boolean;
    authMode: 'password' | 'google' | 'demo';
  } | null;
  members: MemberProfileRecord[];
  emails: EmailNotificationRecord[];
  adminConfig: AdminNotificationConfig;
  executives?: ExecutiveRecord[];
  events?: EventRecord[];
  allEventRegistrations?: Record<string, EventRegistrationRecord[]>;
  userRegistrations?: Record<string, EventRegistrationRecord>;
  onResetEventRegistrations?: (eventId: string) => Promise<boolean>;
  onDeleteSingleRegistration?: (eventId: string, targetUid: string) => Promise<boolean>;
  onAdminUpdateRegistration?: (
    eventId: string,
    targetUid: string,
    updates: {
      attendGala?: boolean;
      shirtOrders?: EventShirtOrder[];
      totalFee?: number;
      paymentStatus?: 'pending' | 'completed';
      btcConfirmed?: boolean;
      note?: string;
    }
  ) => Promise<boolean | void>;
  onNavigateToEvents?: () => void;
  onUpdateAdminConfig: (updated: Partial<AdminNotificationConfig>) => void;
  onAdminLogin: (
    email: string,
    pass: string
  ) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onLogout: () => Promise<void>;
  onSendBoardNotification: (params: {
    targetMemberUid: string | 'ALL';
    subject: string;
    message: string;
  }) => Promise<EmailNotificationRecord[]>;
  onSendWelcomeEmail: (profile: MemberProfileRecord) => Promise<EmailNotificationRecord>;
  onSendConfirmationEmail: (profile: MemberProfileRecord) => Promise<EmailNotificationRecord>;
  onOpenEmailOutbox: () => void;
  onAddExecutive?: (exec: Omit<ExecutiveRecord, 'id'>) => Promise<void>;
  onUpdateExecutive?: (exec: ExecutiveRecord) => Promise<void>;
  onDeleteExecutive?: (id: string) => Promise<void>;
  onDeleteMember?: (uid: string) => Promise<void>;
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

export const AdminPortalSection: React.FC<AdminPortalSectionProps> = ({
  currentUser,
  members,
  emails,
  adminConfig,
  executives = [],
  events = [],
  allEventRegistrations = {},
  userRegistrations = {},
  onResetEventRegistrations,
  onDeleteSingleRegistration,
  onAdminUpdateRegistration,
  onNavigateToEvents,
  onUpdateAdminConfig,
  onAdminLogin,
  onLogout,
  onSendBoardNotification,
  onSendWelcomeEmail,
  onSendConfirmationEmail,
  onOpenEmailOutbox,
  onAddExecutive,
  onUpdateExecutive,
  onDeleteExecutive,
  onDeleteMember,
}) => {
  // Login form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active admin sub-tab: 5 scientific modules
  const [activeAdminTab, setActiveAdminTab] = useState<
    'dashboard' | 'events' | 'members' | 'executives' | 'communications'
  >('dashboard');

  // Communications sub-tab state (Broadcast vs Auto-email templates vs Outbox)
  const [commsSubTab, setCommsSubTab] = useState<'broadcast' | 'templates' | 'outbox'>('broadcast');

  // Event Registration Management & Reset State
  const [resettingEvent, setResettingEvent] = useState<EventRecord | null>(null);
  const [isResettingEvent, setIsResettingEvent] = useState(false);
  const ADMIN_PAGE_SIZE = 20;
  const [adminViewingEventAttendees, setAdminViewingEventAttendees] = useState<EventRecord | null>(null);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
  const [adminSmartFilter, setAdminSmartFilter] = useState<AttendeeSmartFilterState>(
    DEFAULT_ATTENDEE_SMART_FILTER
  );
  const [adminAttendeePage, setAdminAttendeePage] = useState(1);
  const [adminMemberPage, setAdminMemberPage] = useState(1);
  const [isExportingExcelId, setIsExportingExcelId] = useState<string | null>(null);
  const [deletingAttendeeUid, setDeletingAttendeeUid] = useState<string | null>(null);
  const [togglingBtcUid, setTogglingBtcUid] = useState<string | null>(null);
  const [adminEditingAttendeeUid, setAdminEditingAttendeeUid] = useState<string | null>(null);
  const [adminEditingAttendeeName, setAdminEditingAttendeeName] = useState('');
  const [adminEditAttendGala, setAdminEditAttendGala] = useState(true);
  const [adminEditShirtOrders, setAdminEditShirtOrders] = useState<EventShirtOrder[]>([]);
  const [adminEditPaymentStatus, setAdminEditPaymentStatus] = useState<'pending' | 'completed'>('pending');
  const [isSavingAdminAttendeeEdit, setIsSavingAdminAttendeeEdit] = useState(false);
  const [showAdmin2AuthModal, setShowAdmin2AuthModal] = useState(false);
  const [admin2Username, setAdmin2Username] = useState('');
  const [admin2Password, setAdmin2Password] = useState('');
  const [admin2Error, setAdmin2Error] = useState<string | null>(null);
  const [isAdmin2Submitting, setIsAdmin2Submitting] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');

  const canConfirmBtc = Boolean(
    currentUser?.canConfirmBtc ||
    currentUser?.adminRole === 'admin2'
  );

  // Executive Management State
  const [adminExecSearch, setAdminExecSearch] = useState('');
  const [showAddExecModal, setShowAddExecModal] = useState(false);
  const [editingExec, setEditingExec] = useState<ExecutiveRecord | null>(null);
  const [deletingExecId, setDeletingExecId] = useState<string | null>(null);
  const [execFormError, setExecFormError] = useState<string | null>(null);
  const [isExecSubmitting, setIsExecSubmitting] = useState(false);
  const [deletingMember, setDeletingMember] = useState<MemberProfileRecord | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

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

  // Phone lookup states for adding new executive from registered members
  const [searchExecPhone, setSearchExecPhone] = useState('');
  const [foundExecMember, setFoundExecMember] = useState<MemberProfileRecord | null>(null);
  const [lookupExecError, setLookupExecError] = useState<string | null>(null);
  const [selectedExecRole, setSelectedExecRole] = useState('Ủy viên Ban Điều hành');
  const [selectedExecAvatar, setSelectedExecAvatar] = useState('president');
  const [customExecWorkPosition, setCustomExecWorkPosition] = useState('');

  // Email dispatch state
  const [selectedMemberUid, setSelectedMemberUid] = useState<string | 'ALL'>('ALL');
  const [boardSubject, setBoardSubject] = useState(
    '[Ban Điều hành ALUMNI KTD] Thông báo kết nối cựu sinh viên'
  );
  const [boardMessage, setBoardMessage] = useState(
    'Kính gửi anh/chị cựu sinh viên Trường Đại học Kiến trúc Đà Nẵng,\n\nBan Điều hành Mạng lưới ALUMNI KTD gửi lời chúc sức khỏe và thành công. Ban Điều hành trân trọng thông báo các chương trình hoạt động kết nối hội viên và cơ hội giao thương trong giai đoạn mới.'
  );
  const [isSendingBoard, setIsSendingBoard] = useState(false);
  const [boardSendStatus, setBoardSendStatus] = useState<string | null>(null);

  // Manual actions state
  const [manualStatus, setManualStatus] = useState<string | null>(null);
  const [isSendingManual, setIsSendingManual] = useState(false);

  // Member directory quick search
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  const selectedMember =
    selectedMemberUid === 'ALL'
      ? null
      : members.find((m) => m.uid === selectedMemberUid) || null;

  const normalizePhone = (p?: string): string => {
    if (!p) return '';
    const clean = p.replace(/[\s.\-()]/g, '');
    if (clean.startsWith('+84')) return '0' + clean.slice(3);
    return clean;
  };

  const handleAdminFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await onAdminLogin(adminEmail.trim(), adminPassword);
      if (!res.success) {
        setLoginError(res.error || 'Thông tin đăng nhập không hợp lệ.');
      } else {
        setAdminPassword('');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Có lỗi xảy ra khi đăng nhập quản trị viên.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleExecPhoneSearch = (phoneToSearch?: string) => {
    const rawQuery = (phoneToSearch !== undefined ? phoneToSearch : searchExecPhone).trim();
    setLookupExecError(null);
    setExecFormError(null);

    if (!rawQuery) {
      setFoundExecMember(null);
      setLookupExecError('Vui lòng nhập số điện thoại thành viên để tìm kiếm.');
      return;
    }

    const cleanInput = normalizePhone(rawQuery);

    const matched = members.find((m) => {
      if (!m.zaloPhone) return false;
      const cleanMemberPhone = normalizePhone(m.zaloPhone);
      return (
        cleanMemberPhone === cleanInput ||
        (cleanInput.length >= 4 && cleanMemberPhone.endsWith(cleanInput))
      );
    });

    if (matched) {
      setFoundExecMember(matched);
      setCustomExecWorkPosition(
        matched.workplace.includes('–')
          ? matched.workplace.split('–')[1]?.trim() || 'Ủy viên'
          : 'Ủy viên Chuyên môn'
      );
      setLookupExecError(null);
    } else {
      setFoundExecMember(null);
      setLookupExecError(
        `Không tìm thấy cựu sinh viên có số điện thoại "${rawQuery}" trong hệ thống. Bắt buộc thành viên phải đã đăng ký tài khoản và cập nhật hồ sơ trên Mạng lưới ALUMNI KTD trước khi được chỉ định vào Ban Điều hành.`
      );
    }
  };

  const handleCreateExec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundExecMember) {
      setExecFormError('Vui lòng tìm và chọn một thành viên từ hệ thống.');
      return;
    }

    if (!customExecWorkPosition.trim()) {
      setExecFormError('Vui lòng nhập chức vụ cụ thể của thành viên.');
      return;
    }

    setExecFormError(null);
    setIsExecSubmitting(true);
    try {
      if (onAddExecutive) {
        await onAddExecutive({
          fullName: foundExecMember.fullName,
          boardRole: selectedExecRole,
          phone: foundExecMember.zaloPhone || searchExecPhone,
          faculty: foundExecMember.faculty,
          major: foundExecMember.major,
          graduationYear: foundExecMember.graduationYear || foundExecMember.enrollmentYear || '2015',
          email: foundExecMember.email,
          workplace: foundExecMember.workplace || 'Trường Đại học Kiến trúc Đà Nẵng',
          workPosition: customExecWorkPosition.trim(),
          avatarKey: selectedExecAvatar,
        });
      }
      setShowAddExecModal(false);
      setSearchExecPhone('');
      setFoundExecMember(null);
      setLookupExecError(null);
      setCustomExecWorkPosition('');
      setSelectedExecRole('Ủy viên Ban Điều hành');
    } finally {
      setIsExecSubmitting(false);
    }
  };

  const handleSaveEditExec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExec) return;
    if (
      !editingExec.fullName.trim() ||
      !editingExec.phone.trim() ||
      !editingExec.email.trim() ||
      !editingExec.workplace.trim() ||
      !editingExec.workPosition.trim()
    ) {
      setExecFormError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    setExecFormError(null);
    setIsExecSubmitting(true);
    try {
      if (onUpdateExecutive) {
        await onUpdateExecutive(editingExec);
      }
      setEditingExec(null);
    } finally {
      setIsExecSubmitting(false);
    }
  };

  const handleConfirmDeleteExec = async () => {
    if (!deletingExecId || !onDeleteExecutive) return;
    setIsExecSubmitting(true);
    try {
      await onDeleteExecutive(deletingExecId);
      setDeletingExecId(null);
    } finally {
      setIsExecSubmitting(false);
    }
  };

  const handleConfirmDeleteMember = async () => {
    if (!deletingMember || !onDeleteMember) return;
    setIsDeletingMember(true);
    try {
      const targetName = deletingMember.fullName;
      await onDeleteMember(deletingMember.uid);
      setDeletingMember(null);
      setManualStatus(`Đã xóa hồ sơ thành viên "${targetName}" khỏi hệ thống thành công!`);
    } catch (err: any) {
      console.error('Error deleting member:', err);
      const rawMsg = err?.message || '';
      const displayMsg = rawMsg.includes('insufficient permissions') || rawMsg.includes('Missing or insufficient') || rawMsg.includes('403')
        ? 'Bạn không có đủ quyền RBAC trên máy chủ PostgreSQL để xóa thành viên này. Vui lòng liên hệ quản trị viên.'
        : (rawMsg.startsWith('{') ? 'Có lỗi xảy ra khi thực hiện thao tác xóa.' : (rawMsg || 'Có lỗi xảy ra khi xóa thành viên.'));
      alert(displayMsg);
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleConfirmResetEvent = async () => {
    if (!resettingEvent || !onResetEventRegistrations) return;
    setIsResettingEvent(true);
    try {
      const eventTitle = resettingEvent.title;
      const success = await onResetEventRegistrations(resettingEvent.id);
      if (success) {
        setManualStatus(`Đã reset toàn bộ dữ liệu đăng ký của sự kiện "${eventTitle}" thành công! Số lượng đại biểu đã được đưa về 0.`);
        setResettingEvent(null);
        if (adminViewingEventAttendees?.id === resettingEvent.id) {
          setAdminViewingEventAttendees(null);
        }
      } else {
        alert('Không thể thực hiện reset đăng ký sự kiện. Vui lòng kiểm tra quyền hạn.');
      }
    } catch (err: any) {
      console.error('Error resetting event registrations:', err);
      alert('Có lỗi xảy ra khi reset đăng ký: ' + (err?.message || ''));
    } finally {
      setIsResettingEvent(false);
    }
  };

  const handleDeleteAttendee = async (eventId: string, uid: string, name: string) => {
    if (!onDeleteSingleRegistration) return;
    if (!window.confirm(`Bạn có chắc chắn muốn hủy / xóa lượt đăng ký của đại biểu "${name}" khỏi sự kiện này?`)) {
      return;
    }
    setDeletingAttendeeUid(uid);
    try {
      await onDeleteSingleRegistration(eventId, uid);
      setManualStatus(`Đã xóa lượt đăng ký của đại biểu "${name}" thành công.`);
    } catch (err: any) {
      console.error('Error deleting single registration:', err);
      alert('Có lỗi xảy ra: ' + (err?.message || ''));
    } finally {
      setDeletingAttendeeUid(null);
    }
  };

  const handleToggleBtcConfirmedInAdmin = async (
    eventId: string,
    targetUid: string,
    fullName: string,
    currentVal: boolean
  ) => {
    if (!canConfirmBtc) {
      setShowAdmin2AuthModal(true);
      setAdmin2Error('Chỉ tài khoản Admin 2 mới có quyền xác nhận BTC.');
      return;
    }
    if (!onAdminUpdateRegistration) return;
    setTogglingBtcUid(targetUid);
    try {
      const nextVal = !currentVal;
      const ok = await onAdminUpdateRegistration(eventId, targetUid, {
        btcConfirmed: nextVal,
      });
      if (ok !== false) {
        setManualStatus(
          nextVal
            ? `Đã tích "BTC đã xác nhận" cho đại biểu "${fullName}".`
            : `Đã hủy trạng thái "BTC đã xác nhận" của đại biểu "${fullName}".`
        );
      }
    } finally {
      setTogglingBtcUid(null);
    }
  };

  const handleAdmin2QuickSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdmin2Error(null);
    const username = admin2Username.trim();
    const password = admin2Password.trim();
    if (!username || !password) {
      setAdmin2Error('Vui lòng nhập đầy đủ tài khoản và mật khẩu Admin 2.');
      return;
    }
    setIsAdmin2Submitting(true);
    try {
      const res = await onAdminLogin(username, password);
      if (res.success) {
        setShowAdmin2AuthModal(false);
        setAdmin2Username('');
        setAdmin2Password('');
        setManualStatus('Đã xác thực tài khoản Admin 2 thành công! Bạn có thể tích "BTC đã xác nhận".');
      } else {
        setAdmin2Error(res.error || 'Xác thực không thành công.');
      }
    } catch (err: any) {
      setAdmin2Error(err?.message || 'Xác thực không thành công.');
    } finally {
      setIsAdmin2Submitting(false);
    }
  };

  const handleAdminExportExcel = async (event: EventRecord) => {
    setIsExportingExcelId(event.id);
    try {
      const eventRegs = allEventRegistrations?.[event.id] || [];
      const attendees = buildEnrichedAttendeeList(event, members, userRegistrations || {}, eventRegs);
      await exportEventRegistrationsToExcel(event, attendees);
      setManualStatus(`Đã xuất file Excel đăng ký cho "${event.title}" thành công (${attendees.length} đại biểu)!`);
    } catch (err) {
      console.error('Error exporting registrations to excel:', err);
      alert('Có lỗi xảy ra khi xuất file Excel.');
    } finally {
      setIsExportingExcelId(null);
    }
  };

  const handleSendBoardMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardSubject.trim() || !boardMessage.trim()) return;

    setIsSendingBoard(true);
    setBoardSendStatus(null);
    try {
      const sent = await onSendBoardNotification({
        targetMemberUid: selectedMemberUid,
        subject: boardSubject.trim(),
        message: boardMessage.trim(),
      });
      if (selectedMemberUid === 'ALL') {
        setBoardSendStatus(
          `Ban Điều hành đã gửi thông báo và email đến toàn bộ ${sent.length} thành viên mạng lưới.`
        );
      } else {
        const target = sent[0];
        setBoardSendStatus(
          `Ban Điều hành đã gửi thông báo thành công đến ${target?.recipientName || ''} (${target?.to || ''}).`
        );
      }
    } finally {
      setIsSendingBoard(false);
    }
  };

  const handleManualWelcome = async (member: MemberProfileRecord) => {
    setIsSendingManual(true);
    setManualStatus(null);
    try {
      const sent = await onSendWelcomeEmail(member);
      setManualStatus(
        `Đã gửi Thư Chào mừng chính thức tới ${member.fullName} (${sent.to}) qua Email & Hệ thống.`
      );
    } finally {
      setIsSendingManual(false);
    }
  };

  const handleManualConfirm = async (member: MemberProfileRecord) => {
    setIsSendingManual(true);
    setManualStatus(null);
    try {
      const sent = await onSendConfirmationEmail(member);
      setManualStatus(
        `Đã gửi Thư Xác nhận thông tin hồ sơ tới ${member.fullName} (${sent.to}) qua Email & Hệ thống.`
      );
    } finally {
      setIsSendingManual(false);
    }
  };

  const filteredMembersForAdmin = members.filter((m) => {
    if (!adminSearchQuery.trim()) return true;
    const q = adminSearchQuery.trim().toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.className.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.faculty.toLowerCase().includes(q) ||
      m.workplace.toLowerCase().includes(q) ||
      (m.zaloPhone && m.zaloPhone.toLowerCase().includes(q))
    );
  });

  const totalAdminMemberPages = Math.max(
    1,
    Math.ceil(filteredMembersForAdmin.length / ADMIN_PAGE_SIZE)
  );
  const safeAdminMemberPage = Math.min(adminMemberPage, totalAdminMemberPages);
  const paginatedAdminMembers = filteredMembersForAdmin.slice(
    (safeAdminMemberPage - 1) * ADMIN_PAGE_SIZE,
    safeAdminMemberPage * ADMIN_PAGE_SIZE
  );

  const filteredExecsForAdmin = executives.filter((e) => {
    if (!adminExecSearch.trim()) return true;
    const q = adminExecSearch.trim().toLowerCase();
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.boardRole.toLowerCase().includes(q) ||
      e.faculty.toLowerCase().includes(q) ||
      e.major.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.phone.toLowerCase().includes(q) ||
      e.workplace.toLowerCase().includes(q)
    );
  });

  // ==========================================
  // CASE 1: UN-AUTHENTICATED (SHOW ONLY ADMIN LOGIN)
  // ==========================================
  if (!currentUser?.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-4 sm:py-8">
        {/* Architectural Crimson Security Hero */}
        <div className="dau-crimson-hero rounded-2xl p-8 sm:p-10 text-white shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto text-white shadow-inner">
            <Shield className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-red-200 flex items-center justify-center gap-2">
              <Compass className="w-4 h-4" />
              <span>05. KHU VỰC BẢO MẬT · BAN ĐIỀU HÀNH ALUMNI KTD</span>
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Cổng Quản trị Mạng lưới ALUMNI KTD
            </h1>
            <p className="text-sm sm:text-base text-red-100/90 max-w-lg mx-auto leading-relaxed">
              Trang quản trị chỉ dành riêng cho Ban Giám hiệu và Ban Điều hành Trường Đại học Kiến trúc Đà Nẵng.
              Vui lòng xác thực tài khoản quản trị viên để truy cập.
            </p>
          </div>
        </div>

        {/* Dedicated Admin Login Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="pb-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-6 bg-[#9E1B20] rounded-xs" />
              <h2 className="text-lg font-bold text-[#0F172A]">
                Đăng nhập Tài khoản Quản trị viên
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-[#9E1B20] rounded-md border border-[#9E1B20]/20">
              Yêu cầu bảo mật
            </span>
          </div>

          {loginError && (
            <div
              role="alert"
              className="p-4 bg-[#FEF2F2] border-l-4 border-[#9E1B20] text-[#9E1B20] text-sm font-semibold rounded-r-lg"
            >
              {loginError}
            </div>
          )}

          {/* Security Notice Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 text-xs text-slate-600">
            <Shield className="w-4 h-4 text-[#9E1B20] shrink-0" />
            <span>
              Khu vực dành riêng cho Ban Điều hành được phân quyền. Vui lòng nhập đúng tài khoản và mật mã được cấp.
            </span>
          </div>

          <form onSubmit={handleAdminFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-email-input"
                className="block text-sm font-semibold text-slate-700"
              >
                Tài khoản hoặc Email quản trị viên
              </label>
              <input
                id="admin-email-input"
                type="text"
                required
                placeholder="Nhập email hoặc tên tài khoản quản trị..."
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin-password-input"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Mật mã quản trị
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-xs text-[#9E1B20] hover:underline cursor-pointer flex items-center gap-1"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ẩn</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Hiện mật mã</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Nhập mật mã quản trị..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-[#9E1B20] text-white text-sm font-semibold rounded-lg hover:bg-[#7D1418] active:bg-[#5E0D10] transition-colors cursor-pointer disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>{isLoggingIn ? 'Đang xác thực...' : 'Đăng nhập Quản trị viên'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // CASE 2: AUTHENTICATED ADMIN DASHBOARD
  // ==========================================
  const totalAllRegs = (events || []).reduce((acc, ev) => {
    const list = allEventRegistrations?.[ev.id];
    const count = list !== undefined ? list.length : (ev.registeredCount || 0);
    return acc + count;
  }, 0);

  const filteredEvents = (events || []).filter((ev: EventRecord) => {
    if (!eventSearchQuery.trim()) return true;
    const q = eventSearchQuery.toLowerCase().trim();
    return (
      ev.title.toLowerCase().includes(q) ||
      (ev.venue && ev.venue.toLowerCase().includes(q)) ||
      (ev.province && ev.province.toLowerCase().includes(q)) ||
      ev.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Architectural Crimson Admin Banner */}
      <section className="dau-crimson-hero rounded-2xl p-6 sm:p-8 lg:p-10 text-white shadow-lg space-y-6">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-red-200">
                TRUNG TÂM ĐIỀU HÀNH HỆ THỐNG · QUẢN TRỊ VIÊN ALUMNI KTD
              </p>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Bảng Điều khiển Quản trị Hệ thống
            </h1>
            <p className="text-sm sm:text-base text-red-100/95 max-w-2xl leading-relaxed">
              Cấu hình danh sách Ban Điều hành, phê duyệt hồ sơ cựu sinh viên, gửi email tự động và phát hành thông báo chính thức đến hội viên.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenEmailOutbox}
              className="px-4 py-2.5 bg-white text-[#9E1B20] text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Bell className="w-4 h-4" />
              <span>Hộp thư Hệ thống ({emails.length})</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2.5 bg-red-900/60 hover:bg-red-900 border border-white/20 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất Quản trị</span>
            </button>
          </div>
        </div>

        {/* Admin Session Badge Bar */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Tài khoản đang đăng nhập:{' '}
              <strong className="text-white font-bold">{currentUser.email}</strong>
            </span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span className="text-red-100 font-semibold">{currentUser.displayName}</span>
          </div>

          <div className="flex items-center gap-5 text-red-100">
            <span>Ban Điều hành: <strong className="text-white font-bold">{executives.length}</strong></span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span>Tổng thành viên: <strong className="text-white font-bold">{members.length}</strong></span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span>Email đã gửi: <strong className="text-white font-bold">{emails.length}</strong></span>
          </div>
        </div>
      </section>

      {/* Admin Module Navigation Tabs: 5 Scientific Modules */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveAdminTab('dashboard')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeAdminTab === 'dashboard'
              ? 'border-[#9E1B20] text-[#9E1B20] bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Tổng quan & Chỉ số</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('events')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeAdminTab === 'events'
              ? 'border-[#9E1B20] text-[#9E1B20] bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Sự kiện & Đăng ký ({events.length} · {totalAllRegs} ĐK)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('members')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeAdminTab === 'members'
              ? 'border-[#9E1B20] text-[#9E1B20] bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh bạ Thành viên ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('executives')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeAdminTab === 'executives'
              ? 'border-[#9E1B20] text-[#9E1B20] bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Ban Điều hành ({executives.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('communications')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeAdminTab === 'communications'
              ? 'border-[#9E1B20] text-[#9E1B20] bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-[#0F172A]'
          }`}
        >
          <MailCheck className="w-4 h-4" />
          <span>Truyền thông & Email ({emails.length})</span>
        </button>
      </div>

      {/* MODULE 1: DASHBOARD (TỔNG QUAN & ĐIỀU HÀNH HỆ THỐNG) */}
      {activeAdminTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Members */}
            <div
              onClick={() => setActiveAdminTab('members')}
              className="bg-white border border-slate-200 hover:border-[#9E1B20]/40 rounded-2xl p-5 shadow-xs transition-all cursor-pointer group hover:shadow-md"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cựu sinh viên
                </span>
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#9E1B20] group-hover:bg-[#9E1B20] group-hover:text-white transition-colors flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="pt-3 space-y-1">
                <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tabular-nums">
                  {members.length}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Hồ sơ trực tuyến</span>
                  <span className="text-[#9E1B20] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Xem danh bạ <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 2: Executives */}
            <div
              onClick={() => setActiveAdminTab('executives')}
              className="bg-white border border-slate-200 hover:border-[#9E1B20]/40 rounded-2xl p-5 shadow-xs transition-all cursor-pointer group hover:shadow-md"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ban Điều hành
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="pt-3 space-y-1">
                <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tabular-nums">
                  {executives.length}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Nhiệm kỳ 2025–2030</span>
                  <span className="text-[#9E1B20] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Quản lý BĐH <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 3: Events & Registrations */}
            <div
              onClick={() => setActiveAdminTab('events')}
              className="bg-white border border-slate-200 hover:border-[#9E1B20]/40 rounded-2xl p-5 shadow-xs transition-all cursor-pointer group hover:shadow-md"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Sự kiện & Đại biểu
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="pt-3 space-y-1">
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-800 tabular-nums">
                  {totalAllRegs} <span className="text-xs font-normal text-slate-500">lượt ĐK</span>
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{events.length} chương trình</span>
                  <span className="text-[#9E1B20] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Quản lý & Reset <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: Emails & Notifications */}
            <div
              onClick={() => setActiveAdminTab('communications')}
              className="bg-white border border-slate-200 hover:border-[#9E1B20]/40 rounded-2xl p-5 shadow-xs transition-all cursor-pointer group hover:shadow-md"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Hộp thư & Thông báo
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center">
                  <MailCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="pt-3 space-y-1">
                <p className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tabular-nums">
                  {emails.length} <span className="text-xs font-normal text-slate-500">thư gửi</span>
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Tự động & Thông báo</span>
                  <span className="text-[#9E1B20] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Soạn thông báo <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Control Center */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-5 bg-[#9E1B20] rounded-xs" />
                <h3 className="text-base font-bold text-[#0F172A]">
                  Trung tâm Thao tác Nhanh cho Ban Điều hành
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">Phím tắt quản trị</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <button
                type="button"
                onClick={() => setActiveAdminTab('events')}
                className="p-3.5 bg-slate-50 hover:bg-red-50/70 border border-slate-200 hover:border-red-200 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between h-28"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-[#9E1B20] flex items-center justify-center group-hover:border-red-300">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-[#9E1B20] leading-tight">
                    Reset Đăng ký
                  </p>
                  <p className="text-[11px] text-slate-500">Xác nhận an toàn</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveAdminTab('events')}
                className="p-3.5 bg-slate-50 hover:bg-red-50/70 border border-slate-200 hover:border-red-200 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between h-28"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-emerald-700 flex items-center justify-center group-hover:border-emerald-300">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 leading-tight">
                    Xuất Excel 3 Sheet
                  </p>
                  <p className="text-[11px] text-slate-500">Danh sách đại biểu</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAdminTab('executives');
                  setShowAddExecModal(true);
                }}
                className="p-3.5 bg-slate-50 hover:bg-red-50/70 border border-slate-200 hover:border-red-200 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between h-28"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-amber-800 flex items-center justify-center group-hover:border-amber-300">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-amber-900 leading-tight">
                    Thêm Ủy viên BĐH
                  </p>
                  <p className="text-[11px] text-slate-500">Tra cứu theo SĐT</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAdminTab('communications');
                  setCommsSubTab('broadcast');
                }}
                className="p-3.5 bg-slate-50 hover:bg-red-50/70 border border-slate-200 hover:border-red-200 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between h-28"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-blue-700 flex items-center justify-center group-hover:border-blue-300">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-800 leading-tight">
                    Gửi Thông báo
                  </p>
                  <p className="text-[11px] text-slate-500">Toàn mạng lưới</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAdminTab('communications');
                  setCommsSubTab('templates');
                }}
                className="p-3.5 bg-slate-50 hover:bg-red-50/70 border border-slate-200 hover:border-red-200 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between h-28"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-purple-700 flex items-center justify-center group-hover:border-purple-300">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-purple-800 leading-tight">
                    Thư Tự động
                  </p>
                  <p className="text-[11px] text-slate-500">Cấu hình mẫu thư</p>
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenEmailOutbox}
                className="p-3.5 bg-slate-50 hover:bg-red-50/70 border border-slate-200 hover:border-red-200 rounded-xl text-left transition-all cursor-pointer group flex flex-col justify-between h-28"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center group-hover:border-slate-300">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-[#9E1B20] leading-tight">
                    Hộp thư Hệ thống
                  </p>
                  <p className="text-[11px] text-slate-500">{emails.length} tin đã gửi</p>
                </div>
              </button>
            </div>
          </div>

          {/* System Security & Integrity Protocol */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-[#9E1B20] flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">
                  Quy trình An toàn Dữ liệu & Bảo mật Hệ thống ALUMNI KTD
                </h4>
                <p className="text-xs text-slate-600">
                  Bảo vệ tuyệt đối thông tin riêng tư của hội viên và toàn vẹn cơ sở dữ liệu
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Lock className="w-3.5 h-3.5 text-[#9E1B20]" />
                  <span>1. Phân quyền RBAC Zero-Trust</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Chỉ tài khoản Quản trị viên được phân quyền RBAC phía máy chủ trên ALUMNI KTD (<code className="text-[#9E1B20]">alumni.ktd.edu.vn</code>) mới có quyền xóa dữ liệu và reset đăng ký sự kiện.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>2. Xác thực Thao tác 2 Bước</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Tất cả thao tác xóa thành viên, xóa sự kiện, hoặc Reset danh sách đại biểu bắt buộc phải thông qua hộp thoại cảnh báo rủi ro xác nhận 2 bước để loại trừ hoàn toàn việc click nhầm.
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. PostgreSQL &amp; RBAC Máy chủ</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Hệ thống lưu trữ tập trung trên cơ sở dữ liệu PostgreSQL kết hợp kiểm soát phân quyền RBAC phía máy chủ tại ALUMNI KTD (alumni.ktd.edu.vn), đảm bảo toàn vẹn dữ liệu và sao lưu định kỳ.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Members & Directory Quick View */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-[#0F172A]">
                  Hội viên Mới Gia nhập Mạng lưới Gần đây
                </h4>
                <p className="text-xs text-slate-500">
                  Theo dõi và kết nối trực tiếp với cựu sinh viên vừa cập nhật hồ sơ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAdminTab('members')}
                className="text-xs font-bold text-[#9E1B20] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <span>Xem toàn bộ {members.length} thành viên</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">Cựu sinh viên</th>
                    <th className="py-2.5 px-3">Lớp · Khóa</th>
                    <th className="py-2.5 px-3">Khoa</th>
                    <th className="py-2.5 px-3">Nơi công tác / Doanh nghiệp</th>
                    <th className="py-2.5 px-3">Tỉnh thành</th>
                    <th className="py-2.5 px-3 text-right">Liên hệ nhanh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.slice(0, 5).map((m) => (
                    <tr key={m.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {m.avatarUrl ? (
                            <img
                              src={m.avatarUrl}
                              alt={m.fullName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-red-100 text-[#9E1B20] flex items-center justify-center font-bold text-xs shrink-0">
                              {m.fullName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{m.fullName}</p>
                            <p className="text-[11px] text-slate-500">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {m.className || 'KTD'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {m.faculty}
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                        {m.workplace || 'Chưa cập nhật'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {m.currentProvince || 'Đà Nẵng'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {m.zaloPhone && (
                            <a
                              href={buildZaloDeepLink(m.zaloPhone) || '#'}
                              onClick={(e) => {
                                e.preventDefault();
                                handleOpenZaloModal(m);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] border border-blue-200 transition-colors cursor-pointer"
                              title={`Kết nối Zalo với ${m.fullName}`}
                            >
                              <MessageCircle className="w-3 h-3 text-[#0068FF]" />
                              <span>Zalo</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleManualConfirm(m)}
                            disabled={isSendingManual}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                            title="Gửi thư xác nhận hồ sơ"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Xác nhận</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: QUẢN LÝ ĐĂNG KÝ SỰ KIỆN & RESET ĐĂNG KÝ */}
      {activeAdminTab === 'events' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#9E1B20]">
                  QUẢN LÝ ĐĂNG KÝ SỰ KIỆN · RESET DỮ LIỆU ĐĂNG KÝ
                </span>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-red-100 text-[#9E1B20] rounded-full">
                  {events.length} Sự kiện · {totalAllRegs} Lượt ĐK
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Quản lý Đăng ký Tham gia Sự kiện & Gala
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
                Theo dõi số lượng đại biểu, xuất báo cáo danh sách Excel chuẩn hoặc thực hiện{' '}
                <strong className="text-[#9E1B20]">Reset đăng ký (đưa số lượng về 0)</strong> khi kết thúc hoặc làm mới chương trình.
              </p>
            </div>

            {onNavigateToEvents && (
              <button
                type="button"
                onClick={onNavigateToEvents}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-2xs"
              >
                <Calendar className="w-4 h-4 text-[#9E1B20]" />
                <span>Xem Trang Sự kiện & Tạo mới</span>
              </button>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 text-[#9E1B20] flex items-center justify-center font-bold shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Tổng số sự kiện</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{events.length}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Tổng lượt đại biểu đăng ký</p>
                <p className="text-xl font-bold text-emerald-800 tabular-nums">{totalAllRegs}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Chức năng Reset đăng ký</p>
                <p className="text-xs font-bold text-slate-800">Sẵn sàng (Đưa lượt ĐK về 0)</p>
              </div>
            </div>
          </div>

          {/* Event Search filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm kiếm sự kiện theo tên, địa điểm hoặc mã sự kiện..."
                value={eventSearchQuery}
                onChange={(e) => setEventSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#9E1B20] focus:bg-white"
              />
            </div>
            {eventSearchQuery && (
              <button
                type="button"
                onClick={() => setEventSearchQuery('')}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Xóa tìm kiếm
              </button>
            )}
          </div>

          {/* Events Table / List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3">Sự kiện & Thời gian</th>
                    <th className="px-3 py-3">Trạng thái</th>
                    <th className="px-3 py-3">Đại biểu đã ĐK</th>
                    <th className="px-3 py-3">Đặc thù sự kiện</th>
                    <th className="px-4 py-3 text-right">Thao tác Quản trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        {events.length === 0
                          ? 'Chưa có sự kiện nào trong hệ thống.'
                          : `Không tìm thấy sự kiện nào phù hợp với "${eventSearchQuery}".`}
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((ev) => {
                      const evRegs = allEventRegistrations?.[ev.id];
                      const regCount = evRegs !== undefined ? evRegs.length : (ev.registeredCount || 0);
                      return (
                        <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 leading-snug">{ev.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>📅 {ev.eventDate} ({ev.eventTime})</span>
                              <span>·</span>
                              <span>📍 {ev.venue} ({ev.province})</span>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                ev.status === 'open'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {ev.status === 'open' ? 'Đang mở ĐK' : 'Đã đóng'}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-base text-[#9E1B20] tabular-nums">
                                {regCount}
                              </span>
                              <span className="text-xs text-slate-500">đại biểu</span>
                            </div>
                            {ev.capacity && (
                              <div className="text-[11px] text-slate-400">
                                Sức chứa: {ev.capacity} chỗ
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {ev.isGalaWithShirtFee || ev.title.includes('Gala Gặp mặt Cán bộ Đoàn') ? (
                                <span className="text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Gala & Áo thun
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  Hội nghị / Sự kiện
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setAttendeeSearchQuery('');
                                  setAdminViewingEventAttendees(ev);
                                }}
                                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Xem danh sách đại biểu chi tiết của sự kiện này"
                              >
                                <Users className="w-3.5 h-3.5 text-[#9E1B20]" />
                                <span>Xem DS ({regCount})</span>
                              </button>

                              <button
                                type="button"
                                disabled={isExportingExcelId === ev.id}
                                onClick={() => handleAdminExportExcel(ev)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-60"
                                title="Xuất file Excel danh sách đại biểu (.xlsx)"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{isExportingExcelId === ev.id ? 'Đang xuất...' : 'Excel'}</span>
                              </button>

                              {onResetEventRegistrations && (
                                <button
                                  type="button"
                                  onClick={() => setResettingEvent(ev)}
                                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-[#9E1B20] hover:text-[#7D1418] border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Reset toàn bộ dữ liệu đăng ký của sự kiện này và đưa số lượng về 0"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-[#9E1B20]" />
                                  <span>Reset Đăng ký</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* MODULE 4: QUẢN LÝ BAN ĐIỀU HÀNH (EXECUTIVE BOARD CONFIGURATION) */}
      {activeAdminTab === 'executives' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#9E1B20]">
                  CẤU HÌNH BAN ĐIỀU HÀNH · NHIỆM KỲ 2025 – 2030
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {executives.length} Thành viên
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#0F172A]">
                Cấu hình Danh sách Thành viên Ban Điều hành ALUMNI KTD
              </h2>
              <p className="text-sm text-slate-600">
                Thêm mới, sửa đổi chức danh, thông tin liên hệ và xóa thành viên khỏi Ban Điều hành. Dữ liệu được đồng bộ trực tiếp tới cơ sở dữ liệu PostgreSQL trên máy chủ ALUMNI KTD.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setExecFormError(null);
                setLookupExecError(null);
                setFoundExecMember(null);
                setSearchExecPhone('');
                setCustomExecWorkPosition('');
                setSelectedExecRole('Ủy viên Ban Điều hành');
                setShowAddExecModal(true);
              }}
              className="px-4 py-2.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Thành viên BĐH</span>
            </button>
          </div>

          {/* Quick Search for Executives */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Tìm thành viên BĐH theo họ tên, chức vụ, khoa, đơn vị..."
                value={adminExecSearch}
                onChange={(e) => setAdminExecSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
              />
            </div>
            <span className="text-xs text-slate-500">
              Đang hiển thị {filteredExecsForAdmin.length} / {executives.length} ủy viên
            </span>
          </div>

          {/* Executive Members Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4"># & Họ tên & Chức vụ</th>
                  <th className="py-3 px-4">Khoa & Chuyên ngành</th>
                  <th className="py-3 px-4">Đơn vị & Chức vụ công tác</th>
                  <th className="py-3 px-4">Điện thoại & Email</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {filteredExecsForAdmin.map((exec, idx) => (
                  <tr key={exec.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Role */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 tabular-nums">
                          {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <AvatarIllustration
                          avatarKey={exec.avatarKey}
                          name={exec.fullName}
                          className="w-10 h-10 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[#0F172A] truncate">{exec.fullName}</p>
                          <span className="inline-block text-[11px] font-semibold text-[#9E1B20] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            {exec.boardRole}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Faculty */}
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{exec.faculty}</p>
                      <p className="text-xs text-slate-500">
                        {exec.major} · Khóa TN {exec.graduationYear}
                      </p>
                    </td>

                    {/* Workplace */}
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800 break-words">{exec.workplace}</p>
                      <p className="text-xs text-slate-500">{exec.workPosition}</p>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 tabular-nums">{exec.phone}</p>
                      <a href={`mailto:${exec.email}`} className="text-xs text-[#9E1B20] hover:underline truncate block">
                        {exec.email}
                      </a>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setExecFormError(null);
                            setEditingExec({ ...exec });
                          }}
                          className="p-1.5 text-slate-600 hover:text-[#9E1B20] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin thành viên"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingExecId(exec.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa thành viên khỏi Ban Điều hành"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODULE 5: TRUNG TÂM TRUYỀN THÔNG & EMAIL MẠNG LƯỚI */}
      {activeAdminTab === 'communications' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#9E1B20]">
                  TRUNG TÂM TRUYỀN THÔNG · EMAIL HỆ THỐNG
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>SMTP Microsoft 365 Connected</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">
                Truyền thông & Phát hành Thông báo Mạng lưới
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
                Quản lý tập trung việc phát hành thông báo chính thức của Ban Điều hành, cấu hình mẫu thư tự động khi hội viên tham gia và theo dõi lịch sử hộp thư hệ thống.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenEmailOutbox}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 self-start sm:self-auto shrink-0 shadow-2xs"
            >
              <Bell className="w-4 h-4 text-[#9E1B20]" />
              <span>Hộp thư Hệ thống ({emails.length})</span>
            </button>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setCommsSubTab('broadcast')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                commsSubTab === 'broadcast'
                  ? 'bg-[#9E1B20] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>1. Soạn & Gửi Thông báo Mạng lưới</span>
            </button>

            <button
              type="button"
              onClick={() => setCommsSubTab('templates')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                commsSubTab === 'templates'
                  ? 'bg-[#9E1B20] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>2. Cấu hình Mẫu Thư Tự động</span>
            </button>

            <button
              type="button"
              onClick={() => setCommsSubTab('outbox')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                commsSubTab === 'outbox'
                  ? 'bg-[#9E1B20] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>3. Lịch sử Hộp thư ({emails.length})</span>
            </button>
          </div>

          {/* SUB-TAB 1: BROADCAST COMPOSER */}
          {commsSubTab === 'broadcast' && (
            <div className="space-y-4 pt-2">
              {boardSendStatus && (
                <div
                  role="status"
                  className="p-4 bg-[#FEF2F2] border-l-4 border-[#9E1B20] text-[#0F172A] text-sm font-semibold rounded-r-lg flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#9E1B20] shrink-0" />
                    <span>{boardSendStatus}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenEmailOutbox}
                    className="text-xs text-[#9E1B20] hover:underline cursor-pointer whitespace-nowrap shrink-0 font-bold"
                  >
                    Kiểm tra Hộp thư Hệ thống
                  </button>
                </div>
              )}

              <form onSubmit={handleSendBoardMessage} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Đối tượng nhận thông báo
                    </label>
                    <select
                      value={selectedMemberUid}
                      onChange={(e) => setSelectedMemberUid(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    >
                      <option value="ALL">Toàn bộ cựu sinh viên ({members.length} thành viên)</option>
                      {members.map((m) => (
                        <option key={m.uid} value={m.uid}>
                          {m.fullName} — {m.className} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Tiêu đề email thông báo
                    </label>
                    <input
                      type="text"
                      required
                      value={boardSubject}
                      onChange={(e) => setBoardSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Nội dung thông điệp
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={boardMessage}
                    onChange={(e) => setBoardMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Hệ thống tự động đồng bộ thông báo vào Hộp thư Hệ thống để hội viên có thể đọc lại bất kỳ lúc nào.
                  </p>

                  <button
                    type="submit"
                    disabled={isSendingBoard}
                    className="px-5 py-2.5 bg-[#9E1B20] text-white text-sm font-semibold rounded-lg hover:bg-[#7D1418] active:bg-[#5E0D10] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSendingBoard ? 'Đang gửi thông báo...' : 'Phát hành Thông báo Ngay'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUB-TAB 2: AUTO EMAIL TEMPLATES & SETTINGS */}
          {commsSubTab === 'templates' && (
            <div className="space-y-5 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Chế độ Phát hành Thư Tự động
                  </p>
                  <p className="text-xs text-slate-600">
                    Tự động gửi email chúc mừng và xác nhận ngay khi cựu sinh viên tạo hoặc chỉnh sửa hồ sơ.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateAdminConfig({ autoSendWelcomeEmail: true })}
                    className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors ${
                      adminConfig.autoSendWelcomeEmail
                        ? 'bg-[#9E1B20] text-white shadow-xs font-bold'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    Tự động gửi (Khuyên dùng)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateAdminConfig({ autoSendWelcomeEmail: false })}
                    className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors ${
                      !adminConfig.autoSendWelcomeEmail
                        ? 'bg-[#9E1B20] text-white shadow-xs font-bold'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    Duyệt thủ công
                  </button>
                </div>
              </div>

              {manualStatus && (
                <div
                  role="status"
                  className="p-4 bg-[#FEF2F2] border-l-4 border-[#9E1B20] text-[#0F172A] text-sm font-semibold rounded-r-lg flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2.5">
                    <MailCheck className="w-5 h-5 text-[#9E1B20] shrink-0" />
                    <span>{manualStatus}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenEmailOutbox}
                    className="text-xs text-[#9E1B20] hover:underline cursor-pointer whitespace-nowrap shrink-0 font-bold"
                  >
                    Mở Hộp thư Hệ thống
                  </button>
                </div>
              )}

              {/* SMTP Account Status Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                  <span className="text-xs text-slate-700">
                    Tài khoản gửi thư hệ thống: <strong className="text-slate-900 font-bold">alumni@ktd.edu.vn</strong> (Cổng Microsoft 365 / Trường ĐH Kiến trúc Đà Nẵng)
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shrink-0">
                  Cổng SMTP: smtp.office365.com:587
                </span>
              </div>

              {/* Config fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Tên danh xưng Ban Điều hành gửi thư
                  </label>
                  <input
                    type="text"
                    value={adminConfig.senderTitle}
                    onChange={(e) => onUpdateAdminConfig({ senderTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Email phản hồi chính thức (Reply-To)
                  </label>
                  <input
                    type="email"
                    value={adminConfig.replyToEmail}
                    onChange={(e) => onUpdateAdminConfig({ replyToEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Ghi chú chân trang thư xác nhận
                  </label>
                  <input
                    type="text"
                    value={adminConfig.customFooterNote}
                    onChange={(e) => onUpdateAdminConfig({ customFooterNote: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: OUTBOX LOG PREVIEW */}
          {commsSubTab === 'outbox' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Nhật ký Thư & Thông báo Đã phát hành ({emails.length} thư)
                  </p>
                  <p className="text-xs text-slate-600">
                    Theo dõi trạng thái gửi thành công và nội dung đã gửi đến từng cựu sinh viên
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenEmailOutbox}
                  className="px-4 py-2 bg-[#9E1B20] text-white text-xs sm:text-sm font-bold rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Bell className="w-4 h-4" />
                  <span>Mở Hộp thư Chi tiết</span>
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {emails.slice(0, 10).map((em) => (
                  <div
                    key={em.id}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{em.subject}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Đã gửi
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Đến: <strong className="text-slate-800">{em.recipientName}</strong> ({em.to})
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(em.sentAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* MODULE 3: Quản trị Danh bạ Cựu sinh viên */}
      {activeAdminTab === 'members' && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9E1B20]">
                3. DANH BẠ HỘI VIÊN & HỒ SƠ CÁ NHÂN
              </p>
              <h2 className="text-xl font-bold text-[#0F172A]">
                Quản trị Danh bạ Cựu sinh viên Mạng lưới ALUMNI KTD
              </h2>
              <p className="text-sm text-slate-600">
                Theo dõi tình trạng xác thực thành viên, duyệt gửi thư chào mừng hoặc mở cuộc trò chuyện Zalo trực tiếp với hội viên.
              </p>
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Tìm họ tên, lớp, email, SĐT..."
                value={adminSearchQuery}
                onChange={(e) => {
                  setAdminSearchQuery(e.target.value);
                  setAdminMemberPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4"># & Họ và tên</th>
                  <th className="py-3 px-4">Lớp · Khóa</th>
                  <th className="py-3 px-4">Khoa đào tạo</th>
                  <th className="py-3 px-4">Liên hệ (Zalo / SĐT)</th>
                  <th className="py-3 px-4">Đơn vị công tác</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {paginatedAdminMembers.map((m, idx) => {
                  const rowNum = (safeAdminMemberPage - 1) * ADMIN_PAGE_SIZE + idx + 1;
                  return (
                  <tr key={m.uid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0F172A]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 tabular-nums">
                          {rowNum < 10 ? `0${rowNum}` : rowNum}
                        </span>
                        <div>
                          <p>{m.fullName}</p>
                          <p className="text-xs font-normal text-slate-500">{m.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#9E1B20]">{m.className}</span>
                      <p className="text-xs text-slate-500">Khóa {m.enrollmentYear} - {m.graduationYear}</p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{m.faculty}</p>
                      <p className="text-xs text-slate-500">{m.major}</p>
                    </td>

                    <td className="py-3 px-4">
                      {m.zaloPhone ? (
                        <div className="flex items-center gap-1.5">
                          <span className="tabular-nums font-medium text-slate-700">{m.zaloPhone}</span>
                          <a
                            href={buildZaloDeepLink(m.zaloPhone) || '#'}
                            onClick={(e) => {
                              e.preventDefault();
                              handleOpenZaloModal(m);
                            }}
                            className="p-1 text-white bg-[#0068FF] rounded hover:bg-[#0052cc] transition-colors cursor-pointer"
                            title={`Kết nối Zalo với ${m.fullName}`}
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        </div>
                      ) : m.zaloPhoneMasked ? (
                        <span className="tabular-nums font-mono text-slate-500">{m.zaloPhoneMasked}</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa cập nhật</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800 truncate max-w-[200px]">{m.workplace}</p>
                      <p className="text-xs text-slate-500">{m.workplaceProvince}</p>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isSendingManual}
                          onClick={() => handleManualWelcome(m)}
                          className="px-2 py-1 text-xs font-semibold text-[#9E1B20] bg-red-50 hover:bg-red-100 rounded transition-colors cursor-pointer"
                        >
                          Gửi Chào mừng
                        </button>
                        <button
                          type="button"
                          disabled={isSendingManual}
                          onClick={() => handleManualConfirm(m)}
                          className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                        >
                          Xác nhận
                        </button>
                        {onDeleteMember && (
                          <button
                            type="button"
                            onClick={() => setDeletingMember(m)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#9E1B20] border border-red-200 bg-white hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title={`Xóa thành viên ${m.fullName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredMembersForAdmin.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  Hiển thị{' '}
                  <strong className="text-slate-900 font-semibold tabular-nums">
                    {(safeAdminMemberPage - 1) * ADMIN_PAGE_SIZE + 1} –{' '}
                    {Math.min(
                      safeAdminMemberPage * ADMIN_PAGE_SIZE,
                      filteredMembersForAdmin.length
                    )}
                  </strong>{' '}
                  trên tổng số{' '}
                  <strong className="text-slate-900 font-semibold tabular-nums">
                    {filteredMembersForAdmin.length}
                  </strong>{' '}
                  thành viên ({ADMIN_PAGE_SIZE} người/trang · Trang {safeAdminMemberPage}/{totalAdminMemberPages})
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeAdminMemberPage === 1}
                    onClick={() => setAdminMemberPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalAdminMemberPages }, (_, i) => i + 1).map((pNum) => (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setAdminMemberPage(pNum)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors cursor-pointer tabular-nums ${
                        safeAdminMemberPage === pNum
                          ? 'bg-[#9E1B20] text-white shadow-2xs'
                          : 'border border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={safeAdminMemberPage === totalAdminMemberPages}
                    onClick={() =>
                      setAdminMemberPage((p) => Math.min(totalAdminMemberPages, p + 1))
                    }
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Admin Modal to Add Executive Member */}
      {showAddExecModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 bg-[#9E1B20] rounded-xs" />
                  <h2 className="text-lg font-bold text-[#0F172A]">
                    Thêm Thành viên Ban Điều hành ALUMNI KTD
                  </h2>
                </div>
                <p className="text-xs text-slate-500 pl-4">
                  Bắt buộc thành viên đã có hồ sơ trong hệ thống · Tìm kiếm và chỉ định qua Số điện thoại
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExecModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Phone Search Field */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-800">
                Nhập số điện thoại thành viên (*)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="Ví dụ: 0905123456 hoặc 4 số cuối..."
                    value={searchExecPhone}
                    onChange={(e) => setSearchExecPhone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecPhoneSearch(searchExecPhone);
                      }
                    }}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleExecPhoneSearch(searchExecPhone)}
                  className="px-4 py-2.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Search className="w-4 h-4" />
                  <span>Tìm kiếm</span>
                </button>
              </div>

              {/* Suggestions from registered system members */}
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-medium text-slate-500">
                  Gợi ý nhanh từ danh bạ thành viên hệ thống:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {members
                    .filter((m) => Boolean(m.zaloPhone))
                    .slice(0, 6)
                    .map((m) => (
                      <button
                        key={m.uid}
                        type="button"
                        onClick={() => {
                          setSearchExecPhone(m.zaloPhone || '');
                          handleExecPhoneSearch(m.zaloPhone || '');
                        }}
                        className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-red-50 hover:text-[#9E1B20] border border-slate-200 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-slate-700"
                      >
                        <span className="font-medium">{m.fullName}</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          ({m.zaloPhone?.slice(-4) ? `*${m.zaloPhone.slice(-4)}` : ''})
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Error when member not found */}
            {lookupExecError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-[#9E1B20]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Không tìm thấy thành viên</span>
                </div>
                <p className="leading-relaxed">{lookupExecError}</p>
              </div>
            )}

            {/* Step 2: Found Member Preview & Role Assignment Form */}
            {foundExecMember && (
              <form
                onSubmit={handleCreateExec}
                className="space-y-4 pt-2 border-t border-slate-200 animate-in fade-in duration-200"
              >
                {/* Verified Member Dossier Card */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đã xác thực thành viên hệ thống ALUMNI KTD</span>
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      UID: {foundExecMember.uid.slice(0, 12)}...
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg shrink-0">
                      {foundExecMember.fullName.charAt(0)}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className="text-base font-bold text-[#0F172A]">
                        {foundExecMember.fullName}
                      </h4>
                      <p className="text-xs text-slate-600">
                        <strong className="text-slate-800">{foundExecMember.faculty}</strong> · {foundExecMember.major}
                      </p>
                      <p className="text-xs text-slate-500">
                        Lớp: <span className="font-semibold text-[#9E1B20]">{foundExecMember.className}</span> · Khóa TN: {foundExecMember.graduationYear || foundExecMember.enrollmentYear}
                      </p>
                      <p className="text-xs text-slate-700">
                        Đơn vị công tác: <span className="font-medium">{foundExecMember.workplace}</span> ({foundExecMember.workplaceProvince})
                      </p>
                    </div>
                  </div>

                  {/* Warning if already in Executive Board */}
                  {executives.some(
                    (e) =>
                      normalizePhone(e.phone) === normalizePhone(foundExecMember.zaloPhone) ||
                      e.fullName.toLowerCase() === foundExecMember.fullName.toLowerCase()
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
                      value={selectedExecRole}
                      onChange={(e) => setSelectedExecRole(e.target.value)}
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
                      value={customExecWorkPosition}
                      onChange={(e) => setCustomExecWorkPosition(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Hình đại diện minh họa (Avatar)
                    </label>
                    <select
                      value={selectedExecAvatar}
                      onChange={(e) => setSelectedExecAvatar(e.target.value)}
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

                {execFormError && (
                  <p className="text-xs text-[#9E1B20] font-semibold">{execFormError}</p>
                )}

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFoundExecMember(null);
                      setSearchExecPhone('');
                    }}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Tìm số khác
                  </button>

                  <button
                    type="submit"
                    disabled={isExecSubmitting}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-lg cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{isExecSubmitting ? 'Đang thêm...' : 'Xác nhận Thêm vào Ban Điều hành'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin Modal to Edit Executive Member */}
      {editingExec && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-6 bg-[#9E1B20] rounded-xs" />
                <h2 className="text-lg font-bold text-[#0F172A]">
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

            {execFormError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-[#9E1B20]">
                {execFormError}
              </div>
            )}

            <form onSubmit={handleSaveEditExec} className="space-y-4">
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
                  disabled={isExecSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isExecSubmitting ? 'Đang lưu...' : 'Lưu Thay đổi'}
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
                Bạn có chắc chắn muốn xóa thành viên này khỏi danh sách Ban Điều hành? Dữ liệu sẽ được xóa khỏi hệ thống.
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
                disabled={isExecSubmitting}
                onClick={handleConfirmDeleteExec}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isExecSubmitting ? 'Đang xóa...' : 'Xác nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL XÁC NHẬN RESET ĐĂNG KÝ SỰ KIỆN */}
      {resettingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-red-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-[#9E1B20] flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E1B20] bg-red-50 px-2 py-0.5 rounded">
                  Xác nhận Quản trị viên
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  Reset toàn bộ dữ liệu đăng ký sự kiện?
                </h3>
                <p className="text-xs text-slate-500">
                  Sự kiện: <strong className="text-slate-800">{resettingEvent.title}</strong>
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs sm:text-sm text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cảnh báo dữ liệu quan trọng:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  Toàn bộ <strong>{allEventRegistrations?.[resettingEvent.id] !== undefined ? allEventRegistrations[resettingEvent.id].length : (resettingEvent.registeredCount || 0)} lượt đăng ký</strong> hiện tại của đại biểu sẽ bị xóa sạch khỏi cơ sở dữ liệu.
                </li>
                <li>
                  Tất cả các thông tin đặt áo thun (Size Nam/Nữ), đăng ký tham dự Gala và câu trả lời khảo sát sẽ được làm mới.
                </li>
                <li>
                  Số lượng đại biểu đã đăng ký của sự kiện sẽ được đưa về <strong>0</strong>.
                </li>
                <li>
                  Nội dung, thời gian, địa điểm và cấu hình Form đăng ký của sự kiện <strong>không bị ảnh hưởng</strong>.
                </li>
              </ul>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isResettingEvent}
                onClick={() => setResettingEvent(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isResettingEvent}
                onClick={handleConfirmResetEvent}
                className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
              >
                {isResettingEvent ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Đang tiến hành Reset...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Xác nhận Reset toàn bộ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT DANH SÁCH ĐẠI BIỂU TRONG ADMIN */}
      {adminViewingEventAttendees && (() => {
        const eventRegs = allEventRegistrations?.[adminViewingEventAttendees.id] || [];
        const attendees = buildEnrichedAttendeeList(
          adminViewingEventAttendees,
          members,
          userRegistrations || {},
          eventRegs
        );
        const filtered = filterAndSortAttendees(
          attendees,
          adminViewingEventAttendees,
          adminSmartFilter
        );

        const totalFilteredPages = Math.max(
          1,
          Math.ceil(filtered.length / ADMIN_PAGE_SIZE)
        );
        const safeAttendeePage = Math.min(adminAttendeePage, totalFilteredPages);
        const paginatedFiltered = filtered.slice(
          (safeAttendeePage - 1) * ADMIN_PAGE_SIZE,
          safeAttendeePage * ADMIN_PAGE_SIZE
        );

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E1B20] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                      Danh sách đại biểu đăng ký
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {attendees.length} đại biểu ({ADMIN_PAGE_SIZE} người/trang · Trang {safeAttendeePage}/{totalFilteredPages})
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {adminViewingEventAttendees.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {canConfirmBtc ? (
                    <span className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Quyền Admin 2 (Xác nhận BTC)</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdmin2AuthModal((prev) => !prev);
                        setAdmin2Error(null);
                      }}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                      <span>Đăng nhập Admin 2 (Xác nhận BTC)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAdminExportExcel(adminViewingEventAttendees)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất Excel</span>
                  </button>

                  {onResetEventRegistrations && (
                    <button
                      type="button"
                      onClick={() => setResettingEvent(adminViewingEventAttendees)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#9E1B20] border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#9E1B20]" />
                      <span>Reset Đăng ký ({attendees.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setAdminViewingEventAttendees(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Inline Admin 2 Login Form inside Admin Attendee Modal */}
              {showAdmin2AuthModal && !canConfirmBtc && (
                <div className="px-4 sm:px-6 py-3 bg-amber-50/90 border-b border-amber-200">
                  <form
                    onSubmit={handleAdmin2QuickSwitch}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-[#9E1B20]" />
                        <span>Xác thực tài khoản Admin 2 để mở khóa chức năng "BTC đã xác nhận"</span>
                      </p>
                      {admin2Error && (
                        <p className="text-[11px] font-semibold text-[#9E1B20]">{admin2Error}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Tài khoản / Email Admin 2"
                        value={admin2Username}
                        onChange={(e) => setAdmin2Username(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] w-40"
                        required
                      />
                      <input
                        type="password"
                        placeholder="Mật mã"
                        value={admin2Password}
                        onChange={(e) => setAdmin2Password(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] w-28"
                        required
                      />
                      <button
                        type="submit"
                        disabled={isAdmin2Submitting}
                        className="px-3 py-1.5 bg-[#9E1B20] hover:bg-[#7e1519] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isAdmin2Submitting ? 'Đang xác thực...' : 'Xác nhận'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Smart Filter in modal */}
              <div className="p-3 sm:px-6 bg-white border-b border-slate-100">
                <EventAttendeeSmartFilterBar
                  event={adminViewingEventAttendees}
                  allAttendees={attendees}
                  filteredCount={filtered.length}
                  filter={adminSmartFilter}
                  onChange={(nextFilter) => {
                    setAdminSmartFilter(nextFilter);
                    setAdminAttendeePage(1);
                  }}
                />
              </div>

              {/* Attendees list table + Inline Editor + Statistics Dashboard */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {adminEditingAttendeeUid && (
                  <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-3 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        Chỉnh sửa Đăng ký &amp; Size Áo cho đại biểu:{' '}
                        <span className="text-[#9E1B20]">{adminEditingAttendeeName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdminEditingAttendeeUid(null)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded bg-white border border-slate-200 cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase text-slate-600">
                          1. Tham dự Tiệc Gala
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAdminEditAttendGala(true)}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              adminEditAttendGala
                                ? 'bg-[#9E1B20] text-white border-[#9E1B20]'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            Có tham gia tiệc
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminEditAttendGala(false)}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              !adminEditAttendGala
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            Không dự tiệc
                          </button>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase text-slate-600">
                          2. Trạng thái đóng lệ phí
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAdminEditPaymentStatus('pending')}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              adminEditPaymentStatus === 'pending'
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            Chờ thanh toán
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminEditPaymentStatus('completed')}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              adminEditPaymentStatus === 'completed'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            Đã chuyển khoản
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase text-slate-700">
                          3. Danh sách Áo đã đặt (Form Nam/Nữ · Size S–3XL)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAdminEditShirtOrders((prev) => [
                              ...prev,
                              {
                                id: `shirt-adm-${Date.now()}-${prev.length}`,
                                gender: 'Nam',
                                size: 'L',
                                quantity: 1,
                              },
                            ])
                          }
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-[#9E1B20] border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm dòng áo</span>
                        </button>
                      </div>

                      {adminEditShirtOrders.map((ord, idx) => {
                        const sizes: EventShirtOrder['size'][] =
                          ord.gender === 'Nam'
                            ? ['S', 'M', 'L', 'XL', 'XXL', '3XL']
                            : ['S', 'M', 'L', 'XL', 'XXL'];
                        return (
                          <div
                            key={ord.id || idx}
                            className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <select
                              value={ord.gender}
                              onChange={(e) => {
                                const g = e.target.value as EventShirtOrder['gender'];
                                setAdminEditShirtOrders((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          gender: g,
                                          size: g === 'Nữ' && item.size === '3XL' ? 'XXL' : item.size,
                                        }
                                      : item
                                  )
                                );
                              }}
                              className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                            >
                              <option value="Nam">Form Nam</option>
                              <option value="Nữ">Form Nữ</option>
                            </select>

                            <div className="flex items-center gap-1">
                              {sizes.map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() =>
                                    setAdminEditShirtOrders((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, size: sz } : item
                                      )
                                    )
                                  }
                                  className={`px-2 py-1 rounded text-xs font-bold border cursor-pointer ${
                                    ord.size === sz
                                      ? 'bg-[#9E1B20] text-white border-[#9E1B20]'
                                      : 'bg-white text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {sz === 'XXL' ? '2XL' : sz}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-1.5 ml-auto">
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={ord.quantity}
                                onChange={(e) => {
                                  const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  setAdminEditShirtOrders((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, quantity: q } : item
                                    )
                                  );
                                }}
                                className="w-14 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-center"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setAdminEditShirtOrders((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                                className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setAdminEditingAttendeeUid(null)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={isSavingAdminAttendeeEdit}
                          onClick={async () => {
                            if (!onAdminUpdateRegistration || !adminViewingEventAttendees) return;
                            setIsSavingAdminAttendeeEdit(true);
                            try {
                              const galaFee = adminViewingEventAttendees.galaFeeAmount ?? 350000;
                              const shirtUnitFee = adminViewingEventAttendees.shirtFeeAmount ?? 110000;
                              const validOrders = adminEditShirtOrders.filter((o) => o.quantity > 0);
                              const totalShirts = validOrders.reduce((s, o) => s + o.quantity, 0);
                              const totalFee =
                                (adminEditAttendGala ? galaFee : 0) + totalShirts * shirtUnitFee;
                              await onAdminUpdateRegistration(
                                adminViewingEventAttendees.id,
                                adminEditingAttendeeUid,
                                {
                                  attendGala: adminEditAttendGala,
                                  shirtOrders: validOrders,
                                  totalFee,
                                  paymentStatus: adminEditPaymentStatus,
                                }
                              );
                              setAdminEditingAttendeeUid(null);
                            } finally {
                              setIsSavingAdminAttendeeEdit(false);
                            }
                          }}
                          className="px-4 py-1.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          {isSavingAdminAttendeeEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {paginatedFiltered.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    {attendees.length === 0
                      ? 'Chưa có đại biểu nào đăng ký sự kiện này.'
                      : 'Không tìm thấy đại biểu nào phù hợp với điều kiện Bộ lọc thông minh.'}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                          <th className="px-3 py-2.5 w-12 text-center">STT</th>
                          <th className="px-3 py-2.5">Họ và tên</th>
                          <th className="px-3 py-2.5">Lớp & Khoa</th>
                          <th className="px-3 py-2.5">SĐT (Bảo mật)</th>
                          <th className="px-3 py-2.5">Nội dung đăng ký</th>
                          <th className="px-3 py-2.5 text-center">BTC đã xác nhận</th>
                          <th className="px-3 py-2.5 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedFiltered.map((att) => (
                          <tr key={att.uid || att.stt} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2 text-slate-500 font-mono text-center tabular-nums">{att.stt}</td>
                            <td className="px-3 py-2">
                              <div className="font-bold text-slate-900">{att.fullName}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-xs text-[#9E1B20] font-semibold">
                                {att.className || 'KTD'}
                              </div>
                              <div className="text-[11px] text-slate-500">{att.faculty}</div>
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap tabular-nums">
                              {att.phone && att.phone !== '—' && att.phone !== 'Chưa cập nhật'
                                ? maskPhoneKeepLast4(att.phone)
                                : members.find((m) => m.uid === att.uid)?.zaloPhoneMasked || '—'}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0.5 max-w-[200px]">
                                {att.attendGala !== undefined && (
                                  <span className="text-[11px] font-semibold text-slate-700">
                                    Gala: {att.attendGala ? 'Có tham gia' : 'Không'}
                                  </span>
                                )}
                                {att.shirtOrders && att.shirtOrders.length > 0 && (
                                  <span className="text-[11px] text-amber-800">
                                    {att.shirtOrders.map((o) => `${o.quantity}x ${o.gender} ${o.size === 'XXL' ? '2XL' : o.size}`).join(', ')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <button
                                type="button"
                                disabled={togglingBtcUid === att.uid}
                                onClick={() =>
                                  handleToggleBtcConfirmedInAdmin(
                                    adminViewingEventAttendees.id,
                                    att.uid,
                                    att.fullName,
                                    Boolean(att.btcConfirmed)
                                  )
                                }
                                title={
                                  canConfirmBtc
                                    ? att.btcConfirmed
                                      ? 'Nhấn để hủy xác nhận BTC'
                                      : 'Nhấn để xác nhận đại biểu (BTC đã xác nhận)'
                                    : 'Chỉ tài khoản Admin 2 mới có quyền xác nhận'
                                }
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                                  att.btcConfirmed
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs hover:bg-emerald-700'
                                    : canConfirmBtc
                                      ? 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50'
                                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300'
                                }`}
                              >
                                {att.btcConfirmed ? (
                                  <>
                                    <CheckSquare className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span>BTC đã xác nhận</span>
                                  </>
                                ) : (
                                  <>
                                    <Square className="w-3.5 h-3.5 shrink-0" />
                                    <span>BTC xác nhận</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {onAdminUpdateRegistration && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdminEditingAttendeeUid(att.uid);
                                      setAdminEditingAttendeeName(att.fullName);
                                      setAdminEditAttendGala(att.attendGala ?? true);
                                      setAdminEditShirtOrders(
                                        att.shirtOrders && att.shirtOrders.length > 0
                                          ? att.shirtOrders.map((o) => ({ ...o }))
                                          : []
                                      );
                                      setAdminEditPaymentStatus(
                                        att.paymentStatus === 'Đã chuyển khoản'
                                          ? 'completed'
                                          : 'pending'
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9E1B20] bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer"
                                    title="Chỉnh sửa Size Áo / Đăng ký của đại biểu này"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Sửa</span>
                                  </button>
                                )}
                                {onDeleteSingleRegistration && (
                                  <button
                                    type="button"
                                    disabled={deletingAttendeeUid === att.uid}
                                    onClick={() =>
                                      handleDeleteAttendee(
                                        adminViewingEventAttendees.id,
                                        att.uid,
                                        att.fullName
                                      )
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Hủy lượt đăng ký của đại biểu này"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-600" />
                                    <span>{deletingAttendeeUid === att.uid ? 'Đang xóa...' : 'Hủy ĐK'}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Multi-page Pagination Bar (20 people per page) */}
                    {filtered.length > 0 && (
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                        <div>
                          Hiển thị{' '}
                          <strong className="text-slate-900 font-semibold tabular-nums">
                            {(safeAttendeePage - 1) * ADMIN_PAGE_SIZE + 1} –{' '}
                            {Math.min(
                              safeAttendeePage * ADMIN_PAGE_SIZE,
                              filtered.length
                            )}
                          </strong>{' '}
                          trên tổng số{' '}
                          <strong className="text-slate-900 font-semibold tabular-nums">
                            {filtered.length}
                          </strong>{' '}
                          người tham gia ({ADMIN_PAGE_SIZE} người/trang · Trang {safeAttendeePage}/{totalFilteredPages})
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={safeAttendeePage === 1}
                            onClick={() => setAdminAttendeePage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            Trước
                          </button>
                          {Array.from({ length: totalFilteredPages }, (_, i) => i + 1).map((pNum) => (
                            <button
                              key={pNum}
                              type="button"
                              onClick={() => setAdminAttendeePage(pNum)}
                              className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors cursor-pointer tabular-nums ${
                                safeAttendeePage === pNum
                                  ? 'bg-[#9E1B20] text-white shadow-2xs'
                                  : 'border border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              {pNum}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={safeAttendeePage === totalFilteredPages}
                            onClick={() =>
                              setAdminAttendeePage((p) => Math.min(totalFilteredPages, p + 1))
                            }
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL KẾT NỐI ZALO TRỰC TIẾP KHÔNG CẦN QUÉT MÃ QR */}
      <ZaloConnectModal
        isOpen={Boolean(zaloModalMember)}
        onClose={() => setZaloModalMember(null)}
        member={zaloModalMember}
      />
    </div>
  );
};
