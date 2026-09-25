// Pace arithmetic for a timed test: a fixed number of questions, a fixed number per
// page, one overall time limit. Pure, so it can be tested with `node --test`.

export const PACE_PRESETS = [
  { id: 'sample', label: 'PI sample', questions: 20, totalMs: 5 * 60 * 1000, perPage: 5 },
  { id: 'pi', label: 'PI Cognitive', questions: 50, totalMs: 12 * 60 * 1000, perPage: 5 },
];

export function pageCount(preset) {
  return Math.ceil(preset.questions / preset.perPage);
}

// Where you should be `elapsedMs` into the test. Every question gets the same share of
// the time, so a page is worth `perPage` shares (a short last page is worth fewer).
//   page       1-based page you should be on (stays on the last page once time is up)
//   segment    1-based question within that page
//   segments   questions on that page
//   pageFill   0..1, how far through the page's time you are
//   pageLeftMs time left on this page
//   totalLeftMs time left overall
//   pagesLeft  pages after this one
//   warn       in the last question of the page
//   done       time is up
export function pace(elapsedMs, preset) {
  const { questions, totalMs, perPage } = preset;
  const pages = pageCount(preset);
  const elapsed = Math.min(Math.max(elapsedMs, 0), totalMs);
  const done = elapsedMs >= totalMs;

  // Integer maths where possible: question index = floor(elapsed * questions / total).
  const q = Math.min(Math.floor((elapsed * questions) / totalMs), questions - 1);
  const page = Math.floor(q / perPage) + 1;
  const firstQ = (page - 1) * perPage;
  const segments = Math.min(perPage, questions - firstQ);
  const pageStart = (firstQ * totalMs) / questions;
  const pageEnd = ((firstQ + segments) * totalMs) / questions;

  return {
    page,
    pages,
    segment: q - firstQ + 1,
    segments,
    firstQuestion: firstQ + 1,
    pageFill: done ? 1 : (elapsed - pageStart) / (pageEnd - pageStart),
    pageLeftMs: pageEnd - elapsed,
    totalLeftMs: totalMs - elapsed,
    pagesLeft: pages - page,
    warn: !done && q - firstQ === segments - 1,
    done,
  };
}

// 11:48 style; rounds up so the display reads 0:00 only when time is really up.
export function formatLeft(ms) {
  const s = Math.ceil(Math.max(ms, 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
