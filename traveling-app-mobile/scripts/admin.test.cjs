const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(relative, stubs = {}) {
  const filename = path.resolve(__dirname, '..', relative);
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => Object.hasOwn(stubs, name) ? stubs[name] : original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
  return mod.exports;
}
const categoryImages = load('src/utils/categoryImage.ts', { 'expo-constants': { __esModule: true, default: { expoConfig: { extra: { supabaseUrl: 'https://fixture.supabase.co' } } } } });
const utils = load('src/utils/admin.ts', { './categoryImage': categoryImages });
const types = load('../traveling-app-backend/src/types/index.ts');
const domain = load('../traveling-app-backend/src/domain/booking.ts', { '../types': types });
const schemas = load('../traveling-app-backend/src/validators/schemas.ts', { '../domain/booking': domain });
const image = load('../traveling-app-backend/src/domain/adminMedia.ts', { '../types': types });
const id = '11111111-1111-4111-8111-111111111111';
const validListing = { hostId: id, categoryId: id, title: 'Ocean stay', propertyType: 'Villa', roomType: 'entire_place', address: '1 Beach Road', city: 'Bali', country: 'Indonesia', region: 'Asia', pricePerNight: '50', cleaningFee: '5', serviceFee: '5', maxGuests: '2', bedrooms: '1', beds: '1', bathrooms: '1', checkInTime: '14:00', checkOutTime: '12:00', isActive: 'true' };
const photos = [{ photoUrl: 'https://example.test/cover.png', isCover: false }, { photoUrl: 'https://example.test/second.png', isCover: true }];

test('listing form payload matches backend schema, requires photos and preserves cover ordering', () => {
  const payload = utils.buildAdminPayload('listings', validListing, [id], photos);
  assert.equal(schemas.listingSchema.safeParse(payload).success, true);
  assert.deepEqual(payload.photos.map(p => p.isCover), [true, false]);
  assert.equal(payload.pricePerNight, 50); assert.equal(payload.amenityIds[0], id);
  for (const patch of [{ pricePerNight: '0' }, { pricePerNight: '5.123' }, { maxGuests: '1.5' }, { maxGuests: '1001' }, { hostId: 'invalid' }, { latitude: '91' }, { checkInTime: '25:00' }]) {
    assert.throws(() => utils.buildAdminPayload('listings', { ...validListing, ...patch }, [], photos));
  }
  assert.throws(() => utils.buildAdminPayload('listings', validListing, [], []));
  assert.throws(() => utils.buildAdminPayload('listings', validListing, [], [{ photoUrl: 'javascript:alert(1)', isCover: true }]));
});

test('category media identifiers fit the existing column and only resolve known image paths', () => {
  const iconName = `media:${id}.png`;
  const payload = utils.buildAdminPayload('categories', { name: 'Beach', slug: 'beach', iconName });
  assert.equal(schemas.categorySchema.safeParse(payload).success, true);
  assert.ok(iconName.length <= 50);
  assert.equal(categoryImages.categoryImage(iconName), `https://fixture.supabase.co/storage/v1/object/public/admin-listing-images/${id}.png`);
  for (const value of ['media:../../secret', 'javascript:alert(1)', 'home', `media:${id}.svg`]) assert.equal(categoryImages.categoryImage(value), undefined);
});

test('coupon and customer editors match strict backend payloads and never change roles', () => {
  const values = { code: 'summer', discountPercent: '10', maxDiscount: '', minSubtotal: '0', startsAt: '2026-11-01T00:00:00+07:00', endsAt: '2026-12-01T00:00:00+07:00', maxUses: '100', perUserLimit: '1', categoryId: '', listingId: '' };
  const coupon = utils.buildAdminPayload('coupons', values);
  assert.equal(coupon.code, 'SUMMER'); assert.equal(coupon.maxDiscount, null);
  assert.equal(schemas.couponSchema.safeParse(coupon).success, true);
  for (const patch of [{ discountPercent: '101' }, { endsAt: values.startsAt }, { maxUses: '-1' }, { listingId: 'not-a-uuid' }]) assert.throws(() => utils.buildAdminPayload('coupons', { ...values, ...patch }));
  const customer = utils.buildAdminPayload('customers', { fullName: 'Customer Name', email: 'fixture@example.test', phoneNumber: '0123456789', role: 'admin' });
  assert.equal(schemas.customerSchema.safeParse(customer).success, true);
  assert.equal(Object.hasOwn(customer, 'role'), false);
});

