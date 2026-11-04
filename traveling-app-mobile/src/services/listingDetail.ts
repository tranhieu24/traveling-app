import type { Listing, Review } from '../types';
import { apiClient } from './apiClient';

export const fetchListingDetail = async (
  listingId: string,
  signal?: AbortSignal
): Promise<Listing> => {
  const response = await apiClient.get(`/listings/${encodeURIComponent(listingId)}`, { signal });
  if (!response.data.success || response.data.data?.id !== listingId)
    throw new Error('Không thể tải chỗ ở này. Vui lòng thử lại.');
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
    throw new Error('Không thể tải đánh giá. Vui lòng thử lại.');
  return {
    reviews: body.data as Review[],
    total: Number(body.pagination?.total ?? body.data.length),
    totalPages: Number(body.pagination?.totalPages ?? 1),
  };
};
export interface ReviewSummary {total:number;average:number;counts:number[]}
export async function fetchReviewSummary(listingId:string,signal?:AbortSignal):Promise<ReviewSummary> {
  const {data}=await apiClient.get(`/listings/${encodeURIComponent(listingId)}/review-summary`,{signal});
  const value=data.data;
  if(!data.success || !Number.isSafeInteger(value?.total) || !Array.isArray(value.counts) || value.counts.length!==5) throw new Error('Không tải được thống kê đánh giá.');
  return value;
}
