export interface ReviewDraft {
  rating: number;
  comment: string;
}
export type ReviewFieldErrors = Partial<Record<'rating' | 'comment', string>>;
export const reviewFieldErrors = ({ rating, comment }: ReviewDraft): ReviewFieldErrors => {
  const errors: ReviewFieldErrors = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    errors.rating = 'Chọn điểm đánh giá từ 1 đến 5 sao.';
  if (comment.trim().length < 5 || comment.trim().length > 1000)
    errors.comment = 'Viết từ 5 đến 1000 ký tự về kỳ lưu trú.';
  return errors;
};
export const validateReviewDraft = (draft: ReviewDraft): ReviewDraft => {
  const errors = reviewFieldErrors(draft);
  if (Object.keys(errors).length) throw new Error(errors.rating || errors.comment);
  return { rating: draft.rating, comment: draft.comment.trim() };
};
