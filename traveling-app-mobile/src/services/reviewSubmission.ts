import axios from 'axios';
import { apiClient } from './apiClient';
import { ReviewDraft, validateReviewDraft } from '../utils/reviewSubmission';

export interface OwnReview {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
}
export interface ReviewEligibility {
  listingId: string;
  listingTitle: string;
  canReview: boolean;
  reason: 'eligible' | 'completed_stay_required' | 'already_reviewed';
  existingReview: OwnReview | null;
}
export const fetchReviewEligibility = async (
  listingId: string,
  userId: string,
  signal?: AbortSignal
): Promise<ReviewEligibility> => {
  const response = await apiClient.get(
    `/listings/${encodeURIComponent(listingId)}/review-eligibility`,
    { signal }
  );
  const data = response.data.data;
  if (
    !response.data.success ||
    data?.listingId !== listingId ||
    typeof data.listingTitle !== 'string' ||
    typeof data.canReview !== 'boolean' ||
    !['eligible', 'completed_stay_required', 'already_reviewed'].includes(data.reason) ||
    (data.existingReview &&
      (data.existingReview.user_id !== userId || data.existingReview.listing_id !== listingId)) ||
    (data.canReview && data.existingReview)
  )
    throw new Error('Không thể xác minh quyền đánh giá. Vui lòng thử lại.');
  return data;
};
export class ReviewAlreadySubmittedError extends Error {
  constructor(public review: OwnReview | null) {
    super('Bạn đã đánh giá chỗ ở này.');
  }
}
export class ReviewUnconfirmedError extends Error {
  constructor() {
    super('Chưa thể xác nhận đánh giá đã gửi. Hãy kiểm tra trạng thái trước khi gửi lại.');
  }
}
export const matchesSubmittedReview = (review: OwnReview, draft: ReviewDraft): boolean =>
  review.rating === draft.rating && review.comment === draft.comment.trim();

export const submitPropertyReview = async (
  listingId: string,
  userId: string,
  draft: ReviewDraft
): Promise<OwnReview> => {
  const value = validateReviewDraft(draft);
  let duplicate = false;
  try {
    const response = await apiClient.post(
      `/listings/${encodeURIComponent(listingId)}/reviews`,
      value
    );
    const review = response.data.data as OwnReview;
    if (
      response.data.success &&
      review?.id &&
      review.listing_id === listingId &&
      review.user_id === userId &&
      matchesSubmittedReview(review, value) &&
      Number.isFinite(Date.parse(review.created_at))
    )
      return review;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status && status >= 400 && status < 500 && status !== 409) throw error;
    duplicate = status === 409;
  }
  // Check the recorded review after an ambiguous response. Never repeat the POST.
  try {
    const eligibility = await fetchReviewEligibility(listingId, userId);
    if (eligibility.existingReview) {
      if (!duplicate && matchesSubmittedReview(eligibility.existingReview, value))
        return eligibility.existingReview;
      throw new ReviewAlreadySubmittedError(eligibility.existingReview);
    }
  } catch (error) {
    if (error instanceof ReviewAlreadySubmittedError) throw error;
  }
  if (duplicate) throw new ReviewAlreadySubmittedError(null);
  throw new ReviewUnconfirmedError();
};
export const reviewErrorMessage = (error: unknown): string =>
  axios.isAxiosError(error)
    ? error.response?.data?.error?.message ||
      'Không thể kết nối dịch vụ đánh giá. Vui lòng thử lại.'
    : error instanceof Error
      ? error.message
      : 'Không thể gửi đánh giá. Vui lòng thử lại.';
