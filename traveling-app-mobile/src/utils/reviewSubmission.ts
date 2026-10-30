export interface ReviewDraft {
  rating: number;
  comment: string;
}
export type ReviewFieldErrors = Partial<Record<'rating' | 'comment', string>>;
export const reviewFieldErrors = ({ rating, comment }: ReviewDraft): ReviewFieldErrors => {
  const errors: ReviewFieldErrors = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    errors.rating = 'Choose a rating from 1 to 5 stars.';
  if (comment.trim().length < 5 || comment.trim().length > 1000)
    errors.comment = 'Write between 5 and 1000 characters about your stay.';
  return errors;
};
export const validateReviewDraft = (draft: ReviewDraft): ReviewDraft => {
  const errors = reviewFieldErrors(draft);
  if (Object.keys(errors).length) throw new Error(errors.rating || errors.comment);
  return { rating: draft.rating, comment: draft.comment.trim() };
};