test('revenue series aggregates providers, includes missing dates, and rejects invalid ranges', () => {
  const rows = [
    { day: '2026-10-01', gross_payments: '100', refunds: '0', provider: 'mock' },
    { day: '2026-10-01', gross_payments: '20', refunds: '10', provider: 'stripe_test' },
    { day: '2026-10-03', gross_payments: '0', refunds: '25', provider: 'mock' },
  ];
  const series = utils.revenueSeries(rows, '2026-10-01', '2026-10-03');
  assert.deepEqual(series.map(r => [r.gross, r.refunds]), [[120, 10], [0, 0], [0, 25]]);
  assert.ok(utils.validateReportRange('2026-02-31', '2026-03-05'));
  assert.ok(utils.validateReportRange('2026-10-02', '2026-10-01'));
  assert.ok(utils.validateReportRange('2020-01-01', '2026-10-01'));
  assert.equal(utils.validateReportRange('2026-10-01', '2026-10-01'), null);
});

test('booking action eligibility follows terminal states and UTC check-in/out dates', () => {
  assert.deepEqual(utils.bookingActions({ booking_status: 'cancelled' }, '2026-10-30'), { confirm: false, complete: false, cancel: false });
  assert.equal(utils.bookingActions({ booking_status: 'confirmed', check_in_date: '2026-10-30', check_out_date: '2026-11-01' }, '2026-10-30').cancel, false);
  assert.equal(utils.bookingActions({ booking_status: 'confirmed', check_in_date: '2026-10-27', check_out_date: '2026-10-30' }, '2026-10-30').complete, true);
});

test('server rejects unsupported image content, encoding and oversized uploads', () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
  assert.equal(image.decodeAdminImage(png.toString('base64'), 'image/png').extension, 'png');
  for (const [value, mime] of [[png.toString('base64'), 'image/jpeg'], [Buffer.from('<svg/>').toString('base64'), 'image/svg+xml'], ['%%%%', 'image/png'], [Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64'), 'image/png']]) {
    assert.throws(() => image.decodeAdminImage(value, mime), /image/i);
  }
});

test('admin SQL filters are parameterized and refund lists expose reconciliation context', async () => {
  const queries = [];
  const repository = load('../traveling-app-backend/src/repositories/admin.repository.ts', {
    '../config/database': { pool: { query: async (sql, params) => { queries.push({ sql, params: [...params] }); return { rows: sql.startsWith('SELECT count') ? [{ n: 1 }] : [{ id }] }; } } },
    '../config/supabase': { supabaseAdmin: {} }, '../config/env': { ENV: {} }, '../types': types,
    '../services/transaction': { transaction: () => { throw new Error('Unexpected write'); } }, './booking.repository': { audit: () => undefined },
  });
  const city = "Bali' OR 1=1 --";
  await repository.adminRepository.list('listings', { q: 'stay', categoryId: id, city, isActive: 'false', page: 2, limit: 12 });
  const select = queries.at(-1);
  assert.ok(select.sql.includes('x.category_id=$3') && select.sql.includes('x.city ILIKE $4'));
  assert.equal(select.sql.includes(city), false); assert.deepEqual(select.params, ['%stay%', false, id, `%${city}%`, 12, 12]);
  await repository.adminRepository.list('refunds', { page: 1, limit: 12 });
  assert.ok(queries.at(-1).sql.includes('b.booking_code') && queries.at(-1).sql.includes('p.is_simulated'));
});

test('backend admin guard rejects anonymous, customer and host accounts', () => {
  const middleware = load('../traveling-app-backend/src/middlewares/auth.middleware.ts', {
    '../config/supabase': { supabaseAdmin: {} }, '../config/database': { pool: {} }, '../types': types,
  });
  for (const role of [undefined, 'guest', 'customer', 'host']) {
    let result;
    middleware.requireAdmin({ user: role ? { id, role } : undefined }, {}, error => { result = error; });
    assert.equal(result.statusCode, role ? 403 : 401);
  }
  let result = 'not-called';
  middleware.requireAdmin({ user: { id, role: 'admin' } }, {}, error => { result = error; });
  assert.equal(result, undefined);
});
