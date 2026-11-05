// Disposable PostgreSQL and mocked authentication/delivery only; never reads .env.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { createServer } = require('node:net');
const assert = require('node:assert/strict');
const backend = path.resolve(__dirname, '..');
if (!process.argv.includes('--fixture-child')) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'traveling-notifications-'));
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^(DATABASE_|SUPABASE_|STRIPE_|MOCK_|PAYMENT_|BOOKING_|CANCELLATION_|EMAIL_|AI_|OPENAI_|GEMINI_|TAX_RATE$|PG)/i.test(key)) delete env[key];
  const child = spawnSync(process.execPath, [__filename, '--fixture-child'], { cwd: temp, env, stdio: 'inherit', windowsHide: true });
  process.exitCode = child.status === 0 && fs.existsSync(path.join(temp, 'notifications-results.json')) ? 0 : 1;
  console.log('Disposable notification fixture: ' + temp);
} else main().catch(error => { console.error(error); process.exitCode = 1; });

async function main() {
  if (fs.existsSync('.env')) throw new Error('Do not run against a developer environment.');
  const net = createServer(); await new Promise(resolve => net.listen(0, '127.0.0.1', resolve));
  const port = net.address().port; await new Promise(resolve => net.close(resolve));
  const EmbeddedPostgres = require('embedded-postgres').default;
  const password = randomUUID();
  const db = new EmbeddedPostgres({ databaseDir: path.resolve('pgdata'), user: 'test_owner', password, port, persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'], onLog() {}, onError() {} });
  const results = []; let client, pool, server;
  const check = async (name, fn) => { await fn(); results.push(name); console.log('PASS ' + name); };
  try {
    await db.initialise(); await db.start(); client = db.getPgClient('postgres', '127.0.0.1'); await client.connect();
    await client.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}'::jsonb); CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid); CREATE TABLE auth.refresh_tokens(id bigserial PRIMARY KEY,user_id text)");
    await client.query(fs.readFileSync(path.join(backend, '../database/schema.sql'), 'utf8'));
    const migrations = path.join(backend, '../database/migrations');
    for (const file of fs.readdirSync(migrations).filter(name => /^(00[1-8]_|014_|015_).*\.sql$/.test(name)).sort()) await client.query(fs.readFileSync(path.join(migrations, file), 'utf8'));
    await client.query(fs.readFileSync(path.join(migrations, '015_inapp_notifications.sql'), 'utf8'));
    const ids = Object.fromEntries(['guest', 'other', 'admin', 'blocked', 'host'].map(name => [name, randomUUID()]));
    for (const [name, id] of Object.entries(ids)) await client.query('INSERT INTO auth.users(id,email) VALUES($1,$2)', [id, name + '@example.test']);
    await client.query("UPDATE users SET role='host' WHERE id=$1", [ids.host]);
    await client.query("UPDATE users SET role='admin' WHERE id=$1", [ids.admin]);
    await client.query("UPDATE users SET account_status='blocked' WHERE id=$1", [ids.blocked]);
    const category = (await client.query("INSERT INTO categories(name,slug,icon_name) VALUES('Fixture','fixture','bell') RETURNING id")).rows[0].id;
    const listing = (await client.query("INSERT INTO listings(host_id,category_id,title,city,country,region,price_per_night,max_guests,bedrooms,beds,bathrooms) VALUES($1,$2,'Fixture','Da Lat','Vietnam','Asia',25,2,1,1,1) RETURNING id", [ids.host, category])).rows[0].id;
    const booking = (await client.query("INSERT INTO bookings(booking_code,guest_id,listing_id,check_in_date,check_out_date,number_of_guests,price_per_night,total_price,payment_due_at) VALUES('TRV-NOTIFY',$1,$2,'2099-12-10','2099-12-12',2,25,50,now()+interval '15 minutes') RETURNING id", [ids.guest, listing])).rows[0].id;
    const mine = randomUUID(), foreign = randomUUID();
    for (const [id, user] of [[mine, ids.guest], [foreign, ids.other]]) await client.query("INSERT INTO notification_outbox(id,event_key,event_type,user_id,booking_id,recipient_email,payload,status,last_error) VALUES($1,$2,'payment_received',$3,$4,'private@example.test',$5,'failed','private provider error')", [id, 'notification:' + id, user, booking, JSON.stringify({ amount: 25, currency: 'USD', password: 'private payload' })]);
    const url = new URL(`postgresql://test_owner:${password}@127.0.0.1:${port}/postgres`); url.searchParams.set('options', '-c role=traveling_backend');
    Object.assign(process.env, { DATABASE_URL: url.toString(), DATABASE_SSL: 'disable', NODE_ENV: 'test', PAYMENT_MODE: 'disabled', EMAIL_MODE: 'disabled', AI_ENABLED: 'false', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'fixture-only' });
    const get = file => require(path.join(backend, 'dist', file)); pool = get('config/database.js').pool;
    const tokens = Object.fromEntries(Object.entries(ids).map(([name, id]) => [name, 'eyJhbGciOiJURVNUIn0.' + Buffer.from(JSON.stringify({ sub: id, iat: Math.floor(Date.now() / 1000) + 1 })).toString('base64url') + '.fixture']));
    get('config/supabase.js').supabaseAdmin.auth.getUser = async token => { const name = Object.keys(tokens).find(name => tokens[name] === token); return { data: { user: name ? { id: ids[name] } : null }, error: name ? null : { status: 401 } }; };
    server = get('app.js').createApp().listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
    const api = async (method, route, who, body, language) => { const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/notifications${route}`, { method, headers: { ...(who ? { Authorization: 'Bearer ' + tokens[who] } : {}), ...(language ? { 'Accept-Language': language } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') }; };
    await check('anonymous and blocked accounts cannot read notifications; no public database grant', async () => {
      assert.equal((await api('GET', '')).status, 401); assert.equal((await api('GET', '', 'blocked')).status, 403);
      await client.query('BEGIN'); try { await client.query('SET LOCAL ROLE anon'); await assert.rejects(client.query('SELECT read_at FROM notification_outbox'), error => error.code === '42501'); } finally { await client.query('ROLLBACK'); }
    });
    await check('list and counts belong to the caller; delivery payload and foreign booking links stay private', async () => {
      const own = await api('GET', '', 'guest'); assert.equal(own.status, 200); assert.match(own.cache, /private, no-store/);
      assert.equal(own.body.data.items[0].id, mine); assert.equal(own.body.data.items[0].bookingId, booking); assert.match(own.body.data.items[0].body, /25.00 USD/);
      assert.doesNotMatch(JSON.stringify(own.body), /private@example|private provider|private payload|recipient_email|last_error|event_key/);
      const other = await api('GET', '', 'other'); assert.equal(other.body.data.items[0].id, foreign); assert.equal(other.body.data.items[0].bookingId, null);
      assert.equal((await api('GET', '/unread-count', 'guest')).body.data.unreadCount, 1);
    });
    await check('single-read is owner-only and idempotent; email failure state is untouched', async () => {
      for (const who of ['other', 'admin']) assert.equal((await api('PATCH', '/' + mine + '/read', who, {})).status, 404);
      const first = await api('PATCH', '/' + mine + '/read', 'guest', {}), again = await api('PATCH', '/' + mine + '/read', 'guest', {});
      assert.equal(first.status, 200); assert.equal(first.body.data.readAt, again.body.data.readAt); assert.equal(first.body.data.unreadCount, 0);
      assert.equal((await client.query('SELECT status FROM notification_outbox WHERE id=$1', [mine])).rows[0].status, 'failed');
      assert.equal((await api('GET', '?unreadOnly=true', 'guest')).body.data.items.length, 0);
    });
    await check('notification language follows the request while amounts, IDs and ownership stay unchanged', async () => {
      const vi = await api('GET', '', 'guest', undefined, 'vi');
      const en = await api('GET', '', 'guest', undefined, 'en-US,en;q=0.9');
      assert.equal(en.body.data.items[0].title, 'Payment received'); assert.match(en.body.data.items[0].body, /25.00 USD/);
      assert.equal(vi.body.data.items[0].title, 'Đã ghi nhận thanh toán');
      assert.equal(en.body.data.items[0].id, vi.body.data.items[0].id);
      assert.equal(en.body.data.items[0].bookingId, vi.body.data.items[0].bookingId);
      assert.equal(en.body.data.items[0].readAt, vi.body.data.items[0].readAt);
    });
    await check('read-all honors a snapshot, isolates other users and is idempotent', async () => {
      const before = new Date(Date.now() - 1000).toISOString(), old = randomUUID(), fresh = randomUUID();
      for (const [id, created] of [[old, new Date(Date.now() - 2000).toISOString()], [fresh, new Date().toISOString()]]) await client.query("INSERT INTO notification_outbox(id,event_key,event_type,user_id,recipient_email,created_at) VALUES($1,$2,'booking_created',$3,'guest@example.test',$4)", [id, 'notification:' + id, ids.guest, created]);
      assert.equal((await api('PATCH', '/read-all', 'guest', { before })).status, 200);
      const rows = (await client.query('SELECT id,read_at FROM notification_outbox WHERE id=ANY($1::uuid[])', [[old, fresh]])).rows;
      assert.ok(rows.find(row => row.id === old).read_at); assert.equal(rows.find(row => row.id === fresh).read_at, null);
      assert.equal((await api('PATCH', '/read-all', 'guest', {})).body.data.unreadCount, 0);
      assert.equal((await api('PATCH', '/read-all', 'guest', {})).body.data.updated, 0);
      assert.equal((await api('GET', '/unread-count', 'other')).body.data.unreadCount, 1);
    });
    await check('pagination is stable and invalid filters/body impersonation are rejected', async () => {
      const first = await api('GET', '?limit=1', 'guest'), second = await api('GET', '?limit=1&page=2', 'guest');
      assert.equal(first.body.data.items.length, 1); assert.notEqual(first.body.data.items[0].id, second.body.data.items[0].id);
      assert.equal(first.body.pagination.total, 3); assert.equal(first.body.pagination.totalPages, 3);
      for (const route of ['?unreadOnly=wrong', '?limit=10000', '?userId=' + ids.other]) assert.equal((await api('GET', route, 'guest')).status, 400);
      assert.equal((await api('PATCH', '/read-all', 'guest', { userId: ids.other })).status, 400);
      assert.equal((await api('PATCH', '/' + mine + '/read', 'guest', { readAt: '2020-01-01' })).status, 400);
    });
    await check('reading an event does not prevent email delivery and sending does not reset read state', async () => {
      const { ENV } = get('config/env.js'); ENV.EMAIL_MODE = 'webhook';
      const dispatch = get('services/notification.service.js').dispatchNotifications;
      const result = await dispatch(20, async row => ({ messageId: 'fixture-' + row.id }));
      assert.ok(result.sent > 0);
      const row = (await client.query('SELECT read_at,status FROM notification_outbox WHERE id=$1', [mine])).rows[0];
      assert.ok(row.read_at); assert.equal(row.status, 'sent'); assert.equal((await api('GET', '/unread-count', 'guest')).body.data.unreadCount, 0);
    });
    fs.writeFileSync('notifications-results.json', JSON.stringify({ passed: results.length, tests: results, database: 'disposable PostgreSQL', realEmailDeliveries: 0 }));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve)); if (pool) await pool.end(); if (client) await client.end(); await db.stop();
  }
}
