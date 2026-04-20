
import { useState, useEffect, useRef } from 'react';
import './App.css';

function pad(num, len = 2) {
  return num.toString().padStart(len, '0');
}

function getCurrentTime() {
  const now = new Date();
  return {
    hours: pad(now.getHours()),
    minutes: pad(now.getMinutes()),
    seconds: pad(now.getSeconds()),
  };
}

function formatStopwatch(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    minutes: pad(minutes),
    seconds: pad(seconds),
  };
}

const STOPWATCH_PRESETS = [
  { label: '30s', ms: 30 * 1000 },
  { label: '1min', ms: 60 * 1000 },
  { label: '3min', ms: 3 * 60 * 1000 },
];

function App() {
  const [mode, setMode] = useState('clock'); // 'clock' | 'stopwatch'

  // Clock state
  const [time, setTime] = useState(getCurrentTime());
  const clockRafRef = useRef();

  // Stopwatch state
  const [swMs, setSwMs] = useState(0); // elapsed time
  const [swDurationMs, setSwDurationMs] = useState(0); // countdown target duration
  const [swRunning, setSwRunning] = useState(false);
  const swLastRef = useRef(null);
  const swRafRef = useRef();

  // Clock effect
  useEffect(() => {
    if (mode !== 'clock') return;
    let lastSec = time.seconds;
    function update() {
      const now = new Date();
      const sec = pad(now.getSeconds());
      if (sec !== lastSec) {
        setTime(getCurrentTime());
        lastSec = sec;
      }
      clockRafRef.current = requestAnimationFrame(update);
    }
    clockRafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(clockRafRef.current);
    // eslint-disable-next-line
  }, [mode]);

  // Stopwatch effect
  useEffect(() => {
    if (mode !== 'stopwatch' || !swRunning) return;
    let last = performance.now();
    function update(now) {
      setSwMs(ms => {
        const delta = now - last;
        last = now;
        const newMs = ms + delta;
        // Stop if countdown reaches zero
        if (swDurationMs > 0 && newMs >= swDurationMs) {
          setSwRunning(false);
          return swDurationMs;
        }
        return newMs;
      });
      swRafRef.current = requestAnimationFrame(update);
    }
    swRafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(swRafRef.current);
  }, [mode, swRunning, swDurationMs]);

  // Reset stopwatch when switching modes
  useEffect(() => {
    if (mode !== 'stopwatch') {
      setSwRunning(false);
      setSwMs(0);
    }
  }, [mode]);

  // UI
  return (
    <div className="clock-app">
      <div className="clock-center-classic">
        {mode === 'clock' && (
          <div className="clock-digits">
            <span className="clock-hour">{time.hours}</span>
            <span className="clock-colon">:</span>
            <span className="clock-minute">{time.minutes}</span>
          </div>
        )}
        {mode === 'stopwatch' && (
          <div className="stopwatch-container">
            <div className="clock-digits stopwatch">
              <span className="clock-minute">{formatStopwatch(swDurationMs > 0 ? swDurationMs - swMs : swMs).minutes}</span>
              <span className="clock-colon">:</span>
              <span className="clock-second">{formatStopwatch(swDurationMs > 0 ? swDurationMs - swMs : swMs).seconds}</span>
            </div>
            <div className="stopwatch-controls">
              <button onClick={() => setSwRunning(r => !r)}>
                {swRunning ? 'Pause' : 'Start'}
              </button>
              <button onClick={() => { setSwMs(0); setSwDurationMs(0); setSwRunning(false); }}>
                Reset
              </button>
              {STOPWATCH_PRESETS.map(preset => (
                <button key={preset.label} onClick={() => { setSwMs(0); setSwDurationMs(preset.ms); setSwRunning(false); }}>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mode-switch-bottom">
        <button
          className={mode === 'clock' ? 'active' : ''}
          onClick={() => setMode('clock')}
        >Clock</button>
        <button
          className={mode === 'stopwatch' ? 'active' : ''}
          onClick={() => setMode('stopwatch')}
        >Stopwatch</button>
      </div>
    </div>
  );
}

export default App;
