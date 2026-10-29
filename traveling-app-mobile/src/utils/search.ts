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
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  roomTypes: RoomType[];
  selectedAmenities: string[];
}
export const ANYWHERE: SearchDestination = { kind: 'anywhere', label: 'Anywhere', value: '' };
export const EMPTY_ADVANCED: AdvancedFilters = {
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
    title: 'Entire place',
    description: 'Entire apartments, condos, houses',
  },
  {
    value: 'private_room',
    title: 'Private room',
    description: 'Typically come with a private bathroom unless otherwise stated',
  },
  {
    value: 'dormitory',
    title: 'Dormitories',
    description: 'Large rooms with multiple beds that are shared with others',
  },
];
export const validateSearchDates = (checkIn: string | null, checkOut: string | null): void => {
  if (!checkIn && !checkOut) return;
  if (!checkIn || !checkOut) throw new Error('Choose both a check-in and a check-out date.');
  validateTrip(checkIn, checkOut, 1, 0, 1000);
};
export const validateSearch = (criteria: SearchCriteria): void => {
  if (
    !criteria.destination ||
    !criteria.destination.label ||
    (criteria.destination.kind !== 'anywhere' && !criteria.destination.value.trim())
  )
    throw new Error('Choose a destination from the suggestions.');
  validateSearchDates(criteria.checkInDate, criteria.checkOutDate);
  if (
    !Number.isSafeInteger(criteria.adults) ||
    criteria.adults < 1 ||
    !Number.isSafeInteger(criteria.children) ||
    criteria.children < 0
  )
    throw new Error('Include at least one adult before searching.');
  if (criteria.adults + criteria.children > 1000) throw new Error('Search for up to 1000 guests.');
};
export const validateAdvanced = (filters: AdvancedFilters): void => {
  for (const value of [filters.minPrice, filters.maxPrice])
    if (value !== null && (!Number.isFinite(value) || value < 0))
      throw new Error('Enter a valid non-negative price.');
  if (filters.minPrice !== null && filters.maxPrice !== null && filters.minPrice > filters.maxPrice)
    throw new Error('Maximum price must be at least the minimum price.');
  for (const value of [filters.bedrooms, filters.beds, filters.bathrooms])
    if (value !== null && (!Number.isSafeInteger(value) || value < 0 || value > 1000))
      throw new Error('Room counts must be whole numbers from 0 to 1000.');
  if (filters.roomTypes.some((value) => !ROOM_TYPES.some((type) => type.value === value)))
    throw new Error('Choose a valid type of place.');
};
export const searchDateLabel = (checkIn: string | null, checkOut: string | null): string => {
  if (!checkIn || !checkOut) return 'Anytime';
  const start = new Date(`${checkIn}T00:00:00Z`),
    end = new Date(`${checkOut}T00:00:00Z`);
  const month = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
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
