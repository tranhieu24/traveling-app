import { ChatSearchContext, fold } from '../domain/ai';
import { chatSearchQuestions, isRecommendation, readChatSearch } from '../domain/chatSearch';
import { AI_HELP_ARTICLES } from '../data/aiHelp';
import { aiService } from './ai.service';
import { findChatRecommendations, getChatListing, getChatListingIndex } from '../repositories/aiChat.repository';

export interface ChatReply {
  mode: 'ai' | 'fallback' | 'data';
  reason?: string;
  answer: string;
  sourceRefs: { type: 'article' | 'booking' | 'listing'; id: string; title: string }[];
  fetchedAt: string;
  searchContext?: ChatSearchContext;
}

const stopWords = new Set('cho toi minh ban thong tin phong cho o xem tim muon can ve cua ten la di hay giup biet mot please tell me about show information room rooms stay accommodation the a an in at'.split(' '));
const contains = (text: string, phrase: string) => !!phrase && (` ${text} `).includes(` ${phrase} `);
const followUpWords = new Set('gia bao nhieu tien nghi wifi ho boi bep giuong phong ngu khach suc chua dia chi dau nay no con co khong ko duoc toi da la sao price cost amenities guests bedrooms does it have how much many pool beds bathroom bathrooms capacity'.split(' '));
const faqTopics: [RegExp, string][] = [
  [/\b(huy|hoan tien|cancel|cancellation|refund)\b/, 'cancellation'],
  [/\b(thanh toan|tra tien|payment|pay|paid)\b/, 'payment-status'],
  [/\b(danh gia|review|reviews)\b/, 'reviews'],
  [/\b(trang thai|don dat|booking status|reservation status)\b/, 'booking-status'],
  [/\b(dat phong|dat cho|book|booking|reserve|reservation)\b/, 'find-place'],
  [/\b(chua dang nhap|khong dang nhap|guest|without login)\b/, 'browse'],
];

export class AiChatService {
  constructor(private deps = {
    index: getChatListingIndex, listing: getChatListing,
    search: findChatRecommendations,
    help: aiService.help.bind(aiService),
  }) {}

