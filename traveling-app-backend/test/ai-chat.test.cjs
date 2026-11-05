const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(relative, stubs = {}) {
  const filename = path.resolve(__dirname, '..', relative), mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => Object.hasOwn(stubs, name) ? stubs[name] : original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const types = load('src/types/index.ts');
const booking = load('src/domain/booking.ts', { '../types': types });
const domain = load('src/domain/ai.ts', { './booking': booking });
const chatSearch = load('src/domain/chatSearch.ts', { './ai': domain, './booking': booking });
const articles = load('src/data/aiHelp.ts');
const { AiChatService } = load('src/services/aiChat.service.ts', {
  '../domain/ai': domain, '../domain/chatSearch': chatSearch, '../data/aiHelp': articles,
  './ai.service': { aiService: { help() {} } }, '../repositories/aiChat.repository': {},
});
const id = '10000000-0000-4000-8000-000000000001';
const room = { id, title: 'Balian Treehouse', city: 'Bali', country: 'Indonesia', category_id: '20000000-0000-4000-8000-000000000001', category_name: 'Beach', category_slug: 'beach', description: 'A quiet treehouse.', price_per_night: '20.00', max_guests: 2, bedrooms: 1, beds: 1, bathrooms: 1, amenities: ['Wifi', 'Kitchen'] };
const camps = [1, 2].map(number => ({ ...room, id: `10000000-0000-4000-8000-00000000000${number + 1}`, title: `Pine Camp ${number}`, city: 'Da Lat', country: 'Vietnam', category_id: '20000000-0000-4000-8000-000000000002', category_name: 'Camping', category_slug: 'camping' }));
function fixture(overrides = {}) {
  const calls = { index: 0, listing: [], help: 0, search: [] };
  const deps = {
    index: async () => { calls.index++; return [room, ...camps]; },
    listing: async value => { calls.listing.push(value); return value === id ? room : null; },
    search: async filters => { calls.search.push(filters); return { items: [{ ...camps[0], nightly_rate: 20 }], total: 1 }; },
    help: async () => { calls.help++; return { mode: 'fallback', reason: 'Daily limit reached', answer: 'Generic FAQ', sourceRefs: [], fetchedAt: new Date().toISOString() }; },
    ...overrides,
  };
  return { calls, api: new AiChatService(deps) };
}

test('hello, hi and thanks reply naturally without model budget or catalog access', async () => {
  const { api, calls } = fixture();
  for (const message of ['hello', 'hi', 'Xin chào bạn!', 'cảm ơn']) {
    const result = await api.reply(message, 'guest');
    assert.equal(result.mode, 'data');
    assert.equal(result.sourceRefs.length, 0);
    assert.doesNotMatch(result.answer, /Chưa có thông tin phù hợp/);
  }
  assert.equal(calls.help, 0); assert.equal(calls.index, 0);
});

test('a vague request asks which room instead of quoting a search tutorial', async () => {
  const { api, calls } = fixture();
  const result = await api.reply('cho tôi thông tin phòng', 'guest');
  assert.match(result.answer, /phòng nào/);
  assert.equal(result.sourceRefs.length, 0); assert.equal(calls.help, 0);
});

test('a listing name returns current public data and a listing link without model calls', async () => {
  const { api, calls } = fixture();
  const result = await api.reply('cho tôi thông tin Balian Treehouse', 'guest');
  for (const value of ['Balian Treehouse', '20 USD/đêm', '2 khách', 'Wifi', 'Kitchen']) assert.ok(result.answer.includes(value));
  assert.match(result.answer, /kiểm tra phòng trống và tổng tiền/);
  assert.deepEqual(result.sourceRefs.map(source => source.type), ['listing']);
  assert.equal(result.sourceRefs[0].id, id); assert.equal(calls.help, 0);
});

test('camping and destination are matched to real categories; ambiguous rooms ask for a choice', async () => {
  const { api, calls } = fixture();
  const result = await api.reply('camping Da Lat', 'guest');
  assert.match(result.answer, /Bạn muốn xem chỗ nào/);
  assert.deepEqual(result.sourceRefs.map(source => source.id), camps.map(item => item.id));
  assert.equal(calls.listing.length, 0); assert.equal(calls.help, 0);
});

test('follow-ups fetch fresh prices, and a named different listing overrides old context', async () => {
  const seen = [];
  const { api } = fixture({ listing: async value => { seen.push(value); return { ...room, price_per_night: '35.50' }; } });
  const next = await api.reply('giá bao nhiêu?', 'guest', undefined, id);
  assert.match(next.answer, /35.5 USD/); assert.doesNotMatch(next.answer, /20 USD/);
  const other = await api.reply('Pine Camp 1', 'guest', undefined, id);
  assert.equal(seen[1], camps[0].id);
  assert.ok(other.answer);
});

test('a new unknown room never silently reuses the old room', async () => {
  const { api, calls } = fixture();
  const result = await api.reply('giá phòng Atlantis Unknown', 'guest', undefined, id);
  assert.equal(calls.listing.length, 0);
  assert.doesNotMatch(result.answer, /Balian|20 USD/);
});

test('inactive context is not returned and unknown amenities are not promised', async () => {
  const missing = fixture({ listing: async () => null });
  const hidden = await missing.api.reply('giá bao nhiêu', 'guest', undefined, id);
  assert.match(hidden.answer, /không còn hiển thị/); assert.equal(hidden.sourceRefs.length, 0);
  const { api } = fixture();
  const amenities = await api.reply('phòng này có hồ bơi không?', 'guest', undefined, id);
  assert.match(amenities.answer, /Wifi, Kitchen/);
  assert.match(amenities.answer, /cần được xác nhận/);
  assert.doesNotMatch(amenities.answer, /có hồ bơi|20 USD/);
});

test('cancellation and payment remain approved guidance and never execute an action', async () => {
  const { api, calls } = fixture();
  const result = await api.reply('hủy và hoàn tiền ngay cho tôi', 'guest');
  assert.equal(result.answer, articles.AI_HELP_ARTICLES.find(item => item.id === 'cancellation').text);
  assert.equal(result.sourceRefs[0].type, 'article');
  assert.equal(calls.help, 0); assert.equal(calls.index, 0);
});

test('fallback explains the limitation without redirecting unrelated questions to a booking', async () => {
  const { api } = fixture();
  const result = await api.reply('weather tomorrow', 'guest');
  assert.equal(result.mode, 'fallback'); assert.ok(result.reason);
  assert.match(result.answer, /Bạn muốn hỏi về phòng nào/);
  assert.doesNotMatch(result.answer, /Hãy mở đơn đặt chỗ/);
});

test('chat accepts only bounded questions and optional public listing context', () => {
  assert.equal(domain.aiChatRequest.safeParse({ message: 'hi' }).success, true);
  for (const body of [{ message: ' ' }, { message: 'x'.repeat(801) }, { message: 'hello', userId: id }, { message: 'hello', bookingId: id }, { message: 'hello', listingId: 'invalid' }]) {
    assert.equal(domain.aiChatRequest.safeParse(body).success, false);
  }
});

test('the reported booking request and recommendation follow-up keep camping and reject past dates', async () => {
  const { api, calls } = fixture();
  const first = await api.reply('tôi muốn đặt phòng caming ngày 12/5/2026', 'guest');
  assert.equal(first.searchContext.categorySlug, 'camping');
  assert.equal(first.searchContext.checkIn, '2026-05-12');
  assert.match(first.answer, /12\/05\/2026.*đã qua/);
  assert.doesNotMatch(first.answer, /Dùng thanh tìm kiếm/);
  const second = await api.reply('gợi ý cho tôi phòng', 'guest', undefined, undefined, first.searchContext);
  assert.equal(second.searchContext.categorySlug, 'camping');
  assert.match(second.answer, /đã qua/);
  assert.equal(calls.help, 0); assert.equal(calls.search.length, 0);
});

test('recommendation asks for missing trip details, then merges replies and queries actual availability', async () => {
  const { api, calls } = fixture();
  let result = await api.reply('gợi ý cho tôi phòng camping', 'guest');
  assert.match(result.answer, /thành phố/); assert.match(result.answer, /bao nhiêu khách/);
  result = await api.reply('Đà Lạt', 'guest', undefined, undefined, result.searchContext);
  assert.equal(result.searchContext.city, 'Da Lat');
  result = await api.reply('nhận 10/12/2099 trả 12/12/2099', 'guest', undefined, undefined, result.searchContext);
  assert.match(result.answer, /bao nhiêu khách/); assert.equal(calls.search.length, 0);
  result = await api.reply('2 khách, dưới 100 USD mỗi đêm', 'guest', undefined, undefined, result.searchContext);
  assert.equal(calls.help, 0); assert.equal(calls.search.length, 1);
  assert.deepEqual(calls.search[0], { categoryId: camps[0].category_id, city: 'Da Lat', country: 'Vietnam', cityExact: true, checkIn: '2099-12-10', checkOut: '2099-12-12', guests: 2, maxPrice: 100 });
  assert.equal(result.sourceRefs[0].id, camps[0].id); assert.match(result.answer, /chưa tạo đơn/);
});

test('how-to remains guidance while a booking request becomes a trip clarification', async () => {
  const { api } = fixture();
  const guidance = await api.reply('Đặt phòng như thế nào?', 'guest');
  assert.equal(guidance.sourceRefs[0].type, 'article');
  const request = await api.reply('tôi muốn đặt phòng', 'guest');
  assert.ok(request.searchContext); assert.equal(request.sourceRefs.length, 0);
  assert.match(request.answer, /ngày nào/);
});

test('invalid, ambiguous and reversed dates never query or silently guess a year', async () => {
  for (const message of ['gợi ý camping ngày 31/02/2099', 'gợi ý camping ngày 12/5', 'gợi ý camping cuối tuần này', 'gợi ý camping từ 12/12/2099 đến 10/12/2099']) {
    const { api, calls } = fixture();
    const result = await api.reply(message, 'guest');
    assert.equal(calls.search.length, 0); assert.equal(calls.help, 0);
    assert.match(result.answer, /ngày|Ngày/);
  }
});

test('corrected dates replace a past arrival and do not lose the category', async () => {
  const context = { categorySlug: 'camping', city: 'Da Lat', checkIn: '2026-05-12', guests: 2 };
  const { api, calls } = fixture();
  const result = await api.reply('đổi ngày 10/12/2099 đến 12/12/2099', 'guest', undefined, undefined, context);
  assert.equal(result.searchContext.categorySlug, 'camping');
  assert.equal(result.searchContext.checkIn, '2099-12-10');
  assert.equal(calls.search.length, 1);
});

test('a budget clarification can be answered without repeating the whole request', async () => {
  const { api, calls } = fixture();
  const context = { categorySlug: 'camping', city: 'Da Lat', checkIn: '2099-12-10', checkOut: '2099-12-12', guests: 2, budgetIssue: 'currency' };
  const result = await api.reply('100 USD mỗi đêm', 'guest', undefined, undefined, context);
  assert.equal(result.searchContext.budgetIssue, undefined);
  assert.equal(calls.search[0].maxPrice, 100);
});

test('a bare next date answers the pending departure question instead of replacing arrival', async () => {
  const { api, calls } = fixture();
  const context = { categorySlug: 'camping', city: 'Da Lat', checkIn: '2099-12-10', guests: 2 };
  const result = await api.reply('12/12/2099', 'guest', undefined, undefined, context);
  assert.equal(result.searchContext.checkIn, '2099-12-10');
  assert.equal(result.searchContext.checkOut, '2099-12-12');
  assert.equal(calls.search.length, 1);
});

test('unknown categories/cities, VND, trip budgets and unsupported filters never relax search', async () => {
  const ready = { categorySlug: 'camping', city: 'Da Lat', checkIn: '2099-12-10', checkOut: '2099-12-12', guests: 2 };
  for (const [message, context, pattern] of [
    ['gợi ý', { ...ready, city: 'Atlantis' }, /điểm đến/],
    ['gợi ý', { ...ready, categorySlug: 'unknown' }, /danh mục/],
    ['dưới 1000000 VND mỗi đêm', ready, /không tự quy đổi/],
    ['dưới 100 USD cả chuyến', ready, /mỗi đêm/],
    ['có hồ bơi', ready, /chưa xác định chắc chắn/],
  ]) {
    const { api, calls } = fixture();
    const result = await api.reply(message, 'guest', undefined, undefined, context);
    assert.match(result.answer, pattern); assert.equal(calls.search.length, 0);
  }
});

test('empty availability results retain all criteria and never trigger a broader search', async () => {
  const calls = [];
  const { api } = fixture({ search: async filters => { calls.push(filters); return { items: [], total: 0 }; } });
  const context = { categorySlug: 'camping', city: 'Da Lat', checkIn: '2099-12-10', checkOut: '2099-12-12', guests: 2, maxPrice: 30 };
  const result = await api.reply('gợi ý phòng', 'guest', undefined, undefined, context);
  assert.equal(calls.length, 1); assert.equal(calls[0].maxPrice, 30);
  assert.equal(result.searchContext.maxPrice, 30); assert.match(result.answer, /chưa tự nới/);
});

test('catalog-verified accent aliases search the same city without dropping camping or dates', async () => {
  const { api, calls } = fixture({ index: async () => [room, ...camps, { ...camps[0], id: 'another-camp', city: 'Đà Lạt' }] });
  await api.reply('gợi ý camping tại Đà Lạt từ 10/12/2099 đến 12/12/2099 cho 2 khách', 'guest');
  assert.deepEqual(calls.search[0].cityAliases, ['Da Lat', 'Đà Lạt']);
  assert.equal(calls.search[0].categoryId, camps[0].category_id);
  assert.equal(calls.search[0].checkIn, '2099-12-10');
});

test('recommendations use bound SQL for listing, verified city aliases, capacity and availability', async () => {
  const queries = [];
  const repo = load('src/repositories/listing.repository.ts', {
    '../config/database': { pool: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: sql.includes('COUNT(*) AS total') ? [{ total: 0 }] : [] }; } } },
    '../domain/booking': booking, '../config/env': { ENV: { TAX_RATE: 0 } },
  });
  await repo.listingRepository.findListings({ listingId: id, categoryId: camps[0].category_id, cityAliases: ['Da Lat', 'Đà Lạt'], checkIn: '2099-12-10', checkOut: '2099-12-12', guests: 2, maxPrice: 100, page: 1, limit: 3, sortBy: 'recommended' });
  const { sql, values } = queries[0];
  for (const pattern of [/l\.id = \$/, /LOWER\(l.city\) = ANY/, /l.max_guests >=/, /NOT EXISTS/, /b.booking_status='confirmed'/]) assert.match(sql, pattern);
  assert.doesNotMatch(sql, /Da Lat|Đà Lạt|2099-12-10/);
  assert.ok(values.includes('2099-12-10')); assert.ok(values.includes(2));
  assert.ok(values.some(value => Array.isArray(value) && value.includes('da lat') && value.includes('đà lạt')));
});

