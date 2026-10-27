import { pool } from '../config/database';
import { AmenityEntity } from '../types';

export interface AmenityWithCompat extends AmenityEntity {
  icon: string;
  category: string;
}

export class AmenityRepository {
  async getAll(): Promise<AmenityWithCompat[]> {
    const query = `
      SELECT 
        id, 
        name, 
        icon_name, 
        icon_name AS icon, 
        group_name, 
        group_name AS category, 
        created_at 
      FROM amenities 
      ORDER BY group_name ASC, name ASC
    `;
    const result = await pool.query<AmenityWithCompat>(query);
    return result.rows;
  }

  async getByListingId(listingId: string): Promise<AmenityWithCompat[]> {
    const query = `
      SELECT 
        a.id, 
        a.name, 
        a.icon_name, 
        a.icon_name AS icon, 
        a.group_name, 
        a.group_name AS category,
        a.created_at
      FROM amenities a
      INNER JOIN listing_amenities la ON la.amenity_id = a.id
      WHERE la.listing_id = $1
      ORDER BY a.group_name ASC, a.name ASC
    `;
    const result = await pool.query<AmenityWithCompat>(query, [listingId]);
    return result.rows;
  }
}

export const amenityRepository = new AmenityRepository();
