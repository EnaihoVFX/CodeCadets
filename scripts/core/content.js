// Content script to interact with Scratch website
// Provides overlay tutorial functionality

console.log('Scratch AI Assistant content script loaded');

// Signal that content script is ready
window.scratchAIContentScriptReady = true;

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
    const url = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) ? chrome.runtime.getURL('data/selector-map.json') : null;
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

// Create tutorial overlay with splash screen
function createTutorialOverlay() {
  // Remove existing overlay if any
  if (tutorialOverlay) {
    tutorialOverlay.remove();
  }

  // Get logo and mascot URLs
  let logoUrl, mascotUrl;
  try {
    logoUrl = chrome.runtime.getURL('images/logo.png');
    mascotUrl = chrome.runtime.getURL('icons/robot.png');
  } catch (e) {
    console.error('Error getting resource URLs:', e);
    logoUrl = '';
    mascotUrl = '';
  }

  // Create overlay container with splash screen
  tutorialOverlay = document.createElement('div');
  tutorialOverlay.id = 'scratch-tutorial-overlay';
  tutorialOverlay.innerHTML = `
    <div class="tutorial-overlay-backdrop"></div>
    
    <!-- Splash Screen -->
    <div class="tutorial-splash" id="tutorial-splash">
      <div class="splash-logo-container">
        <img src="${logoUrl}" alt="Logo" class="splash-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        <div class="splash-logo-fallback" style="display: none; font-size: 48px; color: #fff; font-family: 'Press Start 2P', monospace;">CODE<br/>CADETS</div>
          </div>
        </div>
  
    <!-- Welcome Screen with Mascot -->
    <div class="tutorial-welcome" id="tutorial-welcome" style="display: none;">
      <div class="welcome-mascot-container">
        <div class="welcome-speech-bubble">
          <div class="speech-text">WELCOME! LET'S LEARN SCRATCH TOGETHER. I'LL GUIDE YOU THROUGH EACH STEP.</div>
        </div>
        <img src="${mascotUrl}" alt="Tutorial Helper" class="welcome-mascot" />
      </div>
      <button id="welcome-next-btn" class="welcome-next-btn">
        <span class="btn-text">NEXT →</span>
      </button>
    </div>
    
    <!-- Main Tutorial Card (hidden initially) -->
    <div class="tutorial-overlay-content" id="tutorial-card" style="display: none;">
      <div class="tutorial-header" id="tutorial-drag-handle">
        <div class="tutorial-counter">STEP <span id="step-num">1</span>/<span id="total-steps">?</span></div>
      </div>
      <div class="tutorial-body">
        <div class="step-instruction-header">
          <span class="instruction-label">WHAT TO DO:</span>
        </div>
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
    
    <!-- Corner Mascot (hidden initially) -->
    <div class="corner-mascot" id="corner-mascot" style="display: none;">
      <div class="corner-speech-bubble" id="corner-speech-bubble">
        <div class="corner-speech-text" id="corner-speech-text">READY TO START!</div>
      </div>
      <img src="${mascotUrl}" alt="Helper" class="corner-mascot-img" />
    </div>
    
    <div class="tutorial-highlight" id="highlight-box"></div>
    <div class="tutorial-pointer" id="tutorial-pointer">
      <div class="pointer-dot"></div>
      <div class="pointer-label" id="pointer-label">CLICK HERE</div>
    </div>
  `;
  
  document.body.appendChild(tutorialOverlay);
  
  // Create and inject gamification bar
  createGamificationBar();
  
  // Start splash screen animation (unless skipped)
  if (!window.skipSplashScreen) {
    startSplashSequence();
  } else {
    // Skip splash and welcome, go straight to tutorial card with corner mascot
    const welcome = document.getElementById('tutorial-welcome');
    const card = document.getElementById('tutorial-card');
    const cornerMascot = document.getElementById('corner-mascot');
    
    // Hide welcome screen
    if (welcome) {
      welcome.style.display = 'none';
    }
    
    // Show corner mascot and tutorial card directly
    if (cornerMascot) {
      cornerMascot.style.display = 'block';
      cornerMascot.classList.add('fade-in');
    }
    
    if (card) {
      card.style.display = 'flex';
      card.classList.add('fade-in');
      
      // Lift the card out of the click-through overlay to ensure reliable clicks
      if (card.parentElement === tutorialOverlay) {
        document.body.appendChild(card);
      }
    }
    
    // Attach tutorial listeners
    attachTutorialListeners();
    
    // Reset flag
    window.skipSplashScreen = false;
  }
}

// Gamification state - syncs with popup.js xpState
let gamificationState = {
  xp: 0,
  level: 1,
  streak: 0,
  totalStepsCompleted: 0,
  hintsUsed: 0,
  lastActivityDate: null,
  perfectRuns: 0,
  totalXP: 0
};

// Calculate XP required for a specific level (progressive scaling)
function getXPForLevel(level) {
  if (level <= 1) return 0;
  // Progressive formula: base * (level - 1) + scaling factor
  // Level 1->2: 100 XP, Level 2->3: 150 XP, Level 3->4: 200 XP, etc.
  const baseXP = 100;
  const scalingFactor = 50;
  let totalXP = 0;
  for (let i = 2; i <= level; i++) {
    totalXP += baseXP + (i - 2) * scalingFactor;
  }
  return totalXP;
}

// Calculate current level based on total XP
function calculateLevel(totalXP) {
  let level = 1;
  let xpNeeded = 0;
  while (totalXP >= xpNeeded) {
    level++;
    const xpForThisLevel = 100 + (level - 2) * 50;
    xpNeeded += xpForThisLevel;
    if (totalXP < xpNeeded) {
      level--;
      break;
    }
  }
  return level;
}

// Get XP needed for next level
function getXPNeededForNextLevel(currentLevel, currentXP) {
  const xpForCurrentLevel = getXPForLevel(currentLevel);
  const xpForNextLevel = getXPForLevel(currentLevel + 1);
  return xpForNextLevel - xpForCurrentLevel;
}

// Create gamification bar at top of page
function createGamificationBar() {
  // Remove existing bar if any
  const existingBar = document.getElementById('gamification-bar');
  if (existingBar) {
    existingBar.remove();
  }
  
  // Load Press Start 2P font if not already loaded
  if (!document.getElementById('press-start-2p-font')) {
    const fontLink = document.createElement('link');
    fontLink.id = 'press-start-2p-font';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    document.head.appendChild(fontLink);
  }
  
  // Load saved state
  loadGamificationState();
  
  // Get icon URL
  let iconUrl = '';
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      iconUrl = chrome.runtime.getURL('icons/logo/icon.png');
      // Verify the URL is valid
      if (!iconUrl || iconUrl.includes('undefined')) {
        console.warn('Invalid icon URL generated');
        iconUrl = '';
      }
    }
  } catch (e) {
    console.error('Error getting icon URL:', e);
  }
  
  const gamificationBar = document.createElement('div');
  gamificationBar.id = 'gamification-bar';
  gamificationBar.innerHTML = `
    <div class="gamification-content">
      <button class="gamification-tutorial-btn" id="gamification-tutorial-btn" title="Tutorials">
        <span class="gamification-tutorial-btn-text">TUTORIALS</span>
      </button>
      <div class="gamification-progress-container">
        <div class="gamification-progress-bar">
          <div class="gamification-progress-fill" id="gamification-progress-fill"></div>
          <div class="gamification-progress-text" id="gamification-progress-text">0 / 100</div>
        </div>
      </div>
      ${iconUrl ? `<img class="gamification-popup-icon" src="${iconUrl}" alt="Open Popup" id="gamification-popup-icon" onerror="this.style.display='none'; console.error('Failed to load icon:', this.src);">` : ''}
    </div>
  `;
  
  document.body.appendChild(gamificationBar);
  
  // Use event delegation for gamification bar buttons (works even when recreated)
  // This listener is attached once and persists
  if (!window.gamificationDelegationAttached) {
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Check if clicked element is the tutorial button or inside it
      const tutorialBtn = target.closest('#gamification-tutorial-btn') || 
                         (target.id === 'gamification-tutorial-btn' ? target : null);
      if (tutorialBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ action: 'openPopup', page: 'tutorials' });
        }
        return;
      }
      
      // Check if clicked element is the achievements button or inside it
      const achievementsBtn = target.closest('#gamification-achievements-btn') || 
                             (target.id === 'gamification-achievements-btn' ? target : null);
      if (achievementsBtn) {
        e.preventDefault();
        e.stopPropagation();
        showAchievementsOverlay();
        return;
      }
      
      // Check if clicked element is the popup icon
      const iconElement = target.closest('#gamification-popup-icon') || 
                         (target.id === 'gamification-popup-icon' ? target : null);
      if (iconElement) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ action: 'openPopup' });
        }
        return;
      }
    }, true); // Use capture phase
    
    window.gamificationDelegationAttached = true;
  }
  
  // Add error handler for icon (only needs to be attached once per icon element)
  if (iconUrl) {
    const iconElement = document.getElementById('gamification-popup-icon');
    if (iconElement && !iconElement._errorHandlerAttached) {
      iconElement.addEventListener('error', () => {
        console.error('Icon failed to load. URL:', iconUrl);
        console.log('Make sure the extension is reloaded after adding icon to web_accessible_resources');
      });
      iconElement._errorHandlerAttached = true;
    }
  }
  
  updateGamificationDisplay();
}

// Load gamification state from storage - uses xpState as source of truth
async function loadGamificationState() {
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      // Get user ID for user-specific storage
      const result = await chrome.storage.local.get(['learnworldsUserData', 'xpState']);
      const userId = result.learnworldsUserData?.id;
      const storageKey = userId ? `user_${userId}_xpState` : 'xpState';
      
      // Load user-specific XP state if available, otherwise fallback to non-specific
      const xpStateResult = await chrome.storage.local.get([storageKey, 'xpState']);
      const xpStateData = xpStateResult[storageKey] || xpStateResult.xpState;
      
      if (xpStateData) {
        // Sync with xpState (source of truth)
        gamificationState.xp = xpStateData.xp || 0;
        gamificationState.level = xpStateData.level || 1;
        // Keep local state for streak and other stats
        if (xpStateData.streak !== undefined) gamificationState.streak = xpStateData.streak;
        if (xpStateData.totalStepsCompleted !== undefined) gamificationState.totalStepsCompleted = xpStateData.totalStepsCompleted;
        if (xpStateData.hintsUsed !== undefined) gamificationState.hintsUsed = xpStateData.hintsUsed;
        updateGamificationDisplay();
      }
    }
  } catch (e) {
    console.error('Error loading gamification state:', e);
  }
}

