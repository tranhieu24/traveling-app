import * as Linking from 'expo-linking';
import type { Listing } from '../types';

export const getListingShareContent = (listing: Pick<Listing, 'id' | 'title' | 'city' | 'country'>) => ({
  title: listing.title,
  message: `${listing.title}\n${listing.city}, ${listing.country}`,
  url: Linking.createURL(`stays/${encodeURIComponent(listing.id)}`),
});

export const copyWebText = async (text: string): Promise<void> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to a selected input on browsers that deny Clipboard API access.
    }
  }
  if (typeof document === 'undefined') throw new Error('Clipboard is not available.');

  const previousFocus = document.activeElement;
  const input = document.createElement('textarea');
  input.value = text;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  try {
    input.focus();
    input.select();
    input.setSelectionRange(0, text.length);
    if (!document.execCommand('copy')) throw new Error('Could not copy the link.');
  } finally {
    input.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }
};
