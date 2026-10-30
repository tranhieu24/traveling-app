import { create } from 'zustand';
import {
  AdvancedFilters,
  ANYWHERE,
  EMPTY_ADVANCED,
  SearchCriteria,
  validateAdvanced,
  validateSearch,
} from '../utils/search';

export interface FilterState extends SearchCriteria, AdvancedFilters {
  selectedCategory: string | null;
  guests: number;
  hasSearch: boolean;
  showTotalPrice: boolean;
  setSelectedCategory: (categoryId: string | null) => void;
  setSearch: (criteria: SearchCriteria) => void;
  setDates: (checkIn: string | null, checkOut: string | null) => void;
  setGuests: (guests: number) => void;
  setGuestCounts: (adults: number, children: number) => void;
  setAdvancedFilters: (filters: AdvancedFilters) => void;
  clearAdvancedFilters: () => void;
  setShowTotalPrice: (show: boolean) => void;
  resetFilters: () => void;
  getActiveFilterCount: () => number;
}
const initialState = {
  ...EMPTY_ADVANCED,
  selectedCategory: null,
  destination: ANYWHERE,
  checkInDate: null,
  checkOutDate: null,
  adults: 0,
  children: 0,
  guests: 0,
  hasSearch: false,
  showTotalPrice: false,
};
export const useFilterStore = create<FilterState>((set, get) => ({
  ...initialState,
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSearch: (criteria) => {
    validateSearch(criteria);
    set({
      ...criteria,
      guests: criteria.adults + criteria.children,
      hasSearch: true,
      showTotalPrice: !!criteria.checkInDate && !!criteria.checkOutDate && get().showTotalPrice,
    });
  },
  setDates: (checkInDate, checkOutDate) =>
    set({
      checkInDate,
      checkOutDate,
      showTotalPrice: !!checkInDate && !!checkOutDate && get().showTotalPrice,
    }),
  setGuests: (guests) => {
    if (!Number.isSafeInteger(guests) || guests < 1 || guests > 1000)
      throw new Error('Choose a valid guest count.');
    set({ guests, adults: guests, children: 0 });
  },
  setGuestCounts: (adults, children) => {
    if (
      !Number.isSafeInteger(adults) ||
      adults < 1 ||
      !Number.isSafeInteger(children) ||
      children < 0 ||
      adults + children > 1000
    )
      throw new Error('Include at least one adult and a valid guest count.');
    set({ adults, children, guests: adults + children });
  },
  setAdvancedFilters: (filters) => {
    validateAdvanced(filters);
    set({
      ...filters,
      roomTypes: [...new Set(filters.roomTypes)],
      selectedAmenities: [...new Set(filters.selectedAmenities)],
    });
  },
  clearAdvancedFilters: () => set({ ...EMPTY_ADVANCED }),
  setShowTotalPrice: (show) =>
    set({ showTotalPrice: show && !!get().checkInDate && !!get().checkOutDate }),
  resetFilters: () => set({ ...initialState }),
  getActiveFilterCount: () => {
    const state = get();
    return (
      Number(state.minPrice !== null || state.maxPrice !== null) +
      Number(state.roomTypes.length > 0) +
      Number(state.bedrooms !== null) +
      Number(state.beds !== null) +
      Number(state.bathrooms !== null) +
      state.selectedAmenities.length
    );
  },
}));
