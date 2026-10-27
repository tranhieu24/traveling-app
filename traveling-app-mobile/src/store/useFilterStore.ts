import { create } from 'zustand';

export interface FilterState {
  selectedCategory: string | null;
  region: string | null;
  city: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  guests: number;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  selectedAmenities: string[];

  // Actions
  setSelectedCategory: (categoryId: string | null) => void;
  setRegion: (region: string | null) => void;
  setDates: (checkIn: string | null, checkOut: string | null) => void;
  setGuests: (guests: number) => void;
  setPriceRange: (min: number | null, max: number | null) => void;
  setRooms: (bedrooms: number | null, beds: number | null, bathrooms: number | null) => void;
  toggleAmenity: (amenityId: string) => void;
  resetFilters: () => void;
  getActiveFilterCount: () => number;
}

const initialState = {
  selectedCategory: null,
  region: null,
  city: null,
  checkInDate: null,
  checkOutDate: null,
  guests: 1,
  minPrice: null,
  maxPrice: null,
  bedrooms: null,
  beds: null,
  bathrooms: null,
  selectedAmenities: [],
};

export const useFilterStore = create<FilterState>((set, get) => ({
  ...initialState,

  setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
  setRegion: (region) => set({ region }),
  setDates: (checkInDate, checkOutDate) => set({ checkInDate, checkOutDate }),
  setGuests: (guests) => set({ guests }),
  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice }),
  setRooms: (bedrooms, beds, bathrooms) => set({ bedrooms, beds, bathrooms }),

  toggleAmenity: (amenityId) => {
    const current = get().selectedAmenities;
    if (current.includes(amenityId)) {
      set({ selectedAmenities: current.filter((id) => id !== amenityId) });
    } else {
      set({ selectedAmenities: [...current, amenityId] });
    }
  },

  resetFilters: () => set(initialState),

  getActiveFilterCount: () => {
    const s = get();
    let count = 0;
    if (s.region) count++;
    if (s.checkInDate && s.checkOutDate) count++;
    if (s.guests > 1) count++;
    if (s.minPrice !== null || s.maxPrice !== null) count++;
    if (s.bedrooms !== null) count++;
    if (s.beds !== null) count++;
    if (s.bathrooms !== null) count++;
    if (s.selectedAmenities.length > 0) count += s.selectedAmenities.length;
    return count;
  },
}));