test('a new search clears previous constraints and a client cannot inject private or executable context', async () => {
  const { api, calls } = fixture();
  const result = await api.reply('Bắt đầu tìm mới', 'guest', undefined, undefined, { categorySlug: 'camping', unsupported: true });
  assert.deepEqual(result.searchContext, {}); assert.equal(calls.search.length, 0);
  for (const searchContext of [{ userId: id }, { sql: 'DROP TABLE listings' }, { guests: -1 }, { maxPrice: -20 }, { listingId: 'invalid' }, { dateIssue: 'whatever' }]) {
    assert.equal(domain.aiChatRequest.safeParse({ message: 'gợi ý', searchContext }).success, false);
  }
});

test('chat repository selects only public columns and guards inactive listings/categories', async () => {
  const queries = [];
  const repo = load('src/repositories/aiChat.repository.ts', {
    './listing.repository': { listingRepository: { findListings() {} } },
    '../config/database': { pool: { query: async (...args) => { queries.push(args); return { rows: [] }; } } },
  });
  await repo.getChatListingIndex(); await repo.getChatListing(id);
  for (const [sql] of queries) {
    assert.match(sql, /l\.is_active AND c\.is_active/);
    assert.doesNotMatch(sql, /l\.\*|users|bookings|email|phone/);
  }
  assert.ok(queries[1][0].includes('l.id=$1')); assert.deepEqual(queries[1][1], [id]);
});