  async reply(message: string, identity: string, userId?: string, listingId?: string, searchContext?: ChatSearchContext, timeZone = 'Asia/Ho_Chi_Minh'): Promise<ChatReply> {
    const text = fold(message);
    const respond = (answer: string, sourceRefs: ChatReply['sourceRefs'] = []): ChatReply =>
      ({ mode: 'data', answer, sourceRefs, fetchedAt: new Date().toISOString() });

    if (/^(hello|hi|hey|alo|xin chao|chao)( ban| ai| nhe| nha)?$/.test(text)) {
      return respond('Chào bạn! Mình có thể tra thông tin chỗ ở, giá niêm yết, tiện nghi và hướng dẫn đặt phòng. Bạn muốn tìm chỗ ở tại đâu, hay đang quan tâm phòng nào?');
    }
    if (/^(cam on|thank you|thanks|ok|okay|oke)( ban| nhe| nha)?$/.test(text)) {
      return respond('Rất vui được giúp bạn! Khi cần xem phòng khác, bạn cứ gửi tên phòng hoặc điểm đến nhé.');
    }

    if (/^(bat dau tim moi|bat dau lai|tim lai|xoa bo loc|reset search|start over)$/.test(text)) {
      return { ...respond('Mình đã xóa các điều kiện tìm trước. Bạn muốn tìm chỗ ở tại đâu, cho bao nhiêu khách và vào ngày nào?'), searchContext: {} };
    }
    // Separate how-to questions from an actual request to find/book accommodation.
    const topic = faqTopics.find(([pattern]) => pattern.test(text));
    const howTo = /\b(nhu the nao|lam the nao|cach dat|huong dan|how to|how do)\b/.test(text);
    if (topic && (topic[1] !== 'find-place' || howTo)) {
      const article = AI_HELP_ARTICLES.find(item => item.id === topic[1])!;
      return respond(article.text, [{ type: 'article', id: article.id, title: article.title }]);
    }

    const index = await this.deps.index();
    const exact = index.filter(item => contains(text, fold(item.title)));
    const terms = text.split(' ').filter(term => term && !stopWords.has(term));
    const matches = exact.length ? exact : terms.length ? index.filter(item => {
      const haystack = fold([item.title, item.city, item.country, item.category_name, item.category_slug].join(' '));
      return terms.every(term => contains(haystack, term));
    }) : [];
    const followUp = terms.length > 0 && terms.every(term => followUpWords.has(term));
    const selected = matches.length === 1 ? matches[0].id : !matches.length && followUp ? listingId : undefined;

    const wantsSearch = !howTo && (isRecommendation(text) || (!!searchContext && !exact.length && !(listingId && followUp))
      || (!selected && /\b\d{1,2}[/.-]\d{1,2}|\b\d{4}-\d{2}-\d{2}/.test(message)));
    if (wantsSearch) {
      const context = readChatSearch(message, searchContext, index, timeZone);
      const questions = chatSearchQuestions(context, timeZone);
      const category = context.categorySlug ? index.find(item => item.category_slug === context.categorySlug) : undefined;
      const cities = context.city ? index.filter(item => fold(item.city) === fold(context.city!) && (!context.country || fold(item.country) === fold(context.country))) : [];
      if (context.categorySlug && !category) questions.push('Danh mục bạn yêu cầu hiện chưa có chỗ ở hoạt động. Bạn muốn đổi danh mục nào?');
      if (context.city && !cities.length) questions.push(`Mình chưa tìm thấy điểm đến “${context.city}” trong danh mục. Bạn muốn đổi điểm đến nào?`);
      if (context.city && new Set(cities.map(item => item.country)).size > 1) questions.push('Điểm đến này trùng tên ở nhiều quốc gia. Bạn muốn ở quốc gia nào?');
      if (context.listingId && !index.some(item => item.id === context.listingId)) questions.push('Chỗ ở đã chọn hiện không còn hiển thị. Bạn muốn tìm chỗ khác nào?');
      const recap = [context.categorySlug && (category?.category_name || context.categorySlug), context.city, context.guests && `${context.guests} khách`].filter(Boolean).join(', ');
      if (questions.length) {
        return { ...respond(`${recap ? `Mình ghi nhận: ${recap}.\n\n` : ''}${questions.map(question => `• ${question}`).join('\n')}`), searchContext: context };
      }
      const found = await this.deps.search({
        ...(context.listingId ? { listingId: context.listingId } : {}),
        ...(category ? { categoryId: category.category_id } : {}),
        city: cities[0].city, country: context.country || cities[0].country, cityExact: true,
        ...([...new Set(cities.map(item => item.city))].length > 1 ? { cityAliases: [...new Set(cities.map(item => item.city))] } : {}),
        checkIn: context.checkIn, checkOut: context.checkOut, guests: context.guests,
        ...(context.maxPrice !== undefined ? { maxPrice: context.maxPrice } : {}),
      });
      if (!found.items.length) return { ...respond('Hiện không có chỗ ở phù hợp với đầy đủ điều kiện bạn đã đưa ra. Bạn muốn đổi ngày, điểm đến hoặc danh mục? Mình chưa tự nới các điều kiện của bạn.'), searchContext: context };
      return {
        ...respond(`Mình tìm thấy ${found.total} chỗ ở phù hợp cho ${context.guests} khách, từ ${context.checkIn} đến ${context.checkOut}.\n\n${found.items.map(item => `• ${item.title} — ${item.city}: ${Number(item.nightly_rate).toLocaleString('en-US')} USD/đêm`).join('\n')}\n\nĐây là giá niêm yết mỗi đêm. Mở phòng để kiểm tra lại báo giá, phí và phòng trống trước khi xác nhận đặt; mình chưa tạo đơn hay thanh toán.`, found.items.map(item => ({ type: 'listing', id: item.id, title: `Xem phòng ${item.title}` }))),
        searchContext: context,
      };
    }

    if (selected) {
      // Re-fetch for each follow-up: context never overrides current visibility or prices.
      const listing = await this.deps.listing(selected);
      if (listing) {
        const price = Number(listing.price_per_night);
        const amenityQuestion = /\b(tien nghi|wifi|ho boi|bep|amenities|pool)\b/.test(text);
        const priceQuestion = /\b(gia|price|cost|how much)\b/.test(text);
        const capacityQuestion = /\b(suc chua|bao nhieu khach|bao nhieu giuong|how many|capacity)\b/.test(text);
        const general = !amenityQuestion && !priceQuestion && !capacityQuestion;
        const lines = [
          `${listing.title} ở ${listing.city}, ${listing.country}.`,
          (general || priceQuestion) && Number.isFinite(price) && price >= 0 ? `Giá niêm yết: ${price.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD/đêm.` : '',
          general || capacityQuestion ? `Sức chứa tối đa ${listing.max_guests} khách; ${listing.bedrooms} phòng ngủ, ${listing.beds} giường, ${listing.bathrooms} phòng tắm.` : '',
          general || amenityQuestion ? listing.amenities.length ? `Tiện nghi được công bố: ${listing.amenities.join(', ')}.` : 'Chỗ ở chưa công bố danh sách tiện nghi.' : '',
          amenityQuestion ? 'Các tiện nghi khác chưa có trong danh sách cần được xác nhận với chỗ ở.' : '',
          general ? listing.description?.trim().slice(0, 400) || '' : '',
          'Để kiểm tra phòng trống và tổng tiền gồm phí, hãy mở chi tiết phòng rồi chọn ngày ở và số khách.',
        ];
        return respond(lines.filter(Boolean).join('\n\n'), [{ type: 'listing', id: listing.id, title: `Xem phòng ${listing.title}` }]);
      }
      return respond('Chỗ ở này hiện không còn hiển thị. Bạn muốn mình tìm chỗ khác ở đâu?');
    }
    if (matches.length > 1) {
      return respond(`Mình tìm thấy một số chỗ ở trong danh mục. Bạn muốn xem chỗ nào?\n\n${matches.slice(0, 3).map(item => `• ${item.title} — ${item.city}, ${item.country}`).join('\n')}`,
        matches.slice(0, 3).map(item => ({ type: 'listing', id: item.id, title: `Xem phòng ${item.title}` })));
    }
    if (!terms.length || followUp || /^(thong tin phong|room information)$/.test(text)) {
      return respond('Bạn muốn xem thông tin phòng nào? Gửi tên phòng hoặc điểm đến để mình tra giá, sức chứa và tiện nghi cho bạn.');
    }

    const help = await this.deps.help(message, identity, userId);
    if (help.sourceRefs.length) return help;
    return {
      ...help,
      answer: /\b(phong|cho o|camping|homestay|villa|treehouse|hotel|apartment|room|stay)\b/.test(text)
        ? 'Mình chưa xác định được chỗ ở bạn đang hỏi trong danh mục. Bạn gửi tên phòng đầy đủ hoặc điểm đến nhé. Nếu cần lọc theo ngày, số khách và ngân sách, hãy chọn “Tìm chỗ ở với AI” bên dưới.'
        : 'Mình hỗ trợ thông tin chỗ ở và cách dùng Traveling. Bạn muốn hỏi về phòng nào, hay cần hướng dẫn đặt chỗ, thanh toán hoặc hủy phòng?',
    };
  }
}

export const aiChatService = new AiChatService();
