import React, { useState, useMemo } from 'react';
import {
  Users,
  MapPin,
  GraduationCap,
  Building2,
  BarChart3,
  TrendingUp,
  PieChart,
  Calendar,
  Filter,
  X,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  MemberProfileRecord,
  FACULTY_MAJORS_LIST,
  VIETNAM_34_PROVINCES_2025,
} from '../data/constants';

interface AlumniDashboardProps {
  members: MemberProfileRecord[];
  onSelectFacultyFilter?: (faculty: string) => void;
  onSelectYearFilter?: (year: string) => void;
  onSelectProvinceFilter?: (province: string) => void;
  activeFilter?: {
    type: 'faculty' | 'year' | 'province';
    value: string;
  } | null;
  onClearFilter?: () => void;
}

export const AlumniDashboard: React.FC<AlumniDashboardProps> = ({
  members,
  onSelectFacultyFilter,
  onSelectYearFilter,
  onSelectProvinceFilter,
  activeFilter,
  onClearFilter,
}) => {
  const [activeTab, setActiveTab] = useState<'faculties' | 'years' | 'provinces'>('faculties');
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);

  // 1. Statistics for Provinces (Working Provinces)
  const provinceStats = useMemo(() => {
    const provinceCountMap = new Map<string, number>();

    members.forEach((m) => {
      const p = m.workplaceProvince?.trim() || m.currentProvince?.trim();
      if (p && p !== '—' && p !== '') {
        provinceCountMap.set(p, (provinceCountMap.get(p) || 0) + 1);
      }
    });

    return Array.from(provinceCountMap.entries())
      .map(([province, count]) => ({
        province,
        count,
        percent: Math.round((count / (members.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [members]);

  // 2. Statistics for Enrollment Years
  const enrollmentYearStats = useMemo(() => {
    const yearCountMap = new Map<string, number>();

    members.forEach((m) => {
      const y = m.enrollmentYear?.trim();
      if (y && y.length >= 4) {
        yearCountMap.set(y, (yearCountMap.get(y) || 0) + 1);
      }
    });

    return Array.from(yearCountMap.entries())
      .map(([year, count]) => ({
        year,
        count,
        percent: Math.round((count / (members.length || 1)) * 100),
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [members]);

  // 3. Statistics for Faculties and Majors
  const facultyStats = useMemo(() => {
    const facultyMap = new Map<
      string,
      { count: number; majors: Map<string, number> }
    >();

    // Pre-populate with all 8 official faculties
    FACULTY_MAJORS_LIST.forEach((f) => {
      facultyMap.set(f.faculty, { count: 0, majors: new Map() });
      f.majors.forEach((m) => facultyMap.get(f.faculty)!.majors.set(m, 0));
    });

    members.forEach((m) => {
      const f = m.faculty?.trim() || 'Khoa Kiến trúc';
      if (!facultyMap.has(f)) {
        facultyMap.set(f, { count: 0, majors: new Map() });
      }
      const item = facultyMap.get(f)!;
      item.count += 1;

      const maj = m.major?.trim();
      if (maj) {
        item.majors.set(maj, (item.majors.get(maj) || 0) + 1);
      }
    });

    return Array.from(facultyMap.entries())
      .map(([faculty, data]) => {
        const majorsList = Array.from(data.majors.entries())
          .map(([major, mCount]) => ({ major, count: mCount }))
          .sort((a, b) => b.count - a.count);

        return {
          faculty,
          count: data.count,
          percent: Math.round((data.count / (members.length || 1)) * 100),
          majors: majorsList,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [members]);

  // Aggregated summaries
  const totalMembers = members.length;
  const uniqueWorkingProvincesCount = provinceStats.length;
  const uniqueYearsCount = enrollmentYearStats.length;
  const earliestYear = enrollmentYearStats[0]?.year || '2006';
  const latestYear = enrollmentYearStats[enrollmentYearStats.length - 1]?.year || '2024';

  const maxYearCount = Math.max(...enrollmentYearStats.map((y) => y.count), 1);
  const maxFacultyCount = Math.max(...facultyStats.map((f) => f.count), 1);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
      {/* Dashboard Section Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9E1B20]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#9E1B20]">
              HỆ THỐNG DỮ LIỆU ĐỊNH DANH · ALUMNI KTD
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Dashboard Thống kê Mạng lưới Cựu sinh viên
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Tổng hợp dữ liệu theo thời gian thực về quy mô thành viên, độ phủ tỉnh/thành công tác, niên khóa và các khoa/ngành đào tạo.
          </p>
        </div>

        {/* Active Filter Badge */}
        {activeFilter && (
          <div className="flex items-center gap-2 bg-red-50 border border-[#9E1B20]/25 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#9E1B20] self-start lg:self-center">
            <Filter className="w-4 h-4 shrink-0" />
            <span>
              Đang lọc danh bạ:{' '}
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
        {/* KPI 1: Tổng số thành viên */}
        <div
          onClick={() => setIsBreakdownExpanded((prev) => !prev)}
          className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 hover:border-slate-300 hover:bg-slate-100/60 transition-all cursor-pointer group"
          title="Bấm để đóng/mở biểu đồ phân tích"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng thành viên ALUMNI
            </span>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-[#9E1B20] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">
              {totalMembers}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xác thực qua tài khoản Google</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Tỉnh / Thành công tác */}
        <div
          onClick={() => {
            setActiveTab('provinces');
            setIsBreakdownExpanded(true);
          }}
          className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group"
          title="Bấm để mở biểu đồ phân bố theo tỉnh thành"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-700 transition-colors">
              Tỉnh/Thành công tác
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">
              {uniqueWorkingProvincesCount}{' '}
              <span className="text-sm font-normal text-slate-400">/ 34</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>34 tỉnh/thành mới 2025</span>
              <span className="text-[11px] text-blue-600 font-medium group-hover:underline">Xem biểu đồ ▾</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Niên khóa nhập học */}
        <div
          onClick={() => {
            setActiveTab('years');
            setIsBreakdownExpanded(true);
          }}
          className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group"
          title="Bấm để mở biểu đồ phân bố theo năm nhập học"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">
              Niên khóa nhập học
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">
              {uniqueYearsCount}{' '}
              <span className="text-sm font-normal text-slate-400">Niên khóa</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>{earliestYear} – {latestYear}</span>
              <span className="text-[11px] text-emerald-600 font-medium group-hover:underline">Xem biểu đồ ▾</span>
            </p>
          </div>
        </div>

        {/* KPI 4: Khoa & Chuyên ngành */}
        <div
          onClick={() => {
            setActiveTab('faculties');
            setIsBreakdownExpanded(true);
          }}
          className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 hover:border-amber-300 hover:bg-amber-50/30 transition-all cursor-pointer group"
          title="Bấm để mở biểu đồ phân bố theo khoa ngành"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-700 transition-colors">
              Khoa & Ngành đào tạo
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">
              08{' '}
              <span className="text-sm font-normal text-slate-400">Khoa chính</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>16 chuyên ngành DAU</span>
              <span className="text-[11px] text-amber-600 font-medium group-hover:underline">Xem biểu đồ ▾</span>
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
                  Biểu đồ Phân tích Chi tiết (Khoa/Ngành, Niên khóa & Địa bàn)
                </h3>
                <span className="text-[11px] font-bold text-[#9E1B20] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                  {isBreakdownExpanded ? 'Đang mở' : 'Thu gọn'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isBreakdownExpanded
                  ? 'Bấm để thu gọn phần biểu đồ phân tích và tiết kiệm không gian màn hình'
                  : 'Bấm để mở rộng biểu đồ phân bố 8 Khoa đào tạo, các Niên khóa & Tỉnh thành'}
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
                onClick={() => setActiveTab('faculties')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'faculties'
                    ? 'border-[#9E1B20] text-[#9E1B20] bg-red-50/50'
                    : 'border-transparent text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Phân bố theo Khoa / Ngành (8 Khoa)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('years')}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'years'
                    ? 'border-[#9E1B20] text-[#9E1B20] bg-red-50/50'
                    : 'border-transparent text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Phân bố theo Năm nhập học ({uniqueYearsCount} Niên khóa)</span>
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
                <span>Địa bàn Công tác ({uniqueWorkingProvincesCount} Tỉnh/Thành)</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Faculty / Major breakdown */}
          {activeTab === 'faculties' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Bấm vào một khoa để lọc danh bạ thành viên bên dưới</span>
                <span>Tổng cộng: {totalMembers} cựu sinh viên</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {facultyStats.map((item, idx) => {
                  const isSelected = activeFilter?.type === 'faculty' && activeFilter.value === item.faculty;
                  const barWidth = Math.max(6, Math.round((item.count / maxFacultyCount) * 100));

                  return (
                    <div
                      key={item.faculty}
                      onClick={() => onSelectFacultyFilter?.(item.faculty)}
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
                            {item.faculty}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-extrabold text-[#9E1B20] tabular-nums">
                            {item.count}{' '}
                            <span className="text-xs font-normal text-slate-500">thành viên</span>
                          </span>
                          <span className="text-xs font-semibold text-slate-400 tabular-nums">
                            ({item.percent}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.count > 0 ? 'bg-[#9E1B20]' : 'bg-slate-200'
                          }`}
                          style={{ width: `${item.count > 0 ? barWidth : 0}%` }}
                        />
                      </div>

                      {/* Sub-majors tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {item.majors.map((maj) => (
                          <span
                            key={maj.major}
                            className={`text-[11px] px-2 py-0.5 rounded-md border ${
                              maj.count > 0
                                ? 'bg-white border-slate-200 text-slate-700 font-medium'
                                : 'bg-slate-50/50 border-slate-100 text-slate-400'
                            }`}
                          >
                            {maj.major.replace('Ngành ', '')}
                            {maj.count > 0 && (
                              <strong className="ml-1 text-[#9E1B20] font-bold">
                                ({maj.count})
                              </strong>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Enrollment Year breakdown */}
          {activeTab === 'years' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Phân bố số lượng cựu sinh viên theo từng năm nhập học (Niên khóa)</span>
                <span>Bấm vào năm để lọc danh bạ</span>
              </div>

              <div className="space-y-2.5">
                {enrollmentYearStats.map((item) => {
                  const isSelected = activeFilter?.type === 'year' && activeFilter.value === item.year;
                  const barWidth = Math.max(6, Math.round((item.count / maxYearCount) * 100));

                  return (
                    <div
                      key={item.year}
                      onClick={() => onSelectYearFilter?.(item.year)}
                      className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                        isSelected
                          ? 'border-[#9E1B20] bg-red-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:w-44 shrink-0">
                        <span className="px-2.5 py-1 text-xs font-bold text-[#9E1B20] bg-red-50 rounded-lg border border-[#9E1B20]/20 tabular-nums">
                          Khóa {item.year}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          Nhập học năm {item.year}
                        </span>
                      </div>

                      {/* Horizontal Bar */}
                      <div className="flex-1 w-full flex items-center gap-3">
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#9E1B20] rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="w-24 text-right shrink-0">
                          <span className="text-xs sm:text-sm font-extrabold text-[#0F172A] tabular-nums">
                            {item.count}{' '}
                            <span className="text-xs font-normal text-slate-500">thành viên</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Provinces breakdown */}
          {activeTab === 'provinces' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Danh sách các tỉnh, thành phố cựu sinh viên KTD đang công tác và làm việc</span>
                <span>Bấm vào tỉnh thành để lọc danh bạ</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {provinceStats.map((item, idx) => {
                  const isSelected = activeFilter?.type === 'province' && activeFilter.value === item.province;
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
                          {item.count} cựu SV
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
