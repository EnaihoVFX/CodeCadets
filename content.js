// Content script to interact with Scratch website
// Provides overlay tutorial functionality

console.log('Scratch AI Assistant content script loaded');

let tutorialOverlay = null;
let currentTutorialStep = 0;
let tutorialData = [];
let activeWatchers = [];
let ghostBlockEl = null;
let ghostBlockAnim = null;
let hintsUsed = {}; // Track hints used per step: { stepIndex: true/false }
let currentStepHintShown = false; // Track if hint is currently shown for this step
let currentStepData = null; // Store current step data for hint functionality
let tutorialMetadata = { mainLessonTitle: null, miniLessonIndex: null }; // Track tutorial metadata for progress

// Interactive selector test state
let selectorTestOverlay = null;
let selectorTestData = [];
let currentSelectorIndex = 0;
let selectorTestResults = [];

// Use global map if provided; else default minimal map
const DEFAULT_SELECTOR_MAP = {
  stage: { main: { css: ["[aria-label='Stage']", ".stage", ".stage-wrapper", "[class*='stage'] canvas", "canvas"] } },
  toolbox: { category: { motion: { css: [".scratchCategoryMenuItem.scratchCategoryId-motion", "[aria-label='Motion']", "[data-category='motion']"] } } },
  flyout: { block: { motion: { move_steps: { css: ["g[data-id='motion_movesteps']", "g[data-id='motion_movesteps'] > path.blocklyPath.blocklyBlockBackground"], flyoutText: "move 10 steps" } } } },
  sprite: { cat: { css: ["[aria-label='Sprite1']", "[aria-label*='Scratch Cat']"] } },
  ui: { green_flag: { css: [".green-flag", "button[title*='Go']"] } }
};
const SELECTOR_MAP = (typeof window !== 'undefined' && window.SELECTOR_MAP) ? window.SELECTOR_MAP : DEFAULT_SELECTOR_MAP;
// Load and merge selector-map.json at runtime for full coverage
(function loadSelectorMapFromJson(){
  try {
    const url = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL('selector-map.json') : null;
    if (!url) return;
    fetch(url).then(r => r.json()).then(json => {
      deepMerge(SELECTOR_MAP, json);
      // Also merge optional extra mapping if present
      try {
        const extraUrl = chrome.runtime.getURL('selector-map.extra.json');
        fetch(extraUrl).then(r => r.ok ? r.json() : null).then(extra => {
          if (extra) deepMerge(SELECTOR_MAP, extra);
        }).catch(()=>{});
      } catch(_) {}
      // Storage merging DISABLED - hardcoded selector-map.json is the only source of truth
      // Storage is not used to prevent incorrectly categorized blocks from being added
      // console.log('[Selector Map] Storage merging disabled - using hardcoded map only');
    }).catch(()=>{});
  } catch(_) {}
})();

function deepMerge(target, source){
  if (!source || typeof source !== 'object') return;
  for (const k of Object.keys(source)) {
    const sv = source[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepMerge(target[k], sv);
    } else {
      target[k] = sv;
    }
  }
}

// Merge without overwriting existing keys - used to prevent storage from overwriting hardcoded map
function mergeWithoutOverwriting(target, source) {
  if (!source || typeof source !== 'object') return {};
  const result = {};
  for (const k of Object.keys(source)) {
    const sv = source[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      // Special handling for flyout blocks - don't overwrite if target already has it
      if (k === 'flyout' && sv.block && target.flyout && target.flyout.block) {
        result[k] = { block: {} };
        for (const [catKey, catBlocks] of Object.entries(sv.block)) {
          if (!target.flyout.block[catKey]) {
            // Category doesn't exist in target - safe to add
            result[k].block[catKey] = catBlocks;
          } else if (typeof catBlocks === 'object' && catBlocks !== null) {
            // Category exists - only add blocks that don't exist in target
            result[k].block[catKey] = {};
            for (const [blockKey, blockDef] of Object.entries(catBlocks)) {
              if (!target.flyout.block[catKey][blockKey]) {
                result[k].block[catKey][blockKey] = blockDef;
              }
            }
            // Only include category if it has blocks
            if (Object.keys(result[k].block[catKey]).length === 0) {
              delete result[k].block[catKey];
            }
          }
        }
        // Only include flyout if it has blocks
        if (Object.keys(result[k].block).length === 0) {
          delete result[k];
        }
      } else {
        // Recursively merge other nested objects
        const merged = mergeWithoutOverwriting(target[k] || {}, sv);
        if (Object.keys(merged).length > 0) {
          result[k] = merged;
        }
      }
    } else {
      // Only add if target doesn't have this key
      if (!(k in target)) {
        result[k] = sv;
      }
    }
  }
  return result;
}
const KEY_ALIASES = {
  stage: 'stage.main',
  spriteCat: 'sprite.cat',
  motionCategory: 'toolbox.category.motion',
  motionMove10: 'flyout.block.motion.move_steps',
  greenFlag: 'ui.green_flag',
  // Canonicalize common event names to data-id based key
  'flyout.block.events.when_green_flag_clicked': 'flyout.block.events.event_whenflagclicked',
  'flyout.block.events.whenflagclicked': 'flyout.block.events.event_whenflagclicked'
};

// Create tutorial overlay
function createTutorialOverlay() {
  // Remove existing overlay if any
  if (tutorialOverlay) {
    tutorialOverlay.remove();
  }

  // Create overlay container - simplified retro design
  tutorialOverlay = document.createElement('div');
  tutorialOverlay.id = 'scratch-tutorial-overlay';
  tutorialOverlay.innerHTML = `
    <div class="tutorial-overlay-backdrop"></div>
    <div class="tutorial-overlay-content" id="tutorial-card">
      <div class="tutorial-header" id="tutorial-drag-handle">
        <div class="tutorial-counter">STEP <span id="step-num">1</span>/<span id="total-steps">?</span></div>
          <div class="tutorial-progress-bar">
            <div class="tutorial-progress-fill" id="progress-fill"></div>
        </div>
      </div>
      <div class="tutorial-body">
        <h3 id="step-title">LOADING...</h3>
        <p id="step-description"></p>
          <div id="step-info-box" class="info-box">
            <div class="info-box-content"></div>
          </div>
        <div id="step-actions" class="step-actions"></div>
      </div>
      <div class="tutorial-footer">
        <button id="tut-hint-btn" class="tut-btn tut-btn-hint">
          <span class="btn-text">HINT</span>
        </button>
        <button id="tut-prev-btn" class="tut-btn tut-btn-secondary">
          <span class="btn-text">← PREV</span>
        </button>
        <button id="tut-next-btn" class="tut-btn tut-btn-primary" disabled>
          <span class="btn-text">NEXT →</span>
        </button>
        <button id="tut-skip-btn" class="tut-btn tut-btn-skip">
          <span class="btn-text">SKIP</span>
        </button>
      </div>
    </div>
    <div class="tutorial-highlight" id="highlight-box"></div>
    <div class="tutorial-pointer" id="tutorial-pointer">
      <div class="pointer-dot"></div>
      <div class="pointer-label" id="pointer-label">CLICK HERE</div>
    </div>
  `;
  
  document.body.appendChild(tutorialOverlay);
  // Lift the card out of the click-through overlay to ensure reliable clicks
  const cardEl = tutorialOverlay.querySelector('#tutorial-card');
  if (cardEl) {
    document.body.appendChild(cardEl);
  }
  attachTutorialListeners();
}

