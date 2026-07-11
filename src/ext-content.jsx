import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import appCss from './App.css?raw'

const HOST_ID = 'clock-ext-overlay'
const DEFAULT_W = 480
const DEFAULT_H = 320

let host = null
let root = null

function overlayCss() {
  return appCss + `
:host { display: block; }
.clock-app { width: 100%; height: 100%; background: rgba(17,17,17,0.85); border-radius: 8px; overflow: hidden; }
.mode-switch-bottom { padding: 8px 0; gap: 12px; background: transparent; width: 100%; }
.mode-switch-bottom button { height: 40px; font-size: 14px; min-width: 90px; padding: 0 12px; margin: 0 6px; }
.clock-center-classic { padding: 8px; }
.clock-digits { font-size: clamp(28px, 12vw, 88px); text-shadow: 0 6px 20px rgba(255,191,174,0.15); }
.clock-digits.stopwatch { font-size: clamp(28px, 12vw, 88px); }
.stopwatch-container { gap: 0.6rem; }
.stopwatch-controls { gap: 0.5rem; }
.stopwatch-controls button { font-size: 12px; padding: 4px 10px; }
`
}

function showOverlay() {
  if (host && host.isConnected) return
  host = document.getElementById(HOST_ID)
  if (host) return
  host = document.createElement('div')
  host.id = HOST_ID
  const vw = window.innerWidth || 1280
  const left = Math.max(0, vw - DEFAULT_W)
  Object.assign(host.style, {
    position: 'fixed',
    top: '0px',
    left: left + 'px',
    width: DEFAULT_W + 'px',
    height: DEFAULT_H + 'px',
    margin: '0',
    padding: '0',
    border: 'none',
    backgroundColor: 'transparent',
    zIndex: '2147483647',
    overflow: 'hidden',
    resize: 'both',
    boxSizing: 'border-box',
    minWidth: '240px',
    minHeight: '160px',
  })
  const shadow = host.attachShadow({ mode: 'open' })
  const styleEl = document.createElement('style')
  styleEl.textContent = overlayCss()
  shadow.appendChild(styleEl)
  const mount = document.createElement('div')
  mount.style.width = '100%'
  mount.style.height = '100%'
  shadow.appendChild(mount)
  const target = document.documentElement || document.body
  target.appendChild(host)
  root = createRoot(mount)
  root.render(<App />)
}

function hideOverlay() {
  if (!host) return
  try { root && root.unmount() } catch { /* noop */ }
  root = null
  host.remove()
  host = null
}

function toggleOverlay() {
  if (host && host.isConnected) hideOverlay()
  else showOverlay()
}

function autoShowIfHooked() {
  try {
    if (typeof location !== 'undefined' && location.href.includes('clock-ext=auto')) {
      showOverlay()
    }
  } catch { /* noop */ }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoShowIfHooked, { once: true })
} else {
  autoShowIfHooked()
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'clock-ext:toggle') toggleOverlay()
  })
}
