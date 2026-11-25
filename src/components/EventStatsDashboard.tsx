import React from 'react';
import {
  BarChart3,
  Users,
  CheckCircle2,
  Sparkles,
  Shirt,
  ListChecks,
} from 'lucide-react';
import { EventRecord } from '../data/constants';
import { EnrichedAttendeeItem } from '../utils/excelExporter';

const MALE_SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;
const FEMALE_SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

interface EventStatsDashboardProps {
  event: EventRecord;
  attendees: EnrichedAttendeeItem[];
  compact?: boolean;
}

export function hasMultiChoiceEventForm(event: EventRecord): boolean {
  if (
    event.isGalaWithShirtFee ||
    event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
    event.id === 'evt-gala-can-bo-doan'
  ) {
    return true;
  }
  if (!event.customFields || event.customFields.length === 0) return false;
  return event.customFields.some((f) =>
    ['select', 'radio', 'multicheckbox', 'checkbox'].includes(f.type)
  );
}

export const EventStatsDashboard: React.FC<EventStatsDashboardProps> = ({
  event,
  attendees,
  compact = false,
}) => {
  const isGalaShirtEvent = Boolean(
    event.isGalaWithShirtFee ||
      event.title.includes('Gala Gặp mặt Cán bộ Đoàn') ||
      event.id === 'evt-gala-can-bo-doan'
  );

  const totalAttendees = attendees.length;
  const capacity = Math.max(event.capacity || 100, 1);
  const capacityPercent = Math.min(100, Math.round((totalAttendees / capacity) * 100));

  const confirmedCount = attendees.filter((a) => Boolean(a.btcConfirmed)).length;
  const confirmedPercent =
    totalAttendees > 0 ? Math.round((confirmedCount / totalAttendees) * 100) : 0;

  // Gala & Shirt breakdown
  const galaYesCount = attendees.filter((a) => a.attendGala === true).length;
  const galaNoCount = attendees.filter((a) => a.attendGala === false).length;
  const galaYesPercent =
    totalAttendees > 0 ? Math.round((galaYesCount / totalAttendees) * 100) : 0;

  const maleSizeCounts: Record<string, number> = {};
  MALE_SHIRT_SIZES.forEach((s) => {
    maleSizeCounts[s] = 0;
  });

  const femaleSizeCounts: Record<string, number> = {};
  FEMALE_SHIRT_SIZES.forEach((s) => {
    femaleSizeCounts[s] = 0;
  });

  let maleShirtsTotal = 0;
  let femaleShirtsTotal = 0;

  attendees.forEach((att) => {
    if (Array.isArray(att.shirtOrders)) {
      att.shirtOrders.forEach((order) => {
        const qty = Number(order.quantity) || 0;
        if (qty <= 0) return;
        const rawSize = String(order.size || '').toUpperCase();
        const sizeKey = rawSize === '2XL' ? 'XXL' : rawSize;
        const genderStr = String(order.gender || '').toLowerCase();
        if (genderStr === 'nữ' || genderStr === 'nu' || genderStr === 'female') {
          femaleSizeCounts[sizeKey] = (femaleSizeCounts[sizeKey] || 0) + qty;
          femaleShirtsTotal += qty;
        } else {
          maleSizeCounts[sizeKey] = (maleSizeCounts[sizeKey] || 0) + qty;
          maleShirtsTotal += qty;
        }
      });
    }
  });

  const totalShirts = maleShirtsTotal + femaleShirtsTotal;

  // Custom multiple-choice fields breakdown
  const choiceFields = (event.customFields || []).filter((f) =>
    ['select', 'radio', 'multicheckbox', 'checkbox'].includes(f.type)
  );

  return (
    <div
      className={`rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/60 shadow-sm ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-indigo-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#9E1B20] text-white flex items-center justify-center shadow-sm shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Dashboard Thống kê Sự kiện
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đồng bộ trực tiếp
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
              Tổng hợp số liệu lựa chọn đăng ký của đại biểu cho sự kiện:{' '}
              <strong className="text-slate-700">{event.title}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div
        className={`grid grid-cols-2 ${
          isGalaShirtEvent ? 'lg:grid-cols-4' : 'lg:grid-cols-2'
        } gap-3 mb-4`}
      >
        {/* KPI 1: Total Registered */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Tổng đại biểu đăng ký</span>
            <Users className="w-4 h-4 text-[#9E1B20]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{totalAttendees}</span>
            <span className="text-xs font-semibold text-slate-400">/ {event.capacity} chỗ</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-[#9E1B20] rounded-full transition-all duration-300"
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>

        {/* KPI 2: BTC Confirmed */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>BTC đã xác nhận</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700">{confirmedCount}</span>
            <span className="text-xs font-semibold text-slate-400">
              / {totalAttendees} ({confirmedPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${confirmedPercent}%` }}
            />
          </div>
        </div>

        {isGalaShirtEvent && (
          <>
            {/* KPI 3: Gala Attendance */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Tham dự Tiệc Gala</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-700">{galaYesCount}</span>
                <span className="text-xs font-semibold text-slate-500">
                  tham dự ({galaYesPercent}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                Không dự tiệc / chỉ đặt áo: <strong className="text-slate-700">{galaNoCount}</strong>
              </p>
            </div>

            {/* KPI 4: Total Commemorative Shirts */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Tổng số Áo kỷ niệm</span>
                <Shirt className="w-4 h-4 text-sky-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-sky-700">{totalShirts}</span>
                <span className="text-xs font-semibold text-slate-500">áo đã đặt</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                Form Nam: <strong className="text-sky-700">{maleShirtsTotal}</strong> • Form Nữ:{' '}
                <strong className="text-rose-600">{femaleShirtsTotal}</strong>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Shirt Size Breakdown for Gala & Shirt Events */}
      {isGalaShirtEvent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
          {/* Form Nam */}
          <div className="bg-white rounded-xl p-3.5 border border-sky-200/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold text-sky-900 uppercase tracking-wide flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-sky-600" />
                Thống kê Size Áo Form Nam
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-xs font-black">
                Tổng: {maleShirtsTotal} áo
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {MALE_SHIRT_SIZES.map((size) => {
                const count = maleSizeCounts[size] || 0;
                const displaySize = size === 'XXL' ? '2XL' : size;
                return (
                  <div
                    key={`male-${size}`}
                    className={`rounded-lg p-2 text-center border ${
                      count > 0
                        ? 'bg-sky-50/90 border-sky-300 text-sky-950'
                        : 'bg-slate-50 border-slate-200/70 text-slate-400'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider">
                      {displaySize}
                    </div>
                    <div className="text-sm font-black mt-0.5">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Nữ */}
          <div className="bg-white rounded-xl p-3.5 border border-rose-200/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold text-rose-900 uppercase tracking-wide flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-rose-600" />
                Thống kê Size Áo Form Nữ
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-black">
                Tổng: {femaleShirtsTotal} áo
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {FEMALE_SHIRT_SIZES.map((size) => {
                const count = femaleSizeCounts[size] || 0;
                const displaySize = size === 'XXL' ? '2XL' : size;
                return (
                  <div
                    key={`female-${size}`}
                    className={`rounded-lg p-2 text-center border ${
                      count > 0
                        ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                        : 'bg-slate-50 border-slate-200/70 text-slate-400'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider">
                      {displaySize}
                    </div>
                    <div className="text-sm font-black mt-0.5">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Custom Multiple-Choice Fields Breakdown */}
      {choiceFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {choiceFields.map((field) => {
            const optionCounts: Record<string, number> = {};
            const optionsList =
              field.type === 'checkbox'
                ? ['Có / Đồng ý', 'Không']
                : field.options && field.options.length > 0
                  ? field.options
                  : [];

            optionsList.forEach((opt) => {
              optionCounts[opt] = 0;
            });

            attendees.forEach((att) => {
              const rawVal = att.customAnswers?.[field.id];
              if (rawVal === undefined || rawVal === null || rawVal === '') return;

              if (field.type === 'checkbox') {
                const key = rawVal === true || rawVal === 'true' ? 'Có / Đồng ý' : 'Không';
                optionCounts[key] = (optionCounts[key] || 0) + 1;
              } else if (Array.isArray(rawVal)) {
                rawVal.forEach((item) => {
                  const k = String(item).trim();
                  if (k) optionCounts[k] = (optionCounts[k] || 0) + 1;
                });
              } else {
                const k = String(rawVal).trim();
                if (k) optionCounts[k] = (optionCounts[k] || 0) + 1;
              }
            });

            const entries = Object.entries(optionCounts);

            return (
              <div
                key={field.id}
                className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs"
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 mb-2.5">
                  <ListChecks className="w-4 h-4 text-[#9E1B20] shrink-0" />
                  <span>{field.label}</span>
                </div>
                <div className="space-y-2">
                  {entries.map(([optLabel, count]) => {
                    const pct =
                      totalAttendees > 0 ? Math.round((count / totalAttendees) * 100) : 0;
                    return (
                      <div key={optLabel} className="text-xs">
                        <div className="flex items-center justify-between text-slate-700 font-medium mb-1">
                          <span className="truncate pr-2">{optLabel}</span>
                          <span className="font-bold text-slate-900 shrink-0">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#9E1B20] rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
