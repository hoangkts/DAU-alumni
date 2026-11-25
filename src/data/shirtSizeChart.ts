import { EventShirtOrder } from './constants';

export type ShirtGender = 'Nam' | 'Nữ';
export type ShirtSizeCode = EventShirtOrder['size']; // 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL'

export interface WeightSizeMapping {
  weightRange: string;
  minKg: number;
  maxKg: number;
  size: ShirtSizeCode;
  displaySize: string; // 'S' | 'M' | 'L' | 'XL' | '2XL (XXL)' | '3XL'
}

export interface HeightBracketChart {
  heightKey: string;
  heightLabel: string;
  mappings: WeightSizeMapping[];
}

export interface ShirtMeasurementRow {
  label: string;
  code: string;
  values: Record<string, string | number>;
}

export const MALE_SIZE_CHART_IMAGE =
  '/assets/aistudio/2aOboRAt6LxHpKtIGbVpwRpeQGcE5ndcHDMJjOK0_f8de3142.jpg';

export const FEMALE_SIZE_CHART_IMAGE =
  '/assets/aistudio/2aOboRAt6Ly6uafFpxrqfWhG8YFA60YdZMKi0bsO_cf1173ab.jpg';

/**
 * Bảng tra cứu Chiều cao - Cân nặng chuẩn ÁO NAM (2K Plus - Đồng phục Đà Nẵng)
 */
export const MALE_HEIGHT_WEIGHT_CHART: HeightBracketChart[] = [
  {
    heightKey: '1m60-1m65',
    heightLabel: '1m60 - 1m65',
    mappings: [
      { weightRange: '50 kg - 58 kg', minKg: 50, maxKg: 58, size: 'S', displaySize: 'S' },
      { weightRange: '58 kg - 66 kg', minKg: 58, maxKg: 66, size: 'M', displaySize: 'M' },
      { weightRange: '66 kg - 74 kg', minKg: 66, maxKg: 74, size: 'L', displaySize: 'L' },
      { weightRange: '74 kg - 82 kg', minKg: 74, maxKg: 82, size: 'XL', displaySize: 'XL' },
      { weightRange: '82 kg - 90 kg', minKg: 82, maxKg: 90, size: 'XXL', displaySize: '2XL (XXL)' },
      { weightRange: '90 kg - 98 kg', minKg: 90, maxKg: 98, size: '3XL', displaySize: '3XL' },
    ],
  },
  {
    heightKey: '1m65-1m70',
    heightLabel: '1m65 - 1m70',
    mappings: [
      { weightRange: '51 kg - 59 kg', minKg: 51, maxKg: 59, size: 'S', displaySize: 'S' },
      { weightRange: '59 kg - 67 kg', minKg: 59, maxKg: 67, size: 'M', displaySize: 'M' },
      { weightRange: '67 kg - 75 kg', minKg: 67, maxKg: 75, size: 'L', displaySize: 'L' },
      { weightRange: '75 kg - 83 kg', minKg: 75, maxKg: 83, size: 'XL', displaySize: 'XL' },
      { weightRange: '83 kg - 91 kg', minKg: 83, maxKg: 91, size: 'XXL', displaySize: '2XL (XXL)' },
      { weightRange: '91 kg - 99 kg', minKg: 91, maxKg: 99, size: '3XL', displaySize: '3XL' },
    ],
  },
  {
    heightKey: '1m70-1m75',
    heightLabel: '1m70 - 1m75',
    mappings: [
      { weightRange: '52 kg - 60 kg', minKg: 52, maxKg: 60, size: 'S', displaySize: 'S' },
      { weightRange: '60 kg - 68 kg', minKg: 60, maxKg: 68, size: 'M', displaySize: 'M' },
      { weightRange: '68 kg - 76 kg', minKg: 68, maxKg: 76, size: 'L', displaySize: 'L' },
      { weightRange: '76 kg - 84 kg', minKg: 76, maxKg: 84, size: 'XL', displaySize: 'XL' },
      { weightRange: '84 kg - 92 kg', minKg: 84, maxKg: 92, size: 'XXL', displaySize: '2XL (XXL)' },
      { weightRange: '92 kg - 100 kg', minKg: 92, maxKg: 100, size: '3XL', displaySize: '3XL' },
    ],
  },
  {
    heightKey: '1m75-1m80',
    heightLabel: '1m75 - 1m80',
    mappings: [
      { weightRange: '53 kg - 61 kg', minKg: 53, maxKg: 61, size: 'S', displaySize: 'S' },
      { weightRange: '61 kg - 69 kg', minKg: 61, maxKg: 69, size: 'M', displaySize: 'M' },
      { weightRange: '69 kg - 77 kg', minKg: 69, maxKg: 77, size: 'L', displaySize: 'L' },
      { weightRange: '77 kg - 85 kg', minKg: 77, maxKg: 85, size: 'XL', displaySize: 'XL' },
      { weightRange: '85 kg - 93 kg', minKg: 85, maxKg: 93, size: 'XXL', displaySize: '2XL (XXL)' },
      { weightRange: '93 kg - 101 kg', minKg: 93, maxKg: 101, size: '3XL', displaySize: '3XL' },
    ],
  },
];

