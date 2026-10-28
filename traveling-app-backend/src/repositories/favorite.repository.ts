import { pool } from '../config/database';
import { transaction } from '../services/transaction';
import { AppError } from '../types';
export class FavoriteRepository {
  async getUserFavorites(userId:string,page=1,limit=12) {
    const condition="f.user_id=$1 AND l.is_active AND c.is_active";
    const total=(await pool.query('SELECT count(*)::int n FROM favorites f JOIN listings l ON l.id=f.listing_id JOIN categories c ON c.id=l.category_id WHERE '+condition,[userId])).rows[0].n;
    const rows=(await pool.query("SELECT l.*,c.name category_name,c.slug category_slug,lp.photo_url cover_photo,true is_favorite,f.created_at favorited_at FROM favorites f JOIN listings l ON l.id=f.listing_id JOIN categories c ON c.id=l.category_id LEFT JOIN LATERAL(SELECT photo_url FROM listing_photos WHERE listing_id=l.id ORDER BY is_cover DESC,display_order,id LIMIT 1) lp ON true WHERE "+condition+" ORDER BY f.created_at DESC,l.id LIMIT $2 OFFSET $3",[userId,limit,(page-1)*limit])).rows;
    return {items:rows,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}};
  }
  async toggleFavorite(userId:string,listingId:string):Promise<boolean> {
    return transaction(async c=>{
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[userId+':'+listingId]);
      const removed=await c.query('DELETE FROM favorites WHERE user_id=$1 AND listing_id=$2 RETURNING listing_id',[userId,listingId]);
      if(removed.rows.length) return false;
      const listing=(await c.query('SELECT l.id FROM listings l JOIN categories cat ON cat.id=l.category_id WHERE l.id=$1 AND l.is_active AND cat.is_active',[listingId])).rows[0];
      if(!listing) throw new AppError('Listing unavailable',404,'LISTING_NOT_FOUND');
      await c.query('INSERT INTO favorites(user_id,listing_id) VALUES($1,$2)',[userId,listingId]);
      return true;
    });
  }
}
export const favoriteRepository=new FavoriteRepository();