// Save gamification state to storage - saves to xpState (source of truth, user-specific)
async function saveGamificationState() {
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      // Get user ID for user-specific storage
      const result = await chrome.storage.local.get(['learnworldsUserData']);
      const userId = result.learnworldsUserData?.id;
      const storageKey = userId ? `user_${userId}_xpState` : 'xpState';
      
      // Save to xpState to keep single source of truth
      const xpState = {
        xp: gamificationState.xp,
        level: gamificationState.level,
        xpForNextLevel: 100,
        streak: gamificationState.streak,
        totalStepsCompleted: gamificationState.totalStepsCompleted,
        hintsUsed: gamificationState.hintsUsed
      };
      chrome.storage.local.set({ [storageKey]: xpState });
    }
  } catch (e) {
    console.error('Error saving gamification state:', e);
  }
}

// Update gamification display
function updateGamificationDisplay() {
  const progressFill = document.getElementById('gamification-progress-fill');
  const progressText = document.getElementById('gamification-progress-text');
  const progressBar = document.getElementById('gamification-progress-bar');
  
  if (!progressFill || !progressText) return;
  
  // Calculate XP using progressive system
  const xpForCurrentLevel = getXPForLevel(gamificationState.level);
  const xpForNextLevel = getXPForLevel(gamificationState.level + 1);
  const xpInCurrentLevel = gamificationState.xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeeded) * 100));
  
    progressFill.style.width = `${progressPercent}%`;
    progressText.textContent = `${xpInCurrentLevel} / ${xpNeeded}`;
  
  // Add streak indicator if active
  if (gamificationState.streak >= 3 && progressBar) {
    let streakIndicator = document.getElementById('streak-indicator');
    if (!streakIndicator) {
      streakIndicator = document.createElement('div');
      streakIndicator.id = 'streak-indicator';
      streakIndicator.className = 'streak-indicator';
      streakIndicator.style.cssText = `
        position: absolute;
        top: -25px;
        right: 0;
        font-size: 0.3rem;
        color: #FBBF24;
        font-family: 'Press Start 2P', monospace;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        animation: streakPulse 2s ease-in-out infinite;
        z-index: 1000;
      `;
      progressBar.parentElement.style.position = 'relative';
      progressBar.parentElement.appendChild(streakIndicator);
    }
    streakIndicator.textContent = `🔥 ${gamificationState.streak} DAY STREAK!`;
  }
}

// Award XP and update gamification
function awardXP(amount, reason = '', multiplier = 1) {
  // Apply multiplier
  const finalAmount = Math.floor(amount * multiplier);
  
  // Check and update streak
  const today = new Date().toDateString();
  if (gamificationState.lastActivityDate === today) {
    gamificationState.streak += 1;
  } else if (gamificationState.lastActivityDate) {
    // Check if streak should continue (within 1 day)
    const lastDate = new Date(gamificationState.lastActivityDate);
    const daysDiff = (new Date() - lastDate) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 1) {
      gamificationState.streak += 1;
    } else {
      gamificationState.streak = 1; // Reset streak
    }
  } else {
    gamificationState.streak = 1;
  }
  gamificationState.lastActivityDate = today;
  
  // Apply streak bonus (up to 2x multiplier)
  let streakMultiplier = 1;
  if (gamificationState.streak >= 7) {
    streakMultiplier = 2.0; // 7+ day streak = 2x XP
  } else if (gamificationState.streak >= 3) {
    streakMultiplier = 1.5; // 3+ day streak = 1.5x XP
  }
  
  const finalXP = Math.floor(finalAmount * streakMultiplier);
  gamificationState.xp += finalXP;
  gamificationState.totalXP += finalXP;
  gamificationState.totalStepsCompleted += 1;
  
  // Calculate new level using progressive system
  const oldLevel = gamificationState.level;
  const newLevel = calculateLevel(gamificationState.xp);
  const leveledUp = newLevel > oldLevel;
  
  if (leveledUp) {
    const levelsGained = newLevel - oldLevel;
    gamificationState.level = newLevel;
    showLevelUpAnimation(newLevel, levelsGained);
  }
  
  updateGamificationDisplay();
  saveGamificationState();
  
  // Animate XP gain with breakdown
  animateXPGain(finalXP, {
    base: amount,
    multiplier: multiplier,
    streakBonus: streakMultiplier > 1 ? streakMultiplier : null,
    reason: reason
  });
}

