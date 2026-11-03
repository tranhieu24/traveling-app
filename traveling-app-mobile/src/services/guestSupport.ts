import * as Crypto from 'expo-crypto';
import { apiClient } from './apiClient';
import { storage } from '../utils/storage';
export type SupportStatus='open'|'waiting_guest'|'resolved';
export interface SupportTicket {id:string;booking_id:string;subject:string;status:SupportStatus;booking_code?:string;listing_title?:string;updated_at:string}
export interface SupportMessage {id:string;author_role:'guest'|'admin';body:string;created_at:string}
export interface Page {page:number;limit:number;total:number;totalPages:number}
export interface SupportDetail {ticket:SupportTicket;messages:SupportMessage[];pagination:Page}
export interface ArrivalGuide {instructions:string;contact:string;revision:number;updated_at:string}
export interface TripDetail {bookingId:string;status:string;timezone:string;guideStatus:string;arrivalGuide:ArrivalGuide|null;balanceDue:string|number;balanceDeadlineDescription:string;policy:{cancellation:string;payment:string}|null;events:{kind:string;at:string;amount?:string|number;status?:string}[]}
export const supportLabels:Record<SupportStatus,string>={open:'Chờ hỗ trợ',waiting_guest:'Chờ khách phản hồi',resolved:'Đã xử lý'};
export async function getTrip(bookingId:string,signal?:AbortSignal):Promise<TripDetail> {
  const {data}=await apiClient.get(`/bookings/${encodeURIComponent(bookingId)}/trip`,{signal});
  if(!data.success||data.data?.bookingId!==bookingId)throw new Error('Chưa tải được chuyến đi.');return data.data;
}
export async function sendSupport(userId:string,path:string,body:Record<string,unknown>):Promise<SupportTicket|SupportMessage> {
  // Preserve retry identity without storing message text in local storage.
  const digest=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,JSON.stringify([userId,path,body]));
  const key='support_request_'+digest;
  let requestId=await storage.getItem(key);
  if(!requestId){requestId=Crypto.randomUUID();await storage.setItem(key,requestId);}
  const {data}=await apiClient.post(path,{...body,requestId});
  if(!data.success||!data.data?.id)throw new Error('Chưa xác nhận gửi. Thử lại sẽ dùng cùng mã yêu cầu.');
  await storage.removeItem(key);return data.data;
}
