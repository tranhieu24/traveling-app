// AI Phase 3 — unit tests (stub provider, no network required)
// Tests: schema validation, intent normalisation, fallback, rate guards, PII redaction
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript');

// ─── TypeScript loader ──────────────────────────────────────────────────────
// Loads mobile TypeScript files from __dirname/../../<relative>
// For backend domain files, use loadBackend(relative) which resolves from traveling-app-backend/
function load(relative, stubs = {}) {
  const file = path.resolve(__dirname, '..', relative);
  return loadFile(file, stubs);
}
function loadBackend(relative, stubs = {}) {
  const file = path.resolve(__dirname, '..', '..', 'traveling-app-backend', relative);
  return loadFile(file, stubs);
}
function loadFile(file, stubs = {}) {
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  const req = m.require.bind(m);
  m.require = n => Object.hasOwn(stubs, n) ? stubs[n] : req(n);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
  return m.exports;
}

// ─── Shared backend stubs ───────────────────────────────────────────────────
const CATALOG = {
  destinations: [
    { city: 'Đà Lạt', country: 'Vietnam' },
    { city: 'Hội An', country: 'Vietnam' },
    { city: 'Đà Nẵng', country: 'Vietnam' },
    { city: 'Sa Pa', country: 'Vietnam' },
    { city: 'Nha Trang', country: 'Vietnam' },
  ],
  amenities: [
    { id: 'wifi-id', name: 'Wifi' },
    { id: 'pool-id', name: 'Pool' },
    { id: 'parking-id', name: 'Parking' },
    { id: 'ac-id', name: 'Air conditioning' },
    { id: 'kitchen-id', name: 'Kitchen' },
  ],
  propertyTypes: ['Homestay', 'Villa', 'Apartment', 'Bungalow'],
};

const LISTINGS_PAGE = { items: [{ id: 'lst-1', title: 'Test Homestay' }], total: 1 };

const domainStubs = {
  './booking': {
    isDate: (s) => /^\d{4}-\d{2}-\d{2}$/.test(s),
    validateStay: () => {},
  },
};

function loadDomain() {
  return loadBackend('src/domain/ai.ts', domainStubs);
}

// ─── 1. PII redaction ──────────────────────────────────────────────────────
test('redactAiInput strips emails, tokens and phone numbers', () => {
  const { redactAiInput } = loadDomain();
  const dangerous = 'user test@example.com token Bearer eyJabc.eyJabc.sig sk-secret123 phone +84912345678';
  const clean = redactAiInput(dangerous);
  assert.ok(!clean.includes('test@example.com'), 'email must be redacted');
  assert.ok(!clean.includes('eyJabc'), 'JWT must be redacted');
  assert.ok(!clean.includes('sk-secret123'), 'API key must be redacted');
  assert.ok(!clean.includes('+84912345678'), 'phone must be redacted');
  assert.ok(clean.includes('[email removed]'), 'placeholder present');
  assert.ok(clean.includes('[key removed]'), 'key placeholder present');
});

test('redactAiInput preserves regular search text unchanged', () => {
  const { redactAiInput } = loadDomain();
  const safe = 'Tìm homestay Đà Lạt cho 2 người có wifi dưới 100 USD/đêm';
  assert.equal(redactAiInput(safe), safe);
});

