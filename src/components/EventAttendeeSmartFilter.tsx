import React, { useState, useMemo } from 'react';
import {
  Search,
  Sliders,
  X,
  RotateCcw,
  CheckCircle2,
  Clock,
  Shirt,
  Users,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { EventRecord } from '../data/constants';
import { EnrichedAttendeeItem } from '../utils/excelExporter';
import { maskPhoneKeepLast4 } from '../utils/alumniLogic';

export interface AttendeeSmartFilterState {
  searchQuery: string;
  btcStatus: 'all' | 'confirmed' | 'unconfirmed';
  faculty: string;
  className: string;
  galaStatus: 'all' | 'yes' | 'no';
  shirtFilter: string; // 'all' | 'has_shirt' | 'no_shirt' | 'gender:Nam' | 'gender:Nữ' | 'size:S' ... | 'Nam:XL' ...
  customFieldId: string;
  customFieldValue: string;
  sortBy: 'stt_asc' | 'name_asc' | 'class_asc' | 'btc_first' | 'btc_unconfirmed_first';
}

export const DEFAULT_ATTENDEE_SMART_FILTER: AttendeeSmartFilterState = {
  searchQuery: '',
  btcStatus: 'all',
  faculty: 'all',
  className: 'all',
  galaStatus: 'all',
  shirtFilter: 'all',
  customFieldId: 'all',
  customFieldValue: 'all',
  sortBy: 'stt_asc',
};

export function hasActiveSmartFilters(filter: AttendeeSmartFilterState): boolean {
  return (
    filter.searchQuery.trim() !== '' ||
    filter.btcStatus !== 'all' ||
    filter.faculty !== 'all' ||
    filter.className !== 'all' ||
    filter.galaStatus !== 'all' ||
    filter.shirtFilter !== 'all' ||
    (filter.customFieldId !== 'all' && filter.customFieldValue !== 'all') ||
    filter.sortBy !== 'stt_asc'
  );
}

export function countActiveSmartFilters(filter: AttendeeSmartFilterState): number {
  let count = 0;
  if (filter.searchQuery.trim() !== '') count += 1;
  if (filter.btcStatus !== 'all') count += 1;
  if (filter.faculty !== 'all') count += 1;
  if (filter.className !== 'all') count += 1;
  if (filter.galaStatus !== 'all') count += 1;
  if (filter.shirtFilter !== 'all') count += 1;
  if (filter.customFieldId !== 'all' && filter.customFieldValue !== 'all') count += 1;
  if (filter.sortBy !== 'stt_asc') count += 1;
  return count;
}

function getLastNameToken(fullName: string): string {
  const parts = (fullName || '').trim().split(/\s+/);
  return (parts[parts.length - 1] || '').toLowerCase();
}

export function filterAndSortAttendees(
  attendees: EnrichedAttendeeItem[],
  event: EventRecord,
  filter: AttendeeSmartFilterState
): EnrichedAttendeeItem[] {
  const q = filter.searchQuery.trim().toLowerCase();

  const filtered = attendees.filter((att) => {
    // 1. Keyword search across essential & custom fields
    if (q) {
      const maskedPhone = maskPhoneKeepLast4(att.phone).toLowerCase();
      const last4Phone = (att.phone || '').replace(/\D/g, '').slice(-4);
      const shirtText = (att.shirtOrders || [])
        .map((o) => `${o.gender} ${o.size} ${o.size === 'XXL' ? '2XL' : ''}`)
        .join(' ')
        .toLowerCase();
      const customAnswersText = att.customAnswers
        ? Object.values(att.customAnswers)
            .map((v) => (Array.isArray(v) ? v.join(' ') : String(v ?? '')))
            .join(' ')
            .toLowerCase()
        : '';

      const matchesQuery =
        (att.fullName || '').toLowerCase().includes(q) ||
        (att.className || '').toLowerCase().includes(q) ||
        (att.faculty || '').toLowerCase().includes(q) ||
        maskedPhone.includes(q) ||
        (last4Phone && last4Phone.includes(q)) ||
        (att.workplace || '').toLowerCase().includes(q) ||
        (att.province || '').toLowerCase().includes(q) ||
        shirtText.includes(q) ||
        customAnswersText.includes(q);

      if (!matchesQuery) return false;
    }

    // 2. BTC Confirmation status
    if (filter.btcStatus === 'confirmed' && !att.btcConfirmed) return false;
    if (filter.btcStatus === 'unconfirmed' && att.btcConfirmed) return false;

    // 3. Faculty filter
    if (filter.faculty !== 'all') {
      const attFaculty = (att.faculty || 'Khoa Kiến trúc').trim();
      if (attFaculty !== filter.faculty) return false;
    }

    // 4. ClassName filter
    if (filter.className !== 'all') {
      const attClass = (att.className || 'KTD').trim().toUpperCase();
      if (attClass !== filter.className.toUpperCase()) return false;
    }

    // 5. Gala attendance filter
    if (filter.galaStatus === 'yes' && att.attendGala !== true) return false;
    if (filter.galaStatus === 'no' && att.attendGala !== false) return false;

    // 6. Shirt order filter
    if (filter.shirtFilter !== 'all') {
      const orders = att.shirtOrders || [];
      const totalShirts = orders.reduce((s, o) => s + (Number(o.quantity) || 0), 0);
      if (filter.shirtFilter === 'has_shirt') {
        if (totalShirts <= 0) return false;
      } else if (filter.shirtFilter === 'no_shirt') {
        if (totalShirts > 0) return false;
      } else if (filter.shirtFilter.startsWith('gender:')) {
        const targetGender = filter.shirtFilter.replace('gender:', '');
        const hasGender = orders.some(
          (o) => o.gender === targetGender && (Number(o.quantity) || 0) > 0
        );
        if (!hasGender) return false;
      } else if (filter.shirtFilter.startsWith('size:')) {
        const targetSize = filter.shirtFilter.replace('size:', '').toUpperCase();
        const hasSize = orders.some(
          (o) => o.size.toUpperCase() === targetSize && (Number(o.quantity) || 0) > 0
        );
        if (!hasSize) return false;
      } else if (filter.shirtFilter.includes(':')) {
        const [targetGender, targetSize] = filter.shirtFilter.split(':');
        const hasExact = orders.some(
          (o) =>
            o.gender === targetGender &&
            o.size.toUpperCase() === targetSize.toUpperCase() &&
            (Number(o.quantity) || 0) > 0
        );
        if (!hasExact) return false;
      }
    }

    // 7. Custom field answer filter
    if (filter.customFieldId !== 'all' && filter.customFieldValue !== 'all') {
      const rawVal = att.customAnswers?.[filter.customFieldId];
      if (rawVal === undefined || rawVal === null || rawVal === '') return false;
      if (typeof rawVal === 'boolean') {
        const boolLabel = rawVal ? 'Có' : 'Không';
        if (boolLabel !== filter.customFieldValue) return false;
      } else if (Array.isArray(rawVal)) {
        if (!rawVal.map((v) => String(v).trim()).includes(filter.customFieldValue)) {
          return false;
        }
      } else {
        if (String(rawVal).trim() !== filter.customFieldValue) return false;
      }
    }

    return true;
  });

  // Sort results
  const sorted = [...filtered];
  if (filter.sortBy === 'name_asc') {
    sorted.sort((a, b) => {
      const cmp = getLastNameToken(a.fullName).localeCompare(
        getLastNameToken(b.fullName),
        'vi'
      );
      if (cmp !== 0) return cmp;
      return (a.fullName || '').localeCompare(b.fullName || '', 'vi');
    });
  } else if (filter.sortBy === 'class_asc') {
    sorted.sort((a, b) =>
      (a.className || 'ZZZ').localeCompare(b.className || 'ZZZ', 'vi')
    );
  } else if (filter.sortBy === 'btc_first') {
    sorted.sort((a, b) => {
      if (Boolean(a.btcConfirmed) !== Boolean(b.btcConfirmed)) {
        return a.btcConfirmed ? -1 : 1;
      }
      return a.stt - b.stt;
    });
  } else if (filter.sortBy === 'btc_unconfirmed_first') {
    sorted.sort((a, b) => {
      if (Boolean(a.btcConfirmed) !== Boolean(b.btcConfirmed)) {
        return a.btcConfirmed ? 1 : -1;
      }
      return a.stt - b.stt;
    });
  } else {
    sorted.sort((a, b) => a.stt - b.stt);
  }

  return sorted;
}

interface EventAttendeeSmartFilterBarProps {
  event: EventRecord;
  allAttendees: EnrichedAttendeeItem[];
  filteredCount: number;
  filter: AttendeeSmartFilterState;
  onChange: (next: AttendeeSmartFilterState) => void;
  compact?: boolean;
}

export const EventAttendeeSmartFilterBar: React.FC<EventAttendeeSmartFilterBarProps> = ({
  event,
  allAttendees,
  filteredCount,
  filter,
  onChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isGalaOrShirtEvent = useMemo(() => {
    return Boolean(
      event.isGalaWithShirtFee ||
        event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
        event.id === 'evt-gala-can-bo-doan' ||
        allAttendees.some(
          (a) =>
            a.attendGala !== undefined ||
            (a.shirtOrders && a.shirtOrders.length > 0)
        )
    );
  }, [event, allAttendees]);

  // Compute dynamic counts for quick chips & dropdowns
  const stats = useMemo(() => {
    let btcConfirmedCount = 0;
    let btcUnconfirmedCount = 0;
    let galaYesCount = 0;
    let galaNoCount = 0;
    let hasShirtCount = 0;
    let noShirtCount = 0;
    const facultyCounts = new Map<string, number>();
    const classCounts = new Map<string, number>();
    const shirtComboCounts = new Map<string, number>();

    allAttendees.forEach((att) => {
      if (att.btcConfirmed) btcConfirmedCount += 1;
      else btcUnconfirmedCount += 1;

      if (att.attendGala === true) galaYesCount += 1;
      else if (att.attendGala === false) galaNoCount += 1;

      const orders = att.shirtOrders || [];
      const totalShirts = orders.reduce((s, o) => s + (Number(o.quantity) || 0), 0);
      if (totalShirts > 0) {
        hasShirtCount += 1;
        orders.forEach((o) => {
          const key = `${o.gender}:${o.size}`;
          shirtComboCounts.set(key, (shirtComboCounts.get(key) || 0) + (Number(o.quantity) || 1));
        });
      } else {
        noShirtCount += 1;
      }

      const fac = (att.faculty || 'Khoa Kiến trúc').trim();
      if (fac) {
        facultyCounts.set(fac, (facultyCounts.get(fac) || 0) + 1);
      }

      const cls = (att.className || '').trim().toUpperCase();
      if (cls) {
        classCounts.set(cls, (classCounts.get(cls) || 0) + 1);
      }
    });

    return {
      btcConfirmedCount,
      btcUnconfirmedCount,
      galaYesCount,
      galaNoCount,
      hasShirtCount,
      noShirtCount,
      faculties: Array.from(facultyCounts.entries()).sort((a, b) => b[1] - a[1]),
      classes: Array.from(classCounts.entries()).sort((a, b) =>
        a[0].localeCompare(b[0], 'vi')
      ),
      shirtCombos: Array.from(shirtComboCounts.entries()).sort((a, b) =>
        a[0].localeCompare(b[0], 'vi')
      ),
    };
  }, [allAttendees]);

  // Custom fields with filterable options
  const filterableCustomFields = useMemo(() => {
    const fields = (event.customFields || []).filter(
      (cf) => cf.id !== 'cf_attend_gala' && cf.id !== 'cf_uniform_shirt'
    );
    return fields
      .map((cf) => {
        const valueCounts = new Map<string, number>();
        if (cf.options && cf.options.length > 0) {
          cf.options.forEach((opt) => valueCounts.set(opt, 0));
        }
        allAttendees.forEach((att) => {
          const raw = att.customAnswers?.[cf.id];
          if (raw === undefined || raw === null || raw === '') return;
          if (typeof raw === 'boolean') {
            const k = raw ? 'Có' : 'Không';
            valueCounts.set(k, (valueCounts.get(k) || 0) + 1);
          } else if (Array.isArray(raw)) {
            raw.forEach((item) => {
              const k = String(item).trim();
              if (k) valueCounts.set(k, (valueCounts.get(k) || 0) + 1);
            });
          } else {
            const k = String(raw).trim();
            if (k) valueCounts.set(k, (valueCounts.get(k) || 0) + 1);
          }
        });
        return {
          field: cf,
          options: Array.from(valueCounts.entries()),
        };
      })
      .filter((item) => item.options.length > 0);
  }, [event.customFields, allAttendees]);

  const activeCount = countActiveSmartFilters(filter);
  const isFiltering = hasActiveSmartFilters(filter);

  const updateFilter = (patch: Partial<AttendeeSmartFilterState>) => {
    onChange({ ...filter, ...patch });
  };

  const resetAll = () => {
    onChange({ ...DEFAULT_ATTENDEE_SMART_FILTER });
  };

  return (
    <div className="bg-slate-50/95 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
      {/* Row 1: Search Bar + Quick Smart Chips + Toggle Advanced Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={filter.searchQuery}
            onChange={(e) => updateFilter({ searchQuery: e.target.value })}
            placeholder="Tìm thông minh theo Họ tên, Lớp, Khoa, 4 số cuối SĐT, Size áo..."
            className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9E1B20] focus:border-transparent"
          />
          {filter.searchQuery && (
            <button
              type="button"
              onClick={() => updateFilter({ searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Xóa từ khóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick 1-Tap Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              updateFilter({
                btcStatus: 'all',
                galaStatus: 'all',
                shirtFilter: 'all',
              })
            }
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
              filter.btcStatus === 'all' &&
              filter.galaStatus === 'all' &&
              filter.shirtFilter === 'all'
                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tất cả ({allAttendees.length})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              updateFilter({
                btcStatus: filter.btcStatus === 'confirmed' ? 'all' : 'confirmed',
              })
            }
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
              filter.btcStatus === 'confirmed'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>BTC đã xác nhận ({stats.btcConfirmedCount})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              updateFilter({
                btcStatus: filter.btcStatus === 'unconfirmed' ? 'all' : 'unconfirmed',
              })
            }
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
              filter.btcStatus === 'unconfirmed'
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ xác nhận ({stats.btcUnconfirmedCount})</span>
          </button>

          {isGalaOrShirtEvent && (
            <>
              <button
                type="button"
                onClick={() =>
                  updateFilter({
                    galaStatus: filter.galaStatus === 'yes' ? 'all' : 'yes',
                  })
                }
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                  filter.galaStatus === 'yes'
                    ? 'bg-[#9E1B20] text-white border-[#9E1B20] shadow-2xs'
                    : 'bg-white text-[#9E1B20] border-red-200 hover:bg-red-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dự Gala ({stats.galaYesCount})</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateFilter({
                    shirtFilter:
                      filter.shirtFilter === 'has_shirt' ? 'all' : 'has_shirt',
                  })
                }
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                  filter.shirtFilter === 'has_shirt'
                    ? 'bg-amber-700 text-white border-amber-700 shadow-2xs'
                    : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>Có đặt áo ({stats.hasShirtCount})</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isExpanded || activeCount > 0
                ? 'bg-red-50 text-[#9E1B20] border-[#9E1B20]/40'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#9E1B20]" />
            <span>Bộ lọc thông minh</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#9E1B20] text-white rounded-full text-[10px] font-extrabold tabular-nums">
                {activeCount}
              </span>
            )}
          </button>

          {isFiltering && (
            <button
              type="button"
              onClick={resetAll}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#9E1B20] bg-white hover:bg-red-50 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
              title="Đặt lại toàn bộ điều kiện lọc"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Multi-Dimensional Smart Filter Controls */}
      {isExpanded && (
        <div className="pt-2.5 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* 1. Lọc theo Khoa */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase">
              Khoa đào tạo
            </label>
            <select
              value={filter.faculty}
              onChange={(e) => updateFilter({ faculty: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            >
              <option value="all">Tất cả Khoa ({allAttendees.length})</option>
              {stats.faculties.map(([fac, count]) => (
                <option key={fac} value={fac}>
                  {fac} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Lọc theo Lớp / Khóa */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase">
              Lớp / Khóa học
            </label>
            <select
              value={filter.className}
              onChange={(e) => updateFilter({ className: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            >
              <option value="all">Tất cả các Lớp ({stats.classes.length} lớp)</option>
              {stats.classes.map(([cls, count]) => (
                <option key={cls} value={cls}>
                  Lớp {cls} ({count} người)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Lọc theo Tham dự Gala hoặc Câu hỏi khảo sát */}
          {isGalaOrShirtEvent ? (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Tham dự Tiệc Gala
              </label>
              <select
                value={filter.galaStatus}
                onChange={(e) =>
                  updateFilter({
                    galaStatus: e.target.value as AttendeeSmartFilterState['galaStatus'],
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
              >
                <option value="all">Tất cả trạng thái Gala</option>
                <option value="yes">Có tham dự Gala ({stats.galaYesCount})</option>
                <option value="no">Không tham dự Gala ({stats.galaNoCount})</option>
              </select>
            </div>
          ) : filterableCustomFields.length > 0 ? (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase truncate">
                Câu hỏi khảo sát
              </label>
              <select
                value={filter.customFieldId}
                onChange={(e) =>
                  updateFilter({
                    customFieldId: e.target.value,
                    customFieldValue: 'all',
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
              >
                <option value="all">Chọn tiêu chí khảo sát...</option>
                {filterableCustomFields.map(({ field }) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Xác nhận của BTC
              </label>
              <select
                value={filter.btcStatus}
                onChange={(e) =>
                  updateFilter({
                    btcStatus: e.target.value as AttendeeSmartFilterState['btcStatus'],
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
              >
                <option value="all">Tất cả ({allAttendees.length})</option>
                <option value="confirmed">
                  BTC đã xác nhận ({stats.btcConfirmedCount})
                </option>
                <option value="unconfirmed">
                  Chờ BTC xác nhận ({stats.btcUnconfirmedCount})
                </option>
              </select>
            </div>
          )}

          {/* 4. Lọc theo Đặt Áo / Form & Size hoặc Giá trị câu hỏi khảo sát */}
          {isGalaOrShirtEvent ? (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Đặt Áo &amp; Size Áo
              </label>
              <select
                value={filter.shirtFilter}
                onChange={(e) => updateFilter({ shirtFilter: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
              >
                <option value="all">Tất cả đăng ký áo</option>
                <option value="has_shirt">Có đặt áo ({stats.hasShirtCount} người)</option>
                <option value="no_shirt">Không đặt áo ({stats.noShirtCount} người)</option>
                <option value="gender:Nam">Tất cả Áo Form Nam</option>
                <option value="gender:Nữ">Tất cả Áo Form Nữ</option>
                {stats.shirtCombos.length > 0 && (
                  <optgroup label="Lọc chi tiết từng Form & Size áo">
                    {stats.shirtCombos.map(([comboKey, qty]) => {
                      const [g, sz] = comboKey.split(':');
                      const displaySz = sz === 'XXL' ? '2XL' : sz;
                      return (
                        <option key={comboKey} value={comboKey}>
                          Áo {g} - Size {displaySz} ({qty} áo)
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>
            </div>
          ) : filter.customFieldId !== 'all' ? (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Phương án trả lời
              </label>
              <select
                value={filter.customFieldValue}
                onChange={(e) =>
                  updateFilter({ customFieldValue: e.target.value })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
              >
                <option value="all">Tất cả phương án</option>
                {(
                  filterableCustomFields.find(
                    (f) => f.field.id === filter.customFieldId
                  )?.options || []
                ).map(([optVal, cnt]) => (
                  <option key={optVal} value={optVal}>
                    {optVal} ({cnt})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Lọc nhanh khảo sát
              </label>
              <select
                disabled={filterableCustomFields.length === 0}
                value={filter.customFieldId}
                onChange={(e) =>
                  updateFilter({
                    customFieldId: e.target.value,
                    customFieldValue: 'all',
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20] disabled:opacity-50"
              >
                <option value="all">
                  {filterableCustomFields.length > 0
                    ? 'Chọn câu hỏi khảo sát...'
                    : 'Không có câu hỏi phụ'}
                </option>
                {filterableCustomFields.map(({ field }) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Sắp xếp thông minh */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-[#9E1B20]" />
              <span>Sắp xếp theo</span>
            </label>
            <select
              value={filter.sortBy}
              onChange={(e) =>
                updateFilter({
                  sortBy: e.target.value as AttendeeSmartFilterState['sortBy'],
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
            >
              <option value="stt_asc">Thứ tự đăng ký (Mặc định)</option>
              <option value="name_asc">Tên đại biểu (A → Z)</option>
              <option value="class_asc">Lớp / Khóa (A → Z)</option>
              <option value="btc_first">Ưu tiên BTC đã xác nhận</option>
              <option value="btc_unconfirmed_first">Ưu tiên Chờ xác nhận</option>
            </select>
          </div>

          {/* Extra row if Gala/Shirt Event ALSO has custom survey questions */}
          {isGalaOrShirtEvent && filterableCustomFields.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/60">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Lọc theo câu hỏi khảo sát bổ sung
                </label>
                <select
                  value={filter.customFieldId}
                  onChange={(e) =>
                    updateFilter({
                      customFieldId: e.target.value,
                      customFieldValue: 'all',
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                >
                  <option value="all">Tất cả câu hỏi khảo sát</option>
                  {filterableCustomFields.map(({ field }) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              {filter.customFieldId !== 'all' && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Lựa chọn trả lời cần lọc
                  </label>
                  <select
                    value={filter.customFieldValue}
                    onChange={(e) =>
                      updateFilter({ customFieldValue: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#9E1B20]"
                  >
                    <option value="all">Tất cả lựa chọn</option>
                    {(
                      filterableCustomFields.find(
                        (f) => f.field.id === filter.customFieldId
                      )?.options || []
                    ).map(([optVal, cnt]) => (
                      <option key={optVal} value={optVal}>
                        {optVal} ({cnt} người)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Row 3: Active Filter Summary Bar */}
      {isFiltering && (
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-600">
              Kết quả lọc:{' '}
              <strong className="text-[#9E1B20] font-extrabold tabular-nums">
                {filteredCount}
              </strong>{' '}
              / {allAttendees.length} đại biểu
            </span>

            {filter.btcStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                <span>
                  {filter.btcStatus === 'confirmed'
                    ? 'BTC đã xác nhận'
                    : 'Chờ BTC xác nhận'}
                </span>
                <button
                  type="button"
                  onClick={() => updateFilter({ btcStatus: 'all' })}
                  className="hover:text-emerald-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filter.faculty !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-[#9E1B20] border border-red-200 font-semibold">
                <span>{filter.faculty}</span>
                <button
                  type="button"
                  onClick={() => updateFilter({ faculty: 'all' })}
                  className="hover:text-red-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filter.className !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                <span>Lớp: {filter.className}</span>
                <button
                  type="button"
                  onClick={() => updateFilter({ className: 'all' })}
                  className="hover:text-blue-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filter.galaStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                <span>
                  Gala: {filter.galaStatus === 'yes' ? 'Có tham dự' : 'Không dự'}
                </span>
                <button
                  type="button"
                  onClick={() => updateFilter({ galaStatus: 'all' })}
                  className="hover:text-purple-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filter.shirtFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                <span>
                  Áo:{' '}
                  {filter.shirtFilter === 'has_shirt'
                    ? 'Có đặt áo'
                    : filter.shirtFilter === 'no_shirt'
                      ? 'Không đặt áo'
                      : filter.shirtFilter.replace('gender:', 'Form ').replace(':', ' - Size ')}
                </span>
                <button
                  type="button"
                  onClick={() => updateFilter({ shirtFilter: 'all' })}
                  className="hover:text-amber-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
