import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Sliders,
  Eye,
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CheckSquare,
  CircleDot,
  ListFilter,
  AlignLeft,
  Type,
  Check,
  Shirt,
  DollarSign,
  Copy,
  FileText,
  QrCode,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import {
  EventCustomField,
  EventCustomFieldType,
  EventRecord,
  VIETNAM_34_PROVINCES_2025,
} from '../data/constants';
import {
  EventFormInput,
  buildTransferSyntax,
  buildVietQrImageUrl,
  compressQrImage,
  validateEventForm,
} from '../utils/alumniLogic';

interface EventEditorModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialEvent?: EventRecord | null;
  initialTab?: 'info' | 'registration' | 'preview';
  onClose: () => void;
  onSave: (input: EventFormInput, existingEventId?: string) => Promise<void>;
}

const EVENT_CATEGORIES = [
  'Hội ngộ Thường niên',
  'Gala Truyền thống & Họp mặt',
  'Hội thảo & Giao lưu',
  'Kết nối Doanh nghiệp B2B',
  'Hoạt động Cộng đồng & Học bổng',
];

const QUICK_TIME_SLOTS = [
  '08:00 - 11:30',
  '08:00 - 13:30',
  '14:00 - 17:30',
  '17:30 - 21:30',
  '18:00 - 22:00',
];

const QUESTION_TYPE_CARDS: {
  type: EventCustomFieldType;
  title: string;
  desc: string;
  badge: string;
}[] = [
  {
    type: 'radio',
    title: 'Trắc nghiệm (1 lựa chọn)',
    desc: 'Người đăng ký chọn 1 phương án duy nhất',
    badge: 'Trắc nghiệm',
  },
  {
    type: 'multicheckbox',
    title: 'Hộp kiểm (Nhiều lựa chọn)',
    desc: 'Cho phép tích chọn đồng thời nhiều mục',
    badge: 'Chọn nhiều',
  },
  {
    type: 'select',
    title: 'Menu thả xuống (Dropdown)',
    desc: 'Danh sách thu gọn để chọn 1 mục (VD: Size áo)',
    badge: 'Dropdown',
  },
  {
    type: 'textarea',
    title: 'Ghi chú / Đề xuất kiến nghị',
    desc: 'Ô nhập văn bản nhiều dòng cho ý kiến đóng góp',
    badge: 'Nhiều dòng',
  },
  {
    type: 'text',
    title: 'Câu trả lời ngắn (1 dòng)',
    desc: 'Nhập thông tin ngắn gọn (VD: Chủ đề tham luận)',
    badge: 'Văn bản ngắn',
  },
  {
    type: 'checkbox',
    title: 'Xác nhận đơn (Đồng ý / Có)',
    desc: '1 ô tích xác nhận nhu cầu đơn lẻ',
    badge: 'Hộp kiểm đơn',
  },
];

const PRESET_TEMPLATES: {
  category: string;
  name: string;
  field: Omit<EventCustomField, 'id'>;
}[] = [
  {
    category: 'Tiệc & Hậu cần',
    name: '+ Tham dự Tiệc tối / Gala (Trắc nghiệm)',
    field: {
      label: 'Đăng ký tham dự Tiệc tối Gala giao lưu',
      type: 'radio',
      required: true,
      options: [
        'Có, tôi tham dự trọn vẹn chương trình & Tiệc Gala',
        'Không, tôi chỉ tham dự phiên Hội thảo chính thức',
      ],
    },
  },
  {
    category: 'Tiệc & Hậu cần',
    name: '+ Chọn Size Áo lưu niệm (Menu chọn)',
    field: {
      label: 'Đăng ký kích cỡ áo đồng phục kỷ niệm sự kiện',
      type: 'select',
      required: false,
      options: ['Size S', 'Size M', 'Size L', 'Size XL', 'Size XXL', 'Size 3XL'],
    },
  },
  {
    category: 'Tiệc & Hậu cần',
    name: '+ Xe đưa đón Sân bay / Khách sạn',
    field: {
      label: 'Đăng ký sử dụng xe đưa đón của Ban Tổ chức từ Sân bay / Khách sạn',
      type: 'checkbox',
      required: false,
    },
  },
  {
    category: 'Chuyên môn & B2B',
    name: '+ Chọn các Phiên chuyên đề (Hộp kiểm nhiều lựa chọn)',
    field: {
      label: 'Bạn quan tâm tham dự những phiên hoạt động nào trong chương trình?',
      type: 'multicheckbox',
      required: false,
      options: [
        'Phiên 1: Tọa đàm Kiến trúc - Xây dựng & Chuyển đổi số',
        'Phiên 2: Kết nối Giao thương Doanh nghiệp ALUMNI B2B',
        'Phiên 3: Giao lưu truyền lửa cùng Sinh viên tiêu biểu',
        'Phiên 4: Đêm Gala Gặp mặt & Tri ân Thầy Cô',
      ],
    },
  },
  {
    category: 'Chuyên môn & B2B',
    name: '+ Thuyết trình Pitching / Bàn trưng bày B2B',
    field: {
      label: 'Đăng ký hoạt động kết nối doanh nghiệp tại sự kiện',
      type: 'multicheckbox',
      required: false,
      options: [
        'Đăng ký bài thuyết trình / Pitching 5 phút giới thiệu doanh nghiệp',
        'Đăng ký bàn trưng bày catalog & mẫu vật liệu (1.2m x 0.8m)',
        'Tài trợ học bổng / Quà tặng giao lưu tại sự kiện',
      ],
    },
  },
  {
    category: 'Ý kiến & Giao lưu',
    name: '+ Ghi chú, Đề xuất kiến nghị / Văn nghệ (Nhiều dòng)',
    field: {
      label: 'Ghi chú, đề xuất kiến nghị hoặc đăng ký tiết mục văn nghệ giao lưu',
      type: 'textarea',
      required: false,
      placeholder:
        'Chia sẻ ý kiến đóng góp cho Ban Tổ chức, yêu cầu thực đơn chay hoặc đăng ký tiết mục văn nghệ...',
    },
  },
];