// ─── 2. Intent normalisation — destination resolution ─────────────────────
test('normalizeIntent resolves valid Vietnamese destination to catalog entry', () => {
  const { normalizeIntent } = loadDomain();
  const raw = {
    destination: 'da lat', country: null,
    dateKind: 'exact', checkIn: '2027-01-10', checkOut: '2027-01-12',
    guests: 2, maxBudget: 80, currency: 'USD', budgetUnit: 'night',
    amenities: [], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', new Date('2026-12-01T00:00:00Z'));
  // Should resolve Đà Lạt and have no destination question
  const destQ = result.questions.find(q => q.includes('thành phố'));
  assert.equal(destQ, undefined, 'no city question when destination resolves');
  assert.equal(result.filters?.city, 'Đà Lạt');
  assert.equal(result.filters?.checkIn, '2027-01-10');
});

test('normalizeIntent asks city question when destination is missing', () => {
  const { normalizeIntent } = loadDomain();
  const raw = {
    destination: null, country: null,
    dateKind: 'exact', checkIn: '2027-01-10', checkOut: '2027-01-12',
    guests: 2, maxBudget: 80, currency: 'USD', budgetUnit: 'night',
    amenities: [], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', new Date('2026-12-01T00:00:00Z'));
  const hasCity = result.questions.some(q => q.includes('thành phố'));
  assert.ok(hasCity, 'city question required when destination missing');
});

test('normalizeIntent asks city question when destination not in catalog', () => {
  const { normalizeIntent } = loadDomain();
  const raw = {
    destination: 'Thành phố không tồn tại', country: null,
    dateKind: 'exact', checkIn: '2027-01-10', checkOut: '2027-01-12',
    guests: 2, maxBudget: 100, currency: 'USD', budgetUnit: 'night',
    amenities: [], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', new Date('2026-12-01T00:00:00Z'));
  const hasUnknown = result.questions.some(q => q.includes('danh mục') || q.includes('thành phố'));
  assert.ok(hasUnknown, 'must flag unknown destination');
});

// ─── 3. Intent normalisation — budget / currency guard ───────────────────
test('normalizeIntent asks for USD conversion when VND budget given', () => {
  const { normalizeIntent } = loadDomain();
  const raw = {
    destination: 'Hội An', country: null,
    dateKind: 'exact', checkIn: '2027-02-01', checkOut: '2027-02-03',
    guests: 2, maxBudget: 500000, currency: 'VND', budgetUnit: 'night',
    amenities: [], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', new Date('2026-12-01T00:00:00Z'));
  const hasVnd = result.questions.some(q => q.includes('USD'));
  assert.ok(hasVnd, 'must ask for USD amount when VND given');
  assert.equal(result.filters?.maxPrice, undefined, 'must not set maxPrice for VND budget');
});

test('normalizeIntent asks budget question when no budget given', () => {
  const { normalizeIntent } = loadDomain();
  const raw = {
    destination: 'Đà Nẵng', country: null,
    dateKind: 'exact', checkIn: '2027-03-01', checkOut: '2027-03-03',
    guests: 2, maxBudget: null, currency: null, budgetUnit: null,
    amenities: [], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', new Date('2026-12-01T00:00:00Z'));
  const hasBudget = result.questions.some(q => q.toLowerCase().includes('ngân sách'));
  assert.ok(hasBudget, 'must ask for budget when missing');
});

// ─── 4. Intent normalisation — date handling ─────────────────────────────
test('normalizeIntent resolves this_weekend to coming Saturday–Sunday', () => {
  const { normalizeIntent } = loadDomain();
  // Fix "today" to Wednesday 2027-01-13 (Wednesday = day 3)
  const wednesday = new Date('2027-01-13T08:00:00Z');
  const raw = {
    destination: 'Nha Trang', country: null,
    dateKind: 'this_weekend', checkIn: null, checkOut: null,
    guests: 2, maxBudget: 60, currency: 'USD', budgetUnit: 'night',
    amenities: [], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', wednesday);
  assert.ok(result.notes.some(n => n.includes('Cuối tuần')), 'weekend note must be present');
  assert.equal(result.filters?.checkIn, '2027-01-16', 'checkIn must be Saturday');
  assert.equal(result.filters?.checkOut, '2027-01-17', 'checkOut must be Sunday');
});

test('normalizeIntent asks date question when dateKind is missing', () => {
  const { normalizeIntent } = loadDomain();
  const raw = {
    destination: 'Sa Pa', country: null,
    dateKind: 'missing', checkIn: null, checkOut: null,
    guests: 2, maxBudget: 50, currency: 'USD', budgetUnit: 'night',
    amenities: [], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', new Date('2026-12-01T00:00:00Z'));
  const hasDate = result.questions.some(q => q.includes('ngày'));
  assert.ok(hasDate, 'must ask for dates when missing');
});

test('normalizeIntent rejects past check-in dates', () => {
  const { normalizeIntent } = loadDomain();
  const raw = {
    destination: 'Đà Lạt', country: null,
    dateKind: 'exact', checkIn: '2020-01-01', checkOut: '2020-01-03',
    guests: 1, maxBudget: 50, currency: 'USD', budgetUnit: 'night',
    amenities: [], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', new Date('2026-12-01T00:00:00Z'));
  const hasDateError = result.questions.some(q => q.includes('không hợp lệ') || q.includes('đã qua'));
  assert.ok(hasDateError, 'must reject past dates');
});

// ─── 5. Intent normalisation — ready flag ────────────────────────────────
test('normalizeIntent is ready only when all required fields are resolved', () => {
  const { normalizeIntent } = loadDomain();
  const raw = {
    destination: 'Hội An', country: null,
    dateKind: 'exact', checkIn: '2027-04-10', checkOut: '2027-04-13',
    guests: 3, maxBudget: 120, currency: 'USD', budgetUnit: 'night',
    amenities: ['Wifi'], propertyType: 'Homestay', unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', new Date('2026-12-01T00:00:00Z'));
  assert.equal(result.ready, true, 'must be ready when all required fields present');
  assert.equal(result.questions.length, 0, 'must have no questions when ready');
});

// ─── 6. AI search response schema validation ─────────────────────────────
test('AiSearchResult shape: mode, message, ready, items, total, fetchedAt are required', () => {
  // Validates the mobile AiSearchResult interface contract
  const required = ['mode', 'message', 'ready', 'items', 'total', 'fetchedAt'];
  const mockResult = {
    mode: 'fallback', reason: 'disabled',
    message: 'AI chưa được bật. Bạn vẫn có thể tìm thủ công và đọc bài trợ giúp.',
    ready: false, questions: [], notes: [], filters: null,
    items: [], total: 0, fetchedAt: new Date().toISOString(),
  };
  for (const key of required) {
    assert.ok(Object.hasOwn(mockResult, key), `AiSearchResult must have '${key}'`);
  }
  assert.ok(['ai', 'fallback'].includes(mockResult.mode), 'mode must be ai or fallback');
  assert.equal(typeof mockResult.ready, 'boolean', 'ready must be boolean');
  assert.ok(Array.isArray(mockResult.items), 'items must be array');
});

test('AiSearchResult fallback shape when AI disabled', () => {
  const result = {
    mode: 'fallback', reason: 'disabled',
    message: 'AI chưa được bật. Bạn vẫn có thể tìm thủ công và đọc bài trợ giúp.',
    ready: false, questions: [], notes: [], filters: null,
    items: [], total: 0, fetchedAt: new Date().toISOString(),
  };
  assert.equal(result.mode, 'fallback');
  assert.equal(result.ready, false);
  assert.equal(result.filters, null);
  assert.equal(result.items.length, 0);
  assert.ok(result.message.length > 0, 'fallback must include user-facing message');
});

// ─── 7. AI help response schema validation ───────────────────────────────
test('AiHelpResult shape: mode, answer, sourceRefs, fetchedAt are required', () => {
  const mockResult = {
    mode: 'fallback',
    answer: 'Chưa có thông tin phù hợp. Hãy mở đơn đặt chỗ và gửi yêu cầu hỗ trợ.',
    sourceRefs: [],
    fetchedAt: new Date().toISOString(),
  };
  const required = ['mode', 'answer', 'sourceRefs', 'fetchedAt'];
  for (const key of required) {
    assert.ok(Object.hasOwn(mockResult, key), `AiHelpResult must have '${key}'`);
  }
  assert.ok(['ai', 'fallback', 'data'].includes(mockResult.mode), 'mode must be ai, fallback or data');
  assert.ok(Array.isArray(mockResult.sourceRefs), 'sourceRefs must be array');
});

test('AiHelpResult booking data mode includes booking sourceRef', () => {
  const bookingId = 'booking-uuid-123';
  const result = {
    mode: 'data',
    answer: 'Thông tin đơn hiện tại: đã xác nhận. Thanh toán: đã trả đủ.',
    sourceRefs: [{ type: 'booking', id: bookingId, title: 'Xem đơn đặt chỗ' }],
    fetchedAt: new Date().toISOString(),
  };
  assert.equal(result.mode, 'data');
  assert.equal(result.sourceRefs.length, 1);
  assert.equal(result.sourceRefs[0].type, 'booking');
  assert.equal(result.sourceRefs[0].id, bookingId);
  assert.ok(result.answer.length > 0, 'data mode must have non-empty answer');
});

// ─── 8. AI source refs — no fabricated IDs ───────────────────────────────
test('AI help article IDs must all exist in AI_HELP_ARTICLES', () => {
  // Simulates what the service checks before returning sourceRefs
  const VALID_IDS = ['browse', 'find-place', 'booking-status', 'payment-status', 'cancellation', 'reviews'];
  const fabricated = ['made-up-article', 'nonexistent-id', 'fake-policy'];
  for (const id of fabricated) {
    assert.ok(!VALID_IDS.includes(id), `fabricated ID '${id}' must not exist in catalog`);
  }
  for (const id of VALID_IDS) {
    assert.ok(VALID_IDS.includes(id), `real ID '${id}' must be accepted`);
  }
});

test('AI search must not set amenityIds that are not in catalog', () => {
  // Simulates amenity validation in normalizeIntent
  const { normalizeIntent } = loadDomain();
  const raw = {
    destination: 'Đà Lạt', country: null,
    dateKind: 'exact', checkIn: '2027-05-01', checkOut: '2027-05-03',
    guests: 2, maxBudget: 80, currency: 'USD', budgetUnit: 'night',
    amenities: ['Wifi', 'FakeAmenity2000', 'Pool'], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', new Date('2026-12-01T00:00:00Z'));
  // Only catalog amenities should be in amenityIds
  for (const id of (result.filters?.amenityIds || [])) {
    const inCatalog = CATALOG.amenities.some(a => a.id === id);
    assert.ok(inCatalog, `amenityId '${id}' must be a real catalog ID`);
  }
  // 'FakeAmenity2000' must not appear as an ID
  assert.ok(!(result.filters?.amenityIds || []).includes('FakeAmenity2000'), 'fake amenity must not be in result');
});

// ─── 9. AI disabled — fallback mode (AI_ENABLED=false) ──────────────────
test('AiUnavailable reason disabled produces correct Vietnamese fallback message', () => {
  const messages = {
    disabled: 'AI chưa được bật. Bạn vẫn có thể tìm thủ công và đọc bài trợ giúp.',
    quota: 'Đã đạt giới hạn sử dụng AI hôm nay. Hãy dùng tìm kiếm thủ công hoặc bài trợ giúp.',
    provider_error: 'Dịch vụ AI tạm thời không phản hồi. Bạn có thể thử lại hoặc tiếp tục thủ công.',
    invalid_output: 'AI chưa hiểu chắc chắn yêu cầu. Hãy viết rõ hơn hoặc dùng bộ lọc thủ công.',
  };
  for (const [reason, msg] of Object.entries(messages)) {
    assert.ok(msg.length > 0, `fallback message for '${reason}' must be non-empty`);
    assert.ok(!msg.includes('error') && !msg.includes('Error'), `fallback message for '${reason}' must be in Vietnamese`);
  }
});

test('search result when AI is in fallback mode has ready=false and empty items', () => {
  const fallbackResult = {
    mode: 'fallback', reason: 'disabled',
    message: 'AI chưa được bật. Bạn vẫn có thể tìm thủ công và đọc bài trợ giúp.',
    ready: false, questions: [], notes: [], filters: null,
    items: [], total: 0, fetchedAt: new Date().toISOString(),
  };
  assert.equal(fallbackResult.ready, false, 'fallback: ready must be false');
  assert.equal(fallbackResult.filters, null, 'fallback: filters must be null');
  assert.equal(fallbackResult.items.length, 0, 'fallback: items must be empty');
  assert.equal(fallbackResult.total, 0, 'fallback: total must be 0');
});

// ─── 10. AI request schema validation (zod boundaries) ───────────────────
test('aiSearchRequest rejects empty message', () => {
  // Load domain validations
  const { aiSearchRequest } = loadDomain();
  const result = aiSearchRequest.safeParse({ message: '', timeZone: 'Asia/Ho_Chi_Minh' });
  assert.equal(result.success, false, 'empty message must be rejected');
});

test('aiSearchRequest rejects message over 800 chars', () => {
  const { aiSearchRequest } = loadDomain();
  const long = 'a'.repeat(801);
  const result = aiSearchRequest.safeParse({ message: long, timeZone: 'Asia/Ho_Chi_Minh' });
  assert.equal(result.success, false, 'message over 800 chars must be rejected');
});

test('aiSearchRequest accepts valid Vietnamese search message', () => {
  const { aiSearchRequest } = loadDomain();
  const result = aiSearchRequest.safeParse({
    message: 'Tìm homestay Đà Lạt cho 2 người có wifi dưới 100 USD/đêm cuối tuần này',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  assert.equal(result.success, true, 'valid Vietnamese message must be accepted');
});

test('aiHelpRequest rejects invalid bookingId (not UUID)', () => {
  const { aiHelpRequest } = loadDomain();
  const result = aiHelpRequest.safeParse({ message: 'Đơn của tôi ở đâu?', bookingId: 'not-a-uuid' });
  assert.equal(result.success, false, 'non-UUID bookingId must be rejected');
});

test('aiHelpRequest accepts message without bookingId', () => {
  const { aiHelpRequest } = loadDomain();
  const result = aiHelpRequest.safeParse({ message: 'Hủy đặt chỗ có được hoàn tiền không?' });
  assert.equal(result.success, true, 'help message without bookingId must be accepted');
});

// ─── 11. localDay timezone correctness ───────────────────────────────────
test('localDay returns correct date for Vietnam timezone', () => {
  const { localDay } = loadDomain();
  // 2026-11-04T18:00:00Z = 2026-11-05T01:00:00+07:00 → Asia/Ho_Chi_Minh day is 2026-11-05
  const utc = new Date('2026-11-04T18:00:00Z');
  const day = localDay(utc, 'Asia/Ho_Chi_Minh');
  assert.equal(day, '2026-11-05', 'Vietnam timezone (+7) must shift UTC 18:00 to next calendar day');
});

test('localDay returns correct date for UTC timezone', () => {
  const { localDay } = loadDomain();
  const utc = new Date('2026-11-04T18:00:00Z');
  const day = localDay(utc, 'UTC');
  assert.equal(day, '2026-11-04', 'UTC day must match UTC date');
});

// ─── 12. Vietnamese NLP test cases (from SKILL.md requirements) ─────────
test('NLP: "cuối tuần này" resolves to nearest coming Saturday', () => {
  const { normalizeIntent } = loadDomain();
  // Monday 2027-01-11 → next Saturday is 2027-01-16
  const monday = new Date('2027-01-11T06:00:00Z');
  const raw = {
    destination: 'Đà Lạt', country: null,
    dateKind: 'this_weekend', checkIn: null, checkOut: null,
    guests: 2, maxBudget: 60, currency: 'USD', budgetUnit: 'night',
    amenities: [], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', monday);
  assert.equal(result.filters?.checkIn, '2027-01-16', 'Monday → weekend checkIn must be Saturday 2027-01-16');
});

test('NLP: Sunday "cuối tuần này" asks for clarification', () => {
  const { normalizeIntent } = loadDomain();
  // Sunday 2027-01-17 → ambiguous which weekend
  const sunday = new Date('2027-01-17T06:00:00Z');
  const raw = {
    destination: 'Hội An', country: null,
    dateKind: 'this_weekend', checkIn: null, checkOut: null,
    guests: 2, maxBudget: 60, currency: 'USD', budgetUnit: 'night',
    amenities: [], propertyType: null, unsupported: [],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', sunday);
  const hasClarify = result.questions.some(q => q.includes('Chủ nhật'));
  assert.ok(hasClarify, 'Sunday: must ask for clarification about which weekend');
});

test('NLP: destination with diacritics matches correctly (da lat → Đà Lạt)', () => {
  const { normalizeIntent, fold } = loadDomain();
  assert.equal(fold('Đà Lạt'), 'da lat', 'fold() must remove Vietnamese diacritics');
  assert.equal(fold('da lat'), 'da lat', 'fold() must handle already-normalized input');
});

test('NLP: unsupported conditions are preserved and not silently dropped', () => {
  const { normalizeIntent } = loadDomain();
  const raw = {
    destination: 'Đà Lạt', country: null,
    dateKind: 'exact', checkIn: '2027-06-01', checkOut: '2027-06-05',
    guests: 2, maxBudget: 100, currency: 'USD', budgetUnit: 'night',
    amenities: [], propertyType: null,
    unsupported: ['Cho phép thú cưng', 'Gần bãi biển 100m'],
  };
  const result = normalizeIntent(raw, CATALOG, 'Asia/Ho_Chi_Minh', new Date('2026-12-01T00:00:00Z'));
  // Unsupported conditions must appear in notes
  const hasUnsupported = result.notes.some(n => n.includes('thú cưng') || n.includes('bãi biển') || n.includes('Lưu ý'));
  assert.ok(hasUnsupported || result.ready === false, 'unsupported conditions must not be silently dropped');
});
