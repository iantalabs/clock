import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pace, pageCount, formatLeft, PACE_PRESETS } from './pace.js';

const [SAMPLE, PI] = PACE_PRESETS;
const s = sec => sec * 1000;

// The fields the handoff asks for, to keep the expectations short.
function core(r) {
  const { page, segment, pageLeftMs, totalLeftMs, pagesLeft, done } = r;
  return { page, segment, pageLeftMs, totalLeftMs, pagesLeft, done };
}

test('presets derive the handoff table', () => {
  assert.equal(pageCount(SAMPLE), 4);
  assert.equal(SAMPLE.totalMs / pageCount(SAMPLE), s(75));
  assert.equal(SAMPLE.totalMs / SAMPLE.questions, s(15));
  assert.equal(pageCount(PI), 10);
  assert.equal(PI.totalMs / pageCount(PI), s(72));
  assert.equal(PI.totalMs / PI.questions, s(14.4));
});

test('sample: at the start', () => {
  const r = pace(0, SAMPLE);
  assert.deepEqual(core(r), {
    page: 1, segment: 1, pageLeftMs: s(75), totalLeftMs: s(300), pagesLeft: 3, done: false,
  });
  assert.equal(r.pageFill, 0);
  assert.equal(r.warn, false);
});

test('sample: page boundaries', () => {
  assert.deepEqual(core(pace(s(75) - 1, SAMPLE)), {
    page: 1, segment: 5, pageLeftMs: 1, totalLeftMs: s(225) + 1, pagesLeft: 3, done: false,
  });
  assert.deepEqual(core(pace(s(75), SAMPLE)), {
    page: 2, segment: 1, pageLeftMs: s(75), totalLeftMs: s(225), pagesLeft: 2, done: false,
  });
  assert.deepEqual(core(pace(s(225), SAMPLE)), {
    page: 4, segment: 1, pageLeftMs: s(75), totalLeftMs: s(75), pagesLeft: 0, done: false,
  });
});

test('sample: segment boundaries within a page', () => {
  assert.equal(pace(s(15) - 1, SAMPLE).segment, 1);
  assert.equal(pace(s(15), SAMPLE).segment, 2);
  assert.equal(pace(s(60) - 1, SAMPLE).warn, false);
  assert.equal(pace(s(60), SAMPLE).segment, 5);
  assert.equal(pace(s(60), SAMPLE).warn, true);
  assert.equal(pace(s(90), SAMPLE).pageFill, 0.2);
});

test('sample: the last second', () => {
  const r = pace(s(299), SAMPLE);
  assert.deepEqual(core(r), {
    page: 4, segment: 5, pageLeftMs: s(1), totalLeftMs: s(1), pagesLeft: 0, done: false,
  });
  assert.equal(r.warn, true);
  assert.equal(pace(s(300) - 1, SAMPLE).done, false);
});

test('sample: after time runs out', () => {
  for (const ms of [s(300), s(301), s(3600)]) {
    const r = pace(ms, SAMPLE);
    assert.deepEqual(core(r), {
      page: 4, segment: 5, pageLeftMs: 0, totalLeftMs: 0, pagesLeft: 0, done: true,
    });
    assert.equal(r.pageFill, 1);
    assert.equal(r.warn, false);
  }
});

test('PI: at the start', () => {
  assert.deepEqual(core(pace(0, PI)), {
    page: 1, segment: 1, pageLeftMs: s(72), totalLeftMs: s(720), pagesLeft: 9, done: false,
  });
});

test('PI: page boundaries', () => {
  assert.deepEqual(core(pace(s(72) - 1, PI)), {
    page: 1, segment: 5, pageLeftMs: 1, totalLeftMs: s(648) + 1, pagesLeft: 9, done: false,
  });
  assert.deepEqual(core(pace(s(72), PI)), {
    page: 2, segment: 1, pageLeftMs: s(72), totalLeftMs: s(648), pagesLeft: 8, done: false,
  });
  // Page 3 of 10 with 7 pages left, as in the handoff sketch.
  assert.deepEqual(core(pace(s(144) + s(14.4) * 2, PI)), {
    page: 3, segment: 3, pageLeftMs: s(72) - s(28.8), totalLeftMs: s(720) - s(172.8),
    pagesLeft: 7, done: false,
  });
  assert.deepEqual(core(pace(s(648), PI)), {
    page: 10, segment: 1, pageLeftMs: s(72), totalLeftMs: s(72), pagesLeft: 0, done: false,
  });
});

test('PI: 14.4 s questions split cleanly', () => {
  assert.equal(pace(s(14.4) - 1, PI).segment, 1);
  assert.equal(pace(s(14.4), PI).segment, 2);
  assert.equal(pace(s(57.6), PI).segment, 5);
});

test('PI: the last second', () => {
  const r = pace(s(719), PI);
  assert.deepEqual(core(r), {
    page: 10, segment: 5, pageLeftMs: s(1), totalLeftMs: s(1), pagesLeft: 0, done: false,
  });
  assert.equal(r.warn, true);
});

test('PI: after time runs out', () => {
  assert.deepEqual(core(pace(s(720), PI)), {
    page: 10, segment: 5, pageLeftMs: 0, totalLeftMs: 0, pagesLeft: 0, done: true,
  });
  assert.deepEqual(core(pace(s(10000), PI)).done, true);
});

test('negative elapsed reads as the start', () => {
  assert.deepEqual(core(pace(-500, PI)), core(pace(0, PI)));
});

test('custom: a short last page gets its share of the time', () => {
  // 12 questions, 5 per page, 12 min: 1 min per question, pages of 5, 5, 2.
  const custom = { questions: 12, totalMs: s(720), perPage: 5 };
  assert.equal(pageCount(custom), 3);
  const r = pace(s(600), custom);
  assert.deepEqual(core(r), {
    page: 3, segment: 1, pageLeftMs: s(120), totalLeftMs: s(120), pagesLeft: 0, done: false,
  });
  assert.equal(r.segments, 2);
  assert.equal(r.firstQuestion, 11);
  assert.equal(pace(s(660), custom).warn, true);
});

test('formatLeft rounds up and pads', () => {
  assert.equal(formatLeft(s(720)), '12:00');
  assert.equal(formatLeft(s(708)), '11:48');
  assert.equal(formatLeft(s(31) - 200), '0:31');
  assert.equal(formatLeft(1), '0:01');
  assert.equal(formatLeft(0), '0:00');
  assert.equal(formatLeft(-5), '0:00');
});