// Show level up animation
function showLevelUpAnimation(newLevel, levelsGained = 1) {
  const levelUpOverlay = document.createElement('div');
  levelUpOverlay.id = 'level-up-overlay';
  
  // Calculate milestone rewards
  const milestoneRewards = getMilestoneRewards(newLevel);
  const milestoneText = milestoneRewards.length > 0 
    ? `<div class="level-up-milestone">${milestoneRewards.join(' ')}</div>` 
    : '';
  
  levelUpOverlay.innerHTML = `
    <div class="level-up-content">
      <div class="level-up-icon">🎉</div>
      <div class="level-up-title">LEVEL UP!</div>
      <div class="level-up-level">LEVEL ${newLevel}</div>
      ${levelsGained > 1 ? `<div class="level-up-multi">+${levelsGained} LEVELS!</div>` : ''}
      ${milestoneText}
      <div class="level-up-stats">
        <div class="level-up-stat">
          <span class="stat-label">TOTAL XP:</span>
          <span class="stat-value">${gamificationState.totalXP}</span>
        </div>
        <div class="level-up-stat">
          <span class="stat-label">STREAK:</span>
          <span class="stat-value">${gamificationState.streak} DAYS</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(levelUpOverlay);
  
  // Play celebration sound effect (if available)
  try {
    const audio = new Audio(chrome.runtime.getURL('sounds/levelup.mp3'));
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Ignore errors if file doesn't exist
  } catch (e) {}
  
  setTimeout(() => {
    levelUpOverlay.classList.add('fade-out');
    setTimeout(() => {
      levelUpOverlay.remove();
    }, 500);
  }, 3000); // Show for 3 seconds
}

// Get milestone rewards for reaching certain levels
function getMilestoneRewards(level) {
  const rewards = [];
  const milestones = {
    5: '🏆',
    10: '⭐',
    15: '👑',
    20: '💎',
    25: '🌟',
    30: '🎖️',
    50: '🏅',
    100: '💯'
  };
  
  if (milestones[level]) {
    rewards.push(milestones[level]);
  }
  
  return rewards;
}

// Animate XP gain
function animateXPGain(amount, breakdown = {}) {
  const progressBar = document.getElementById('gamification-progress-bar');
  if (!progressBar) return;
  
  const gainIndicator = document.createElement('div');
  gainIndicator.className = 'xp-gain-indicator';
  
  let indicatorText = `+${amount} XP`;
  if (breakdown.streakBonus) {
    indicatorText += ` (${breakdown.streakBonus}x streak!)`;
  }
  if (breakdown.multiplier && breakdown.multiplier > 1) {
    indicatorText += ` (${breakdown.multiplier}x bonus)`;
  }
  
  gainIndicator.textContent = indicatorText;
  progressBar.appendChild(gainIndicator);
  
  // Show breakdown tooltip on hover
  if (breakdown.base && (breakdown.multiplier > 1 || breakdown.streakBonus)) {
    gainIndicator.title = `Base: ${breakdown.base} XP${breakdown.multiplier > 1 ? ` × ${breakdown.multiplier}` : ''}${breakdown.streakBonus ? ` × ${breakdown.streakBonus} streak` : ''} = ${amount} XP`;
    gainIndicator.style.cursor = 'help';
  }
  
  setTimeout(() => {
    gainIndicator.classList.add('fade-out');
    setTimeout(() => {
      gainIndicator.remove();
    }, 500);
  }, 2000);
}

// Handle splash screen sequence
function startSplashSequence() {
  // Wait a bit for DOM to be ready
  setTimeout(() => {
    const splash = document.getElementById('tutorial-splash');
    const welcome = document.getElementById('tutorial-welcome');
    const card = document.getElementById('tutorial-card');
    const cornerMascot = document.getElementById('corner-mascot');
    
    if (!splash) return;
    
    // Step 1: Show logo splash, then fade to welcome
    setTimeout(() => {
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => {
          if (splash) splash.style.display = 'none';
          if (welcome) {
            welcome.style.display = 'flex';
            welcome.classList.add('fade-in');
            // Attach button listener when welcome screen appears
            attachWelcomeButtonListener();
          }
        }, 500);
      }
    }, 1500);
  }, 100);
}

// Attach welcome button listener
function attachWelcomeButtonListener() {
  const welcomeNextBtn = document.getElementById('welcome-next-btn');
  const welcome = document.getElementById('tutorial-welcome');
  const card = document.getElementById('tutorial-card');
  const cornerMascot = document.getElementById('corner-mascot');
  
  if (!welcomeNextBtn) {
    // Retry if button not found yet
    setTimeout(() => attachWelcomeButtonListener(), 100);
    return;
  }
  
  welcomeNextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Hide speech bubble first
    const speechBubble = document.querySelector('.welcome-speech-bubble');
    if (speechBubble) {
      speechBubble.style.opacity = '0';
      speechBubble.style.transition = 'opacity 0.3s';
    }
    
    // Animate mascot shrinking and moving to corner
    const welcomeMascot = document.querySelector('.welcome-mascot');
    const welcomeContainer = document.querySelector('.welcome-mascot-container');
    
    if (welcomeMascot) {
      welcomeMascot.classList.add('shrink-to-corner');
    }
    if (welcomeContainer) {
      welcomeContainer.classList.add('move-to-corner');
    }
    
    setTimeout(() => {
      if (welcome) welcome.style.display = 'none';
      if (cornerMascot) {
        cornerMascot.style.display = 'block';
        cornerMascot.classList.add('fade-in');
      }
      if (card) {
        card.style.display = 'flex';
        card.classList.add('fade-in');
        
  // Lift the card out of the click-through overlay to ensure reliable clicks
        if (card.parentElement === tutorialOverlay) {
          document.body.appendChild(card);
  }
      }
      
  attachTutorialListeners();
    }, 800);
  });
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

// Use event delegation for tutorial buttons - works even when elements are recreated
let tutorialDelegationAttached = false;

function attachTutorialListeners() {
  // Use event delegation on document to handle button clicks
  // This works even when buttons are recreated with innerHTML
  if (!tutorialDelegationAttached) {
    document.addEventListener('click', (e) => {
      const target = e.target;
      const btn = target.closest('button');
      if (!btn) return;
      
      const btnId = btn.id;
      
      if (btnId === 'tut-prev-btn') {
        e.preventDefault();
        e.stopPropagation();
        previousStep();
      } else if (btnId === 'tut-next-btn') {
        e.preventDefault();
        e.stopPropagation();
        nextStep();
      } else if (btnId === 'tut-skip-btn') {
        e.preventDefault();
        e.stopPropagation();
        closeTutorial();
      } else if (btnId === 'tut-hint-btn') {
        e.preventDefault();
        e.stopPropagation();
        const hintBtn = btn;
        if (!hintBtn.disabled && !currentStepHintShown && currentStepData && currentTutorialStep >= 0) {
          // Mark hint as used
          hintsUsed[currentTutorialStep] = true;
          currentStepHintShown = true;
          
          // Show the hint
          showStepHint(currentStepData, currentTutorialStep).then(() => {
            // Update button state
            hintBtn.disabled = true;
            hintBtn.classList.add('hint-used');
            const btnText = hintBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Hint Used';
          });
        }
      } else if (btnId === 'welcome-next-btn') {
        e.preventDefault();
        e.stopPropagation();
        
        // Get elements
        const speechBubble = document.querySelector('.welcome-speech-bubble');
        const welcomeMascot = document.querySelector('.welcome-mascot');
        const welcomeContainer = document.querySelector('.welcome-mascot-container');
        
        if (welcomeContainer && welcomeMascot) {
          // Get the current position relative to viewport
          const rect = welcomeContainer.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Calculate current position as fixed coordinates
          const currentTop = rect.top;
          const currentLeft = rect.left;
          
          // Set initial fixed position to maintain current visual position
          welcomeContainer.style.position = 'fixed';
          welcomeContainer.style.top = currentTop + 'px';
          welcomeContainer.style.left = currentLeft + 'px';
          welcomeContainer.style.bottom = 'auto';
          welcomeContainer.style.right = 'auto';
          welcomeContainer.style.margin = '0';
          welcomeContainer.style.transform = 'none';
          
          // Hide speech bubble smoothly
        if (speechBubble) {
          speechBubble.style.opacity = '0';
            speechBubble.style.transition = 'opacity 0.3s ease-out';
        }
        
          // Force reflow to ensure initial position is applied
          void welcomeContainer.offsetHeight;
        
          // Now animate to corner position and scale
          requestAnimationFrame(() => {
          welcomeMascot.classList.add('shrink-to-corner');
          welcomeContainer.classList.add('move-to-corner');
          });
        }
        
        const welcome = document.getElementById('tutorial-welcome');
        const card = document.getElementById('tutorial-card');
        const cornerMascot = document.getElementById('corner-mascot');
        
        setTimeout(() => {
          // Hide the animated welcome mascot container
          if (welcomeContainer) {
            welcomeContainer.style.opacity = '0';
            welcomeContainer.style.pointerEvents = 'none';
          }
          
          // Hide welcome screen
          if (welcome) welcome.style.display = 'none';
          
          // Show corner mascot in the exact same position (it's already positioned correctly)
          if (cornerMascot) {
            cornerMascot.style.display = 'flex';
            cornerMascot.style.opacity = '0';
            cornerMascot.classList.add('fade-in');
            // Fade in smoothly
            requestAnimationFrame(() => {
              cornerMascot.style.transition = 'opacity 0.3s ease-in';
              cornerMascot.style.opacity = '1';
            });
          }
          
          if (card) {
            card.style.display = 'flex';
            card.classList.add('fade-in');
            
            // Lift the card out of the click-through overlay to ensure reliable clicks
            if (card.parentElement === tutorialOverlay) {
              document.body.appendChild(card);
            }
          }
        }, 800);
      }
    }, true); // Use capture phase for better reliability
    
    tutorialDelegationAttached = true;
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
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
    
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
      background: linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%);
      border: 3px solid #10B981;
      padding: 0;
      width: 420px;
      box-shadow: 
        0 4px 15px rgba(16, 185, 129, 0.4),
        0 0 20px rgba(16, 185, 129, 0.2);
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
      border-radius: 8px;
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
    
    /* Splash Screen */
    .tutorial-splash {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #7C3AED;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000001;
      animation: fadeIn 0.5s ease-in;
    }
    
    .splash-logo-container {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .splash-logo {
      max-width: 300px;
      max-height: 300px;
      width: auto;
      height: auto;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      filter: drop-shadow(8px 8px 0px rgba(0, 0, 0, 0.3));
      animation: logoPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    @keyframes logoPop {
      0% {
        transform: scale(0.5);
        opacity: 0;
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    .tutorial-splash.fade-out {
      animation: fadeOut 0.5s ease-out forwards;
    }
    
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
    
    /* Welcome Screen */
    .tutorial-welcome {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000001;
      gap: 40px;
      pointer-events: all;
    }
    
    .tutorial-welcome.fade-in {
      animation: fadeIn 0.5s ease-in;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    .welcome-mascot-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .welcome-mascot-container.move-to-corner {
      position: fixed !important;
      bottom: 20px !important;
      left: 20px !important;
      top: auto !important;
      right: auto !important;
      transform: none !important;
      align-items: flex-start;
      z-index: 1000002;
      transition: bottom 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                  left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                  top 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                  right 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .welcome-mascot-container.move-to-corner .welcome-speech-bubble {
      opacity: 0;
      transition: opacity 0.3s ease-out;
      pointer-events: none;
    }
    
    .welcome-speech-bubble {
      background: #000;
      border: 4px solid #10B981;
      padding: 20px 30px;
      margin-bottom: 30px;
      max-width: 500px;
      box-shadow: 6px 6px 0px rgba(16, 185, 129, 0.3);
      position: relative;
      animation: bubblePopIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    @keyframes bubblePopIn {
      0% {
        transform: scale(0);
        opacity: 0;
      }
      50% { 
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    .welcome-speech-bubble::before {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 20px solid transparent;
      border-right: 20px solid transparent;
      border-top: 20px solid #10B981;
    }
    
    .welcome-speech-bubble::after {
      content: '';
      position: absolute;
      bottom: -16px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 16px solid transparent;
      border-right: 16px solid transparent;
      border-top: 16px solid #000;
    }
    
    .welcome-speech-bubble .speech-text {
      font-size: 12px;
      color: #10B981;
      font-family: 'Press Start 2P', monospace;
      line-height: 1.8;
      text-align: center;
      text-shadow: 2px 2px 0px #000;
    }
    
    .welcome-mascot {
      width: 200px;
      height: auto;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      filter: drop-shadow(4px 4px 0px rgba(0, 0, 0, 0.3));
      transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                  height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                  filter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                  transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .welcome-mascot.shrink-to-corner {
      width: 100px !important;
      height: auto !important;
      transform: none !important;
      margin: 0 !important;
      filter: drop-shadow(4px 4px 0px rgba(0, 0, 0, 0.3));
    }
    
    .welcome-next-btn {
      padding: 16px 40px;
      border: 4px solid #10B981;
      background: #000;
      color: #10B981;
      font-size: 12px;
      font-family: 'Press Start 2P', monospace;
      cursor: pointer;
      text-shadow: 2px 2px 0px #000;
      box-shadow: 6px 6px 0px rgba(16, 185, 129, 0.3);
      transition: all 0.1s;
      letter-spacing: 1px;
      pointer-events: all;
      z-index: 1000003;
      position: relative;
    }
    
    .welcome-next-btn:hover {
      background: #10B981;
      color: #000;
      transform: translate(3px, 3px);
      box-shadow: 3px 3px 0px rgba(16, 185, 129, 0.3);
    }
    
    .welcome-next-btn:active {
      transform: translate(6px, 6px);
      box-shadow: 0px 0px 0px rgba(16, 185, 129, 0.3);
    }
    
    /* Corner Mascot */
    .corner-mascot {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 1000002;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    
    .corner-mascot.fade-in {
      animation: fadeIn 0.5s ease-in;
    }
    
    .corner-mascot-img {
      width: 100px;
      height: auto;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      filter: drop-shadow(4px 4px 0px rgba(0, 0, 0, 0.3));
      animation: mascotFloat 3s ease-in-out infinite;
    }
    
    .corner-speech-bubble {
      position: absolute;
      bottom: 140px;
      left: 0;
      background: #000;
      border: 4px solid #10B981;
      padding: 14px 18px;
      max-width: 300px;
      min-width: 220px;
      box-shadow: 6px 6px 0px rgba(16, 185, 129, 0.3);
      z-index: 1000003;
      animation: bubblePopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .corner-speech-bubble::before {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 30px;
      width: 0;
      height: 0;
      border-left: 20px solid transparent;
      border-right: 20px solid transparent;
      border-top: 20px solid #10B981;
    }
    
    .corner-speech-bubble::after {
      content: '';
      position: absolute;
      bottom: -16px;
      left: 32px;
      width: 0;
      height: 0;
      border-left: 16px solid transparent;
      border-right: 16px solid transparent;
      border-top: 16px solid #000;
    }
    
    .corner-speech-text {
      font-size: 13px;
      color: #10B981;
      font-family: 'Press Start 2P', monospace;
      line-height: 1.6;
      text-align: left;
      text-shadow: 2px 2px 0px #000;
      word-wrap: break-word;
    }
    
    @keyframes mascotFloat {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }
    
    .tutorial-overlay-content.fade-in {
      animation: slideInRight 0.5s ease-out;
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
      background: linear-gradient(180deg, #0a0a0a 0%, #1a0a2e 100%);
      padding: 12px 16px;
      border-bottom: 3px solid #10B981;
      cursor: move;
      position: relative;
      border-radius: 8px 8px 0 0;
    }
    
    .tutorial-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #7C3AED 0%, #10B981 50%, #7C3AED 100%);
      animation: headerGlow 2s ease-in-out infinite;
    }
    
    @keyframes headerGlow {
      0%, 100% {
        opacity: 0.8;
      }
      50% {
        opacity: 1;
        box-shadow: 0 0 10px rgba(124, 58, 237, 0.6);
      }
    }
    
    .tutorial-counter {
      font-size: 13px;
      color: #10B981;
      font-weight: normal;
      text-align: center;
      margin-bottom: 0;
      letter-spacing: 3px;
      text-shadow: 
        2px 2px 0px #000,
        0 0 10px rgba(16, 185, 129, 0.6);
    }
    
    
    .tutorial-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%);
    }
    
    .step-instruction-header {
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid rgba(16, 185, 129, 0.3);
    }
    
    .instruction-label {
      font-size: 10px;
      color: #7C3AED;
      text-shadow: 
        1px 1px 0px #000,
        0 0 8px rgba(124, 58, 237, 0.6);
      letter-spacing: 1.5px;
      font-weight: normal;
      display: block;
      text-align: center;
    }
    
    .tutorial-body h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: #10B981;
      font-weight: normal;
      line-height: 1.8;
      text-shadow: 
        2px 2px 0px #000,
        0 0 10px rgba(16, 185, 129, 0.6);
      letter-spacing: 1px;
    }
    
    .tutorial-body p {
      margin: 0 0 20px 0;
      font-size: 13px;
      line-height: 2;
      color: #ffffff;
      text-shadow: 
        2px 2px 4px rgba(0, 0, 0, 0.8),
        0 0 8px rgba(255, 255, 255, 0.3);
      letter-spacing: 0.5px;
      font-weight: normal;
      background: rgba(16, 185, 129, 0.1);
      padding: 16px;
      border: 2px solid rgba(16, 185, 129, 0.4);
      border-radius: 4px;
    }
    
    #step-description {
      display: none !important;
    }
    
    .info-box {
      margin: 20px 0;
      padding: 20px 24px;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(167, 139, 250, 0.2) 100%);
      border: 3px solid #7C3AED;
      font-size: 13px;
      color: #ffffff;
      line-height: 2;
      display: none;
      text-shadow: 
        2px 2px 4px rgba(0, 0, 0, 0.9),
        0 0 12px rgba(124, 58, 237, 0.8),
        0 0 20px rgba(167, 139, 250, 0.6);
      letter-spacing: 0.5px;
      border-radius: 8px;
      box-shadow: 
        0 0 25px rgba(124, 58, 237, 0.6),
        0 0 40px rgba(124, 58, 237, 0.4),
        inset 0 0 30px rgba(124, 58, 237, 0.15);
      position: relative;
    }
    
    .info-box::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(167, 139, 250, 0.05) 100%);
      border-radius: 8px;
      pointer-events: none;
    }
    
    .info-box-content {
      position: relative;
      z-index: 1;
      margin: 0;
    }
    
    #step-info-box.show-info {
      display: block !important;
      animation: infoBoxPulse 2s ease-in-out infinite;
    }
    
    @keyframes infoBoxPulse {
      0%, 100% {
        box-shadow: 
          0 0 25px rgba(124, 58, 237, 0.6),
          0 0 40px rgba(124, 58, 237, 0.4),
          inset 0 0 30px rgba(124, 58, 237, 0.15);
        border-color: #7C3AED;
      }
      50% {
        box-shadow: 
          0 0 35px rgba(124, 58, 237, 0.9),
          0 0 55px rgba(124, 58, 237, 0.7),
          inset 0 0 40px rgba(124, 58, 237, 0.25);
        border-color: #a78bfa;
      }
    }
    
    .step-actions {
      margin: 16px 0;
    }
    
    .step-actions button {
      display: block;
      width: 100%;
      padding: 14px 16px;
      margin: 8px 0;
      border: 3px solid #10B981;
      background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
      color: #ffffff;
      font-size: 10px;
      font-weight: normal;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      text-align: center;
      font-family: 'Press Start 2P', monospace;
      text-shadow: 
        2px 2px 4px rgba(0, 0, 0, 0.5),
        0 0 15px rgba(16, 185, 129, 0.8);
      box-shadow: 
        0 6px 0 rgba(5, 150, 105, 0.8), 
        0 0 20px rgba(16, 185, 129, 0.5),
        0 0 30px rgba(16, 185, 129, 0.3);
      letter-spacing: 0.5px;
      border-radius: 8px;
    }
    
    .step-actions button:hover {
      background: linear-gradient(135deg, #34D399 0%, #6EE7B7 100%);
      color: #ffffff;
      transform: translateY(-5px) scale(1.05);
      box-shadow: 
        0 8px 0 rgba(5, 150, 105, 1), 
        0 0 30px rgba(16, 185, 129, 0.8),
        0 0 50px rgba(52, 211, 153, 0.6);
      text-shadow: 
        2px 2px 4px rgba(0, 0, 0, 0.5),
        0 0 20px rgba(16, 185, 129, 1);
      border-color: #6EE7B7;
    }
    
    .step-actions button:active {
      transform: translateY(-1px);
      box-shadow: 
        0 2px 0 rgba(5, 150, 105, 0.8), 
        0 0 10px rgba(16, 185, 129, 0.4);
      text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
    }
    
    .tutorial-footer {
      display: flex;
      gap: 8px;
      margin-top: 0;
      padding: 14px 16px;
      background: linear-gradient(180deg, #0a0a0a 0%, #1a0a2e 100%);
      border-top: 3px solid #10B981;
      border-radius: 0 0 8px 8px;
    }
    
    .tut-btn {
      flex: 1;
      padding: 12px 14px;
      border: 3px solid #10B981;
      background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
      color: #ffffff;
      font-size: 10px;
      font-weight: normal;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Press Start 2P', monospace;
      text-shadow: 
        2px 2px 4px rgba(0, 0, 0, 0.5),
        0 0 15px rgba(16, 185, 129, 0.8);
      box-shadow: 
        0 6px 0 rgba(5, 150, 105, 0.8), 
        0 0 20px rgba(16, 185, 129, 0.5),
        0 0 30px rgba(16, 185, 129, 0.3);
      letter-spacing: 0.5px;
      min-height: 44px;
      border-radius: 8px;
    }
    
    .tut-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #34D399 0%, #6EE7B7 100%);
      color: #ffffff;
      transform: translateY(-5px) scale(1.05);
      box-shadow: 
        0 8px 0 rgba(5, 150, 105, 1), 
        0 0 30px rgba(16, 185, 129, 0.8),
        0 0 50px rgba(52, 211, 153, 0.6);
      text-shadow: 
        2px 2px 4px rgba(0, 0, 0, 0.5),
        0 0 20px rgba(16, 185, 129, 1);
      border-color: #6EE7B7;
    }
    
    .tut-btn:active:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 
        0 2px 0 rgba(5, 150, 105, 0.8), 
        0 0 10px rgba(16, 185, 129, 0.4);
      text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
    }
    
    .tut-btn-primary {
      border-color: #10B981;
      background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
      color: #ffffff;
    }
    
    .tut-btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #34D399 0%, #6EE7B7 100%);
    }
    
    .tut-btn-secondary {
      border-color: #7C3AED;
      background: linear-gradient(135deg, #7C3AED 0%, #a78bfa 100%);
      color: #ffffff;
      box-shadow: 
        0 6px 0 rgba(91, 33, 182, 0.8), 
        0 0 20px rgba(124, 58, 237, 0.5),
        0 0 30px rgba(124, 58, 237, 0.3);
      text-shadow: 
        2px 2px 4px rgba(0, 0, 0, 0.5),
        0 0 15px rgba(124, 58, 237, 0.8);
    }
    
    .tut-btn-secondary:hover:not(:disabled) {
      background: linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%);
      box-shadow: 
        0 8px 0 rgba(91, 33, 182, 1), 
        0 0 30px rgba(124, 58, 237, 0.8),
        0 0 50px rgba(167, 139, 250, 0.6);
      border-color: #c4b5fd;
    }
    
    .tut-btn-secondary:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
      background: rgba(124, 58, 237, 0.2);
      box-shadow: 0 2px 0 rgba(91, 33, 182, 0.4);
    }
    
    .tut-btn-skip {
      border-color: #6B7280;
      background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%);
      color: #ffffff;
      box-shadow: 
        0 6px 0 rgba(75, 85, 99, 0.8), 
        0 0 15px rgba(107, 114, 128, 0.4);
      text-shadow: 
        2px 2px 4px rgba(0, 0, 0, 0.5),
        0 0 10px rgba(107, 114, 128, 0.6);
    }
    
    .tut-btn-skip:hover {
      background: linear-gradient(135deg, #9CA3AF 0%, #D1D5DB 100%);
      box-shadow: 
        0 8px 0 rgba(75, 85, 99, 1), 
        0 0 25px rgba(107, 114, 128, 0.6);
      border-color: #D1D5DB;
    }
    
    .tut-btn-hint {
      border-color: #FBBF24;
      background: linear-gradient(135deg, #FBBF24 0%, #FCD34D 100%);
      color: #000;
      box-shadow: 
        0 6px 0 rgba(217, 119, 6, 0.8), 
        0 0 20px rgba(251, 191, 36, 0.5),
        0 0 30px rgba(251, 191, 36, 0.3);
      text-shadow: 
        1px 1px 2px rgba(255, 255, 255, 0.3),
        0 0 10px rgba(251, 191, 36, 0.8);
    }
    
    .tut-btn-hint:hover:not(:disabled) {
      background: linear-gradient(135deg, #FCD34D 0%, #FDE68A 100%);
      box-shadow: 
        0 8px 0 rgba(217, 119, 6, 1), 
        0 0 30px rgba(251, 191, 36, 0.8),
        0 0 50px rgba(252, 211, 77, 0.6);
      border-color: #FDE68A;
    }
    
    .tut-btn-hint:disabled,
    .tut-btn-hint.hint-used {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: #6B7280;
      background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%);
      color: #ffffff;
      box-shadow: 0 2px 0 rgba(75, 85, 99, 0.4);
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }
    
    .tut-btn-hint:disabled:hover,
    .tut-btn-hint.hint-used:hover {
      transform: none;
      background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%);
      color: #ffffff;
      box-shadow: 0 2px 0 rgba(75, 85, 99, 0.4);
    }
    
    .tutorial-progress-bar {
      height: 10px;
      background: rgba(16, 185, 129, 0.12);
      margin: 0;
      border: 3px solid #7C3AED;
      overflow: hidden;
      border-radius: 5px;
      box-shadow: 
        inset 0 2px 4px rgba(0, 0, 0, 0.4),
        0 0 12px rgba(124, 58, 237, 0.4);
    }
    
    .tutorial-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10B981 0%, #34D399 50%, #7C3AED 100%);
      transition: width 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      box-shadow: 
        0 0 12px rgba(16, 185, 129, 0.9),
        0 0 20px rgba(52, 211, 153, 0.6);
      border-radius: 3px;
      animation: progressFillShine 2s ease-in-out infinite;
    }
    
    @keyframes progressFillShine {
      0%, 100% {
        filter: brightness(1);
      }
      50% {
        filter: brightness(1.2);
      }
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
      background: rgba(16, 185, 129, 0.1);
      color: #10B981;
      padding: 6px 10px;
      border: 2px solid #10B981;
      font-size: 8px;
      font-weight: normal;
      white-space: nowrap;
      transform: translateX(-25%);
      box-shadow: 0 2px 0 rgba(5, 150, 105, 0.8);
      font-family: 'Press Start 2P', monospace;
      text-shadow: 1px 1px 0px #000;
      letter-spacing: 0.5px;
      border-radius: 4px;
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
    
    /* Congratulations Achievement Screen - 3D Stars Design */
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
      background: rgba(0, 0, 0, 0.85);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .congrats-content {
      position: relative;
      background: #1a1a1a;
      border: 3px solid #10B981;
      padding: 40px 50px;
      max-width: 600px;
      width: 90%;
      text-align: center;
      border-radius: 8px;
    }
    
    .stars-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin: 0 0 20px 0;
      min-height: 220px;
      perspective: 1200px;
      perspective-origin: center bottom;
      transform-style: preserve-3d;
      position: relative;
      z-index: 1;
      pointer-events: none;
    }
    
    .star {
      width: 200px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      position: relative;
      transform-style: preserve-3d;
      will-change: transform, opacity;
      pointer-events: none;
    }

    .star-1 {
      transform: rotateY(-35deg) rotateX(15deg) translateX(-60px) translateZ(-150px) scale(0.7);
    }

    .star-2 {
      transform: rotateY(0deg) rotateX(0deg) translateZ(0) scale(1);
    }

    .star-3 {
      transform: rotateY(35deg) rotateX(15deg) translateX(60px) translateZ(-150px) scale(0.7);
    }

    /* Dynamic positioning classes */
    .stars-container.single-star .star-2 {
      transform: rotateY(0deg) rotateX(0deg) translateZ(0) scale(1);
    }

    .stars-container.two-stars .star-1 {
      transform: rotateY(-20deg) rotateX(10deg) translateX(-40px) translateZ(-80px) scale(0.85);
    }

    .stars-container.two-stars .star-3 {
      transform: rotateY(20deg) rotateX(10deg) translateX(40px) translateZ(-80px) scale(0.85);
    }

    /* Flying in animations for each star */
    @keyframes flyIn1 {
      0% {
        opacity: 0;
        transform: rotateY(-35deg) rotateX(15deg) translateX(-60px) translateZ(-150px) scale(0.7) translateY(-300px) translateZ(-400px) scale(0.2) rotateY(180deg);
      }
      60% {
        opacity: 1;
        transform: rotateY(-35deg) rotateX(15deg) translateX(-60px) translateZ(-150px) scale(0.7) translateY(20px) translateZ(50px) scale(1.1);
      }
      100% {
        opacity: 1;
        transform: rotateY(-35deg) rotateX(15deg) translateX(-60px) translateZ(-150px) scale(0.7);
      }
    }

    @keyframes flyIn2 {
      0% {
        opacity: 0;
        transform: rotateY(0deg) rotateX(0deg) translateZ(0) scale(1) translateY(-300px) translateZ(-400px) scale(0.2) rotateY(180deg);
      }
      60% {
        opacity: 1;
        transform: rotateY(0deg) rotateX(0deg) translateZ(0) scale(1) translateY(20px) translateZ(50px) scale(1.1);
      }
      100% {
        opacity: 1;
        transform: rotateY(0deg) rotateX(0deg) translateZ(0) scale(1);
      }
    }

    @keyframes flyIn3 {
      0% {
        opacity: 0;
        transform: rotateY(35deg) rotateX(15deg) translateX(60px) translateZ(-150px) scale(0.7) translateY(-300px) translateZ(-400px) scale(0.2) rotateY(180deg);
      }
      60% {
        opacity: 1;
        transform: rotateY(35deg) rotateX(15deg) translateX(60px) translateZ(-150px) scale(0.7) translateY(20px) translateZ(50px) scale(1.1);
      }
      100% {
        opacity: 1;
        transform: rotateY(35deg) rotateX(15deg) translateX(60px) translateZ(-150px) scale(0.7);
      }
    }

    .star-1.star-fly-in {
      animation: flyIn1 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .star-2.star-fly-in {
      animation: flyIn2 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .star-3.star-fly-in {
      animation: flyIn3 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    /* Two-star positioning animations */
    @keyframes flyInTwo1 {
      0% {
        opacity: 0;
        transform: rotateY(-20deg) rotateX(10deg) translateX(-40px) translateZ(-80px) scale(0.85) translateY(-300px) translateZ(-400px) scale(0.2) rotateY(180deg);
      }
      60% {
        opacity: 1;
        transform: rotateY(-20deg) rotateX(10deg) translateX(-40px) translateZ(-80px) scale(0.85) translateY(20px) translateZ(50px) scale(1.1);
      }
      100% {
        opacity: 1;
        transform: rotateY(-20deg) rotateX(10deg) translateX(-40px) translateZ(-80px) scale(0.85);
      }
    }

    @keyframes flyInTwo3 {
      0% {
        opacity: 0;
        transform: rotateY(20deg) rotateX(10deg) translateX(40px) translateZ(-80px) scale(0.85) translateY(-300px) translateZ(-400px) scale(0.2) rotateY(180deg);
      }
      60% {
        opacity: 1;
        transform: rotateY(20deg) rotateX(10deg) translateX(40px) translateZ(-80px) scale(0.85) translateY(20px) translateZ(50px) scale(1.1);
      }
      100% {
        opacity: 1;
        transform: rotateY(20deg) rotateX(10deg) translateX(40px) translateZ(-80px) scale(0.85);
      }
    }

    .stars-container.two-stars .star-1.star-fly-in {
      animation: flyInTwo1 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .stars-container.two-stars .star-3.star-fly-in {
      animation: flyInTwo3 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    
    .star-icon {
      width: 200px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform-style: preserve-3d;
      position: relative;
    }

    .star-icon::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 200px;
      height: 200px;
      background: rgba(0, 0, 0, 0.9);
      transform-origin: center;
      border-radius: 50%;
      z-index: -1000;
      pointer-events: none;
      opacity: 0.8;
    }

    .star-icon img,
    .star-icon svg {
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      object-fit: contain;
      transform: translateZ(0);
      position: relative;
      z-index: 2;
    }

    /* Perspective shadows - warped based on star's 3D transform */
    .star-1 .star-icon::before {
      transform: translate(-50%, -50%) 
                 translateY(150px)
                 translateX(60px)
                 scaleY(2.5) 
                 scaleX(1.8)
                 skewX(25deg)
                 rotateX(85deg);
      width: 200px;
      height: 120px;
      border-radius: 50%;
      filter: blur(8px);
    }

    .star-2 .star-icon::before {
      transform: translate(-50%, -50%) 
                 translateY(160px)
                 scaleY(2.8) 
                 scaleX(1.6)
                 rotateX(85deg);
      width: 220px;
      height: 130px;
      border-radius: 50%;
      filter: blur(8px);
    }

    .star-3 .star-icon::before {
      transform: translate(-50%, -50%) 
                 translateY(150px)
                 translateX(-60px)
                 scaleY(2.5) 
                 scaleX(1.8)
                 skewX(-25deg)
                 rotateX(85deg);
      width: 200px;
      height: 120px;
      border-radius: 50%;
      filter: blur(8px);
    }
    
    .star-appear {
      animation: starPop1 0.5s ease-out forwards;
    }

    .star-2.star-appear {
      animation: starPop2 0.5s ease-out forwards;
    }

    .star-3.star-appear {
      animation: starPop3 0.5s ease-out forwards;
    }
    
    @keyframes starPop1 {
      0% {
        transform: rotateY(-35deg) rotateX(15deg) translateX(-60px) translateZ(-150px) scale(0.7) scale(0);
        opacity: 0;
      }
      50% {
        transform: rotateY(-35deg) rotateX(15deg) translateX(-60px) translateZ(-150px) scale(0.7) scale(1.2);
        opacity: 1;
      }
      100% {
        transform: rotateY(-35deg) rotateX(15deg) translateX(-60px) translateZ(-150px) scale(0.7) scale(1);
        opacity: 1;
      }
    }
    
    @keyframes starPop2 {
      0% {
        transform: rotateY(0deg) rotateX(0deg) translateZ(0) scale(1) scale(0);
        opacity: 0;
      }
      50% {
        transform: rotateY(0deg) rotateX(0deg) translateZ(0) scale(1) scale(1.2);
        opacity: 1;
      }
      100% {
        transform: rotateY(0deg) rotateX(0deg) translateZ(0) scale(1) scale(1);
        opacity: 1;
      }
    }

    @keyframes starPop3 {
      0% {
        transform: rotateY(35deg) rotateX(15deg) translateX(60px) translateZ(-150px) scale(0.7) scale(0);
        opacity: 0;
      }
      50% {
        transform: rotateY(35deg) rotateX(15deg) translateX(60px) translateZ(-150px) scale(0.7) scale(1.2);
        opacity: 1;
      }
      100% {
        transform: rotateY(35deg) rotateX(15deg) translateX(60px) translateZ(-150px) scale(0.7) scale(1);
        opacity: 1;
      }
    }

    .star.inactive {
      opacity: 0.2;
      filter: grayscale(1);
    }

    .star.star-appear {
      opacity: 1 !important;
    }

    .star-1:not(.inactive) {
      animation: starFloat1 3s ease-in-out infinite 1.6s;
    }

    .star-1:not(.inactive) .star-icon::before {
      animation: starShadow1 3s ease-in-out infinite 1.6s;
    }

    .star-2:not(.inactive) {
      animation: starFloat2 3s ease-in-out infinite 1.6s;
    }

    .star-2:not(.inactive) .star-icon::before {
      animation: starShadow2 3s ease-in-out infinite 1.6s;
    }

    .star-3:not(.inactive) {
      animation: starFloat3 3s ease-in-out infinite 1.6s;
    }

    .star-3:not(.inactive) .star-icon::before {
      animation: starShadow3 3s ease-in-out infinite 1.6s;
    }

    /* Two-star floating animations */
    .stars-container.two-stars .star-1:not(.inactive) {
      animation: starFloatTwo1 3s ease-in-out infinite 1.6s;
    }

    .stars-container.two-stars .star-3:not(.inactive) {
      animation: starFloatTwo3 3s ease-in-out infinite 1.6s;
    }

    @keyframes starFloatTwo1 {
      0%, 100% {
        transform: rotateY(-20deg) rotateX(10deg) translateX(-40px) translateZ(-80px) scale(0.85) translateY(0);
        opacity: 1;
      }
      50% {
        transform: rotateY(-22deg) rotateX(12deg) translateX(-40px) translateZ(-70px) scale(0.85) translateY(-8px);
        opacity: 1;
      }
    }

    @keyframes starFloatTwo3 {
      0%, 100% {
        transform: rotateY(20deg) rotateX(10deg) translateX(40px) translateZ(-80px) scale(0.85) translateY(0);
        opacity: 1;
      }
      50% {
        transform: rotateY(22deg) rotateX(12deg) translateX(40px) translateZ(-70px) scale(0.85) translateY(-8px);
        opacity: 1;
      }
    }

    @keyframes starFloat1 {
      0%, 100% {
        transform: rotateY(-35deg) rotateX(15deg) translateX(-60px) translateZ(-150px) scale(0.7) translateY(0);
        opacity: 1;
      }
      50% {
        transform: rotateY(-38deg) rotateX(17deg) translateX(-60px) translateZ(-140px) scale(0.7) translateY(-8px);
        opacity: 1;
      }
    }

    @keyframes starShadow1 {
      0%, 100% {
        transform: translate(-50%, -50%) 
                   translateY(150px)
                   translateX(60px)
                   scaleY(2.5) 
                   scaleX(1.8)
                   skewX(25deg)
                   rotateX(85deg);
        opacity: 0.8;
      }
      50% {
        transform: translate(-50%, -50%) 
                   translateY(160px)
                   translateX(65px)
                   scaleY(2.7) 
                   scaleX(1.9)
                   skewX(27deg)
                   rotateX(85deg);
        opacity: 0.9;
      }
    }

    @keyframes starFloat2 {
      0%, 100% {
        transform: rotateY(0deg) rotateX(0deg) translateZ(0) scale(1) translateY(0);
        opacity: 1;
      }
      50% {
        transform: rotateY(0deg) rotateX(5deg) translateZ(10px) scale(1) translateY(-10px);
        opacity: 1;
      }
    }

    @keyframes starShadow2 {
      0%, 100% {
        transform: translate(-50%, -50%) 
                   translateY(160px)
                   scaleY(2.8) 
                   scaleX(1.6)
                   rotateX(85deg);
        opacity: 0.8;
      }
      50% {
        transform: translate(-50%, -50%) 
                   translateY(170px)
                   scaleY(3.0) 
                   scaleX(1.7)
                   rotateX(85deg);
        opacity: 0.9;
      }
    }

    @keyframes starFloat3 {
      0%, 100% {
        transform: rotateY(35deg) rotateX(15deg) translateX(60px) translateZ(-150px) scale(0.7) translateY(0);
        opacity: 1;
      }
      50% {
        transform: rotateY(38deg) rotateX(17deg) translateX(60px) translateZ(-140px) scale(0.7) translateY(-8px);
        opacity: 1;
      }
    }

    @keyframes starShadow3 {
      0%, 100% {
        transform: translate(-50%, -50%) 
                   translateY(150px)
                   translateX(-60px)
                   scaleY(2.5) 
                   scaleX(1.8)
                   skewX(-25deg)
                   rotateX(85deg);
        opacity: 0.8;
      }
      50% {
        transform: translate(-50%, -50%) 
                   translateY(160px)
                   translateX(-65px)
                   scaleY(2.7) 
                   scaleX(1.9)
                   skewX(-27deg)
                   rotateX(85deg);
        opacity: 0.9;
      }
    }
    
    .congrats-score {
      margin: 0 0 20px 0;
      padding: 15px 20px;
      background: #0f0f0f;
      border: 2px solid #7C3AED;
      border-radius: 6px;
      display: inline-block;
      position: relative;
      z-index: 10;
    }
    
    .score-xp {
      font-size: 18px;
      color: #10B981;
      margin: 0;
      font-weight: normal;
      letter-spacing: 2px;
      line-height: 1.5;
    }
    
    .buttons-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-top: 0;
      position: relative;
      z-index: 100;
      pointer-events: auto;
    }
    
    .congrats-btn {
      padding: 14px 28px;
      font-size: 9px;
      font-weight: normal;
      color: #ffffff;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      border: none;
      cursor: pointer;
      font-family: 'Press Start 2P', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-radius: 0;
      transition: all 0.15s ease;
      box-shadow: 
        inset 0 0 0 4px #10B981,
        0 6px 0 0 #6D28D9,
        0 8px 0 0 rgba(109, 40, 217, 0.5);
      position: relative;
      z-index: 101;
      pointer-events: auto;
    }
    
    .congrats-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cdefs%3E%3Cstyle%3E.border%7Bfill:%2310B981;%7D%3C/style%3E%3C/defs%3E%3Crect class='border' x='0' y='0' width='100' height='4'/%3E%3Crect class='border' x='0' y='0' width='4' height='100'/%3E%3Crect class='border' x='96' y='0' width='4' height='100'/%3E%3Crect class='border' x='0' y='96' width='100' height='4'/%3E%3C/svg%3E");
      background-size: 100% 100%;
      background-repeat: no-repeat;
      pointer-events: none;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      z-index: 1;
    }
    
    .congrats-btn:hover {
      background: linear-gradient(135deg, #059669 0%, #10B981 100%);
      box-shadow: 
        inset 0 0 0 4px #059669,
        0 3px 0 0 #6D28D9,
        0 5px 0 0 rgba(109, 40, 217, 0.5);
      transform: translateY(3px);
    }
    
    .congrats-btn:hover::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cdefs%3E%3Cstyle%3E.border%7Bfill:%23059669;%7D%3C/style%3E%3C/defs%3E%3Crect class='border' x='0' y='0' width='100' height='4'/%3E%3Crect class='border' x='0' y='0' width='4' height='100'/%3E%3Crect class='border' x='96' y='0' width='4' height='100'/%3E%3Crect class='border' x='0' y='96' width='100' height='4'/%3E%3C/svg%3E");
    }
    
    .congrats-btn:active {
      transform: translateY(6px);
      box-shadow: 
        inset 0 0 0 4px #059669,
        0 0 0 0 #6D28D9;
    }

    .icon-btn {
      width: 50px;
      height: 50px;
      padding: 0;
      background: #1a1a1a;
      border: 3px solid #7C3AED;
      cursor: pointer;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      position: relative;
      z-index: 101;
      pointer-events: auto;
    }

    .icon-btn:hover {
      background: #2a2a2a;
      border-color: #a78bfa;
      transform: translateY(-2px);
    }

    .icon-btn:active {
      transform: translateY(0);
    }

    .icon-btn svg {
      width: 24px;
      height: 24px;
      fill: #7C3AED;
    }

    .icon-btn:hover svg {
      fill: #a78bfa;
    }

    @media (max-width: 600px) {
      .congrats-content {
        padding: 30px 30px;
      }
      
      .stars-container {
        gap: 10px;
        min-height: 150px;
      }
      
      .star {
        width: 120px;
        height: 120px;
      }
      
      .star-icon {
        width: 120px;
        height: 120px;
      }
      
      .score-xp {
        font-size: 14px;
      }

      .buttons-container {
        gap: 10px;
      }

      .icon-btn {
        width: 45px;
        height: 45px;
      }

      .icon-btn svg {
        width: 20px;
        height: 20px;
      }

      .congrats-btn {
        padding: 14px 28px;
        font-size: 9px;
      }
    }
    
    /* Gamification Bar - Exact Copy of Popup XP Bar */
    #gamification-bar {
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 650px;
      background: transparent;
      padding: 12px 16px;
      box-sizing: border-box;
      z-index: 999998;
      position: relative;
      pointer-events: none;
    }
    
    #gamification-bar * {
      pointer-events: none;
    }
    
    #gamification-bar .gamification-popup-icon,
    #gamification-bar .gamification-tutorial-btn {
      pointer-events: all;
    }
    
    
    .gamification-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      width: 100%;
      position: relative;
      z-index: 1;
    }
    
    .gamification-tutorial-btn {
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.6);
      border: 2px solid #10B981;
      border-radius: 6px;
      color: #10B981;
      font-family: 'Press Start 2P', 'Courier New', monospace !important;
      font-size: 0.35rem;
      cursor: pointer;
      transition: all 0.2s ease;
      pointer-events: all;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      backdrop-filter: blur(4px);
      box-shadow: 
        0 0 10px rgba(16, 185, 129, 0.4),
        inset 0 0 5px rgba(16, 185, 129, 0.1);
    }
    
    .gamification-tutorial-btn:hover {
      background: rgba(16, 185, 129, 0.2);
      border-color: #34D399;
      color: #34D399;
      transform: scale(1.05);
      box-shadow: 
        0 0 15px rgba(16, 185, 129, 0.6),
        inset 0 0 8px rgba(16, 185, 129, 0.2);
    }
    
    .gamification-tutorial-btn:active {
      transform: scale(1.02);
      box-shadow: 
        0 0 8px rgba(16, 185, 129, 0.4),
        inset 0 0 5px rgba(16, 185, 129, 0.15);
    }
    
    .gamification-tutorial-btn-text {
      display: block;
      text-shadow: 
        1px 1px 2px rgba(0, 0, 0, 0.8),
        0 0 8px rgba(16, 185, 129, 0.6);
    }
    
    .gamification-progress-container {
      flex: 1;
      max-width: 500px;
      display: flex;
      flex-direction: column;
    }
    
    .gamification-popup-icon {
      width: 36px;
      height: 36px;
      object-fit: contain;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      filter: drop-shadow(0 0 10px rgba(76, 29, 149, 1)) drop-shadow(0 0 20px rgba(91, 33, 182, 0.9)) drop-shadow(0 0 30px rgba(76, 29, 149, 0.7));
      transition: transform 0.2s ease, filter 0.2s ease;
      pointer-events: all;
      cursor: pointer;
    }
    
    .gamification-popup-icon:hover {
      transform: scale(1.1);
      filter: drop-shadow(0 0 15px rgba(76, 29, 149, 1)) drop-shadow(0 0 25px rgba(91, 33, 182, 1)) drop-shadow(0 0 40px rgba(76, 29, 149, 0.9));
    }
    
    .gamification-popup-icon:active {
      transform: scale(1.05);
    }
    
    .gamification-progress-bar {
      width: 100%;
      height: 22px;
      background: rgba(0, 0, 0, 0.6);
      border: 3px solid #10B981;
      border-radius: 11px;
      overflow: hidden;
      position: relative;
      box-shadow: 
        inset 0 2px 4px rgba(0, 0, 0, 0.3),
        0 0 15px rgba(16, 185, 129, 0.4),
        0 0 25px rgba(16, 185, 129, 0.2);
      animation: progressBarPulse 2s ease-in-out infinite;
      backdrop-filter: blur(4px);
    }
    
    @keyframes progressBarPulse {
      0%, 100% {
        box-shadow: 
          inset 0 2px 4px rgba(0, 0, 0, 0.3),
          0 0 15px rgba(16, 185, 129, 0.4),
          0 0 25px rgba(16, 185, 129, 0.2);
      }
      50% {
        box-shadow: 
          inset 0 2px 4px rgba(0, 0, 0, 0.3),
          0 0 20px rgba(16, 185, 129, 0.6),
          0 0 35px rgba(16, 185, 129, 0.4);
      }
    }
    
    .gamification-progress-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 100%
      );
      animation: shimmer 2s infinite;
      pointer-events: none;
    }
    
    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
    
    .gamification-progress-fill {
      height: 100%;
      background: linear-gradient(
        90deg,
        #10B981 0%,
        #34D399 30%,
        #6EE7B7 50%,
        #34D399 70%,
        #10B981 100%
      );
      background-size: 200% 100%;
      width: 0%;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 
        0 0 20px rgba(16, 185, 129, 1),
        0 0 30px rgba(52, 211, 153, 0.6),
        inset 0 0 15px rgba(255, 255, 255, 0.3);
      position: relative;
      animation: progressGlow 2s ease-in-out infinite, fillShine 3s linear infinite;
      border-radius: 8px;
    }
    
    @keyframes fillShine {
      0% {
        background-position: 0% 0%;
      }
      100% {
        background-position: 200% 0%;
      }
    }
    
    .gamification-progress-fill::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.3) 50%,
        transparent 100%
      );
      animation: fillShimmer 1.5s infinite;
    }
    
    @keyframes progressGlow {
      0%, 100% {
        box-shadow: 
          0 0 15px rgba(16, 185, 129, 0.8),
          inset 0 0 10px rgba(255, 255, 255, 0.2);
      }
      50% {
        box-shadow: 
          0 0 20px rgba(16, 185, 129, 1),
          inset 0 0 15px rgba(255, 255, 255, 0.3);
      }
    }
    
    @keyframes fillShimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
    
    .gamification-progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 0.4rem;
      color: #ffffff;
      text-align: center;
      letter-spacing: 1px;
      text-shadow: 
        2px 2px 4px rgba(0, 0, 0, 0.9),
        0 0 10px rgba(16, 185, 129, 0.8),
        0 0 15px rgba(52, 211, 153, 0.6);
      font-weight: bold;
      font-family: 'Press Start 2P', 'Courier New', monospace !important;
      z-index: 10;
      pointer-events: none;
      white-space: nowrap;
      animation: textBounce 2s ease-in-out infinite;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
    }
    
    @keyframes textBounce {
      0%, 100% {
        transform: translate(-50%, -50%) scale(1);
      }
      50% {
        transform: translate(-50%, -50%) scale(1.05);
      }
    }
    
    .xp-gain-indicator {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: #FBBF24;
      font-family: 'Press Start 2P', monospace;
      text-shadow: 2px 2px 0px #000, 0 0 8px rgba(251, 191, 36, 0.8);
      animation: xpGainFloat 1.5s ease-out forwards;
      pointer-events: none;
      z-index: 10;
    }
    
    @keyframes xpGainFloat {
      0% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      100% {
        opacity: 0;
        transform: translateX(-50%) translateY(-30px);
      }
    }
    
    .xp-gain-indicator.fade-out {
      animation: xpGainFloat 0.5s ease-out forwards;
    }
    
    /* Level Up Animation */
    #level-up-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000001;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      animation: fadeIn 0.3s ease-in;
    }
    
    .level-up-content {
      background: #000;
      border: 6px solid #FBBF24;
      padding: 40px 60px;
      text-align: center;
      box-shadow: 0 0 0 4px #7C3AED, 0 0 40px rgba(251, 191, 36, 0.8), 0 0 80px rgba(251, 191, 36, 0.4);
      animation: levelUpPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    @keyframes levelUpPop {
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
    
    .level-up-icon {
      font-size: 60px;
      margin-bottom: 20px;
      animation: bounce 1s ease-in-out infinite;
      filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.8));
    }
    
    .level-up-title {
      font-size: 24px;
      color: #FBBF24;
      font-family: 'Press Start 2P', monospace;
      text-shadow: 3px 3px 0px #000, 0 0 15px rgba(251, 191, 36, 0.8);
      margin-bottom: 16px;
      letter-spacing: 2px;
    }
    
    .level-up-level {
      font-size: 32px;
      color: #10B981;
      font-family: 'Press Start 2P', monospace;
      text-shadow: 4px 4px 0px #000, 0 0 20px rgba(16, 185, 129, 0.8);
      letter-spacing: 3px;
    }
    
    .level-up-multi {
      font-size: 18px;
      color: #FBBF24;
      font-family: 'Press Start 2P', monospace;
      text-shadow: 2px 2px 0px #000, 0 0 15px rgba(251, 191, 36, 0.8);
      margin-top: 10px;
      animation: bounce 1s ease-in-out infinite;
    }
    
    .level-up-milestone {
      font-size: 24px;
      margin: 15px 0;
      animation: bounce 1s ease-in-out infinite;
    }
    
    .level-up-stats {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid rgba(16, 185, 129, 0.3);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .level-up-stat {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-family: 'Press Start 2P', monospace;
    }
    
    .stat-label {
      color: #7C3AED;
      text-shadow: 1px 1px 0px #000;
    }
    
    .stat-value {
      color: #10B981;
      text-shadow: 1px 1px 0px #000;
    }
    
    @keyframes streakPulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.05);
      }
    }
    
    #level-up-overlay.fade-out {
      animation: fadeOut 0.5s ease-out forwards;
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
  
  // Ensure gamification bar exists
  if (!document.getElementById('gamification-bar')) {
    createGamificationBar();
  }
  
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
  
  // Hide the description div (green div)
  const descriptionDiv = document.getElementById('step-description');
  if (descriptionDiv) {
    descriptionDiv.style.display = 'none';
  }
  
  // Update speech bubble with info box text (purple div text)
  const speechText = document.getElementById('corner-speech-text');
  if (speechText) {
    const instructionText = step.infoBox || step.title || `STEP ${stepIndex + 1}`;
    speechText.textContent = instructionText.toUpperCase();
  }
  
  // Display info box with description text (move green div text to purple div)
  const infoBox = document.getElementById('step-info-box');
  const infoBoxContent = infoBox ? infoBox.querySelector('.info-box-content') : null;
  const descriptionText = step.description || '';
  if (descriptionText.trim() && infoBoxContent) {
    infoBoxContent.textContent = descriptionText;
    infoBox.classList.add('show-info');
  } else {
    if (infoBoxContent) infoBoxContent.textContent = '';
    if (infoBox) infoBox.classList.remove('show-info');
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
  // Award XP for completing current step
  const currentStep = tutorialData[currentTutorialStep];
  if (currentStep) {
    let xpAmount = 10; // Base XP per step
    
    // Reduce XP if hint was used
    if (hintsUsed[currentTutorialStep]) {
      xpAmount = 5; // Half XP if hint was used
      gamificationState.hintsUsed += 1;
    }
    
    awardXP(xpAmount, `Completed: ${currentStep.title}`);
  }
  
  if (currentTutorialStep < tutorialData.length - 1) {
    currentTutorialStep += 1;
    showStep(currentTutorialStep);
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
  
  // Award bonus XP for completing tutorial with multipliers
  let bonusXP = 50; // Base completion bonus
  let multiplier = 1;
  
  if (hintPercentage === 0) {
    bonusXP = 100; // Perfect run bonus
    multiplier = 2.0; // 2x multiplier for perfect run
    gamificationState.perfectRuns += 1;
  } else if (hintPercentage < 25) {
    bonusXP = 75; // Great run bonus
    multiplier = 1.5; // 1.5x multiplier
  } else if (hintPercentage < 50) {
    bonusXP = 50; // Good run bonus
    multiplier = 1.2; // 1.2x multiplier
  } else {
    bonusXP = 25; // Completion bonus
    multiplier = 1.0;
  }
  
  // Speed bonus (if completed quickly)
  const tutorialStartTime = window.tutorialStartTime || Date.now();
  const completionTime = (Date.now() - tutorialStartTime) / 1000 / 60; // minutes
  if (completionTime < 10 && hintPercentage === 0) {
    multiplier *= 1.3; // Speed bonus for fast perfect completion
    bonusXP += 25;
  }
  
  awardXP(bonusXP, 'Tutorial Completed!', multiplier);
  
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
  
  // Get star icon URL
  let starIconUrl = 'iconpack/Png/star.png';
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      starIconUrl = chrome.runtime.getURL('iconpack/Png/star.png');
    }
  } catch (e) {
    console.error('Error getting star icon URL:', e);
  }
  
  // Use the bonusXP that was already calculated and awarded
  const xpGained = Math.round(bonusXP * multiplier);
  
  // Create congratulations overlay
  const congratsOverlay = document.createElement('div');
  congratsOverlay.id = 'congratulations-overlay';
  
  // Determine container class for star positioning
  let containerClass = 'three-stars';
  if (stars === 1) {
    containerClass = 'single-star';
  } else if (stars === 2) {
    containerClass = 'two-stars';
  }
  
  congratsOverlay.innerHTML = `
    <div class="congrats-content">
      <div class="stars-container ${containerClass}">
        <div class="star star-1 ${stars >= 1 ? '' : 'inactive'}">
          <div class="star-icon">
            <img src="${starIconUrl}" alt="Star" />
      </div>
        </div>
        <div class="star star-2 ${stars >= 2 ? '' : 'inactive'}">
          <div class="star-icon">
            <img src="${starIconUrl}" alt="Star" />
          </div>
        </div>
        <div class="star star-3 ${stars >= 3 ? '' : 'inactive'}">
          <div class="star-icon">
            <img src="${starIconUrl}" alt="Star" />
          </div>
        </div>
      </div>
      
      <div class="congrats-score">
        <div class="score-xp">+${xpGained} XP</div>
      </div>
      
      <div class="buttons-container">
        <button class="icon-btn" id="congrats-restart-btn" title="Restart">
          <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;">
            <rect x="2" y="2" width="2" height="2"/>
            <rect x="4" y="2" width="2" height="2"/>
            <rect x="2" y="4" width="2" height="2"/>
            <rect x="6" y="2" width="2" height="2"/>
            <rect x="8" y="2" width="2" height="2"/>
            <rect x="10" y="4" width="2" height="2"/>
            <rect x="12" y="6" width="2" height="2"/>
            <rect x="12" y="8" width="2" height="2"/>
            <rect x="10" y="10" width="2" height="2"/>
            <rect x="8" y="12" width="2" height="2"/>
            <rect x="6" y="12" width="2" height="2"/>
            <rect x="4" y="10" width="2" height="2"/>
          </svg>
        </button>
        <button class="icon-btn" id="congrats-menu-btn" title="Menu">
          <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;">
            <rect x="2" y="3" width="12" height="2"/>
            <rect x="2" y="7" width="12" height="2"/>
            <rect x="2" y="11" width="12" height="2"/>
          </svg>
        </button>
      <button class="congrats-btn" id="congrats-close-btn">Continue</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(congratsOverlay);
  
  // Animate stars appearing (only the earned ones)
  setTimeout(() => {
    const starsEls = congratsOverlay.querySelectorAll('.star');
    const container = congratsOverlay.querySelector('.stars-container');
    
    starsEls.forEach((star, index) => {
      let shouldShow = false;
      
      if (stars === 1) {
        // Show only middle star (index 1)
        shouldShow = (index === 1);
      } else if (stars === 2) {
        // Show left and right stars (indices 0 and 2)
        shouldShow = (index === 0 || index === 2);
      } else if (stars === 3) {
        // Show all stars
        shouldShow = true;
      }
      
      if (shouldShow) {
        star.classList.remove('inactive');
        star.style.opacity = '0';
        
        // Apply fly-in animation with delay
      setTimeout(() => {
          star.classList.remove('star-appear');
          star.classList.add('star-fly-in');
        star.classList.add('star-appear');
          
          // Remove fly-in class after animation completes to allow floating
          setTimeout(() => {
            star.classList.remove('star-fly-in');
          }, 800);
        }, index * 150);
      } else {
        star.classList.remove('star-appear', 'star-fly-in');
        star.classList.add('inactive');
        star.style.opacity = '0.2';
      }
    });
  }, 50);
  
  // Close button handler - navigate to next mini lesson
  const closeBtn = congratsOverlay.querySelector('#congrats-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      congratsOverlay.remove();
      closeTutorial();
      
      // Send message to popup to start next mini lesson
      if (typeof chrome !== 'undefined' && chrome.runtime && tutorialMetadata.mainLessonTitle !== null && tutorialMetadata.miniLessonIndex !== null) {
        chrome.runtime.sendMessage({ 
          action: 'startNextMiniLesson',
          mainLessonTitle: tutorialMetadata.mainLessonTitle,
          currentMiniLessonIndex: tutorialMetadata.miniLessonIndex
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Could not start next mini lesson:', chrome.runtime.lastError.message);
            // Fallback: try to reopen popup
            chrome.runtime.sendMessage({ action: 'reopenPopup' });
          }
        });
      } else {
        // Fallback: try to reopen popup
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ action: 'reopenPopup' });
        }
      }
    });
  } else {
    console.error('[Continue] Continue button not found!');
  }
  
  // Restart button handler
  const restartBtn = congratsOverlay.querySelector('#congrats-restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[Restart] Button clicked, tutorialData length:', tutorialData.length);
      
      // Save tutorial data before closing (closeTutorial clears it)
      const savedTutorialData = [...tutorialData];
      const savedTutorialMetadata = { ...tutorialMetadata };
      
      console.log('[Restart] Saved tutorial data:', savedTutorialData.length, 'steps');
      
    congratsOverlay.remove();
    closeTutorial();
      
      // Reset tutorial state
      hintsUsed = {};
      currentStepHintShown = false;
      window.tutorialStartTime = Date.now();
      
      // Restore tutorial metadata
      tutorialMetadata = savedTutorialMetadata;
      
      // Restart the tutorial with the saved data
      if (savedTutorialData && savedTutorialData.length > 0) {
        console.log('[Restart] Restarting tutorial with', savedTutorialData.length, 'steps');
        // Small delay to ensure cleanup is complete
        setTimeout(() => {
          startTutorial(savedTutorialData);
        }, 100);
      } else {
        console.log('[Restart] No tutorial data, requesting restart from popup');
        // If no tutorial data, request restart from popup
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ action: 'restartTutorial' });
        }
      }
    });
  } else {
    console.error('[Restart] Restart button not found!');
  }
  
  // Menu button handler
  const menuBtn = congratsOverlay.querySelector('#congrats-menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      congratsOverlay.remove();
      closeTutorial();
      
      // Open popup to tutorials page with current tutorial info
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ 
          action: 'openPopup', 
          page: 'mini-lessons',
          mainLessonTitle: tutorialMetadata.mainLessonTitle
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Could not open popup:', chrome.runtime.lastError.message);
            // Fallback: try to reopen popup
            chrome.runtime.sendMessage({ action: 'reopenPopup' });
          }
        });
      }
    });
  } else {
    console.error('[Menu] Menu button not found!');
  }
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
    console.log('[Scratch AI] Received startTutorial message', {
      hostname: location.hostname,
      pathname: location.pathname,
      url: location.href
    });
    
    // Store tutorial metadata for progress tracking
    if (request.mainLessonTitle !== undefined) {
      tutorialMetadata.mainLessonTitle = request.mainLessonTitle;
    }
    if (request.miniLessonIndex !== undefined) {
      tutorialMetadata.miniLessonIndex = request.miniLessonIndex;
    }
    
    // Skip splash screen if requested
    if (request.skipSplash) {
      window.skipSplashScreen = true;
    }
    
    // Check if we're in a Scratch editor context - more robust detection
    // If we're on any scratch.mit.edu domain, just inject - be very lenient
    const isScratchDomain = location.hostname.includes('scratch.mit.edu');
    const isEditor = location.hostname === 'projects.scratch.mit.edu' || 
                     isScratchDomain ||
                     isScratchEditor();
    
    console.log('[Scratch AI] Editor detection:', {
      isEditor,
      isScratchDomain,
      hostname: location.hostname,
      pathname: location.pathname,
      isScratchEditor: isScratchEditor()
    });
    
    // If we're on scratch domain, always try to inject (be very permissive)
    if (isScratchDomain) {
      console.log('[Scratch AI] On Scratch domain, starting tutorial');
      injectTutorialCSS();
      startTutorial(request.tutorialData);
      sendResponse({ success: true, reason: 'scratch_domain' });
      return true;
    } else if (isEditor) {
      console.log('[Scratch AI] Starting tutorial directly');
      injectTutorialCSS();
      startTutorial(request.tutorialData);
      sendResponse({ success: true });
      return true;
    } else {
      // Try to find editor iframe
      try {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        let editorFrame = iframes.find(f => {
          const src = f.getAttribute('src') || '';
          return src.includes('projects.scratch.mit.edu') || src.includes('scratch.mit.edu');
        });
        
        // If no iframe found, wait a bit and try again (editor might be loading)
        if (!editorFrame) {
          console.log('[Scratch AI] No iframe found, retrying...');
          setTimeout(() => {
            const retryFrames = Array.from(document.querySelectorAll('iframe'));
            editorFrame = retryFrames.find(f => {
              const src = f.getAttribute('src') || '';
              return src.includes('projects.scratch.mit.edu') || src.includes('scratch.mit.edu');
        });
        if (editorFrame && editorFrame.contentWindow) {
              try {
                console.log('[Scratch AI] Found iframe on retry, forwarding via postMessage');
          editorFrame.contentWindow.postMessage({ type: 'scratch_ai_start_tutorial', tutorialData: request.tutorialData }, '*');
          sendResponse({ success: true, forwarded: true });
              } catch (e) {
                console.log('[Scratch AI] postMessage failed, injecting directly', e);
                // If postMessage fails, try injecting directly
                injectTutorialCSS();
                startTutorial(request.tutorialData);
                sendResponse({ success: true, injected: true });
              }
            } else {
              // Last resort: try injecting anyway if we're on scratch domain
              console.log('[Scratch AI] No iframe found on retry, injecting directly if on scratch domain');
              if (location.hostname.includes('scratch.mit.edu')) {
                injectTutorialCSS();
                startTutorial(request.tutorialData);
                sendResponse({ success: true, injected: true });
        } else {
          sendResponse({ success: false, reason: 'no_editor_iframe' });
        }
            }
          }, 500);
          return true; // Keep channel open for async response
        } else if (editorFrame && editorFrame.contentWindow) {
          try {
            console.log('[Scratch AI] Found iframe, forwarding via postMessage');
            editorFrame.contentWindow.postMessage({ type: 'scratch_ai_start_tutorial', tutorialData: request.tutorialData }, '*');
            sendResponse({ success: true, forwarded: true });
            return true;
      } catch (e) {
            console.log('[Scratch AI] postMessage failed, injecting directly', e);
            // If postMessage fails, try injecting directly
            injectTutorialCSS();
            startTutorial(request.tutorialData);
            sendResponse({ success: true, injected: true });
            return true;
          }
        } else {
          // If on scratch domain but no iframe, try injecting anyway
          console.log('[Scratch AI] No iframe contentWindow, injecting directly if on scratch domain');
          if (location.hostname.includes('scratch.mit.edu')) {
            injectTutorialCSS();
            startTutorial(request.tutorialData);
            sendResponse({ success: true, injected: true });
            return true;
          } else {
            sendResponse({ success: false, reason: 'no_editor_iframe' });
            return true;
          }
        }
      } catch (e) {
        console.error('[Scratch AI] Error in iframe detection:', e);
        // On error, if we're on scratch domain, try injecting anyway
        if (location.hostname.includes('scratch.mit.edu')) {
          console.log('[Scratch AI] Error occurred but on scratch domain, injecting anyway');
          injectTutorialCSS();
          startTutorial(request.tutorialData);
          sendResponse({ success: true, injected: true });
          return true;
        } else {
        sendResponse({ success: false, reason: 'forward_error', error: String(e) });
          return true;
      }
    }
    }
    return true; // Keep channel open
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

