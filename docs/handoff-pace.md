# Handoff: Pace mode

**Written 2026-09-25** on M16, at the end of an Angel session. Start a new session here,
in `~/workspace/iantalabs/clock`. Replies from that session go to the **clock** Matrix
room, in threads (see [Session setup](#session-setup)).

The ask: a third mode beside **Clock** and **Stopwatch** that paces a timed online test.
It's a local page in its own narrow window, **beside** the test, never on it.

---

## What it is for

The PI Cognitive Assessment and tests like it: a fixed number of questions, **5 per
page**, against one overall time limit. The operator already uses this app the right
way: `dist/index.html` open as a local file, in a second browser window next to the
test. The first real run will be the free sample at `cogsample.predictiveindex.com`.

| Preset                   | Questions | Time   | Pages | Per page | Per question |
| ------------------------ | --------- | ------ | ----- | -------- | ------------ |
| **Sample**               | 20        | 5 min  | 4     | 75 s     | 15 s |
| **Cognitive Assessment** | 50        | 12 min | 10    | 72 s     | 14.4 s |

Questions per page and the total time are what's actually configured. Everything else is
derived from them. Keep a custom option (questions, minutes, per page) for other tests.

## What it looks like

```text
 ┌──┐
 │▓▓│ Q11       11:48   left overall
 │▓▓│ Q12       page 3 / 10
 │▓▓│ Q13 ◀ now 0:31    left on this page
 │  │ Q14       7 pages left
 │  │ Q15
 └──┘
```

- **The bar** runs the full height of the window, on the left, split into **5 segments**
  (one per question on the page). The page's first question is on top, and the bar fills
  top to bottom over one page's time, the way the eyes move down the page's questions;
  then it starts again for the next page. The current segment is highlighted.
- **The readouts** sit to the right of the bar: total time left (the biggest), time left
  on this page, page *N / P*, pages left.
- **Colour** in clock's existing palette (salmon on dark): on pace, then a warning in
  the last segment, then overrun. The look to borrow is Angel's hold-time bars in
  `../angel/Angel Mac/IntervalWorkoutView.swift`. Borrow the idea only. It's Swift, and
  the arithmetic here is two divisions.

The operator's own sketch matched this closely. Treat the layout as agreed, and the
narrow-column behaviour below as the requirement.

## The requirement: it stays readable in a narrow column

The window sits beside the test, and the test gets the width. In the reference
screenshot the test takes about 1070 px and this app about 650 px. Expect it to be made
much narrower than that.

1. **The bar and total time left never disappear**, at any width or height.
2. **The bar is full height at every width.** Use `100dvh` minus a small margin, with its
   width as `clamp()` against the viewport, so it thins down but doesn't vanish.
3. **The readouts scale down before they drop.** Use container query units or `clamp()`
   font sizes. When space runs out, drop in this order: pages left first, then page
   *N / P*, then time left on page. Total time left always stays.
4. **Digits never wrap and never cause horizontal scroll.** Use `white-space: nowrap`
   and `font-variant-numeric: tabular-nums`, so the digits don't jitter as they change.
   Commit `ec0cea4` already makes clock's digits scale with width; extend that.
5. **The bottom Clock / Stopwatch switch must shrink in Pace mode.** In the screenshot
   those two buttons take roughly a fifth of the window's height. In Pace mode make
   them a small strip, or hide them while a run is going.
6. **Controls (start, reset, preset) collapse too.** At narrow widths, a single row of
   small buttons or one menu.

**Check at these widths:** 650, 320, 240 and 180 px, plus a short window of about
500 px high. It isn't done until all of the requirements above hold at 180 px.

## How it knows the time, and the page

**v1 is time-driven and takes no input.** The expected page is
`floor(elapsed / perPage) + 1`, and the bar shows the position within the current page.
It tells you where you *should* be; you know where you are. This is the first thing to
build, and it's complete on its own.

**Derive elapsed from a start timestamp** (`Date.now() - startedAt`), not by adding up
animation-frame deltas the way the stopwatch does. A window that isn't focused, or is
covered, gets its `requestAnimationFrame` throttled. Summed deltas then fall behind,
while a timestamp can't.

**v2 is optional: mark each page turn with a keypress,** then show ahead or behind in
seconds. The catch is focus. Clicking this window takes focus from the test. The clean
answer is an **extension keyboard shortcut** (`commands` in the manifest, rebindable at
`brave://extensions/shortcuts`). It fires while the browser is focused, including in the
test window, and needs **no access to the test page**. That only works if the pace page
is an *extension page* (`chrome-extension://…/pace.html`) opened in its own window,
because a `file://` page can't receive the extension's messages. So v2 means shipping
the pace page inside the extension. v1 doesn't need that.

## Rules

1. **Never touch the test page.** No content script on the test's site, and no reading
   its DOM. The overlay extension's manifest matches only localhost and YouTube; keep it
   that way. Staying off the test page is the reason this is a separate window.
2. **Silent.** No sound or speech; a test is taken in a quiet room, sometimes with the
   microphone on.
3. **Test the arithmetic, not the UI.** A pure function
   `pace(elapsedMs, preset) → { page, segment, pageLeftMs, totalLeftMs, pagesLeft, done }`
   with `node --test` cases: both presets at the start, at page boundaries, in the last
   second, and after time runs out.
4. **It still builds to one file.** `npm run build` must still produce the single
   `dist/index.html`. That's how it gets used.

## Why here, not a new repo

Considered: a new `iantalabs/ontime` repo. Not taken, because this is the same app with
one more mode. Same React and Vite stack, same single-file delivery, same timer code and
look, and the operator already uses it in exactly this side-by-side way. A separate repo
would start by copying all of that. `ontime` stays reserved for a native Mac app, if
one is ever wanted: a floating window that also works beside Zoom or Teams, reusing
Angel's Swift code.

## Order of work

1. `pace()`, with its tests.
2. Pace mode in `App.jsx`: presets, start and reset, the bar and readouts. The file is
   143 lines with the two modes inline, so give Pace mode its own component file.
3. The narrow-column behaviour, checked at the four widths.
4. A real run of the sample test side by side, at about 240 px wide.
5. *(optional)* v2: the extension page and the shortcut.

**Done when** the sample test has been taken with Pace mode open in a window 240 px wide
or narrower, every readout stayed visible, and `dist/index.html` is rebuilt and
committed.

## Session setup

- **Room:** `clock`, `!oFzyTbjJnPmBcgXBuF:saltm.w3ai.org`, unencrypted. `@claude` joined
  on 2026-09-25.
- **On M16:** mapped in `~/.claude/matrix-post.json` and **armed**, so every response in
  this repo posts to a per-session thread in that room.
- **On STD:** neither is done. Add
  `"iantalabs/clock": { "room": "!oFzyTbjJnPmBcgXBuF:saltm.w3ai.org", "thread": true }` to
  `~/.claude/matrix-post.json` under `rooms`, then run
  `node ~/workspace/iantalabs/ncol/tools/matrix-post/post.mjs --arm` from this repo.
  `--status` confirms both.
- The repo has no CLAUDE.md. The Markdown table style is: short columns padded to line
  up, the long column left ragged (see ncol todo #9).
