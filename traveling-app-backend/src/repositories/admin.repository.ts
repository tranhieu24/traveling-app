import { PoolClient } from 'pg';
import { pool } from '../config/database';
import { supabaseAdmin } from '../config/supabase';
import { ENV } from '../config/env';
import { AppError } from '../types';
import { transaction } from '../services/transaction';
import { audit } from './booking.repository';

const maps = {
 listings: {hostId:'host_id',categoryId:'category_id',title:'title',description:'description',propertyType:'property_type',roomType:'room_type',address:'address',city:'city',country:'country',region:'region',latitude:'latitude',longitude:'longitude',pricePerNight:'price_per_night',cleaningFee:'cleaning_fee',serviceFee:'service_fee',maxGuests:'max_guests',bedrooms:'bedrooms',beds:'beds',bathrooms:'bathrooms',checkInTime:'check_in_time',checkOutTime:'check_out_time',isActive:'is_active'},
 categories: {name:'name',slug:'slug',iconName:'icon_name',description:'description',isActive:'is_active'},
 coupons: {code:'code',discountPercent:'discount_percent',maxDiscount:'max_discount',minSubtotal:'min_subtotal',startsAt:'starts_at',endsAt:'ends_at',maxUses:'max_uses',perUserLimit:'per_user_limit',listingId:'listing_id',categoryId:'category_id',isActive:'is_active'},
} as const;
type Resource=keyof typeof maps;
export class AdminRepository {
  async list(resource:Resource|'customers'|'bookings'|'refunds'|'audit-logs',q:any) {
    const specs={
      listings:{from:'listings x',search:"concat_ws(' ',x.title,x.city,x.country)",where:'true',status:'',active:true},
      categories:{from:'categories x',search:"concat_ws(' ',x.name,x.slug)",where:'true',status:'',active:true},
      coupons:{from:'coupons x',search:'x.code',where:'true',status:"CASE WHEN NOT x.is_active THEN 'inactive' WHEN now()<x.starts_at THEN 'upcoming' WHEN now()>=x.ends_at THEN 'expired' WHEN x.used_count>=x.max_uses THEN 'exhausted' ELSE 'active' END",active:true},
      customers:{from:'users x',search:"concat_ws(' ',x.full_name,x.email,x.phone_number)",where:"x.role<>'admin'",status:'x.account_status',active:false},
      bookings:{from:'bookings x JOIN users u ON u.id=x.guest_id JOIN listings l ON l.id=x.listing_id',search:"concat_ws(' ',x.booking_code,u.phone_number,u.email,l.title)",where:'true',status:'x.booking_status',active:false},
      refunds:{from:'refunds x JOIN bookings b ON b.id=x.booking_id JOIN listings l ON l.id=b.listing_id JOIN users u ON u.id=b.guest_id JOIN payments p ON p.id=x.payment_id',search:"concat_ws(' ',x.reason,x.id,b.booking_code,u.email,l.title)",where:'true',status:'x.status',active:false},
      'audit-logs':{from:'admin_audit_logs x',search:"concat_ws(' ',x.action,x.entity_type)",where:'true',status:'',active:false},
    };
    const spec=specs[resource],params:any[]=[];
    let where=spec.where;
    if(q.q) {params.push('%'+q.q+'%');where+=' AND '+spec.search+' ILIKE $'+params.length;}
    if(q.status && spec.status) {params.push(q.status);where+=' AND '+spec.status+'=$'+params.length;}
    if(q.isActive!==undefined && spec.active) {params.push(q.isActive==='true');where+=' AND x.is_active=$'+params.length;}
    if(resource==='listings' && q.categoryId) {params.push(q.categoryId);where+=' AND x.category_id=$'+params.length;}
    if(resource==='listings' && q.city) {params.push('%'+q.city+'%');where+=' AND x.city ILIKE $'+params.length;}
    const projection=resource==='bookings'?'x.*,l.title AS listing_title,u.full_name AS guest_name,u.email AS guest_email,u.phone_number AS guest_phone':
      resource==='refunds'?'x.*,b.booking_code,b.check_in_date,b.check_out_date,b.cancellation_reason,l.title AS listing_title,u.full_name AS guest_name,u.email AS guest_email,p.provider,p.is_simulated':'x.*';
    const total=(await pool.query('SELECT count(*)::int n FROM '+spec.from+' WHERE '+where,params)).rows[0].n;
    params.push(q.limit,(q.page-1)*q.limit);
    const rows=(await pool.query('SELECT '+projection+' FROM '+spec.from+' WHERE '+where+' ORDER BY x.created_at DESC,x.id LIMIT $'+(params.length-1)+' OFFSET $'+params.length,params)).rows;
    return {items:rows,pagination:{page:q.page,limit:q.limit,total,totalPages:Math.ceil(total/q.limit)}};
  }
  async get(resource:Resource,id:string) {
    const row=(await pool.query('SELECT * FROM '+resource+' WHERE id=$1',[id])).rows[0];
    if(!row) throw new AppError('Resource not found',404,'NOT_FOUND');
    if(resource==='listings') {
      row.amenityIds=(await pool.query('SELECT amenity_id FROM listing_amenities WHERE listing_id=$1',[id])).rows.map(r=>r.amenity_id);
      row.photos=(await pool.query('SELECT * FROM listing_photos WHERE listing_id=$1 ORDER BY display_order,id',[id])).rows;
    }
    return row;
  }
  async save(resource:Resource,id:string|undefined,data:any,actor:string) {
    return transaction(async c=>{
      const before=id?(await c.query('SELECT * FROM '+resource+' WHERE id=$1 FOR UPDATE',[id])).rows[0]:null;
      if(id && !before) throw new AppError('Resource not found',404,'NOT_FOUND');
      if(resource==='coupons') {
        const merged={...before,...Object.fromEntries(Object.entries(data).map(([k,v])=>[(maps.coupons as any)[k],v]))};
        if(Date.parse(merged.ends_at)<=Date.parse(merged.starts_at) || merged.max_uses<(before?.used_count||0)) throw new AppError('Invalid coupon period or quota below committed usage',400,'INVALID_COUPON');
      }
      if(resource==='listings' && data.hostId) {
        const host=(await c.query("SELECT id FROM users WHERE id=$1 AND role IN ('host','admin') AND account_status='active'",[data.hostId])).rows[0];
        if(!host) throw new AppError('Active host/admin required',400,'INVALID_HOST');
      }
      const pairs=Object.entries(data).filter(([k])=>k in maps[resource]).map(([k,v])=>[(maps[resource] as any)[k],v]);
      let result=before;
      if(pairs.length) {
        const cols=pairs.map(p=>p[0]),values=pairs.map(p=>p[1]);
        if(id) {
          values.push(id);
          result=(await c.query('UPDATE '+resource+' SET '+cols.map((n,i)=>n+'=$'+(i+1)).join(',')+' WHERE id=$'+values.length+' RETURNING *',values)).rows[0];
        } else result=(await c.query('INSERT INTO '+resource+'('+cols.join(',')+') VALUES('+values.map((_,i)=>'$'+(i+1)).join(',')+') RETURNING *',values)).rows[0];
      }
      if(!result) throw new AppError('No writable fields',400,'VALIDATION_ERROR');
      if(resource==='listings') await this.listingRelations(c,result.id,data);
      await audit(c,actor,resource+(id?'.update':'.create'),resource,result.id,before,{...result,amenityIds:data.amenityIds,photos:data.photos});
      return result;
    });
  }
  async listingRelations(c:PoolClient,id:string,data:any) {
    if(data.amenityIds!==undefined) {
      await c.query('DELETE FROM listing_amenities WHERE listing_id=$1',[id]);
      for(const amenity of new Set<string>(data.amenityIds)) await c.query('INSERT INTO listing_amenities(listing_id,amenity_id) VALUES($1,$2)',[id,amenity]);
    }
    if(data.photos!==undefined) {
      await c.query('DELETE FROM listing_photos WHERE listing_id=$1',[id]);
      for(const [i,p] of data.photos.entries()) await c.query('INSERT INTO listing_photos(listing_id,photo_url,caption,display_order,is_cover) VALUES($1,$2,$3,$4,$5)',[id,p.photoUrl,p.caption||null,i,p.isCover]);
    }
  }
  async deactivate(resource:Resource,id:string,actor:string) {
    if(resource==='categories') {
      return transaction(async c=>{
        const before=(await c.query('SELECT * FROM categories WHERE id=$1 FOR UPDATE',[id])).rows[0];
        if(!before) throw new AppError('Category not found',404,'NOT_FOUND');
        if((await c.query('SELECT 1 FROM listings WHERE category_id=$1 LIMIT 1',[id])).rows.length) throw new AppError('Category still linked to accommodations',409,'CATEGORY_IN_USE');
        const result=(await c.query('UPDATE categories SET is_active=false WHERE id=$1 RETURNING *',[id])).rows[0];
        await audit(c,actor,'categories.deactivate','categories',id,before,result);
        return result;
      });
    }
    return this.save(resource,id,{isActive:false},actor);
  }
  async updateCustomer(id:string,data:any,actor:string) {
    await transaction(async c=>{
      const before=(await c.query("SELECT * FROM users WHERE id=$1 AND role<>'admin' FOR UPDATE",[id])).rows[0];
      if(!before) throw new AppError('Customer not found',404,'NOT_FOUND');
      const result=(await c.query("UPDATE users SET full_name=coalesce($2,full_name),phone_number=coalesce($3,phone_number),avatar_url=coalesce($4,avatar_url),desired_auth_email=coalesce($5,desired_auth_email),auth_sync_pending=auth_sync_pending OR ($5::text IS NOT NULL) WHERE id=$1 RETURNING *",[id,data.fullName??null,data.phoneNumber??null,data.avatarUrl??null,data.email??null])).rows[0];
      await audit(c,actor,'customer.update','user',id,before,result);
    });
    return data.email ? this.syncCustomer(id,actor) : (await pool.query('SELECT * FROM users WHERE id=$1',[id])).rows[0];
  }
  async setAccountStatus(id:string,status:string,reason:string,actor:string) {
    await transaction(async c=>{
      const before=(await c.query("SELECT * FROM users WHERE id=$1 AND role<>'admin' FOR UPDATE",[id])).rows[0];
      if(!before) throw new AppError('Customer not found',404,'NOT_FOUND');
      const result=(await c.query("UPDATE users SET account_status=$2,blocked_reason=$3,auth_sync_pending=true,tokens_valid_after=now() WHERE id=$1 RETURNING *",[id,status,reason])).rows[0];
      await audit(c,actor,'customer.'+status,'user',id,before,result);
    });
    return this.syncCustomer(id,actor);
  }
  async syncCustomer(id:string,actor:string) {
    // Serialize with customer edits. A failure leaves a persistent retry marker; local blocking already applies.
    return transaction(async c=>{
      const u=(await c.query("SELECT * FROM users WHERE id=$1 AND role<>'admin' FOR UPDATE",[id])).rows[0];
      if(!u) throw new AppError('Customer not found',404,'NOT_FOUND');
      if(!u.auth_sync_pending) return u;
      if(!ENV.SUPABASE_URL || !ENV.SUPABASE_SERVICE_ROLE_KEY) {
        await c.query("UPDATE users SET auth_sync_error='Supabase admin credentials not configured' WHERE id=$1",[id]);
        return {...u,auth_sync_pending:true,auth_sync_error:'Supabase admin credentials not configured'};
      }
      const {error}=await supabaseAdmin.auth.admin.updateUserById(id,{ban_duration:u.account_status==='blocked'?'876000h':'none',...(u.desired_auth_email?{email:u.desired_auth_email,email_confirm:true}:{})});
      if(error) {
        await c.query("UPDATE users SET auth_sync_error='Supabase admin update failed; retry required' WHERE id=$1",[id]);
        return {...u,auth_sync_pending:true,auth_sync_error:'Supabase admin update failed; retry required'};
      }
      // Revoke refresh sessions for both block and reactivation; issued JWTs are rejected via tokens_valid_after.
      await c.query('SELECT public.revoke_customer_sessions($1)',[id]);
      const after=(await c.query('UPDATE users SET email=coalesce(desired_auth_email,email),desired_auth_email=NULL,auth_sync_pending=false,auth_sync_error=NULL WHERE id=$1 RETURNING *',[id])).rows[0];
      await audit(c,actor,'customer.auth_sync','user',id,u,after);
      return after;
    });
  }
}
export const adminRepository=new AdminRepository();
