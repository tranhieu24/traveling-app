import { z } from 'zod';
import { isDeepStrictEqual } from 'util';
export const catalogPhotoSchema=z.object({
  targetType:z.literal('listing'),targetId:z.string().uuid(),targetTitle:z.string().min(1),city:z.string().min(1),country:z.string().min(1),propertyType:z.string().min(1),
  sourcePageUrl:z.string().url(),imageUrl:z.string().url().refine(value=>new URL(value).protocol==='https:'&&!/picsum\.photos/.test(value),'Use an explicit HTTPS image'),
  provider:z.string().min(1),creator:z.string().min(1),licenseName:z.string().min(1),licenseUrl:z.string().url(),attributionText:z.string().min(1),
  contextLevel:z.enum(['verified_property','illustrative']),contextEvidence:z.string().min(1),usageStatus:z.literal('approved'),approvedFor:z.string().min(1),
  role:z.string().min(1),caption:z.string().max(255),altText:z.string().min(1),displayOrder:z.number().int().nonnegative(),isCover:z.boolean(),width:z.number().int().positive(),height:z.number().int().positive(),checkedAt:z.string().datetime({offset:true}),
}).passthrough();
export const mediaCatalogSchema=z.object({version:z.literal(1),photos:z.array(catalogPhotoSchema).min(1)}).superRefine((value,context)=>{
  for(const id of new Set(value.photos.map(p=>p.targetId))){
    const photos=value.photos.filter(p=>p.targetId===id);
    if(photos.filter(p=>p.isCover).length!==1 || new Set(photos.map(p=>p.imageUrl)).size!==photos.length)context.addIssue({code:'custom',message:'Each listing needs exactly one cover and distinct images'});
  }
});
export function sameMedia(current:{photo_url:string;caption?:string;display_order?:number;is_cover?:boolean;media_context?:unknown}[],next:z.infer<typeof catalogPhotoSchema>[]) {
  return current.length===next.length&&current.every(p=>next.some(n=>n.imageUrl===p.photo_url&&n.caption===p.caption&&n.displayOrder===p.display_order&&n.isCover===p.is_cover&&isDeepStrictEqual(p.media_context,n)));
}
export function canReplaceMedia(current:{photo_url:string;caption?:string;display_order?:number;is_cover?:boolean;media_context?:unknown}[],next:z.infer<typeof catalogPhotoSchema>[]) {
  return !current.length || current.every(p=>/^https:\/\/picsum\.photos\/seed\//.test(p.photo_url)) || sameMedia(current,next);
}