// Ensure minimal overlay exists for highlight/pointer (without tutorial card)
function ensureHighlightShell() {
  let overlay = document.getElementById('scratch-tutorial-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'scratch-tutorial-overlay';
    overlay.innerHTML = `
      <div class="tutorial-overlay-backdrop"></div>
      <div class="tutorial-highlight" id="highlight-box"></div>
      <div class="tutorial-pointer" id="tutorial-pointer">
        <div class="pointer-dot"></div>
        <div class="pointer-label" id="pointer-label">Here</div>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    // Make sure key elements exist
    if (!document.getElementById('highlight-box')) {
      const hb = document.createElement('div');
      hb.className = 'tutorial-highlight';
      hb.id = 'highlight-box';
      overlay.appendChild(hb);
    }
    if (!document.getElementById('tutorial-pointer')) {
      const ptr = document.createElement('div');
      ptr.className = 'tutorial-pointer';
      ptr.id = 'tutorial-pointer';
      ptr.innerHTML = '<div class="pointer-dot"></div><div class="pointer-label" id="pointer-label">Here</div>';
      overlay.appendChild(ptr);
    }
  }
}

// Attach event listeners to tutorial buttons
function attachTutorialListeners() {
  document.getElementById('tut-prev-btn').addEventListener('click', () => previousStep());
  document.getElementById('tut-next-btn').addEventListener('click', () => nextStep());
  document.getElementById('tut-skip-btn').addEventListener('click', () => closeTutorial());
  
  // Hint button handler
  const hintBtn = document.getElementById('tut-hint-btn');
  if (hintBtn) {
    hintBtn.addEventListener('click', async () => {
      if (!currentStepHintShown && currentStepData && currentTutorialStep >= 0) {
        // Mark hint as used
        hintsUsed[currentTutorialStep] = true;
        currentStepHintShown = true;
        
        // Show the hint
        await showStepHint(currentStepData, currentTutorialStep);
        
        // Update button state
        hintBtn.disabled = true;
        hintBtn.classList.add('hint-used');
        hintBtn.querySelector('.btn-text').textContent = 'Hint Used';
      }
    });
  }

  // Drag support for the card
  const card = document.getElementById('tutorial-card');
  const handle = document.getElementById('tutorial-drag-handle');
  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;
  const onDown = (e) => {
    dragging = true;
    const ev = e.touches ? e.touches[0] : e;
    startX = ev.clientX;
    startY = ev.clientY;
    const rect = card.getBoundingClientRect();
    startLeft = rect.left + window.scrollX;
    startTop = rect.top + window.scrollY;
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const ev = e.touches ? e.touches[0] : e;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    card.style.left = `${startLeft + dx}px`;
    card.style.top = `${startTop + dy}px`;
    card.style.right = 'auto';
    card.style.bottom = 'auto';
  };
  const onUp = () => { dragging = false; };

  handle.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  handle.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);
}

// Inject tutorial CSS
function injectTutorialCSS() {
  const style = document.createElement('style');
  style.textContent = `
    #scratch-tutorial-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 999999;
      pointer-events: none;
    }
    
    .tutorial-overlay-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0);
      pointer-events: none;
    }
    
    .tutorial-overlay-content {
      position: fixed;
      right: 16px;
      bottom: 16px;
      background: #000;
      border: 6px solid #10B981;
      padding: 0;
      width: 380px;
      box-shadow: 0 0 0 4px #7C3AED, 0 0 30px rgba(16, 185, 129, 0.5);
      pointer-events: all;
      z-index: 1000000;
      font-family: 'Press Start 2P', monospace;
      max-height: 75vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.3s ease-out;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
    }
    
    .tutorial-overlay-content::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(16, 185, 129, 0.2);
      animation: scanline 4s linear infinite;
      pointer-events: none;
      z-index: 9999;
    }
    
    @keyframes scanline {
      0% { top: 0; }
      100% { top: 100%; }
    }
    
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-8px) scale(1.05); }
    }
    
    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-3deg); }
      75% { transform: rotate(3deg); }
    }
    
    .tutorial-header {
      background: #000;
      padding: 12px 16px;
      border-bottom: 4px solid #10B981;
      cursor: move;
      position: relative;
    }
    
    .tutorial-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: #7C3AED;
    }
    
    .tutorial-counter {
      font-size: 10px;
      color: #10B981;
      font-weight: normal;
      text-align: center;
      margin-bottom: 8px;
      letter-spacing: 1px;
      text-shadow: 2px 2px 0px #000, 4px 4px 0px rgba(16, 185, 129, 0.3);
    }
    
    .tutorial-body {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
      background: #000;
    }
    
    .tutorial-body h3 {
      margin: 0 0 12px 0;
      font-size: 11px;
      color: #10B981;
      font-weight: normal;
      line-height: 1.6;
      text-shadow: 2px 2px 0px #000;
    }
    
    .tutorial-body p {
      margin: 0 0 12px 0;
      font-size: 9px;
      line-height: 1.8;
      color: #7C3AED;
      text-shadow: 1px 1px 0px #000;
    }
    
    .info-box {
      margin: 12px 0;
      padding: 12px;
      background: #0a0a0a;
      border: 3px solid #7C3AED;
      font-size: 8px;
      color: #7C3AED;
      line-height: 1.6;
      display: none;
      text-shadow: 1px 1px 0px #000;
    }
    
    #step-info-box.show-info {
      display: block !important;
    }
    
    .info-box-content {
      margin: 0;
    }
    
    .step-actions {
      margin: 12px 0;
    }
    
    .step-actions button {
      display: block;
      width: 100%;
      padding: 10px;
      margin: 6px 0;
      border: 3px solid #10B981;
      background: #000;
      color: #10B981;
      font-size: 9px;
      font-weight: normal;
      cursor: pointer;
      transition: all 0.1s;
      text-align: center;
      font-family: 'Press Start 2P', monospace;
      text-shadow: 2px 2px 0px #000;
      box-shadow: 4px 4px 0px rgba(16, 185, 129, 0.3);
    }
    
    .step-actions button:hover {
      background: #10B981;
      color: #000;
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0px rgba(16, 185, 129, 0.3);
    }
    
    .step-actions button:active {
      transform: translate(4px, 4px);
      box-shadow: 0px 0px 0px rgba(16, 185, 129, 0.3);
    }
    
    .tutorial-footer {
      display: flex;
      gap: 6px;
      margin-top: 0;
      padding: 12px;
      background: #000;
      border-top: 4px solid #10B981;
    }
    
    .tut-btn {
      flex: 1;
      padding: 10px 8px;
      border: 3px solid #10B981;
      background: #000;
      color: #10B981;
      font-size: 8px;
      font-weight: normal;
      cursor: pointer;
      transition: all 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Press Start 2P', monospace;
      text-shadow: 2px 2px 0px #000;
      box-shadow: 3px 3px 0px rgba(16, 185, 129, 0.3);
      letter-spacing: 0.5px;
    }
    
    .tut-btn:hover:not(:disabled) {
      background: #10B981;
      color: #000;
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0px rgba(16, 185, 129, 0.3);
    }
    
    .tut-btn:active:not(:disabled) {
      transform: translate(3px, 3px);
      box-shadow: 0px 0px 0px rgba(16, 185, 129, 0.3);
    }
    
    .tut-btn-primary {
      border-color: #10B981;
      color: #10B981;
    }
    
    .tut-btn-primary:hover:not(:disabled) {
      background: #10B981;
      color: #000;
    }
    
    .tut-btn-secondary {
      border-color: #7C3AED;
      color: #7C3AED;
    }
    
    .tut-btn-secondary:hover:not(:disabled) {
      background: #7C3AED;
      color: #000;
    }
    
    .tut-btn-secondary:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      transform: none;
    }
    
    .tut-btn-skip {
      border-color: #6B7280;
      color: #6B7280;
    }
    
    .tut-btn-skip:hover {
      background: #6B7280;
      color: #000;
    }
    
    .tut-btn-hint {
      border-color: #FBBF24;
      color: #FBBF24;
    }
    
    .tut-btn-hint:hover:not(:disabled) {
      background: #FBBF24;
      color: #000;
    }
    
    .tut-btn-hint:disabled,
    .tut-btn-hint.hint-used {
      opacity: 0.3;
      cursor: not-allowed;
      border-color: #6B7280;
      color: #6B7280;
    }
    
    .tut-btn-hint:disabled:hover,
    .tut-btn-hint.hint-used:hover {
      transform: none;
      background: #000;
      color: #6B7280;
    }
    
    .tutorial-progress-bar {
      height: 6px;
      background: #0a0a0a;
      margin: 0;
      border: 2px solid #7C3AED;
      overflow: hidden;
    }
    
    .tutorial-progress-fill {
      height: 100%;
      background: #10B981;
      transition: width 0.3s ease;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
    }
    
    .tutorial-highlight {
      position: absolute;
      border: 4px solid #10B981;
      pointer-events: none;
      z-index: 999998;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.8), inset 0 0 10px rgba(16, 185, 129, 0.2);
      transition: all 0.2s ease;
      background: rgba(16, 185, 129, 0.1);
    }

    .tutorial-highlight.dim-backdrop {
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.8);
    }
    
    .highlight-pulse {
      animation: pulse 2s infinite, glow 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { 
        opacity: 1;
        transform: scale(1);
      }
      50% { 
        opacity: 0.8;
        transform: scale(1.02);
      }
    }
    
    @keyframes glow {
      0%, 100% {
        box-shadow: 0 0 30px rgba(251, 191, 36, 0.8), inset 0 0 20px rgba(251, 191, 36, 0.3);
      }
      50% {
        box-shadow: 0 0 40px rgba(251, 191, 36, 1), inset 0 0 30px rgba(251, 191, 36, 0.5);
      }
    }

    /* Pointer */
    .tutorial-pointer {
      position: absolute;
      z-index: 1000001;
      pointer-events: none;
      display: none;
    }
    .pointer-dot {
      width: 16px;
      height: 16px;
      background: #10B981;
      border: 3px solid #000;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.5), 0 0 15px rgba(16, 185, 129, 0.8);
      animation: pulse 1.5s infinite;
    }
    .pointer-label {
      margin-top: 6px;
      background: #000;
      color: #10B981;
      padding: 6px 10px;
      border: 3px solid #10B981;
      font-size: 8px;
      font-weight: normal;
      white-space: nowrap;
      transform: translateX(-25%);
      box-shadow: 3px 3px 0px rgba(16, 185, 129, 0.3);
      font-family: 'Press Start 2P', monospace;
      text-shadow: 1px 1px 0px #000;
      letter-spacing: 0.5px;
    }
    
    /* Scrollbar styling - retro */
    .tutorial-body::-webkit-scrollbar {
      width: 8px;
    }
    
    .tutorial-body::-webkit-scrollbar-track {
      background: #0a0a0a;
      border: 2px solid #7C3AED;
    }
    
    .tutorial-body::-webkit-scrollbar-thumb {
      background: #10B981;
      border: 1px solid #000;
    }
    
    .tutorial-body::-webkit-scrollbar-thumb:hover {
      background: #7C3AED;
    }
    
    /* Congratulations Achievement Screen - Angry Birds Style */
    #congratulations-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-in;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .congrats-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
    }
    
    .congrats-content {
      position: relative;
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FBBF24 100%);
      border-radius: 40px;
      padding: 60px 50px;
      max-width: 600px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 
                  0 0 0 8px rgba(251, 191, 36, 0.8),
                  0 0 0 12px rgba(245, 158, 11, 0.6),
                  inset 0 4px 20px rgba(255, 255, 255, 0.3);
      border: 6px solid #F59E0B;
      animation: congratsPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    @keyframes congratsPop {
      0% {
        transform: scale(0.5) rotate(-10deg);
        opacity: 0;
      }
      50% {
        transform: scale(1.1) rotate(5deg);
      }
      100% {
        transform: scale(1) rotate(0deg);
        opacity: 1;
      }
    }
    
    .congrats-header {
      margin-bottom: 40px;
    }
    
    .congrats-title {
      font-size: 48px;
      font-weight: bold;
      color: #78350F;
      margin: 0 0 16px 0;
      text-shadow: 4px 4px 0px rgba(139, 69, 19, 0.3),
                   8px 8px 0px rgba(139, 69, 19, 0.2);
      animation: titleBounce 1s ease-in-out infinite;
      line-height: 1.2;
    }
    
    @keyframes titleBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    
    .congrats-subtitle {
      font-size: 24px;
      color: #92400E;
      margin: 0;
      font-weight: bold;
    }
    
    .stars-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 40px;
      margin: 50px 0;
      min-height: 200px;
    }
    
    .star {
      font-size: 0;
      width: 120px;
      height: 120px;
      background: linear-gradient(135deg, #FCD34D 0%, #FBBF24 50%, #F59E0B 100%);
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
      box-shadow: 0 10px 30px rgba(245, 158, 11, 0.6),
                  inset 0 -10px 20px rgba(139, 69, 19, 0.3),
                  0 0 40px rgba(251, 191, 36, 0.8);
      transform: scale(0) rotate(0deg);
      opacity: 0;
      position: relative;
      border: 4px solid #F59E0B;
      animation: starFloat 2s ease-in-out infinite;
    }
    
    .star::before {
      content: '⭐';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 80px;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }
    
    .star-appear {
      animation: starPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                 starFloat 2s ease-in-out 0.6s infinite;
    }
    
    @keyframes starPop {
      0% {
        transform: scale(0) rotate(0deg);
        opacity: 0;
      }
      50% {
        transform: scale(1.3) rotate(180deg);
        opacity: 1;
      }
      100% {
        transform: scale(1) rotate(360deg);
        opacity: 1;
      }
    }
    
    @keyframes starFloat {
      0%, 100% {
        transform: translateY(0) scale(1);
      }
      50% {
        transform: translateY(-15px) scale(1.05);
      }
    }
    
    .star-1 {
      animation-delay: 0s;
    }
    
    .star-2 {
      animation-delay: 0.3s;
    }
    
    .star-3 {
      animation-delay: 0.6s;
    }
    
    .congrats-score {
      margin: 40px 0;
      padding: 30px;
      background: linear-gradient(135deg, #FFFFFF 0%, #FEF3C7 100%);
      border-radius: 30px;
      border: 6px solid #F59E0B;
      box-shadow: inset 0 4px 20px rgba(139, 69, 19, 0.2),
                  0 8px 30px rgba(245, 158, 11, 0.4);
    }
    
    .score-text {
      font-size: 72px;
      font-weight: bold;
      color: #78350F;
      text-shadow: 4px 4px 0px rgba(139, 69, 19, 0.3),
                   8px 8px 0px rgba(139, 69, 19, 0.2);
      margin: 0;
      line-height: 1;
      letter-spacing: 8px;
      animation: scorePulse 1.5s ease-in-out infinite;
    }
    
    @keyframes scorePulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }
    
    .score-subtext {
      font-size: 28px;
      color: #92400E;
      margin-top: 12px;
      font-weight: bold;
    }
    
    .congrats-message {
      margin: 30px 0;
      font-size: 20px;
      color: #78350F;
      line-height: 1.6;
    }
    
    .congrats-message p {
      margin: 12px 0;
      font-weight: bold;
    }
    
    .congrats-btn {
      margin-top: 30px;
      padding: 20px 50px;
      font-size: 24px;
      font-weight: bold;
      color: white;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      border: 6px solid #047857;
      border-radius: 30px;
      cursor: pointer;
      box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5),
                  0 0 0 4px rgba(16, 185, 129, 0.3);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .congrats-btn:hover {
      transform: translateY(-5px) scale(1.05);
      box-shadow: 0 12px 40px rgba(16, 185, 129, 0.7),
                  0 0 0 6px rgba(16, 185, 129, 0.4);
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
    }
    
    .congrats-btn:active {
      transform: translateY(-2px) scale(1.02);
    }
  `;
  document.head.appendChild(style);
}

// Start tutorial with JSON data
function startTutorial(tutorialSteps) {
  tutorialData = tutorialSteps;
  currentTutorialStep = 0;
  hintsUsed = {}; // Reset hints tracking
  currentStepHintShown = false;
  createTutorialOverlay();
  showStep(0);
}

// Show specific step
async function showStep(stepIndex) {
  if (stepIndex < 0 || stepIndex >= tutorialData.length) {
    closeTutorial();
    return;
  }
  
  currentTutorialStep = stepIndex;
  
  // Send progress update
  if (tutorialMetadata.mainLessonTitle !== null && tutorialMetadata.miniLessonIndex !== null) {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'stepProgress',
        mainLessonTitle: tutorialMetadata.mainLessonTitle,
        miniLessonIndex: tutorialMetadata.miniLessonIndex,
        stepIndex: stepIndex,
        totalSteps: tutorialData.length
      });
    }
  }
  
  // Clear any previous completion watchers
  clearActiveWatchers();
  const step = tutorialData[stepIndex];
  
  document.getElementById('step-num').textContent = stepIndex + 1;
  document.getElementById('total-steps').textContent = tutorialData.length;
  document.getElementById('step-title').textContent = (step.title || `STEP ${stepIndex + 1}`).toUpperCase();
  document.getElementById('step-description').textContent = step.description || '';
  
  // Display info box
  const infoBox = document.getElementById('step-info-box');
  const infoBoxContent = infoBox ? infoBox.querySelector('.info-box-content') : null;
  if (step.infoBox && step.infoBox.trim() && infoBoxContent) {
    infoBoxContent.textContent = step.infoBox;
    infoBox.classList.add('show-info');
  } else {
    if (infoBoxContent) infoBoxContent.textContent = '';
    if (infoBox) infoBox.classList.remove('show-info');
  }
  
  // Update progress bar
  const progressFill = document.getElementById('progress-fill');
  if (progressFill && tutorialData.length > 0) {
    const progress = ((stepIndex + 1) / tutorialData.length) * 100;
    progressFill.style.width = `${progress}%`;
  }
  
  // Check if hint was already used for this step
  const hintWasUsed = hintsUsed[stepIndex] || false;
  currentStepHintShown = hintWasUsed;
  
  // Pointer near highlight target
  const pointer = document.getElementById('tutorial-pointer');
  const pointerLabel = document.getElementById('pointer-label');
  pointer.style.display = 'none';

  // Clear any ghost from previous step
  clearGhostBlock();
  clearHighlight();

  // Handle actions
  const actionsDiv = document.getElementById('step-actions');
  actionsDiv.innerHTML = '';
  
  if (step.actions && step.actions.length > 0) {
    step.actions.forEach((action, idx) => {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.onclick = async () => {
        if (action.clickSelector) {
          const target = await highlightElement(action.clickSelector);
      setTimeout(() => {
        const el = resolveSelector(action.clickSelector);
        if (el) simulateClick(el);
      }, 600);
        }
        if (action.nextStep !== undefined) {
          setTimeout(() => showStep(action.nextStep), 500);
        }
      };
      actionsDiv.appendChild(btn);
    });
  }
  
  // Store step data for hint functionality
  currentStepData = step;
  let highlightedEl = null;
  
  // Only show highlights/pointers if hint was already used for this step
  if (hintWasUsed && step.highlightSelector) {
    highlightedEl = await showStepHint(step, stepIndex);
  }
  
  // Update hint button state
  const hintBtn = document.getElementById('tut-hint-btn');
  if (hintBtn) {
    if (step.highlightSelector || step.pointerText || step.ghostBlock) {
      hintBtn.style.display = 'flex';
      hintBtn.disabled = hintWasUsed;
      if (hintWasUsed) {
        hintBtn.classList.add('hint-used');
        hintBtn.querySelector('.btn-text').textContent = 'Hint Used';
      } else {
        hintBtn.classList.remove('hint-used');
        hintBtn.querySelector('.btn-text').textContent = 'Hint';
      }
    } else {
      hintBtn.style.display = 'none';
    }
  }
  
  // Enable/disable navigation buttons
  const prevBtn = document.getElementById('tut-prev-btn');
  const nextBtn = document.getElementById('tut-next-btn');
  prevBtn.disabled = stepIndex === 0;
  // Always enable Next button - users can proceed regardless of completion
  nextBtn.disabled = false;

  // Completion detection: still track completion for visual feedback, but don't block Next button
  if (step.requireComplete === true) {
    const completionSpec = step.completeWhen || buildCompletionSpec(step);
    if (completionSpec) {
      setupCompletionWatcher(completionSpec, () => {
        pointer.style.display = 'none';
        const titleEl = document.getElementById('step-title');
        if (titleEl && !titleEl.textContent.includes('✓')) {
          titleEl.textContent = `${step.title} ✓`;
        }
      });
    }
  }

  // Backdrop/dimming only for first step
  const highlightBox = document.getElementById('highlight-box');
  if (stepIndex === 0) {
    highlightBox.classList.add('dim-backdrop');
  } else {
    highlightBox.classList.remove('dim-backdrop');
  }
}

// Show hint for a step (highlights, pointers, etc.)
async function showStepHint(step, stepIndex) {
  const pointer = document.getElementById('tutorial-pointer');
  const pointerLabel = document.getElementById('pointer-label');
  let highlightedEl = null;
  
  // Highlight element if specified
  if (step.highlightSelector) {
    // If highlighting a flyout block key, ensure its category is open first
    if (step.highlightSelector.startsWith('key:')) {
      const keyPath = step.highlightSelector.slice(4).trim();
      const m = keyPath.match(/^flyout\.block\.([^\.]+)\./);
      if (m && m[1]) {
        const cat = m[1];
        const catKey = `key:toolbox.category.${cat}`;
        const catEl = resolveSelector(catKey);
        if (catEl) { try { simulateClick(catEl); } catch(_) {} }
      }
    }
    highlightedEl = await highlightElement(step.highlightSelector);
    if (highlightedEl) {
      const r = highlightedEl.getBoundingClientRect();
      // Place pointer on the side with more space
      const vw = document.documentElement.clientWidth;
      const spaceRight = vw - (r.right + 8);
      const placeLeftSide = spaceRight < 120; // if not enough space on right, place on left
      const px = placeLeftSide ? (r.left + window.scrollX - 20) : (r.right + window.scrollX + 8);
      const py = r.top + window.scrollY + Math.min(24, r.height / 2);
      pointer.style.left = `${px}px`;
      pointer.style.top = `${py}px`;
      pointerLabel.textContent = step.pointerText || 'Click here';
      pointer.style.display = 'block';

      // Smart place tutorial card to avoid covering target
      const preferSide = (stepIndex === 1 || step.highlightSelector?.includes('stage')) ? 'left' : undefined;
      smartPlaceCard(r, { preferSide });
    }
  } else {
    clearHighlight();
  }

  // Ghost block guidance
  if (step.ghostBlock) {
    const origin = highlightedEl || document.querySelector('.blocklyFlyout, .blocklyToolboxDiv');
    const target = document.querySelector('.blocklyBlockCanvas, .blocklyWorkspace') || document.body;
    showGhostBlock(step.ghostBlock, origin, target);
  }
  
  return highlightedEl;
}

// Highlight an element on the page
async function highlightElement(selector) {
  ensureHighlightShell();
  // Support multiple selectors separated by commas and key:map lookups
  const parts = (selector || '').split(',').map(s => s.trim()).filter(Boolean);
  let found = null;
  let anyPartWasKey = false;

  const tryTextQuery = (sel) => {
    const query = sel.slice(5).trim().toLowerCase();

    // Search flyout first (toolbox), then workspace as fallback
    const searchScopes = [
      document.querySelector('.blocklyFlyout .blocklyBlockCanvas'),
      document.querySelector('.blocklyBlockCanvas')
    ].filter(Boolean);

    const findInCanvas = (cv) => {
      const groups = cv.querySelectorAll('g.blocklyDraggable, g.blocklyBlock');
      for (const g of groups) {
        const pieces = Array.from(g.querySelectorAll('text, tspan')).map(n => (n.textContent || '').trim().toLowerCase()).filter(Boolean);
        const joined = pieces.join(' ');
        if (joined.includes(query)) return g;
      }
      return null;
    };

    let targetG = null;
    for (const scope of searchScopes) { if (targetG) break; targetG = findInCanvas(scope); }

    if (targetG) {
      const rect = targetG.getBoundingClientRect();
      const pad = 6;
      const highlightBox = document.getElementById('highlight-box');
      highlightBox.style.display = 'block';
      highlightBox.style.width = `${Math.max(0, rect.width + pad * 2)}px`;
      highlightBox.style.height = `${Math.max(0, rect.height + pad * 2)}px`;
      highlightBox.style.left = `${rect.left + window.scrollX - pad}px`;
      highlightBox.style.top = `${rect.top + window.scrollY - pad}px`;
      highlightBox.classList.add('highlight-pulse');
      return targetG;
    }
    return null;
  };

  const tryCssQuery = (cssSel) => {
    try {
      return Array.from(document.querySelectorAll(cssSel));
    } catch (_) {
      return [];
    }
  };

  // Iterate parts and return first valid element
  for (const part of parts.length ? parts : [selector]) {
    if (part && part.startsWith('key:')) {
      anyPartWasKey = true;
      const keyPath = part.slice(4).trim();
      // Special handling for flyout blocks: robust, category-scoped resolution
      if (/^flyout\.block\./.test(keyPath)) {
        const m = keyPath.match(/^flyout\.block\.([^\.]+)\.(.+)$/);
        if (m) {
          const category = m[1];
            // Map lists -> variables for category button lookup
            const categoryForButton = category === 'lists' ? 'variables' : category;
            // Get the definition for this block
            const parts = keyPath.split('.');
            let blockDef = SELECTOR_MAP;
            for (const part of parts) {
              if (!blockDef || typeof blockDef !== 'object') break;
              blockDef = blockDef[part];
            }
            if (blockDef && typeof blockDef === 'object') {
              if (blockDef.main) blockDef = blockDef.main;
              else if (blockDef.canvas) blockDef = blockDef.canvas;
            }
            
          // Open category and wait for flyout
          try {
              const catEl = resolveSelector(`key:toolbox.category.${categoryForButton}`);
              if (catEl) {
                const isSelected = catEl.classList?.contains('categorySelected') || 
                                  catEl.getAttribute('aria-selected') === 'true' ||
                                  catEl.closest('.scratchCategoryMenuItem')?.classList.contains('categorySelected');
                if (!isSelected) {
                  simulateClick(catEl);
                  // Wait longer for flyout to render and blocks to appear
                  await new Promise(r => setTimeout(r, 500));
                } else {
                  // Even if selected, give a small delay to ensure blocks are rendered
                  await new Promise(r => setTimeout(r, 100));
                }
              }
          } catch(_) {}
            // Robust find in flyout - pass the definition so it can use CSS selectors
            found = robustFindFlyoutBlock(keyPath, blockDef);
            
            // If robustFindFlyoutBlock didn't find it, try resolveKey
            if (!found) {
              found = resolveKey(keyPath);
              // If found via resolveKey, highlight it manually
              if (found && found.closest('.blocklyFlyout')) {
                highlightBlockElement(found);
              }
            }
        }
      }
      if (!found) {
        found = resolveKey(keyPath);
      }
      if (found) break;
      continue;
    }
  if (part && part.startsWith('text:')) {
      found = tryTextQuery(part);
      if (found) break;
      continue;
    }
    if (part && part.startsWith('domtext:')) {
      const query = part.slice(8).trim().toLowerCase();
      found = findByDomText(query);
      if (found) break;
      continue;
    }
    const candidates = tryCssQuery(part);
    if (candidates.length === 1) { found = candidates[0]; break; }
    if (candidates.length > 1) { found = chooseCandidate(part, candidates); if (found) break; }
  }

  let element = found;

  // Heuristic fallback to find Stage or large interactive area
  if (!element && !anyPartWasKey) {
    element = findBestHighlightCandidate();
  }

  if (element) {
    // For flyout blocks, ensure we use the block wrapper
    let blockEl = element;
    if (element.closest('.blocklyFlyout')) {
      blockEl = element.closest('g.blocklyDraggable, g.blocklyBlock') || element;
    }
    
    const rect = blockEl.getBoundingClientRect();
    
    // If rect is invalid, try to calculate from children (for SVG elements)
    if (rect.width === 0 || rect.height === 0) {
      const children = blockEl.querySelectorAll('path, rect, circle, text');
      if (children.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        children.forEach(child => {
          const childRect = child.getBoundingClientRect();
          if (childRect.width > 0 && childRect.height > 0) {
            minX = Math.min(minX, childRect.left);
            minY = Math.min(minY, childRect.top);
            maxX = Math.max(maxX, childRect.right);
            maxY = Math.max(maxY, childRect.bottom);
          }
        });
        if (minX !== Infinity) {
          const pad = 6;
          const highlightBox = document.getElementById('highlight-box');
          if (highlightBox) {
            highlightBox.style.display = 'block';
            highlightBox.style.width = `${Math.max(0, maxX - minX + pad * 2)}px`;
            highlightBox.style.height = `${Math.max(0, maxY - minY + pad * 2)}px`;
            highlightBox.style.left = `${minX + window.scrollX - pad}px`;
            highlightBox.style.top = `${minY + window.scrollY - pad}px`;
            highlightBox.classList.add('highlight-pulse');
          }
          return blockEl || element;
        }
      }
    }
    
    const pad = 6;
    const highlightBox = document.getElementById('highlight-box');
    if (highlightBox) {
      highlightBox.style.display = 'block';
      highlightBox.style.width = `${Math.max(0, rect.width + pad * 2)}px`;
      highlightBox.style.height = `${Math.max(0, rect.height + pad * 2)}px`;
      highlightBox.style.left = `${rect.left + window.scrollX - pad}px`;
      highlightBox.style.top = `${rect.top + window.scrollY - pad}px`;
      highlightBox.classList.add('highlight-pulse');
    }
  }
  return element || null;
}

// Simple, reliable selector resolution
function resolveSelector(sel) {
  if (!sel || typeof sel !== 'string') return null;
  
  // Handle key: prefix
  if (sel.startsWith('key:')) {
    return resolveKey(sel.slice(4).trim());
  }
  
  // Direct CSS selector
  try {
    return document.querySelector(sel);
  } catch (_) {
    return null;
  }
}

// Resolve a semantic key from SELECTOR_MAP
function resolveKey(key) {
  if (!key || typeof key !== 'string') return null;
  
  // Navigate to definition in map
  const parts = key.split('.');
  let def = SELECTOR_MAP;
  
  // Category mapping: lists -> variables (both use data_ prefix and same category button)
  const categoryAliases = {
    'lists': 'variables'
  };
  
  // Apply category aliases
  const processedParts = parts.map((part, idx) => {
    // If this is a category part (flyout.block.CATEGORY.*), check for alias
    if (idx === 2 && parts[0] === 'flyout' && parts[1] === 'block' && categoryAliases[part]) {
      return categoryAliases[part];
    }
    return part;
  });
  
  for (const part of processedParts) {
    if (!def || typeof def !== 'object') break;
    def = def[part];
  }
  
  // Handle namespace nodes (e.g., stage.main)
  if (def && typeof def === 'object') {
    if (def.main) def = def.main;
    else if (def.canvas) def = def.canvas;
  }
  
  if (!def || typeof def !== 'object') return null;
  
  // Priority 1: Try CSS selectors
  if (Array.isArray(def.css)) {
    const isFlyoutBlock = key.startsWith('flyout.block.');
        
    // For flyout blocks, we MUST open the category first and search in flyout
        if (isFlyoutBlock) {
      // Extract category from key
      const match = key.match(/^flyout\.block\.([^\.]+)\.(.+)$/);
      if (match && match[1]) {
        const category = match[1];
        const categoryForButton = category === 'lists' ? 'variables' : category;
        
        // Open category first
        const catEl = resolveSelector(`key:toolbox.category.${categoryForButton}`);
        if (catEl) {
          const isSelected = catEl.classList?.contains('categorySelected') || 
                            catEl.getAttribute('aria-selected') === 'true' ||
                            catEl.closest('.scratchCategoryMenuItem')?.classList.contains('categorySelected');
          if (!isSelected) {
            try { 
              simulateClick(catEl);
              // Note: We can't wait synchronously here, but we'll search in flyout
              // which should be rendered by the time we query it
            } catch(_) {}
          }
        }
        
        // Wait a tiny bit and search for block in flyout only
        // Use a small synchronous delay by checking multiple times
        let attempts = 0;
        const maxAttempts = 5;
        while (attempts < maxAttempts) {
          const flyout = document.querySelector('.blocklyFlyout');
          if (flyout) {
            const canvas = flyout.querySelector('.blocklyBlockCanvas');
            if (canvas && canvas.children.length > 0) {
              // Flyout has rendered, search for block
              for (const cssSel of def.css) {
                try {
                  const all = Array.from(canvas.querySelectorAll(cssSel));
                  if (all.length > 0) {
                    // Find the actual block wrapper element (g.blocklyDraggable or g.blocklyBlock)
                    for (const el of all) {
                      const g = el.closest('g.blocklyDraggable, g.blocklyBlock') || 
                               (el.tagName === 'g' && (el.classList.contains('blocklyDraggable') || el.classList.contains('blocklyBlock')) ? el : null);
                      if (g && g.closest('.blocklyFlyout')) {
                        // Verify it has a valid bounding rect
                        const rect = g.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                          return g;
                        }
                      }
                    }
                    // Fallback: return first element if no wrapper found
                    const first = all[0];
                    const g = first.closest('g.blocklyDraggable, g.blocklyBlock') || first;
                    if (g && g.closest('.blocklyFlyout')) return g;
                  }
                } catch (_) {}
              }
              // If we found the flyout but no block, break (don't retry)
              break;
            }
          }
          attempts++;
          // Small synchronous delay
          const start = Date.now();
          while (Date.now() - start < 50) { /* wait */ }
        }
      }
      // If flyout block not found, fall through to Priority 2 (robustFindFlyoutBlock)
    } else {
      // Non-flyout blocks: use CSS selectors directly
      for (const cssSel of def.css) {
        try {
          const all = Array.from(document.querySelectorAll(cssSel));
          if (all.length > 0) {
        return all[0];
          }
      } catch (_) {}
      }
    }
  }
  
  // Priority 2: Try flyout block by text (requires category to be open)
  if (def.flyoutText && key.startsWith('flyout.block.')) {
    const match = key.match(/^flyout\.block\.([^\.]+)/);
    if (match && match[1]) {
      // Map lists -> variables for category button
      const category = match[1];
      const categoryForButton = category === 'lists' ? 'variables' : category;
      // Open category if needed
      const catKey = `toolbox.category.${categoryForButton}`;
      const catEl = resolveKey(catKey);
      if (catEl) {
        const isSelected = catEl.classList?.contains('categorySelected') || 
                          catEl.closest?.('.categorySelected');
        if (!isSelected) {
          try { simulateClick(catEl); } catch(_) {}
          // Small delay for flyout to appear
          setTimeout(() => {}, 200);
        }
      }
      // Use robust flyout finder
      return robustFindFlyoutBlock(key, def);
    }
  }
  
  // Priority 3: Try domtext (for sprite tiles, etc.)
  if (Array.isArray(def.domtext)) {
    for (const text of def.domtext) {
      const found = findByDomText(text.toLowerCase());
      if (found) return found;
    }
  }
  
  // Priority 4: Try text (for toolbox categories)
  if (Array.isArray(def.text)) {
    for (const text of def.text) {
      const found = findByTextInToolbox(text);
      if (found) return found;
    }
  }
  
  return null;
}

function enumerateSelectorKeys() {
  const out = [];
  const walk = (node, prefix=[]) => {
    if (!node || typeof node !== 'object') return;
    const hasLeaf = !!(node.css || node.domtext || node.text || node.flyoutText);
    if (hasLeaf) {
      if (prefix.length) {
        const key = prefix.join('.');
        // Validate key: filter out malformed keys
        if (isValidSelectorKey(key)) {
          out.push(key);
        } else {
          console.warn(`[Selector Map] Filtered out malformed key: ${key}`);
        }
      }
      return;
    }
    for (const k of Object.keys(node)) {
      walk(node[k], prefix.concat(k));
    }
  };
  walk(SELECTOR_MAP, []);
  return out;
}

// Validate selector key format
function isValidSelectorKey(key) {
  if (!key || typeof key !== 'string') return false;
  
  const parts = key.split('.');
  
  // Check each part for validity
  for (const part of parts) {
    // Keys should not start with numbers or special characters
    if (/^[0-9\-+]/.test(part)) {
      return false;
    }
    // Keys should be alphanumeric with underscores
    if (!/^[a-z][a-z0-9_]*$/i.test(part)) {
      return false;
    }
  }
  
  // Block names should not start with numbers/signs (e.g., "-10_change_volume")
  if (key.includes('flyout.block.')) {
    const blockPart = key.split('.').pop();
    if (/^[0-9\-+]/.test(blockPart)) {
      return false;
    }
    
    // Validate block is in correct category based on common block names
    const category = parts[2]; // flyout.block.CATEGORY.blockname
    const blockName = blockPart.toLowerCase();
    
    // Known block-to-category mappings
    const blockCategoryMap = {
      'and': 'operators',
      'or': 'operators',
      'not': 'operators',
      'add': 'operators',
      'subtract': 'operators',
      'multiply': 'operators',
      'divide': 'operators',
      'equals': 'operators',
      'gt': 'operators',
      'lt': 'operators',
      'mod': 'operators',
      'round': 'operators',
      'join': 'operators',
      'length': 'operators',
      'contains': 'operators',
      'change_volume_by': 'sound',
      'set_volume_to': 'sound',
      'play_sound': 'sound',
      'play_sound_until_done': 'sound',
      'stop_all_sounds': 'sound',
      'say': 'looks',
      'think': 'looks',
      'show': 'looks',
      'hide': 'looks',
      'switch_costume': 'looks',
      'move_steps': 'motion',
      'turn_right': 'motion',
      'turn_left': 'motion',
      'go_to_xy': 'motion',
      'wait': 'control',
      'repeat': 'control',
      'forever': 'control',
      'if_then': 'control',
      'if_else': 'control',
      'when_green_flag_clicked': 'events',
      'event_whenflagclicked': 'events',
      'broadcast': 'events',
      'touching': 'sensing',
      'mouse_x': 'sensing',
      'mouse_y': 'sensing',
      'key_pressed': 'sensing',
      'set_variable_to': 'variables',
      'change_variable_by': 'variables',
      'add_to_list': 'variables',
      'item_of_list': 'variables'
    };
    
    // Check if block is in wrong category
    if (blockCategoryMap[blockName] && blockCategoryMap[blockName] !== category) {
      console.warn(`[Selector Map Validation] Block "${blockName}" should be in category "${blockCategoryMap[blockName]}" but found in "${category}"`);
      return false;
    }
  }
  
  return true;
}

// Clean malformed keys from selector map
function cleanMalformedKeys(map) {
  if (!map || typeof map !== 'object') return map;
  
  const cleaned = {};
  for (const [key, value] of Object.entries(map)) {
    if (typeof value === 'object' && value !== null) {
      // Special handling for flyout.block structure
      if (key === 'flyout' && value.block) {
        // Clean each category, removing blocks that don't belong
        const cleanedFlyout = { block: {} };
        const validCategories = ['motion', 'looks', 'sound', 'events', 'control', 'sensing', 'operators', 'variables', 'lists'];
        
        for (const [catKey, catBlocks] of Object.entries(value.block)) {
          if (!validCategories.includes(catKey)) {
            console.warn(`[Selector Map Cleanup] Removed invalid category: ${catKey}`);
            continue;
          }
          
          if (typeof catBlocks === 'object' && catBlocks !== null) {
            cleanedFlyout.block[catKey] = {};
            for (const [blockKey, blockDef] of Object.entries(catBlocks)) {
              // Validate block key format
              if (!isValidSelectorKey(`flyout.block.${catKey}.${blockKey}`)) {
                console.warn(`[Selector Map Cleanup] Removed invalid block: flyout.block.${catKey}.${blockKey}`);
                continue;
              }
              
              // Check if block has CSS selectors with data-id
              if (blockDef && blockDef.css && Array.isArray(blockDef.css)) {
                const hasDataId = blockDef.css.some(sel => sel.includes('data-id'));
                if (hasDataId) {
                  // Extract data-id prefix to verify category
                  const dataIdMatch = blockDef.css.find(sel => {
                    const match = sel.match(/data-id\*?=\s*['"]([^'"\]]+)/i);
                    return match && match[1];
                  });
                  
                  if (dataIdMatch) {
                    const match = dataIdMatch.match(/data-id\*?=\s*['"]([^'"\]]+)/i);
                    const dataId = match[1].toLowerCase();
                    
                    // Map data-id prefix to expected category
                    const dataIdToCategory = {
                      'motion_': 'motion',
                      'looks_': 'looks',
                      'sound_': 'sound',
                      'event_': 'events',
                      'control_': 'control',
                      'sensing_': 'sensing',
                      'operator_': 'operators',
                      'data_': 'variables'
                    };
                    
                    let expectedCategory = null;
                    for (const [prefix, cat] of Object.entries(dataIdToCategory)) {
                      if (dataId.startsWith(prefix)) {
                        expectedCategory = cat;
                        break;
                      }
                    }
                    
                    // If block is in wrong category, skip it
                    if (expectedCategory && expectedCategory !== catKey) {
                      console.warn(`[Selector Map Cleanup] Removed block "${blockKey}" from wrong category "${catKey}" (should be "${expectedCategory}")`);
                      continue;
                    }
                  }
                }
              }
              
              cleanedFlyout.block[catKey][blockKey] = blockDef;
            }
          }
        }
        cleaned[key] = cleanedFlyout;
      } else {
        // Recursively clean other nested objects
        const cleanedValue = cleanMalformedKeys(value);
        
        // Only include if the key is valid
        if (isValidSelectorKey(key)) {
          cleaned[key] = cleanedValue;
        } else {
          console.warn(`[Selector Map Cleanup] Removed malformed key: ${key}`);
        }
      }
    } else {
      // Leaf value - include if key is valid
      if (isValidSelectorKey(key)) {
        cleaned[key] = value;
      } else {
        console.warn(`[Selector Map Cleanup] Removed malformed key: ${key}`);
      }
    }
  }
  return cleaned;
}

// Test all selectors in the map - comprehensive and detailed
function testSelectors() {
  const results = [];
  const keys = enumerateSelectorKeys();
  const summary = { total: keys.length, found: 0, missing: 0, errors: 0 };
  const byCategory = {};
  
  console.log(`[Selector Test] 🧪 Testing ${keys.length} selectors...`);
  
  for (const key of keys) {
    try {
      const el = resolveKey(key);
      const found = !!el;
      
      // Categorize by top-level key
      const category = key.split('.')[0];
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, found: 0, missing: 0 };
      }
      byCategory[category].total++;
      
      if (found) {
        summary.found++;
        byCategory[category].found++;
        const visible = el.offsetWidth > 0 && el.offsetHeight > 0;
        results.push({ 
          key, 
          found: true,
          visible,
          element: el.tagName || el.nodeName || 'unknown',
          category
        });
      } else {
        summary.missing++;
        byCategory[category].missing++;
        results.push({ 
          key, 
          found: false,
          reason: 'Element not found in DOM',
          category
        });
      }
    } catch (error) {
      summary.errors++;
      const category = key.split('.')[0];
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, found: 0, missing: 0 };
      }
      byCategory[category].total++;
      results.push({ 
        key, 
        found: false,
        error: error.message || String(error),
        category
      });
      console.warn(`[Selector Test] ⚠️  Error testing ${key}:`, error);
    }
  }
  
  // Print detailed summary
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`[Selector Test] 📊 SUMMARY`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`Total Selectors: ${summary.total}`);
  console.log(`✅ Found: ${summary.found} (${((summary.found / summary.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Missing: ${summary.missing} (${((summary.missing / summary.total) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Errors: ${summary.errors}`);
  console.log(`\n📂 RESULTS BY CATEGORY:`);
  console.log(`───────────────────────────────────────────────────────────`);
  Object.keys(byCategory).sort().forEach(cat => {
    const catResults = byCategory[cat];
    const pct = catResults.total > 0 ? ((catResults.found / catResults.total) * 100).toFixed(1) : 0;
    const status = catResults.found === catResults.total ? '✅' : 
                   catResults.found > 0 ? '⚠️ ' : '❌';
    console.log(`${status} ${cat.padEnd(15)} ${catResults.found}/${catResults.total} (${pct}%)`);
  });
  
  // Log missing keys by category
  if (summary.missing > 0) {
    const missing = results.filter(r => !r.found && !r.error);
    const missingByCat = {};
    missing.forEach(r => {
      if (!missingByCat[r.category]) missingByCat[r.category] = [];
      missingByCat[r.category].push(r.key);
    });
    console.log(`\n❌ MISSING SELECTORS:`);
    console.log(`───────────────────────────────────────────────────────────`);
    Object.keys(missingByCat).sort().forEach(cat => {
      console.log(`\n${cat}:`);
      missingByCat[cat].forEach(key => console.log(`  - ${key}`));
    });
  }
  
  // Block category details
  // Note: lists blocks are under variables category in Scratch UI
  const blockCategories = ['motion', 'looks', 'sound', 'events', 'control', 'sensing', 'operators', 'variables', 'lists'];
  console.log(`\n🧩 BLOCK CATEGORY DETAILS:`);
  console.log(`───────────────────────────────────────────────────────────`);
  blockCategories.forEach(cat => {
    const blockKeys = keys.filter(k => k.startsWith(`flyout.block.${cat}`));
    if (blockKeys.length > 0) {
      const foundCount = blockKeys.filter(k => {
        const detail = results.find(d => d.key === k);
        return detail && detail.found;
      }).length;
      const status = foundCount === blockKeys.length ? '✅' : 
                     foundCount > 0 ? '⚠️ ' : '❌';
      const catLabel = cat === 'lists' ? 'lists (via variables)' : cat;
      console.log(`${status} ${catLabel.padEnd(25)} ${foundCount}/${blockKeys.length} blocks found`);
    }
  });
  console.log(`═══════════════════════════════════════════════════════════\n`);
  
  return {
    summary,
    byCategory,
    results,
    timestamp: Date.now()
  };
}

function getToolboxCategories() {
  const out = [];
  // Scratch v3: left-side category tiles and tree rows
  const els = Array.from(document.querySelectorAll(
    ".scratchCategoryMenuItem, .blocklyTreeRow[aria-label], [aria-label][data-category]"
  ));
  const seen = new Set();
  els.forEach(el => {
    let name = (el.getAttribute('aria-label') || '').trim();
    if (!name) {
      const label = el.querySelector('.scratchCategoryMenuItemLabel');
      if (label) name = (label.textContent||'').trim();
    }
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return; seen.add(key);
    out.push({ key, el });
  });
  // Normalize names to map keys (motion, looks, sound, events, control, sensing, operators, variables)
  out.forEach(o => {
    o.key = o.key.replace(/\s+/g,'');
  });
  return out;
}

function normalizeBlockKey(category, dataId, g) {
  if (!dataId || !g) return null;
  
  const cid = (dataId || '').toLowerCase().trim();
  
  // First, determine the ACTUAL category from data-id prefix
  // Scratch block IDs follow pattern: CATEGORY_BLOCKNAME
  const actualCategoryMap = {
    'motion_': 'motion',
    'looks_': 'looks',
    'sound_': 'sound',
    'event_': 'events',  // Note: data-id uses 'event_' but category is 'events'
    'control_': 'control',
    'sensing_': 'sensing',
    'operator_': 'operators',  // Note: data-id uses 'operator_' but category is 'operators'
    'data_': 'variables'  // Variables and lists both use 'data_' prefix
  };
  
  let actualCategory = category;
  let blockSuffix = null;
  
  // Find the actual category from data-id
  for (const [prefix, cat] of Object.entries(actualCategoryMap)) {
    if (cid.startsWith(prefix)) {
      actualCategory = cat;
      blockSuffix = cid.substring(prefix.length);
      break;
    }
  }
  
  // If we found the actual category and it differs, log a warning
  if (actualCategory !== category && blockSuffix) {
    console.warn(`[Block Normalization] Block data-id "${dataId}" belongs to category "${actualCategory}" but was found in category "${category}"`);
  }
  
  // Use the block suffix from data-id (most reliable)
  if (blockSuffix) {
    // Clean up the suffix: remove numbers at start, replace special chars
    let cleanSuffix = blockSuffix
      .replace(/^[0-9\-+]+/, '')  // Remove leading numbers/signs
      .replace(/[^a-z0-9_]/g, '_')  // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')  // Collapse multiple underscores
      .replace(/^_|_$/g, '');  // Remove leading/trailing underscores
    
    if (cleanSuffix && cleanSuffix.length > 0) {
      return cleanSuffix;
    }
  }
  
  // Fallback: try to extract from category prefix if it matches
  if (cid.startsWith(category + '_')) {
    const suffix = cid.substring(category.length + 1);
    let clean = suffix
      .replace(/^[0-9\-+]+/, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    if (clean && clean.length > 0) return clean;
  }
  
  // Last resort: use text tokens (but be careful with numbers)
  const txt = Array.from(g.querySelectorAll('text, tspan'))
    .map(n => (n.textContent||'').trim().toLowerCase())
    .filter(t => t && !/^[0-9\-+\.]+$/.test(t))  // Filter out pure numbers
    .join(' ');
  
  if (txt) {
    const tokens = txt.split(/\s+/)
      .filter(t => t.length > 0 && !/^[0-9\-+\.]+$/.test(t))  // Filter numeric tokens
      .slice(0, 3);
    if (tokens.length > 0) {
      return tokens.join('_').replace(/[^a-z0-9_]/g, '_');
    }
  }
  
  return null;
}

function cssEscapePartial(s) {
  try { return CSS.escape(s); } catch(_) { return s.replace(/[^\w-]/g,''); }
}

function extractAriaLabelKeyword(selector) {
  // Only extract explicit aria-label values
  const m = selector && selector.match(/aria-label\s*=\s*['\"]([^'\"]+)['\"]/i);
  if (m && m[1]) return m[1];
  return null;
}

function findByDomText(query) {
  // Search for elements whose visible text includes query; prefer sprite-related containers
  const all = Array.from(document.querySelectorAll('div, span, button, [role], [aria-label]'));
  let best = null;
  let bestScore = -Infinity;
  for (const el of all) {
    const txt = (el.textContent || '').trim().toLowerCase();
    if (!txt || !txt.includes(query)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 20 || r.height < 16) continue;
    let score = 0;
    // Prefer smaller tiles over large containers
    score += Math.max(0, 2000 - (r.width * r.height) / 10);
    // Prefer elements with sprite in class or ancestor
    const cls = (el.className || '').toString().toLowerCase();
    if (cls.includes('sprite')) score += 300;
    const anc = el.closest('[class*="sprite" i]');
    if (anc) score += 200;
    if (score > bestScore) { bestScore = score; best = el; }
  }
  return best;
}

function cssPathFor(el) {
  if (!(el instanceof Element)) return '';
  const parts = [];
  while (el && el.nodeType === 1 && parts.length < 6) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += `#${CSS.escape(el.id)}`;
      parts.unshift(selector);
      break;
    }
    const className = (el.className || '').toString().trim().split(/\s+/).filter(Boolean).slice(0,2).map(c => `.${CSS.escape(c)}`).join('');
    selector += className;
    const parent = el.parentNode;
    if (parent) {
      const siblings = Array.from(parent.children).filter(e => e.nodeName === el.nodeName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(el) + 1;
        selector += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(selector);
    el = el.parentElement;
  }
  return parts.join(' > ');
}

function findByTextInToolbox(text) {
  const containers = document.querySelectorAll('.blocklyToolboxDiv, .blocklyToolbox, .blocklyFlyout, body');
  const t = text.trim().toLowerCase();
  let best = null;
  let bestScore = -Infinity;
  containers.forEach(container => {
    const els = container.querySelectorAll('*');
    els.forEach(el => {
      const label = (el.getAttribute && el.getAttribute('aria-label')) || '';
      const txt = (el.textContent || '').trim().toLowerCase();
      const matches = label.toLowerCase() === t || txt === t || txt.includes(t);
      if (!matches) return;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 16) return;
      // scoring: prefer aria-label match, then role/button-like, then proximity to toolbox
      let score = 0;
      if (label.toLowerCase() === t) score += 5;
      if (el.getAttribute('role') === 'button' || el.tagName === 'BUTTON') score += 3;
      if (el.className && /toolbox|category|tree/i.test(el.className)) score += 2;
      // smaller clickable elements over huge containers
      score += Math.max(0, 3000 - (r.width * r.height) / 10);
      if (score > bestScore) { bestScore = score; best = el; }
    });
  });
  return best;
}

function chooseCandidate(selector, elements) {
  const sel = selector.toLowerCase();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const area = (el) => { const r = el.getBoundingClientRect(); return Math.max(0, Math.min(r.width, vw) * Math.min(r.height, vh)); };
  const minSize = (el) => { const r = el.getBoundingClientRect(); return r.width >= 40 && r.height >= 40; };

  // If aiming for stage, pick the largest plausible area
  if (/stage/.test(sel)) {
    return elements.reduce((best, el) => (area(el) > area(best || { getBoundingClientRect: () => ({ width: 0, height: 0 }) }) ? el : best), null);
  }
  // If aiming for sprite, pick a smaller clickable item (likely a tile/button)
  if (/sprite/.test(sel)) {
    const clickable = elements.filter(el => minSize(el) && (el.getAttribute('role') === 'button' || el.querySelector('[role="button"], button, img')));
    if (clickable.length) {
      // pick the smallest among clickable to avoid container selection
      return clickable.reduce((best, el) => (area(el) < area(best || el) ? el : best), null);
    }
  }
  // Default: pick first reasonable sized element
  const sized = elements.filter(minSize);
  return sized[0] || elements[0] || null;
}

function findBestHighlightCandidate() {
  // Prefer probable Stage elements
  const stageSelectors = [
    "[aria-label='Stage']",
    ".stage, .stage-wrapper",
    "[class*='stage'] canvas",
    "canvas"
  ];
  for (const sel of stageSelectors) {
    const els = Array.from(document.querySelectorAll(sel));
    const best = pickLargestRect(els);
    if (best) return best;
  }
  return null;
}

function pickLargestRect(elements) {
  let best = null;
  let bestArea = 0;
  const viewportW = document.documentElement.clientWidth;
  const viewportH = document.documentElement.clientHeight;
  for (const el of elements) {
    const r = el.getBoundingClientRect();
    const area = Math.max(0, Math.min(r.width, viewportW) * Math.min(r.height, viewportH));
    if (r.width >= 150 && r.height >= 100 && area > bestArea) {
      bestArea = area;
      best = el;
    }
  }
  return best;
}

// Clear highlight
function clearHighlight() {
  const highlightBox = document.getElementById('highlight-box');
  highlightBox.style.display = 'none';
  highlightBox.classList.remove('highlight-pulse');
}

// Create and animate a ghost block from origin to target to demonstrate drag action
function showGhostBlock(spec, originEl, targetEl) {
  if (!originEl || !targetEl) return;
  clearGhostBlock();

  // If origin has no size (e.g., container), try to locate a concrete block group by text
  let originRect;
  if (originEl.getBoundingClientRect) {
    originRect = originEl.getBoundingClientRect();
  }
  if (!originRect || originRect.width < 10 || originRect.height < 10) {
    const label = buildGhostLabel(spec);
    const g = highlightElement(`text:${label}`);
    if (g && g.getBoundingClientRect) originRect = g.getBoundingClientRect();
  }
  if (!originRect) return;

  // Prefer the main workspace canvas (not the flyout) as target
  const wsCanvas = getWorkspaceCanvas();
  if (wsCanvas) targetEl = wsCanvas;
  const targetRect = targetEl.getBoundingClientRect();

  ghostBlockEl = document.createElement('div');
  ghostBlockEl.className = 'ghost-block';
  ghostBlockEl.style.position = 'absolute';
  ghostBlockEl.style.left = `${originRect.left + window.scrollX + 8}px`;
  ghostBlockEl.style.top = `${originRect.top + window.scrollY + 8}px`;
  ghostBlockEl.style.background = getBlockColor(spec.type);
  ghostBlockEl.style.borderRadius = '8px';
  ghostBlockEl.style.padding = '8px 12px';
  ghostBlockEl.style.color = '#fff';
  ghostBlockEl.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ghostBlockEl.style.fontSize = '13px';
  ghostBlockEl.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
  ghostBlockEl.style.opacity = '0.9';
  ghostBlockEl.style.zIndex = '1000002';
  ghostBlockEl.style.pointerEvents = 'none';

  const label = buildGhostLabel(spec);
  ghostBlockEl.textContent = label;

  // Optional hint
  if (spec.hint) {
    const hint = document.createElement('div');
    hint.textContent = spec.hint;
    hint.style.marginTop = '6px';
    hint.style.fontSize = '11px';
    hint.style.opacity = '0.9';
    ghostBlockEl.appendChild(hint);
  }

  document.body.appendChild(ghostBlockEl);

  // Compute animation to workspace center area
  const startX = originRect.left + window.scrollX + Math.min(40, Math.max(8, originRect.width / 3));
  const startY = originRect.top + window.scrollY + Math.min(30, Math.max(8, originRect.height / 3));
  const endX = targetRect.left + window.scrollX + targetRect.width * 0.4;
  const endY = targetRect.top + window.scrollY + targetRect.height * 0.3;

  const keyframes = [
    { transform: `translate(0px, 0px) scale(1)`, opacity: 0.0 },
    { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(1.05)`, opacity: 0.95 },
    { transform: `translate(${(endX - startX) * 0.95}px, ${(endY - startY) * 0.95}px) scale(1)`, opacity: 0.0 }
  ];

  ghostBlockEl.style.transform = `translate(${startX - (originRect.left + window.scrollX + 8)}px, ${startY - (originRect.top + window.scrollY + 8)}px)`;

  ghostBlockAnim = ghostBlockEl.animate(keyframes, {
    duration: 1400,
    iterations: Infinity,
    easing: 'ease-in-out'
  });
}

function clearGhostBlock() {
  try { if (ghostBlockAnim) ghostBlockAnim.cancel(); } catch (_) {}
  ghostBlockAnim = null;
  if (ghostBlockEl && ghostBlockEl.parentNode) ghostBlockEl.parentNode.removeChild(ghostBlockEl);
  ghostBlockEl = null;
}

function getBlockColor(type) {
  const colors = {
    motion: '#4C97FF',
    looks: '#9966FF',
    sound: '#CF63CF',
    events: '#FFBF00',
    control: '#FFAB19',
    sensing: '#5CB1D6',
    operators: '#59C059',
    variables: '#FF8C1A',
    lists: '#FF661A'
  };
  return colors[(type || '').toLowerCase()] || '#4C97FF';
}

function buildGhostLabel(spec) {
  const name = (spec.blockName || '').toLowerCase();
  if (spec.type === 'motion' && name.includes('move')) {
    const steps = (spec.params && spec.params.steps) || 10;
    return `move ${steps} steps`;
  }
  if (spec.type === 'events' && name.includes('when_green_flag')) {
    return `when green flag clicked`;
  }
  if (spec.type === 'looks' && name.includes('say')) {
    const txt = (spec.params && spec.params.text) || 'Hello!';
    return `say ${txt}`;
  }
  // Generic label
  return (spec.label || `${spec.type || ''} ${spec.blockName || ''}`).trim();
}

function clearActiveWatchers() {
  activeWatchers.forEach((off) => { try { off(); } catch (_) {} });
  activeWatchers = [];
}

// Decide card position to avoid overlap with target rect
function smartPlaceCard(targetRect, opts = {}) {
  const card = document.getElementById('tutorial-card');
  if (!card) return;

  // Default positions to try in order: bottom-right, bottom-left, top-right, top-left
  const viewportW = document.documentElement.clientWidth;
  const viewportH = document.documentElement.clientHeight;

  // Measure card
  const cr0 = card.getBoundingClientRect();
  const cardW = cr0.width;
  const cardH = cr0.height;
  const margin = 12;

  const leftSpace = targetRect.left - margin;
  const rightSpace = viewportW - (targetRect.right + margin);
  const topSpace = targetRect.top - margin;
  const bottomSpace = viewportH - (targetRect.bottom + margin);

  const setAbs = (left, top) => {
    card.style.left = `${Math.max(8, Math.min(left, viewportW - cardW - 8))}px`;
    card.style.top = `${Math.max(8, Math.min(top, viewportH - cardH - 8))}px`;
    card.style.right = 'auto';
    card.style.bottom = 'auto';
  };

  // Prefer side if requested
  if (opts.preferSide === 'left' && leftSpace > cardW) {
    setAbs(targetRect.left - cardW - margin, targetRect.top);
    const cr = card.getBoundingClientRect();
    if (!rectsOverlap(cr, targetRect)) return;
  }
  if (opts.preferSide === 'right' && rightSpace > cardW) {
    setAbs(targetRect.right + margin, targetRect.top);
    const cr = card.getBoundingClientRect();
    if (!rectsOverlap(cr, targetRect)) return;
  }

  // Choose the side with most space
  const sides = [
    { side: 'left', space: leftSpace, place: () => setAbs(targetRect.left - cardW - margin, targetRect.top) },
    { side: 'right', space: rightSpace, place: () => setAbs(targetRect.right + margin, targetRect.top) },
    { side: 'bottom', space: bottomSpace, place: () => setAbs(targetRect.left, targetRect.bottom + margin) },
    { side: 'top', space: topSpace, place: () => setAbs(targetRect.left, targetRect.top - cardH - margin) }
  ].sort((a,b)=>b.space-a.space);

  for (const s of sides) {
    s.place();
    const cr = card.getBoundingClientRect();
    if (!rectsOverlap(cr, targetRect)) return;
  }

  // Fallback to screen corners
  const corners = [
    { x: viewportW - cardW - 16, y: viewportH - cardH - 16 },
    { x: 16, y: viewportH - cardH - 16 },
    { x: viewportW - cardW - 16, y: 16 },
    { x: 16, y: 16 }
  ];
  for (const c of corners) {
    setAbs(c.x, c.y);
    const cr = card.getBoundingClientRect();
    if (!rectsOverlap(cr, targetRect)) return;
  }
}

function rectsOverlap(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

// Setup completion detection based on spec
function setupCompletionWatcher(spec, onComplete) {
  // Remove previous listeners by scoping to one-time calls inside each step
  const type = spec.type;
  if (type === 'clickSelector' && spec.selector) {
    const handler = (e) => {
      // 1) key: resolution match or direct CSS closest()
      let matched = false;
      if ((spec.selector || '').trim().startsWith('key:') || spec.selector.indexOf('.') > -1 || spec.selector.indexOf('#') > -1 || spec.selector.indexOf('[') > -1) {
        const targetEl = resolveSelector(spec.selector);
        if (targetEl) {
          matched = targetEl.contains(e.target) || e.target === targetEl;
          if (!matched) {
            const r = targetEl.getBoundingClientRect();
            const x = e.clientX, y = e.clientY;
            matched = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
          }
        }
      } else {
        try { matched = !!e.target.closest(spec.selector); } catch(_) { matched = false; }
      }
      // 2) geometric match: click point inside any target element's rect
      if (!matched) {
        const x = e.clientX;
        const y = e.clientY;
        if ((spec.selector || '').trim().startsWith('key:')) {
          const t = resolveSelector(spec.selector);
          if (t) {
            const r = t.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) matched = true;
          }
        } else {
          try {
            const targets = Array.from(document.querySelectorAll(spec.selector));
            for (const t of targets) {
              const r = t.getBoundingClientRect();
              if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { matched = true; break; }
            }
          } catch(_) {}
        }
      }
      // 3) fallback: if we have a current highlight, use its rect
      if (!matched) {
        const hb = document.getElementById('highlight-box');
        if (hb && hb.style.display === 'block') {
          const r = hb.getBoundingClientRect();
          const x = e.clientX, y = e.clientY;
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) matched = true;
        }
      }
      if (matched) {
        onComplete();
      }
    };
    window.addEventListener('click', handler, true);
    activeWatchers.push(() => window.removeEventListener('click', handler, true));
  } else if (type === 'elementPresent' && spec.selector) {
    const iv = setInterval(() => {
      if (document.querySelector(spec.selector)) {
        onComplete();
      }
    }, 500);
    const t = setTimeout(() => clearInterval(iv), spec.timeoutMs || 20000);
    activeWatchers.push(() => { clearInterval(iv); clearTimeout(t); });
  } else if (type === 'blocklyText' && spec.text) {
    let isDragging = false;
    let dragStartTime = 0;
    
    const checkForBlock = () => {
      const canvas = getWorkspaceCanvas();
      if (canvas) {
        const groups = Array.from(canvas.querySelectorAll('g.blocklyDraggable, g.blocklyBlock'));
        const norm = (s) => (s || '').toLowerCase();
        const terms = norm(spec.text).split(/\s+/).filter(Boolean);
        const anyMatch = groups.some(g => {
          // Ensure block is actually in the workspace, not in flyout
          if (g.closest('.blocklyFlyout')) {
            return false;
          }
          
          // Skip blocks that are currently being dragged (they might be in a temporary state)
          // Blockly sets a very high z-index on dragging blocks
          const style = window.getComputedStyle(g);
          const zIndex = parseInt(style.zIndex);
          if (zIndex > 1000 && isDragging) {
            return false; // Skip dragging blocks
          }
          
          const joined = Array.from(g.querySelectorAll('text, tspan')).map(n => norm(n.textContent)).join(' ');
          const textOk = terms.every(t => joined.includes(t));
          const dataId = (g.getAttribute('data-id') || '').toLowerCase();
          const idOk = dataId.includes('event_whenflagclicked') || dataId.includes('whenflagclicked');
          return textOk || (terms.includes('when') && terms.includes('green') && terms.includes('flag') && idOk);
        });
        if (anyMatch) {
          onComplete();
          return true;
        }
      }
      return false;
    };
    
    // Immediate check
    if (checkForBlock()) return;
    
    // Add mouse/pointer event listeners to detect drag operations
    const handleMouseDown = (e) => {
      // Check if clicking on a block in the flyout
      const target = e.target.closest('g.blocklyDraggable, g.blocklyBlock');
      if (target) {
        const flyout = target.closest('.blocklyFlyout');
        if (flyout) {
          const dataId = (target.getAttribute('data-id') || '').toLowerCase();
          const norm = (s) => (s || '').toLowerCase();
          const terms = norm(spec.text).split(/\s+/).filter(Boolean);
          const idOk = dataId.includes('event_whenflagclicked') || dataId.includes('whenflagclicked');
          
          // Check text content
          const blockText = Array.from(target.querySelectorAll('text, tspan')).map(n => norm(n.textContent)).join(' ');
          const textOk = terms.every(t => blockText.includes(t)) || 
                         (terms.includes('when') && terms.includes('green') && terms.includes('flag') && blockText.includes('when'));
          
          if (idOk || textOk) {
            isDragging = true;
            dragStartTime = Date.now();
          }
        }
      }
    };
    
    const handleMouseUp = (e) => {
      if (isDragging) {
        isDragging = false;
        // Check multiple times with delays to catch Blockly's block placement
        // Blockly may need time to update the DOM after a drag
        checkForBlock(); // Immediate check
        setTimeout(() => checkForBlock(), 50);   // Quick check
        setTimeout(() => checkForBlock(), 150);  // Medium check
        setTimeout(() => checkForBlock(), 300);   // Longer check
        setTimeout(() => checkForBlock(), 500);  // Final check
      } else {
        // Check on any mouseup in case block was already placed
        checkForBlock();
      }
    };
    
    // Listen for drag events on the document to catch drag operations
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('pointerdown', handleMouseDown, true);
    document.addEventListener('pointerup', handleMouseUp, true);
    
    activeWatchers.push(() => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('pointerdown', handleMouseDown, true);
      document.removeEventListener('pointerup', handleMouseUp, true);
    });
    
    // Also use MutationObserver for real-time detection when blocks are added/changed
    const canvas = getWorkspaceCanvas();
    if (canvas) {
      const mo = new MutationObserver(() => {
        checkForBlock();
      });
      mo.observe(canvas, { childList: true, subtree: true, characterData: true, attributes: true });
      activeWatchers.push(() => mo.disconnect());
    }
    
    // More frequent interval check during potential drag operations
    const iv = setInterval(() => {
      checkForBlock();
    }, 300); // Increased frequency from 600ms to 300ms
    const t = setTimeout(() => clearInterval(iv), spec.timeoutMs || 20000);
    activeWatchers.push(() => { clearInterval(iv); clearTimeout(t); });
  } else if (type === 'blocklyAnyChange') {
    const canvas = getWorkspaceCanvas();
    if (canvas) {
      const initial = canvas.querySelectorAll('g.blocklyDraggable').length;
      const mo = new MutationObserver(() => {
        const now = canvas.querySelectorAll('g.blocklyDraggable').length;
        if (now > initial) {
          onComplete();
        }
      });
      mo.observe(canvas, { childList: true, subtree: true });
      activeWatchers.push(() => mo.disconnect());
    }
  }
}

function simulateClick(el) {
  // Try to find the actual clickable control (button/role/button-like container)
  let target = el.closest('button, [role="button"], .green-flag, .stage-header_green-flag, .controls_controls-container_FKkXX') || el;
  const r = target.getBoundingClientRect();
  const x = r.left + Math.min(4, Math.max(2, r.width / 4));
  const y = r.top + Math.min(4, Math.max(2, r.height / 2));
  const opts = { bubbles: true, clientX: x, clientY: y, view: window };
  try { target.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch(_) {}
  try { target.dispatchEvent(new MouseEvent('mousedown', opts)); } catch(_) {}
  try { target.dispatchEvent(new PointerEvent('pointerup', opts)); } catch(_) {}
  try { target.dispatchEvent(new MouseEvent('mouseup', opts)); } catch(_) {}
  try { target.dispatchEvent(new MouseEvent('click', opts)); } catch(_) { if (typeof target.click === 'function') target.click(); }
}

function getWorkspaceCanvas() {
  const canvases = Array.from(document.querySelectorAll('.blocklyBlockCanvas'));
  // Exclude canvases inside flyout
  return canvases.find(cv => !cv.closest('.blocklyFlyout')) || canvases[0] || null;
}

function getFlyoutCanvas() {
  return document.querySelector('.blocklyFlyout .blocklyBlockCanvas');
}

function joinSvgText(el) {
  return Array.from(el.querySelectorAll('text, tspan')).map(n => (n.textContent || '').trim().toLowerCase()).filter(Boolean).join(' ');
}

function robustFindFlyoutBlock(keyPath, def) {
  const m = keyPath.match(/^flyout\.block\.([^\.]+)\.(.+)$/);
  if (!m) return null;
  const category = m[1];
  
  // Step 1: Ensure category is open (synchronous check only)
  // Map lists -> variables (they share the same category button)
  const categoryForButton = category === 'lists' ? 'variables' : category;
  try {
    const catEl = resolveSelector(`key:toolbox.category.${categoryForButton}`);
    if (catEl) {
      // Check if already selected
      const isSelected = catEl.classList.contains('categorySelected') || 
                        catEl.getAttribute('aria-selected') === 'true' ||
                        catEl.closest('.scratchCategoryMenuItem')?.classList.contains('categorySelected');
      if (!isSelected) {
        simulateClick(catEl);
      }
    }
  } catch(_) {}

  // Step 2: Get flyout canvas (must be inside .blocklyFlyout)
  const flyout = document.querySelector('.blocklyFlyout');
  if (!flyout) return null;
  const canvas = flyout.querySelector('.blocklyBlockCanvas');
  if (!canvas) return null;

  // Step 3: Try exact CSS selectors first (most reliable)
  if (def && def.css && Array.isArray(def.css)) {
    for (const cssSel of def.css) {
      try {
        // Scope to flyout canvas
        const candidates = Array.from(canvas.querySelectorAll(cssSel));
        if (candidates.length === 1) {
          const el = candidates[0];
          const g = el.closest('g.blocklyDraggable, g.blocklyBlock') || 
                   (el.tagName === 'g' && (el.classList.contains('blocklyDraggable') || el.classList.contains('blocklyBlock')) ? el : null);
          if (g && g.closest('.blocklyFlyout')) {
            highlightBlockElement(g);
            return g;
          }
        } else if (candidates.length > 1) {
          // Multiple matches: find first valid block wrapper
          for (const el of candidates) {
            const g = el.closest('g.blocklyDraggable, g.blocklyBlock') || 
                     (el.tagName === 'g' && (el.classList.contains('blocklyDraggable') || el.classList.contains('blocklyBlock')) ? el : null);
            if (g && g.closest('.blocklyFlyout')) {
            highlightBlockElement(g);
            return g;
            }
          }
        }
      } catch(_) {}
    }
  }

  // Step 4: Fallback to intelligent search by data-id and text
  const expectedText = (def && def.flyoutText) ? String(def.flyoutText).toLowerCase() : null;
  let expectedDataId = null;
  if (def && def.css && def.css.length) {
    for (const sel of def.css) {
      const mId = sel.match(/data-id\*?=\s*['"]([^'"\]]+)['"]/i);
      if (mId && mId[1]) { expectedDataId = mId[1].toLowerCase(); break; }
    }
  }
  // Known mappings
  if (!expectedDataId && /when_green_flag|whenflag|event_whenflagclicked/.test(keyPath.toLowerCase())) {
    expectedDataId = 'event_whenflagclicked';
  }

  const groups = Array.from(canvas.querySelectorAll('g.blocklyDraggable, g.blocklyBlock'));
  let best = null; let bestScore = -Infinity;
  for (const g of groups) {
    const dataId = (g.getAttribute('data-id') || '').toLowerCase();
    const joined = joinSvgText(g);
    let score = 0;
    
    // Exact data-id match is strongest
    if (expectedDataId && dataId === expectedDataId) score += 2000;
    else if (expectedDataId && dataId.includes(expectedDataId)) score += 1000;
    
    // Text match is strong
    if (expectedText) {
      const terms = expectedText.split(/\s+/).filter(Boolean);
      if (terms.every(t => joined.includes(t))) score += 600;
    }
    
    // Event blocks have yellow-ish fill
    const path = g.querySelector('path.blocklyBlockBackground, path.blocklyPath');
    if (path && category === 'events') {
      const fill = (path.getAttribute('fill') || '').toLowerCase();
      if (fill.includes('#ffd') || fill.includes('ffbf00') || fill.includes('ffcd1f') || fill.includes('ffc') || fill.includes('255,191')) score += 40;
    }
    
    // Prefer blocks near top
    const r = g.getBoundingClientRect();
    if (r) score += Math.max(0, 200 - r.top);
    
    if (score > bestScore) { bestScore = score; best = g; }
  }

  if (best && bestScore > 500) {
    highlightBlockElement(best);
    return best;
  }
  return null;
}

function highlightBlockElement(g) {
  if (!g) return;
  
  // Ensure we have the block wrapper, not a child element
  const blockWrapper = g.closest('g.blocklyDraggable, g.blocklyBlock') || 
                      (g.tagName === 'g' && (g.classList.contains('blocklyDraggable') || g.classList.contains('blocklyBlock')) ? g : null);
  if (!blockWrapper) return;
  
  const rect = blockWrapper.getBoundingClientRect();
  
  // If rect is invalid, try to calculate from children (for SVG elements)
  if (rect.width === 0 || rect.height === 0) {
    const children = blockWrapper.querySelectorAll('path, rect, circle, text, g');
    if (children.length === 0) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    children.forEach(child => {
      const childRect = child.getBoundingClientRect();
      if (childRect.width > 0 && childRect.height > 0) {
        minX = Math.min(minX, childRect.left);
        minY = Math.min(minY, childRect.top);
        maxX = Math.max(maxX, childRect.right);
        maxY = Math.max(maxY, childRect.bottom);
      }
    });
    
    if (minX === Infinity) return;
    
    const pad = 6;
    const highlightBox = document.getElementById('highlight-box');
    if (highlightBox) {
      highlightBox.style.display = 'block';
      highlightBox.style.width = `${Math.max(0, maxX - minX + pad * 2)}px`;
      highlightBox.style.height = `${Math.max(0, maxY - minY + pad * 2)}px`;
      highlightBox.style.left = `${minX + window.scrollX - pad}px`;
      highlightBox.style.top = `${minY + window.scrollY - pad}px`;
      highlightBox.classList.add('highlight-pulse');
    }
    return;
  }
  
  const pad = 6;
  const highlightBox = document.getElementById('highlight-box');
  if (highlightBox) {
    highlightBox.style.display = 'block';
    highlightBox.style.width = `${Math.max(0, rect.width + pad * 2)}px`;
    highlightBox.style.height = `${Math.max(0, rect.height + pad * 2)}px`;
    highlightBox.style.left = `${rect.left + window.scrollX - pad}px`;
    highlightBox.style.top = `${rect.top + window.scrollY - pad}px`;
    highlightBox.classList.add('highlight-pulse');
  }
}

function buildCompletionSpec(step) {
  if (step.completeWhen) return step.completeWhen;
  // If any action has a clickSelector
  if (step.actions && step.actions.length) {
    const act = step.actions.find(a => a.clickSelector);
    if (act && act.clickSelector) return { type: 'clickSelector', selector: act.clickSelector };
  }
  // Click on highlighted area implied
  const clicky = /click|press|tap/i;
  if (step.highlightSelector && (clicky.test(step.pointerText || '') || clicky.test(step.description || ''))) {
    return { type: 'clickSelector', selector: step.highlightSelector };
  }
  // If dragging blocks implied
  const draggy = /drag|drop|block/i;
  if (step.ghostBlock || draggy.test(step.title || '') || draggy.test(step.description || '')) {
    return { type: 'blocklyAnyChange' };
  }
  return null;
}

// Navigation functions
function nextStep() {
  if (currentTutorialStep < tutorialData.length - 1) {
    showStep(currentTutorialStep + 1);
  } else {
    // Tutorial completed! Show congratulations screen
    showCongratulationsScreen();
  }
}

function previousStep() {
  if (currentTutorialStep > 0) {
    showStep(currentTutorialStep - 1);
  }
}

function showCongratulationsScreen() {
  // Calculate stars based on hints used
  const totalSteps = tutorialData.length;
  const stepsWithHints = Object.keys(hintsUsed).filter(stepIdx => hintsUsed[stepIdx]).length;
  const hintPercentage = totalSteps > 0 ? (stepsWithHints / totalSteps) * 100 : 0;
  
  // Determine star rating based on hint usage
  let stars = 3;
  let scoreText = "3 STARS";
  let scoreSubtext = "Perfect Score!";
  let message = "You're a Scratch superstar! 🌟";
  
  if (hintPercentage > 50) {
    stars = 1;
    scoreText = "1 STAR";
    scoreSubtext = "Good effort!";
    message = "You completed it! Try again with fewer hints for more stars! 🌟";
  } else if (hintPercentage > 20) {
    stars = 2;
    scoreText = "2 STARS";
    scoreSubtext = "Great job!";
    message = "Well done! Try using fewer hints next time for 3 stars! ⭐";
  }
  
  // Save achievement to storage with calculated stars
  saveAchievement('tutorial_completed', stars);
  
  // Clear watchers but keep overlay
  clearActiveWatchers();
  
  // Hide tutorial card
  const card = document.getElementById('tutorial-card');
  if (card) {
    card.style.display = 'none';
  }
  
  // Create congratulations overlay
  const congratsOverlay = document.createElement('div');
  congratsOverlay.id = 'congratulations-overlay';
  congratsOverlay.innerHTML = `
    <div class="congrats-backdrop"></div>
    <div class="congrats-content">
      <div class="congrats-header">
        <h1 class="congrats-title">🎉 Congratulations! 🎉</h1>
        <p class="congrats-subtitle">You completed the tutorial!</p>
      </div>
      
      <div class="stars-container">
        ${stars >= 1 ? '<div class="star star-1">⭐</div>' : '<div class="star star-1" style="opacity: 0.3;">⭐</div>'}
        ${stars >= 2 ? '<div class="star star-2">⭐</div>' : '<div class="star star-2" style="opacity: 0.3;">⭐</div>'}
        ${stars >= 3 ? '<div class="star star-3">⭐</div>' : '<div class="star star-3" style="opacity: 0.3;">⭐</div>'}
      </div>
      
      <div class="congrats-score">
        <div class="score-text">${scoreText}</div>
        <div class="score-subtext">${scoreSubtext}</div>
      </div>
      
      <div class="congrats-message">
        <p>${message}</p>
        <p>Keep learning and creating amazing projects!</p>
      </div>
      
      <button class="congrats-btn" id="congrats-close-btn">Continue</button>
    </div>
  `;
  
  document.body.appendChild(congratsOverlay);
  
  // Animate stars appearing (only the earned ones)
  setTimeout(() => {
    const starsEls = congratsOverlay.querySelectorAll('.star');
    starsEls.forEach((star, index) => {
      if (index < stars) {
      setTimeout(() => {
        star.classList.add('star-appear');
      }, index * 300);
      }
    });
  }, 100);
  
  // Close button handler
  const closeBtn = congratsOverlay.querySelector('#congrats-close-btn');
  closeBtn.addEventListener('click', () => {
    congratsOverlay.remove();
    closeTutorial();
    // Try to reopen the extension popup
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'reopenPopup' }, (response) => {
        // If that doesn't work, try opening popup directly
        if (chrome.runtime.lastError || !response || !response.success) {
          // Fallback: try to open popup URL (may not work, but worth trying)
          try {
            chrome.runtime.sendMessage({ action: 'openPopup' });
          } catch (e) {
            console.log('Could not reopen popup automatically');
          }
        }
      });
    }
  });
  
  // Close on backdrop click
  const backdrop = congratsOverlay.querySelector('.congrats-backdrop');
  backdrop.addEventListener('click', () => {
    congratsOverlay.remove();
    closeTutorial();
  });
}

function saveAchievement(achievementId, stars) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['achievements'], (result) => {
      const achievements = result.achievements || {};
      achievements[achievementId] = {
        stars: stars,
        completed: true,
        date: new Date().toISOString()
      };
      chrome.storage.local.set({ achievements }, () => {
        console.log('Achievement saved:', achievementId, stars);
      });
    });
  }
}

function closeTutorial() {
  // Clear all watchers
  clearActiveWatchers();
  
  // Remove congratulations overlay if exists
  const congratsOverlay = document.getElementById('congratulations-overlay');
  if (congratsOverlay) {
    congratsOverlay.remove();
  }
  
  // Remove overlay
  if (tutorialOverlay) {
    tutorialOverlay.remove();
    tutorialOverlay = null;
  }
  
  // Remove tutorial card if it was moved to body
  const card = document.getElementById('tutorial-card');
  if (card && card.parentElement) {
    card.remove();
  }
  
  // Clear highlights and pointers
  clearHighlight();
  const pointer = document.getElementById('tutorial-pointer');
  if (pointer) {
    pointer.style.display = 'none';
  }
  
  // Clear ghost block
  clearGhostBlock();
  
  // Reset state
  currentTutorialStep = 0;
  tutorialData = [];
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startTutorial') {
    // Store tutorial metadata for progress tracking
    if (request.mainLessonTitle !== undefined) {
      tutorialMetadata.mainLessonTitle = request.mainLessonTitle;
    }
    if (request.miniLessonIndex !== undefined) {
      tutorialMetadata.miniLessonIndex = request.miniLessonIndex;
    }
    
    // If we're in the editor iframe or the top editor page, run directly; otherwise forward
    if (location.hostname === 'projects.scratch.mit.edu' || isScratchEditor()) {
      injectTutorialCSS();
      startTutorial(request.tutorialData);
      sendResponse({ success: true });
    } else {
      try {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        const editorFrame = iframes.find(f => {
          const src = f.getAttribute('src') || '';
          return src.includes('projects.scratch.mit.edu');
        });
        if (editorFrame && editorFrame.contentWindow) {
          editorFrame.contentWindow.postMessage({ type: 'scratch_ai_start_tutorial', tutorialData: request.tutorialData }, '*');
          sendResponse({ success: true, forwarded: true });
        } else {
          sendResponse({ success: false, reason: 'no_editor_iframe' });
        }
      } catch (e) {
        sendResponse({ success: false, reason: 'forward_error', error: String(e) });
      }
    }
  } else if (request.action === 'getContext') {
    const context = {
      url: window.location.href,
      title: document.title,
    };
    sendResponse(context);
  } else if (request.action === 'testSelectorMap') {
    const testResults = testSelectors();
    try { sendResponse({ results: testResults }); } catch(_) {}
  } else if (request.action === 'testSelectorsInteractive') {
    startInteractiveSelectorTest();
    try { sendResponse({ success: true }); } catch(_) {}
  } else if (request.action === 'listSelectorKeys') {
    try { sendResponse({ keys: enumerateSelectorKeys() }); } catch(_) {}
  } else if (request.action === 'selectorReviewShow') {
    const el = resolveKey(request.key);
    if (el) {
      (async () => {
        const target = await highlightElement(`key:${request.key}`) || el;
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch(_) {}
      const r = (target || el).getBoundingClientRect();
      ensureHighlightShell();
      const pointer = document.getElementById('tutorial-pointer');
      const label = document.getElementById('pointer-label');
      if (pointer && label) {
        const vw = document.documentElement.clientWidth;
        const spaceRight = vw - (r.right + 8);
        const px = spaceRight < 120 ? (r.left + window.scrollX - 20) : (r.right + window.scrollX + 8);
        const py = r.top + window.scrollY + Math.min(24, r.height / 2);
        pointer.style.left = `${px}px`;
        pointer.style.top = `${py}px`;
        label.textContent = request.key;
        pointer.style.display = 'block';
      }
      })();
    }
    try { sendResponse({ found: !!el }); } catch(_) {}
  } else if (request.action === 'selectorReviewApprove') {
    const el = resolveKey(request.key);
    if (el) {
      const css = cssPathFor(el);
      console.log('[Selector Approved]', request.key, '=>', css);
    } else {
      console.log('[Selector Approved]', request.key, '=> NOT FOUND');
    }
    try { sendResponse({ ok: true }); } catch(_) {}
  } else if (request.action === 'selectorReviewReject') {
    console.log('[Selector Rejected]', request.key);
    try { sendResponse({ ok: true }); } catch(_) {}
  } else if (request.action === 'selectorPickStart') {
    // Enter pick mode: hide card and guides so nothing blocks clicks
    const card = document.getElementById('tutorial-card');
    const pointer = document.getElementById('tutorial-pointer');
    const highlightBox = document.getElementById('highlight-box');
    const prevCardDisplay = card ? card.style.display : '';
    const prevPointerDisplay = pointer ? pointer.style.display : '';
    const prevHighlightDisplay = highlightBox ? highlightBox.style.display : '';
    if (card) card.style.display = 'none';
    if (pointer) pointer.style.display = 'none';
    if (highlightBox) highlightBox.style.display = 'none';
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'crosshair';

    const cleanup = () => {
      if (card) card.style.display = prevCardDisplay;
      if (pointer) pointer.style.display = prevPointerDisplay;
      if (highlightBox) highlightBox.style.display = prevHighlightDisplay;
      document.body.style.cursor = prevCursor;
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };

    const onClick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const el = e.target;
      const css = cssPathFor(el);
      console.log('[Selector Picked]', request.key, '=>', css);
      cleanup();
      try { sendResponse({ ok: true, css }); } catch(_) {}
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        console.log('[Selector Pick Cancelled]', request.key);
        cleanup();
        try { sendResponse({ ok: false, cancelled: true }); } catch(_) {}
      }
    };
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKeyDown, true);
  } else if (request.action === 'scanAllBlocks') {
    (async () => {
      const mapOut = { flyout: { block: {} } };
      const cats = getToolboxCategories();
      
      // Map from data-id prefix to category name
      const dataIdToCategory = {
        'motion_': 'motion',
        'looks_': 'looks',
        'sound_': 'sound',
        'event_': 'events',
        'control_': 'control',
        'sensing_': 'sensing',
        'operator_': 'operators',
        'data_': 'variables'  // Variables and lists both use data_ prefix
      };
      
      for (const { key, el } of cats) {
        // open category
        try { simulateClick(el); } catch(_) {}
        await new Promise(r => setTimeout(r, 250));
        const canvas = document.querySelector('.blocklyFlyout .blocklyBlockCanvas');
        if (!canvas) continue;
        const groups = Array.from(canvas.querySelectorAll('g.blocklyDraggable, g.blocklyBlock'));
        
        groups.forEach(g => {
          const dataId = g.getAttribute('data-id') || '';
          if (!dataId) return;
          
          // Determine actual category from data-id prefix
          const cid = dataId.toLowerCase().trim();
          let actualCategory = null;
          let matchedPrefix = null;
          
          for (const [prefix, cat] of Object.entries(dataIdToCategory)) {
            if (cid.startsWith(prefix)) {
              actualCategory = cat;
              matchedPrefix = prefix;
              break;
            }
          }
          
          // If we can't determine category, skip this block
          if (!actualCategory) {
            console.warn(`[Block Scan] Could not determine category for block: "${dataId}" (opened category was: ${catName})`);
            return;
          }
          
          // Warn if block is being found in wrong category
          if (actualCategory !== catName) {
            console.log(`[Block Scan] Block "${dataId}" belongs to "${actualCategory}" but found while "${catName}" category was open`);
          }
          
          // Normalize block key (use actual category)
          const norm = normalizeBlockKey(actualCategory, dataId, g);
          if (!norm) {
            console.warn(`[Block Scan] Could not normalize block key for: ${dataId}`);
            return;
          }
          
          // Place block in correct category
          if (!mapOut.flyout.block[actualCategory]) mapOut.flyout.block[actualCategory] = {};
          if (!mapOut.flyout.block[actualCategory][norm]) mapOut.flyout.block[actualCategory][norm] = {};
          
          // Add CSS selector
          if (!mapOut.flyout.block[actualCategory][norm].css) {
            mapOut.flyout.block[actualCategory][norm].css = [];
          }
          const cssSelector = `g[data-id*='${cssEscapePartial(dataId.split(' ').join(''))}']`;
          if (!mapOut.flyout.block[actualCategory][norm].css.includes(cssSelector)) {
            mapOut.flyout.block[actualCategory][norm].css.push(cssSelector);
          }
          
          // Add flyout text
          const joined = Array.from(g.querySelectorAll('text, tspan')).map(n => (n.textContent||'').trim()).filter(Boolean).join(' ').trim();
          if (joined && !mapOut.flyout.block[actualCategory][norm].flyoutText) {
            mapOut.flyout.block[actualCategory][norm].flyoutText = joined;
          }
        });
      }
      console.log('[Selector Map Scan] Generated:', mapOut);
      try { sendResponse({ ok: true, map: mapOut }); } catch(_) {}
    })();
  } else if (request.action === 'mergeSelectorMap') {
    try {
      const incoming = request.map;
      if (incoming && typeof incoming === 'object') {
        // Clean malformed keys before merging
        const cleaned = cleanMalformedKeys(incoming);
        if (JSON.stringify(cleaned) !== JSON.stringify(incoming)) {
          console.log('[Selector Map] 🧹 Cleaned malformed keys from incoming map');
        }
        
        // Merge into live map only (temporary - for current session)
        deepMerge(SELECTOR_MAP, cleaned);
        console.log('[Selector Map] Merged incoming map (temporary - not saved to storage)');
        
        // Storage persistence DISABLED - hardcoded map is the only source of truth
        // Maps merged this way will only exist for the current session
        sendResponse && sendResponse({ ok: true, persisted: false, note: 'Map merged temporarily (not saved to storage)' });
      } else {
        sendResponse && sendResponse({ ok: false });
      }
    } catch(_) {
      try { sendResponse({ ok: false }); } catch(__) {}
    }
  } else if (request.action === 'cleanStorageKeys') {
    // Clean malformed keys from storage
        try {
          if (chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['selectorMapOverrides'], (res) => {
              const overrides = res && res.selectorMapOverrides ? res.selectorMapOverrides : {};
          const cleaned = cleanMalformedKeys(overrides);
          chrome.storage.local.set({ selectorMapOverrides: cleaned }, () => {
            // Reload SELECTOR_MAP
            deepMerge(SELECTOR_MAP, cleaned);
            console.log('[Selector Map] ✅ Cleaned and reloaded storage');
            try { sendResponse({ ok: true, cleaned: true }); } catch(_) {}
              });
            });
        return true;
          }
        } catch(_) {}
      try { sendResponse({ ok: false }); } catch(__) {}
  }
  return true;
});

// Inject CSS on load
injectTutorialCSS();

// Detect Scratch editor in top frame (scratch.mit.edu /projects/{id}/editor)
function isScratchEditor() {
  const onScratch = location.hostname.endsWith('scratch.mit.edu');
  if (!onScratch) return false;
  const path = location.pathname;
  if (/\/projects\/[^\/]+\/editor\/?$/.test(path)) return true;
  // Heuristic DOM checks
  const hasStage = document.querySelector('.stage, [class*="stage-"], .stage-wrapper, canvas[class*="stage"]');
  const hasBlockly = document.querySelector('.blocklyWorkspace, .blocklyFlyout');
  return !!(hasStage || hasBlockly);
}

// Wait until toolbox/flyout is available
async function waitForEditorReady(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hasToolbox = document.querySelector('.scratchCategoryMenuItem, .blocklyToolboxDiv, .blocklyToolboxCategory, .blocklyTreeRow');
    const hasFlyout = document.querySelector('.blocklyFlyout, .blocklyBlockCanvas');
    if (hasToolbox || hasFlyout) return true;
    await new Promise(r => setTimeout(r, 150));
  }
  return false;
}

// Internal scan routine reused by action and auto-scan
async function scanAllBlocksInternal() {
  const mapOut = { flyout: { block: {} } };
  const cats = getToolboxCategories();
  
  // Map from data-id prefix to category name
  const dataIdToCategory = {
    'motion_': 'motion',
    'looks_': 'looks',
    'sound_': 'sound',
    'event_': 'events',
    'control_': 'control',
    'sensing_': 'sensing',
    'operator_': 'operators',
    'data_': 'variables'  // Variables and lists both use data_ prefix
  };
  
  for (const { key, el } of cats) {
    try { simulateClick(el); } catch(_) {}
    await new Promise(r => setTimeout(r, 250));
    const canvas = document.querySelector('.blocklyFlyout .blocklyBlockCanvas');
    if (!canvas) continue;
    
    const groups = Array.from(canvas.querySelectorAll('g.blocklyDraggable, g.blocklyBlock'));
    groups.forEach(g => {
      const dataId = g.getAttribute('data-id') || '';
      if (!dataId) return;
      
      // Determine actual category from data-id prefix
      const cid = dataId.toLowerCase();
      let actualCategory = null;
      for (const [prefix, cat] of Object.entries(dataIdToCategory)) {
        if (cid.startsWith(prefix)) {
          actualCategory = cat;
          break;
        }
      }
      
      // If we can't determine category, skip this block
      if (!actualCategory) {
        console.warn(`[Block Scan] Could not determine category for block: ${dataId}`);
        return;
      }
      
      // Normalize block key using actual category
      const norm = normalizeBlockKey(actualCategory, dataId, g);
      if (!norm) return;
      
      // Place block in correct category
      if (!mapOut.flyout.block[actualCategory]) mapOut.flyout.block[actualCategory] = {};
      if (!mapOut.flyout.block[actualCategory][norm]) mapOut.flyout.block[actualCategory][norm] = {};
      
      // Add CSS selector
      if (!mapOut.flyout.block[actualCategory][norm].css) {
        mapOut.flyout.block[actualCategory][norm].css = [];
      }
      const cssSelector = `g[data-id*='${cssEscapePartial(dataId.split(' ').join(''))}']`;
      if (!mapOut.flyout.block[actualCategory][norm].css.includes(cssSelector)) {
        mapOut.flyout.block[actualCategory][norm].css.push(cssSelector);
      }
      
      // Add flyout text
      const joined = Array.from(g.querySelectorAll('text, tspan'))
        .map(n => (n.textContent||'').trim())
        .filter(Boolean).join(' ').trim();
      if (joined && !mapOut.flyout.block[actualCategory][norm].flyoutText) {
        mapOut.flyout.block[actualCategory][norm].flyoutText = joined;
      }
    });
  }
  return mapOut;
}

// Auto-scan and merge selector map automatically
// DISABLED: We now use hardcoded selector-map.json which is more reliable
// Auto-scan can be manually triggered via "Scan Blocks" button if needed
async function scanAndPersistSelectorMapIfNeeded() {
  // Auto-scan disabled - using hardcoded selector-map.json instead
  // This prevents incorrectly categorized blocks from overwriting the correct map
  console.log('[Selector Map] Auto-scan disabled - using hardcoded selector-map.json');
  return;
  
  /* DISABLED CODE - kept for reference
  try {
    if (!isScratchEditor()) return;
    if (!(chrome && chrome.storage && chrome.storage.local)) return;
    
    // Wait for editor to be ready
    const ready = await waitForEditorReady();
    if (!ready) {
      console.warn('[Selector Map] Editor not ready, retrying...');
      setTimeout(() => scanAndPersistSelectorMapIfNeeded(), 1000);
      return;
    }
    
    await new Promise(r => setTimeout(r, 500)); // Extra wait for flyout to stabilize

    // Check if we need to scan
    chrome.storage.local.get(['selectorMapScannedV1', 'selectorMapOverrides'], async (res) => {
      const already = !!res && !!res.selectorMapScannedV1;
      const overrides = res && res.selectorMapOverrides ? res.selectorMapOverrides : {};
      const hasFlyout = !!(overrides && overrides.flyout && overrides.flyout.block && Object.keys(overrides.flyout.block).length > 0);
      
      // Always merge existing overrides first (in case of updates)
      if (overrides && Object.keys(overrides).length > 0) {
        deepMerge(SELECTOR_MAP, overrides);
        console.log('[Selector Map] Auto-merged existing overrides from storage');
      }
      
      // Run scan if not done yet or if flyout map is missing/incomplete
      if (!already || !hasFlyout) {
        console.log('[Selector Map] Running auto-scan to build complete mapping...');
        try {
          const generated = await scanAllBlocksInternal();
          if (generated && generated.flyout && generated.flyout.block && Object.keys(generated.flyout.block).length > 0) {
            // Clean malformed keys from generated map before merging
            const cleanedGenerated = cleanMalformedKeys(generated);
            if (JSON.stringify(cleanedGenerated) !== JSON.stringify(generated)) {
              console.log('[Selector Map] 🧹 Cleaned malformed keys from scan');
            }
            
            // Merge into live map
            deepMerge(SELECTOR_MAP, cleanedGenerated);
            // Merge into overrides and persist
            deepMerge(overrides, cleanedGenerated);
            chrome.storage.local.set({ 
              selectorMapOverrides: overrides, 
              selectorMapScannedV1: Date.now() 
            }, () => {
              console.log('[Selector Map] ✅ Auto-scanned and merged mapping. Blocks found:', 
                Object.keys(cleanedGenerated.flyout.block || {}).length, 'categories');
            });
          } else {
            console.warn('[Selector Map] Auto-scan produced no blocks, may need to retry');
          }
        } catch (e) {
          console.warn('[Selector Map] Auto-scan failed:', e);
          // Retry once after a delay
          setTimeout(() => scanAndPersistSelectorMapIfNeeded(), 2000);
        }
      } else {
        console.log('[Selector Map] Using existing merged map from storage');
      }
    });
  } catch (e) {
    console.warn('[Selector Map] Auto-merge error:', e);
  }
  */
}

// Storage merging DISABLED - hardcoded selector-map.json is the only source of truth
// This prevents any incorrectly categorized blocks from storage from being added
// (function loadAndMergeStorageOverrides() {
//   // DISABLED - storage is not used anymore
// })();

// Auto-scan disabled - using hardcoded selector-map.json instead
// Users can manually trigger scan via "Scan Blocks" button if needed
// This prevents incorrectly categorized blocks from overwriting the correct hardcoded map
// try { 
//   setTimeout(() => { scanAndPersistSelectorMapIfNeeded(); }, 800); 
// } catch(_) {}

// Interactive step-by-step selector test with visual highlighting
function startInteractiveSelectorTest() {
  const keys = enumerateSelectorKeys();
  if (keys.length === 0) {
    console.warn('[Selector Test] No selectors found in map');
    return;
  }

  selectorTestData = keys;
  currentSelectorIndex = 0;
  selectorTestResults = [];
  createSelectorTestOverlay();
  showSelectorTestStep(0);
}

function createSelectorTestOverlay() {
  // Remove existing overlay if any
  if (selectorTestOverlay) {
    selectorTestOverlay.remove();
  }

  // Create overlay container
  selectorTestOverlay = document.createElement('div');
  selectorTestOverlay.id = 'selector-test-overlay';
  selectorTestOverlay.innerHTML = `
    <div class="tutorial-overlay-backdrop"></div>
    <div class="selector-test-card" id="selector-test-card">
      <div class="tutorial-header" id="selector-test-drag-handle">
        <h2>🧪 Selector Test</h2>
        <span class="tutorial-counter">Selector <span id="selector-test-num">1</span> of <span id="selector-test-total">?</span></span>
      </div>
      <div class="tutorial-body">
        <h3 id="selector-test-key">Loading...</h3>
        <div id="selector-test-css" class="selector-css-box"></div>
        <div id="selector-test-status" class="selector-status"></div>
        <div id="selector-test-info" class="info-box"></div>
      </div>
      <div class="tutorial-footer">
        <button id="selector-test-prev-btn" class="tut-btn tut-btn-secondary">← Previous</button>
        <button id="selector-test-approve-btn" class="tut-btn tut-btn-success">✅ Found</button>
        <button id="selector-test-reject-btn" class="tut-btn tut-btn-danger">❌ Missing</button>
        <button id="selector-test-next-btn" class="tut-btn tut-btn-primary">Next →</button>
      </div>
      <div class="selector-test-footer-extra">
        <button id="selector-test-skip-btn" class="tut-btn tut-btn-skip">Skip</button>
        <button id="selector-test-skip-all-missing-btn" class="tut-btn tut-btn-skip">Skip All Missing</button>
      </div>
    </div>
    <div class="tutorial-highlight" id="selector-test-highlight"></div>
    <div class="tutorial-pointer" id="selector-test-pointer">
      <div class="pointer-dot"></div>
      <div class="pointer-label" id="selector-test-pointer-label">Testing</div>
    </div>
  `;
  
  document.body.appendChild(selectorTestOverlay);
  
  // Lift card out of overlay
  const cardEl = selectorTestOverlay.querySelector('#selector-test-card');
  if (cardEl) {
    document.body.appendChild(cardEl);
  }
  
  attachSelectorTestListeners();
}

function attachSelectorTestListeners() {
  document.getElementById('selector-test-prev-btn').addEventListener('click', () => {
    if (currentSelectorIndex > 0) {
      showSelectorTestStep(currentSelectorIndex - 1);
    }
  });
  
  document.getElementById('selector-test-next-btn').addEventListener('click', () => {
    if (currentSelectorIndex < selectorTestData.length - 1) {
      showSelectorTestStep(currentSelectorIndex + 1);
    } else {
      finishSelectorTest();
    }
  });
  
  document.getElementById('selector-test-approve-btn').addEventListener('click', () => {
    markSelectorTestResult(true);
  });
  
  document.getElementById('selector-test-reject-btn').addEventListener('click', () => {
    markSelectorTestResult(false);
  });
  
  document.getElementById('selector-test-skip-btn').addEventListener('click', () => {
    if (currentSelectorIndex < selectorTestData.length - 1) {
      showSelectorTestStep(currentSelectorIndex + 1);
    } else {
      finishSelectorTest();
    }
  });
  
  document.getElementById('selector-test-skip-all-missing-btn').addEventListener('click', () => {
    // Skip to next found selector or end
    let nextIndex = currentSelectorIndex + 1;
    while (nextIndex < selectorTestData.length) {
      const key = selectorTestData[nextIndex];
      const existingResult = selectorTestResults.find(r => r.key === key);
      if (existingResult && existingResult.found) {
        showSelectorTestStep(nextIndex);
        return;
      }
      nextIndex++;
    }
    finishSelectorTest();
  });

  // Drag support
  const card = document.getElementById('selector-test-card');
  const handle = document.getElementById('selector-test-drag-handle');
  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;
  const onDown = (e) => {
    dragging = true;
    const ev = e.touches ? e.touches[0] : e;
    startX = ev.clientX;
    startY = ev.clientY;
    const rect = card.getBoundingClientRect();
    startLeft = rect.left + window.scrollX;
    startTop = rect.top + window.scrollY;
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging) return;
    const ev = e.touches ? e.touches[0] : e;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    card.style.left = `${startLeft + dx}px`;
    card.style.top = `${startTop + dy}px`;
    card.style.right = 'auto';
    card.style.bottom = 'auto';
  };
  const onUp = () => { dragging = false; };

  handle.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  handle.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);
}

async function showSelectorTestStep(index) {
  if (index < 0 || index >= selectorTestData.length) {
    finishSelectorTest();
    return;
  }
  
  currentSelectorIndex = index;
  const key = selectorTestData[index];
  const existingResult = selectorTestResults.find(r => r.key === key);
  
  // Update UI
  document.getElementById('selector-test-num').textContent = index + 1;
  document.getElementById('selector-test-total').textContent = selectorTestData.length;
  document.getElementById('selector-test-key').textContent = key;
  
  // Get selector definition
  const parts = key.split('.');
  let def = SELECTOR_MAP;
  for (const part of parts) {
    if (!def || typeof def !== 'object') break;
    def = def[part];
  }
  if (def && typeof def === 'object') {
    if (def.main) def = def.main;
    else if (def.canvas) def = def.canvas;
  }
  
  // Show CSS selectors
  const cssBox = document.getElementById('selector-test-css');
  if (def && Array.isArray(def.css)) {
    cssBox.innerHTML = '<strong>CSS Selectors:</strong><br>' + 
      def.css.map(css => `<code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 11px; display: inline-block; margin: 2px;">${css}</code>`).join('<br>');
  } else {
    cssBox.innerHTML = '<em>No CSS selectors defined</em>';
  }
  
  // Try to find and highlight the element
  const el = resolveKey(key);
  const found = !!el;
  const statusEl = document.getElementById('selector-test-status');
  const infoEl = document.getElementById('selector-test-info');
  
  if (found) {
    statusEl.innerHTML = '<span style="color: #4caf50; font-weight: bold;">✅ FOUND</span>';
    statusEl.style.color = '#4caf50';
    infoEl.innerHTML = `Element: <strong>${el.tagName || el.nodeName}</strong><br>` +
      `Visible: ${el.offsetWidth > 0 && el.offsetHeight > 0 ? 'Yes' : 'No'}<br>` +
      `Size: ${el.offsetWidth}×${el.offsetHeight}px`;
    
    // Highlight the element using the shared highlight box
    ensureHighlightShell();
    await highlightElement(`key:${key}`);
    
    // Scroll into view
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
} catch(_) {}
    
    // Show pointer
    const pointer = document.getElementById('tutorial-pointer') || document.getElementById('selector-test-pointer');
    const pointerLabel = pointer ? pointer.querySelector('#pointer-label') || pointer.querySelector('#selector-test-pointer-label') : null;
    if (pointer && pointerLabel) {
      const r = el.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const spaceRight = vw - (r.right + 8);
      const px = spaceRight < 120 ? (r.left + window.scrollX - 20) : (r.right + window.scrollX + 8);
      const py = r.top + window.scrollY + Math.min(24, r.height / 2);
      pointer.style.left = `${px}px`;
      pointer.style.top = `${py}px`;
      if (pointerLabel.textContent !== undefined) {
        pointerLabel.textContent = 'Found!';
      } else {
        pointerLabel.innerHTML = 'Found!';
      }
      pointer.style.display = 'block';
    }
  } else {
    statusEl.innerHTML = '<span style="color: #f44336; font-weight: bold;">❌ NOT FOUND</span>';
    statusEl.style.color = '#f44336';
    infoEl.innerHTML = 'Element not found in DOM. This selector may need updating.';
    
    // Clear highlight
    clearHighlight();
    
    // Hide pointer
    const pointer = document.getElementById('tutorial-pointer') || document.getElementById('selector-test-pointer');
    if (pointer) {
      pointer.style.display = 'none';
    }
  }
  
  // Update buttons
  document.getElementById('selector-test-prev-btn').disabled = index === 0;
  document.getElementById('selector-test-next-btn').disabled = index === selectorTestData.length - 1;
  
  // Show existing result if any
  if (existingResult) {
    const btn = existingResult.found ? 
      document.getElementById('selector-test-approve-btn') : 
      document.getElementById('selector-test-reject-btn');
    if (btn) {
      btn.style.border = '3px solid #4caf50';
      setTimeout(() => {
        btn.style.border = '';
      }, 500);
    }
  }
}

function markSelectorTestResult(found) {
  const key = selectorTestData[currentSelectorIndex];
  const el = found ? resolveKey(key) : null;
  
  // Remove existing result
  selectorTestResults = selectorTestResults.filter(r => r.key !== key);
  
  // Add new result
  selectorTestResults.push({
    key,
    found,
    timestamp: Date.now(),
    element: el ? (el.tagName || el.nodeName) : null,
    visible: el ? (el.offsetWidth > 0 && el.offsetHeight > 0) : false
  });
  
  console.log(`[Selector Test] ${found ? '✅' : '❌'} ${key}`);
  
  // Auto-advance after a brief delay
  setTimeout(() => {
    if (currentSelectorIndex < selectorTestData.length - 1) {
      showSelectorTestStep(currentSelectorIndex + 1);
    } else {
      finishSelectorTest();
    }
  }, 300);
}

function finishSelectorTest() {
  const summary = {
    total: selectorTestData.length,
    tested: selectorTestResults.length,
    found: selectorTestResults.filter(r => r.found).length,
    missing: selectorTestResults.filter(r => !r.found).length
  };
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('[Selector Test] 📊 TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Selectors: ${summary.total}`);
  console.log(`Tested: ${summary.tested}`);
  console.log(`✅ Found: ${summary.found} (${((summary.found / summary.tested) * 100).toFixed(1)}%)`);
  console.log(`❌ Missing: ${summary.missing} (${((summary.missing / summary.tested) * 100).toFixed(1)}%)`);
  console.log('\nResults saved to window.SELECTOR_TEST_RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Save results globally
  window.SELECTOR_TEST_RESULTS = {
    summary,
    results: selectorTestResults,
    timestamp: Date.now()
  };
  
  // Close overlay
  if (selectorTestOverlay) {
    selectorTestOverlay.remove();
    selectorTestOverlay = null;
  }
  clearHighlight();
  
  // Show summary alert
  alert(`Selector Test Complete!\n\nTotal: ${summary.total}\nTested: ${summary.tested}\n✅ Found: ${summary.found}\n❌ Missing: ${summary.missing}\n\nCheck console for details.`);
}

function closeSelectorTest() {
  if (selectorTestOverlay) {
    selectorTestOverlay.remove();
    selectorTestOverlay = null;
  }
  clearHighlight();
}

// Add CSS for selector test buttons
const selectorTestStyle = document.createElement('style');
selectorTestStyle.textContent = `
  .selector-test-card {
    position: fixed;
    right: 16px;
    bottom: 16px;
    background: white;
    border-radius: 12px;
    padding: 16px;
    width: 420px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    pointer-events: all;
    z-index: 1000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-height: 70vh;
    overflow: auto;
  }
  .selector-css-box {
    margin: 10px 0;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.6;
    max-height: 120px;
    overflow-y: auto;
  }
  .selector-status {
    margin: 10px 0;
    font-size: 16px;
    font-weight: bold;
    padding: 8px;
    border-radius: 6px;
    background: #f0f0f0;
  }
  .selector-test-footer-extra {
    display: flex;
    gap: 10px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #e0e0e0;
  }
  .tut-btn-success {
    background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
    color: white;
  }
  .tut-btn-success:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  }
  .tut-btn-danger {
    background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
    color: white;
  }
  .tut-btn-danger:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
  }
`;
document.head.appendChild(selectorTestStyle);

// Expose test function globally for console access
try {
  window.testScratchSelectors = testSelectors;
  window.testScratchSelector = (key) => {
    const el = resolveKey(key);
    if (el) {
      console.log(`✅ Found: ${key}`, el);
      return el;
    } else {
      console.log(`❌ Not found: ${key}`);
      return null;
    }
  };
  window.testSelectorsInteractive = startInteractiveSelectorTest;
  window.cleanSelectorStorage = () => {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['selectorMapOverrides'], (res) => {
        const overrides = res && res.selectorMapOverrides ? res.selectorMapOverrides : {};
        const cleaned = cleanMalformedKeys(overrides);
        chrome.storage.local.set({ selectorMapOverrides: cleaned }, () => {
          // Reload base map from JSON first, then merge cleaned overrides
          const url = chrome.runtime.getURL('selector-map.json');
          if (url) {
            fetch(url).then(r => r.json()).then(json => {
              // Clear and rebuild SELECTOR_MAP
              Object.keys(SELECTOR_MAP).forEach(k => delete SELECTOR_MAP[k]);
              deepMerge(SELECTOR_MAP, json);
              deepMerge(SELECTOR_MAP, cleaned);
              console.log('[Selector Map] ✅ Cleaned and reloaded storage. Removed malformed keys.');
              const beforeCount = JSON.stringify(overrides).split('"').length;
              const afterCount = JSON.stringify(cleaned).split('"').length;
              console.log(`Cleaned ${beforeCount - afterCount} malformed keys from storage`);
            }).catch(() => {
              // Fallback: just reload from cleaned overrides
              deepMerge(SELECTOR_MAP, cleaned);
              console.log('[Selector Map] ✅ Cleaned storage (reload from JSON failed)');
            });
          } else {
            deepMerge(SELECTOR_MAP, cleaned);
            console.log('[Selector Map] ✅ Cleaned storage');
          }
        });
      });
    }
  };
} catch(_) {}

// Receive forwarded messages inside the editor iframe
window.addEventListener('message', (event) => {
  const data = event && event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'scratch_ai_start_tutorial') {
    if (location.hostname !== 'projects.scratch.mit.edu') return;
    injectTutorialCSS();
    startTutorial(data.tutorialData || []);
  }
}, false);
