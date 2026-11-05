const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Run the real hook with deterministic React state/effect scheduling.
function harness(help) {
  const slots = [], effects = [];
  let cursor = 0, dirty = false, current, identity = [undefined, null];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => {
        slots[index] = typeof value === 'function' ? value(slots[index]) : value;
        dirty = true;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ?? (slots[index] = { current: initial });
    },
    useEffect(fn, deps) {
      const index = cursor++, previous = slots[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[index] = { deps, cleanup: fn() };
        });
      }
    },
  };
  const filename = path.resolve(__dirname, '../src/components/ai/useAiChat.ts');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, {
    exports, AbortController,
    require(name) {
      if (name === 'react') return react;
      if (name === '../../services/ai') return { aiChat: help };
      if (name === 'axios') return { isAxiosError: value => !!value?.isAxiosError };
      throw new Error(`Unexpected dependency ${name}`);
    },
  }, { filename });
  function render(nextIdentity = identity) {
    identity = nextIdentity;
    do {
      dirty = false; cursor = 0;
      current = exports.useAiChat(...identity);
      while (effects.length) effects.shift()();
    } while (dirty);
    return current;
  }
  render();
  return {
    get chat() { return render(); }, render,
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const answer = {
  mode: 'ai', answer: 'Read the cancellation policy before confirming.',
  sourceRefs: [{ type: 'article', id: 'cancel-booking', title: 'Cancellation policy' }],
  fetchedAt: '2026-11-05T10:00:00Z',
};

test('guest chat sends one request, blocks duplicate taps and retains verified sources', async () => {
  const request = deferred(), calls = [];
  const h = harness((...args) => { calls.push(args); return request.promise; });
  h.chat.setDraft('  Can I cancel?  ');
  const first = h.chat.send(), duplicate = h.chat.send('Duplicate question');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'Can I cancel?');
  assert.equal(calls[0][1], undefined);
  assert.ok(calls[0][2] instanceof AbortSignal);
  assert.equal(h.chat.busy, true);
  request.resolve(answer);
  await Promise.all([first, duplicate]);
  assert.equal(h.chat.busy, false);
  assert.equal(h.chat.turns.length, 1);
  assert.equal(h.chat.turns[0].result, answer);
});

test('network errors preserve the question and retry does not duplicate a turn', async () => {
  let count = 0;
  const h = harness(async () => { if (++count === 1) throw new Error('offline'); return answer; });
  await h.chat.send('How do refunds work?');
  assert.equal(h.chat.draft, 'How do refunds work?');
  assert.equal(h.chat.turns.length, 0);
  assert.ok(h.chat.error);
  await h.chat.send();
  assert.equal(h.chat.turns.length, 1);
  assert.equal(h.chat.error, '');
});

test('closing aborts the request, restores the draft and ignores a late reply', async () => {
  const request = deferred(); let signal;
  const h = harness((_, __, value) => { signal = value; return request.promise; });
  const work = h.chat.send('Payment question');
  h.chat.cancel();
  assert.equal(signal.aborted, true);
  assert.equal(h.chat.busy, false);
  assert.equal(h.chat.draft, 'Payment question');
  request.resolve(answer); await work;
  assert.equal(h.chat.turns.length, 0);
  assert.equal(h.chat.error, '');
});

test('account changes clear completed chat and abort an in-flight response', async () => {
  const request = deferred(); let count = 0, signal;
  const h = harness((_, __, value) => { signal = value; return ++count === 1 ? Promise.resolve(answer) : request.promise; });
  h.render(['user-a', 'token-a']);
  await h.chat.send('First account question');
  const pending = h.chat.send('Private account question');
  h.render(['user-b', 'token-b']);
  assert.equal(signal.aborted, true);
  assert.equal(h.chat.turns.length, 0);
  assert.equal(h.chat.draft, '');
  request.resolve(answer); await pending;
  assert.equal(h.chat.turns.length, 0);
});

test('unmount cancels work, and a stale finally cannot end a newer request', async () => {
  const old = deferred(), fresh = deferred(); let count = 0, signal;
  const h = harness((_, __, value) => { signal = value; return ++count === 1 ? old.promise : fresh.promise; });
  const first = h.chat.send('Old question'); h.chat.cancel();
  const second = h.chat.send('New question');
  old.resolve(answer); await first;
  assert.equal(h.chat.busy, true);
  assert.equal(h.chat.turns[0].question, 'New question');
  h.unmount(); assert.equal(signal.aborted, true);
  fresh.resolve(answer); await second;
});

test('invalid questions do not hit the API and malformed responses remain retryable', async () => {
  let count = 0;
  const h = harness(async () => { count++; return { ...answer, sourceRefs: null }; });
  await h.chat.send('  '); await h.chat.send('a'); await h.chat.send('x'.repeat(801));
  assert.equal(count, 0);
  await h.chat.send('Valid question');
  assert.ok(h.chat.error);
  assert.equal(h.chat.turns.length, 0);
  assert.equal(h.chat.draft, 'Valid question');
});

test('fallback remains labeled honestly and conversation memory is bounded', async () => {
  const fallback = { ...answer, mode: 'fallback' };
  const h = harness(async () => fallback);
  for (let i = 0; i < 12; i++) await h.chat.send(`Question ${i}`);
  assert.equal(h.chat.turns.length, 10);
  assert.equal(h.chat.turns[0].question, 'Question 2');
  assert.equal(h.chat.turns[9].result.mode, 'fallback');
});

test('the next question carries only a single verified listing context', async () => {
  const calls = [];
  const listing = { ...answer, mode: 'data', sourceRefs: [{ type: 'listing', id: 'listing-1', title: 'Room details' }] };
  const h = harness(async (...args) => { calls.push(args); return listing; });
  await h.chat.send('Balian Treehouse');
  await h.chat.send('price please');
  assert.equal(calls[0][1], undefined);
  assert.equal(calls[1][1], 'listing-1');
  h.render(['another-user', 'another-token']);
  await h.chat.send('price please');
  assert.equal(calls[2][1], undefined);
});

test('multiple listing suggestions never become an arbitrary current room', async () => {
  const calls = [];
  const h = harness(async (...args) => {
    calls.push(args);
    return { ...answer, mode: 'data', sourceRefs: ['one', 'two'].map(id => ({ type: 'listing', id, title: id })) };
  });
  await h.chat.send('camping'); await h.chat.send('price please');
  assert.equal(calls[1][1], undefined);
});

test('recommendation follow-ups carry structured criteria and clear on a new identity', async () => {
  const calls = [], context = { categorySlug: 'camping', checkIn: '2026-05-12' };
  const h = harness(async (...args) => { calls.push(args); return { ...answer, mode: 'data', sourceRefs: [], searchContext: context }; });
  await h.chat.send('muon dat camping ngay 12/5/2026');
  await h.chat.send('goi y cho toi phong');
  assert.equal(calls[0][3], undefined); assert.equal(calls[1][3], context);
  h.render(['different-account', 'new-token']);
  await h.chat.send('goi y phong'); assert.equal(calls[2][3], undefined);
});

test('malformed context is not kept as the next search criteria', async () => {
  const h = harness(async () => ({ ...answer, searchContext: ['invalid'] }));
  await h.chat.send('camping'); assert.ok(h.chat.error); assert.equal(h.chat.turns.length, 0);
});
