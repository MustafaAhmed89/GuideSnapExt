import type { RecordingState } from '../shared/types';

const HOST_ID = '__guidesnap_overlay_host__';

let shadowRoot: ShadowRoot | null = null;
let stepCountEl: HTMLElement | null = null;
let stateEl: HTMLElement | null = null;
let dotEl: HTMLElement | null = null;

const STYLES = `
  :host { all: initial; }
  #gs-bar {
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    z-index: 2147483647 !important;
    background: #1e1e2e !important;
    color: #fff !important;
    border-radius: 12px !important;
    padding: 12px 16px !important;
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 13px !important;
    box-shadow: 0 4px 20px rgba(0,0,0,.35) !important;
    min-width: 200px !important;
    user-select: none !important;
  }
  #gs-dot {
    width: 10px !important;
    height: 10px !important;
    border-radius: 50% !important;
    background: #ef4444 !important;
    flex-shrink: 0 !important;
    animation: gs-pulse 1.2s ease-in-out infinite !important;
  }
  #gs-dot.paused {
    background: #f59e0b !important;
    animation: none !important;
  }
  @keyframes gs-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  #gs-info { flex: 1 !important; }
  #gs-state { font-size: 11px !important; color: #FF6B35 !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: .5px !important; }
  #gs-steps { font-size: 13px !important; color: #e0e0e0 !important; margin-top: 2px !important; }
  #gs-actions { display: flex !important; gap: 6px !important; }
  button {
    border: none !important;
    border-radius: 6px !important;
    padding: 5px 10px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    transition: opacity .15s !important;
  }
  button:hover { opacity: .8 !important; }
  #gs-pause { background: rgba(255,255,255,.12) !important; color: #fff !important; }
  #gs-stop { background: #ef4444 !important; color: #fff !important; }
`;

export function createOverlay() {
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement('div');
  host.id = HOST_ID;
  shadowRoot = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = STYLES;
  shadowRoot.appendChild(style);

  const bar = document.createElement('div');
  bar.id = 'gs-bar';
  bar.innerHTML = `
    <div id="gs-dot"></div>
    <div id="gs-info">
      <div id="gs-state">Recording</div>
      <div id="gs-steps">Step 0</div>
    </div>
    <div id="gs-actions">
      <button id="gs-pause">Pause</button>
      <button id="gs-stop">Stop</button>
    </div>
  `;
  shadowRoot.appendChild(bar);

  dotEl = shadowRoot.getElementById('gs-dot');
  stepCountEl = shadowRoot.getElementById('gs-steps');
  stateEl = shadowRoot.getElementById('gs-state');

  shadowRoot.getElementById('gs-pause')!.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
  });

  shadowRoot.getElementById('gs-stop')!.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  });

  document.documentElement.appendChild(host);
}

export function updateOverlay(stepCount: number, state: RecordingState) {
  if (!shadowRoot) return;
  if (stepCountEl) stepCountEl.textContent = `${stepCount} step${stepCount !== 1 ? 's' : ''} captured`;
  if (stateEl) stateEl.textContent = state === 'paused' ? 'Paused' : 'Recording';
  if (dotEl) {
    if (state === 'paused') dotEl.classList.add('paused');
    else dotEl.classList.remove('paused');
  }
}

export function removeOverlay() {
  const host = document.getElementById(HOST_ID);
  if (host) host.remove();
  shadowRoot = null;
  stepCountEl = null;
  stateEl = null;
  dotEl = null;
}
