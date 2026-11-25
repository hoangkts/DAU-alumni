import React, { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Briefcase,
  Layers,
  BarChart3,
  Filter,
  X,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import {
  BusinessRecord,
  BUSINESS_INDUSTRIES,
  BUSINESS_SCALES,
} from '../data/constants';

interface BusinessDashboardProps {
  businesses: BusinessRecord[];
  onSelectIndustryFilter?: (industry: string) => void;
  onSelectProvinceFilter?: (province: string) => void;
  onSelectScaleFilter?: (scale: string) => void;
  activeFilter?: {
    type: 'industry' | 'province' | 'scale';
    value: string;
  } | null;
  onClearFilter?: () => void;
}

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  businesses,
  onSelectIndustryFilter,
  onSelectProvinceFilter,
  onSelectScaleFilter,
  activeFilter,
  onClearFilter,
}) => {
  const [activeTab, setActiveTab] = useState<'industries' | 'scales' | 'provinces'>('industries');
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);

  // 1. Industry Statistics
  const industryStats = useMemo(() => {
    const map = new Map<string, number>();
    BUSINESS_INDUSTRIES.forEach((ind) => map.set(ind, 0));

    businesses.forEach((b) => {
      const ind = b.industry?.trim();
      if (ind) {
        map.set(ind, (map.get(ind) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([industry, count]) => ({
        industry,
        count,
        percent: Math.round((count / (businesses.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [businesses]);

  // 2. Scale Statistics
  const scaleStats = useMemo(() => {
    const map = new Map<string, number>();
    BUSINESS_SCALES.forEach((sc) => map.set(sc, 0));

    businesses.forEach((b) => {
      const sc = b.scale?.trim();
      if (sc) {
        map.set(sc, (map.get(sc) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([scale, count]) => ({
        scale,
        shortLabel: scale.split('(')[0].trim(),
        count,
        percent: Math.round((count / (businesses.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [businesses]);

  // 3. Province Statistics
  const provinceStats = useMemo(() => {
    const map = new Map<string, number>();

    businesses.forEach((b) => {
      const p = b.province?.trim();
      if (p && p !== '—' && p !== '') {
        map.set(p, (map.get(p) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([province, count]) => ({
        province,
        count,
        percent: Math.round((count / (businesses.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [businesses]);

  const totalBusinesses = businesses.length;
  const activeIndustriesCount = industryStats.filter((i) => i.count > 0).length;
  const activeScalesCount = scaleStats.filter((s) => s.count > 0).length;
  const activeProvincesCount = provinceStats.length;

  const maxIndustryCount = Math.max(...industryStats.map((i) => i.count), 1);
  const maxScaleCount = Math.max(...scaleStats.map((s) => s.count), 1);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
      {/* Dashboard Section Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9E1B20]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#9E1B20]">
              HỆ SINH THÁI DOANH NGHIỆP · ALUMNI KTD
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Dashboard Thống kê Doanh nghiệp Cựu sinh viên
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Tổng hợp dữ liệu theo thời gian thực về pháp nhân, lĩnh vực hoạt động, quy mô nhân sự và địa bàn trụ sở 34 tỉnh/thành.
          </p>
        </div>

        {/* Active Filter Badge */}
        {activeFilter && (
          <div className="flex items-center gap-2 bg-red-50 border border-[#9E1B20]/25 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#9E1B20] self-start lg:self-center">
            <Filter className="w-4 h-4 shrink-0" />
            <span>
              Đang lọc danh sách:{' '}
              <strong className="font-semibold">{activeFilter.value}</strong>
            </span>
            {onClearFilter && (
              <button
                type="button"
                onClick={onClearFilter}
                className="ml-1 p-1 hover:bg-red-100 rounded-md cursor-pointer transition-colors"
                title="Xóa bộ lọc"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4 KPI Summary Cards (Interactive quick-access to charts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng số doanh nghiệp */}
        <div
          onClick={() => setIsBreakdownExpanded((prev) => !prev)}
          className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 hover:border-slate-300 hover:bg-slate-100/60 transition-all cursor-pointer group"
          title="Bấm để đóng/mở biểu đồ phân tích"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng doanh nghiệp ALUMNI
            </span>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-[#9E1B20] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">
              {totalBusinesses}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pháp nhân / Văn phòng kết nối</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Lĩnh vực hoạt động */}
        <div
          onClick={() => {
            setActiveTab('industries');
            setIsBreakdownExpanded(true);
          }}
          className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 hover:border-red-300 hover:bg-red-50/30 transition-all cursor-pointer group"
          title="Bấm để mở biểu đồ phân bố theo lĩnh vực"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-[#9E1B20] transition-colors">
              Lĩnh vực hoạt động
            </span>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-[#9E1B20] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">
              {activeIndustriesCount}{' '}
              <span className="text-sm font-normal text-slate-400">/ {BUSINESS_INDUSTRIES.length}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Kiến trúc, Xây dựng, BIM, M&E...</span>
              <span className="text-[11px] text-[#9E1B20] font-medium group-hover:underline">Xem biểu đồ ▾</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Quy mô nhân sự */}
        <div
          onClick={() => {
            setActiveTab('scales');
            setIsBreakdownExpanded(true);
          }}
          className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
          title="Bấm để mở biểu đồ phân cấp quy mô nhân sự"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-700 transition-colors">
              Quy mô nhân sự
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">
              {activeScalesCount}{' '}
              <span className="text-sm font-normal text-slate-400">Phân cấp</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Từ Studio đến Tập đoàn</span>
              <span className="text-[11px] text-blue-600 font-medium group-hover:underline">Xem biểu đồ ▾</span>
            </p>
          </div>
        </div>

        {/* KPI 4: Trụ sở 34 Tỉnh/Thành 2025 */}
        <div
          onClick={() => {
            setActiveTab('provinces');
            setIsBreakdownExpanded(true);
          }}
          className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group"
          title="Bấm để mở biểu đồ địa bàn trụ sở"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">
              Trụ sở & Địa bàn
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">
              {activeProvincesCount}{' '}
              <span className="text-sm font-normal text-slate-400">/ 34</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Độ phủ 34 tỉnh/thành 2025</span>
              <span className="text-[11px] text-emerald-600 font-medium group-hover:underline">Xem biểu đồ ▾</span>
            </p>
          </div>
        </div>
      </div>

      {/* Dropdown / Collapsible Toggle Bar for Detailed Charts */}
      <div className="pt-1">
        <div
          onClick={() => setIsBreakdownExpanded((prev) => !prev)}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 bg-slate-50/90 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-all shadow-2xs group"
          role="button"
          tabIndex={0}
          aria-expanded={isBreakdownExpanded}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsBreakdownExpanded((prev) => !prev);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-[#9E1B20] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A] group-hover:text-[#9E1B20] transition-colors">
                  Biểu đồ Phân tích Doanh nghiệp (Lĩnh vực, Quy mô & Địa bàn)
                </h3>
                <span className="text-[11px] font-bold text-[#9E1B20] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                  {isBreakdownExpanded ? 'Đang mở' : 'Thu gọn'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isBreakdownExpanded
                  ? 'Bấm để thu gọn phần biểu đồ phân tích và tiết kiệm không gian màn hình'
                  : 'Bấm để mở rộng biểu đồ phân bố 10 lĩnh vực, quy mô nhân sự và địa bàn 34 tỉnh thành'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBreakdownExpanded((prev) => !prev);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs ${
                isBreakdownExpanded
                  ? 'bg-[#9E1B20] text-white hover:bg-[#7D1418]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
              }`}
            >
              <span>{isBreakdownExpanded ? 'Thu gọn biểu đồ' : 'Mở rộng chi tiết (Drop)'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isBreakdownExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Chart Breakdown Section */}
      {isBreakdownExpanded && (
        <div className="space-y-6 pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Interactive Tabs Header */}
          <div>
            <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
              <button
                type="button"
                onClick={() => setActiveTab('industries')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'industries'
                    ? 'border-[#9E1B20] text-[#9E1B20] bg-red-50/50'
                    : 'border-transparent text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Phân bố theo Lĩnh vực hoạt động ({BUSINESS_INDUSTRIES.length} Lĩnh vực)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('scales')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'scales'
                    ? 'border-[#9E1B20] text-[#9E1B20] bg-red-50/50'
                    : 'border-transparent text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Phân cấp theo Quy mô nhân sự ({BUSINESS_SCALES.length} Cấp độ)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('provinces')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'provinces'
                    ? 'border-[#9E1B20] text-[#9E1B20] bg-red-50/50'
                    : 'border-transparent text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Địa bàn Trụ sở chính ({activeProvincesCount} Tỉnh/Thành)</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Industry Breakdown */}
          {activeTab === 'industries' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Bấm vào một lĩnh vực để lọc danh sách doanh nghiệp bên dưới</span>
                <span>Tổng cộng: {totalBusinesses} doanh nghiệp</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {industryStats.map((item, idx) => {
                  const isSelected =
                    activeFilter?.type === 'industry' && activeFilter.value === item.industry;
                  const barWidth = Math.max(6, Math.round((item.count / maxIndustryCount) * 100));

                  return (
                    <div
                      key={item.industry}
                      onClick={() => onSelectIndustryFilter?.(item.industry)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#9E1B20] bg-red-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-slate-400 tabular-nums">
                            0{idx + 1}.
                          </span>
                          <h4 className="text-sm font-bold text-[#0F172A] truncate">
                            {item.industry}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-extrabold text-[#9E1B20] tabular-nums">
                            {item.count}{' '}
                            <span className="text-xs font-normal text-slate-500">doanh nghiệp</span>
                          </span>
                          <span className="text-xs font-semibold text-slate-400 tabular-nums">
                            ({item.percent}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.count > 0 ? 'bg-[#9E1B20]' : 'bg-slate-200'
                          }`}
                          style={{ width: `${item.count > 0 ? barWidth : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Scale Breakdown */}
          {activeTab === 'scales' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Phân bố doanh nghiệp cựu sinh viên theo phân cấp quy mô nhân sự</span>
                <span>Bấm vào quy mô để lọc danh sách</span>
              </div>

              <div className="space-y-2.5">
                {scaleStats.map((item) => {
                  const isSelected =
                    activeFilter?.type === 'scale' && activeFilter.value === item.scale;
                  const barWidth = Math.max(6, Math.round((item.count / maxScaleCount) * 100));

                  return (
                    <div
                      key={item.scale}
                      onClick={() => onSelectScaleFilter?.(item.scale)}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                        isSelected
                          ? 'border-[#9E1B20] bg-red-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:w-64 shrink-0">
                        <span className="px-2.5 py-1 text-xs font-bold text-[#9E1B20] bg-red-50 rounded-lg border border-[#9E1B20]/20">
                          {item.shortLabel}
                        </span>
                        <span className="text-xs font-medium text-slate-600 truncate">
                          {item.scale}
                        </span>
                      </div>

                      {/* Horizontal Bar */}
                      <div className="flex-1 w-full flex items-center gap-3">
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#9E1B20] rounded-full transition-all duration-500"
                            style={{ width: `${item.count > 0 ? barWidth : 0}%` }}
                          />
                        </div>
                        <div className="w-28 text-right shrink-0">
                          <span className="text-xs sm:text-sm font-extrabold text-[#0F172A] tabular-nums">
                            {item.count}{' '}
                            <span className="text-xs font-normal text-slate-500">doanh nghiệp</span>
                          </span>
                          <span className="ml-1 text-xs font-medium text-slate-400 tabular-nums">
                            ({item.percent}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Provinces Breakdown */}
          {activeTab === 'provinces' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Danh sách các tỉnh, thành phố đặt trụ sở chính của doanh nghiệp ALUMNI KTD</span>
                <span>Bấm vào tỉnh thành để lọc danh sách</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {provinceStats.map((item, idx) => {
                  const isSelected =
                    activeFilter?.type === 'province' && activeFilter.value === item.province;
                  return (
                    <div
                      key={item.province}
                      onClick={() => onSelectProvinceFilter?.(item.province)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#9E1B20] bg-red-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            idx < 3
                              ? 'bg-[#9E1B20] text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-[#0F172A] truncate">
                          {item.province}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-bold text-[#9E1B20] bg-red-50 px-2 py-0.5 rounded-md border border-[#9E1B20]/20 tabular-nums">
                          {item.count} DN
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                          ({item.percent}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
