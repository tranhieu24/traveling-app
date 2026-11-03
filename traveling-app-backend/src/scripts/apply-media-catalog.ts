import fs from 'fs/promises';
import path from 'path';
import { createHash,randomUUID } from 'crypto';
import { pool } from '../config/database';
import { ENV } from '../config/env';
import { mediaCatalogSchema,canReplaceMedia,sameMedia } from '../domain/mediaCatalog';

// No implicit live writes. Explicit target matches the configured hostname.
const signature=(photos:any[])=>createHash('sha256').update(JSON.stringify(photos.map(p=>({id:p.id,url:p.photo_url,caption:p.caption,order:p.display_order,cover:p.is_cover,context:p.media_context})))).digest('hex');
async function main(){
  const args=process.argv.slice(2),option=(name:string)=>args.find(a=>a.startsWith(name+'='))?.slice(name.length+1);
  const target=option('--target');
  if(!target)throw new Error('Specify --target=local or the configured database hostname. Default mode is read-only dry-run.');
  const url=new URL(ENV.DATABASE_URL);
  const local=['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname);
  if(target!==(local?'local':url.hostname))throw new Error('Target does not match database hostname; no data changed.');
  const apply=args.includes('--apply'),restore=option('--restore');
  const snapshotDir=path.resolve('dist/media-backups');await fs.mkdir(snapshotDir,{recursive:true});
  const client=await pool.connect();
  try{
    await client.query(apply?'BEGIN':'BEGIN READ ONLY');
    if(restore){
      const filename=path.resolve(restore);
      if(!filename.startsWith(snapshotDir+path.sep))throw new Error('Restore must use a local snapshot from dist/media-backups.');
      const backup=JSON.parse(await fs.readFile(filename,'utf8'));
      for(const entry of backup.entries){
        if(apply)await client.query('SELECT id FROM listings WHERE id=$1 FOR UPDATE',[entry.id]);
        const current=(await client.query('SELECT * FROM listing_photos WHERE listing_id=$1 ORDER BY is_cover DESC,display_order,id',[entry.id])).rows;
        const expected=[...entry.appliedUrls].sort();
        if(JSON.stringify(current.map(p=>p.photo_url).sort())!==JSON.stringify(expected) || signature(current)!==entry.appliedSignature)throw new Error('Images were changed after apply. Restore refused: '+entry.id);
        console.log(JSON.stringify({id:entry.id,action:'restore',count:entry.photos.length,dryRun:!apply}));
        if(apply){await client.query('DELETE FROM listing_photos WHERE listing_id=$1',[entry.id]);for(const photo of entry.photos)await client.query('INSERT INTO listing_photos(id,listing_id,photo_url,caption,display_order,is_cover,media_context) VALUES($1,$2,$3,$4,$5,$6,$7)',[photo.id,entry.id,photo.photo_url,photo.caption,photo.display_order,photo.is_cover,photo.media_context]);}
      }
    }else{
      const catalog=mediaCatalogSchema.parse(JSON.parse(await fs.readFile(path.resolve(option('--catalog')||'../docs/media-catalog.json'),'utf8')));
      if(apply&&catalog.photos.some(p=>p.contextLevel==='illustrative')&&!args.includes('--allow-illustrative'))throw new Error('This catalog contains labeled demo illustrations; --allow-illustrative required to apply.');
      const entries=[];
      for(const id of [...new Set(catalog.photos.map(p=>p.targetId))].sort()){
        const photos=catalog.photos.filter(p=>p.targetId===id);
        const listing=(await client.query('SELECT id,title,city,country,property_type FROM listings WHERE id=$1'+(apply?' FOR UPDATE':''),[id])).rows[0];
        if(!listing){console.log(JSON.stringify({id,action:'missing',dryRun:!apply}));continue;}
        if(photos.some(p=>p.targetTitle!==listing.title||p.city!==listing.city||p.country!==listing.country||p.propertyType!==listing.property_type))throw new Error('Listing context differs from catalog: '+id);
        const current=(await client.query('SELECT * FROM listing_photos WHERE listing_id=$1 ORDER BY is_cover DESC,display_order,id',[id])).rows;
        if(!canReplaceMedia(current,photos))throw new Error('Custom images found; review separately instead of overwriting: '+id);
        if(sameMedia(current,photos)){console.log(JSON.stringify({id,action:'unchanged',dryRun:!apply}));continue;}
        console.log(JSON.stringify({id,title:listing.title,before:current.map(p=>p.photo_url),after:photos.map(p=>p.imageUrl),context:photos[0].contextLevel,dryRun:!apply}));
        const entry={id,photos:current,appliedUrls:photos.map(p=>p.imageUrl),appliedSignature:''};entries.push(entry);
        if(apply){await client.query('DELETE FROM listing_photos WHERE listing_id=$1',[id]);for(const photo of photos)await client.query('INSERT INTO listing_photos(listing_id,photo_url,caption,display_order,is_cover,media_context) VALUES($1,$2,$3,$4,$5,$6)',[id,photo.imageUrl,photo.caption,photo.displayOrder,photo.isCover,JSON.stringify(photo)]);entry.appliedSignature=signature((await client.query('SELECT * FROM listing_photos WHERE listing_id=$1 ORDER BY is_cover DESC,display_order,id',[id])).rows);}
      }
      if(apply){const filename=path.join(snapshotDir,randomUUID()+'.json');await fs.writeFile(filename,JSON.stringify({version:1,createdAt:new Date().toISOString(),entries},null,2),{flag:'wx'});console.log('Snapshot prepared: '+filename);}
    }
    await client.query(apply?'COMMIT':'ROLLBACK');console.log(apply?'Committed.':'Dry-run completed; no rows changed.');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Media operation failed');process.exitCode=1;}).finally(()=>pool.end());
