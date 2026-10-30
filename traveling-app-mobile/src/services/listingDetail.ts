import type { Listing, Review } from '../types';
import { apiClient } from './apiClient';

export const fetchListingDetail = async (
  listingId: string,
  signal?: AbortSignal
): Promise<Listing> => {
  const response = await apiClient.get(`/listings/${encodeURIComponent(listingId)}`, { signal });
  if (!response.data.success || response.data.data?.id !== listingId)
    throw new Error('Could not load this stay. Please try again.');
  return response.data.data;
};
export const fetchReviewPage = async (
  listingId: string,
  page: number,
  limit: number,
  signal?: AbortSignal
) => {
  const response = await apiClient.get(`/listings/${encodeURIComponent(listingId)}/reviews`, {
    params: { page, limit },
    signal,
  });
  const body = response.data;
  if (!body.success || !Array.isArray(body.data))
    throw new Error('Could not load reviews. Please try again.');
  return {
    reviews: body.data as Review[],
    total: Number(body.pagination?.total ?? body.data.length),
    totalPages: Number(body.pagination?.totalPages ?? 1),
  };
};
export const fetchAllListingReviews = async (
  listingId: string,
  signal?: AbortSignal
): Promise<Review[]> => {
  const reviews = new Map<string, Review>();
  let page = 1,
    pages = 1,
    total = 0;
  do {
    const result = await fetchReviewPage(listingId, page, 50, signal);
    if (
      !Number.isSafeInteger(result.totalPages) ||
      result.totalPages < 0 ||
      result.totalPages > 100000 ||
      (page < result.totalPages && !result.reviews.length)
    )
      throw new Error('Review history is incomplete. Please refresh.');
    pages = result.totalPages;
    total = result.total;
    for (const review of result.reviews) reviews.set(review.id, review);
    page++;
  } while (page <= pages);
  if (reviews.size !== total)
    throw new Error('Reviews changed while loading. Please refresh for the latest list.');
  return [...reviews.values()];
};
