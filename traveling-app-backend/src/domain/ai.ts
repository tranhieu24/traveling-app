import { z } from 'zod';
import { isDate, validateStay } from './booking';

export const aiSearchRequest=z.object({
  message:z.string().trim().min(3).max(800),
  timeZone:z.string().max(80).default('Asia/Ho_Chi_Minh').refine(value=>{
    try {new Intl.DateTimeFormat('en',{timeZone:value}).format();return true;} catch {return false;}
  },'Invalid IANA timezone'),
}).strict();
export const aiHelpRequest=z.object({message:z.string().trim().min(3).max(800),bookingId:z.string().uuid().optional()}).strict();
export const searchIntentSchema=z.object({
  destination:z.string().max(100).nullable(),country:z.string().max(100).nullable(),
  dateKind:z.enum(['exact','this_weekend','missing','unclear']),
  checkIn:z.string().max(10).nullable(),checkOut:z.string().max(10).nullable(),
  guests:z.number().int().min(1).max(1000).nullable(),
  maxBudget:z.number().finite().positive().max(10000000).nullable(),
  currency:z.enum(['USD','VND','unknown']).nullable(),budgetUnit:z.enum(['night','trip','unknown']).nullable(),
  amenities:z.array(z.string().max(100)).max(12),propertyType:z.string().max(50).nullable(),
  unsupported:z.array(z.string().max(150)).max(8),
}).strict();
export const helpSelectionSchema=z.object({articleIds:z.array(z.string().max(60)).max(3)}).strict();
export type SearchIntent=z.infer<typeof searchIntentSchema>;
export type SearchCatalog={destinations:{city:string;country:string}[];amenities:{id:string;name:string}[];propertyTypes:string[]};
export const fold=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const redactAiInput=(text:string)=>text
  .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email removed]')
  .replace(/\b(?:Bearer\s+)?eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[token removed]')
  .replace(/\bsk-[A-Za-z0-9_-]+/g,'[key removed]')
  .replace(/(?:\+\d[\d .()-]{8,}\d|\b\d{9,15}\b)/g,'[number removed]');
const amenityAliases:Record<string,string[]>={parking:['cho do xe','bai do xe','free parking','parking'],wifi:['wifi','wi fi','internet'],pool:['ho boi','be boi','pool','swimming pool'],kitchen:['bep','kitchen'],ac:['dieu hoa','may lanh','air conditioning']};
const amenityKey=(name:string)=>Object.entries(amenityAliases).find(([,names])=>names.includes(fold(name)))?.[0]||fold(name);
export function localDay(now:Date,timeZone:string) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(type=>parts.find(p=>p.type===type)!.value).join('-');
}
const plusDays=(day:string,n:number)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export function normalizeIntent(raw:unknown,catalog:SearchCatalog,timeZone:string,now=new Date()) {
  const intent=searchIntentSchema.parse(raw), questions:string[]=[], notes:string[]=[];
  const filters:{city?:string;country?:string;cityExact?:boolean;checkIn?:string;checkOut?:string;guests?:number;maxPrice?:number;amenityIds:string[];propertyType?:string}={amenityIds:[]};
  if(intent.destination){
    const matches=catalog.destinations.filter(d=>fold(d.city)===fold(intent.destination!)&&(!intent.country||fold(d.country)===fold(intent.country)));
    if(matches.length===1) Object.assign(filters,{city:matches[0].city,country:matches[0].country,cityExact:true});
    else questions.push(matches.length?'Điểm đến trùng tên; bạn muốn ở quốc gia nào?':'Chưa có điểm đến này trong danh mục đang hoạt động. Hãy chọn điểm đến khác.');
  } else questions.push('Bạn muốn đến thành phố nào?');
  let checkIn=intent.checkIn,checkOut=intent.checkOut;
  if(intent.dateKind==='this_weekend') {
    const today=localDay(now,timeZone), weekday=new Date(today+'T00:00:00Z').getUTCDay();
    if(weekday===0) {checkIn=null;checkOut=null;questions.push('Hôm nay là Chủ nhật. Bạn muốn nhận và trả phòng ngày nào?');}
    else {checkIn=plusDays(today,(6-weekday+7)%7);checkOut=plusDays(checkIn,1);notes.push(`Cuối tuần được hiểu là ${checkIn} đến ${checkOut} (${timeZone}); hãy xác nhận ngày trước khi đặt.`);}
  }
  if(['exact','this_weekend'].includes(intent.dateKind)&&checkIn&&checkOut) {
    try {
      if(!isDate(checkIn)||!isDate(checkOut)||checkIn<localDay(now,timeZone))throw new Error();
      validateStay(checkIn,checkOut,intent.guests??1);
      Object.assign(filters,{checkIn,checkOut});
    } catch {questions.push('Ngày nhận/trả phòng không hợp lệ hoặc đã qua; hãy chọn lại ngày.');}
  } else questions.push('Bạn muốn nhận và trả phòng ngày nào?');
  if(intent.guests)filters.guests=intent.guests;else questions.push('Chuyến đi có bao nhiêu khách?');
  if(intent.maxBudget===null)questions.push('Ngân sách tối đa mỗi đêm của bạn là bao nhiêu USD?');
  else if(intent.currency!=='USD')questions.push(intent.currency==='VND'?'App hiện tính giá bằng USD. Hãy nhập ngân sách USD; hệ thống không tự quy đổi VND.':'Bạn dùng tiền tệ nào? App hiện hỗ trợ USD.');
  else if(intent.budgetUnit!=='night')questions.push(intent.budgetUnit==='trip'?'Bạn đang nêu ngân sách toàn chuyến. Hãy cho biết mức tối đa mỗi đêm (USD); phí và thuế được tính riêng khi báo giá.':'Ngân sách này là mỗi đêm hay cả chuyến?');
  else filters.maxPrice=intent.maxBudget;
  for(const name of intent.amenities){
    const matches=catalog.amenities.filter(a=>amenityKey(a.name)===amenityKey(name));
    if(matches.length===1)filters.amenityIds.push(matches[0].id);else questions.push(`Chưa xác định được tiện nghi “${name}”. Hãy chọn từ bộ lọc thủ công.`);
  }
  filters.amenityIds=[...new Set(filters.amenityIds)];
  if(intent.propertyType){
    const match=catalog.propertyTypes.find(p=>fold(p)===fold(intent.propertyType!));
    if(match)filters.propertyType=match;else questions.push(`Chưa có loại chỗ ở “${intent.propertyType}” trong danh mục.`);
  }
  if(intent.unsupported.length)questions.push('Có yêu cầu chưa hỗ trợ: '+intent.unsupported.join(', ')+'. Hãy kiểm tra với cơ sở trước khi đặt.');
  return {intent,filters,questions:[...new Set(questions)],notes,ready:questions.length===0};
}
