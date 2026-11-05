import { pool } from '../config/database';
import { listingRepository, ListingFilterParams } from './listing.repository';

export interface ChatListingSummary {
  id: string;
  title: string;
  city: string;
  country: string;
  category_name: string;
  category_slug: string;
  category_id: string;
}
export interface ChatListingDetail extends ChatListingSummary {
  description: string | null;
  price_per_night: string | number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
}

// Public, active listings only. Never select host contacts or booking records.
export async function getChatListingIndex(): Promise<ChatListingSummary[]> {
  const result = await pool.query(`
    SELECT l.id,l.title,l.city,l.country,l.category_id,c.name AS category_name,c.slug AS category_slug
    FROM listings l JOIN categories c ON c.id=l.category_id
    WHERE l.is_active AND c.is_active ORDER BY l.title,l.id LIMIT 1000`);
  return result.rows;
}

export async function getChatListing(id: string): Promise<ChatListingDetail | null> {
  const result = await pool.query(`
    SELECT l.id,l.title,l.city,l.country,l.category_id,c.name AS category_name,c.slug AS category_slug,
      left(l.description,600) AS description,l.price_per_night,l.max_guests,l.bedrooms,l.beds,l.bathrooms,
      ARRAY(SELECT a.name FROM listing_amenities la JOIN amenities a ON a.id=la.amenity_id
        WHERE la.listing_id=l.id ORDER BY a.name LIMIT 20) AS amenities
    FROM listings l JOIN categories c ON c.id=l.category_id
    WHERE l.id=$1 AND l.is_active AND c.is_active`, [id]);
  return result.rows[0] || null;
}

export async function findChatRecommendations(filters: Omit<ListingFilterParams, 'page' | 'limit' | 'sortBy' | 'userId'>) {
  return listingRepository.findListings({ ...filters, page: 1, limit: 3, sortBy: 'recommended' });
}
