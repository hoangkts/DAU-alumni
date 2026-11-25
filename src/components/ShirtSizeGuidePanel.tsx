import React, { useState } from 'react';
import {
  Ruler,
  Sparkles,
  CheckCircle2,
  Info,
  Maximize2,
  X,
  Image as ImageIcon,
  Table,
} from 'lucide-react';
import {
  FEMALE_SIZE_CHART_IMAGE,
  MALE_SIZE_CHART_IMAGE,
  ShirtGender,
  ShirtSizeCode,
  findRecommendedSize,
  getChartByGender,
  getDefaultHeightKey,
} from '../data/shirtSizeChart';

interface ShirtSizeGuidePanelProps {
  onApplySizeToOrder?: (gender: ShirtGender, size: ShirtSizeCode) => void;
  defaultGender?: ShirtGender;
}

export const ShirtSizeGuidePanel: React.FC<ShirtSizeGuidePanelProps> = ({
  onApplySizeToOrder,
  defaultGender = 'Nam',
}) => {
  const [activeGenderTab, setActiveGenderTab] = useState<ShirtGender>(defaultGender);
  const [viewMode, setViewMode] = useState<'interactive' | 'original_image'>('interactive');
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Interactive quick calculator state
  const [calcHeightKey, setCalcHeightKey] = useState<string>(getDefaultHeightKey(defaultGender));
  const [calcWeightKg, setCalcWeightKg] = useState<string>(defaultGender === 'Nữ' ? '53' : '68');

  const handleSwitchGenderTab = (gender: ShirtGender) => {
    setActiveGenderTab(gender);
    setCalcHeightKey(getDefaultHeightKey(gender));
    setCalcWeightKg(gender === 'Nữ' ? '53' : '68');
  };

  const currentHeightChart = getChartByGender(activeGenderTab);

  const parsedWeight = Number(calcWeightKg);
  const recommendation =
    !Number.isNaN(parsedWeight) && parsedWeight >= 35 && parsedWeight <= 130
      ? findRecommendedSize(activeGenderTab, calcHeightKey, parsedWeight)
      : null;

  return (
    <div className="p-3 sm:p-4 bg-slate-50/90 border-2 border-red-200/80 rounded-xl space-y-3.5 sm:space-y-4 shadow-xs animate-in fade-in duration-150">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-start sm:items-center gap-2">
          <div className="p-2 bg-[#9E1B20] text-white rounded-lg shrink-0 mt-0.5 sm:mt-0">
            <Ruler className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide leading-snug">
              Bảng Hướng Dẫn Chọn Size Áo Theo Form (Nam / Nữ) & Chiều Cao - Cân Nặng
            </h5>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chọn Form áo, đối chiếu Chiều cao và Cân nặng để chọn đúng Size áo phù hợp nhất
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {/* Switch Nam / Nữ */}
          <div className="grid grid-cols-2 sm:inline-flex rounded-lg border-2 border-[#9E1B20]/30 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSwitchGenderTab('Nam')}
              className={`px-3 py-2 sm:py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer text-center ${
                activeGenderTab === 'Nam'
                  ? 'bg-[#9E1B20] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Form Nam (S – 3XL)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchGenderTab('Nữ')}
              className={`px-3 py-2 sm:py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer text-center ${
                activeGenderTab === 'Nữ'
                  ? 'bg-[#9E1B20] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Form Nữ (S – 2XL)
            </button>
          </div>

          {/* Switch Table vs Original Image */}
          <div className="grid grid-cols-2 sm:inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('interactive')}
              className={`px-2.5 py-2 sm:py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'interactive'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Bảng Chiều cao - Cân nặng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('original_image')}
              className={`px-2.5 py-2 sm:py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'original_image'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Ảnh bảng size gốc</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Size Recommender by Height & Weight */}
      <div className="p-3 sm:p-3.5 bg-white border-2 border-[#9E1B20]/30 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#9E1B20]">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Tra cứu nhanh Size Áo {activeGenderTab} theo Chiều cao & Cân nặng:</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Chọn mốc chiều cao và nhập cân nặng thực tế để hệ thống gợi ý size chuẩn nhất
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Chọn chiều cao */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5">
            <label className="text-[11px] sm:text-xs font-bold text-slate-800 whitespace-nowrap">
              Chiều cao (*):
            </label>
            <select
              value={calcHeightKey}
              onChange={(e) => setCalcHeightKey(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-2 sm:py-1.5 bg-red-50/40 border-2 border-[#9E1B20]/40 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E1B20] min-h-[38px]"
            >
              {currentHeightChart.map((b) => (
                <option key={b.heightKey} value={b.heightKey}>
                  {b.heightLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Nhập cân nặng */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5">
            <label className="text-[11px] sm:text-xs font-bold text-slate-800 whitespace-nowrap">
              Cân nặng (kg) (*):
            </label>
            <input
              type="number"
              min={35}
              max={130}
              value={calcWeightKg}
              onChange={(e) => setCalcWeightKg(e.target.value)}
              placeholder="VD: 65"
              className="w-full sm:w-20 px-2.5 py-2 sm:py-1.5 bg-red-50/40 border-2 border-[#9E1B20]/40 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9E1B20] min-h-[38px]"
            />
          </div>

          {/* Kết quả gợi ý */}
          {recommendation && (
            <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-start gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 sm:py-1.5 rounded-lg">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-600">Gợi ý: </span>
                  <strong className="text-sm font-extrabold text-[#9E1B20]">
                    Size {recommendation.size === 'XXL' ? '2XL (XXL)' : recommendation.size}
                  </strong>
                  <span className="hidden sm:inline text-[11px] text-slate-500 ml-1.5">
                    ({recommendation.note})
                  </span>
                </div>
              </div>
              {onApplySizeToOrder && (
                <button
                  type="button"
                  onClick={() => onApplySizeToOrder(activeGenderTab, recommendation.size)}
                  className="ml-1 px-3 py-1.5 sm:px-2.5 sm:py-1 bg-[#9E1B20] hover:bg-[#7D1418] text-white text-xs sm:text-[11px] font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  Chọn Size này
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {viewMode === 'original_image' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ảnh bảng size Nam */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  1. Bảng Hướng dẫn Chọn Size Áo Nam (S – 3XL)
                </span>
                <button
                  type="button"
                  onClick={() => setZoomImageUrl(MALE_SIZE_CHART_IMAGE)}
                  className="px-2 py-1 text-[11px] font-semibold text-[#9E1B20] bg-red-50 hover:bg-red-100 rounded-md flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Phóng to</span>
                </button>
              </div>
              <img
                src={MALE_SIZE_CHART_IMAGE}
                alt="Hướng dẫn chọn size áo Nam - 2K Plus Đồng Phục Đà Nẵng"
                onClick={() => setZoomImageUrl(MALE_SIZE_CHART_IMAGE)}
                className="w-full h-auto rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-95 transition-opacity"
              />
            </div>

            {/* Ảnh bảng size Nữ */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  2. Bảng Hướng dẫn Chọn Size Áo Nữ (S – 2XL)
                </span>
                <button
                  type="button"
                  onClick={() => setZoomImageUrl(FEMALE_SIZE_CHART_IMAGE)}
                  className="px-2 py-1 text-[11px] font-semibold text-[#9E1B20] bg-red-50 hover:bg-red-100 rounded-md flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Phóng to</span>
                </button>
              </div>
              <img
                src={FEMALE_SIZE_CHART_IMAGE}
                alt="Hướng dẫn chọn size áo Nữ - 2K Plus Đồng Phục Đà Nẵng"
                onClick={() => setZoomImageUrl(FEMALE_SIZE_CHART_IMAGE)}
                className="w-full h-auto rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-95 transition-opacity"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Cột trái: Bảng Chiều cao - Cân nặng */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-slate-800 text-white px-3.5 py-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">
                Bảng Chiều Cao - Cân Nặng Chuẩn · Áo {activeGenderTab}
              </span>
              <span className="text-[11px] text-amber-300 font-semibold">
                Bấm vào dòng bất kỳ để chọn ngay Size đó
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                    <th className="py-2 px-3 text-left font-bold border-r border-slate-200">
                      CHIỀU CAO
                    </th>
                    <th className="py-2 px-3 text-left font-bold border-r border-slate-200">
                      CÂN NẶNG
                    </th>
                    <th className="py-2 px-3 text-center font-bold text-[#9E1B20]">
                      SIZE ÁO
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentHeightChart.map((bracket) =>
                    bracket.mappings.map((m, idx) => (
                      <tr
                        key={`${bracket.heightKey}-${m.size}`}
                        onClick={() =>
                          onApplySizeToOrder &&
                          onApplySizeToOrder(activeGenderTab, m.size)
                        }
                        className={`hover:bg-red-50/70 transition-colors ${
                          onApplySizeToOrder ? 'cursor-pointer' : ''
                        }`}
                      >
                        {idx === 0 && (
                          <td
                            rowSpan={bracket.mappings.length}
                            className="py-2 px-3 font-bold text-slate-900 bg-slate-50 border-r border-slate-200 align-middle whitespace-nowrap"
                          >
                            {bracket.heightLabel}
                          </td>
                        )}
                        <td className="py-1.5 px-3 text-slate-700 font-medium border-r border-slate-200">
                          {m.weightRange}
                        </td>
                        <td className="py-1.5 px-3 text-center font-extrabold text-[#9E1B20]">
                          {m.displaySize}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cột phải: Lưu ý khi chọn size */}
          <div className="lg:col-span-5 p-4 bg-amber-50/90 border-2 border-amber-200 rounded-xl space-y-2.5 text-xs text-slate-700">
            <p className="font-bold text-[#9E1B20] flex items-center gap-1.5 text-sm">
              <Info className="w-4 h-4 shrink-0" />
              <span>Lưu ý khi chọn size áo:</span>
            </p>
            <ul className="space-y-2 pl-4 list-disc text-xs leading-relaxed">
              <li>
                Nếu phân vân giữa <strong>size lớn và size bé</strong>, bạn nên chọn{' '}
                <strong>size lớn</strong> để khi mặc thấy thoải mái nhất và size rộng sẽ dễ sửa, khắc phục.
              </li>
              <li>
                Trường hợp <strong>chiều cao và cân nặng nằm ở 2 size khác nhau</strong>, bạn nên chọn size ở bảng nào tương thích nhất. Tuy nhiên, theo kinh nghiệm nên{' '}
                <strong>chọn size theo chiều cao</strong> sẽ bảo vệ tính thẩm mỹ tối ưu hơn.
              </li>
              <li>
                <span className="text-[#9E1B20] font-semibold">
                  Đối với Nữ:
                </span>{' '}
                Những bạn nữ có phong cách mang áo form rộng, cá tính thì nên sử dụng bảng thông số tham chiếu <strong>Size Nam</strong>.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Lightbox phóng to ảnh bảng size gốc */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-white rounded-2xl p-3 shadow-2xl space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-bold text-slate-900">
                Bảng Hướng Dẫn Chọn Size Áo Đồng Phục (2K Plus - Đồng Phục Đà Nẵng)
              </span>
              <button
                type="button"
                onClick={() => setZoomImageUrl(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={zoomImageUrl}
              alt="Bảng size phóng to"
              className="w-full max-h-[82vh] object-contain rounded-xl border border-slate-200"
            />
          </div>
        </div>
      )}
    </div>
  );
};
