export type HelpCategory = 'account' | 'bookings' | 'payments' | 'reviews';
export type HelpAction = 'search' | 'bookings' | 'favorites' | 'settings';

export const HELP_CATEGORIES: { id: HelpCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All topics' },
  { id: 'account', label: 'Account' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'payments', label: 'Payments' },
  { id: 'reviews', label: 'Reviews' },
];

export interface HelpArticle {
  id: string;
  category: HelpCategory;
  question: string;
  answer: string;
  keywords: string;
  action?: { type: HelpAction; label: string };
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'browse', category: 'bookings', question: 'Can I explore places without logging in?',
    answer: 'Yes. Guests can browse places, use search filters, open listing details, and read reviews. Log in when you want to save a favorite or make a booking.',
    keywords: 'guest customer accommodation room search explore',
    action: { type: 'search', label: 'Explore places' },
  },
  {
    id: 'find-place', category: 'bookings', question: 'How do I find a place for my trip?',
    answer: 'Use the search bar to choose a destination, travel dates, and number of guests from the available options. Choose a category or open Filters to narrow the results by price, rooms, and amenities. If nothing matches, reset the filters and try again.',
    keywords: 'search beach mountain camping filters dates guests empty results',
    action: { type: 'search', label: 'Search for a stay' },
  },
  {
    id: 'booking-status', category: 'bookings', question: 'Where can I check my booking status?',
    answer: 'Open Bookings while logged in, then select a reservation to see its booking code, dates, price, and current status. A pending reservation is not confirmed yet; use the status shown in the reservation details to check its progress.',
    keywords: 'reservation trip confirmation pending confirmed booking code',
    action: { type: 'bookings', label: 'View my bookings' },
  },
  {
    id: 'favorites', category: 'account', question: 'How do I save a place to Favorites?',
    answer: 'Log in, then tap the heart on a listing card or the listing detail page. Open Favorites to see saved places. Tap the heart again to remove a place from your list.',
    keywords: 'heart save wishlist favorites customer login',
    action: { type: 'favorites', label: 'Open Favorites' },
  },
  {
    id: 'password', category: 'account', question: 'How do I change my password?',
    answer: 'Open Settings & Notifications while logged in. Enter your current password, a different new password with at least 6 characters, and confirm it. Select Update password. If your current password is incorrect, the change will not be applied.',
    keywords: 'security password settings account login credentials',
    action: { type: 'settings', label: 'Open account settings' },
  },
  {
    id: 'notifications', category: 'account', question: 'How do I enable notifications?',
    answer: 'Open Settings & Notifications. On web, select Enable browser notifications and allow the browser request. Once enabled, you can send a test notification. If blocked, update your browser site permissions. Automatic booking alerts are not enabled yet.',
    keywords: 'notifications browser permission blocked alerts settings',
    action: { type: 'settings', label: 'Open notification settings' },
  },
  {
    id: 'payment-status', category: 'payments', question: 'How do I check whether payment is complete?',
    answer: 'Open your reservation in Bookings and check its payment and booking status. If a payment fails or the booking stays pending, read the error shown before retrying. Do not assume a booking is confirmed just because you pressed Confirm & Pay.',
    keywords: 'payment paid pending failed confirm pay transaction card',
    action: { type: 'bookings', label: 'Check my reservation' },
  },
  {
    id: 'cancellation', category: 'payments', question: 'Does cancelling a booking guarantee a refund?',
    answer: 'Cancellation and refund status are separate. Check your reservation details for the available options and current status. Refund eligibility depends on the reservation and applicable conditions; cancelling does not always mean a refund has already been processed.',
    keywords: 'cancel cancellation refund payment reservation policy',
    action: { type: 'bookings', label: 'View reservation details' },
  },
  {
    id: 'reviews', category: 'reviews', question: 'Why can I not submit a review?',
    answer: 'Log in with the account that booked the stay. Reviews require a completed stay at that property, and each account can leave only one review per property. Choose a rating and write at least 5 characters before submitting.',
    keywords: 'review rating stars completed stay feedback duplicate comment',
    action: { type: 'bookings', label: 'Check my stay status' },
  },
  {
    id: 'loading', category: 'bookings', question: 'What if the list of places does not load?',
    answer: 'Check your connection and select Try again on the search screen. If there are no matches, reset the search filters. Reload the app if needed. If the issue only happens while logged in, sign out and log in again to refresh your session.',
    keywords: 'error connection unable load stays retry empty list refresh session',
    action: { type: 'search', label: 'Return to Search' },
  },
];

export const findHelpArticles = (query: string, category: HelpCategory | 'all'): HelpArticle[] => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return HELP_ARTICLES.filter((article) => {
    if (category !== 'all' && article.category !== category) return false;
    const text = `${article.question} ${article.answer} ${article.keywords}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
};
