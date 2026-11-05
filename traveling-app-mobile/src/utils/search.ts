import type { RoomType } from '../types';
import { validateTrip } from './checkout';

export interface SearchDestination {
  kind: 'anywhere' | 'region' | 'city' | 'country';
  label: string;
  value: string;
  country?: string;
}
export interface SearchCriteria {
  destination: SearchDestination;
  checkInDate: string | null;
  checkOutDate: string | null;
  adults: number;
  children: number;
}
export interface AdvancedFilters {
  propertyType?: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  roomTypes: RoomType[];
  selectedAmenities: string[];
}
export const ANYWHERE: SearchDestination = { kind: 'anywhere', label: 'Mọi nơi', value: '' };
export const EMPTY_ADVANCED: AdvancedFilters = {
  propertyType: null,
  minPrice: null,
  maxPrice: null,
  bedrooms: null,
  beds: null,
  bathrooms: null,
  roomTypes: [],
  selectedAmenities: [],
};
export const ROOM_TYPES: { value: RoomType; title: string; description: string }[] = [
  {
    value: 'entire_place',
    title: 'Toàn bộ chỗ ở',
    description: 'Căn hộ, chung cư hoặc nhà nguyên căn',
  },
  {
    value: 'private_room',
    title: 'Phòng riêng',
    description: 'Thường có phòng tắm riêng trừ khi được ghi chú khác',
  },
  {
    value: 'dormitory',
    title: 'Phòng tập thể',
    description: 'Phòng lớn có nhiều giường và dùng chung với khách khác',
  },
];
export const validateSearchDates = (checkIn: string | null, checkOut: string | null): void => {
  if (!checkIn && !checkOut) return;
  if (!checkIn || !checkOut) throw new Error('Hãy chọn cả ngày nhận và trả phòng.');
  validateTrip(checkIn, checkOut, 1, 0, 1000);
};
export const validateSearch = (criteria: SearchCriteria): void => {
  if (
    !criteria.destination ||
    !criteria.destination.label ||
    (criteria.destination.kind !== 'anywhere' && !criteria.destination.value.trim())
  )
    throw new Error('Hãy chọn một điểm đến trong danh sách gợi ý.');
  validateSearchDates(criteria.checkInDate, criteria.checkOutDate);
  if (
    !Number.isSafeInteger(criteria.adults) ||
    criteria.adults < 1 ||
    !Number.isSafeInteger(criteria.children) ||
    criteria.children < 0
  )
    throw new Error('Cần có ít nhất một người lớn trước khi tìm kiếm.');
  if (criteria.adults + criteria.children > 1000) throw new Error('Chỉ tìm kiếm tối đa 1000 khách.');
};
export const validateAdvanced = (filters: AdvancedFilters): void => {
  for (const value of [filters.minPrice, filters.maxPrice])
    if (value !== null && (!Number.isFinite(value) || value < 0))
      throw new Error('Nhập mức giá hợp lệ và không âm.');
  if (filters.minPrice !== null && filters.maxPrice !== null && filters.minPrice > filters.maxPrice)
    throw new Error('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.');
  for (const value of [filters.bedrooms, filters.beds, filters.bathrooms])
    if (value !== null && (!Number.isSafeInteger(value) || value < 0 || value > 1000))
      throw new Error('Số lượng phòng phải là số nguyên từ 0 đến 1000.');
  if (filters.roomTypes.some((value) => !ROOM_TYPES.some((type) => type.value === value)))
    throw new Error('Hãy chọn loại chỗ ở hợp lệ.');
};
export const searchDateLabel = (checkIn: string | null, checkOut: string | null, locale = 'vi-VN'): string => {
  if (!checkIn || !checkOut) return 'Bất kỳ lúc nào';
  const start = new Date(`${checkIn}T00:00:00Z`),
    end = new Date(`${checkOut}T00:00:00Z`);
  const month = (date: Date) =>
    date.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' });
  if (start.getUTCFullYear() !== end.getUTCFullYear())
    return `${start.getUTCDate()} ${month(start)} ${start.getUTCFullYear()} - ${end.getUTCDate()} ${month(end)} ${end.getUTCFullYear()}`;
  if (start.getUTCMonth() === end.getUTCMonth())
    return `${start.getUTCDate()} - ${end.getUTCDate()} ${month(start)}`;
  return `${start.getUTCDate()} ${month(start)} - ${end.getUTCDate()} ${month(end)}`;
};
export const buildListingParams = (
  state: SearchCriteria & AdvancedFilters & { selectedCategory: string | null }
): Record<string, string | number | boolean> => {
  validateSearchDates(state.checkInDate, state.checkOutDate);
  validateAdvanced(state);
  const params: Record<string, string | number | boolean> = {};
  if (state.selectedCategory) params.categoryId = state.selectedCategory;
  if (state.propertyType) params.propertyType = state.propertyType;
  const destination = state.destination;
  if (destination.kind === 'region') params.region = destination.value;
  else if (destination.kind === 'country') params.country = destination.value;
  else if (destination.kind === 'city') {
    params.city = destination.value;
    params.cityExact = true;
    if (destination.country) params.country = destination.country;
  }
  if (state.checkInDate && state.checkOutDate) {
    params.checkIn = state.checkInDate;
    params.checkOut = state.checkOutDate;
  }
  const guests = state.adults + state.children;
  if (guests > 0) params.guests = guests;
  for (const name of ['minPrice', 'maxPrice', 'bedrooms', 'beds', 'bathrooms'] as const)
    if (state[name] !== null) params[name] = state[name]!;
  if (state.roomTypes.length) params.roomTypes = [...new Set(state.roomTypes)].sort().join(',');
  if (state.selectedAmenities.length)
    params.amenityIds = [...new Set(state.selectedAmenities)].sort().join(',');
  return params;
};
