import { pool } from '../config/database';

export class DestinationRepository {
  async search(query: string, limit = 8) {
    const escaped = query.replace(/[\\%_]/g, (character) => '\\' + character);
    const pattern = `%${escaped}%`;
    const result = await pool.query(
      `
      SELECT * FROM (
        SELECT 'city' AS kind, MIN(l.city) AS city, MIN(l.country) AS country, MIN(l.region) AS region, COUNT(*)::int AS matches
        FROM listings l JOIN categories c ON c.id = l.category_id
        WHERE l.is_active AND c.is_active AND l.city ILIKE $1
        GROUP BY LOWER(l.city), LOWER(l.country)
        UNION ALL
        SELECT 'country' AS kind, NULL::text AS city, MIN(l.country) AS country, NULL::text AS region, COUNT(*)::int AS matches
        FROM listings l JOIN categories c ON c.id = l.category_id
        WHERE l.is_active AND c.is_active AND l.country ILIKE $1
        GROUP BY LOWER(l.country)
      ) locations
      ORDER BY CASE WHEN LOWER(COALESCE(city, country)) = LOWER($3) THEN 0 ELSE 1 END,
        matches DESC, country, city NULLS FIRST
      LIMIT $2
    `,
      [pattern, limit, query]
    );
    return result.rows;
  }
}
export const destinationRepository = new DestinationRepository();
