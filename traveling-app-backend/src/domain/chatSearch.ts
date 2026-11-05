import { ChatSearchContext, fold, localDay } from './ai';
import { isDate, validateStay } from './booking';
import type { ChatListingSummary } from '../repositories/aiChat.repository';

const includes = (text: string, value: string) => !!value && (` ${text} `).includes(` ${value} `);
const categoryAliases: Record<string, string[]> = {
  camping: ['camping', 'caming', 'cam ping', 'cam trai', 'glamping'],
  beach: ['beach', 'bai bien'], mountain: ['mountain', 'mien nui'],
};
export const isRecommendation = (text: string) =>
  /\b(goi y|de xuat|recommend|suggest|tim phong|tim cho|dat phong|dat cho|muon dat|can dat|muon o|looking for|want to book|book a|reserve a)\b/.test(text);

export function readChatSearch(message: string, previous: ChatSearchContext | undefined, index: ChatListingSummary[], timeZone = 'Asia/Ho_Chi_Minh') {
  const text = fold(message);
  const context: ChatSearchContext = { ...previous };
  if (/\b(khac|other|different)\b/.test(text)) delete context.listingId;
  for (const [slug, aliases] of Object.entries(categoryAliases)) {
    if (aliases.some(alias => includes(text, alias))) context.categorySlug = slug;
  }
  for (const item of index) {
    if (includes(text, fold(item.category_name)) || includes(text, fold(item.category_slug))) context.categorySlug = item.category_slug;
  }
  const named = index.filter(item => includes(text, fold(item.title)));
  if (named.length === 1) context.listingId = named[0].id;
  else if (context.categorySlug !== previous?.categorySlug) delete context.listingId;
  const places = index.filter(item => includes(text, fold(item.city)));
  const cities = [...new Set(places.map(item => fold(item.city)))];
  if (cities.length === 1) {
    if (!named.length && fold(places[0].city) !== fold(previous?.city || '')) delete context.listingId;
    context.city = places[0].city;
    const countries = [...new Set(places.map(item => item.country))];
    if (countries.length === 1) context.country = countries[0];
    else delete context.country;
  } else if (cities.length > 1) {
    context.unsupported = true;
  } else {
    const place = text.match(/\b(?:tai|o|in)\s+([a-z][a-z ]{1,80}?)(?=\s+(?:ngay|tu|cho|voi|duoi|ngan sach|for|on|from|under)\b|\s+\d|$)/)?.[1]?.trim();
    if (place && !['dau', 'day', 'do', 'camping', 'caming'].includes(place)) {
      context.city = place;
      delete context.country;
    }
  }
  const countries = [...new Set(index.map(item => item.country))].filter(country => includes(text, fold(country)));
  if (countries.length === 1) context.country = countries[0];
  const dates = message.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4})\b/g) || [];
  if (dates.length) {
    const normalized = dates.map(value => {
      if (/^\d{4}-/.test(value)) return value;
      const [day, month, year] = value.split(/[/.\-]/);
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    });
    delete context.dateIssue;
    if (normalized.length > 2 || normalized.some(value => !isDate(value))) {
      delete context.checkIn; delete context.checkOut; context.dateIssue = 'invalid';
    } else if (normalized.length === 2) {
      [context.checkIn, context.checkOut] = normalized;
    } else if (/\b(tra|check out|checkout|departure)\b/.test(text)
      || (previous?.checkIn && previous.checkIn >= localDay(new Date(), timeZone) && !previous.checkOut
        && !/\b(nhan|check in|checkin|doi|sang|arrival)\b/.test(text))) context.checkOut = normalized[0];
    else {
      context.checkIn = normalized[0];
      // A replacement arrival must never leave an incompatible old departure.
      if (context.checkOut && context.checkOut <= context.checkIn) delete context.checkOut;
    }
  } else if (/\b\d{1,2}[/.-]\d{1,2}\b/.test(message) || /\b(hom nay|ngay mai|cuoi tuan|tomorrow|today|weekend)\b/.test(text)) {
    delete context.checkIn; delete context.checkOut; context.dateIssue = 'ambiguous';
  }
  const guests = [...text.matchAll(/\b(\d+)\s*(?:khach|nguoi|guests?|adults?|tre em|children)\b/g)];
  if (guests.length === 1) {
    const count = Number(guests[0][1]);
    if (count >= 1 && count <= 1000) context.guests = count;
    else context.unsupported = true;
  } else if (guests.length > 1) context.unsupported = true;
  const budget = text.match(/\b(?:duoi|toi da|max|under|ngan sach|budget)\s*(?:la\s*)?(\d+)\s*(usd|dollar|vnd|dong|trieu|nghin)?\b/)
    || text.match(/^(\d+)\s*(usd|dollar|vnd|dong|trieu|nghin)\b/);
  if (budget) {
    delete context.maxPrice; delete context.budgetIssue;
    const currency = budget[2];
    if (!['usd', 'dollar'].includes(currency || '')) context.budgetIssue = 'currency';
    else if (/\b(ca chuyen|toan chuyen|trip|total)\b/.test(text)) context.budgetIssue = 'trip';
    else if (!/\b(moi dem|dem|per night|night)\b/.test(text)) context.budgetIssue = 'unit';
    else if (Number(budget[1]) > 0 && Number(budget[1]) <= 10000000) context.maxPrice = Number(budget[1]);
    else context.unsupported = true;
  }
  // Keep constraints this small parser cannot apply explicit, never silently drop them.
  if (/\b(wifi|ho boi|be boi|bep|thu cung|pet|pool|kitchen|gan bien|near|giam gia|re nhat|cheapest|bedrooms|phong ngu|dieu hoa|air conditioning|parking|do xe|view|mien phi|private)\b/.test(text)) context.unsupported = true;
  return context;
}

