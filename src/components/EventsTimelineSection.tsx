import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Mail,
  MapPin,
  Plus,
  X,
  AlertCircle,
  ArrowRight,
  Send,
  BellRing,
  Compass,
  Ticket,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  Sliders,
  Trash2,
  Settings2,
  HelpCircle,
  FileText,
  CheckSquare,
  Sparkles,
  FileSpreadsheet,
  Users,
  Search,
  Shirt,
  DollarSign,
  Check,
  Edit3,
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  Pin,
  QrCode,
  Upload,
  Copy,
  Ruler,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import {
  EventCustomField,
  EventCustomFieldType,
  EventRecord,
  EventRegistrationRecord,
  EventShirtOrder,
  MemberProfileRecord,
} from '../data/constants';
import {
  getChartByGender,
  getDefaultHeightKey,
} from '../data/shirtSizeChart';
import {
  EventFormInput,
  buildTransferSyntax,
  buildVietQrImageUrl,
  compressQrImage,
  generateIcsCalendarContent,
  getVietnamDateIso,
  isConfirmedNetworkMember,
  maskPhoneKeepLast4,
  toUpperCaseNoAccents,
} from '../utils/alumniLogic';
import {
  buildEnrichedAttendeeList,
  exportEventRegistrationsToExcel,
} from '../utils/excelExporter';
import { EventEditorModal } from './EventEditorModal';
import { ShirtSizeGuidePanel } from './ShirtSizeGuidePanel';
import { EventStatsDashboard, hasMultiChoiceEventForm } from './EventStatsDashboard';
import {
  AttendeeSmartFilterState,
  DEFAULT_ATTENDEE_SMART_FILTER,
  EventAttendeeSmartFilterBar,
  filterAndSortAttendees,
  hasActiveSmartFilters,
} from './EventAttendeeSmartFilter';

function formatSafeAttendeePhone(phone?: string, fallbackMasked?: string): string {
  const raw = (phone || '').trim();
  if (!raw || raw === '—' || raw === 'Chưa cập nhật' || raw === '******') {
    return fallbackMasked && fallbackMasked.trim() ? fallbackMasked : '—';
  }
  if (raw.includes('*') || raw.includes('•')) {
    return raw;
  }
  return maskPhoneKeepLast4(raw) || '—';
}

interface EventsTimelineSectionProps {
  currentUser: {
    uid: string;
    email: string;
    displayName: string;
    isAdmin: boolean;
    adminRole?: 'admin1' | 'admin2';
    canConfirmBtc?: boolean;
    authMode?: 'password' | 'google' | 'demo';
  } | null;
  currentMemberProfile: MemberProfileRecord | null;
  events: EventRecord[];
  members?: MemberProfileRecord[];
  userRegistrations: Record<string, EventRegistrationRecord>;
  allEventRegistrations?: Record<string, EventRegistrationRecord[]>;
  onCreateEvent: (input: EventFormInput) => Promise<void>;
  onUpdateEvent?: (eventId: string, input: EventFormInput) => Promise<void>;
  onDeleteEvent?: (eventId: string) => Promise<void>;
  onRegisterForEvent: (
    event: EventRecord,
    note: string,
    customAnswers?: Record<string, any>,
    regDetails?: {
      attendGala?: boolean;
      shirtOrders?: EventShirtOrder[];
      totalFee?: number;
      payerPhone?: string;
      payerName?: string;
    }
  ) => Promise<void>;
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
  ) => Promise<void>;
  onAdminLogin?: (
    email: string,
    pass: string
  ) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onSaveUserPhone?: (phone: string, fullName?: string) => Promise<void>;
  savedUserPhone?: string;
  onUpdateEventCustomFields?: (
    eventId: string,
    fields: EventCustomField[]
  ) => Promise<void>;
  onResetEventRegistrations?: (eventId: string) => Promise<boolean>;
  onDeleteSingleRegistration?: (eventId: string, targetUid: string) => Promise<boolean>;
  onNavigateToNetwork: () => void;
  onGoogleLogin?: () => Promise<void> | void;
  onOpenProfileModal?: () => void;
  onOpenEmailOutbox: () => void;
  onOpenMyTickets?: () => void;
  pinnedEventIds?: string[];
  onTogglePinEvent?: (eventId: string) => void;
  initialOpenRegisterEventId?: string | null;
  onClearInitialOpenRegisterEvent?: () => void;
}

