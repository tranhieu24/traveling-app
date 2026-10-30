import type { Listing } from '../types';
import type { SearchDestination } from '../utils/search';
import { apiClient } from './apiClient';

export interface ListingPage {
  listings: Listing[];
  pagination: { page: number; total: number; totalPages: number };
}
export const fetchListingPage = async (
  params: Record<string, string | number | boolean>,
  page = 1,
  signal?: AbortSignal
): Promise<ListingPage> => {
  const response = await apiClient.get('/listings', {
    params: { ...params, page, limit: 20 },
    signal,
  });
  if (!response.data.success || !Array.isArray(response.data.data))
    throw new Error('Could not load stays. Please try again.');
  return {
    listings: response.data.data,
    pagination: {
      page: Number(response.data.pagination?.page || page),
      total: Number(response.data.pagination?.total ?? response.data.data.length),
      totalPages: Number(response.data.pagination?.totalPages || 1),
    },
  };
};
export const fetchDestinations = async (
  query: string,
  signal?: AbortSignal
): Promise<SearchDestination[]> => {
  const response = await apiClient.get('/destinations', {
    params: { q: query.trim(), limit: 8 },
    signal,
  });
  if (!response.data.success || !Array.isArray(response.data.data))
    throw new Error('Could not load destinations.');
  return response.data.data.flatMap((row: { kind: string; city?: string; country?: string }) => {
    if (row.kind === 'city' && row.city && row.country)
      return [
        {
          kind: 'city',
          value: row.city,
          label: `${row.city}, ${row.country}`,
          country: row.country,
        } as SearchDestination,
      ];
    if (row.kind === 'country' && row.country)
      return [{ kind: 'country', value: row.country, label: row.country } as SearchDestination];
    return [];
  });
};
