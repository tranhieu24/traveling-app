import { pool } from '../config/database';
import { CategoryEntity } from '../types';

export interface CategoryWithIcon extends CategoryEntity {
  icon: string;
}

export class CategoryRepository {
  async getAll(): Promise<CategoryWithIcon[]> {
    const query = `
      SELECT 
        id, 
        name, 
        slug, 
        icon_name, 
        icon_name AS icon, 
        created_at 
      FROM categories WHERE is_active
      ORDER BY name ASC
    `;
    const result = await pool.query<CategoryWithIcon>(query);
    return result.rows;
  }

  async getById(id: string): Promise<CategoryWithIcon | null> {
    const query = `
      SELECT 
        id, 
        name, 
        slug, 
        icon_name, 
        icon_name AS icon, 
        created_at 
      FROM categories 
      WHERE id = $1
    `;
    const result = await pool.query<CategoryWithIcon>(query, [id]);
    return result.rows[0] || null;
  }

  async getBySlug(slug: string): Promise<CategoryWithIcon | null> {
    const query = `
      SELECT 
        id, 
        name, 
        slug, 
        icon_name, 
        icon_name AS icon, 
        created_at 
      FROM categories 
      WHERE slug = $1
    `;
    const result = await pool.query<CategoryWithIcon>(query, [slug]);
    return result.rows[0] || null;
  }
}

export const categoryRepository = new CategoryRepository();
