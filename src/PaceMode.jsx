import { useState, useEffect } from 'react';
import { pace, pageCount, formatLeft, PACE_PRESETS } from './pace.js';
import './PaceMode.css';

const STORE_KEY = 'clock.pace';
const DEFAULT_CUSTOM = { questions: 50, minutes: 12, perPage: 5 };

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function customPreset({ questions, minutes, perPage }) {
  const q = Math.round(Number(questions));
  const ms = Math.round(Number(minutes) * 60 * 1000);
  const p = Math.round(Number(perPage));
  if (!(q >= 1 && ms >= 1000 && p >= 1)) return null;
  return { id: 'custom', label: 'Custom', questions: q, totalMs: ms, perPage: p };
}

function presetLabel(p) {
  return `${p.label} · ${p.questions}q ${p.totalMs / 60000}m`;
}

// Paces a timed test: where you should be, from the time alone. Silent by design.
export default function PaceMode({ onRunningChange }) {
  const [saved] = useState(load);
  const [presetId, setPresetId] = useState(saved.presetId || 'sample');
  const [custom, setCustom] = useState({ ...DEFAULT_CUSTOM, ...saved.custom });
  const [startedAt, setStartedAt] = useState(saved.startedAt || null);
  const [now, setNow] = useState(() => Date.now());
  const [resetArmed, setResetArmed] = useState(false);

  const preset = presetId === 'custom'
    ? customPreset(custom)
    : PACE_PRESETS.find(p => p.id === presetId) || PACE_PRESETS[0];
  const running = startedAt !== null;
  const elapsed = running ? now - startedAt : 0;
  const r = preset ? pace(elapsed, preset) : null;
  const done = running && r?.done;

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ presetId, custom, startedAt }));
    } catch {
      // No storage (private window): the run just won't survive a reload.
    }
  }, [presetId, custom, startedAt]);

  useEffect(() => {
    onRunningChange?.(running);
  }, [running, onRunningChange]);

  // Elapsed comes from the start timestamp, so a throttled timer only delays the redraw.
  useEffect(() => {
    if (!running || !preset) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(() => {
      tick();
      if (Date.now() - startedAt >= preset.totalMs) clearInterval(id);
    }, 100);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [running, startedAt, preset?.totalMs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!resetArmed) return;
    const id = setTimeout(() => setResetArmed(false), 3000);
    return () => clearTimeout(id);
  }, [resetArmed]);

  function start() {
    const t = Date.now();
    setNow(t);
    setStartedAt(t);
  }

  function reset() {
    // A mid-run reset takes a second click, so a stray click can't wipe the run.
    if (!done && !resetArmed) {
      setResetArmed(true);
      return;
    }
    setResetArmed(false);
    setStartedAt(null);
  }

  const state = !running ? 'idle' : done ? 'over' : r.warn ? 'warn' : 'ok';
  const segs = r ? Array.from({ length: r.segments }, (_, i) => i + 1) : [];

  function segFill(j) {
    if (!running) return 0;
    if (done || j < r.segment) return 1;
    if (j > r.segment) return 0;
    return Math.min(1, r.pageFill * r.segments - (j - 1));
  }

  return (
    <div className={`pace pace-${state}`}>
      <div className="pace-track" style={{ gridTemplateRows: `repeat(${segs.length || 1}, 1fr)` }}>
        {segs.map(j => {
          // Q1 on top, filling downwards, the way the eyes move through the page.
          const gridRow = j; // explicit, so hiding the labels can't re-flow the bar
          const where = !running ? 'future' : j < r.segment || done ? 'past' : j === r.segment ? 'current' : 'future';
          return [
            <div key={`s${j}`} className={`pace-seg pace-seg-${where}`} style={{ gridRow, gridColumn: 1 }}>
              <div className="pace-fill" style={{ height: `${segFill(j) * 100}%` }} />
            </div>,
            <div key={`q${j}`} className={`pace-q pace-q-${where}`} style={{ gridRow, gridColumn: 2 }}>
              Q{r.firstQuestion + j - 1}{where === 'current' && !done ? ' ◀' : ''}
            </div>,
          ];
        })}
      </div>

      <div className="pace-readouts">
        <div className="pace-read pace-total">
          <span className="pace-v">{r ? formatLeft(r.totalLeftMs) : '–:––'}</span>
          <span className="pace-l">{done ? 'time up' : 'left'}</span>
        </div>
        {r && (
          <>
            <div className="pace-read pace-pageleft">
              <span className="pace-v">{formatLeft(r.pageLeftMs)}</span>
              <span className="pace-l">on this page</span>
            </div>
            <div className="pace-read pace-page">
              <span className="pace-v">{r.page} / {r.pages}</span>
              <span className="pace-l">page</span>
            </div>
            <div className="pace-read pace-pagesleft">
              <span className="pace-v">{r.pagesLeft}</span>
              <span className="pace-l">{r.pagesLeft === 1 ? 'page left' : 'pages left'}</span>
            </div>
          </>
        )}

        <div className="pace-controls">
          {running ? (
            <button className={resetArmed ? 'armed' : ''} onClick={reset}>
              {resetArmed ? 'Sure?' : 'Reset'}
            </button>
          ) : (
            <>
              <div className="pace-row">
                <select value={presetId} onChange={e => setPresetId(e.target.value)} aria-label="Test">
                  {PACE_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{presetLabel(p)}</option>
                  ))}
                  <option value="custom">Custom…</option>
                </select>
                <button onClick={start} disabled={!preset}>Start</button>
              </div>
              {presetId === 'custom' && (
                <div className="pace-row pace-custom">
                  {[['questions', 'q'], ['minutes', 'min'], ['perPage', '/pg']].map(([k, unit]) => (
                    <label key={k}>
                      <input
                        type="number" min="1" step={k === 'minutes' ? 'any' : 1}
                        value={custom[k]}
                        onChange={e => setCustom(c => ({ ...c, [k]: e.target.value }))}
                      />
                      {unit}
                    </label>
                  ))}
                </div>
              )}
              {preset && (
                <div className="pace-summary">
                  {pageCount(preset)} pages · {+(preset.totalMs / preset.questions / 1000).toFixed(1)} s a question
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