export const EventEditorModal: React.FC<EventEditorModalProps> = ({
  isOpen,
  mode,
  initialEvent,
  initialTab = 'info',
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'registration' | 'preview'>(initialTab);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Event Basic Form State
  const [formData, setFormData] = useState<EventFormInput>({
    title: '',
    eventDate: '2026-11-24',
    eventTime: '11:00',
    province: 'Thành phố Đà Nẵng',
    venue: 'Nhà hàng Quảng Đại Gold, số 187 đường 30/4 - Tp Đà Nẵng',
    category: 'Gala Truyền thống & Họp mặt',
    capacity: 250,
    summary: '',
    organizer: 'Ban Thường vụ Đoàn trường & Ban Điều hành Mạng lưới CSV KTD',
    status: 'open',
    isGalaWithShirtFee: true,
    qrImageUrl: '',
    bankName: 'Vietcombank (Chi nhánh Đà Nẵng)',
    bankAccount: '1018 2026 88',
    bankAccountName: 'MANG LUOI ALUMNI KTD - BTC GALA',
    galaFeeAmount: 350000,
    shirtFeeAmount: 110000,
    transferSyntaxPrefix: 'Gala',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Registration Config State
  const [enableCustomRegistration, setEnableCustomRegistration] = useState<boolean>(true);
  const [customFields, setCustomFields] = useState<EventCustomField[]>([]);

  // Question Builder / Editor State
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [qLabel, setQLabel] = useState('');
  const [qType, setQType] = useState<EventCustomFieldType>('radio');
  const [qRequired, setQRequired] = useState(false);
  const [qPlaceholder, setQPlaceholder] = useState('');
  const [qDescription, setQDescription] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['Phương án 1', 'Phương án 2']);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [qError, setQError] = useState<string | null>(null);

  // Synchronize state when modal opens or initialEvent changes
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setErrors({});
    setQError(null);
    setIsBuilderOpen(false);
    setEditingFieldId(null);

    if (mode === 'edit' && initialEvent) {
      setFormData({
        title: initialEvent.title || '',
        eventDate: initialEvent.eventDate || '2026-11-24',
        eventTime: initialEvent.eventTime || '11:00',
        province: initialEvent.province || 'Thành phố Đà Nẵng',
        venue: initialEvent.venue || '',
        category: initialEvent.category || 'Gala Truyền thống & Họp mặt',
        capacity: initialEvent.capacity || 250,
        summary: initialEvent.summary || '',
        organizer:
          initialEvent.organizer && !initialEvent.organizer.includes('Ban Liên lạc')
            ? initialEvent.organizer
            : 'Ban Thường vụ Đoàn trường & Ban Điều hành Mạng lưới CSV KTD',
        status: initialEvent.status || 'open',
        isGalaWithShirtFee: Boolean(
          initialEvent.isGalaWithShirtFee || initialEvent.id === 'evt-gala-can-bo-doan'
        ),
        qrImageUrl: initialEvent.qrImageUrl || '',
        bankName: initialEvent.bankName || 'Vietcombank (Chi nhánh Đà Nẵng)',
        bankAccount: initialEvent.bankAccount || '1018 2026 88',
        bankAccountName: initialEvent.bankAccountName || 'MANG LUOI ALUMNI KTD - BTC GALA',
        galaFeeAmount: initialEvent.galaFeeAmount ?? 350000,
        shirtFeeAmount: initialEvent.shirtFeeAmount ?? 110000,
        transferSyntaxPrefix:
          !initialEvent.transferSyntaxPrefix || initialEvent.transferSyntaxPrefix === 'GALA KTD'
            ? 'Gala'
            : initialEvent.transferSyntaxPrefix,
      });
      const existingFields = initialEvent.customFields ? [...initialEvent.customFields] : [];
      setCustomFields(existingFields);
      setEnableCustomRegistration(
        existingFields.length > 0 ||
          Boolean(initialEvent.isGalaWithShirtFee || initialEvent.id === 'evt-gala-can-bo-doan')
      );
    } else {
      setFormData({
        title: '',
        eventDate: '2026-11-24',
        eventTime: '11:00',
        province: 'Thành phố Đà Nẵng',
        venue: 'Nhà hàng Quảng Đại Gold, số 187 đường 30/4 - Tp Đà Nẵng',
        category: 'Gala Truyền thống & Họp mặt',
        capacity: 250,
        summary: '',
        organizer: 'Ban Thường vụ Đoàn trường & Ban Điều hành Mạng lưới CSV KTD',
        status: 'open',
        isGalaWithShirtFee: true,
        qrImageUrl: '',
        bankName: 'Vietcombank (Chi nhánh Đà Nẵng)',
        bankAccount: '1018 2026 88',
        bankAccountName: 'MANG LUOI ALUMNI KTD - BTC GALA',
        galaFeeAmount: 350000,
        shirtFeeAmount: 110000,
        transferSyntaxPrefix: 'Gala',
      });
      setCustomFields([]);
      setEnableCustomRegistration(true);
    }
  }, [isOpen, mode, initialEvent, initialTab]);

  if (!isOpen) return null;

  const needsOptions = (type: EventCustomFieldType) =>
    type === 'radio' || type === 'multicheckbox' || type === 'select';

  const handleOpenNewQuestionBuilder = (defaultType: EventCustomFieldType = 'radio') => {
    setEditingFieldId(null);
    setQLabel('');
    setQType(defaultType);
    setQRequired(false);
    setQPlaceholder('');
    setQDescription('');
    setQOptions(['Lựa chọn 1', 'Lựa chọn 2']);
    setNewOptionInput('');
    setQError(null);
    setIsBuilderOpen(true);
  };

  const handleOpenEditQuestionBuilder = (field: EventCustomField) => {
    setEditingFieldId(field.id);
    setQLabel(field.label);
    setQType(field.type);
    setQRequired(field.required);
    setQPlaceholder(field.placeholder || '');
    setQDescription(field.description || '');
    setQOptions(
      field.options && field.options.length > 0
        ? [...field.options]
        : ['Lựa chọn 1', 'Lựa chọn 2']
    );
    setNewOptionInput('');
    setQError(null);
    setIsBuilderOpen(true);
  };

  const handleSaveQuestionFromBuilder = () => {
    if (!qLabel.trim()) {
      setQError('Vui lòng nhập tiêu đề câu hỏi / tên trường dữ liệu.');
      return;
    }

    let cleanedOptions: string[] | undefined = undefined;
    if (needsOptions(qType)) {
      cleanedOptions = qOptions.map((o) => o.trim()).filter(Boolean);
      if (newOptionInput.trim()) {
        cleanedOptions.push(newOptionInput.trim());
      }
      if (cleanedOptions.length === 0) {
        setQError('Vui lòng thêm ít nhất 1 phương án lựa chọn.');
        return;
      }
    }

    const updatedField: EventCustomField = {
      id:
        editingFieldId ||
        `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: qLabel.trim(),
      type: qType,
      required: qRequired,
      options: cleanedOptions,
      placeholder: qPlaceholder.trim() || undefined,
      description: qDescription.trim() || undefined,
    };

    if (editingFieldId) {
      setCustomFields((prev) =>
        prev.map((f) => (f.id === editingFieldId ? updatedField : f))
      );
    } else {
      setCustomFields((prev) => [...prev, updatedField]);
    }

    setIsBuilderOpen(false);
    setEditingFieldId(null);
    setQError(null);
  };

  const handleAddOptionRow = () => {
    if (newOptionInput.trim()) {
      setQOptions((prev) => [...prev, newOptionInput.trim()]);
      setNewOptionInput('');
    } else {
      setQOptions((prev) => [...prev, `Lựa chọn ${prev.length + 1}`]);
    }
  };

  const handleUpdateOptionRow = (idx: number, val: string) => {
    setQOptions((prev) => prev.map((item, i) => (i === idx ? val : item)));
  };

  const handleRemoveOptionRow = (idx: number) => {
    setQOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= customFields.length) return;
    setCustomFields((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleDuplicateField = (field: EventCustomField, index: number) => {
    const copyField: EventCustomField = {
      ...field,
      id: `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: `${field.label} (Bản sao)`,
      options: field.options ? [...field.options] : undefined,
    };
    setCustomFields((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, copyField);
      return next;
    });
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateEventForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      setActiveTab('info');
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const finalFields =
        enableCustomRegistration && customFields.length > 0
          ? customFields
          : undefined;
      await onSave(
        {
          ...formData,
          isGalaWithShirtFee: enableCustomRegistration
            ? Boolean(formData.isGalaWithShirtFee)
            : false,
          customFields: finalFields,
        },
        mode === 'edit' && initialEvent ? initialEvent.id : undefined
      );
      onClose();
    } catch (err: any) {
      console.error('Error saving event:', err);
      setErrors({ general: err?.message || 'Có lỗi xảy ra khi lưu sự kiện. Vui lòng kiểm tra lại.' });
      setActiveTab('info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldTypeBadge = (type: EventCustomFieldType) => {
    switch (type) {
      case 'radio':
        return { label: 'Trắc nghiệm (Chọn 1)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'multicheckbox':
        return { label: 'Hộp kiểm (Chọn nhiều)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'select':
        return { label: 'Menu chọn (Dropdown)', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'textarea':
        return { label: 'Ghi chú / Đề xuất (Nhiều dòng)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'checkbox':
        return { label: 'Xác nhận đơn (Có/Không)', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      default:
        return { label: 'Câu trả lời ngắn (1 dòng)', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-studio-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] my-auto">
        {/* Top Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#9E1B20] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/15 text-red-200">
                  {mode === 'edit' ? 'Chế độ Chỉnh sửa' : 'Khởi tạo Sự kiện Mới'}
                </span>
                {mode === 'edit' && initialEvent && (
                  <span className="text-xs text-slate-400 font-mono truncate">
                    ID: {initialEvent.id}
                  </span>
                )}
              </div>
              <h2 id="event-studio-modal-title" className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">
                {mode === 'edit'
                  ? `Chỉnh sửa: ${formData.title || initialEvent?.title}`
                  : 'Trình Quản lý & Thiết kế Sự kiện ALUMNI KTD'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="w-11 h-11 flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Mobile-Optimized Navigation Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
                activeTab === 'info'
                  ? 'bg-[#9E1B20] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold ${
                  activeTab === 'info' ? 'bg-white text-[#9E1B20]' : 'bg-slate-200 text-slate-700'
                }`}
              >
                1
              </span>
              <span>1. Thông tin Chương trình</span>
              {Object.keys(errors).length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('registration')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
                activeTab === 'registration'
                  ? 'bg-[#9E1B20] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold ${
                  activeTab === 'registration'
                    ? 'bg-white text-[#9E1B20]'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                2
              </span>
              <span>2. Form Đăng ký & Câu hỏi</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeTab === 'registration'
                    ? 'bg-white/20 text-white'
                    : 'bg-red-50 text-[#9E1B20]'
                }`}
              >
                {enableCustomRegistration
                  ? `${customFields.length} câu hỏi${formData.isGalaWithShirtFee ? ' + Gala/Áo' : ''}`
                  : 'Mặc định'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
                activeTab === 'preview'
                  ? 'bg-[#9E1B20] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>3. Xem trước Form</span>
            </button>
          </div>

          {/* Quick Status Badge */}
          <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200 shrink-0">
            <span className="text-xs text-slate-500 font-semibold">Trạng thái cổng:</span>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  status: prev.status === 'closed' ? 'open' : 'closed',
                }))
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 min-h-[44px] ${
                formData.status === 'closed'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
              title="Bấm để chuyển đổi Mở / Tạm đóng đăng ký"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  formData.status === 'closed' ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
              />
              <span>
                {formData.status === 'closed' ? 'Tạm đóng đăng ký' : 'Đang mở đăng ký'}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleFinalSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6" noValidate>
          {/* =========================================================
              TAB 1: THÔNG TIN CHƯƠNG TRÌNH SỰ KIỆN
             ========================================================= */}
          {activeTab === 'info' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {Object.keys(errors).length > 0 && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-[#9E1B20]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Vui lòng kiểm tra lại các thông tin bắt buộc:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {Object.values(errors).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Nhóm 1: Định danh & Phân loại */}
              <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <FileText className="w-4 h-4 text-[#9E1B20]" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Phần A · Tên gọi & Phân loại Sự kiện
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label htmlFor="evt-title" className="block text-sm font-bold text-slate-800">
                      Tên sự kiện / Chương trình <span className="text-[#9E1B20]">(*)</span>
                    </label>
                    <input
                      id="evt-title"
                      type="text"
                      required
                      placeholder="Ví dụ: Gala Gặp mặt Cán bộ Đoàn, cán sự lớp qua các thời kỳ"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                    {errors.title && (
                      <p className="text-xs font-semibold text-[#9E1B20]">{errors.title}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="evt-category" className="block text-sm font-bold text-slate-800">
                      Chuyên mục / Loại hình sự kiện
                    </label>
                    <input
                      id="evt-category"
                      type="text"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, category: e.target.value }))
                      }
                      placeholder="Chọn bên dưới hoặc tự nhập..."
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {EVENT_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, category: cat }))}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer min-h-[36px] flex items-center justify-center ${
                            formData.category === cat
                              ? 'bg-[#9E1B20] text-white border-[#9E1B20] shadow-2xs font-bold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="evt-organizer" className="block text-sm font-bold text-slate-800">
                      Đơn vị chủ trì / Ban Tổ chức
                    </label>
                    <input
                      id="evt-organizer"
                      type="text"
                      value={formData.organizer}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, organizer: e.target.value }))
                      }
                      placeholder="Ví dụ: Ban Điều hành Mạng lưới ALUMNI KTD"
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                    <p className="text-[11px] text-slate-500">
                      Hiển thị trên thẻ sự kiện, thư mời email và vé điện tử QR.
                    </p>
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Thời gian, Địa điểm & Quy mô */}
              <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <MapPin className="w-4 h-4 text-[#9E1B20]" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Phần B · Thời gian, Địa điểm & Quy mô Đại biểu
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="evt-date" className="block text-sm font-bold text-slate-800">
                      Ngày tổ chức <span className="text-[#9E1B20]">(*)</span>
                    </label>
                    <input
                      id="evt-date"
                      type="date"
                      required
                      value={formData.eventDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, eventDate: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
                    <label htmlFor="evt-time" className="block text-sm font-bold text-slate-800">
                      Khung giờ tổ chức <span className="text-[#9E1B20]">(*)</span>
                    </label>
                    <input
                      id="evt-time"
                      type="text"
                      required
                      placeholder="Ví dụ: 17:30 - 21:30"
                      value={formData.eventTime}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, eventTime: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 text-sm tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {QUICK_TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, eventTime: slot }))}
                          className={`px-2.5 py-1.5 text-xs rounded-lg border tabular-nums transition-colors cursor-pointer min-h-[36px] flex items-center justify-center ${
                            formData.eventTime === slot
                              ? 'bg-red-50 text-[#9E1B20] border-red-300 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="evt-capacity" className="block text-sm font-bold text-slate-800">
                      Số đại biểu tối đa <span className="text-[#9E1B20]">(*)</span>
                    </label>
                    <input
                      id="evt-capacity"
                      type="number"
                      min="1"
                      required
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          capacity: Math.max(1, Number(e.target.value) || 50),
                        }))
                      }
                      className="w-full px-3 py-2 text-sm tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <label htmlFor="evt-province" className="block text-sm font-bold text-slate-800">
                      Tỉnh / Thành phố <span className="text-[#9E1B20]">(*)</span>
                    </label>
                    <select
                      id="evt-province"
                      value={formData.province}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, province: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    >
                      {VIETNAM_34_PROVINCES_2025.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <label htmlFor="evt-venue" className="block text-sm font-bold text-slate-800">
                      Địa điểm tổ chức chi tiết <span className="text-[#9E1B20]">(*)</span>
                    </label>
                    <input
                      id="evt-venue"
                      type="text"
                      required
                      placeholder="Ví dụ: Hội trường Lớn tầng 5, Trường Đại học Kiến trúc Đà Nẵng, 566 Núi Thành"
                      value={formData.venue}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, venue: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                    />
                    {errors.venue && (
                      <p className="text-xs font-semibold text-[#9E1B20]">{errors.venue}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nhóm 3: Mô tả nội dung chương trình */}
              <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                <label htmlFor="evt-summary" className="block text-sm font-bold text-slate-900">
                  Phần C · Mô tả Nội dung Chương trình & Lịch trình Tóm tắt <span className="text-[#9E1B20]">(*)</span>
                </label>
                <textarea
                  id="evt-summary"
                  rows={4}
                  required
                  placeholder="Giới thiệu mục đích sự kiện, khách mời, các phiên hoạt động chính hoặc quyền lợi đại biểu tham dự..."
                  value={formData.summary}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                />
                {errors.summary && (
                  <p className="text-xs font-semibold text-[#9E1B20]">{errors.summary}</p>
                )}
                <p className="text-[11px] text-slate-500">
                  Lưu ý: Không ghi giá tiệc và giá áo vào phần mô tả thông tin chung bên ngoài. Phí tham gia tiệc và làm áo chỉ hiển thị trên Form đăng ký.
                </p>
              </div>

              {/* Nhóm 4: Tùy chỉnh Giá Tiệc Gala & Giá Áo Tham gia Sự kiện (Chỉ xuất hiện trên Form đăng ký) */}
              <div className="p-5 bg-amber-50/50 border-2 border-amber-300/80 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-[#9E1B20] text-white shrink-0 mt-0.5">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Phần D · Tùy chỉnh Giá Tiệc & Giá Áo Tham gia Sự kiện
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Phí tham gia tiệc và làm áo <strong className="text-[#9E1B20]">chỉ xuất hiện bên trong Form đăng ký</strong> (tự động tính tổng tiền & mã VietQR), không hiển thị ở phần thông tin giới thiệu bên ngoài.
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 select-none bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isGalaWithShirtFee)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) setEnableCustomRegistration(true);
                        setFormData((prev) => ({
                          ...prev,
                          isGalaWithShirtFee: checked,
                        }));
                      }}
                      className="w-4 h-4 accent-[#9E1B20] rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-900">
                      {formData.isGalaWithShirtFee ? 'Đang bật thu phí Tiệc & Áo' : 'Bật thu phí Tiệc & Áo'}
                    </span>
                  </label>
                </div>

                {formData.isGalaWithShirtFee && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-amber-200">
                      <label htmlFor="evt-gala-fee-tab1" className="block text-xs font-bold text-slate-800">
                        Giá tham gia Tiệc Gala (VNĐ / người):
                      </label>
                      <input
                        id="evt-gala-fee-tab1"
                        type="number"
                        min={0}
                        step={10000}
                        value={formData.galaFeeAmount ?? 350000}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            galaFeeAmount: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full px-3.5 py-2 text-sm bg-red-50/30 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E1B20] font-extrabold text-[#9E1B20] tabular-nums"
                      />
                      <p className="text-[11px] text-slate-500">
                        Đang áp dụng trên Form đăng ký:{' '}
                        <strong className="text-[#9E1B20]">
                          {(formData.galaFeeAmount ?? 350000).toLocaleString('vi-VN')} VNĐ / người
                        </strong>
                      </p>
                    </div>

                    <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-amber-200">
                      <label htmlFor="evt-shirt-fee-tab1" className="block text-xs font-bold text-slate-800">
                        Giá làm Áo kỷ niệm sự kiện (VNĐ / áo):
                      </label>
                      <input
                        id="evt-shirt-fee-tab1"
                        type="number"
                        min={0}
                        step={5000}
                        value={formData.shirtFeeAmount ?? 110000}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            shirtFeeAmount: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="w-full px-3.5 py-2 text-sm bg-emerald-50/30 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E1B20] font-extrabold text-emerald-800 tabular-nums"
                      />
                      <p className="text-[11px] text-slate-500">
                        Đang áp dụng trên Form đăng ký:{' '}
                        <strong className="text-emerald-800">
                          {(formData.shirtFeeAmount ?? 110000).toLocaleString('vi-VN')} VNĐ / áo
                        </strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Callout to Step 2 */}
              <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-[#9E1B20]">
                    Tiếp theo: Cấu hình Form Đăng ký tham gia & Tài khoản nhận chuyển khoản
                  </p>
                  <p className="text-xs text-slate-600">
                    Thiết lập câu hỏi khảo sát, đặt áo đồng phục, tài khoản ngân hàng và xem trước mã VietQR tự động.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('registration')}
                  className="px-4 py-2 bg-[#9E1B20] text-white text-xs font-bold rounded-lg hover:bg-[#7D1418] transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  Chuyển sang Bước 2: Thiết kế Form Đăng ký →
                </button>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: CẤU HÌNH FORM ĐĂNG KÝ & CÂU HỎI KHẢO SÁT (NẾU CÓ)
             ========================================================= */}
          {activeTab === 'registration' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* 1. Chế độ Form Đăng ký (Cơ bản vs Tùy chỉnh mở rộng) */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-900">
                  1. Chọn Hình thức Đăng ký cho Sự kiện này:
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option A: Standard 1-Click Registration */}
                  <button
                    type="button"
                    onClick={() => setEnableCustomRegistration(false)}
                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                      !enableCustomRegistration
                        ? 'border-[#9E1B20] bg-red-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        !enableCustomRegistration
                          ? 'bg-[#9E1B20] text-white'
                          : 'border-2 border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">
                        Đăng ký Nhanh Tiêu chuẩn (Mặc định)
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Hệ thống tự động lấy Họ tên, Email, SĐT, Lớp, Khoa của thành viên đăng nhập kèm 1 ô Ghi chú chung. Phù hợp với sự kiện họp mặt đơn giản, không cần khảo sát thêm.
                      </p>
                    </div>
                  </button>

                  {/* Option B: Custom Questions & Gala/Shirt Fee */}
                  <button
                    type="button"
                    onClick={() => setEnableCustomRegistration(true)}
                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                      enableCustomRegistration
                        ? 'border-[#9E1B20] bg-red-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        enableCustomRegistration
                          ? 'bg-[#9E1B20] text-white'
                          : 'border-2 border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">
                        Đăng ký Mở rộng (Có Câu hỏi khảo sát / Đặt áo / Lệ phí Gala)
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Cho phép bật tính năng thu phí Gala & đặt nhiều áo đồng phục tự động tính tiền, hoặc thêm các câu hỏi Trắc nghiệm, Hộp kiểm nhiều lựa chọn, Đề xuất kiến nghị.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {!enableCustomRegistration ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-lg mx-auto">
                    <h4 className="text-sm font-bold text-slate-900">
                      Đang sử dụng Biểu mẫu Đăng ký Nhanh Tiêu chuẩn
                    </h4>
                    <p className="text-xs text-slate-600">
                      Cựu sinh viên chỉ cần bấm 1 nút để xác nhận tham dự với thông tin cá nhân tự động điền sẵn từ tài khoản. Nếu bạn muốn thêm câu hỏi khảo sát, đặt áo hoặc tính lệ phí Gala, hãy chọn ô <strong>"Đăng ký Mở rộng"</strong> phía trên.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 2. Module Tích hợp: Đăng ký Tiệc Gala & Đặt Áo Đồng phục */}
                  <div
                    className={`p-4 sm:p-5 rounded-xl border-2 transition-all ${
                      formData.isGalaWithShirtFee
                        ? 'bg-amber-50/50 border-amber-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-[#9E1B20] text-white shrink-0 mt-0.5">
                          <Shirt className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              Tích hợp Module: Đăng ký Tiệc Gala & Đặt Áo Đồng phục Kỷ niệm
                            </h4>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 text-[#9E1B20]">
                              Chỉ hiển thị trên Form đăng ký
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Khi bật: Form đăng ký sẽ có sẵn phần chọn <strong>Tham dự Tiệc Gala (Có/Không)</strong> và bảng <strong>Đặt áo kỷ niệm theo Form Nam/Nữ & Size S–3XL</strong> kèm thông báo tổng số tiền chuyển khoản theo đơn giá tùy chỉnh bên dưới.
                          </p>
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2.5 cursor-pointer shrink-0 select-none self-end sm:self-center">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.isGalaWithShirtFee)}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              isGalaWithShirtFee: e.target.checked,
                            }))
                          }
                          className="w-5 h-5 accent-[#9E1B20] rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-900">
                          {formData.isGalaWithShirtFee ? 'Đang BẬT module này' : 'Bật module này'}
                        </span>
                      </label>
                    </div>

                    {formData.isGalaWithShirtFee && (
                      <div className="mt-4 pt-4 border-t border-amber-200/80 space-y-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-[#9E1B20]" />
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            Tùy chỉnh Giá Tiệc, Giá Áo, Thông tin Chuyển khoản & Mã QR Thanh toán
                          </h5>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Giá tham gia Tiệc Gala (VNĐ/người):
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={10000}
                              value={formData.galaFeeAmount ?? 350000}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  galaFeeAmount: Math.max(0, Number(e.target.value) || 0),
                                }))
                              }
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9E1B20] font-extrabold text-[#9E1B20]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Giá làm Áo tham gia sự kiện (VNĐ/áo):
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={5000}
                              value={formData.shirtFeeAmount ?? 110000}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  shirtFeeAmount: Math.max(0, Number(e.target.value) || 0),
                                }))
                              }
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9E1B20] font-extrabold text-emerald-800"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Hậu tố Cú pháp chuyển khoản (HO VA TEN - SDT - Hậu tố):
                            </label>
                            <input
                              type="text"
                              value={formData.transferSyntaxPrefix || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  transferSyntaxPrefix: e.target.value,
                                }))
                              }
                              placeholder="Gala"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9E1B20] font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Ngân hàng nhận chuyển khoản:
                            </label>
                            <input
                              type="text"
                              value={formData.bankName || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, bankName: e.target.value }))
                              }
                              placeholder="Vietcombank (Chi nhánh Đà Nẵng)"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9E1B20]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Số tài khoản:
                            </label>
                            <input
                              type="text"
                              value={formData.bankAccount || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, bankAccount: e.target.value }))
                              }
                              placeholder="1018 2026 88"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9E1B20] font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Tên chủ tài khoản:
                            </label>
                            <input
                              type="text"
                              value={formData.bankAccountName || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, bankAccountName: e.target.value }))
                              }
                              placeholder="MANG LUOI ALUMNI KTD - BTC GALA"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9E1B20] font-semibold"
                            />
                          </div>
                        </div>

                        {/* VietQR Dynamic Configuration */}
                        <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-emerald-700" />
                                <span>Cơ chế VietQR Động Tự Động (Chuẩn Napas 247):</span>
                              </p>
                              <p className="text-[11px] text-emerald-900 leading-relaxed">
                                Hệ thống tự động tạo mã QR VietQR cá nhân hóa cho từng đại biểu đăng ký (nhúng sẵn <strong>Số tiền</strong> và Cú pháp chuyển tiền <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-[#9E1B20]">HO VA TEN - SĐT - Gala</code>).
                              </p>
                            </div>
                            <span className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-800 shadow-2xs shrink-0 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Tự sinh theo từng người</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-emerald-200">
                            <img
                              src={buildVietQrImageUrl({
                                bankName: formData.bankName,
                                bankAccount: formData.bankAccount,
                                bankAccountName: formData.bankAccountName,
                                amount: (formData.galaFeeAmount ?? 350000) + (formData.shirtFeeAmount ?? 110000),
                                transferSyntax: buildTransferSyntax({
                                  fullName: 'NGUYEN VAN AN',
                                  phone: '0905123456',
                                  suffix: formData.transferSyntaxPrefix || 'Gala',
                                }),
                              })}
                              alt="Mã QR thanh toán sự kiện"
                              className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white p-1 shadow-2xs shrink-0"
                            />
                            <div className="space-y-1 text-xs text-slate-700">
                              <p className="font-bold text-slate-900">
                                Xem trước mã QR mẫu (Ví dụ: 1 suất tiệc + 1 áo polo = {((formData.galaFeeAmount ?? 350000) + (formData.shirtFeeAmount ?? 110000)).toLocaleString('vi-VN')}đ)
                              </p>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Khi đại biểu thật đăng ký: Số tiền sẽ tự động tính theo số lượng tiệc/áo họ chọn, lệnh chuyển khoản sẽ điền đúng Họ tên và SĐT của họ. Không dùng ảnh mã QR tĩnh tải lên.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Thư viện Thêm Nhanh Câu hỏi Mẫu (1-Click Templates) */}
                  <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#9E1B20]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Thư viện Câu hỏi Mẫu (Bấm 1 lần để thêm ngay)
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Có thể chỉnh sửa lại nội dung sau khi thêm
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {PRESET_TEMPLATES.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            const newId = `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                            setCustomFields((prev) => [
                              ...prev,
                              { id: newId, ...preset.field },
                            ]);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-red-50 text-slate-700 hover:text-[#9E1B20] border border-slate-200 hover:border-red-200 rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Danh sách Câu hỏi Hiện tại & Nút Thêm Câu hỏi Mới */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Danh sách Câu hỏi / Trường dữ liệu trong Form ({customFields.length})
                        </h4>
                        <p className="text-xs text-slate-500">
                          Sắp xếp thứ tự, bật/tắt bắt buộc hoặc bấm "Sửa" để thay đổi các phương án lựa chọn.
                        </p>
                      </div>

                      {!isBuilderOpen && (
                        <button
                          type="button"
                          onClick={() => handleOpenNewQuestionBuilder('radio')}
                          className="px-4 py-2 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tạo Câu hỏi Tùy chỉnh Mới</span>
                        </button>
                      )}
                    </div>

                    {/* Visual Question Builder Modal/Card (When Adding or Editing a Question) */}
                    {isBuilderOpen && (
                      <div className="p-5 bg-white border-2 border-[#9E1B20] rounded-2xl shadow-lg space-y-5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-[#9E1B20] text-white text-xs font-bold">
                              {editingFieldId ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
                            </span>
                            <span className="text-xs text-slate-500">
                              Thiết kế trực quan câu hỏi và các phương án trả lời
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsBuilderOpen(false);
                              setEditingFieldId(null);
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Đóng khung soạn thảo ✕
                          </button>
                        </div>

                        {/* Step A: Pick Question Type */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                            Bước 1: Chọn định dạng câu hỏi
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {QUESTION_TYPE_CARDS.map((card) => {
                              const isSelected = qType === card.type;
                              return (
                                <button
                                  key={card.type}
                                  type="button"
                                  onClick={() => setQType(card.type)}
                                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-[#9E1B20] bg-red-50/60 ring-1 ring-[#9E1B20]'
                                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-900">
                                      {card.title}
                                    </span>
                                    {isSelected && (
                                      <CheckCircle2 className="w-4 h-4 text-[#9E1B20] shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                    {card.desc}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Step B: Question Title & Required Toggle */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                          <div className="sm:col-span-8 space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                              Bước 2: Nội dung câu hỏi / Tên trường dữ liệu (*)
                            </label>
                            <input
                              type="text"
                              placeholder="Ví dụ: Bạn đăng ký tham gia những nội dung nào?"
                              value={qLabel}
                              onChange={(e) => setQLabel(e.target.value)}
                              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                            />
                          </div>

                          <div className="sm:col-span-4 space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                              Yêu cầu trả lời
                            </label>
                            <button
                              type="button"
                              onClick={() => setQRequired((prev) => !prev)}
                              className={`w-full px-3.5 py-2 rounded-lg border text-sm font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                qRequired
                                  ? 'bg-red-50 border-red-300 text-[#9E1B20]'
                                  : 'bg-slate-50 border-slate-300 text-slate-700'
                              }`}
                            >
                              <span>{qRequired ? '★ Bắt buộc trả lời' : '○ Không bắt buộc'}</span>
                              <span className="text-xs underline">Đổi</span>
                            </button>
                          </div>
                        </div>

                        {/* Step C: Interactive Option List (For Radio, Multicheckbox, Select) */}
                        {needsOptions(qType) && (
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                Bước 3: Danh sách các phương án lựa chọn ({qOptions.length})
                              </label>
                              <span className="text-[11px] text-slate-500">
                                Sửa trực tiếp trên từng dòng hoặc bấm "+ Thêm phương án"
                              </span>
                            </div>

                            <div className="space-y-2">
                              {qOptions.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleUpdateOptionRow(idx, e.target.value)}
                                    placeholder={`Phương án ${idx + 1}...`}
                                    className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                                  />
                                  {qOptions.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOptionRow(idx)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Xóa phương án này"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Quick Add Option Input */}
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                value={newOptionInput}
                                onChange={(e) => setNewOptionInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddOptionRow();
                                  }
                                }}
                                placeholder="Nhập thêm phương án mới rồi nhấn Enter hoặc bấm nút bên cạnh..."
                                className="flex-1 px-3 py-1.5 text-xs bg-white border border-dashed border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#9E1B20]"
                              />
                              <button
                                type="button"
                                onClick={handleAddOptionRow}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Thêm phương án</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Optional Placeholder / Description for Text / Textarea */}
                        {(qType === 'text' || qType === 'textarea') && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700">
                              Chữ gợi ý bên trong ô nhập (Placeholder - Không bắt buộc)
                            </label>
                            <input
                              type="text"
                              value={qPlaceholder}
                              onChange={(e) => setQPlaceholder(e.target.value)}
                              placeholder="Ví dụ: Nhập ý kiến đóng góp, đề xuất kiến nghị hoặc tên tiết mục văn nghệ..."
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E1B20]"
                            />
                          </div>
                        )}

                        {qError && (
                          <p className="text-xs font-bold text-[#9E1B20] bg-red-50 p-2.5 rounded-lg border border-red-200">
                            {qError}
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsBuilderOpen(false);
                              setEditingFieldId(null);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveQuestionFromBuilder}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {editingFieldId ? 'Cập nhật câu hỏi này' : 'Lưu vào Form đăng ký'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* List of Added Custom Fields */}
                    {customFields.length === 0 ? (
                      <div className="p-6 bg-white border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                        <p className="text-xs sm:text-sm font-semibold text-slate-600">
                          Chưa có câu hỏi khảo sát riêng nào được thêm.
                        </p>
                        <p className="text-xs text-slate-400">
                          Bạn có thể chọn từ <strong>Thư viện Câu hỏi Mẫu</strong> phía trên hoặc bấm <strong>"Tạo Câu hỏi Tùy chỉnh Mới"</strong>.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {customFields.map((field, idx) => {
                          const badge = getFieldTypeBadge(field.type);
                          return (
                            <div
                              key={field.id}
                              className="p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                            >
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-red-50 text-[#9E1B20] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-red-100">
                                  {idx + 1}
                                </span>
                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-bold text-slate-900">
                                      {field.label}
                                    </p>
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${badge.color}`}
                                    >
                                      {badge.label}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                        field.required
                                          ? 'bg-red-100 text-[#9E1B20]'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {field.required ? 'Bắt buộc (*)' : 'Tùy chọn'}
                                    </span>
                                  </div>

                                  {field.options && field.options.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {field.options.map((opt, oIdx) => (
                                        <span
                                          key={oIdx}
                                          className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-700 rounded border border-slate-200"
                                        >
                                          • {opt}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {field.placeholder && (
                                    <p className="text-[11px] text-slate-400 italic">
                                      Gợi ý: "{field.placeholder}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons on Question Card */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveField(idx, 'up')}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-30 cursor-pointer"
                                  title="Di chuyển lên"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === customFields.length - 1}
                                  onClick={() => handleMoveField(idx, 'down')}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-30 cursor-pointer"
                                  title="Di chuyển xuống"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditQuestionBuilder(field)}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                                  title="Chỉnh sửa câu hỏi và phương án"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-[#9E1B20]" />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateField(field, idx)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  title="Nhân bản câu hỏi"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCustomFields((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                  title="Xóa câu hỏi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 3: XEM TRƯỚC FORM ĐĂNG KÝ (LIVE PREVIEW)
             ========================================================= */}
          {activeTab === 'preview' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-red-300">
                    Chế độ Xem trước Giao diện Thành viên
                  </p>
                  <p className="text-sm font-bold">
                    {formData.title || 'Sự kiện mới (Chưa nhập tiêu đề)'}
                  </p>
                </div>
                <span className="text-xs bg-white/15 px-3 py-1 rounded-lg">
                  {formData.eventDate} · {formData.eventTime}
                </span>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
                {/* 1. Thông tin cá nhân tự động đồng bộ */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9E1B20]">
                      01. Thông tin Cá nhân (Đồng bộ tự động từ Hồ sơ Thành viên)
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Tự động điền sẵn
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-slate-400 block text-[10px]">Họ và tên</span>
                      <span className="font-bold text-slate-800">Nguyễn Văn An</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-slate-400 block text-[10px]">Số điện thoại / Zalo</span>
                      <span className="font-bold text-slate-800">0905 123 456</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-slate-400 block text-[10px]">Khoa & Lớp</span>
                      <span className="font-bold text-slate-800">Khoa Kiến trúc · 10KT1</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-slate-400 block text-[10px]">Email nhận vé QR</span>
                      <span className="font-bold text-[#9E1B20]">thanhvien@ktd.edu.vn</span>
                    </div>
                  </div>
                </div>

                {/* 2. Xem trước Module Gala & Đặt Áo kèm Bảng Thanh toán & Mã QR nếu bật */}
                {enableCustomRegistration && formData.isGalaWithShirtFee && (
                  <div className="p-4 bg-white border-2 border-red-200 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#9E1B20]">
                        02. Đăng ký Tham dự Gala ({(formData.galaFeeAmount ?? 350000).toLocaleString('vi-VN')}đ) & Đặt Áo Đồng phục ({(formData.shirtFeeAmount ?? 110000).toLocaleString('vi-VN')}đ/áo)
                      </span>
                      <span className="text-xs font-bold text-[#9E1B20] bg-red-50 px-2.5 py-0.5 rounded">
                        Tự động cộng tổng lệ phí
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg border border-[#9E1B20] bg-red-50/40 font-semibold text-slate-900">
                        ● Có tham dự Đêm Gala (+{(formData.galaFeeAmount ?? 350000).toLocaleString('vi-VN')} VNĐ)
                      </div>
                      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                        ○ Không tham dự Gala (0 VNĐ)
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                      <span>Áo kỷ niệm: Chọn Form Nam / Nữ · Chiều cao & Cân nặng ➔ Size S–3XL</span>
                      <strong className="text-[#9E1B20]">{(formData.shirtFeeAmount ?? 110000).toLocaleString('vi-VN')} VNĐ / áo</strong>
                    </div>

                    {/* Xem trước Khung Thanh toán & Mã QR trong Tab 3 */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-red-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold uppercase text-slate-900">
                          Hướng dẫn Thanh toán & Mã QR Chuyển khoản
                        </span>
                        <span className="text-sm font-extrabold text-[#9E1B20]">
                          Tổng mẫu (1 Gala + 1 Áo): {((formData.galaFeeAmount ?? 350000) + (formData.shirtFeeAmount ?? 110000)).toLocaleString('vi-VN')} VNĐ
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-7 space-y-2 text-xs">
                          <div className="flex justify-between p-2 bg-white rounded border border-slate-200">
                            <span className="text-slate-500">Ngân hàng:</span>
                            <span className="font-bold text-slate-900">{formData.bankName || 'Vietcombank (Chi nhánh Đà Nẵng)'}</span>
                          </div>
                          <div className="flex justify-between p-2 bg-white rounded border border-slate-200">
                            <span className="text-slate-500">Số tài khoản:</span>
                            <span className="font-mono font-bold text-[#9E1B20]">{formData.bankAccount || '1018 2026 88'}</span>
                          </div>
                          <div className="flex justify-between p-2 bg-white rounded border border-slate-200">
                            <span className="text-slate-500">Chủ tài khoản:</span>
                            <span className="font-bold text-slate-900">{formData.bankAccountName || 'MANG LUOI ALUMNI KTD - BTC GALA'}</span>
                          </div>
                          <div className="p-2 bg-amber-50 rounded border border-amber-200">
                            <span className="text-[10px] font-bold uppercase text-amber-900 block">Cú pháp chuyển khoản (Tự động theo từng người đăng ký):</span>
                            <span className="font-mono font-bold text-slate-900">
                              {buildTransferSyntax({
                                fullName: 'NGUYEN VAN AN',
                                phone: '0905123456',
                                suffix: formData.transferSyntaxPrefix,
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200">
                          <img
                            src={buildVietQrImageUrl({
                              bankName: formData.bankName,
                              bankAccount: formData.bankAccount,
                              bankAccountName: formData.bankAccountName,
                              amount: (formData.galaFeeAmount ?? 350000) + (formData.shirtFeeAmount ?? 110000),
                              transferSyntax: buildTransferSyntax({
                                fullName: 'NGUYEN VAN AN',
                                phone: '0905123456',
                                suffix: formData.transferSyntaxPrefix,
                              }),
                            })}
                            alt="Mã QR Thanh toán"
                            className="w-36 h-36 object-contain rounded-lg"
                          />
                          <span className="text-[11px] font-bold text-emerald-700 mt-1.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Mã VietQR Tự Động Theo Từng Người</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Xem trước các câu hỏi tùy chỉnh */}
                {enableCustomRegistration && customFields.length > 0 && (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                      Câu hỏi & Tùy chọn Đăng ký ({customFields.length} mục)
                    </span>
                    <div className="space-y-3">
                      {customFields.map((f, idx) => (
                        <div key={f.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <label className="block text-xs sm:text-sm font-bold text-slate-900">
                            {idx + 1}. {f.label}{' '}
                            {f.required && <span className="text-[#9E1B20]">(*)</span>}
                          </label>

                          {f.type === 'radio' && (
                            <div className="space-y-1.5">
                              {(f.options || []).map((opt, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded border border-slate-200"
                                >
                                  <span className="w-3.5 h-3.5 rounded-full border border-slate-400 inline-block" />
                                  <span>{opt}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {f.type === 'multicheckbox' && (
                            <div className="space-y-1.5">
                              {(f.options || []).map((opt, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2 rounded border border-slate-200"
                                >
                                  <span className="w-3.5 h-3.5 rounded-xs border border-slate-400 inline-block" />
                                  <span>{opt}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {f.type === 'select' && (
                            <select
                              disabled
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700"
                            >
                              <option>-- Chọn phương án ({f.options?.join(', ')}) --</option>
                            </select>
                          )}

                          {f.type === 'textarea' && (
                            <textarea
                              disabled
                              rows={2}
                              placeholder={f.placeholder || 'Nhập ghi chú, đề xuất kiến nghị...'}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                            />
                          )}

                          {f.type === 'text' && (
                            <input
                              type="text"
                              disabled
                              placeholder={f.placeholder || 'Nhập câu trả lời...'}
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                            />
                          )}

                          {f.type === 'checkbox' && (
                            <div className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                              <span className="w-4 h-4 rounded-xs border border-slate-400 inline-block" />
                              <span>Tôi đồng ý / Đăng ký hạng mục này</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Ô ghi chú mặc định */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">
                    Ghi chú tham dự / Lời nhắn gửi Ban Tổ chức (Tùy chọn)
                  </span>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-400">
                    Ví dụ: Đăng ký tham dự cùng cựu sinh viên khóa 2010...
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Modal Footer Controls */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-3 sm:p-4 shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md z-10">
            <div className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
              {mode === 'edit' ? (
                <span>
                  Mọi thay đổi sẽ được cập nhật trực tiếp lên hệ thống sự kiện ALUMNI KTD.
                </span>
              ) : (
                <span>
                  Bạn có thể chỉnh sửa lại nội dung sự kiện hoặc câu hỏi đăng ký bất cứ lúc nào sau khi tạo.
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#9E1B20] hover:bg-[#7D1418] rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Đang lưu dữ liệu...'
                    : mode === 'edit'
                    ? 'Lưu Cập nhật Sự kiện'
                    : 'Xuất bản Sự kiện Mới'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