/**
 * Bảng tra cứu Chiều cao - Cân nặng chuẩn ÁO NỮ (2K Plus - Đồng phục Đà Nẵng)
 */
export const FEMALE_HEIGHT_WEIGHT_CHART: HeightBracketChart[] = [
  {
    heightKey: '<1m50',
    heightLabel: '< 1m50',
    mappings: [
      { weightRange: '41 kg - 46 kg', minKg: 41, maxKg: 46, size: 'S', displaySize: 'S' },
      { weightRange: '46 kg - 51 kg', minKg: 46, maxKg: 51, size: 'M', displaySize: 'M' },
      { weightRange: '51 kg - 56 kg', minKg: 51, maxKg: 56, size: 'L', displaySize: 'L' },
      { weightRange: '56 kg - 61 kg', minKg: 56, maxKg: 61, size: 'XL', displaySize: 'XL' },
      { weightRange: '61 kg - 66 kg', minKg: 61, maxKg: 66, size: 'XXL', displaySize: '2XL (XXL)' },
    ],
  },
  {
    heightKey: '1m51-1m57',
    heightLabel: '1m51 - 1m57',
    mappings: [
      { weightRange: '43 kg - 48 kg', minKg: 43, maxKg: 48, size: 'S', displaySize: 'S' },
      { weightRange: '48 kg - 53 kg', minKg: 48, maxKg: 53, size: 'M', displaySize: 'M' },
      { weightRange: '53 kg - 58 kg', minKg: 53, maxKg: 58, size: 'L', displaySize: 'L' },
      { weightRange: '58 kg - 63 kg', minKg: 58, maxKg: 63, size: 'XL', displaySize: 'XL' },
      { weightRange: '63 kg - 68 kg', minKg: 63, maxKg: 68, size: 'XXL', displaySize: '2XL (XXL)' },
    ],
  },
  {
    heightKey: '1m58-1m64',
    heightLabel: '1m58 - 1m64',
    mappings: [
      { weightRange: '45 kg - 50 kg', minKg: 45, maxKg: 50, size: 'S', displaySize: 'S' },
      { weightRange: '50 kg - 55 kg', minKg: 50, maxKg: 55, size: 'M', displaySize: 'M' },
      { weightRange: '55 kg - 60 kg', minKg: 55, maxKg: 60, size: 'L', displaySize: 'L' },
      { weightRange: '60 kg - 65 kg', minKg: 60, maxKg: 65, size: 'XL', displaySize: 'XL' },
      { weightRange: '65 kg - 70 kg', minKg: 65, maxKg: 70, size: 'XXL', displaySize: '2XL (XXL)' },
    ],
  },
  {
    heightKey: '>1m65',
    heightLabel: '> 1m65',
    mappings: [
      { weightRange: '47 kg - 52 kg', minKg: 47, maxKg: 52, size: 'S', displaySize: 'S' },
      { weightRange: '52 kg - 57 kg', minKg: 52, maxKg: 57, size: 'M', displaySize: 'M' },
      { weightRange: '57 kg - 62 kg', minKg: 57, maxKg: 62, size: 'L', displaySize: 'L' },
      { weightRange: '62 kg - 67 kg', minKg: 62, maxKg: 67, size: 'XL', displaySize: 'XL' },
      { weightRange: '67 kg - 72 kg', minKg: 67, maxKg: 72, size: 'XXL', displaySize: '2XL (XXL)' },
    ],
  },
];

/**
 * Thông số kỹ thuật Áo Nam (cm)
 */