export function chatSearchQuestions(context: ChatSearchContext, timeZone: string, now = new Date()) {
  const questions: string[] = [];
  if (context.dateIssue) questions.push(context.dateIssue === 'invalid'
    ? 'Ngày bạn nhập không hợp lệ. Bạn gửi lại ngày nhận và trả phòng theo dạng ngày/tháng/năm nhé.'
    : 'Bạn cho mình ngày nhận và trả phòng cụ thể, kèm năm nhé.');
  else if (context.checkIn && (!isDate(context.checkIn) || context.checkIn < localDay(now, timeZone))) {
    const label = context.checkIn.split('-').reverse().join('/');
    questions.push(`Ngày nhận phòng ${label} đã qua hoặc không hợp lệ. Bạn muốn đổi sang ngày nào?`);
  } else if (!context.checkIn) questions.push('Bạn muốn nhận phòng ngày nào?');
  if (!context.dateIssue && context.checkOut && !isDate(context.checkOut)) questions.push('Ngày trả phòng không hợp lệ. Bạn muốn trả phòng ngày nào?');
  else if (!context.checkOut) questions.push('Bạn muốn trả phòng ngày nào?');
  if (context.checkIn && context.checkOut && context.checkIn >= localDay(now, timeZone) && isDate(context.checkIn) && isDate(context.checkOut)) {
    try { validateStay(context.checkIn, context.checkOut, context.guests || 1); }
    catch { questions.push('Ngày trả phòng phải sau ngày nhận phòng và kỳ lưu trú tối đa 365 đêm. Bạn chọn lại khoảng ngày nhé.'); }
  }
  if (!context.city) questions.push('Bạn muốn ở thành phố hoặc khu vực nào?');
  if (!context.guests) questions.push('Chuyến đi có bao nhiêu khách?');
  if (context.budgetIssue) questions.push(context.budgetIssue === 'currency'
    ? 'App tính giá bằng USD. Bạn cho mình ngân sách tối đa mỗi đêm bằng USD nhé; mình không tự quy đổi tiền.'
    : 'Bạn cho mình ngân sách tối đa mỗi đêm bằng USD nhé, chưa bao gồm phí và thuế.');
  if (context.unsupported) questions.push('Có điều kiện mình chưa xác định chắc chắn. Hãy dùng “Tìm chỗ ở với AI” hoặc bộ lọc để giữ đầy đủ yêu cầu; mình chưa truy vấn phòng với điều kiện đó.');
  return questions;
}
