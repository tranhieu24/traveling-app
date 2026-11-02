import type { Amenity, Listing, Review } from '../types';

export const listingPhotos = (listing: Listing): string[] => [
  ...new Set(
    [
      ...(listing.photos || [])
        .slice()
        .sort(
          (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.display_order - b.display_order
        )
        .map((photo) => photo.photo_url),
      listing.cover_photo,
    ].filter((url): url is string => typeof url === 'string' && !!url.trim())
  ),
];

export const groupAmenities = (amenities: Amenity[]) => {
  const groups = new Map<string, Amenity[]>();
  for (const amenity of amenities) {
    const raw = amenity.category?.trim() || 'Facilities';
    const label = /clean|laundry/i.test(raw)
      ? 'Cleaning & laundry'
      : /bath/i.test(raw)
        ? 'Bathroom'
        : /facilit/i.test(raw)
          ? 'Facilities'
          : raw;
    groups.set(label, [...(groups.get(label) || []), amenity]);
  }
  const order = ['Facilities', 'Cleaning & laundry', 'Bathroom'];
  return [...groups].sort(
    ([a], [b]) =>
      (order.includes(a) ? order.indexOf(a) : 99) - (order.includes(b) ? order.indexOf(b) : 99)
  );
};
export const previewAmenities = (amenities: Amenity[]): Amenity[] => {
  const facilities =
    groupAmenities(amenities).find(([label]) => label === 'Facilities')?.[1] || amenities;
  const rank = (item: Amenity) =>
    /wifi|internet/i.test(item.name)
      ? 0
      : /kitchen/i.test(item.name)
        ? 1
        : /pool/i.test(item.name)
          ? 2
          : /garden|outdoor/i.test(item.name)
            ? 3
            : 4;
  return [...facilities].sort((a, b) => rank(a) - rank(b)).slice(0, 4);
};
export const listingTime = (time?: string | null): string =>
  typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)
    ? time.slice(0, 5)
    : 'To be confirmed';
export const listingAddress = (listing: Listing): string =>
  [listing.address, listing.city, listing.country]
    .filter((part) => typeof part === 'string' && !!part.trim())
    .join(', ');
// Google Maps URLs: https://developers.google.com/maps/documentation/urls/get-started
export const listingMapUrl = (listing: Listing): string | null => {
  const coordinate = (value: number | string | null | undefined) =>
    value == null || (typeof value === 'string' && !value.trim()) ? NaN : Number(value);
  const latitude = coordinate(listing.latitude),
    longitude = coordinate(listing.longitude);
  const coordinates =
    Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180;
  const query = coordinates ? `${latitude},${longitude}` : listingAddress(listing);
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
};
export const reviewStats = (reviews: Review[]) => {
  const counts = [0, 0, 0, 0, 0];
  let sum = 0,
    total = 0;
  for (const review of reviews) {
    const rating = Number(review.rating);
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
      counts[rating - 1]++;
      sum += rating;
      total++;
    }
  }
  return { counts, total, average: total ? sum / total : 0 };
};
export const reviewDate = (value: string): string => {
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return '--';
  const days = Math.floor((Date.now() - date) / 86400000);
  return days === 0
    ? 'Today'
    : days > 0 && days < 30
      ? `${days} ${days === 1 ? 'day' : 'days'} ago`
      : new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