// Create gamification bar on page load (if on Scratch domain)
if (isScratchEditor() || location.hostname.includes('scratch.mit.edu')) {
  // Wait a bit for page to be ready
  setTimeout(() => {
    createGamificationBar();
  }, 500);
}

// Detect Scratch editor in top frame (scratch.mit.edu /projects/{id}/editor)
function isScratchEditor() {
  // Check hostname - both scratch.mit.edu and projects.scratch.mit.edu
  const onScratch = location.hostname.endsWith('scratch.mit.edu') || 
                    location.hostname === 'projects.scratch.mit.edu' ||
                    location.hostname.includes('scratch.mit.edu');
  if (!onScratch) return false;
  
  const path = location.pathname;
  // Check for editor path patterns
  if (/\/projects\/[^\/]+\/editor\/?$/.test(path)) return true;
  if (/\/projects\/[^\/]+/.test(path)) return true; // Any project page
  if (path.includes('/editor')) return true;
  
  // Heuristic DOM checks - more comprehensive
  const hasStage = document.querySelector('.stage, [class*="stage-"], .stage-wrapper, canvas[class*="stage"], [aria-label*="Stage"], [aria-label*="stage"]');
  const hasBlockly = document.querySelector('.blocklyWorkspace, .blocklyFlyout, .blocklyToolboxDiv, .scratchCategoryMenuItem, .blocklyBlockCanvas');
  const hasCodeArea = document.querySelector('.gui, .blocks, .code');
  
  return !!(hasStage || hasBlockly || hasCodeArea);
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
          const url = chrome.runtime.getURL('data/selector-map.json');
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


