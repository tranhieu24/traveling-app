import { pool } from '../config/database';

export class CategoryRepository {
  async getAll() {
    const query = `
      SELECT id, name, slug, icon, description, created_at 
      FROM categories 
      ORDER BY name ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getById(id: string) {
    const query = `
      SELECT id, name, slug, icon, description 
      FROM categories 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

export const categoryRepository = new CategoryRepository();