export const MALE_MEASUREMENTS: ShirtMeasurementRow[] = [
  { label: 'Dài áo', code: 'A', values: { S: 67, M: 68.5, L: 70, XL: 71.5, '2XL': 73, '3XL': 74.5 } },
  { label: 'Dài tay', code: 'B', values: { S: 20.5, M: 21, L: 21.5, XL: 22, '2XL': 22.5, '3XL': 23 } },
  { label: 'Rộng vai', code: 'C', values: { S: 40.5, M: 42.5, L: 44.5, XL: 46.5, '2XL': 48.5, '3XL': 50.5 } },
  { label: 'Vòng ngực', code: 'D', values: { S: 96, M: 100, L: 104, XL: 108, '2XL': 112, '3XL': 116 } },
  { label: 'Vòng eo', code: 'E', values: { S: 92, M: 96, L: 100, XL: 104, '2XL': 108, '3XL': 112 } },
  { label: 'Vòng mông', code: 'F', values: { S: 94, M: 98, L: 102, XL: 106, '2XL': 110, '3XL': 114 } },
  { label: 'Vòng bắp tay', code: 'G', values: { S: 37, M: 38.5, L: 40, XL: 41.5, '2XL': 43, '3XL': 44.5 } },
  { label: 'Vòng cửa tay', code: 'H', values: { S: 29, M: 30.5, L: 32, XL: 33.5, '2XL': 35, '3XL': 36.5 } },
];

/**
 * Thông số kỹ thuật Áo Nữ (cm)
 */
export const FEMALE_MEASUREMENTS: ShirtMeasurementRow[] = [
  { label: 'Dài áo', code: 'A', values: { S: 59, M: 60, L: 61, XL: 62, '2XL': 63 } },
  { label: 'Dài tay', code: 'B', values: { S: 18.5, M: 19, L: 19.5, XL: 20, '2XL': 20.5 } },
  { label: 'Rộng vai', code: 'C', values: { S: 37, M: 38, L: 39, XL: 40, '2XL': 41 } },
  { label: 'Vòng ngực', code: 'D', values: { S: 86, M: 90, L: 94, XL: 98, '2XL': 102 } },
  { label: 'Vòng eo', code: 'E', values: { S: 81, M: 85, L: 89, XL: 93, '2XL': 97 } },
  { label: 'Vòng mông', code: 'F', values: { S: 90, M: 94, L: 98, XL: 102, '2XL': 106 } },
  { label: 'Vòng bắp tay', code: 'G', values: { S: 33.5, M: 35.5, L: 37.5, XL: 39.5, '2XL': 41.5 } },
  { label: 'Vòng cửa tay', code: 'H', values: { S: 26.5, M: 28.5, L: 30.5, XL: 32.5, '2XL': 34.5 } },
];

export function getChartByGender(gender: ShirtGender): HeightBracketChart[] {
  return gender === 'Nữ' ? FEMALE_HEIGHT_WEIGHT_CHART : MALE_HEIGHT_WEIGHT_CHART;
}

export function getDefaultHeightKey(gender: ShirtGender): string {
  return gender === 'Nữ' ? '1m58-1m64' : '1m65-1m70';
}

export function findRecommendedSize(
  gender: ShirtGender,
  heightKey: string,
  weightKg: number
): { size: ShirtSizeCode; note: string } {
  const chart = getChartByGender(gender);
  const bracket = chart.find((b) => b.heightKey === heightKey) || chart[0];
  const mappings = bracket.mappings;

  if (weightKg <= mappings[0].maxKg) {
    return {
      size: mappings[0].size,
      note: `Phù hợp mốc ${mappings[0].weightRange} (Cao ${bracket.heightLabel})`,
    };
  }

  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    if (weightKg >= m.minKg && weightKg <= m.maxKg) {
      // Nếu nằm ngay biên giữa 2 size, ưu tiên size lớn hơn theo đúng lưu ý "chọn size lớn để mặc thoải mái nhất"
      if (weightKg === m.maxKg && i + 1 < mappings.length) {
        const nextM = mappings[i + 1];
        return {
          size: nextM.size,
          note: `Nằm giữa ${m.displaySize} & ${nextM.displaySize} → Khuyên chọn ${nextM.displaySize} để mặc thoải mái nhất`,
        };
      }
      return {
        size: m.size,
        note: `Chuẩn thông số: Cao ${bracket.heightLabel} · Nặng ${m.weightRange}`,
      };
    }
  }

  const last = mappings[mappings.length - 1];
  return {
    size: last.size,
    note:
      gender === 'Nữ' && weightKg > last.maxKg
        ? `Trên ${last.maxKg}kg: Gợi ý chọn 2XL Nữ hoặc chuyển sang bảng Size Nam để mặc rộng thoải mái`
        : `Phù hợp mốc lớn nhất ${last.displaySize} (${last.weightRange})`,
  };
}
