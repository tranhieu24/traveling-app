import { apiClient } from './apiClient';
import type { Listing } from '../types';
export interface AiFilters {city?:string;country?:string;checkIn?:string;checkOut?:string;guests?:number;maxPrice?:number;amenityIds:string[];propertyType?:string}
export interface AiSearchResult {
  mode:'ai'|'fallback';reason?:string;message:string;ready:boolean;questions:string[];notes:string[];
  filters:AiFilters|null;items:Listing[];total:number;fetchedAt:string;
}
export interface AiHelpResult {mode:'ai'|'fallback'|'data';reason?:string;answer:string;sourceRefs:{type:'article'|'booking';id:string;title:string}[];fetchedAt:string}
export async function aiSearch(message:string,signal?:AbortSignal):Promise<AiSearchResult> {
  const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Ho_Chi_Minh';
  const response=await apiClient.post('/ai/search',{message,timeZone},{signal,timeout:35000});
  if(!response.data.success)throw new Error('Không nhận được kết quả tìm kiếm AI.');
  return response.data.data;
}
export async function aiHelp(message:string,bookingId?:string,signal?:AbortSignal):Promise<AiHelpResult> {
  const response=await apiClient.post('/ai/help',{message,...(bookingId?{bookingId}:{})},{signal,timeout:35000});
  if(!response.data.success)throw new Error('Không nhận được câu trả lời trợ giúp.');
  return response.data.data;
}