export const EventsTimelineSection: React.FC<EventsTimelineSectionProps> = ({
  currentUser,
  currentMemberProfile,
  events,
  members = [],
  userRegistrations,
  allEventRegistrations = {},
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onRegisterForEvent,
  onAdminUpdateRegistration,
  onAdminLogin,
  onResetEventRegistrations,
  onDeleteSingleRegistration,
  onSaveUserPhone,
  savedUserPhone = '',
  onUpdateEventCustomFields,
  onNavigateToNetwork,
  onGoogleLogin,
  onOpenProfileModal,
  onOpenEmailOutbox,
  onOpenMyTickets,
  pinnedEventIds = [],
  onTogglePinEvent,
  initialOpenRegisterEventId,
  onClearInitialOpenRegisterEvent,
}) => {
  const [editorModalState, setEditorModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    initialTab: 'info' | 'registration' | 'preview';
    event: EventRecord | null;
  }>({
    isOpen: false,
    mode: 'create',
    initialTab: 'info',
    event: null,
  });
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventRecord | null>(null);
  const [isDeletingEventId, setIsDeletingEventId] = useState<string | null>(null);
  const [togglingStatusEventId, setTogglingStatusEventId] = useState<string | null>(null);
  const [adminToastMsg, setAdminToastMsg] = useState<string | null>(null);

  const [activeRegisterEventId, setActiveRegisterEventId] = useState<string | null>(
    null
  );
  const [pendingLoginRegisterEventId, setPendingLoginRegisterEventId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (initialOpenRegisterEventId) {
      if (currentUser) {
        setActiveRegisterEventId(initialOpenRegisterEventId);
      } else {
        setPendingLoginRegisterEventId(initialOpenRegisterEventId);
      }
      setTimeout(() => {
        const el = document.getElementById(`event-card-${initialOpenRegisterEventId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      onClearInitialOpenRegisterEvent?.();
    }
  }, [initialOpenRegisterEventId, currentUser, onClearInitialOpenRegisterEvent]);

  // Auto-open registration form right after Google Sign-In completes
  useEffect(() => {
    if (currentUser && pendingLoginRegisterEventId) {
      setActiveRegisterEventId(pendingLoginRegisterEventId);
      setPendingLoginRegisterEventId(null);
    }
  }, [currentUser, pendingLoginRegisterEventId]);
  const [registrationNote, setRegistrationNote] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastRegisteredEventTitle, setLastRegisteredEventTitle] = useState<
    string | null
  >(null);
  const [justRegisteredNotice, setJustRegisteredNotice] = useState<{
    eventId: string;
    eventTitle: string;
    memberName: string;
    memberClass: string;
    memberFaculty: string;
    memberPhone: string;
    memberEmail: string;
    totalFee: number;
    attendGala?: boolean;
    shirtSummary?: string;
  } | null>(null);
  const [eventsFilterTab, setEventsFilterTab] = useState<'upcoming' | 'my_tickets'>('upcoming');
  const [showPastEvents, setShowPastEvents] = useState(false);

  // Compute today's date in YYYY-MM-DD (Vietnam timezone UTC+7)
  const todayStr = useMemo(() => {
    return getVietnamDateIso();
  }, []);

  // Filter events strictly: upcoming events are those with eventDate >= todayStr
  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.eventDate >= todayStr)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [events, todayStr]);

  // Events whose date has already passed
  const pastEvents = useMemo(() => {
    return events
      .filter((e) => e.eventDate < todayStr)
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  }, [events, todayStr]);

  // Events that the current authenticated member has registered for (strictly matched by UID)
  const registeredEventIds = useMemo(() => {
    if (!currentUser) return [];
    return Object.keys(userRegistrations).filter(
      (eid) => userRegistrations[eid]?.uid === currentUser.uid
    );
  }, [userRegistrations, currentUser]);

  const myRegisteredEvents = useMemo(() => {
    if (!currentUser) return [];
    return events.filter((e) => registeredEventIds.includes(e.id));
  }, [events, registeredEventIds, currentUser]);

  const displayedEvents =
    eventsFilterTab === 'my_tickets' && currentUser
      ? myRegisteredEvents
      : upcomingEvents;

  // Custom Registration Fields State
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | boolean | string[]>>({});
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});

  // Inline Admin Custom Field Manager for an event
  const [configuringFieldsEventId, setConfiguringFieldsEventId] = useState<string | null>(null);
  const [activeCustomFields, setActiveCustomFields] = useState<EventCustomField[]>([]);
  const [isSavingCustomFields, setIsSavingCustomFields] = useState(false);
  const [customFieldSaveSuccess, setCustomFieldSaveSuccess] = useState<string | null>(null);

  // Gala & Shirt Booking Specific State
  const [attendGalaChoice, setAttendGalaChoice] = useState<boolean>(true);
  const [hasShirtBooking, setHasShirtBooking] = useState<boolean>(true);
  const [showShirtSizeGuide, setShowShirtSizeGuide] = useState<boolean>(false);
  const [shirtOrders, setShirtOrders] = useState<EventShirtOrder[]>([
    { id: 'shirt-1', gender: 'Nam', size: 'XL', quantity: 1 },
  ]);
  const [shirtHeightMap, setShirtHeightMap] = useState<Record<string, string>>({
    'shirt-1': '1m65-1m70',
  });

  const handleAddShirtOrder = () => {
    const nextGender = shirtOrders.length % 2 === 1 ? 'Nữ' : 'Nam';
    const nextSize = nextGender === 'Nữ' ? 'M' : 'L';
    const newId = `shirt-${Date.now()}-${shirtOrders.length + 1}`;
    setShirtOrders((prev) => [
      ...prev,
      {
        id: newId,
        gender: nextGender,
        size: nextSize,
        quantity: 1,
      },
    ]);
    setShirtHeightMap((prev) => ({
      ...prev,
      [newId]: getDefaultHeightKey(nextGender),
    }));
  };

  const handleRemoveShirtOrder = (id: string) => {
    setShirtOrders((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateShirtOrder = (id: string, updates: Partial<EventShirtOrder>) => {
    setShirtOrders((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextGender = updates.gender ?? s.gender;
        let nextSize = updates.size ?? s.size;
        // Bảng size Nữ từ S đến 2XL (XXL), nếu chuyển sang Nữ mà đang ở 3XL thì đưa về XXL (2XL)
        if (nextGender === 'Nữ' && nextSize === '3XL') {
          nextSize = 'XXL';
        }
        return { ...s, ...updates, gender: nextGender, size: nextSize };
      })
    );
    if (updates.gender) {
      setShirtHeightMap((prev) => ({
        ...prev,
        [id]: getDefaultHeightKey(updates.gender!),
      }));
    }
  };

  const handleApplyRecommendedSize = (
    gender: 'Nam' | 'Nữ',
    size: EventShirtOrder['size']
  ) => {
    setHasShirtBooking(true);
    setShirtOrders((prev) => {
      if (prev.length === 0) {
        const newId = `shirt-${Date.now()}-1`;
        setShirtHeightMap((hm) => ({ ...hm, [newId]: getDefaultHeightKey(gender) }));
        return [{ id: newId, gender, size, quantity: 1 }];
      }
      // Cập nhật dòng áo cùng giới tính hoặc dòng áo cuối cùng
      const targetIdx = prev.findIndex((o) => o.gender === gender);
      const idxToUpdate = targetIdx >= 0 ? targetIdx : prev.length - 1;
      return prev.map((item, idx) =>
        idx === idxToUpdate ? { ...item, gender, size } : item
      );
    });
  };

  const [copiedTextKey, setCopiedTextKey] = useState<string | null>(null);
  const [payerNameOverride, setPayerNameOverride] = useState<string>(
    currentMemberProfile?.fullName || currentUser?.displayName || ''
  );
  const [payerPhoneOverride, setPayerPhoneOverride] = useState<string>(
    currentMemberProfile?.zaloPhone || savedUserPhone || ''
  );
  const [registrantClassOverride, setRegistrantClassOverride] = useState<string>(
    currentMemberProfile?.className || ''
  );

  // Sync payerPhoneOverride & payerNameOverride with the logged-in user's account/profile
  useEffect(() => {
    if (!currentUser) {
      setPayerNameOverride('');
      setPayerPhoneOverride('');
      setRegistrantClassOverride('');
      setActiveRegisterEventId(null);
      return;
    }
    const profilePhone = currentMemberProfile?.zaloPhone || savedUserPhone || '';
    setPayerPhoneOverride((prev) => prev || profilePhone);
    const profileName = currentMemberProfile?.fullName || currentUser.displayName || '';
    setPayerNameOverride((prev) => prev || profileName);
    if (currentMemberProfile?.className) {
      setRegistrantClassOverride(currentMemberProfile.className);
    }
  }, [
    currentUser?.uid,
    currentUser?.displayName,
    currentMemberProfile?.zaloPhone,
    currentMemberProfile?.fullName,
    currentMemberProfile?.className,
    savedUserPhone,
  ]);

  // Sync form state whenever activeRegisterEventId opens for a registered user
  useEffect(() => {
    if (!activeRegisterEventId || !currentUser) return;
    const existingReg = userRegistrations[activeRegisterEventId];
    if (existingReg && existingReg.uid === currentUser.uid) {
      setAttendGalaChoice(
        existingReg.attendGala !== undefined ? existingReg.attendGala : true
      );
      if (existingReg.shirtOrders && existingReg.shirtOrders.length > 0) {
        setHasShirtBooking(true);
        setShirtOrders(existingReg.shirtOrders.map((o) => ({ ...o })));
      } else {
        setHasShirtBooking(false);
      }
      setRegistrationNote(existingReg.note || '');
      if (existingReg.customAnswers) {
        setCustomFieldValues(existingReg.customAnswers);
      }
      if (existingReg.fullName) {
        setPayerNameOverride(existingReg.fullName);
      }
      if (existingReg.className || existingReg.customAnswers?.className) {
        setRegistrantClassOverride(
          String(existingReg.className || existingReg.customAnswers?.className || '')
        );
      }
      if (existingReg.customAnswers?.zaloPhone || existingReg.customAnswers?.payerPhone) {
        setPayerPhoneOverride(
          String(existingReg.customAnswers.zaloPhone || existingReg.customAnswers.payerPhone)
        );
      }
    }
  }, [activeRegisterEventId, currentUser?.uid, userRegistrations]);

  // Inline Admin Payment, Bank & Fee Editor state right inside div:nth-of-type(3)
  const [editingPaymentEventId, setEditingPaymentEventId] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<{
    galaFeeAmount: number;
    shirtFeeAmount: number;
    bankName: string;
    bankAccount: string;
    bankAccountName: string;
    transferSyntaxPrefix: string;
    qrImageUrl: string;
  }>({
    galaFeeAmount: 350000,
    shirtFeeAmount: 110000,
    bankName: 'Vietcombank (Chi nhánh Đà Nẵng)',
    bankAccount: '1018 2026 88',
    bankAccountName: 'MANG LUOI ALUMNI KTD - BTC GALA',
    transferSyntaxPrefix: 'Gala',
    qrImageUrl: '',
  });
  const [isSavingPaymentInfo, setIsSavingPaymentInfo] = useState(false);
  const [paymentSaveSuccessMsg, setPaymentSaveSuccessMsg] = useState<string | null>(null);

  const handleOpenEditPayment = (event: EventRecord) => {
    if (editingPaymentEventId === event.id) {
      setEditingPaymentEventId(null);
      return;
    }
    setEditingPaymentEventId(event.id);
    setPaymentSaveSuccessMsg(null);
    const rawSuffix = event.transferSyntaxPrefix || 'Gala';
    setPaymentDraft({
      galaFeeAmount: event.galaFeeAmount ?? 350000,
      shirtFeeAmount: event.shirtFeeAmount ?? 110000,
      bankName: event.bankName || 'Vietcombank (Chi nhánh Đà Nẵng)',
      bankAccount: event.bankAccount || '1018 2026 88',
      bankAccountName: event.bankAccountName || 'MANG LUOI ALUMNI KTD - BTC GALA',
      transferSyntaxPrefix: rawSuffix.toUpperCase() === 'GALA KTD' ? 'Gala' : rawSuffix,
      qrImageUrl: event.qrImageUrl || '',
    });
  };

  const handleSavePaymentInfo = async (event: EventRecord) => {
    if (!onUpdateEvent || !currentUser?.isAdmin) return;
    setIsSavingPaymentInfo(true);
    setPaymentSaveSuccessMsg(null);
    try {
      await onUpdateEvent(event.id, {
        title: event.title,
        eventDate: event.eventDate,
        eventTime: event.eventTime,
        province: event.province,
        venue: event.venue,
        category: event.category,
        capacity: event.capacity,
        summary: event.summary,
        organizer: event.organizer,
        status: event.status,
        isGalaWithShirtFee: true,
        customFields: event.customFields,
        galaFeeAmount: Math.max(0, Number(paymentDraft.galaFeeAmount) || 0),
        shirtFeeAmount: Math.max(0, Number(paymentDraft.shirtFeeAmount) || 0),
        bankName: paymentDraft.bankName.trim() || 'Vietcombank (Chi nhánh Đà Nẵng)',
        bankAccount: paymentDraft.bankAccount.trim() || '1018 2026 88',
        bankAccountName: paymentDraft.bankAccountName.trim() || 'MANG LUOI ALUMNI KTD - BTC GALA',
        transferSyntaxPrefix: paymentDraft.transferSyntaxPrefix.trim() || 'Gala',
        qrImageUrl: '',
      });
      setPaymentSaveSuccessMsg('Đã lưu thông tin lệ phí, tài khoản ngân hàng & cập nhật mã VietQR động thành công!');
      setAdminToastMsg('Đã cập nhật thông tin Thanh toán & Mã VietQR tự động cho sự kiện!');
      setTimeout(() => {
        setPaymentSaveSuccessMsg(null);
        setEditingPaymentEventId(null);
      }, 1500);
    } finally {
      setIsSavingPaymentInfo(false);
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextKey(key);
    setTimeout(() => {
      setCopiedTextKey((current) => (current === key ? null : current));
    }, 2000);
  };

  // New field builder state for inline editor
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<EventCustomFieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptionsStr, setNewFieldOptionsStr] = useState('');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldError, setNewFieldError] = useState<string | null>(null);

  const PRESET_CUSTOM_FIELDS: { name: string; field: Omit<EventCustomField, 'id'> }[] = [
    {
      name: '+ Tham gia Gala (Trắc nghiệm)',
      field: {
        label: 'Đăng ký tham dự Đêm Gala Gặp mặt',
        type: 'radio',
        required: true,
        options: ['Có tham gia Gala', 'Không tham gia Gala'],
      },
    },
    {
      name: '+ Áo kỷ niệm (Hộp kiểm nhiều lựa chọn)',
      field: {
        label: 'Đăng ký áo đồng phục kỷ niệm sự kiện',
        type: 'multicheckbox',
        required: false,
        options: [
          'Áo Nam - Size L',
          'Áo Nam - Size XL',
          'Áo Nữ - Size M',
          'Áo Nữ - Size L',
        ],
      },
    },
    {
      name: '+ Đề xuất kiến nghị (Nhiều dòng)',
      field: {
        label: 'Ghi chú, đề xuất kiến nghị hoặc đăng ký tiết mục văn nghệ giao lưu',
        type: 'textarea',
        required: false,
        placeholder: 'Đóng góp ý tưởng, đề xuất chương trình hoặc đăng ký tiết mục...',
      },
    },
    {
      name: '+ Kích cỡ áo lưu niệm',
      field: {
        label: 'Kích cỡ áo đồng phục KTD kỷ niệm',
        type: 'select',
        required: false,
        options: ['Size S', 'Size M', 'Size L', 'Size XL', 'Size XXL'],
      },
    },
    {
      name: '+ Xe đưa đón',
      field: {
        label: 'Nhu cầu xe buýt đưa đón từ Sân bay / Khách sạn đến Trường',
        type: 'checkbox',
        required: false,
      },
    },
    {
      name: '+ Thuyết trình pitching (*)',
      field: {
        label: 'Đăng ký bài thuyết trình / pitching 5 phút về sản phẩm doanh nghiệp',
        type: 'select',
        required: true,
        options: ['Có, tôi đăng ký thuyết trình pitching', 'Không, tôi tham dự giao lưu tự do'],
      },
    },
    {
      name: '+ Bàn trưng bày B2B',
      field: {
        label: 'Nhu cầu đặt bàn trưng bày catalog & mẫu vật liệu (Kích thước 1.2m x 0.8m)',
        type: 'checkbox',
        required: false,
      },
    },
    {
      name: '+ Đăng ký tham luận',
      field: {
        label: 'Đăng ký phát biểu tham luận / chia sẻ kinh nghiệm chuyên môn',
        type: 'text',
        required: false,
        placeholder: 'Chủ đề tham luận...',
      },
    },
  ];

  const handleOpenConfigureFields = (event: EventRecord) => {
    if (configuringFieldsEventId === event.id) {
      setConfiguringFieldsEventId(null);
    } else {
      setConfiguringFieldsEventId(event.id);
      setActiveCustomFields(event.customFields ? [...event.customFields] : []);
      setCustomFieldSaveSuccess(null);
      setNewFieldError(null);
      setNewFieldLabel('');
      setNewFieldOptionsStr('');
      setNewFieldPlaceholder('');
      setNewFieldRequired(false);
      setNewFieldType('text');
    }
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) {
      setNewFieldError('Vui lòng nhập tên trường / câu hỏi.');
      return;
    }

    const fieldId = `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let parsedOptions: string[] | undefined = undefined;
    if (newFieldType === 'select' || newFieldType === 'radio' || newFieldType === 'multicheckbox') {
      parsedOptions = newFieldOptionsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parsedOptions.length === 0) {
        setNewFieldError('Vui lòng nhập ít nhất 1 tùy chọn cho phương án lựa chọn (phân tách bởi dấu phẩy).');
        return;
      }
    }

    const newF: EventCustomField = {
      id: fieldId,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      options: parsedOptions,
      placeholder: newFieldPlaceholder.trim() || undefined,
    };

    setActiveCustomFields((prev) => [...prev, newF]);
    setNewFieldLabel('');
    setNewFieldOptionsStr('');
    setNewFieldPlaceholder('');
    setNewFieldRequired(false);
    setNewFieldError(null);
  };

  const handleAddPreset = (preset: (typeof PRESET_CUSTOM_FIELDS)[0]) => {
    const fieldId = `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newF: EventCustomField = {
      id: fieldId,
      ...preset.field,
    };
    setActiveCustomFields((prev) => [...prev, newF]);
    setNewFieldError(null);
  };

  const handleToggleFieldRequired = (index: number) => {
    setActiveCustomFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, required: !f.required } : f))
    );
  };

  const handleRemoveCustomField = (index: number) => {
    setActiveCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveCustomFields = async (eventId: string) => {
    setIsSavingCustomFields(true);
    setCustomFieldSaveSuccess(null);
    try {
      if (onUpdateEventCustomFields) {
        await onUpdateEventCustomFields(eventId, activeCustomFields);
      }
      setCustomFieldSaveSuccess('Đã cập nhật các trường form đăng ký của sự kiện thành công!');
      setTimeout(() => setCustomFieldSaveSuccess(null), 3000);
    } finally {
      setIsSavingCustomFields(false);
    }
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

  const ATTENDEE_PAGE_SIZE = 20;
  const [isExportingExcel, setIsExportingExcel] = useState<string | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [viewingAttendeesEvent, setViewingAttendeesEvent] = useState<EventRecord | null>(null);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
  const [modalSmartFilter, setModalSmartFilter] = useState<AttendeeSmartFilterState>(
    DEFAULT_ATTENDEE_SMART_FILTER
  );
  const [attendeeModalPage, setAttendeeModalPage] = useState(1);
  const [inlineAttendeePages, setInlineAttendeePages] = useState<Record<string, number>>({});
  const [inlineAttendeeSearch, setInlineAttendeeSearch] = useState<Record<string, string>>({});
  const [inlineSmartFilters, setInlineSmartFilters] = useState<
    Record<string, AttendeeSmartFilterState>
  >({});
  const [collapsedRosterEvents, setCollapsedRosterEvents] = useState<Record<string, boolean>>({});

  // Admin inline registration & shirt size editor state
  const [editingAttendeeUid, setEditingAttendeeUid] = useState<string | null>(null);
  const [editingAttendeeName, setEditingAttendeeName] = useState<string>('');
  const [adminEditAttendGala, setAdminEditAttendGala] = useState<boolean>(true);
  const [adminEditShirtOrders, setAdminEditShirtOrders] = useState<EventShirtOrder[]>([]);
  const [adminEditPaymentStatus, setAdminEditPaymentStatus] = useState<'pending' | 'completed'>('pending');
  const [isSavingAdminEdit, setIsSavingAdminEdit] = useState(false);
  const [adminEditSuccessMsg, setAdminEditSuccessMsg] = useState<string | null>(null);

  // Admin Reset Registration & Single Delete State
  const [eventToReset, setEventToReset] = useState<EventRecord | null>(null);
  const [isResettingEvent, setIsResettingEvent] = useState(false);
  const [deletingAttendeeUid, setDeletingAttendeeUid] = useState<string | null>(null);

  // Admin 2 BTC Confirmation State
  const [showAdmin2AuthBox, setShowAdmin2AuthBox] = useState(false);
  const [admin2Username, setAdmin2Username] = useState('');
  const [admin2Password, setAdmin2Password] = useState('');
  const [admin2AuthError, setAdmin2AuthError] = useState<string | null>(null);
  const [isAdmin2Submitting, setIsAdmin2Submitting] = useState(false);
  const [pendingConfirmAttendee, setPendingConfirmAttendee] = useState<{
    eventId: string;
    uid: string;
    fullName: string;
    nextConfirmed: boolean;
  } | null>(null);
  const [togglingBtcUid, setTogglingBtcUid] = useState<string | null>(null);

  const canConfirmBtc = Boolean(
    currentUser?.canConfirmBtc ||
      currentUser?.adminRole === 'admin2'
  );

  const handleToggleBtcConfirmed = async (
    event: EventRecord,
    att: { uid: string; fullName: string; btcConfirmed?: boolean }
  ) => {
    // Thành viên thường chỉ có quyền xem, không được phép thao tác nút xác nhận
    if (!currentUser?.isAdmin && !canConfirmBtc) {
      return;
    }

    const nextConfirmed = !att.btcConfirmed;
    if (!canConfirmBtc) {
      if (currentUser?.isAdmin) {
        setPendingConfirmAttendee({
          eventId: event.id,
          uid: att.uid,
          fullName: att.fullName,
          nextConfirmed,
        });
        setShowAdmin2AuthBox(true);
        setAdmin2AuthError(
          `Chỉ tài khoản Admin 2 mới có quyền tích chọn "BTC đã xác nhận" cho đại biểu "${att.fullName}". Vui lòng đăng nhập bên dưới:`
        );
      }
      return;
    }

    if (!onAdminUpdateRegistration) return;
    setTogglingBtcUid(att.uid);
    try {
      await onAdminUpdateRegistration(event.id, att.uid, {
        btcConfirmed: nextConfirmed,
      });
      setAdminEditSuccessMsg(
        nextConfirmed
          ? `Đã tích chọn "BTC đã xác nhận" cho đại biểu "${att.fullName}" thành công!`
          : `Đã bỏ tích xác nhận BTC cho đại biểu "${att.fullName}".`
      );
      setTimeout(() => setAdminEditSuccessMsg(null), 4000);
    } finally {
      setTogglingBtcUid(null);
    }
  };

  const handleAdmin2InlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = admin2Username.trim();
    const password = admin2Password.trim();
    if (!username || !password) {
      setAdmin2AuthError('Vui lòng nhập đầy đủ tài khoản và mật khẩu Admin 2.');
      return;
    }

    if (onAdminLogin) {
      setIsAdmin2Submitting(true);
      try {
        const res = await onAdminLogin(username, password);
        if (!res.success) {
          setAdmin2AuthError(res.error || 'Xác thực không thành công.');
          return;
        }
      } catch (err: any) {
        setAdmin2AuthError(err?.message || 'Xác thực không thành công.');
        return;
      } finally {
        setIsAdmin2Submitting(false);
      }
    }

    setShowAdmin2AuthBox(false);
    setAdmin2Password('');
    setAdmin2AuthError(null);

    if (pendingConfirmAttendee && onAdminUpdateRegistration) {
      const target = pendingConfirmAttendee;
      setPendingConfirmAttendee(null);
      setTogglingBtcUid(target.uid);
      try {
        await onAdminUpdateRegistration(target.eventId, target.uid, {
          btcConfirmed: target.nextConfirmed,
        });
        setAdminEditSuccessMsg(
          `Đã xác thực tài khoản Admin 2 và đánh dấu "BTC đã xác nhận" cho đại biểu "${target.fullName}" thành công!`
        );
        setTimeout(() => setAdminEditSuccessMsg(null), 5000);
      } finally {
        setTogglingBtcUid(null);
      }
    } else {
      setAdminEditSuccessMsg(
        'Đã đăng nhập tài khoản Admin 2 (BTC) thành công! Bạn đã có quyền bấm nút Check "BTC đã xác nhận".'
      );
      setTimeout(() => setAdminEditSuccessMsg(null), 5000);
    }
  };

  const handleConfirmResetEvent = async () => {
    if (!eventToReset || !onResetEventRegistrations) return;
    setIsResettingEvent(true);
    try {
      const eventTitle = eventToReset.title;
      const ok = await onResetEventRegistrations(eventToReset.id);
      if (ok) {
        setExportSuccessMsg(`Đã reset toàn bộ đăng ký sự kiện "${eventTitle}" thành công! Số lượng đại biểu đã về 0.`);
        setEventToReset(null);
        setTimeout(() => setExportSuccessMsg(null), 6000);
      } else {
        alert('Không thể thực hiện reset đăng ký sự kiện.');
      }
    } catch (err: any) {
      console.error('Error resetting event registrations:', err);
      alert('Có lỗi xảy ra khi reset đăng ký: ' + (err?.message || ''));
    } finally {
      setIsResettingEvent(false);
    }
  };

  const handlePromptDeleteSingleRegistration = async (eventId: string, uid: string, name: string) => {
    if (!onDeleteSingleRegistration) return;
    if (!window.confirm(`Bạn có chắc chắn muốn hủy / xóa đăng ký của đại biểu "${name}" khỏi sự kiện này?`)) {
      return;
    }
    setDeletingAttendeeUid(uid);
    try {
      await onDeleteSingleRegistration(eventId, uid);
      setExportSuccessMsg(`Đã xóa đăng ký của đại biểu "${name}" thành công.`);
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error deleting single registration:', err);
      alert('Có lỗi xảy ra: ' + (err?.message || ''));
    } finally {
      setDeletingAttendeeUid(null);
    }
  };

  const handleExportExcel = async (event: EventRecord) => {
    setIsExportingExcel(event.id);
    try {
      const eventRegs = allEventRegistrations[event.id] || [];
      const attendees = buildEnrichedAttendeeList(event, members, userRegistrations, eventRegs);
      await exportEventRegistrationsToExcel(event, attendees);
      setExportSuccessMsg(`Đã xuất file Excel đăng ký cho "${event.title}" thành công (${attendees.length} đại biểu)!`);
      setTimeout(() => setExportSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Error exporting registrations to excel:', err);
      alert('Có lỗi xảy ra khi xuất file Excel.');
    } finally {
      setIsExportingExcel(null);
    }
  };

  const getEffectiveRegCount = (event: EventRecord) => {
    const rawUserReg = currentUser ? userRegistrations[event.id] : undefined;
    const userReg =
      rawUserReg && rawUserReg.uid === currentUser?.uid ? rawUserReg : undefined;
    const allRegs = allEventRegistrations[event.id];
    if (allRegs !== undefined) {
      const userInAll = userReg ? allRegs.some((r) => r.uid === userReg.uid) : false;
      return allRegs.length + (userReg && !userInAll ? 1 : 0);
    }
    return (event.registeredCount || 0) + (userReg ? 1 : 0);
  };

  useEffect(() => {
    setAttendeeModalPage(1);
  }, [viewingAttendeesEvent?.id, attendeeSearchQuery, modalSmartFilter]);

  const modalUnfilteredAttendees = useMemo(() => {
    if (!viewingAttendeesEvent) return [];
    const eventRegs = allEventRegistrations[viewingAttendeesEvent.id] || [];
    return buildEnrichedAttendeeList(viewingAttendeesEvent, members, userRegistrations, eventRegs);
  }, [viewingAttendeesEvent, members, userRegistrations, allEventRegistrations]);

  const modalAttendees = useMemo(() => {
    if (!viewingAttendeesEvent) return [];
    return filterAndSortAttendees(
      modalUnfilteredAttendees,
      viewingAttendeesEvent,
      modalSmartFilter
    );
  }, [modalUnfilteredAttendees, viewingAttendeesEvent, modalSmartFilter]);

  const totalModalAttendeePages = Math.max(
    1,
    Math.ceil(modalAttendees.length / ATTENDEE_PAGE_SIZE)
  );
  const safeAttendeeModalPage = Math.min(attendeeModalPage, totalModalAttendeePages);

  const paginatedModalAttendees = useMemo(() => {
    const startIdx = (safeAttendeeModalPage - 1) * ATTENDEE_PAGE_SIZE;
    return modalAttendees.slice(startIdx, startIdx + ATTENDEE_PAGE_SIZE);
  }, [modalAttendees, safeAttendeeModalPage, ATTENDEE_PAGE_SIZE]);

  const effectiveViewingRegCount = useMemo(() => {
    if (!viewingAttendeesEvent) return 0;
    const calcCount = getEffectiveRegCount(viewingAttendeesEvent);
    return Math.max(calcCount, modalUnfilteredAttendees.length);
  }, [viewingAttendeesEvent, modalUnfilteredAttendees.length, allEventRegistrations, userRegistrations]);

  const handleOpenAdminEditAttendee = (att: typeof modalAttendees[number]) => {
    setEditingAttendeeUid(att.uid);
    setEditingAttendeeName(att.fullName);
    setAdminEditAttendGala(att.attendGala ?? true);
    setAdminEditShirtOrders(
      att.shirtOrders && att.shirtOrders.length > 0
        ? att.shirtOrders.map((o) => ({ ...o }))
        : []
    );
    setAdminEditPaymentStatus(
      att.paymentStatus === 'Đã chuyển khoản' ? 'completed' : 'pending'
    );
    setAdminEditSuccessMsg(null);
    setTimeout(() => {
      const el = document.getElementById('admin-inline-attendee-editor');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const handleSaveAdminEditAttendee = async () => {
    if (!viewingAttendeesEvent || !editingAttendeeUid || !onAdminUpdateRegistration) return;
    setIsSavingAdminEdit(true);
    try {
      const galaFee =
        typeof viewingAttendeesEvent.galaFeeAmount === 'number'
          ? viewingAttendeesEvent.galaFeeAmount
          : 350000;
      const shirtUnitFee =
        typeof viewingAttendeesEvent.shirtFeeAmount === 'number'
          ? viewingAttendeesEvent.shirtFeeAmount
          : 110000;
      const validOrders = adminEditShirtOrders.filter((o) => o.quantity > 0);
      const totalShirts = validOrders.reduce((s, o) => s + o.quantity, 0);
      const recalculatedTotalFee =
        (adminEditAttendGala ? galaFee : 0) + totalShirts * shirtUnitFee;

      await onAdminUpdateRegistration(viewingAttendeesEvent.id, editingAttendeeUid, {
        attendGala: adminEditAttendGala,
        shirtOrders: validOrders,
        totalFee: recalculatedTotalFee,
        paymentStatus: adminEditPaymentStatus,
      });

      setAdminEditSuccessMsg(
        `Đã cập nhật size áo & thông tin đăng ký cho đại biểu "${editingAttendeeName}" thành công!`
      );
      setEditingAttendeeUid(null);
      setTimeout(() => setAdminEditSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error saving admin attendee edit:', err);
    } finally {
      setIsSavingAdminEdit(false);
    }
  };

  const handleConfirmRegistration = async (event: EventRecord) => {
    if (userRegistrations[event.id] && !currentUser?.isAdmin) {
      alert(
        'Đăng ký của bạn đã được chốt trên hệ thống. Chức năng tự chỉnh sửa đã được tắt theo quy định của Ban Tổ chức. Vui lòng liên hệ Admin cấp 1 (Ban Điều hành) để được hỗ trợ điều chỉnh.'
      );
      return;
    }

    const isGalaEvent = Boolean(
      event.isGalaWithShirtFee ||
      event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
      event.id === 'evt-gala-can-bo-doan'
    );

    // Validate required custom fields
    const errors: Record<string, string> = {};
    if (event.customFields && event.customFields.length > 0) {
      for (const field of event.customFields) {
        // If it's gala event, gala & shirt are handled by dedicated state
        if (isGalaEvent && (field.id === 'cf_attend_gala' || field.id === 'cf_uniform_shirt')) {
          continue;
        }

        if (field.required) {
          const val = customFieldValues[field.id];
          if (field.type === 'checkbox') {
            if (!val) {
              errors[field.id] = 'Vui lòng xác nhận trường bắt buộc này.';
            }
          } else if (field.type === 'multicheckbox') {
            const arr = Array.isArray(val) ? val : [];
            if (arr.length === 0) {
              errors[field.id] = 'Vui lòng chọn ít nhất một lựa chọn.';
            }
          } else {
            if (val === undefined || val === null || String(val).trim() === '') {
              errors[field.id] = 'Vui lòng điền câu trả lời cho trường bắt buộc này.';
            }
          }
        }
      }
    }

    const effectivePhone =
      payerPhoneOverride.trim() ||
      currentMemberProfile?.zaloPhone ||
      savedUserPhone ||
      '';
    const effectiveName =
      payerNameOverride.trim() ||
      currentMemberProfile?.fullName ||
      currentUser?.displayName ||
      '';
    const effectiveClass =
      registrantClassOverride.trim() ||
      currentMemberProfile?.className ||
      '';

    if (!effectiveName || effectiveName.length < 2) {
      errors['__payerName'] = 'Vui lòng nhập Họ và tên đại biểu đăng ký (*).';
    }
    const sanitizedPhone = effectivePhone.replace(/[\s.\-()]/g, '');
    if (!sanitizedPhone || sanitizedPhone.length < 9) {
      errors['__payerPhone'] = 'Vui lòng nhập Số điện thoại liên hệ hợp lệ (*).';
    }

    if (Object.keys(errors).length > 0) {
      setCustomFieldErrors(errors);
      return;
    }
    setCustomFieldErrors({});

    const unitGalaFee = event.galaFeeAmount ?? 350000;
    const unitShirtFee = event.shirtFeeAmount ?? 110000;
    const galaFee = isGalaEvent && attendGalaChoice ? unitGalaFee : 0;
    const finalShirtOrders = isGalaEvent && hasShirtBooking ? shirtOrders : [];
    const shirtFee = finalShirtOrders.reduce((sum, s) => sum + s.quantity * unitShirtFee, 0);
    const totalFee = isGalaEvent ? galaFee + shirtFee : 0;

    const regDetails = isGalaEvent
      ? {
          attendGala: attendGalaChoice,
          shirtOrders: finalShirtOrders,
          totalFee,
          payerPhone: sanitizedPhone || undefined,
          payerName: effectiveName || undefined,
        }
      : {
          payerPhone: sanitizedPhone || undefined,
          payerName: effectiveName || undefined,
        };

    const finalCustomAnswers: Record<string, any> = { ...customFieldValues };
    if (sanitizedPhone) {
      finalCustomAnswers['zaloPhone'] = sanitizedPhone;
    }
    if (effectiveClass) {
      finalCustomAnswers['className'] = effectiveClass;
    }
    if (isGalaEvent) {
      finalCustomAnswers['cf_attend_gala'] = attendGalaChoice
        ? `Có tham gia Đêm Gala (${unitGalaFee.toLocaleString('vi-VN')} VNĐ)`
        : 'Không tham gia Gala (0 VNĐ)';
      if (finalShirtOrders.length > 0) {
        finalCustomAnswers['cf_uniform_shirt'] = finalShirtOrders
          .map((s) => `Form ${s.gender} · Size ${s.size} (SL: ${s.quantity})`)
          .join(', ');
      } else {
        finalCustomAnswers['cf_uniform_shirt'] = 'Không đặt áo';
      }
      finalCustomAnswers['total_fee_display'] = `${totalFee.toLocaleString('vi-VN')} VNĐ`;
    }

    setIsRegistering(true);
    try {
      await onRegisterForEvent(event, registrationNote.trim(), finalCustomAnswers, regDetails);
      const registeredMemberName =
        effectiveName ||
        currentMemberProfile?.fullName ||
        currentUser?.displayName ||
        'Thành viên ALUMNI KTD';
      const shirtSummaryText = isGalaEvent
        ? finalShirtOrders.length > 0
          ? finalShirtOrders
              .map(
                (s) =>
                  `${s.quantity} áo Form ${s.gender} (Size ${
                    s.size === 'XXL' ? '2XL' : s.size
                  })`
              )
              .join(' + ')
          : 'Không đặt áo kỷ niệm'
        : undefined;

      setLastRegisteredEventTitle(event.title);
      setJustRegisteredNotice({
        eventId: event.id,
        eventTitle: event.title,
        memberName: registeredMemberName,
        memberClass: currentMemberProfile?.className || 'KTD',
        memberFaculty: currentMemberProfile?.faculty || 'Khoa Kiến trúc',
        memberPhone: effectivePhone,
        memberEmail: currentUser?.email || '',
        totalFee,
        attendGala: isGalaEvent ? attendGalaChoice : undefined,
        shirtSummary: shirtSummaryText,
      });

      // Chuyển về màn hình chính sự kiện (đóng form đăng ký đang mở) và cuộn tới thông báo đăng ký thành công
      setActiveRegisterEventId(null);
      setConfiguringFieldsEventId(null);
      setEventsFilterTab('upcoming');
      setTimeout(() => {
        const bannerEl = document.getElementById('event-registration-success-banner');
        if (bannerEl) {
          bannerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const cardEl = document.getElementById(`event-card-${event.id}`);
          cardEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } finally {
      setIsRegistering(false);
    }
  };

  const openCreateEventModal = () => {
    setEditorModalState({
      isOpen: true,
      mode: 'create',
      initialTab: 'info',
      event: null,
    });
  };

  const openEditEventModal = (
    event: EventRecord,
    tab: 'info' | 'registration' | 'preview' = 'info'
  ) => {
    setEditorModalState({
      isOpen: true,
      mode: 'edit',
      initialTab: tab,
      event,
    });
  };

  const handleEditorModalSave = async (input: EventFormInput) => {
    if (!currentUser?.isAdmin) return;
    if (editorModalState.mode === 'create') {
      await onCreateEvent(input);
      setAdminToastMsg(`Đã khởi tạo và xuất bản sự kiện "${input.title}" thành công!`);
    } else if (editorModalState.mode === 'edit' && editorModalState.event && onUpdateEvent) {
      await onUpdateEvent(editorModalState.event.id, input);
      setAdminToastMsg(`Đã lưu thay đổi cho sự kiện "${input.title}" thành công!`);
    }
    setTimeout(() => setAdminToastMsg(null), 5000);
  };

  const handleToggleEventStatus = async (event: EventRecord) => {
    if (!currentUser?.isAdmin || !onUpdateEvent) return;
    const nextStatus: 'open' | 'closed' = event.status === 'closed' ? 'open' : 'closed';
    setTogglingStatusEventId(event.id);
    try {
      await onUpdateEvent(event.id, {
        title: event.title,
        eventDate: event.eventDate,
        eventTime: event.eventTime,
        province: event.province,
        venue: event.venue,
        category: event.category,
        capacity: event.capacity,
        summary: event.summary,
        organizer: event.organizer,
        status: nextStatus,
        isGalaWithShirtFee: event.isGalaWithShirtFee,
        customFields: event.customFields,
        galaFeeAmount: event.galaFeeAmount,
        shirtFeeAmount: event.shirtFeeAmount,
        bankName: event.bankName,
        bankAccount: event.bankAccount,
        bankAccountName: event.bankAccountName,
        transferSyntaxPrefix: event.transferSyntaxPrefix,
        qrImageUrl: event.qrImageUrl,
      });
      setAdminToastMsg(
        nextStatus === 'open'
          ? `Đã mở lại đăng ký cho sự kiện "${event.title}".`
          : `Đã tạm đóng cổng đăng ký cho sự kiện "${event.title}".`
      );
      setTimeout(() => setAdminToastMsg(null), 4000);
    } finally {
      setTogglingStatusEventId(null);
    }
  };

  const handleConfirmDeleteEvent = async (event: EventRecord) => {
    if (!currentUser?.isAdmin || !onDeleteEvent) return;
    setIsDeletingEventId(event.id);
    try {
      await onDeleteEvent(event.id);
      setEventToDelete(null);
      setConfirmDeleteEventId(null);
      setAdminToastMsg(`Đã xóa sự kiện "${event.title}" khỏi hệ thống.`);
      setTimeout(() => setAdminToastMsg(null), 4000);
    } finally {
      setIsDeletingEventId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Architectural Crimson Hero & Admin Create Event CTA */}
      <section className="dau-crimson-hero rounded-2xl p-6 sm:p-8 lg:p-10 text-white shadow-lg space-y-5">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-200 flex items-center gap-2">
              <Compass className="w-4 h-4" />
              <span>04. LỊCH TRÌNH SỰ KIỆN · XÁC NHẬN & NHẮC LỊCH EMAIL TỰ ĐỘNG</span>
            </p>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Theo dòng Sự kiện ALUMNI KTD
            </h1>
            <p className="text-sm sm:text-base text-red-100/95 max-w-2xl leading-relaxed">
              Các chương trình họp mặt cựu sinh viên thường niên, hội thảo chuyên môn kiến trúc - xây dựng
              và kết nối đầu tư. Bắt buộc có tài khoản thành viên để đăng ký tham gia.
            </p>
          </div>

          {currentUser?.isAdmin && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={openCreateEventModal}
                className="px-4 py-2.5 bg-white text-[#9E1B20] text-sm font-bold rounded-lg hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Admin: Tạo Sự kiện Mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Account Requirement Notice if not logged in */}
        {!currentUser && (
          <div className="relative z-10 pt-4 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm text-red-100">
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
              <span>
                <strong>Quy định:</strong> Bắt buộc phải có tài khoản thành viên trên Mạng lưới
                ALUMNI KTD để đăng ký tham gia các sự kiện.
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigateToNetwork}
              className="px-3.5 py-2 bg-white text-[#9E1B20] text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>Đăng nhập / Cập nhật Hồ sơ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* Member Registration Success Banner on Main Event Screen */}
      {(justRegisteredNotice || lastRegisteredEventTitle) && (
        <div
          id="event-registration-success-banner"
          role="status"
          aria-live="polite"
          className="bg-emerald-50/95 border-2 border-emerald-500 rounded-2xl p-4 sm:p-6 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider bg-emerald-700 text-white rounded-md">
                    Đăng ký thành công
                  </span>
                  <span className="text-xs font-semibold text-emerald-800">
                    Đã ghi nhận trên hệ thống sự kiện
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-emerald-950 leading-snug">
                  Thành viên{' '}
                  <span className="text-[#9E1B20] underline decoration-[#9E1B20]/40 underline-offset-4">
                    {justRegisteredNotice?.memberName ||
                      currentMemberProfile?.fullName ||
                      currentUser?.displayName}
                  </span>{' '}
                  đã đăng ký tham gia sự kiện thành công!
                </h2>
                <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                  Sự kiện:{' '}
                  <strong className="font-bold text-slate-900">
                    {justRegisteredNotice?.eventTitle || lastRegisteredEventTitle}
                  </strong>
                  {justRegisteredNotice?.memberClass && (
                    <>
                      {' · '}Đơn vị:{' '}
                      <strong>
                        Lớp {justRegisteredNotice.memberClass} ({justRegisteredNotice.memberFaculty})
                      </strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setJustRegisteredNotice(null);
                setLastRegisteredEventTitle(null);
              }}
              aria-label="Đóng thông báo đăng ký thành công"
              className="p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-lg cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {justRegisteredNotice && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 sm:p-3.5 bg-white rounded-xl border border-emerald-200 text-xs">
              {justRegisteredNotice.attendGala !== undefined && (
                <div className="flex sm:flex-col justify-between gap-1">
                  <span className="text-slate-500 font-medium">Trạng thái tham dự Tiệc Gala:</span>
                  <span className="font-bold text-slate-900">
                    {justRegisteredNotice.attendGala ? 'Có tham dự Tiệc Gala' : 'Không tham dự Tiệc Gala'}
                  </span>
                </div>
              )}
              {justRegisteredNotice.shirtSummary && (
                <div className="flex sm:flex-col justify-between gap-1">
                  <span className="text-slate-500 font-medium">Đăng ký áo kỷ niệm:</span>
                  <span className="font-bold text-slate-900 text-right sm:text-left">
                    {justRegisteredNotice.shirtSummary}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-emerald-900">
              Hệ thống đã ghi nhận đơn đăng ký và gửi thư xác nhận tới email{' '}
              <strong className="text-[#9E1B20]">{currentUser?.email}</strong>.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              {onOpenMyTickets && (
                <button
                  type="button"
                  onClick={onOpenMyTickets}
                  className="min-h-[44px] px-4 py-2.5 sm:py-2 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs whitespace-nowrap"
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>Xem Đơn đăng ký & Mã QR Thanh toán</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenEmailOutbox}
                className="min-h-[44px] px-3.5 py-2.5 sm:py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs sm:text-sm font-semibold rounded-xl sm:rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Mail className="w-4 h-4 shrink-0 text-emerald-700" />
                <span>Mở Hộp thư Kiểm tra</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Export Success Toast */}
      {exportSuccessMsg && (
        <div
          role="status"
          className="bg-emerald-50 border-l-4 border-emerald-600 rounded-r-xl p-4 shadow-sm flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-900">
              {exportSuccessMsg}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExportSuccessMsg(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline shrink-0"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Admin Event Update / Create Toast */}
      {adminToastMsg && (
        <div
          role="status"
          className="bg-emerald-50 border-l-4 border-emerald-600 rounded-r-xl p-4 shadow-sm flex items-center justify-between gap-4 animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-bold text-emerald-900">
              {adminToastMsg}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdminToastMsg(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline shrink-0"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Event Filter & Member Personal Registrations Quick Access Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
        <div
          className={`grid ${
            currentUser ? 'grid-cols-2' : 'grid-cols-1'
          } sm:flex items-center gap-2 w-full sm:w-auto`}
        >
          <button
            type="button"
            onClick={() => setEventsFilterTab('upcoming')}
            className={`min-h-[42px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              eventsFilterTab === 'upcoming' || !currentUser
                ? 'bg-[#9E1B20] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Sự kiện sắp tới ({upcomingEvents.length})</span>
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={() => setEventsFilterTab('my_tickets')}
              className={`min-h-[42px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                eventsFilterTab === 'my_tickets'
                  ? 'bg-[#9E1B20] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">Đơn ĐK của tôi ({myRegisteredEvents.length})</span>
              <span className="hidden sm:inline">
                Đơn đăng ký & Sự kiện của tôi ({myRegisteredEvents.length})
              </span>
            </button>
          )}
        </div>

        {currentUser && myRegisteredEvents.length > 0 && onOpenMyTickets && (
          <button
            type="button"
            onClick={onOpenMyTickets}
            className="w-full sm:w-auto min-h-[42px] text-xs sm:text-sm font-bold text-[#9E1B20] bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-lg border border-[#9E1B20]/20 flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span>Xem Đơn đăng ký & Mã QR Thanh toán ({myRegisteredEvents.length})</span>
          </button>
        )}
      </div>

      {/* Architectural Events Timeline List */}
      <section className="space-y-6">
        {displayedEvents.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white border border-dashed border-slate-200 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0F172A]">
                {eventsFilterTab === 'my_tickets'
                  ? 'Bạn chưa đăng ký tham gia sự kiện nào'
                  : 'Không có sự kiện sắp tới'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {eventsFilterTab === 'my_tickets'
                  ? 'Hãy chuyển sang tab "Sự kiện sắp tới" để lựa chọn và đăng ký tham gia sự kiện.'
                  : 'Hiện tại chưa có sự kiện mới được mở đăng ký. Vui lòng quay lại sau!'}
              </p>
            </div>
            {eventsFilterTab === 'my_tickets' && (
              <button
                type="button"
                onClick={() => setEventsFilterTab('upcoming')}
                className="px-4 py-2 bg-[#9E1B20] text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#7D1418] cursor-pointer"
              >
                Xem các sự kiện sắp tới
              </button>
            )}
          </div>
        ) : (
          displayedEvents.map((event, idx) => {
            const userReg = currentUser ? userRegistrations[event.id] : undefined;
            const isRegistered = Boolean(
              currentUser && userReg && userReg.uid === currentUser.uid
            );
            const isFormLockedForMember = Boolean(isRegistered && !currentUser?.isAdmin);
            const isPanelOpen = Boolean(currentUser && activeRegisterEventId === event.id);
          const dateObj = new Date(event.eventDate);
          const day = dateObj.getDate() || 28;
          const month = dateObj.getMonth() + 1 || 11;
          const year = dateObj.getFullYear() || 2026;
          const effectiveRegCount = getEffectiveRegCount(event);
          const capacityPercent = Math.min(
            100,
            Math.round((effectiveRegCount / Math.max(event.capacity, 1)) * 100)
          );

          return (
            <article
              key={event.id}
              id={`event-card-${event.id}`}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden dau-card-hover group"
            >
              <div className="h-1.5 w-full bg-[#9E1B20]" aria-hidden="true" />

              <div className="p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                {/* Inline Member Registration Status Notice on Main Event Screen */}
                {isRegistered && !isPanelOpen && currentUser && (
                  <div className="p-3 sm:p-4 bg-emerald-50/90 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm">
                    <div className="flex items-start sm:items-center gap-2.5 text-emerald-950">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                      <span>
                        Thành viên{' '}
                        <strong className="font-bold text-[#9E1B20]">
                          {userReg?.fullName ||
                            currentMemberProfile?.fullName ||
                            currentUser.displayName}
                        </strong>{' '}
                        đã đăng ký tham gia sự kiện này thành công.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveRegisterEventId(event.id)}
                      className="min-h-[40px] px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#9E1B20]" />
                      <span>Chi tiết Đơn ĐK & Mã QR</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 sm:gap-6">
                  {/* Solid Crimson Date Monolith + Event Content */}
                  <div className="flex flex-col sm:flex-row items-start gap-3.5 sm:gap-6 flex-1 min-w-0">
                    {/* Solid DAU Crimson Date Block (Clean, anti-overflow responsive layout) */}
                    {/* Mobile (< sm): Clean horizontal bar */}
                    <div className="flex sm:hidden items-center justify-between w-full px-4 py-2.5 rounded-xl bg-[#9E1B20] text-white shadow-sm">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-100">
                        Tháng {month}, {year}
                      </span>
                      <span className="text-base font-extrabold tabular-nums">
                        Ngày {day}
                      </span>
                    </div>

                    {/* Tablet/Desktop (sm+): Compact elegant calendar badge */}
                    <div className="hidden sm:flex flex-col items-center justify-center w-20 min-w-[80px] rounded-xl bg-[#9E1B20] text-white shrink-0 text-center shadow-sm py-2 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-100 leading-none">
                        THÁNG {month}
                      </span>
                      <span className="text-3xl font-black tabular-nums leading-tight my-1 text-white">
                        {day}
                      </span>
                      <span className="text-[11px] font-medium text-red-200 tabular-nums leading-none">
                        {year}
                      </span>
                    </div>

                    <div className="space-y-2.5 sm:space-y-3 flex-1 min-w-0 w-full">
                      {/* Unboxed Metadata Line */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-bold text-[#9E1B20]">
                          0{idx + 1}. {event.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.eventTime}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-[#9E1B20]" />
                          <span>{event.province}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            isRegistered
                              ? 'text-emerald-700'
                              : event.status === 'closed'
                                ? 'text-slate-500'
                                : 'text-[#9E1B20]'
                          }`}
                        >
                          {isRegistered
                            ? 'Đã đăng ký tham dự'
                            : event.status === 'closed'
                              ? 'Tạm đóng đăng ký'
                              : 'Đang mở đăng ký'}
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] leading-snug group-hover:text-[#9E1B20] transition-colors">
                        {event.title}
                      </h2>

                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                        {event.summary}
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                        <div>
                          <span className="text-slate-500">Địa điểm: </span>
                          <span className="font-semibold text-[#0F172A]">{event.venue}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Đơn vị tổ chức: </span>
                          <span className="font-semibold text-[#0F172A]">{event.organizer}</span>
                        </div>
                      </div>

                      {/* Capacity Progress Bar */}
                      <div className="pt-2 max-w-sm space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Tiến độ đại biểu đăng ký:</span>
                          <span className="font-semibold text-[#9E1B20] tabular-nums">
                            {effectiveRegCount} / {event.capacity} chỗ ({capacityPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#9E1B20] rounded-full transition-all"
                            style={{ width: `${capacityPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Attendee Roster, Excel Export & Pin to Home Actions */}
                      <div className="pt-2 flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAttendeeSearchQuery('');
                            setModalSmartFilter(DEFAULT_ATTENDEE_SMART_FILTER);
                            setViewingAttendeesEvent(event);
                          }}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          title="Xem danh sách chi tiết các đại biểu và cựu sinh viên đã đăng ký tham gia sự kiện"
                        >
                          <Users className="w-3.5 h-3.5 text-[#9E1B20]" />
                          <span>Danh sách đại biểu ({effectiveRegCount})</span>
                        </button>
                        {currentUser?.isAdmin && (
                          <button
                            type="button"
                            disabled={isExportingExcel === event.id}
                            onClick={() => handleExportExcel(event)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
                            title="Tải toàn bộ dữ liệu đăng ký theo sự kiện ra file Excel (.xlsx) chuẩn chỉnh, khoa học (Chỉ dành cho Quản trị viên)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isExportingExcel === event.id ? 'Đang xuất Excel...' : 'Xuất file Excel (.xlsx)'}</span>
                          </button>
                        )}
                        {currentUser?.isAdmin && onTogglePinEvent && (
                          <button
                            type="button"
                            onClick={() => onTogglePinEvent(event.id)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                              pinnedEventIds.includes(event.id)
                                ? 'bg-[#9E1B20] text-white border-[#9E1B20] hover:bg-[#7D1418]'
                                : 'bg-white hover:bg-red-50 text-slate-700 hover:text-[#9E1B20] border-slate-300'
                            }`}
                            title={
                              pinnedEventIds.includes(event.id)
                                ? 'Bỏ ghim sự kiện này khỏi Trang chủ'
                                : 'Ghim sự kiện này lên Trang chủ'
                            }
                          >
                            <Pin className="w-3.5 h-3.5" />
                            <span>
                              {pinnedEventIds.includes(event.id)
                                ? 'Đã ghim Trang chủ'
                                : 'Ghim lên Trang chủ'}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Dedicated Admin Event Control Bar */}
                      {currentUser?.isAdmin && (
                        <div className="mt-3 p-3 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E1B20] bg-red-50 border border-red-200 px-2 py-1 rounded-md">
                              Quản trị Sự kiện
                            </span>
                            <button
                              type="button"
                              onClick={() => openEditEventModal(event, 'info')}
                              className="px-3 py-1.5 bg-white hover:bg-red-50 text-slate-800 hover:text-[#9E1B20] border border-slate-300 hover:border-[#9E1B20]/40 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              title="Chỉnh sửa thông tin sự kiện (Tên, ngày giờ, địa điểm, số lượng đại biểu, mô tả)"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#9E1B20]" />
                              <span>Chỉnh sửa Sự kiện</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveRegisterEventId(event.id);
                                if (editingPaymentEventId !== event.id) {
                                  handleOpenEditPayment(event);
                                }
                                setTimeout(() => {
                                  const el = document.getElementById(
                                    `admin-fee-payment-editor-${event.id}`
                                  );
                                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 120);
                              }}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#9E1B20] border border-amber-300 text-xs font-extrabold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              title="Tùy chỉnh Giá tiệc Gala và Giá áo tham gia sự kiện trên Form đăng ký"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-[#9E1B20]" />
                              <span>Tùy chỉnh Giá tiệc & Giá áo</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditEventModal(event, 'registration')}
                              className="px-3 py-1.5 bg-white hover:bg-red-50 text-slate-800 hover:text-[#9E1B20] border border-slate-300 hover:border-[#9E1B20]/40 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              title="Thiết kế & điều chỉnh các câu hỏi khảo sát, đặt áo đồng phục, lệ phí Gala trong Form Đăng ký"
                            >
                              <Sliders className="w-3.5 h-3.5 text-[#9E1B20]" />
                              <span>
                                Thiết kế Form Đăng ký (
                                {(event.customFields?.length || 0) +
                                  (event.isGalaWithShirtFee ||
                                  event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
                                  event.id === 'evt-gala-can-bo-doan'
                                    ? 2
                                    : 0)}{' '}
                                mục)
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditEventModal(event, 'preview')}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Xem trước giao diện Form Đăng ký của sự kiện này"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Xem trước Form</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {onUpdateEvent && (
                              <button
                                type="button"
                                disabled={togglingStatusEventId === event.id}
                                onClick={() => handleToggleEventStatus(event)}
                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                                  event.status === 'closed'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                }`}
                                title={
                                  event.status === 'closed'
                                    ? 'Mở lại cổng đăng ký cho đại biểu'
                                    : 'Tạm đóng cổng đăng ký của sự kiện này'
                                }
                              >
                                {event.status === 'closed' ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Mở lại đăng ký</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Tạm đóng ĐK</span>
                                  </>
                                )}
                              </button>
                            )}

                            {onResetEventRegistrations && (
                              <button
                                type="button"
                                onClick={() => setEventToReset(event)}
                                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-[#9E1B20] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Reset đưa toàn bộ số lượng và danh sách đăng ký của sự kiện này về 0"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-[#9E1B20]" />
                                <span>Reset Đăng ký</span>
                              </button>
                            )}

                            {onDeleteEvent && (
                              <button
                                type="button"
                                onClick={() => setEventToDelete(event)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                title="Xóa sự kiện này (Yêu cầu xác nhận an toàn)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action Column */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0 pt-3.5 lg:pt-0 border-t lg:border-t-0 border-slate-200 w-full lg:w-auto">
                    {isRegistered ? (
                      <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 w-full">
                        <div className="text-xs sm:text-sm font-bold text-emerald-700 flex items-center justify-center sm:justify-start lg:justify-end gap-1.5 whitespace-nowrap bg-emerald-50 sm:bg-transparent py-1.5 px-3 sm:p-0 rounded-lg border border-emerald-200 sm:border-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Đã xác nhận đăng ký</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentUser) return;
                            const nextId = isPanelOpen ? null : event.id;
                            setActiveRegisterEventId(nextId);
                          }}
                          className="min-h-[44px] px-4 py-2.5 sm:py-2 bg-[#9E1B20] hover:bg-[#7D1418] active:bg-[#5E0D10] text-white text-xs sm:text-sm font-bold rounded-xl sm:rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs w-full sm:w-auto"
                        >
                          <QrCode className="w-4 h-4 shrink-0" />
                          <span>
                            {isPanelOpen
                              ? 'Ẩn Đơn đăng ký & Mã QR'
                              : currentUser?.isAdmin
                                ? 'Xem Mã QR / Sửa ĐK (Admin cấp 1)'
                                : 'Xem Đơn đăng ký & Mã QR Thanh toán'}
                          </span>
                        </button>
                        {onOpenMyTickets && (
                          <button
                            type="button"
                            onClick={onOpenMyTickets}
                            className="min-h-[42px] px-3.5 py-2 sm:py-1.5 bg-red-50 hover:bg-red-100 text-[#9E1B20] border border-red-200 text-xs font-semibold rounded-xl sm:rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap w-full sm:w-auto"
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span>Mở Phiếu Đơn ĐK & QR Cá nhân</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownloadIcs(event)}
                          className="text-xs text-slate-500 hover:text-[#9E1B20] hover:underline flex items-center justify-center gap-1 cursor-pointer transition-colors py-1"
                          title="Thêm sự kiện vào Google Calendar / Apple Calendar"
                        >
                          <Download className="w-3 h-3 text-slate-400" />
                          <span>Lưu vào Lịch (.ics)</span>
                        </button>
                      </div>
                    ) : event.status === 'closed' ? (
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-4 py-2.5 bg-slate-100 text-slate-600 border border-slate-300 text-sm font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap">
                          <Lock className="w-4 h-4 text-slate-500" />
                          <span>Đã tạm đóng cổng đăng ký</span>
                        </span>
                        {currentUser?.isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleEventStatus(event)}
                            className="text-xs font-semibold text-[#9E1B20] hover:underline cursor-pointer"
                          >
                            Mở lại đăng ký (Admin)
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentUser) {
                            setPendingLoginRegisterEventId(event.id);
                            if (onGoogleLogin) {
                              void onGoogleLogin();
                            } else {
                              onNavigateToNetwork();
                            }
                            return;
                          }
                          const nextId = isPanelOpen ? null : event.id;
                          setActiveRegisterEventId(nextId);
                          setCustomFieldErrors({});
                          if (nextId) {
                            setAttendGalaChoice(true);
                            setHasShirtBooking(true);
                            setShirtOrders([{ id: 'shirt-1', gender: 'Nam', size: 'XL', quantity: 1 }]);

                            const initialVals: Record<string, any> = {};
                            if (event.customFields) {
                              for (const f of event.customFields) {
                                if (f.type === 'checkbox') {
                                  initialVals[f.id] = false;
                                } else if (f.type === 'multicheckbox') {
                                  initialVals[f.id] = [];
                                } else if (f.type === 'radio' && f.options && f.options.length > 0) {
                                  initialVals[f.id] = f.options[0];
                                } else {
                                  initialVals[f.id] = '';
                                }
                              }
                            }
                            setCustomFieldValues(initialVals);
                          }
                        }}
                        className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-[#9E1B20] text-white text-sm font-semibold rounded-xl sm:rounded-lg hover:bg-[#7D1418] active:bg-[#5E0D10] transition-colors cursor-pointer whitespace-nowrap shadow-sm flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4 shrink-0" />
                        <span>
                          {currentUser
                            ? 'Đăng ký tham gia sự kiện'
                            : 'Đăng nhập để đăng ký'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Event-Specific Multi-Option Statistics Dashboard when accessing the event */}
                {hasMultiChoiceEventForm(event) && (
                  <div className="pt-3 border-t border-slate-100">
                    <EventStatsDashboard
                      event={event}
                      attendees={buildEnrichedAttendeeList(
                        event,
                        members,
                        userRegistrations,
                        allEventRegistrations[event.id] || []
                      )}
                      compact
                    />
                  </div>
                )}

                {/* Expanded Multi-Page Participant Roster directly on the Event Card (20 people per page) with Smart Filter */}
                {(() => {
                  const cardAllAttendees = buildEnrichedAttendeeList(
                    event,
                    members,
                    userRegistrations,
                    allEventRegistrations[event.id] || []
                  );
                  const activeCardFilter =
                    inlineSmartFilters[event.id] || DEFAULT_ATTENDEE_SMART_FILTER;
                  const cardFilteredAttendees = filterAndSortAttendees(
                    cardAllAttendees,
                    event,
                    activeCardFilter
                  );
                  const cardTotalPages = Math.max(
                    1,
                    Math.ceil(cardFilteredAttendees.length / ATTENDEE_PAGE_SIZE)
                  );
                  const cardCurrentPage = Math.min(
                    inlineAttendeePages[event.id] || 1,
                    cardTotalPages
                  );
                  const cardStartIdx = (cardCurrentPage - 1) * ATTENDEE_PAGE_SIZE;
                  const cardPaginatedAttendees = cardFilteredAttendees.slice(
                    cardStartIdx,
                    cardStartIdx + ATTENDEE_PAGE_SIZE
                  );
                  const isRosterCollapsed = Boolean(collapsedRosterEvents[event.id]);

                  return (
                    <div className="pt-3.5 border-t border-slate-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/90 px-3.5 py-2.5 rounded-xl border border-slate-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <Users className="w-4 h-4 text-[#9E1B20] shrink-0" />
                          <h3 className="text-xs sm:text-sm font-bold text-[#0F172A]">
                            Danh sách đăng ký tham gia ({cardAllAttendees.length} người)
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 tabular-nums">
                            {ATTENDEE_PAGE_SIZE} người/trang · Trang {cardCurrentPage}/{cardTotalPages}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAttendeeSearchQuery('');
                              setModalSmartFilter(activeCardFilter);
                              setViewingAttendeesEvent(event);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-[#9E1B20] bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Mở rộng toàn màn hình
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedRosterEvents((prev) => ({
                                ...prev,
                                [event.id]: !prev[event.id],
                              }))
                            }
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          >
                            {isRosterCollapsed ? (
                              <>
                                <span>Hiển thị danh sách</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                <span>Thu gọn</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {!isRosterCollapsed && (
                        <>
                          {cardAllAttendees.length > 0 && (
                            <EventAttendeeSmartFilterBar
                              event={event}
                              allAttendees={cardAllAttendees}
                              filteredCount={cardFilteredAttendees.length}
                              filter={activeCardFilter}
                              onChange={(nextFilter) => {
                                setInlineSmartFilters((prev) => ({
                                  ...prev,
                                  [event.id]: nextFilter,
                                }));
                                setInlineAttendeePages((prev) => ({
                                  ...prev,
                                  [event.id]: 1,
                                }));
                              }}
                              compact
                            />
                          )}

                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs text-slate-700">
                                <thead className="bg-slate-100 text-slate-800 uppercase font-semibold text-[11px] border-b border-slate-200">
                                  <tr>
                                    <th className="px-3 py-2.5 w-12 text-center">STT</th>
                                    <th className="px-3 py-2.5">Họ và tên</th>
                                    <th className="px-3 py-2.5">Lớp &amp; Khoa</th>
                                    <th className="px-3 py-2.5">SĐT (Bảo mật)</th>
                                    <th className="px-3 py-2.5">Nội dung đăng ký</th>
                                    <th className="px-3 py-2.5 text-center">BTC đã xác nhận</th>
                                    {currentUser?.isAdmin && (
                                      <th className="px-3 py-2.5 text-center">Quản trị</th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                  {cardPaginatedAttendees.length === 0 ? (
                                    <tr>
                                      <td colSpan={currentUser?.isAdmin ? 7 : 6} className="px-4 py-6 text-center text-slate-500">
                                        {!currentUser
                                          ? 'Vui lòng đăng nhập tài khoản Thành viên để xem danh sách chi tiết người đăng ký.'
                                          : hasActiveSmartFilters(activeCardFilter)
                                            ? 'Không tìm thấy đại biểu nào khớp với điều kiện Bộ lọc thông minh hiện tại.'
                                            : 'Chưa có đại biểu nào đăng ký tham gia sự kiện này.'}
                                      </td>
                                    </tr>
                                ) : (
                                  cardPaginatedAttendees.map((att) => (
                                    <tr key={att.uid || att.stt} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="px-3 py-2.5 text-slate-500 font-mono text-center tabular-nums">
                                        {att.stt}
                                      </td>
                                      <td className="px-3 py-2.5 font-bold text-slate-900">
                                        {att.fullName}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <span className="font-semibold text-[#9E1B20]">
                                          {att.className || 'KTD'}
                                        </span>
                                        {att.faculty && (
                                          <span className="text-slate-500 text-[11px] ml-1">
                                            ({att.faculty})
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                                        {formatSafeAttendeePhone(
                                          att.phone,
                                          members.find((m) => m.uid === att.uid)?.zaloPhoneMasked
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="flex flex-wrap items-center gap-1 max-w-[280px]">
                                          {att.attendGala !== undefined && (
                                            <span
                                              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                                att.attendGala
                                                  ? 'bg-red-50 text-[#9E1B20] border border-red-200'
                                                  : 'bg-slate-100 text-slate-600'
                                              }`}
                                            >
                                              Gala: {att.attendGala ? 'Có' : 'Không'}
                                            </span>
                                          )}
                                          {att.shirtOrders &&
                                            att.shirtOrders.map((ord, oIdx) => (
                                              <span
                                                key={`${ord.id}-${oIdx}`}
                                                className="text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded"
                                              >
                                                {ord.quantity}x Áo {ord.gender} (
                                                {ord.size === 'XXL' ? '2XL' : ord.size})
                                              </span>
                                            ))}
                                          {att.attendGala === undefined &&
                                            (!att.shirtOrders || att.shirtOrders.length === 0) && (
                                              <span className="text-slate-500 text-[11px]">Tham dự</span>
                                            )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                        {currentUser?.isAdmin || canConfirmBtc ? (
                                          <button
                                            type="button"
                                            disabled={togglingBtcUid === att.uid}
                                            onClick={() => handleToggleBtcConfirmed(event, att)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                                              att.btcConfirmed
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                                                : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-300'
                                            }`}
                                          >
                                            <span>{att.btcConfirmed ? '✓ BTC đã xác nhận' : 'Chờ xác nhận'}</span>
                                          </button>
                                        ) : att.btcConfirmed ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            ✓ BTC đã xác nhận
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                            Chờ BTC xác nhận
                                          </span>
                                        )}
                                      </td>
                                      {currentUser?.isAdmin && (
                                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                          <div className="flex items-center justify-center gap-1.5">
                                            {onAdminUpdateRegistration && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setModalSmartFilter(activeCardFilter);
                                                  setViewingAttendeesEvent(event);
                                                  handleOpenAdminEditAttendee(att);
                                                }}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9E1B20] bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer"
                                                title="Chỉnh sửa Size Áo / Đăng ký của đại biểu này"
                                              >
                                                <Edit3 className="w-3 h-3" />
                                                <span>Sửa</span>
                                              </button>
                                            )}
                                            {onDeleteSingleRegistration && (
                                              <button
                                                type="button"
                                                disabled={deletingAttendeeUid === att.uid}
                                                onClick={() =>
                                                  handlePromptDeleteSingleRegistration(
                                                    event.id,
                                                    att.uid,
                                                    att.fullName
                                                  )
                                                }
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                                                title="Hủy đăng ký đại biểu này"
                                              >
                                                <Trash2 className="w-3 h-3 text-red-600" />
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Multi-Page Pagination Bar (20 people per page) */}
                          {cardFilteredAttendees.length > 0 && (
                            <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600">
                              <div>
                                Hiển thị{' '}
                                <strong className="text-slate-900 font-semibold tabular-nums">
                                  {cardStartIdx + 1} –{' '}
                                  {Math.min(
                                    cardStartIdx + ATTENDEE_PAGE_SIZE,
                                    cardFilteredAttendees.length
                                  )}
                                </strong>{' '}
                                trên tổng số{' '}
                                <strong className="text-slate-900 font-semibold tabular-nums">
                                  {cardFilteredAttendees.length}
                                </strong>{' '}
                                người tham gia ({ATTENDEE_PAGE_SIZE} người/trang)
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={cardCurrentPage === 1}
                                  onClick={() =>
                                    setInlineAttendeePages((prev) => ({
                                      ...prev,
                                      [event.id]: Math.max(1, cardCurrentPage - 1),
                                    }))
                                  }
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                  Trước
                                </button>
                                {Array.from({ length: cardTotalPages }, (_, i) => i + 1).map(
                                  (pNum) => (
                                    <button
                                      key={pNum}
                                      type="button"
                                      onClick={() =>
                                        setInlineAttendeePages((prev) => ({
                                          ...prev,
                                          [event.id]: pNum,
                                        }))
                                      }
                                      className={`w-7 h-7 text-xs font-bold rounded-lg transition-colors cursor-pointer tabular-nums ${
                                        cardCurrentPage === pNum
                                          ? 'bg-[#9E1B20] text-white shadow-2xs'
                                          : 'border border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {pNum}
                                    </button>
                                  )
                                )}
                                <button
                                  type="button"
                                  disabled={cardCurrentPage === cardTotalPages}
                                  onClick={() =>
                                    setInlineAttendeePages((prev) => ({
                                      ...prev,
                                      [event.id]: Math.min(cardTotalPages, cardCurrentPage + 1),
                                    }))
                                  }
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                  Sau
                                </button>
                              </div>
                            </div>
                          )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Inline Registration & Personal QR Payment Form (Strictly for Authenticated Member) */}
                {isPanelOpen && currentUser && (
                  <div className="pt-4 sm:pt-5 border-t border-slate-200 bg-slate-50/90 rounded-xl p-2.5 sm:p-5 space-y-3.5 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-[#9E1B20]" />
                          <span>
                            {isRegistered
                              ? 'Đơn Đăng ký Tham gia & Mã QR Thanh toán Cá nhân'
                              : 'Đăng ký Tham gia Sự kiện & Nhận Mã QR Thanh toán'}
                          </span>
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">
                          Định danh thành viên:{' '}
                          <strong className="text-[#0F172A] font-semibold">
                            {(isRegistered && userReg?.fullName) ||
                              currentMemberProfile?.fullName ||
                              currentUser.displayName}
                          </strong>
                          {' · '}Email xác thực:{' '}
                          <span className="text-[#9E1B20] font-semibold">
                            {currentUser.email}
                          </span>
                        </p>
                      </div>

                      {currentUser.isAdmin && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                          {Boolean(
                            event.isGalaWithShirtFee ||
                            event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
                            event.id === 'evt-gala-can-bo-doan'
                          ) && (
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenEditPayment(event);
                                setTimeout(() => {
                                  const el = document.getElementById(`admin-fee-payment-editor-${event.id}`);
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 80);
                              }}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#9E1B20] border border-red-200 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Tùy chỉnh Giá tiệc & Giá áo</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditEventModal(event, 'registration')}
                            className="px-3 py-1.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Trình Thiết kế Form Trực quan (Admin)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenConfigureFields(event)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-300 shadow-2xs"
                          >
                            <Settings2 className="w-3.5 h-3.5 text-[#9E1B20]" />
                            <span>
                              {configuringFieldsEventId === event.id
                                ? 'Đóng sửa nhanh'
                                : 'Sửa nhanh tại chỗ'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Admin Custom Fields Builder Panel */}
                    {currentUser.isAdmin && configuringFieldsEventId === event.id && (
                      <div className="p-4 bg-white border-2 border-red-200/80 rounded-xl space-y-4 shadow-sm animate-in fade-in duration-200">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-red-50 text-[#9E1B20] rounded-md">
                              <Settings2 className="w-4 h-4" />
                            </span>
                            <h4 className="text-sm font-bold text-[#0F172A]">
                              Cấu hình trường đăng ký · {event.title}
                            </h4>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">
                            {activeCustomFields.length} trường hiện có
                          </span>
                        </div>

                        {customFieldSaveSuccess && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{customFieldSaveSuccess}</span>
                          </div>
                        )}

                        {/* Current fields list */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-700">
                            Danh sách các câu hỏi / trường dữ liệu hiện tại trong Form:
                          </p>
                          {activeCustomFields.length === 0 ? (
                            <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                              Chưa có trường tùy chỉnh nào. Bạn có thể chọn nhanh từ các mẫu gợi ý bên dưới hoặc tự thêm trường mới.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {activeCustomFields.map((field, idx) => (
                                <div
                                  key={field.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                >
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                                      {idx + 1}
                                    </span>
                                    <div className="min-w-0 space-y-0.5">
                                      <p className="font-semibold text-slate-900 truncate">
                                        {field.label}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                        <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-medium">
                                          {field.type === 'text' && 'Văn bản ngắn'}
                                          {field.type === 'select' && `Lựa chọn (${field.options?.join(', ') || ''})`}
                                          {field.type === 'checkbox' && 'Hộp kiểm Có/Không'}
                                          {field.type === 'textarea' && 'Đoạn văn dài'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleFieldRequired(idx)}
                                      className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer border transition-colors ${
                                        field.required
                                          ? 'bg-red-50 text-[#9E1B20] border-red-200 hover:bg-red-100'
                                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                      title="Bấm để chuyển đổi giữa Bắt buộc và Không bắt buộc"
                                    >
                                      {field.required ? '★ Bắt buộc' : '○ Tùy chọn'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCustomField(idx)}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-colors"
                                      title="Xóa trường này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Quick preset suggestions */}
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] font-semibold text-slate-500">
                            Thêm nhanh từ mẫu câu hỏi phổ biến:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {PRESET_CUSTOM_FIELDS.map((preset) => (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => handleAddPreset(preset)}
                                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-red-50 hover:text-[#9E1B20] hover:border-red-200 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Add new field builder */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                          <p className="text-xs font-bold text-slate-800">
                            + Thêm trường câu hỏi mới tùy chỉnh:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                            <div className="sm:col-span-6 space-y-1">
                              <label className="text-[11px] font-semibold text-slate-600">
                                Tên câu hỏi / Tiêu đề trường (*)
                              </label>
                              <input
                                type="text"
                                placeholder="Ví dụ: Kích cỡ áo đồng phục, Nhu cầu đưa đón..."
                                value={newFieldLabel}
                                onChange={(e) => setNewFieldLabel(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E1B20]"
                              />
                            </div>

                            <div className="sm:col-span-3 space-y-1">
                              <label className="text-[11px] font-semibold text-slate-600">
                                Dạng câu trả lời
                              </label>
                              <select
                                value={newFieldType}
                                onChange={(e) =>
                                  setNewFieldType(
                                    e.target.value as EventCustomFieldType
                                  )
                                }
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E1B20]"
                              >
                                <option value="text">Văn bản ngắn</option>
                                <option value="select">Menu chọn (Dropdown 1 lựa chọn)</option>
                                <option value="radio">Câu hỏi trắc nghiệm (Chọn 1 phương án)</option>
                                <option value="multicheckbox">Hộp kiểm nhiều lựa chọn (Chọn nhiều)</option>
                                <option value="checkbox">Hộp kiểm đơn Có/Không</option>
                                <option value="textarea">Ghi chú, đề xuất kiến nghị (Nhiều dòng)</option>
                              </select>
                            </div>

                            <div className="sm:col-span-3 space-y-1">
                              <label className="text-[11px] font-semibold text-slate-600">
                                Ràng buộc trả lời
                              </label>
                              <select
                                value={newFieldRequired ? 'required' : 'optional'}
                                onChange={(e) => setNewFieldRequired(e.target.value === 'required')}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E1B20]"
                              >
                                <option value="optional">Không bắt buộc (Tùy chọn)</option>
                                <option value="required">Bắt buộc trả lời (*)</option>
                              </select>
                            </div>

                            {(newFieldType === 'select' || newFieldType === 'radio' || newFieldType === 'multicheckbox') && (
                              <div className="sm:col-span-12 space-y-1">
                                <label className="text-[11px] font-semibold text-slate-600">
                                  Các phương án lựa chọn (phân cách bằng dấu phẩy) (*)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ví dụ: Lựa chọn 1, Lựa chọn 2, Lựa chọn 3..."
                                  value={newFieldOptionsStr}
                                  onChange={(e) => setNewFieldOptionsStr(e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E1B20]"
                                />
                              </div>
                            )}

                            {(newFieldType === 'text' || newFieldType === 'textarea') && (
                              <div className="sm:col-span-12 space-y-1">
                                <label className="text-[11px] font-semibold text-slate-600">
                                  Gợi ý placeholder (Không bắt buộc)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ví dụ: Nhập họ tên người đi cùng, chủ đề chia sẻ..."
                                  value={newFieldPlaceholder}
                                  onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E1B20]"
                                />
                              </div>
                            )}
                          </div>

                          {newFieldError && (
                            <p className="text-xs font-semibold text-[#9E1B20]">{newFieldError}</p>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleAddCustomField}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm trường này vào Form</span>
                            </button>
                          </div>
                        </div>

                        {/* Save Action Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                          <p className="text-xs text-slate-500">
                            Bấm Lưu để đồng bộ cấu hình trường vào Sự kiện.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConfiguringFieldsEventId(null)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                            >
                              Đóng
                            </button>
                            <button
                              type="button"
                              disabled={isSavingCustomFields}
                              onClick={() => handleSaveCustomFields(event.id)}
                              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isSavingCustomFields ? 'Đang lưu...' : 'Lưu cấu hình trường Form'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chỉ cần đăng nhập tài khoản Thành viên (Email/Google) là có thể đăng ký tham gia sự kiện ngay */}
                    {(
                      <div className="space-y-4">
                        {/* Thông báo khóa chỉnh sửa cho thành viên / Quyền Admin cấp 1 */}
                        {isFormLockedForMember && (
                          <div className="p-3.5 sm:p-4 bg-amber-50 border-2 border-amber-300/80 rounded-xl flex items-start gap-3 shadow-2xs text-amber-950">
                            <div className="p-1.5 bg-amber-200/90 text-amber-900 rounded-lg shrink-0 mt-0.5">
                              <Lock className="w-4 h-4" />
                            </div>
                            <div className="space-y-1 text-xs">
                              <p className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                                <span>Đăng ký đã được ghi nhận và khóa chỉnh sửa</span>
                              </p>
                              <p className="text-amber-900 leading-relaxed">
                                Theo quy định của Ban Tổ chức, thành viên sau khi đăng ký <strong>không thể tự chỉnh sửa thông tin hoặc size áo</strong> (nhằm chốt số lượng áo đặt may tại xưởng và chuẩn bị hậu cần bàn tiệc Gala). Nếu bạn cần đổi size áo, số lượng hoặc trạng thái tham gia, vui lòng liên hệ <strong>Admin cấp 1 (Ban Điều hành Mạng lưới CSV KTD)</strong> để được hỗ trợ điều chỉnh.
                              </p>
                            </div>
                          </div>
                        )}

                        {isRegistered && currentUser.isAdmin && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-[#9E1B20] font-semibold">
                            <ShieldCheck className="w-4 h-4 shrink-0 text-[#9E1B20]" />
                            <span>Chế độ Admin cấp 1: Bạn có toàn quyền cập nhật thông tin đăng ký &amp; size áo cho sự kiện này.</span>
                          </div>
                        )}

                        {/* 0. Thông tin đại biểu đăng ký (Đồng bộ từ Hồ sơ Mạng lưới hoặc nhập từ Tài khoản thành viên) */}
                        <div className="p-3 sm:p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-50 text-[#9E1B20] border border-red-100">
                                THÔNG TIN ĐẠI BIỂU ĐĂNG KÝ
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {isConfirmedNetworkMember(currentMemberProfile)
                                  ? 'Đồng bộ từ Hồ sơ Thành viên Mạng lưới'
                                  : currentUser.authMode === 'google'
                                    ? `Đã xác thực Google (${currentUser.email})`
                                    : `Tài khoản đã xác thực (${currentUser.email})`}
                              </span>
                            </div>
                            {isConfirmedNetworkMember(currentMemberProfile) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenProfileModal ? onOpenProfileModal() : onNavigateToNetwork()
                                }
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
                              >
                                Cập nhật hồ sơ
                              </button>
                            ) : null}
                          </div>

                          {isConfirmedNetworkMember(currentMemberProfile) && currentMemberProfile ? (
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-900">
                                {currentMemberProfile.fullName} · Lớp {currentMemberProfile.className} ({currentMemberProfile.faculty})
                              </p>
                              <p className="text-xs text-slate-600 break-words">
                                SĐT / Zalo: <strong>{maskPhoneKeepLast4(currentMemberProfile.zaloPhone)}</strong> · Email: <strong>{currentUser.email}</strong>
                                {currentMemberProfile.workplace ? ` · Nơi công tác: ${currentMemberProfile.workplace}` : ''}
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                              <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                  Họ và tên đại biểu <span className="text-[#9E1B20]">(*)</span>
                                </label>
                                <input
                                  type="text"
                                  readOnly={isFormLockedForMember}
                                  value={payerNameOverride}
                                  onChange={(e) =>
                                    !isFormLockedForMember && setPayerNameOverride(e.target.value)
                                  }
                                  placeholder="Nhập họ và tên..."
                                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] read-only:opacity-80"
                                />
                                {customFieldErrors['__payerName'] && (
                                  <p className="text-[11px] font-semibold text-[#9E1B20]">
                                    {customFieldErrors['__payerName']}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                  Số điện thoại liên hệ <span className="text-[#9E1B20]">(*)</span>
                                </label>
                                <input
                                  type="tel"
                                  readOnly={isFormLockedForMember}
                                  value={payerPhoneOverride}
                                  onChange={(e) =>
                                    !isFormLockedForMember && setPayerPhoneOverride(e.target.value)
                                  }
                                  placeholder="Ví dụ: 0905123456"
                                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] read-only:opacity-80"
                                />
                                {customFieldErrors['__payerPhone'] && (
                                  <p className="text-[11px] font-semibold text-[#9E1B20]">
                                    {customFieldErrors['__payerPhone']}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                  Lớp / Khóa (nếu có)
                                </label>
                                <input
                                  type="text"
                                  readOnly={isFormLockedForMember}
                                  value={registrantClassOverride}
                                  onChange={(e) =>
                                    !isFormLockedForMember && setRegistrantClassOverride(e.target.value)
                                  }
                                  placeholder="Ví dụ: 12KT1..."
                                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] read-only:opacity-80"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Nếu là sự kiện Gala Gặp mặt Cán bộ Đoàn, cán sự lớp: Hiển thị bộ form Gala chuyên biệt */}
                        {Boolean(
                          event.isGalaWithShirtFee ||
                          event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
                          event.id === 'evt-gala-can-bo-doan'
                        ) && (
                          <div className="space-y-3.5 sm:space-y-4">
                            {/* Nội dung 1: Đăng ký tham dự Gala */}
                            <div className="p-3 sm:p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                  <span className="w-2 h-4 bg-[#9E1B20] rounded-xs shrink-0" />
                                  <span>1. Đăng ký Tham dự Đêm Tiệc Gala Gặp Mặt</span>
                                </h4>
                                <span className="text-xs font-semibold text-[#9E1B20] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200 self-start sm:self-auto whitespace-nowrap">
                                  Lệ phí: {(editingPaymentEventId === event.id ? paymentDraft.galaFeeAmount : (event.galaFeeAmount ?? 350000)).toLocaleString('vi-VN')} VNĐ / người
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                Bao gồm trọn gói: Tiệc Gala giao lưu trang trọng tại {event.venue}, quà tặng lưu niệm đặc biệt ALUMNI KTD, kỷ yếu và giao lưu cùng các thế hệ Cán bộ Đoàn - Hội - Lớp qua các thời kỳ.
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                                <label
                                  className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border-2 transition-all ${
                                    isFormLockedForMember ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                                  } ${
                                    attendGalaChoice
                                      ? 'bg-red-50/50 border-[#9E1B20] shadow-xs'
                                      : 'bg-white border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`gala-attendance-${event.id}`}
                                    checked={attendGalaChoice}
                                    disabled={isFormLockedForMember}
                                    onChange={() => !isFormLockedForMember && setAttendGalaChoice(true)}
                                    className="w-4 h-4 mt-0.5 text-[#9E1B20] border-slate-300 focus:ring-[#9E1B20] disabled:opacity-60"
                                  />
                                  <div className="space-y-0.5">
                                    <span className="text-sm font-bold text-slate-900 block">
                                      CÓ THAM GIA ĐÊM GALA
                                    </span>
                                    <span className="text-xs text-[#9E1B20] font-semibold block">
                                      +{(editingPaymentEventId === event.id ? paymentDraft.galaFeeAmount : (event.galaFeeAmount ?? 350000)).toLocaleString('vi-VN')} VNĐ / người
                                    </span>
                                    <span className="text-[11px] text-slate-500 block">
                                      Xác nhận giữ chỗ chính thức tại bàn tiệc
                                    </span>
                                  </div>
                                </label>

                                <label
                                  className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border-2 transition-all ${
                                    isFormLockedForMember ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                                  } ${
                                    !attendGalaChoice
                                      ? 'bg-slate-50 border-slate-500 shadow-xs'
                                      : 'bg-white border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`gala-attendance-${event.id}`}
                                    checked={!attendGalaChoice}
                                    disabled={isFormLockedForMember}
                                    onChange={() => !isFormLockedForMember && setAttendGalaChoice(false)}
                                    className="w-4 h-4 mt-0.5 text-slate-600 border-slate-300 focus:ring-slate-500 disabled:opacity-60"
                                  />
                                  <div className="space-y-0.5">
                                    <span className="text-sm font-bold text-slate-700 block">
                                      KHÔNG THAM DỰ GALA
                                    </span>
                                    <span className="text-xs text-slate-500 font-semibold block">
                                      0 VNĐ (Không phát sinh phí)
                                    </span>
                                    <span className="text-[11px] text-slate-500 block">
                                      Chỉ đặt áo kỷ niệm hoặc kết nối từ xa
                                    </span>
                                  </div>
                                </label>
                              </div>
                            </div>

                            {/* Nội dung 2: Đăng ký Áo kỷ niệm (Form Nam - Nữ, Số lượng, Size áo) */}
                            <div className="p-3 sm:p-4 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-2xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Shirt className="w-4 h-4 text-[#9E1B20]" />
                                    <span>2. Đăng ký Áo Thun Polo Kỷ Niệm (Chọn Form Áo, Chiều Cao & Cân Nặng)</span>
                                  </h4>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Vui lòng chọn lần lượt <strong>Form áo (Nam/Nữ)</strong>, <strong>Chiều cao</strong> và <strong>Cân nặng</strong> để hệ thống xác định đúng Size áo vừa vặn nhất.
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                                  <button
                                    type="button"
                                    onClick={() => setShowShirtSizeGuide((prev) => !prev)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                      showShirtSizeGuide
                                        ? 'bg-[#9E1B20] text-white border-[#9E1B20]'
                                        : 'bg-red-50 hover:bg-red-100 text-[#9E1B20] border-red-200'
                                    }`}
                                  >
                                    <Ruler className="w-3.5 h-3.5" />
                                    <span>
                                      {showShirtSizeGuide
                                        ? 'Ẩn Bảng Hướng Dẫn Chọn Size'
                                        : 'Xem Bảng Hướng Dẫn Chọn Size'}
                                    </span>
                                  </button>
                                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                    {(editingPaymentEventId === event.id ? paymentDraft.shirtFeeAmount : (event.shirtFeeAmount ?? 110000)).toLocaleString('vi-VN')} VNĐ / áo
                                  </span>
                                </div>
                              </div>

                              {/* Bảng Hướng dẫn Chọn Size Áo Nam / Nữ (2K Plus) */}
                              {showShirtSizeGuide && (
                                <ShirtSizeGuidePanel
                                  onApplySizeToOrder={handleApplyRecommendedSize}
                                />
                              )}

                              {/* Toggle bật/tắt đặt áo */}
                              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <label className={`flex items-center gap-2.5 ${isFormLockedForMember ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}>
                                  <input
                                    type="checkbox"
                                    checked={hasShirtBooking}
                                    disabled={isFormLockedForMember}
                                    onChange={(e) => !isFormLockedForMember && setHasShirtBooking(e.target.checked)}
                                    className="w-4 h-4 text-[#9E1B20] rounded border-slate-300 focus:ring-[#9E1B20] disabled:opacity-60"
                                  />
                                  <span className="text-xs sm:text-sm font-semibold text-slate-800">
                                    Tôi muốn đăng ký đặt áo kỷ niệm ({(editingPaymentEventId === event.id ? paymentDraft.shirtFeeAmount : (event.shirtFeeAmount ?? 110000)).toLocaleString('vi-VN')} VNĐ / áo)
                                  </span>
                                </label>
                                <span className="text-xs font-bold text-[#9E1B20]">
                                  {hasShirtBooking
                                    ? `Đã chọn: ${shirtOrders.reduce((s, o) => s + o.quantity, 0)} áo`
                                    : 'Không đặt áo'}
                                </span>
                              </div>

                              {hasShirtBooking && (
                                <div className="space-y-3 pt-1">
                                  <div className="space-y-3.5">
                                    {shirtOrders.map((order, idx) => {
                                      const genderChart = getChartByGender(order.gender);
                                      const selectedHeightKey =
                                        shirtHeightMap[order.id] || getDefaultHeightKey(order.gender);
                                      const currentBracket =
                                        genderChart.find((b) => b.heightKey === selectedHeightKey) ||
                                        genderChart[0];
                                      const currentWeightMapping =
                                        currentBracket.mappings.find((m) => m.size === order.size) ||
                                        currentBracket.mappings[0];

                                      return (
                                        <div
                                          key={order.id}
                                          className="p-4 bg-white border-2 border-red-200/80 rounded-xl space-y-3 text-xs shadow-xs"
                                        >
                                          {/* Header của từng áo */}
                                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                                            <div className="flex items-center gap-2">
                                              <span className="w-6 h-6 rounded-full bg-[#9E1B20] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                                {idx + 1}
                                              </span>
                                              <span className="font-bold text-sm text-slate-900">
                                                Áo đăng ký thứ {idx + 1}
                                              </span>
                                              <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-[#9E1B20] border border-red-200 font-bold text-xs">
                                                Đã chọn: Áo {order.gender} · Size{' '}
                                                {order.size === 'XXL' ? '2XL (XXL)' : order.size}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                              <span className="font-extrabold text-sm text-[#9E1B20]">
                                                {(order.quantity * (editingPaymentEventId === event.id ? paymentDraft.shirtFeeAmount : (event.shirtFeeAmount ?? 110000))).toLocaleString('vi-VN')} VNĐ
                                              </span>
                                              {!isFormLockedForMember && shirtOrders.length > 1 && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveShirtOrder(order.id)}
                                                  className="px-2 py-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md border border-slate-200 hover:border-red-200 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                                                  title="Xóa áo này"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                  <span>Xóa</span>
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          {/* 3 Mục Bắt Buộc Chọn Nổi Bật: 1. Form Áo - 2. Chiều Cao - 3. Cân Nặng -> Size Áo */}
                                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                            {/* MỤC 1: CHỌN FORM ÁO */}
                                            <div className="md:col-span-4 p-3 rounded-xl bg-red-50/40 border-2 border-[#9E1B20]/30 space-y-2">
                                              <label className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-[#9E1B20]">
                                                <span>Bước 1 · Chọn Form Áo (*)</span>
                                                <span className="px-1.5 py-0.5 bg-[#9E1B20] text-white rounded text-[10px]">
                                                  Bắt buộc
                                                </span>
                                              </label>
                                              <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-lg border border-slate-300">
                                                <button
                                                  type="button"
                                                  disabled={isFormLockedForMember}
                                                  onClick={() =>
                                                    !isFormLockedForMember &&
                                                    handleUpdateShirtOrder(order.id, { gender: 'Nam' })
                                                  }
                                                  className={`min-h-[38px] py-2 px-2 rounded-md text-xs font-bold transition-all ${
                                                    isFormLockedForMember
                                                      ? 'cursor-not-allowed'
                                                      : 'cursor-pointer'
                                                  } ${
                                                    order.gender === 'Nam'
                                                      ? 'bg-[#9E1B20] text-white shadow-xs'
                                                      : 'text-slate-600 hover:bg-slate-100'
                                                  }`}
                                                >
                                                  Form Nam
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={isFormLockedForMember}
                                                  onClick={() =>
                                                    !isFormLockedForMember &&
                                                    handleUpdateShirtOrder(order.id, { gender: 'Nữ' })
                                                  }
                                                  className={`min-h-[38px] py-2 px-2 rounded-md text-xs font-bold transition-all ${
                                                    isFormLockedForMember
                                                      ? 'cursor-not-allowed'
                                                      : 'cursor-pointer'
                                                  } ${
                                                    order.gender === 'Nữ'
                                                      ? 'bg-[#9E1B20] text-white shadow-xs'
                                                      : 'text-slate-600 hover:bg-slate-100'
                                                  }`}
                                                >
                                                  Form Nữ
                                                </button>
                                              </div>
                                            </div>

                                            {/* MỤC 2: CHỌN CHIỀU CAO */}
                                            <div className="md:col-span-3 p-3 rounded-xl bg-amber-50/50 border-2 border-amber-400/70 space-y-2">
                                              <label className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-amber-950">
                                                <span>Bước 2 · Chọn Chiều Cao (*)</span>
                                              </label>
                                              <select
                                                value={currentBracket.heightKey}
                                                disabled={isFormLockedForMember}
                                                onChange={(e) =>
                                                  !isFormLockedForMember &&
                                                  setShirtHeightMap((prev) => ({
                                                    ...prev,
                                                    [order.id]: e.target.value,
                                                  }))
                                                }
                                                className="w-full min-h-[42px] px-3 py-2 bg-white border-2 border-amber-400 rounded-lg text-xs font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] cursor-pointer shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-700"
                                              >
                                                {genderChart.map((b) => (
                                                  <option key={b.heightKey} value={b.heightKey}>
                                                    Cao: {b.heightLabel}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>

                                            {/* MỤC 3: CHỌN CÂN NẶNG -> RA SIZE ÁO */}
                                            <div className="md:col-span-3 p-3 rounded-xl bg-emerald-50/50 border-2 border-emerald-500/70 space-y-2">
                                              <label className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wide text-emerald-950">
                                                <span>Bước 3 · Chọn Cân Nặng (*)</span>
                                              </label>
                                              <select
                                                value={order.size}
                                                disabled={isFormLockedForMember}
                                                onChange={(e) =>
                                                  !isFormLockedForMember &&
                                                  handleUpdateShirtOrder(order.id, {
                                                    size: e.target.value as EventShirtOrder['size'],
                                                  })
                                                }
                                                className="w-full min-h-[42px] px-3 py-2 bg-white border-2 border-emerald-500 rounded-lg text-xs font-extrabold text-[#9E1B20] focus:outline-none focus:ring-2 focus:ring-[#9E1B20] cursor-pointer shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                                              >
                                                {currentBracket.mappings.map((m) => (
                                                  <option key={m.size} value={m.size}>
                                                    {m.weightRange} ➔ SIZE {m.displaySize}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>

                                            {/* MỤC 4: SỐ LƯỢNG ÁO */}
                                            <div className="md:col-span-2 p-3 rounded-xl bg-slate-100/80 border-2 border-slate-300 space-y-2 flex flex-row md:flex-col items-center md:items-stretch justify-between">
                                              <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 md:text-center">
                                                Số Lượng Áo
                                              </label>
                                              <div className="flex items-center justify-center border-2 border-slate-300 rounded-lg bg-white overflow-hidden h-[40px] md:h-[42px]">
                                                <button
                                                  type="button"
                                                  disabled={isFormLockedForMember}
                                                  onClick={() =>
                                                    !isFormLockedForMember &&
                                                    handleUpdateShirtOrder(order.id, {
                                                      quantity: Math.max(1, order.quantity - 1),
                                                    })
                                                  }
                                                  className="px-3.5 md:px-2.5 h-full text-slate-700 hover:bg-slate-100 active:bg-slate-200 font-extrabold text-base cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                  -
                                                </button>
                                                <span className="px-3 md:px-2.5 font-extrabold text-sm text-slate-900 min-w-[36px] text-center">
                                                  {order.quantity}
                                                </span>
                                                <button
                                                  type="button"
                                                  disabled={isFormLockedForMember}
                                                  onClick={() =>
                                                    !isFormLockedForMember &&
                                                    handleUpdateShirtOrder(order.id, {
                                                      quantity: order.quantity + 1,
                                                    })
                                                  }
                                                  className="px-3.5 md:px-2.5 h-full text-slate-700 hover:bg-slate-100 active:bg-slate-200 font-extrabold text-base cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                  +
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Tóm tắt kết quả chọn Size ngắn gọn */}
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                                            <span className="text-slate-600">
                                              Thông tin đã chọn:{' '}
                                              <strong className="text-slate-900">
                                                Form {order.gender}
                                              </strong>{' '}
                                              · Chiều cao{' '}
                                              <strong className="text-slate-900">
                                                {currentBracket.heightLabel}
                                              </strong>{' '}
                                              · Cân nặng{' '}
                                              <strong className="text-slate-900">
                                                {currentWeightMapping.weightRange}
                                              </strong>
                                            </span>
                                            <span className="w-full sm:w-auto px-3 py-2 sm:py-1 rounded-lg bg-[#9E1B20] text-white font-extrabold text-xs shadow-2xs text-center whitespace-nowrap">
                                              KẾT QUẢ: SIZE {order.size === 'XXL' ? '2XL (XXL)' : order.size} (SL: {order.quantity} áo)
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Tùy chọn thêm áo để 1 người có thể đặt 2 áo form khác nhau (Chỉ khi chưa khóa) */}
                                  {!isFormLockedForMember && (
                                    <button
                                      type="button"
                                      onClick={handleAddShirtOrder}
                                      className="w-full min-h-[44px] px-3 py-2.5 border-2 border-dashed border-red-300 hover:border-[#9E1B20] bg-red-50/40 hover:bg-red-50 text-[#9E1B20] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                                    >
                                      <Plus className="w-4 h-4 shrink-0" />
                                      <span>Thêm áo kỷ niệm (Đặt thêm áo Nam/Nữ hoặc Size khác)</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Bảng Thông Báo Tổng Số Tiền Rõ Ràng & Khoa Học */}
                            <div className="p-3 sm:p-4 bg-gradient-to-r from-red-50 via-slate-50 to-emerald-50/50 border-2 border-[#9E1B20]/40 rounded-xl space-y-3.5 shadow-xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-5 h-5 text-[#9E1B20] shrink-0" />
                                  <div>
                                    <h4 className="text-sm font-bold text-[#0F172A]">
                                      THÔNG BÁO TỔNG SỐ TIỀN THANH TOÁN
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                      Tính toán tự động theo thời gian thực
                                    </p>
                                  </div>
                                </div>

                                {currentUser.isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditPayment(event)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs self-start sm:self-auto ${
                                      editingPaymentEventId === event.id
                                        ? 'bg-slate-800 text-white border-slate-800'
                                        : 'bg-[#9E1B20] hover:bg-[#7D1418] text-white border-[#9E1B20]'
                                    }`}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                      <span>
                                        {editingPaymentEventId === event.id
                                          ? 'Đóng khung sửa Giá tiệc & Giá áo'
                                          : 'Tùy chỉnh Giá tiệc, Giá áo & STK (Admin)'}
                                      </span>
                                    </button>
                                  )}
                                </div>

                              {/* Inline Admin Payment, Fee, Bank Account & QR Editor right inside div:nth-of-type(3) */}
                              {currentUser.isAdmin && editingPaymentEventId === event.id && (
                                <div
                                  id={`admin-fee-payment-editor-${event.id}`}
                                  className="p-4 bg-white border-2 border-[#9E1B20] rounded-xl space-y-4 shadow-md animate-in fade-in duration-150"
                                >
                                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                      <span className="p-1.5 bg-red-50 text-[#9E1B20] rounded-lg">
                                        <Settings2 className="w-4 h-4" />
                                      </span>
                                      <div>
                                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 uppercase">
                                          Quản trị: Tùy chỉnh Giá Tiệc, Giá Áo, Tài khoản Ngân hàng & Mã QR
                                        </h5>
                                        <p className="text-[11px] text-slate-500">
                                          Phí tham gia tiệc và làm áo chỉ hiển thị trong Form đăng ký này. Thay đổi tại đây sẽ cập nhật tức thì vào bảng tính tiền.
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPaymentEventId(null)}
                                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                                    >
                                      Đóng ✕
                                    </button>
                                  </div>

                                  {paymentSaveSuccessMsg && (
                                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span>{paymentSaveSuccessMsg}</span>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                    {/* Đơn giá Lệ phí Tiệc Gala */}
                                    <div className="space-y-1">
                                      <label className="block font-bold text-slate-700">
                                        1. Giá tham gia Tiệc Gala (VNĐ/người):
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        step={10000}
                                        value={paymentDraft.galaFeeAmount}
                                        onChange={(e) =>
                                          setPaymentDraft((prev) => ({
                                            ...prev,
                                            galaFeeAmount: Math.max(0, Number(e.target.value) || 0),
                                          }))
                                        }
                                        className="w-full px-3 py-2 bg-red-50/30 border border-slate-300 rounded-lg font-extrabold text-[#9E1B20] focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                                      />
                                    </div>

                                    {/* Đơn giá Áo thun kỷ niệm */}
                                    <div className="space-y-1">
                                      <label className="block font-bold text-slate-700">
                                        2. Giá làm Áo tham gia sự kiện (VNĐ/áo):
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        step={5000}
                                        value={paymentDraft.shirtFeeAmount}
                                        onChange={(e) =>
                                          setPaymentDraft((prev) => ({
                                            ...prev,
                                            shirtFeeAmount: Math.max(0, Number(e.target.value) || 0),
                                          }))
                                        }
                                        className="w-full px-3 py-2 bg-emerald-50/30 border border-slate-300 rounded-lg font-extrabold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                                      />
                                    </div>

                                    {/* Hậu tố Cú pháp chuyển khoản */}
                                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                                      <label className="block font-bold text-slate-700">
                                        3. Hậu tố Cú pháp (HO VA TEN - SĐT - Hậu tố):
                                      </label>
                                      <input
                                        type="text"
                                        value={paymentDraft.transferSyntaxPrefix}
                                        onChange={(e) =>
                                          setPaymentDraft((prev) => ({
                                            ...prev,
                                            transferSyntaxPrefix: e.target.value,
                                          }))
                                        }
                                        placeholder="VD: Gala"
                                        className="w-full px-3 py-2 bg-amber-50/40 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                                      />
                                    </div>

                                    {/* Tên Ngân hàng */}
                                    <div className="space-y-1">
                                      <label className="block font-bold text-slate-700">
                                        4. Tên Ngân hàng & Chi nhánh:
                                      </label>
                                      <input
                                        type="text"
                                        value={paymentDraft.bankName}
                                        onChange={(e) =>
                                          setPaymentDraft((prev) => ({
                                            ...prev,
                                            bankName: e.target.value,
                                          }))
                                        }
                                        placeholder="VD: Vietcombank (Chi nhánh Đà Nẵng)"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                                      />
                                    </div>

                                    {/* Số tài khoản */}
                                    <div className="space-y-1">
                                      <label className="block font-bold text-slate-700">
                                        5. Số tài khoản nhận tiền:
                                      </label>
                                      <input
                                        type="text"
                                        value={paymentDraft.bankAccount}
                                        onChange={(e) =>
                                          setPaymentDraft((prev) => ({
                                            ...prev,
                                            bankAccount: e.target.value,
                                          }))
                                        }
                                        placeholder="VD: 1018 2026 88"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-[#9E1B20] focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                                      />
                                    </div>

                                    {/* Chủ tài khoản */}
                                    <div className="space-y-1">
                                      <label className="block font-bold text-slate-700">
                                        6. Tên Chủ tài khoản:
                                      </label>
                                      <input
                                        type="text"
                                        value={paymentDraft.bankAccountName}
                                        onChange={(e) =>
                                          setPaymentDraft((prev) => ({
                                            ...prev,
                                            bankAccountName: e.target.value,
                                          }))
                                        }
                                        placeholder="VD: MANG LUOI ALUMNI KTD - BTC GALA"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                                      />
                                    </div>
                                  </div>

                                  {/* Cơ chế VietQR Động Tự Động Chuẩn Napas 247 */}
                                  <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={buildVietQrImageUrl({
                                          bankName: paymentDraft.bankName,
                                          bankAccount: paymentDraft.bankAccount,
                                          bankAccountName: paymentDraft.bankAccountName,
                                          amount:
                                            (attendGalaChoice ? paymentDraft.galaFeeAmount : 0) +
                                            (hasShirtBooking
                                              ? shirtOrders.reduce(
                                                  (s, o) => s + o.quantity * paymentDraft.shirtFeeAmount,
                                                  0
                                                )
                                              : 0),
                                          transferSyntax: buildTransferSyntax({
                                            fullName:
                                              payerNameOverride.trim() ||
                                              currentMemberProfile?.fullName ||
                                              currentUser.displayName,
                                            phone:
                                              payerPhoneOverride.trim() ||
                                              currentMemberProfile?.zaloPhone ||
                                              savedUserPhone ||
                                              '0905128689',
                                            suffix: paymentDraft.transferSyntaxPrefix || 'Gala',
                                          }),
                                        })}
                                        alt="Xem trước VietQR Động"
                                        className="w-16 h-16 object-contain rounded-lg bg-white border border-emerald-300 p-1 shrink-0 shadow-2xs"
                                      />
                                      <div className="text-xs space-y-0.5">
                                        <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                                          <span>Hệ thống tự tạo VietQR Động (Chuẩn Napas 247):</span>
                                        </p>
                                        <p className="text-[11px] text-emerald-900 leading-relaxed">
                                          Mã QR được <strong>tự động tạo riêng cho từng đại biểu</strong> dựa trên STK ở trên, tự điền chính xác <strong>Số tiền theo đăng ký</strong> và Lệnh chuyển khoản <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-[#9E1B20]">HO VA TEN - SĐT - Gala</code>. Không dùng mã QR tải lên tĩnh.
                                        </p>
                                      </div>
                                    </div>

                                    <div className="shrink-0">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-800 shadow-2xs">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Tự động 100%</span>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => setEditingPaymentEventId(null)}
                                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSavingPaymentInfo}
                                      onClick={() => handleSavePaymentInfo(event)}
                                      className="px-4 py-1.5 text-xs font-bold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>
                                        {isSavingPaymentInfo
                                          ? 'Đang lưu...'
                                          : 'Lưu Thông tin Thanh toán & Lệ phí'}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2 text-xs text-slate-700">
                                <div className="flex items-baseline justify-between gap-3">
                                  <span className="min-w-0 flex-1">
                                    • Lệ phí tham dự Gala ({attendGalaChoice ? 'Có tham gia' : 'Không tham gia'}):
                                  </span>
                                  <span className="font-bold text-slate-900 whitespace-nowrap shrink-0 tabular-nums text-right">
                                    {attendGalaChoice
                                      ? `${(editingPaymentEventId === event.id ? paymentDraft.galaFeeAmount : (event.galaFeeAmount ?? 350000)).toLocaleString('vi-VN')} VNĐ`
                                      : '0 VNĐ'}
                                  </span>
                                </div>

                                <div className="flex items-baseline justify-between gap-3">
                                  <span className="min-w-0 flex-1">
                                    • Lệ phí áo kỷ niệm ({hasShirtBooking ? `${shirtOrders.reduce((s, o) => s + o.quantity, 0)} áo x ${(editingPaymentEventId === event.id ? paymentDraft.shirtFeeAmount : (event.shirtFeeAmount ?? 110000)).toLocaleString('vi-VN')} đ` : '0 áo'}):
                                  </span>
                                  <span className="font-bold text-slate-900 whitespace-nowrap shrink-0 tabular-nums text-right">
                                    {(hasShirtBooking
                                      ? shirtOrders.reduce((s, o) => s + o.quantity * (editingPaymentEventId === event.id ? paymentDraft.shirtFeeAmount : (event.shirtFeeAmount ?? 110000)), 0)
                                      : 0
                                    ).toLocaleString('vi-VN')}{' '}
                                    VNĐ
                                  </span>
                                </div>

                                {hasShirtBooking && shirtOrders.length > 0 && (
                                  <div className="text-[11px] text-slate-500 pl-3">
                                    Chi tiết: {shirtOrders.map((o) => `${o.quantity} áo ${o.gender} (Size ${o.size})`).join(' + ')}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2.5 border-t border-slate-300 flex flex-wrap items-baseline justify-between gap-2">
                                <span className="text-xs sm:text-sm font-extrabold text-[#0F172A] uppercase">
                                  TỔNG LỆ PHÍ CẦN THANH TOÁN:
                                </span>
                                <span className="text-lg sm:text-xl font-black text-[#9E1B20] whitespace-nowrap shrink-0 tabular-nums ml-auto">
                                  {(
                                    (attendGalaChoice ? (editingPaymentEventId === event.id ? paymentDraft.galaFeeAmount : (event.galaFeeAmount ?? 350000)) : 0) +
                                    (hasShirtBooking
                                      ? shirtOrders.reduce((s, o) => s + o.quantity * (editingPaymentEventId === event.id ? paymentDraft.shirtFeeAmount : (event.shirtFeeAmount ?? 110000)), 0)
                                      : 0)
                                  ).toLocaleString('vi-VN')}{' '}
                                  VNĐ
                                </span>
                              </div>

                              {((attendGalaChoice ? (editingPaymentEventId === event.id ? paymentDraft.galaFeeAmount : (event.galaFeeAmount ?? 350000)) : 0) +
                                (hasShirtBooking
                                  ? shirtOrders.reduce((s, o) => s + o.quantity * (editingPaymentEventId === event.id ? paymentDraft.shirtFeeAmount : (event.shirtFeeAmount ?? 110000)), 0)
                                  : 0)) > 0 && (
                                <div className="p-3 sm:p-4 bg-white rounded-xl border-2 border-red-200/90 space-y-3.5 sm:space-y-4 shadow-xs">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 bg-red-50 text-[#9E1B20] rounded-lg">
                                        <QrCode className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                          Hướng dẫn Thanh toán & Chuyển khoản Ban Tổ chức
                                        </h5>
                                        <p className="text-[11px] text-slate-500">
                                          Chuyển khoản theo số tài khoản hoặc quét mã QR bên dưới
                                        </p>
                                      </div>
                                    </div>

                                    {/* Admin payment edit button right in the form */}
                                    {currentUser.isAdmin && (
                                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditPayment(event)}
                                          className="px-2.5 py-1 bg-white hover:bg-red-50 text-slate-800 hover:text-[#9E1B20] border border-slate-300 hover:border-red-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                                        >
                                          <Edit3 className="w-3.5 h-3.5 text-[#9E1B20]" />
                                          <span>Sửa STK & Ngân hàng</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                    {/* Cột trái: Chi tiết tài khoản ngân hàng */}
                                    <div className="md:col-span-7 space-y-2 text-xs">
                                      {/* Ngân hàng */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <span className="text-slate-500 font-medium">Ngân hàng:</span>
                                        <span className="font-bold text-slate-900 sm:text-right">
                                          {event.bankName || 'Vietcombank (Chi nhánh Đà Nẵng)'}
                                        </span>
                                      </div>

                                      {/* Số tài khoản với nút copy */}
                                      <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <span className="text-slate-500 font-medium">Số tài khoản:</span>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-base text-[#9E1B20]">
                                            {event.bankAccount || '1018 2026 88'}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyText(event.bankAccount || '1018 2026 88', 'stk')}
                                            className="px-2.5 py-1 bg-white hover:bg-red-50 text-slate-700 hover:text-[#9E1B20] border border-slate-300 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                            title="Sao chép số tài khoản"
                                          >
                                            {copiedTextKey === 'stk' ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-600" />
                                                <span className="text-emerald-700">Đã chép</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" />
                                                <span>Chép</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Tên chủ tài khoản */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <span className="text-slate-500 font-medium">Chủ tài khoản:</span>
                                        <span className="font-bold text-slate-800 sm:text-right break-words">
                                          {event.bankAccountName || 'MANG LUOI ALUMNI KTD - BTC GALA'}
                                        </span>
                                      </div>

                                      {/* Số tiền cần chuyển */}
                                      <div className="flex items-center justify-between gap-2 p-2.5 bg-red-50/70 rounded-lg border border-red-200">
                                        <span className="text-[#9E1B20] font-bold">Số tiền:</span>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-sm text-[#9E1B20]">
                                            {(
                                              (attendGalaChoice ? (editingPaymentEventId === event.id ? paymentDraft.galaFeeAmount : (event.galaFeeAmount ?? 350000)) : 0) +
                                              (hasShirtBooking
                                                ? shirtOrders.reduce((s, o) => s + o.quantity * (editingPaymentEventId === event.id ? paymentDraft.shirtFeeAmount : (event.shirtFeeAmount ?? 110000)), 0)
                                                : 0)
                                            ).toLocaleString('vi-VN')}{' '}
                                            VNĐ
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleCopyText(
                                                String(
                                                  (attendGalaChoice ? (editingPaymentEventId === event.id ? paymentDraft.galaFeeAmount : (event.galaFeeAmount ?? 350000)) : 0) +
                                                  (hasShirtBooking
                                                    ? shirtOrders.reduce((s, o) => s + o.quantity * (editingPaymentEventId === event.id ? paymentDraft.shirtFeeAmount : (event.shirtFeeAmount ?? 110000)), 0)
                                                    : 0)
                                                ),
                                                'amount'
                                              )
                                            }
                                            className="px-2.5 py-1 bg-white text-slate-700 hover:text-[#9E1B20] border border-slate-300 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                            title="Sao chép số tiền"
                                          >
                                            {copiedTextKey === 'amount' ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-600" />
                                                <span className="text-emerald-700">Đã chép</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" />
                                                <span>Chép</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Cú pháp chuyển khoản tự động gắn chặt với thành viên: HO VA TEN (không dấu) - Số điện thoại - Gala */}
                                      {(() => {
                                        const effectiveName =
                                          (isRegistered && userReg?.fullName) ||
                                          currentMemberProfile?.fullName ||
                                          currentUser.displayName ||
                                          'Cựu sinh viên KTD';
                                        const effectivePhone =
                                          (isFormLockedForMember &&
                                            userReg?.customAnswers?.zaloPhone) ||
                                          payerPhoneOverride.trim() ||
                                          currentMemberProfile?.zaloPhone ||
                                          savedUserPhone ||
                                          '';
                                        const activeSuffix =
                                          (editingPaymentEventId === event.id
                                            ? paymentDraft.transferSyntaxPrefix
                                            : event.transferSyntaxPrefix) || 'Gala';
                                        const personalTransferSyntax = buildTransferSyntax({
                                          fullName: effectiveName,
                                          phone: effectivePhone || 'SĐT',
                                          suffix: activeSuffix,
                                        });

                                        return (
                                          <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-300 space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <span className="text-[11px] font-extrabold text-amber-950 uppercase tracking-wide">
                                                Nội dung chuyển khoản định danh thành viên:
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleCopyText(personalTransferSyntax, 'syntax')
                                                }
                                                className="px-2.5 py-1 bg-white text-amber-900 hover:text-[#9E1B20] border border-amber-300 rounded-md text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                                title="Sao chép nội dung chuyển khoản"
                                              >
                                                {copiedTextKey === 'syntax' ? (
                                                  <>
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                    <span className="text-emerald-700">Đã chép</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Copy className="w-3 h-3" />
                                                    <span>Chép nội dung CK</span>
                                                  </>
                                                )}
                                              </button>
                                            </div>

                                            <p className="font-mono text-xs sm:text-sm font-extrabold text-[#9E1B20] bg-white p-2.5 rounded-lg border-2 border-amber-300 select-all break-words shadow-2xs">
                                              {personalTransferSyntax}
                                            </p>

                                            {/* Thông tin định danh thành viên gắn với Mã QR */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                              <div className="space-y-1">
                                                <label className="block text-[10px] font-bold text-amber-900 uppercase">
                                                  Thành viên (Đồng bộ từ hồ sơ):
                                                </label>
                                                <input
                                                  type="text"
                                                  readOnly
                                                  disabled
                                                  value={effectiveName}
                                                  className="w-full px-2.5 py-1.5 bg-slate-100 border border-amber-300/80 rounded-lg text-xs font-bold text-slate-700 cursor-not-allowed"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="block text-[10px] font-bold text-amber-900 uppercase">
                                                  Số điện thoại định danh trong QR:
                                                </label>
                                                <input
                                                  type="tel"
                                                  disabled={isFormLockedForMember}
                                                  value={effectivePhone}
                                                  onChange={(e) => {
                                                    if (isFormLockedForMember) return;
                                                    const val = e.target.value;
                                                    setPayerPhoneOverride(val);
                                                  }}
                                                  onBlur={(e) => {
                                                    if (
                                                      !isFormLockedForMember &&
                                                      e.target.value.trim()
                                                    ) {
                                                      onSaveUserPhone?.(
                                                        e.target.value.trim(),
                                                        effectiveName
                                                      );
                                                    }
                                                  }}
                                                  placeholder="Nhập SĐT của bạn..."
                                                  className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E1B20] disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* Cột phải: Khung Mã QR Thanh toán (Tự động tạo VietQR gắn với từng thành viên) */}
                                    <div className="md:col-span-5 flex flex-col items-center justify-center p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                      {(() => {
                                        const activeBankName =
                                          (editingPaymentEventId === event.id
                                            ? paymentDraft.bankName
                                            : event.bankName) || 'Vietcombank (Chi nhánh Đà Nẵng)';
                                        const activeBankAccount =
                                          (editingPaymentEventId === event.id
                                            ? paymentDraft.bankAccount
                                            : event.bankAccount) || '1018 2026 88';
                                        const activeBankAccountName =
                                          (editingPaymentEventId === event.id
                                            ? paymentDraft.bankAccountName
                                            : event.bankAccountName) || 'MANG LUOI ALUMNI KTD - BTC GALA';
                                        const activeGalaFee =
                                          editingPaymentEventId === event.id
                                            ? paymentDraft.galaFeeAmount
                                            : (event.galaFeeAmount ?? 350000);
                                        const activeShirtFee =
                                          editingPaymentEventId === event.id
                                            ? paymentDraft.shirtFeeAmount
                                            : (event.shirtFeeAmount ?? 110000);
                                        const activeTotalAmount =
                                          (attendGalaChoice ? activeGalaFee : 0) +
                                          (hasShirtBooking
                                            ? shirtOrders.reduce(
                                                (s, o) => s + o.quantity * activeShirtFee,
                                                0
                                              )
                                            : 0);

                                        const effectiveName =
                                          (isRegistered && userReg?.fullName) ||
                                          currentMemberProfile?.fullName ||
                                          currentUser.displayName ||
                                          'Cựu sinh viên KTD';
                                        const effectivePhone =
                                          (isFormLockedForMember &&
                                            userReg?.customAnswers?.zaloPhone) ||
                                          payerPhoneOverride.trim() ||
                                          currentMemberProfile?.zaloPhone ||
                                          savedUserPhone ||
                                          '';
                                        const activeSuffix =
                                          (editingPaymentEventId === event.id
                                            ? paymentDraft.transferSyntaxPrefix
                                            : event.transferSyntaxPrefix) || 'Gala';

                                        const activeSyntax = buildTransferSyntax({
                                          fullName: effectiveName,
                                          phone: effectivePhone || 'SĐT',
                                          suffix: activeSuffix,
                                        });

                                        const autoVietQrUrl = buildVietQrImageUrl({
                                          bankName: activeBankName,
                                          bankAccount: activeBankAccount,
                                          bankAccountName: activeBankAccountName,
                                          amount: activeTotalAmount,
                                          transferSyntax: activeSyntax,
                                        });

                                        const fallbackQrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
                                          `Ngân hàng: ${activeBankName} | STK: ${activeBankAccount} | Chủ TK: ${activeBankAccountName} | Số tiền: ${activeTotalAmount} VND | Nội dung: ${activeSyntax}`
                                        )}`;

                                        return (
                                          <div className="space-y-3 flex flex-col items-center w-full">
                                            <div className="flex items-center gap-1.5">
                                              <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>VietQR Động · Tự sinh theo từng người</span>
                                              </span>
                                            </div>

                                            <div className="p-2.5 bg-white rounded-xl shadow-sm border-2 border-[#9E1B20]/30 flex items-center justify-center">
                                              <img
                                                src={autoVietQrUrl}
                                                alt="Mã VietQR Chuyển khoản sự kiện"
                                                onError={(e) => {
                                                  const target = e.currentTarget;
                                                  if (target.src !== fallbackQrServerUrl) {
                                                    target.src = fallbackQrServerUrl;
                                                  }
                                                }}
                                                className="w-48 h-48 sm:w-44 sm:h-44 object-contain rounded-lg bg-white"
                                              />
                                            </div>

                                            <div className="space-y-1.5 w-full">
                                              <p className="text-xs font-extrabold text-slate-900">
                                                Mã QR Cá nhân hóa theo từng đại biểu
                                              </p>
                                              <p className="text-[11px] text-slate-600 max-w-[250px] mx-auto leading-snug">
                                                Quét bằng bất kỳ App Ngân hàng nào để <strong>tự động điền đầy đủ</strong>:
                                              </p>

                                              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-left text-[11px] space-y-1.5 max-w-[270px] mx-auto shadow-2xs">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-slate-500 font-medium">Số tiền:</span>
                                                  <span className="text-sm font-bold text-[#9E1B20] font-mono">
                                                    {activeTotalAmount.toLocaleString('vi-VN')} đ
                                                  </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                                                  <div className="min-w-0 flex-1">
                                                    <span className="text-slate-500 font-medium block">Lệnh chuyển khoản:</span>
                                                    <span className="font-mono font-bold text-slate-900 block truncate" title={activeSyntax}>
                                                      {activeSyntax}
                                                    </span>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCopyText(activeSyntax, 'syntax-qr-box')}
                                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-[#9E1B20] border border-red-200 rounded text-[10px] font-bold cursor-pointer shrink-0"
                                                    title="Sao chép nội dung chuyển khoản"
                                                  >
                                                    {copiedTextKey === 'syntax-qr-box' ? 'Đã chép' : 'Chép'}
                                                  </button>
                                                </div>
                                                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                                                  <div className="min-w-0 flex-1">
                                                    <span className="text-slate-500 font-medium block">Tài khoản nhận:</span>
                                                    <span className="font-mono text-slate-800 block truncate">
                                                      {activeBankAccount} ({activeBankName.split('(')[0].trim()})
                                                    </span>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCopyText(activeBankAccount.replace(/\s+/g, ''), 'acc-qr-box')}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer shrink-0"
                                                    title="Sao chép số tài khoản"
                                                  >
                                                    {copiedTextKey === 'acc-qr-box' ? 'Đã chép' : 'Chép'}
                                                  </button>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="pt-1 flex flex-wrap items-center justify-center gap-1.5">
                                              <a
                                                href={autoVietQrUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                download="vietqr-thanh-toan-gala.png"
                                                className="px-3 py-1.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                                                title="Mở ảnh VietQR kích thước chuẩn để tải về hoặc chuyển tiếp"
                                              >
                                                <Download className="w-3 h-3" />
                                                <span>Tải ảnh VietQR này</span>
                                              </a>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Các câu hỏi khảo sát & tùy chọn khác (nếu có) */}
                        {event.customFields &&
                          event.customFields.filter(
                            (f) =>
                              !(
                                Boolean(
                                  event.isGalaWithShirtFee ||
                                  event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
                                  event.id === 'evt-gala-can-bo-doan'
                                ) && (f.id === 'cf_attend_gala' || f.id === 'cf_uniform_shirt')
                              )
                          ).length > 0 && (
                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-2xs">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#9E1B20]" />
                                  <span>Thông tin khảo sát & Tùy chọn tham gia</span>
                                </h4>
                              </div>

                              <div className="space-y-3.5">
                                {event.customFields
                                  .filter(
                                    (f) =>
                                      !(
                                        Boolean(
                                          event.isGalaWithShirtFee ||
                                          event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
                                          event.id === 'evt-gala-can-bo-doan'
                                        ) && (f.id === 'cf_attend_gala' || f.id === 'cf_uniform_shirt')
                                      )
                                  )
                                  .map((field) => (
                                    <div key={field.id} className="space-y-1.5">
                                      <label className="block text-sm font-semibold text-slate-800">
                                        {field.label}
                                        {field.required ? (
                                          <span className="text-xs font-bold text-[#9E1B20] ml-1.5 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                            * Bắt buộc
                                          </span>
                                        ) : (
                                          <span className="text-xs font-normal text-slate-400 ml-1.5">
                                            (Không bắt buộc)
                                          </span>
                                        )}
                                      </label>

                                      {field.type === 'text' && (
                                        <input
                                          type="text"
                                          disabled={isFormLockedForMember}
                                          placeholder={field.placeholder || 'Nhập câu trả lời...'}
                                          value={String(customFieldValues[field.id] || '')}
                                          onChange={(e) => {
                                            if (isFormLockedForMember) return;
                                            setCustomFieldValues((prev) => ({
                                              ...prev,
                                              [field.id]: e.target.value,
                                            }));
                                            if (customFieldErrors[field.id]) {
                                              setCustomFieldErrors((prev) => {
                                                const cp = { ...prev };
                                                delete cp[field.id];
                                                return cp;
                                              });
                                            }
                                          }}
                                          className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed ${
                                            customFieldErrors[field.id]
                                              ? 'border-red-500 bg-red-50/20'
                                              : 'border-slate-300'
                                          }`}
                                        />
                                      )}

                                      {field.type === 'textarea' && (
                                        <textarea
                                          rows={2}
                                          readOnly={isFormLockedForMember}
                                          placeholder={field.placeholder || 'Nhập nội dung đề xuất, kiến nghị...'}
                                          value={String(customFieldValues[field.id] || '')}
                                          onChange={(e) => {
                                            if (isFormLockedForMember) return;
                                            setCustomFieldValues((prev) => ({
                                              ...prev,
                                              [field.id]: e.target.value,
                                            }));
                                            if (customFieldErrors[field.id]) {
                                              setCustomFieldErrors((prev) => {
                                                const cp = { ...prev };
                                                delete cp[field.id];
                                                return cp;
                                              });
                                            }
                                          }}
                                          className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] read-only:bg-slate-50 read-only:text-slate-600 ${
                                            customFieldErrors[field.id]
                                              ? 'border-red-500 bg-red-50/20'
                                              : 'border-slate-300'
                                          }`}
                                        />
                                      )}

                                      {field.type === 'select' && (
                                        <select
                                          value={String(customFieldValues[field.id] || '')}
                                          disabled={isFormLockedForMember}
                                          onChange={(e) => {
                                            if (isFormLockedForMember) return;
                                            setCustomFieldValues((prev) => ({
                                              ...prev,
                                              [field.id]: e.target.value,
                                            }));
                                            if (customFieldErrors[field.id]) {
                                              setCustomFieldErrors((prev) => {
                                                const cp = { ...prev };
                                                delete cp[field.id];
                                                return cp;
                                              });
                                            }
                                          }}
                                          className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed ${
                                            customFieldErrors[field.id]
                                              ? 'border-red-500 bg-red-50/20'
                                              : 'border-slate-300'
                                          }`}
                                        >
                                          <option value="">-- Vui lòng chọn một phương án --</option>
                                          {field.options?.map((opt) => (
                                            <option key={opt} value={opt}>
                                              {opt}
                                            </option>
                                          ))}
                                        </select>
                                      )}

                                      {field.type === 'radio' && (
                                        <div className="space-y-2 pt-0.5">
                                          {field.options?.map((opt, oIdx) => {
                                            const isChecked = customFieldValues[field.id] === opt;
                                            return (
                                              <label
                                                key={oIdx}
                                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                                  isFormLockedForMember ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                                                } ${
                                                  isChecked
                                                    ? 'bg-red-50/50 border-[#9E1B20] text-slate-900 shadow-2xs font-semibold'
                                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                              >
                                                <input
                                                  type="radio"
                                                  name={`radio-${event.id}-${field.id}`}
                                                  value={opt}
                                                  checked={isChecked}
                                                  disabled={isFormLockedForMember}
                                                  onChange={() => {
                                                    if (isFormLockedForMember) return;
                                                    setCustomFieldValues((prev) => ({
                                                      ...prev,
                                                      [field.id]: opt,
                                                    }));
                                                    if (customFieldErrors[field.id]) {
                                                      setCustomFieldErrors((prev) => {
                                                        const cp = { ...prev };
                                                        delete cp[field.id];
                                                        return cp;
                                                      });
                                                    }
                                                  }}
                                                  className="w-4 h-4 text-[#9E1B20] border-slate-300 focus:ring-[#9E1B20] disabled:opacity-60"
                                                />
                                                <span className="text-sm">{opt}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {field.type === 'multicheckbox' && (
                                        <div className="space-y-2 pt-0.5">
                                          {field.options?.map((opt, oIdx) => {
                                            const currentArr = Array.isArray(customFieldValues[field.id])
                                              ? (customFieldValues[field.id] as string[])
                                              : [];
                                            const isChecked = currentArr.includes(opt);
                                            return (
                                              <label
                                                key={oIdx}
                                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                                  isFormLockedForMember ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                                                } ${
                                                  isChecked
                                                    ? 'bg-red-50/50 border-[#9E1B20] text-slate-900 shadow-2xs font-semibold'
                                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  value={opt}
                                                  checked={isChecked}
                                                  disabled={isFormLockedForMember}
                                                  onChange={(e) => {
                                                    if (isFormLockedForMember) return;
                                                    let nextArr: string[];
                                                    if (e.target.checked) {
                                                      nextArr = [...currentArr, opt];
                                                    } else {
                                                      nextArr = currentArr.filter((item) => item !== opt);
                                                    }
                                                    setCustomFieldValues((prev) => ({
                                                      ...prev,
                                                      [field.id]: nextArr,
                                                    }));
                                                    if (customFieldErrors[field.id]) {
                                                      setCustomFieldErrors((prev) => {
                                                        const cp = { ...prev };
                                                        delete cp[field.id];
                                                        return cp;
                                                      });
                                                    }
                                                  }}
                                                  className="w-4 h-4 text-[#9E1B20] rounded border-slate-300 focus:ring-[#9E1B20] disabled:opacity-60"
                                                />
                                                <span className="text-sm">{opt}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {field.type === 'checkbox' && (
                                        <label
                                          className={`flex items-start gap-2.5 p-3 rounded-lg border transition-colors ${
                                            isFormLockedForMember ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                                          } ${
                                            customFieldValues[field.id]
                                              ? 'bg-red-50/30 border-[#9E1B20]/40'
                                              : 'bg-white border-slate-200 hover:bg-slate-50'
                                          } ${customFieldErrors[field.id] ? 'border-red-500 bg-red-50/20' : ''}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={Boolean(customFieldValues[field.id])}
                                            disabled={isFormLockedForMember}
                                            onChange={(e) => {
                                              if (isFormLockedForMember) return;
                                              setCustomFieldValues((prev) => ({
                                                ...prev,
                                                [field.id]: e.target.checked,
                                              }));
                                              if (customFieldErrors[field.id]) {
                                                setCustomFieldErrors((prev) => {
                                                  const cp = { ...prev };
                                                  delete cp[field.id];
                                                  return cp;
                                                });
                                              }
                                            }}
                                            className="w-4 h-4 mt-0.5 text-[#9E1B20] rounded border-slate-300 focus:ring-[#9E1B20] disabled:opacity-60"
                                          />
                                          <span className="text-sm font-medium text-slate-800">
                                            Xác nhận lựa chọn này
                                          </span>
                                        </label>
                                      )}

                                      {customFieldErrors[field.id] && (
                                        <p className="text-xs font-semibold text-[#9E1B20] mt-1 flex items-center gap-1">
                                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                          <span>{customFieldErrors[field.id]}</span>
                                        </p>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                        {/* Ghi chú, đề xuất kiến nghị */}
                        <div>
                          <label
                            htmlFor={`note-${event.id}`}
                            className="block text-sm font-semibold text-slate-700 mb-1"
                          >
                            Ghi chú, đề xuất kiến nghị hoặc đăng ký tiết mục văn nghệ giao lưu (Không bắt buộc)
                          </label>
                          <textarea
                            id={`note-${event.id}`}
                            rows={2}
                            readOnly={isFormLockedForMember}
                            placeholder={
                              isFormLockedForMember
                                ? 'Không có ghi chú bổ sung'
                                : 'Chia sẻ kỷ niệm, đề xuất ý kiến cho chương trình hoặc đăng ký tiết mục văn nghệ giao lưu...'
                            }
                            value={registrationNote}
                            onChange={(e) => !isFormLockedForMember && setRegistrationNote(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20] disabled:bg-slate-100 read-only:bg-slate-50 read-only:text-slate-600"
                          />
                        </div>

                        {Object.keys(customFieldErrors).length > 0 && (
                          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-[#9E1B20] flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Vui lòng hoàn thành các trường bắt buộc (*) trước khi xác nhận.</span>
                          </div>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRegisterEventId(null);
                              setConfiguringFieldsEventId(null);
                            }}
                            className="min-h-[44px] px-4 py-2.5 sm:py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-100 cursor-pointer"
                          >
                            Đóng lại
                          </button>
                          {(!isRegistered || currentUser.isAdmin) && (
                            <button
                              type="button"
                              disabled={isRegistering}
                              onClick={() => handleConfirmRegistration(event)}
                              className="min-h-[44px] px-5 py-2.5 sm:py-2 text-sm font-semibold text-white bg-[#9E1B20] rounded-xl sm:rounded-lg hover:bg-[#7D1418] cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <Send className="w-4 h-4 shrink-0" />
                              <span>
                                {isRegistering
                                  ? 'Đang gửi email xác nhận & nhắc lịch...'
                                  : isRegistered
                                    ? 'Cập nhật Đăng ký (Admin cấp 1)'
                                    : 'Xác nhận Đăng ký & Nhận Email'}
                              </span>
                            </button>
                          )}
                          {isFormLockedForMember && onOpenMyTickets && (
                            <button
                              type="button"
                              onClick={onOpenMyTickets}
                              className="min-h-[44px] px-5 py-2.5 sm:py-2 text-sm font-bold text-white bg-[#9E1B20] rounded-xl sm:rounded-lg hover:bg-[#7D1418] cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <QrCode className="w-4 h-4 shrink-0" />
                              <span>Mở Phiếu Đơn ĐK & Mã QR Cá nhân</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        }))}

        {/* Past Events Archive (Hidden by default per requirement) */}
        {pastEvents.length > 0 && eventsFilterTab === 'upcoming' && (
          <div className="pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowPastEvents((prev) => !prev)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <span>
                  Lưu trữ sự kiện đã qua ({pastEvents.length} sự kiện đã kết thúc)
                </span>
              </div>
              {showPastEvents ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showPastEvents && (
              <div className="mt-4 space-y-4">
                {pastEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-80"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                          Đã kết thúc
                        </span>
                        <span className="text-xs text-slate-500">
                          {event.eventDate} ({event.eventTime})
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {event.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {event.venue} ({event.province}) · Đơn vị tổ chức: {event.organizer}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      {currentUser &&
                        userRegistrations[event.id]?.uid === currentUser.uid && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            Đã từng tham gia
                          </span>
                        )}
                      <button
                        type="button"
                        onClick={() => {
                          setAttendeeSearchQuery('');
                          setViewingAttendeesEvent(event);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Xem danh sách đại biểu đã đăng ký"
                      >
                        <Users className="w-3 h-3 text-[#9E1B20]" />
                        <span>Đại biểu ({getEffectiveRegCount(event)})</span>
                      </button>
                      {currentUser?.isAdmin && (
                        <button
                          type="button"
                          disabled={isExportingExcel === event.id}
                          onClick={() => handleExportExcel(event)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-60"
                          title="Xuất danh sách đăng ký ra tệp Excel (.xlsx)"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                          <span>Xuất Excel</span>
                        </button>
                      )}
                      {currentUser?.isAdmin && (
                        <button
                          type="button"
                          onClick={() => openEditEventModal(event, 'info')}
                          className="px-2.5 py-1 text-xs font-semibold text-[#9E1B20] bg-white hover:bg-red-50 border border-red-200 rounded-md cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Chỉnh sửa thông tin hoặc đổi ngày tổ chức sự kiện"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Chỉnh sửa</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Attendee List & Excel Export Modal */}
      {viewingAttendeesEvent && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendees-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-6xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-red-50 text-[#9E1B20] rounded-xl border border-red-100 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      CƠ SỞ DỮ LIỆU ĐĂNG KÝ SỰ KIỆN
                    </span>
                    <span className="text-xs text-slate-500">
                      {viewingAttendeesEvent.eventDate} ({viewingAttendeesEvent.eventTime})
                    </span>
                  </div>
                  <h2 id="attendees-modal-title" className="text-lg sm:text-xl font-bold text-[#0F172A] mt-1">
                    {viewingAttendeesEvent.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Địa điểm: {viewingAttendeesEvent.venue} ({viewingAttendeesEvent.province}) · Ban tổ chức: {viewingAttendeesEvent.organizer}
                  </p>
                  <p className="text-[11px] text-[#9E1B20] font-medium mt-1">
                    {!currentUser
                      ? '• Yêu cầu định danh: Chỉ thành viên ALUMNI KTD đã đăng nhập mới xem được danh sách chi tiết đại biểu.'
                      : '• Danh sách tinh gọn & bảo mật: Chỉ hiển thị thông tin thiết yếu và tự động ẩn số điện thoại người đăng ký.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingAttendeesEvent(null)}
                aria-label="Đóng cửa sổ danh sách"
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Statistics Dashboard for Multi-Choice Events */}
            {hasMultiChoiceEventForm(viewingAttendeesEvent) ? (
              <EventStatsDashboard
                event={viewingAttendeesEvent}
                attendees={modalUnfilteredAttendees}
                compact
              />
            ) : (
              /* Quick Metrics Bar for Simple Events */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Tổng đại biểu đã đăng ký</p>
                  <p className="text-xl font-bold text-[#9E1B20] mt-0.5">
                    {effectiveViewingRegCount} / {viewingAttendeesEvent.capacity}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">BTC đã xác nhận</p>
                  <p className="text-xl font-bold text-emerald-700 mt-0.5">
                    {modalUnfilteredAttendees.filter((a) => a.btcConfirmed).length} / {effectiveViewingRegCount}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                  <p className="text-xs text-slate-500">Thời gian tổ chức</p>
                  <p className="text-sm font-bold text-slate-800 mt-1 truncate">
                    {viewingAttendeesEvent.eventTime} · {viewingAttendeesEvent.eventDate}
                  </p>
                </div>
              </div>
            )}

            {currentUser?.isAdmin && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isExportingExcel === viewingAttendeesEvent.id}
                  onClick={() => handleExportExcel(viewingAttendeesEvent)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{isExportingExcel === viewingAttendeesEvent.id ? 'Đang xuất...' : 'Tải Excel (.xlsx)'}</span>
                </button>
                {onResetEventRegistrations && (
                  <button
                    type="button"
                    onClick={() => setEventToReset(viewingAttendeesEvent)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#9E1B20] border border-red-300 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Reset đưa toàn bộ số lượng và danh sách đăng ký của sự kiện này về 0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#9E1B20]" />
                    <span>Reset Toàn bộ ĐK</span>
                  </button>
                )}
              </div>
            )}

            {/* Smart Filter Bar & BTC Confirmation Auth Controls */}
            <div className="space-y-3 pt-1">
              <EventAttendeeSmartFilterBar
                event={viewingAttendeesEvent}
                allAttendees={modalUnfilteredAttendees}
                filteredCount={modalAttendees.length}
                filter={modalSmartFilter}
                onChange={(nextFilter) => {
                  setModalSmartFilter(nextFilter);
                  setAttendeeModalPage(1);
                }}
              />

              <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  BTC đã xác nhận: {modalUnfilteredAttendees.filter((a) => a.btcConfirmed).length} / {effectiveViewingRegCount}
                </span>

                <div className="flex flex-wrap items-center gap-2.5">
                  {canConfirmBtc ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Quyền xác nhận BTC: Admin 2 (Đang bật)</span>
                    </span>
                  ) : currentUser?.isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdmin2AuthBox((prev) => !prev);
                        setAdmin2AuthError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#9E1B20] hover:bg-[#7D1418] text-white font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Đăng nhập tài khoản Admin 2 để mở quyền bấm nút Check BTC đã xác nhận"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Đăng nhập Admin 2 (Xác nhận BTC)</span>
                    </button>
                  ) : null}

                  <span className="text-slate-600 font-medium tabular-nums">
                    Trang {safeAttendeeModalPage}/{totalModalAttendeePages} ({ATTENDEE_PAGE_SIZE} người/trang · Đang hiển thị {modalAttendees.length} đại biểu)
                  </span>
                </div>
              </div>
            </div>

            {/* Inline Admin 2 Quick Login Box for BTC Confirmation - Dành riêng cho Admin */}
            {currentUser?.isAdmin && showAdmin2AuthBox && !canConfirmBtc && (
              <form
                onSubmit={handleAdmin2InlineSubmit}
                className="p-4 bg-red-50/80 border-2 border-[#9E1B20] rounded-xl space-y-3 shadow-sm animate-in fade-in duration-150"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#9E1B20] text-white rounded-lg shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        Xác thực Quyền "BTC Đã Xác Nhận" (Dành riêng cho Tài khoản Admin 2)
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Nhập tài khoản và mật khẩu Admin 2 để kích hoạt nút Check xác nhận đại biểu.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdmin2AuthBox(false);
                      setPendingConfirmAttendee(null);
                      setAdmin2AuthError(null);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Đóng ✕
                  </button>
                </div>

                {admin2AuthError && (
                  <div className="p-2.5 bg-white border-l-4 border-[#9E1B20] text-[#9E1B20] text-xs font-semibold rounded-r-lg">
                    {admin2AuthError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-5 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Tài khoản xác nhận BTC (*)
                    </label>
                    <input
                      type="text"
                      required
                      value={admin2Username}
                      onChange={(e) => setAdmin2Username(e.target.value)}
                      placeholder="Tài khoản / Email Admin 2"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                  </div>
                  <div className="sm:col-span-4 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Mật khẩu (*)
                    </label>
                    <input
                      type="password"
                      required
                      value={admin2Password}
                      onChange={(e) => setAdmin2Password(e.target.value)}
                      placeholder="Nhập mật khẩu Admin 2..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={isAdmin2Submitting}
                      className="w-full py-2 px-3 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAdmin2Submitting ? 'Đang xác thực...' : 'Mở quyền Check'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {adminEditSuccessMsg && (
              <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{adminEditSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminEditSuccessMsg(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            )}

            {/* Admin Inline Shirt Size & Registration Editor Panel */}
            {currentUser?.isAdmin && editingAttendeeUid && (
              <div
                id="admin-inline-attendee-editor"
                className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-3 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-[#9E1B20]" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      Chỉnh sửa Size Áo & Đăng ký cho đại biểu:{' '}
                      <span className="text-[#9E1B20]">{editingAttendeeName}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingAttendeeUid(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded bg-white border border-slate-200 cursor-pointer"
                  >
                    Hủy đóng
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Gala participation toggle */}
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
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Không dự tiệc
                      </button>
                    </div>
                  </div>

                  {/* Payment status toggle */}
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
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Đã chuyển khoản
                      </button>
                    </div>
                  </div>
                </div>

                {/* Shirt orders list editor */}
                <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-bold uppercase text-slate-700 flex items-center gap-1.5">
                      <Shirt className="w-3.5 h-3.5 text-[#9E1B20]" />
                      <span>
                        3. Danh sách Áo thun Polo đã đặt (Đổi Form Nam/Nữ, Size S–3XL hoặc Số lượng)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setAdminEditShirtOrders((prev) => [
                          ...prev,
                          {
                            id: `shirt-admin-${Date.now()}-${prev.length}`,
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

                  {adminEditShirtOrders.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-2 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      Đại biểu này hiện không đặt áo thun. Nhấn "+ Thêm dòng áo" nếu muốn bổ sung áo.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {adminEditShirtOrders.map((ord, idx) => {
                        const availableSizes: EventShirtOrder['size'][] =
                          ord.gender === 'Nam'
                            ? ['S', 'M', 'L', 'XL', 'XXL', '3XL']
                            : ['S', 'M', 'L', 'XL', 'XXL'];
                        return (
                          <div
                            key={ord.id || idx}
                            className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <span className="text-xs font-bold text-slate-500 w-14">
                              Áo #{idx + 1}:
                            </span>

                            {/* Form Nam / Nữ */}
                            <select
                              value={ord.gender}
                              onChange={(e) => {
                                const newGender = e.target.value as EventShirtOrder['gender'];
                                setAdminEditShirtOrders((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          gender: newGender,
                                          size:
                                            newGender === 'Nữ' && item.size === '3XL'
                                              ? 'XXL'
                                              : item.size,
                                        }
                                      : item
                                  )
                                );
                              }}
                              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#9E1B20]"
                            >
                              <option value="Nam">Form Nam</option>
                              <option value="Nữ">Form Nữ</option>
                            </select>

                            {/* Size S - 3XL */}
                            <div className="flex items-center gap-1">
                              {availableSizes.map((sz) => (
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
                                  className={`px-2 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                                    ord.size === sz
                                      ? 'bg-[#9E1B20] text-white border-[#9E1B20]'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {sz === 'XXL' ? '2XL' : sz}
                                </button>
                              ))}
                            </div>

                            {/* Quantity */}
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="text-[11px] text-slate-500 font-medium">SL:</span>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={ord.quantity}
                                onChange={(e) => {
                                  const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  setAdminEditShirtOrders((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, quantity: qty } : item
                                    )
                                  );
                                }}
                                className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setAdminEditShirtOrders((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa dòng áo này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                    <div className="text-xs text-slate-700">
                      Tổng lệ phí sau điều chỉnh:{' '}
                      <strong className="text-sm text-[#9E1B20]">
                        {(
                          (adminEditAttendGala
                            ? viewingAttendeesEvent.galaFeeAmount ?? 350000
                            : 0) +
                          adminEditShirtOrders.reduce((s, o) => s + o.quantity, 0) *
                            (viewingAttendeesEvent.shirtFeeAmount ?? 110000)
                        ).toLocaleString('vi-VN')}
                        đ
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingAttendeeUid(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={isSavingAdminEdit}
                        onClick={handleSaveAdminEditAttendee}
                        className="px-4 py-1.5 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isSavingAdminEdit ? 'Đang lưu...' : 'Lưu thay đổi Size Áo & ĐK'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Simplified Table of Attendees (Essential Info + Masked Phone Numbers, 20 per page) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-800 uppercase font-semibold text-[11px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 w-12 text-center">STT</th>
                      <th className="px-3 py-2.5">Họ và tên</th>
                      <th className="px-3 py-2.5">Lớp & Khoa</th>
                      <th className="px-3 py-2.5">SĐT (Bảo mật)</th>
                      <th className="px-3 py-2.5">Nội dung đăng ký</th>
                      <th className="px-3 py-2.5 text-center">BTC đã xác nhận</th>
                      {currentUser?.isAdmin && (
                        <th className="px-3 py-2.5 text-center">Quản trị</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedModalAttendees.length === 0 ? (
                      <tr>
                        <td
                          colSpan={currentUser?.isAdmin ? 7 : 6}
                          className="px-4 py-10 text-center space-y-3"
                        >
                          {!currentUser ? (
                            <>
                              <p className="text-sm font-bold text-slate-800">
                                Hiện chưa có đại biểu nào trong danh sách hoặc bạn chưa đăng nhập Thành viên
                              </p>
                              <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Để đăng ký tham gia sự kiện hoặc xem danh sách chi tiết, vui lòng đăng nhập tài khoản Thành viên.
                              </p>
                              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onGoogleLogin) {
                                      void onGoogleLogin();
                                    } else {
                                      setViewingAttendeesEvent(null);
                                      onNavigateToNetwork();
                                    }
                                  }}
                                  className="px-4 py-2 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  <span>Đăng nhập Thành viên để xem</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-500">
                              {attendeeSearchQuery
                                ? `Không tìm thấy đại biểu nào phù hợp với từ khóa "${attendeeSearchQuery}"`
                                : 'Chưa có đại biểu nào đăng ký tham gia sự kiện này.'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ) : (
                      paginatedModalAttendees.map((att) => (
                        <tr
                          key={att.uid || att.stt}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            editingAttendeeUid === att.uid ? 'bg-amber-50/70' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 text-slate-500 font-mono text-center tabular-nums">
                            {att.stt}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {att.fullName}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-[#9E1B20]">
                              {att.className || 'KTD'}
                            </span>
                            {att.faculty && (
                              <span className="text-slate-500 text-[11px] ml-1">
                                ({att.faculty})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                            {formatSafeAttendeePhone(
                              att.phone,
                              members.find((m) => m.uid === att.uid)?.zaloPhoneMasked
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {(() => {
                              const visibleCustomFields = (viewingAttendeesEvent.customFields || []).filter(
                                (cf) => {
                                  if (cf.id === 'cf_attend_gala' || cf.id === 'cf_uniform_shirt') {
                                    return false;
                                  }
                                  const val = att.customAnswers?.[cf.id];
                                  return val !== undefined && val !== null && val !== '';
                                }
                              );
                              const hasDetails =
                                att.attendGala !== undefined ||
                                (att.shirtOrders && att.shirtOrders.length > 0) ||
                                visibleCustomFields.length > 0;
                              return (
                                <div className="flex flex-wrap items-center gap-1 max-w-[260px]">
                                  {att.attendGala !== undefined && (
                                    <span
                                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                        att.attendGala
                                          ? 'bg-red-50 text-[#9E1B20] border border-red-200'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      Gala: {att.attendGala ? 'Có' : 'Không'}
                                    </span>
                                  )}

                                  {att.shirtOrders && att.shirtOrders.length > 0 && (
                                    <>
                                      {att.shirtOrders.map((ord, oIdx) => (
                                        <span
                                          key={`${ord.id}-${oIdx}`}
                                          className="text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded"
                                        >
                                          {ord.quantity}x Áo {ord.gender} ({ord.size === 'XXL' ? '2XL' : ord.size})
                                        </span>
                                      ))}
                                    </>
                                  )}

                                  {visibleCustomFields.map((cf) => {
                                    const val = att.customAnswers?.[cf.id];
                                    return (
                                      <span
                                        key={cf.id}
                                        className="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[200px]"
                                        title={`${cf.label}: ${val}`}
                                      >
                                        {typeof val === 'boolean'
                                          ? val
                                            ? 'Có'
                                            : 'Không'
                                          : Array.isArray(val)
                                            ? val.join(', ')
                                            : String(val)}
                                      </span>
                                    );
                                  })}

                                  {!hasDetails && (
                                    <span className="text-slate-500 text-[11px]">Tham dự</span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {currentUser?.isAdmin || canConfirmBtc ? (
                              <button
                                type="button"
                                disabled={togglingBtcUid === att.uid}
                                onClick={() =>
                                  handleToggleBtcConfirmed(viewingAttendeesEvent, att)
                                }
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                                  att.btcConfirmed
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                    : canConfirmBtc
                                      ? 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-300 hover:border-emerald-400 shadow-2xs'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-300'
                                }`}
                                title={
                                  canConfirmBtc
                                    ? att.btcConfirmed
                                      ? 'Bấm để bỏ xác nhận BTC'
                                      : 'Bấm nút Check để xác nhận đại biểu (Admin 2)'
                                    : 'Chỉ tài khoản Admin 2 mới có quyền xác nhận (Bấm để đăng nhập Admin 2)'
                                }
                              >
                                <span
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${
                                    att.btcConfirmed
                                      ? 'bg-white text-emerald-700'
                                      : 'border border-slate-400 bg-white text-transparent'
                                  }`}
                                >
                                  ✓
                                </span>
                                <span>
                                  {att.btcConfirmed ? 'BTC đã xác nhận' : 'Chờ xác nhận'}
                                </span>
                              </button>
                            ) : att.btcConfirmed ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 select-none"
                                title="Ban Tổ chức đã xác nhận đại biểu này"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>BTC đã xác nhận</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 select-none"
                                title="Đang chờ Ban Tổ chức đối soát xác nhận"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                <span>Chờ BTC xác nhận</span>
                              </span>
                            )}
                          </td>
                          {currentUser?.isAdmin && (
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {onAdminUpdateRegistration && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAdminEditAttendee(att)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9E1B20] bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer"
                                    title="Chỉnh sửa Size Áo / Đăng ký"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Sửa</span>
                                  </button>
                                )}
                                {onDeleteSingleRegistration && (
                                  <button
                                    type="button"
                                    disabled={deletingAttendeeUid === att.uid}
                                    onClick={() =>
                                      handlePromptDeleteSingleRegistration(
                                        viewingAttendeesEvent.id,
                                        att.uid,
                                        att.fullName
                                      )
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Hủy đăng ký đại biểu này"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Multi-Page Pagination Bar inside Modal (20 people per page) */}
              {modalAttendees.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                  <div>
                    Hiển thị{' '}
                    <strong className="text-slate-900 font-semibold tabular-nums">
                      {(safeAttendeeModalPage - 1) * ATTENDEE_PAGE_SIZE + 1} –{' '}
                      {Math.min(
                        safeAttendeeModalPage * ATTENDEE_PAGE_SIZE,
                        modalAttendees.length
                      )}
                    </strong>{' '}
                    trên tổng số{' '}
                    <strong className="text-slate-900 font-semibold tabular-nums">
                      {modalAttendees.length}
                    </strong>{' '}
                    người tham gia ({ATTENDEE_PAGE_SIZE} người/trang · Trang {safeAttendeeModalPage}/{totalModalAttendeePages})
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safeAttendeeModalPage === 1}
                      onClick={() => setAttendeeModalPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Trước
                    </button>
                    {Array.from({ length: totalModalAttendeePages }, (_, i) => i + 1).map(
                      (pNum) => (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setAttendeeModalPage(pNum)}
                          className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors cursor-pointer tabular-nums ${
                            safeAttendeeModalPage === pNum
                              ? 'bg-[#9E1B20] text-white shadow-2xs'
                              : 'border border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {pNum}
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      disabled={safeAttendeeModalPage === totalModalAttendeePages}
                      onClick={() =>
                        setAttendeeModalPage((p) => Math.min(totalModalAttendeePages, p + 1))
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Admin has Excel export guide; Members have simple close view */}
            {currentUser?.isAdmin ? (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Quy chuẩn file Excel xuất ra (Tối ưu cho hàm =SUM, =SUMIFS & PivotTable):</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    • <strong>Sheet 1 (1. Danh sách đại biểu)</strong>: Tách riêng từng cột số nguyên cho <strong>ÁO NAM (S, M, L, XL, XXL, 3XL)</strong> và <strong>ÁO NỮ (S, M, L, XL, XXL)</strong> kèm dòng <strong>TỔNG CỘNG gắn sẵn công thức =SUM()</strong>.<br />
                    • <strong>Sheet 2 (2. Chi tiết Đặt áo - Tách dòng)</strong>: Chuẩn hóa 1 dòng = 1 loại áo để dùng hàm <code>=SUMIFS()</code> hoặc kéo <strong>PivotTable</strong>.<br />
                    • <strong>Sheet 3 (3. Thống kê & Chốt nhà may)</strong>: Bảng tổng hợp số lượng từng Form × Size gửi xưởng may và đối soát kinh phí Gala.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewingAttendeesEvent(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={isExportingExcel === viewingAttendeesEvent.id}
                    onClick={() => handleExportExcel(viewingAttendeesEvent)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExportingExcel === viewingAttendeesEvent.id ? 'Đang xuất file...' : 'Tải file Excel (.xlsx)'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Danh sách đại biểu được cập nhật tự động theo thời gian thực khi có cựu sinh viên đăng ký tham gia.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingAttendeesEvent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer shrink-0"
                >
                  Đóng cửa sổ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified 3-Step Event Creator & Editor Modal for Admin */}
      <EventEditorModal
        isOpen={editorModalState.isOpen}
        mode={editorModalState.mode}
        initialTab={editorModalState.initialTab}
        initialEvent={editorModalState.event}
        onClose={() =>
          setEditorModalState((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        onSave={handleEditorModalSave}
      />

      {/* Reset Confirmation Modal for Admin */}
      {eventToReset && (
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
                  Sự kiện: <strong className="text-slate-800">{eventToReset.title}</strong>
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
                  Toàn bộ <strong>{allEventRegistrations[eventToReset.id] !== undefined ? allEventRegistrations[eventToReset.id].length : (eventToReset.registeredCount || 0)} lượt đăng ký</strong> hiện tại của đại biểu sẽ bị xóa sạch khỏi cơ sở dữ liệu.
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
                onClick={() => setEventToReset(null)}
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

      {/* Safe Event Deletion Confirmation Modal for Admin */}
      {eventToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-red-300 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-[#9E1B20] flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E1B20] bg-red-50 px-2 py-0.5 rounded">
                  Cảnh báo An toàn Quản trị viên
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  Xác nhận Xóa Sự kiện Vĩnh viễn?
                </h3>
                <p className="text-xs text-slate-500">
                  Sự kiện: <strong className="text-slate-800">{eventToDelete.title}</strong>
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-red-950">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Hành động nguy hiểm không thể hoàn tác:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  Toàn bộ thông tin chương trình, lịch trình, thời gian, địa điểm và cấu hình Form đăng ký sẽ bị xóa vĩnh viễn.
                </li>
                <li>
                  Tất cả <strong>{allEventRegistrations[eventToDelete.id] !== undefined ? allEventRegistrations[eventToDelete.id].length : (eventToDelete.registeredCount || 0)} lượt đăng ký</strong> của đại biểu tham gia sự kiện này sẽ bị xóa đồng thời khỏi hệ thống.
                </li>
                <li>
                  Hội viên và khách mời sẽ không còn tìm thấy sự kiện này trên ứng dụng.
                </li>
              </ul>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingEventId === eventToDelete.id}
                onClick={() => setEventToDelete(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ an toàn
              </button>
              <button
                type="button"
                disabled={isDeletingEventId === eventToDelete.id}
                onClick={() => handleConfirmDeleteEvent(eventToDelete)}
                className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
              >
                {isDeletingEventId === eventToDelete.id ? (
                  <>
                    <Trash2 className="w-4 h-4 animate-spin" />
                    <span>Đang xóa sự kiện...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xác nhận Xóa vĩnh viễn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
