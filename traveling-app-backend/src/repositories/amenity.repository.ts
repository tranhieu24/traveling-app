import { pool } from '../config/database';

export class AmenityRepository {
  async getAll() {
    const query = `
      SELECT id, name, icon, category, created_at 
      FROM amenities 
      ORDER BY category ASC, name ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getByListingId(listingId: string) {
    const query = `
      SELECT a.id, a.name, a.icon, a.category
      FROM amenities a
      INNER JOIN listing_amenities la ON la.amenity_id = a.id
      WHERE la.listing_id = $1
      ORDER BY a.name ASC
    `;
    const result = await pool.query(query, [listingId]);
    return result.rows;
  }
}

export const amenityRepository = new AmenityRepository();
