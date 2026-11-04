import { createHash } from 'crypto';
import { pool } from '../config/database';
import { transaction } from '../services/transaction';
import { AI_CONFIG } from '../config/ai';
import { AiUnavailable } from '../services/aiProvider';
import type { SearchCatalog } from '../domain/ai';

export async function getAiCatalog():Promise<SearchCatalog> {
  const [destinations,amenities,types]=await Promise.all([
    pool.query('SELECT DISTINCT l.city,l.country FROM listings l JOIN categories c ON c.id=l.category_id WHERE l.is_active AND c.is_active ORDER BY l.city,l.country LIMIT 1000'),
    pool.query('SELECT id,name FROM amenities ORDER BY name LIMIT 300'),
    pool.query('SELECT DISTINCT l.property_type FROM listings l JOIN categories c ON c.id=l.category_id WHERE l.is_active AND c.is_active LIMIT 100'),
  ]);
  return {destinations:destinations.rows,amenities:amenities.rows,propertyTypes:types.rows.map(r=>r.property_type)};
}
export async function reserveAiBudget(identity:string,reserve:number) {
  const key='subject:'+createHash('sha256').update(identity).digest('hex');
  return transaction(async client=>{
    const day=(await client.query("SELECT to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD') AS day")).rows[0].day;
    // Stable lock order serializes daily global and subject limits across all backend instances.
    for(const scope of ['global',key]) {
      await client.query('INSERT INTO ai_usage_daily(day,scope_key) VALUES($1,$2) ON CONFLICT DO NOTHING',[day,scope]);
      const result=await client.query(`UPDATE ai_usage_daily SET requests=requests+1,reserved_tokens=reserved_tokens+$3
        WHERE day=$1 AND scope_key=$2 AND reserved_tokens+$3<=$4 AND requests<$5 RETURNING requests`,
        [day,scope,reserve,scope==='global'?AI_CONFIG.dailyTokens:Number.MAX_SAFE_INTEGER,scope==='global'?2147483646:AI_CONFIG.dailyRequests]);
      if(!result.rowCount)throw new AiUnavailable('quota');
    }
    return {day,key};
  });
}
export async function recordAiUsage(ticket:{day:string;key:string},input:number,output:number,failed:boolean) {
  await pool.query(`UPDATE ai_usage_daily SET input_tokens=input_tokens+$3,output_tokens=output_tokens+$4,failures=failures+$5
    WHERE day=$1 AND scope_key=ANY($2::text[])`,[ticket.day,['global',ticket.key],Math.max(0,Math.floor(input)),Math.max(0,Math.floor(output)),failed?1:0]);
}
