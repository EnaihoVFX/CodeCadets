// API configuration - Hardcoded API key for Scratch AI Assistant
const API_KEY = 'AIzaSyDcmb4l04vlgxKatscOHH9nMXXFMMK9wMY';

// Styles are now in popup-layout.css

const layoutMarkup = `
  <!-- Shop Button Bar with XP (always visible) -->
  <div class="shop-bar" id="shop-bar">
    <div class="shop-bar-content">
      <div class="xp-progress-container">
        <div class="xp-progress-bar">
          <div class="xp-progress-fill" id="xp-progress-fill"></div>
          <div class="xp-progress-text" id="xp-progress-text">0 / 100</div>
        </div>
      </div>
      <div class="profile-section" id="profile-section" title="View Profile">
        <img class="profile-avatar-icon" src="" alt="Profile" data-avatar style="display: none;">
      </div>
      <button class="shop-btn" id="shop-btn" title="Shop">
        <img src="${chrome.runtime.getURL('iconpack/Png/treasure_chest.png')}" alt="Shop" class="shop-btn-icon">
        <span class="shop-btn-label">Shop</span>
      </button>
    </div>
  </div>

  <div class="shell">
    <div class="div1">
      <div class="falling-icons-container"></div>
      <span class="tutorials-text">tutorials</span>
    </div>
    <div class="div2">
      <button class="achievement-btn" id="achievements-btn">
        <span>Achievements</span>
      </button>
    </div>
    <div class="div4">
      <img class="gear gear-1" src="${chrome.runtime.getURL('icons/gears/gear1.png')}" alt="Gear 1">
      <img class="robot" src="${chrome.runtime.getURL('images/mascot.png')}" alt="Robot">
      <span class="title">GAME <span class="maker">MAKER</span></span>
    </div>
  </div>
  
  <!-- Tutorials Page (hidden by default) -->
  <div class="tutorials-page" id="tutorials-page" style="display: none;">
    <div class="tutorials-header">
      <button class="back-btn" id="tutorials-back-btn">
        <span>← BACK</span>
      </button>
      <h2 class="tutorials-page-title">TUTORIALS</h2>
    </div>
    <div class="tutorials-grid" id="tutorials-grid">
      <!-- Tutorial cards will be generated here -->
    </div>
  </div>
  
  <!-- Mini Lessons Page (hidden by default) -->
  <div class="mini-lessons-page" id="mini-lessons-page" style="display: none;">
    <div class="mini-lessons-header">
      <button class="back-btn" id="mini-lessons-back-btn">
        <span>← BACK</span>
      </button>
      <h2 class="mini-lessons-title" id="mini-lessons-title">MINI LESSONS</h2>
    </div>
    <div class="mini-lessons-path-container">
      <div class="mini-lessons-path" id="mini-lessons-path">
        <!-- Mini lesson nodes will be generated here -->
      </div>
    </div>
  </div>
  
  <!-- Achievements View (hidden by default) -->
  <div class="achievements-page" id="achievements-page" style="display: none;">
    <div class="achievements-header">
      <button class="back-btn" id="achievements-back-btn">
        <span>← BACK</span>
      </button>
      <h2 class="achievements-page-title">ACHIEVEMENTS</h2>
    </div>
    <div class="achievements-list" id="achievements-list">
      <!-- Achievements will be loaded here -->
    </div>
  </div>
  
  <!-- Loading Indicator -->
  <div class="loading" id="loading" style="display: none;">
    <div class="spinner"></div>
    <p>LOADING...</p>
      </div>
    `;

document.head.replaceChildren();
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
document.head.appendChild(fontLink);

// Load the layout CSS file
const cssLink = document.createElement('link');
cssLink.rel = 'stylesheet';
cssLink.href = chrome.runtime.getURL('styles/popup-layout.css');
document.head.appendChild(cssLink);

document.body.innerHTML = layoutMarkup;

// XP State
let xpState = {
  xp: 0,
  level: 1,
  xpForNextLevel: 100
};

// Initialize database service
let dbInitialized = false;
async function initializeDatabase() {
  if (dbInitialized) return;
  
  try {
    await databaseService.initialize();
    dbInitialized = true;
    console.log('[Popup] Database service initialized');
  } catch (e) {
    console.error('[Popup] Failed to initialize database service:', e);
  }
}

// Load XP state from storage (user-specific)
async function loadXPState() {
  try {
    await initializeDatabase();
    
    const loadedState = await databaseService.loadXPState();
    if (loadedState) {
      xpState = { ...xpState, ...loadedState };
      // Ensure xpForNextLevel is set
      if (!xpState.xpForNextLevel) {
        xpState.xpForNextLevel = 100;
      }
      updateXPBar();
    }
    
    // Listen for storage changes to update XP bar when content.js updates XP
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName === 'local') {
        const userKey = databaseService.getUserKey('xpState');
        if (changes[userKey]) {
          const newState = changes[userKey].newValue;
          if (newState) {
            xpState = { ...xpState, ...newState };
            if (!xpState.xpForNextLevel) {
              xpState.xpForNextLevel = 100;
            }
            updateXPBar();
          }
        }
      }
    });
  } catch (e) {
    console.error('Error loading XP state:', e);
  }
}

// Save XP state (user-specific)
async function saveXPState() {
  try {
    await initializeDatabase();
    await databaseService.saveXPState(xpState);
  } catch (e) {
    console.error('Error saving XP state:', e);
  }
}

// Update XP bar display - uses same calculation as content.js
// Calculate XP required for a specific level (progressive scaling) - same as content.js
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

// Calculate current level based on total XP - same as content.js
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

function updateXPBar() {
  const progressFill = document.getElementById('xp-progress-fill');
  const progressText = document.getElementById('xp-progress-text');
  
  // Calculate XP using progressive system - same as content.js
  const xpForCurrentLevel = getXPForLevel(xpState.level);
  const xpForNextLevel = getXPForLevel(xpState.level + 1);
  const xpInCurrentLevel = xpState.xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeeded) * 100));
  
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }
  if (progressText) {
    progressText.textContent = `${xpInCurrentLevel} / ${xpNeeded}`;
  }
  
  // Store XP needed for next level
  xpState.xpForNextLevel = xpNeeded;
}

// Award XP - same calculation as content.js
function awardXP(amount) {
  xpState.xp += amount;
  const newLevel = calculateLevel(xpState.xp);
  if (newLevel > xpState.level) {
    xpState.level = newLevel;
  }
  updateXPBar();
  saveXPState();
}

// Tutorial data - using comprehensive structure from backup
const tutorialLessons = [
  { id: 1, title: "Tutorial Lesson 1", icon: "iconpack/Png/star.png", type: "tutorial", lessonNumber: 1 },
  { id: 2, title: "Tutorial Lesson 2", icon: "iconpack/Png/compass.png", type: "tutorial", lessonNumber: 2 }
];

const games = [
  { id: 3, title: "Platform Game", icon: "iconpack/Png/mountain_top.png", type: "game" },
  { id: 4, title: "Catch Game", icon: "iconpack/Png/coin.png", type: "game" },
  { id: 5, title: "Race Game", icon: "iconpack/Png/car.png", type: "game" },
  { id: 6, title: "Pong Game", icon: "iconpack/Png/balloon.png", type: "game" },
  { id: 7, title: "Snake Game", icon: "iconpack/Png/skull.png", type: "game" },
  { id: 8, title: "Maze Game", icon: "iconpack/Png/key.png", type: "game" },
  { id: 9, title: "Quiz Game", icon: "iconpack/Png/question_help.png", type: "game" },
  { id: 10, title: "Adventure Game", icon: "iconpack/Png/flag.png", type: "game" },
  { id: 11, title: "Puzzle Game", icon: "iconpack/Png/chest.png", type: "game" },
  { id: 12, title: "Shooter Game", icon: "iconpack/Png/fire.png", type: "game" }
];

// Mini lessons data for each main lesson/game
const miniLessonsData = {
  "Tutorial Lesson 1": [
    { 
      title: "Project Setup & Motion", 
      icon: "🚀", 
      stepRange: [1, 8],
      description: "Start your interactive game project! Set up the sprite and add movement controls using Motion blocks.",
      categories: ["Motion", "Events"],
      projectPart: "Create the main character sprite and add arrow key movement controls",
      buildsOn: null
    },
    { 
      title: "Visual Effects & Animation", 
      icon: "🎨", 
      stepRange: [9, 15],
      description: "Add visual flair! Use Looks blocks to create animations, costume changes, and visual feedback.",
      categories: ["Looks", "Control"],
      projectPart: "Add sprite animations, costume changes when moving, and visual effects",
      buildsOn: "Project Setup & Motion"
    },
    { 
      title: "Sound & Music System", 
      icon: "🔊", 
      stepRange: [16, 22],
      description: "Bring your project to life! Add background music, sound effects for actions, and audio feedback.",
      categories: ["Sound", "Events"],
      projectPart: "Add background music, movement sounds, and action sound effects",
      buildsOn: "Visual Effects & Animation"
    },
    { 
      title: "Interactive Events", 
      icon: "⚡", 
      stepRange: [23, 28],
      description: "Make it interactive! Add click events, key presses, and broadcast messages for sprite communication.",
      categories: ["Events", "Control"],
      projectPart: "Add click interactions, power-up collection, and sprite communication",
      buildsOn: "Sound & Music System"
    },
    { 
      title: "Game Logic & Control", 
      icon: "🔄", 
      stepRange: [29, 36],
      description: "Add game mechanics! Use Control blocks for game loops, conditions, and game state management.",
      categories: ["Control", "Operators"],
      projectPart: "Create game loop, add win/lose conditions, and implement game states",
      buildsOn: "Interactive Events"
    },
    { 
      title: "Collision & Detection", 
      icon: "👁️", 
      stepRange: [37, 44],
      description: "Detect interactions! Use Sensing blocks for collisions, boundaries, and user input detection.",
      categories: ["Sensing", "Control"],
      projectPart: "Add collision detection with obstacles, boundary checking, and item collection",
      buildsOn: "Game Logic & Control"
    },
    { 
      title: "Scoring & Calculations", 
      icon: "➕", 
      stepRange: [45, 52],
      description: "Add scoring! Use Operators for score calculations, random numbers, and game mechanics.",
      categories: ["Operators", "Variables"],
      projectPart: "Calculate scores, add random elements, and create dynamic game values",
      buildsOn: "Collision & Detection"
    },
    { 
      title: "Score System & Data", 
      icon: "📊", 
      stepRange: [53, 60],
      description: "Track progress! Create Variables for score, lives, level, and game statistics.",
      categories: ["Variables", "Control"],
      projectPart: "Create score variable, lives system, level tracking, and display game stats",
      buildsOn: "Scoring & Calculations"
    },
    { 
      title: "Polish & Complete", 
      icon: "🎮", 
      stepRange: [61, 70],
      description: "Finish your game! Add final touches, multiple levels, game over screen, and victory conditions.",
      categories: ["All Categories"],
      projectPart: "Add game over screen, victory screen, level progression, and final polish",
      buildsOn: "Score System & Data"
    }
  ],
  "Tutorial Lesson 2": [
    { title: "Advanced Motion", icon: "🌊", stepRange: null, description: "Advanced movement: smooth animations, physics simulation, and complex sprite behaviors.", categories: ["Motion", "Operators"] },
    { title: "Advanced Control", icon: "🧠", stepRange: null, description: "Complex logic: nested loops, multiple conditions, custom blocks, and program organization.", categories: ["Control", "Operators"] },
    { title: "Game Mechanics", icon: "🎯", stepRange: null, description: "Build game systems: scoring, lives, levels, win/lose conditions, and game state management.", categories: ["Variables", "Control", "Sensing"] },
    { title: "Multi-Sprite Projects", icon: "👥", stepRange: null, description: "Work with multiple sprites: sprite communication, cloning, sprite interactions, and scene management.", categories: ["Events", "Control", "Sensing"] },
    { title: "Final Project", icon: "🏆", stepRange: null, description: "Create a complete interactive project using all Scratch categories: a polished game or animation.", categories: ["All Categories"] }
  ],
  "Platform Game": [
    { title: "Create Player", icon: "👤", stepRange: null },
    { title: "Add Gravity", icon: "⬇️", stepRange: null },
    { title: "Build Platforms", icon: "🟦", stepRange: null },
    { title: "Jump Controls", icon: "⬆️", stepRange: null },
    { title: "Add Enemies", icon: "👾", stepRange: null },
    { title: "Scoring System", icon: "🏆", stepRange: null }
  ],
  "Catch Game": [
    { title: "Create Basket", icon: "🧺", stepRange: null },
    { title: "Falling Objects", icon: "🍎", stepRange: null },
    { title: "Catch Detection", icon: "✨", stepRange: null },
    { title: "Score & Lives", icon: "❤️", stepRange: null }
  ],
  "Race Game": [
    { title: "Race Car Setup", icon: "🏎️", stepRange: null },
    { title: "Track Design", icon: "🛣️", stepRange: null },
    { title: "Movement Controls", icon: "🎮", stepRange: null },
    { title: "Finish Line", icon: "🏁", stepRange: null }
  ],
  "Pong Game": [
    { title: "Create Paddles", icon: "🏓", stepRange: null },
    { title: "Ball Physics", icon: "⚪", stepRange: null },
    { title: "Bounce Detection", icon: "↔️", stepRange: null },
    { title: "Score Tracking", icon: "📊", stepRange: null }
  ],
  "Snake Game": [
    { title: "Snake Sprite", icon: "🐍", stepRange: null },
    { title: "Food Generation", icon: "🍎", stepRange: null },
    { title: "Growth & Movement", icon: "📏", stepRange: null },
    { title: "Collision Detection", icon: "💥", stepRange: null }
  ],
  "Maze Game": [
    { title: "Maze Design", icon: "🧩", stepRange: null },
    { title: "Player Movement", icon: "👤", stepRange: null },
    { title: "Wall Collisions", icon: "🧱", stepRange: null },
    { title: "Exit & Win", icon: "🚪", stepRange: null }
  ],
  "Quiz Game": [
    { title: "Question Setup", icon: "❓", stepRange: null },
    { title: "Answer Options", icon: "🔘", stepRange: null },
    { title: "Score System", icon: "⭐", stepRange: null },
    { title: "Results Screen", icon: "📊", stepRange: null }
  ],
  "Adventure Game": [
    { title: "Character Setup", icon: "🧙", stepRange: null },
    { title: "Multiple Scenes", icon: "🌍", stepRange: null },
    { title: "Inventory System", icon: "🎒", stepRange: null },
    { title: "Quest Objectives", icon: "📜", stepRange: null }
  ],
  "Puzzle Game": [
    { title: "Puzzle Pieces", icon: "🧩", stepRange: null },
    { title: "Drag & Drop", icon: "🖱️", stepRange: null },
    { title: "Match Detection", icon: "✅", stepRange: null },
    { title: "Level Progression", icon: "📈", stepRange: null }
  ],
  "Shooter Game": [
    { title: "Player Ship", icon: "🚀", stepRange: null },
    { title: "Enemy Spawning", icon: "👾", stepRange: null },
    { title: "Shooting Mechanics", icon: "💥", stepRange: null },
    { title: "Power-ups", icon: "⭐", stepRange: null }
  ]
};

// Create tutorial cards
function createTutorialCards() {
  const grid = document.getElementById('tutorials-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  // Add tutorial lessons first
  tutorialLessons.forEach((tutorial) => {
    const card = document.createElement('div');
    card.className = 'tutorial-card';
    card.dataset.id = tutorial.id;
    card.dataset.title = tutorial.title;
    card.dataset.type = tutorial.type;
    card.dataset.lessonNumber = tutorial.lessonNumber || '';
    
    const iconName = tutorial.icon.split('/').pop().replace('.png', '');
    card.innerHTML = `
      <img class="tutorial-card-icon" data-icon="${iconName}" src="${chrome.runtime.getURL(tutorial.icon)}" alt="${tutorial.title}">
      <div class="tutorial-card-title">${tutorial.title}</div>
    `;
    
    grid.appendChild(card);
  });
  
  // Then add games
  games.forEach((game) => {
    const card = document.createElement('div');
    card.className = 'tutorial-card';
    card.dataset.id = game.id;
    card.dataset.title = game.title;
    card.dataset.type = game.type;
    
    const iconName = game.icon.split('/').pop().replace('.png', '');
    card.innerHTML = `
      <img class="tutorial-card-icon" data-icon="${iconName}" src="${chrome.runtime.getURL(game.icon)}" alt="${game.title}">
      <div class="tutorial-card-title">${game.title}</div>
    `;
    
    grid.appendChild(card);
  });
}

// Show tutorials page
function showTutorialsPage() {
  const shell = document.querySelector('.shell');
  const tutorialsPage = document.getElementById('tutorials-page');
  const miniLessonsPage = document.getElementById('mini-lessons-page');
  const achievementsPage = document.getElementById('achievements-page');
  if (shell && tutorialsPage) {
    shell.style.display = 'none';
    tutorialsPage.style.display = 'block';
    if (miniLessonsPage) miniLessonsPage.style.display = 'none';
    if (achievementsPage) achievementsPage.style.display = 'none';
  }
}

// Hide tutorials page
function hideTutorialsPage() {
  const shell = document.querySelector('.shell');
  const tutorialsPage = document.getElementById('tutorials-page');
  if (shell && tutorialsPage) {
    shell.style.display = 'grid';
    tutorialsPage.style.display = 'none';
  }
}

// Show mini lessons page
async function showMiniLessonsPage(tutorialId) {
  const shell = document.querySelector('.shell');
  const tutorialsPage = document.getElementById('tutorials-page');
  const miniLessonsPage = document.getElementById('mini-lessons-page');
  const miniLessonsTitle = document.getElementById('mini-lessons-title');
  
  if (shell && miniLessonsPage) {
    shell.style.display = 'none';
    if (tutorialsPage) tutorialsPage.style.display = 'none';
    miniLessonsPage.style.display = 'block';
    
    // Find the tutorial/game
    const allItems = [...tutorialLessons, ...games];
    const item = allItems.find(t => t.id === tutorialId);
    if (!item) return;
    
    const mainLessonTitle = item.title;
    
    // Set title
    if (miniLessonsTitle) {
      miniLessonsTitle.textContent = mainLessonTitle.toUpperCase();
    }
    
    // Create mini lessons path with progress
    await createMiniLessonsPathWithProgress(mainLessonTitle, item.lessonNumber);
  }
}

// Hide mini lessons page
function hideMiniLessonsPage() {
  const shell = document.querySelector('.shell');
  const tutorialsPage = document.getElementById('tutorials-page');
  const miniLessonsPage = document.getElementById('mini-lessons-page');
  if (shell && miniLessonsPage) {
    miniLessonsPage.style.display = 'none';
    if (tutorialsPage) {
      tutorialsPage.style.display = 'block';
    } else {
      shell.style.display = 'grid';
    }
  }
}

// Create mini lessons path with progress tracking
async function createMiniLessonsPathWithProgress(mainLessonTitle, lessonNumber) {
  const path = document.getElementById('mini-lessons-path');
  if (!path) return;
  
  const lessons = miniLessonsData[mainLessonTitle] || [];
  if (lessons.length === 0) return;
  
  // Get completion data
  const completionKey = `completion_${mainLessonTitle.replace(/\s+/g, '_')}`;
  const completionData = await getCompletionData(completionKey);
  
  // Determine which lessons are completed, current, or locked
  let firstIncompleteIndex = -1;
  lessons.forEach((_, index) => {
    const miniLessonKey = `${completionKey}_${index}`;
    if (!completionData[miniLessonKey] && firstIncompleteIndex === -1) {
      firstIncompleteIndex = index;
    }
  });
  
  path.innerHTML = lessons.map((lesson, index) => {
    const miniLessonKey = `${completionKey}_${index}`;
    const isCompleted = completionData[miniLessonKey] || false;
    const isCurrent = index === firstIncompleteIndex;
    const isLocked = firstIncompleteIndex !== -1 && index > firstIncompleteIndex;
    
    const statusClass = isCompleted ? 'completed' : isCurrent ? 'current' : isLocked ? 'locked' : 'current';
    const canClick = !isLocked;
    
    const prevLesson = index > 0 ? lessons[index - 1] : null;
    const prevCompleted = index > 0 ? completionData[`${completionKey}_${index - 1}`] : false;
    
    return `
      ${index > 0 ? `<div class="mini-lesson-connector ${prevCompleted ? 'completed' : 'locked'}"></div>` : ''}
      <div class="mini-lesson-node ${statusClass}" data-lesson-id="${index}" data-main-title="${mainLessonTitle}" data-lesson-number="${lessonNumber || ''}" ${canClick ? 'style="cursor: pointer;"' : ''}>
        <div class="mini-lesson-circle">
          <div class="mini-lesson-icon">${lesson.icon}</div>
          ${isCompleted ? '<div class="mini-lesson-check">✓</div>' : ''}
          ${isLocked ? '<div class="mini-lesson-lock">🔒</div>' : ''}
        </div>
        <div class="mini-lesson-label">${lesson.title}</div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  path.querySelectorAll('.mini-lesson-node').forEach(node => {
    if (!node.classList.contains('locked')) {
      node.addEventListener('click', () => {
        const lessonId = parseInt(node.dataset.lessonId);
        const mainTitle = node.dataset.mainTitle;
        const lessonNum = node.dataset.lessonNumber ? parseInt(node.dataset.lessonNumber) : null;
        const lesson = lessons[lessonId];
        const miniLessonKey = `${completionKey}_${lessonId}`;
        startMiniLesson(mainTitle, lessonNum, lessonId, lesson, miniLessonKey);
      });
    }
  });
}

// Get completion data from storage (user-specific)
async function getCompletionData(key) {
  try {
    await initializeDatabase();
    return await databaseService.loadCompletionData(key);
  } catch (e) {
    console.error('Error loading completion data:', e);
    return {};
  }
}

// Save completion data to storage (user-specific)
async function saveCompletionData(key, data) {
  try {
    await initializeDatabase();
    await databaseService.saveCompletionData(key, data);
    console.log('Completion data saved:', key, data);
  } catch (e) {
    console.error('Error saving completion data:', e);
  }
}

// Save step progress for a mini-lesson
async function saveStepProgress(mainLessonTitle, miniLessonIndex, stepIndex, totalSteps) {
  const progressKey = `progress_${mainLessonTitle.replace(/\s+/g, '_')}`;
  const progressData = await getCompletionData(progressKey);
  
  const miniLessonProgressKey = `${progressKey}_${miniLessonIndex}`;
  if (!progressData[miniLessonProgressKey]) {
    progressData[miniLessonProgressKey] = { completedSteps: 0, totalSteps: totalSteps };
  }
  
  const currentProgress = progressData[miniLessonProgressKey];
  if (stepIndex + 1 > currentProgress.completedSteps) {
    currentProgress.completedSteps = stepIndex + 1;
    currentProgress.totalSteps = totalSteps;
    saveCompletionData(progressKey, progressData);
  }
  
  return progressData[miniLessonProgressKey];
}

// Get step progress for a mini-lesson
async function getStepProgress(mainLessonTitle, miniLessonIndex) {
  const progressKey = `progress_${mainLessonTitle.replace(/\s+/g, '_')}`;
  const progressData = await getCompletionData(progressKey);
  const miniLessonProgressKey = `${progressKey}_${miniLessonIndex}`;
  return progressData[miniLessonProgressKey] || { completedSteps: 0, totalSteps: 0 };
}

// Start a mini lesson
async function startMiniLesson(mainLessonTitle, lessonNumber, miniIndex, miniLesson, completionKey) {
  showLoading();
  
  try {
    let tutorialData = [];
    
    // Use pre-defined comprehensive tutorial data
    if (lessonNumber !== null && typeof COMPREHENSIVE_TUTORIAL_DATA !== 'undefined') {
      const lessonData = COMPREHENSIVE_TUTORIAL_DATA["Tutorial Lesson 1"];
      if (lessonData && lessonData[miniLesson.title]) {
        tutorialData = lessonData[miniLesson.title];
      } else if (typeof SCRATCH_TUTORIAL_STRUCTURE !== 'undefined') {
        const fullTutorialData = SCRATCH_TUTORIAL_STRUCTURE?.steps || [];
        if (miniLesson.stepRange) {
          tutorialData = fullTutorialData.slice(miniLesson.stepRange[0] - 1, miniLesson.stepRange[1]);
        } else {
          tutorialData = fullTutorialData.slice(0, 5);
        }
      }
    } else if (lessonNumber !== null && typeof SCRATCH_TUTORIAL_STRUCTURE !== 'undefined') {
      const fullTutorialData = SCRATCH_TUTORIAL_STRUCTURE?.steps || [];
      if (miniLesson.stepRange) {
        tutorialData = fullTutorialData.slice(miniLesson.stepRange[0] - 1, miniLesson.stepRange[1]);
      } else {
        const totalSteps = fullTutorialData.length;
        const midPoint = Math.ceil(totalSteps / 2);
        tutorialData = lessonNumber === 1 ? fullTutorialData.slice(0, midPoint) : fullTutorialData.slice(midPoint);
      }
    } else {
      // For games, generate tutorial using AI
      const systemInstruction = 'You are a friendly and patient Scratch programming tutor for children and beginners. Explain concepts clearly and simply.';
      const prompt = `Create a step-by-step tutorial for the "${miniLesson.title}" part of making a "${mainLessonTitle}" in Scratch. Make it beginner-friendly with clear instructions. Break it down into 3-5 steps. Return as a JSON array of step objects with title, description, and action fields.`;
      
      try {
        const gameTutorial = await callGeminiAPI(prompt, systemInstruction);
        // Parse the response (simplified - in production would need proper JSON parsing)
        alert(`🎮 ${miniLesson.title} Tutorial:\n\n${gameTutorial}`);
        hideLoading();
        
        // Mark as completed after showing
        const completionKeyFull = `completion_${mainLessonTitle.replace(/\s+/g, '_')}`;
        const completionData = await getCompletionData(completionKeyFull);
        completionData[completionKey] = true;
        saveCompletionData(completionKeyFull, completionData);
        
        // Refresh mini lessons view
        const allItems = [...tutorialLessons, ...games];
        const item = allItems.find(t => t.title === mainLessonTitle);
        if (item) {
          showMiniLessonsPage(item.id);
        }
        return;
      } catch (error) {
        alert(`Error generating tutorial: ${error.message}`);
        hideLoading();
        return;
      }
    }
    
    // Send tutorial data to Scratch
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.url) {
        alert('⚠️ Please navigate to scratch.mit.edu and try again!');
        hideLoading();
        return;
      }
      
      const isScratchDomain = tab.url.includes('scratch.mit.edu') || tab.url.includes('projects.scratch.mit.edu');
      if (!isScratchDomain) {
        alert('⚠️ Please navigate to scratch.mit.edu and open a project, then try again!');
        hideLoading();
        return;
      }

      const onSuccess = () => {
        hideLoading();
        
        const totalSteps = tutorialData.length;
        saveStepProgress(mainLessonTitle, miniIndex, 0, totalSteps);
        
        // Set up listener for step progress updates
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          const progressListener = (message, sender, sendResponse) => {
            if (message.action === 'stepProgress' && 
                message.mainLessonTitle === mainLessonTitle && 
                message.miniLessonIndex === miniIndex) {
              saveStepProgress(mainLessonTitle, miniIndex, message.stepIndex, message.totalSteps).then(() => {
                const allItems = [...tutorialLessons, ...games];
                const item = allItems.find(t => t.title === mainLessonTitle);
                if (item) {
                  showMiniLessonsPage(item.id);
                }
              });
            }
          };
          
          chrome.runtime.onMessage.addListener(progressListener);
        }
        
        window.close();
      };
      
      const onFail = () => {
        alert('⚠️ Please open a Scratch project and try again!');
        hideLoading();
      };

      const injectScripts = async () => {
        try {
          if (chrome.scripting && chrome.scripting.executeScript) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id, allFrames: true },
              files: ['selector-map.js', 'content.js']
            });
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (e) {
          console.log('Scripts may already be injected:', e.message);
        }
      };

      injectScripts().then(() => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'startTutorial', 
          tutorialData,
          mainLessonTitle: mainLessonTitle,
          miniLessonIndex: miniIndex
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError.message);
          }
          
          if (response && response.success) {
            return onSuccess();
          }

          if (!chrome.runtime.lastError && isScratchDomain) {
            setTimeout(() => onSuccess(), 500);
            return;
          }

          if (!chrome.webNavigation || !chrome.webNavigation.getAllFrames) {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'startTutorial', 
              tutorialData,
              mainLessonTitle: mainLessonTitle,
              miniLessonIndex: miniIndex
            }, { frameId: 0 }, (resp) => {
              if (chrome.runtime.lastError && isScratchDomain) {
                setTimeout(() => onSuccess(), 500);
                return;
              }
              if (resp && resp.success) {
                return onSuccess();
              }
              if (isScratchDomain) {
                setTimeout(() => onSuccess(), 500);
                return;
              }
              return onFail();
            });
            return;
          }
          
          chrome.webNavigation.getAllFrames({ tabId: tab.id }, (frames) => {
            if (chrome.runtime.lastError || !frames || !frames.length) {
              return onFail();
            }
            
            let pending = frames.length;
            let done = false;
            frames.forEach((f) => {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'startTutorial', 
                tutorialData,
                mainLessonTitle: mainLessonTitle,
                miniLessonIndex: miniIndex
              }, { frameId: f.frameId }, (resp) => {
                if (chrome.runtime.lastError) {
                  console.error(`Frame ${f.frameId} error:`, chrome.runtime.lastError.message);
                }
                pending--;
                if (!done && resp && resp.success) {
                  done = true;
                  onSuccess();
                }
                if (pending === 0 && !done) {
                  onFail();
                }
              });
            });
          });
        });
      }).catch((err) => {
        console.error('Error injecting scripts:', err);
        chrome.tabs.sendMessage(tab.id, { 
          action: 'startTutorial', 
          tutorialData,
          mainLessonTitle: mainLessonTitle,
          miniLessonIndex: miniIndex
        }, (response) => {
          if (response && response.success) {
            return onSuccess();
          }
          onFail();
        });
      });
    });
  } catch (error) {
    alert(`Error: ${error.message}`);
    hideLoading();
  }
}

// Show/hide loading
function showLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

// API call function
async function callGeminiAPI(prompt, systemInstruction = '') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;
  
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{
        text: systemInstruction
      }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Achievements functions (user-specific)
async function loadAchievements() {
  try {
    await initializeDatabase();
    const achievements = await databaseService.loadAchievements();
    displayAchievements(achievements);
  } catch (e) {
    console.error('Error loading achievements:', e);
    displayAchievements({});
  }
}

function displayAchievements(achievements) {
  const achievementsList = document.getElementById('achievements-list');
  if (!achievementsList) return;
  
  achievementsList.innerHTML = '';
  
  // Comprehensive achievement data with categories
  const achievementData = {
    // Tutorial Achievements
    'tutorial_completed': {
      title: 'Tutorial Master',
      description: 'Completed the full Scratch tutorial!',
      icon: '🎓',
      category: 'tutorials',
      rarity: 'epic'
    },
    'tutorial_perfect': {
      title: 'Perfect Student',
      description: 'Completed a tutorial with 3 stars!',
      icon: '⭐',
      category: 'tutorials',
      rarity: 'rare'
    },
    'tutorial_lesson_1': {
      title: 'First Steps',
      description: 'Completed Tutorial Lesson 1!',
      icon: '👣',
      category: 'tutorials',
      rarity: 'common'
    },
    'tutorial_lesson_2': {
      title: 'Advanced Learner',
      description: 'Completed Tutorial Lesson 2!',
      icon: '🚀',
      category: 'tutorials',
      rarity: 'rare'
    },
    'mini_lesson_complete': {
      title: 'Mini Master',
      description: 'Completed 5 mini lessons!',
      icon: '📚',
      category: 'tutorials',
      rarity: 'common'
    },
    'all_mini_lessons': {
      title: 'Completionist',
      description: 'Completed all mini lessons!',
      icon: '🏆',
      category: 'tutorials',
      rarity: 'epic'
    },
    
    // XP Achievements
    'xp_100': {
      title: 'Getting Started',
      description: 'Earned 100 XP!',
      icon: '💎',
      category: 'xp',
      rarity: 'common'
    },
    'xp_500': {
      title: 'Rising Star',
      description: 'Earned 500 XP!',
      icon: '🌟',
      category: 'xp',
      rarity: 'common'
    },
    'xp_1000': {
      title: 'XP Collector',
      description: 'Earned 1,000 XP!',
      icon: '💫',
      category: 'xp',
      rarity: 'rare'
    },
    'xp_2500': {
      title: 'XP Master',
      description: 'Earned 2,500 XP!',
      icon: '✨',
      category: 'xp',
      rarity: 'rare'
    },
    'xp_5000': {
      title: 'XP Legend',
      description: 'Earned 5,000 XP!',
      icon: '👑',
      category: 'xp',
      rarity: 'epic'
    },
    'level_5': {
      title: 'Level Up!',
      description: 'Reached Level 5!',
      icon: '⬆️',
      category: 'xp',
      rarity: 'common'
    },
    'level_10': {
      title: 'Double Digits',
      description: 'Reached Level 10!',
      icon: '🔟',
      category: 'xp',
      rarity: 'rare'
    },
    'level_20': {
      title: 'Level Master',
      description: 'Reached Level 20!',
      icon: '🎯',
      category: 'xp',
      rarity: 'epic'
    },
    
    // Performance Achievements
    'no_hints': {
      title: 'Independent',
      description: 'Completed a tutorial without hints!',
      icon: '🧠',
      category: 'performance',
      rarity: 'rare'
    },
    'perfect_run': {
      title: 'Flawless',
      description: 'Perfect 3-star run on any tutorial!',
      icon: '💯',
      category: 'performance',
      rarity: 'epic'
    },
    'speed_demon': {
      title: 'Speed Demon',
      description: 'Completed tutorial in record time!',
      icon: '⚡',
      category: 'performance',
      rarity: 'rare'
    },
    'first_try': {
      title: 'First Try',
      description: 'Completed tutorial on first attempt!',
      icon: '🎯',
      category: 'performance',
      rarity: 'rare'
    },
    
    // Streak Achievements
    'streak_3': {
      title: 'On Fire',
      description: '3 day learning streak!',
      icon: '🔥',
      category: 'streaks',
      rarity: 'common'
    },
    'streak_7': {
      title: 'Week Warrior',
      description: '7 day learning streak!',
      icon: '📅',
      category: 'streaks',
      rarity: 'rare'
    },
    'streak_30': {
      title: 'Monthly Master',
      description: '30 day learning streak!',
      icon: '📆',
      category: 'streaks',
      rarity: 'epic'
    },
    
    // Special Achievements
    'early_bird': {
      title: 'Early Bird',
      description: 'Completed tutorial before 9 AM!',
      icon: '🌅',
      category: 'special',
      rarity: 'common'
    },
    'night_owl': {
      title: 'Night Owl',
      description: 'Completed tutorial after 9 PM!',
      icon: '🦉',
      category: 'special',
      rarity: 'common'
    },
    'weekend_warrior': {
      title: 'Weekend Warrior',
      description: 'Completed tutorial on weekend!',
      icon: '🎮',
      category: 'special',
      rarity: 'common'
    },
    'dedicated': {
      title: 'Dedicated',
      description: 'Completed 10 tutorials total!',
      icon: '💪',
      category: 'special',
      rarity: 'rare'
    },
    'explorer': {
      title: 'Explorer',
      description: 'Tried all tutorial categories!',
      icon: '🗺️',
      category: 'special',
      rarity: 'rare'
    }
  };
  
  // Get all achievement keys (both earned and available)
  const allAchievementKeys = Object.keys(achievementData);
  const earnedKeys = Object.keys(achievements);
  
  achievementsList.innerHTML = '';
  
  // Create category filter buttons
  const categories = ['all', 'tutorials', 'xp', 'performance', 'streaks', 'special'];
  const categoryHTML = `
    <div class="achievement-categories">
      ${categories.map(cat => `
        <button class="category-btn ${cat === 'all' ? 'active' : ''}" data-category="${cat}">
          ${cat.charAt(0).toUpperCase() + cat.slice(1)}
      </button>
      `).join('')}
    </div>
  `;
  achievementsList.innerHTML += categoryHTML;
  
  // Create achievements grid
  const gridHTML = '<div class="achievements-grid" id="achievements-grid"></div>';
  achievementsList.innerHTML += gridHTML;
  
  const grid = document.getElementById('achievements-grid');
  let currentCategory = 'all';
  
  function renderAchievements(category = 'all') {
    grid.innerHTML = '';
    const filteredKeys = category === 'all' 
      ? allAchievementKeys 
      : allAchievementKeys.filter(key => achievementData[key].category === category);
    
    filteredKeys.forEach((key, index) => {
      const achievement = achievements[key];
      const data = achievementData[key];
      const isEarned = !!achievement;
      
      const card = document.createElement('div');
      card.className = `achievement-card ${isEarned ? 'earned' : 'locked'} ${data.rarity}`;
      card.style.animationDelay = `${index * 0.05}s`;
      card.dataset.key = key;
      
      if (isEarned) {
        const date = new Date(achievement.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        
        card.innerHTML = `
          <div class="achievement-icon">${data.icon}</div>
          <div class="achievement-title">${data.title}</div>
          <div class="achievement-description">${data.description}</div>
          <div class="achievement-stars">
            ${Array(achievement.stars || 3).fill(0).map((_, i) => 
              `<div class="achievement-star" style="animation-delay: ${i * 0.2}s">⭐</div>`
            ).join('')}
    </div>
          <div class="achievement-date">🏅 ${date}</div>
        `;
      } else {
        card.innerHTML = `
          <div class="achievement-icon locked-icon">${data.icon}</div>
          <div class="achievement-title">${data.title}</div>
          <div class="achievement-description">${data.description}</div>
          <div class="achievement-locked">🔒 Locked</div>
        `;
      }
      
      grid.appendChild(card);
    });
  }
  
  // Category filter functionality
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderAchievements(currentCategory);
    });
  });
  
  // Initial render
  renderAchievements();
  
  if (earnedKeys.length === 0 && allAchievementKeys.length > 0) {
    grid.innerHTML = `
      <div class="no-achievements">
        <div class="no-achievements-icon">🏆</div>
        <div class="no-achievements-title">No Achievements Yet!</div>
        <div class="no-achievements-text">
          Complete tutorials and earn XP to unlock amazing achievements!<br>
          Each achievement earns you up to 3 stars! ⭐⭐⭐
        </div>
      </div>
    `;
  }
}

function showAchievements() {
  const shell = document.querySelector('.shell');
  const tutorialsPage = document.getElementById('tutorials-page');
  const miniLessonsPage = document.getElementById('mini-lessons-page');
  const achievementsPage = document.getElementById('achievements-page');
  
  if (shell && achievementsPage) {
    shell.style.display = 'none';
    if (tutorialsPage) tutorialsPage.style.display = 'none';
    if (miniLessonsPage) miniLessonsPage.style.display = 'none';
    achievementsPage.style.display = 'block';
    loadAchievements();
  }
}

function hideAchievements() {
  const shell = document.querySelector('.shell');
  const achievementsPage = document.getElementById('achievements-page');
  if (shell && achievementsPage) {
    achievementsPage.style.display = 'none';
    shell.style.display = 'grid';
  }
}

// Create ping-pong GIF effect
const div1 = document.querySelector('.div1');
if (div1) {
  const style = document.createElement('style');
  style.textContent = `
    .div1::before {
      display: none;
    }
  `;
  document.head.appendChild(style);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
    z-index: -1;
    pointer-events: none;
    object-fit: cover;
  `;
  div1.appendChild(canvas);
  
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.15);
    z-index: -1;
    pointer-events: none;
  `;
  div1.appendChild(overlay);
  
  const gifImg = new Image();
  gifImg.src = 'icons/image/sky.gif';
  
  gifImg.onload = () => {
    canvas.width = div1.offsetWidth;
    canvas.height = div1.offsetHeight;
    
    const scale = 2;
    
    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      ctx.drawImage(gifImg, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      
      requestAnimationFrame(drawFrame);
    };
    
    drawFrame();
  };
}

// Falling icons for tutorial div
function createFallingIcons() {
  const container = document.querySelector('.falling-icons-container');
  if (!container) return;
  
  const icons = [
    'iconpack/Png/star.png',
    'iconpack/Png/coin.png',
    'iconpack/Png/lightning.png',
    'iconpack/Png/crown.png',
    'iconpack/Png/medal.png',
    'iconpack/Png/compass.png',
    'iconpack/Png/key.png',
    'iconpack/Png/chest.png',
    'iconpack/Png/emerald.png',
    'iconpack/Png/ruby.png',
    'iconpack/Png/shield.png',
    'iconpack/Png/victory.png',
    'iconpack/Png/clock.png',
    'iconpack/Png/treasure_chest.png',
    'iconpack/Png/golden_cup.png',
    'iconpack/Png/heart.png',
    'iconpack/Png/fire.png',
    'iconpack/Png/balloon.png',
    'iconpack/Png/cloud.png',
    'iconpack/Png/flag.png',
    'iconpack/Png/envelope.png',
    'iconpack/Png/bell.png',
    'iconpack/Png/smartphone.png',
    'iconpack/Png/display.png',
    'iconpack/Png/car.png',
    'iconpack/Png/plane.png',
    'iconpack/Png/tree.png',
    'iconpack/Png/skull.png',
    'iconpack/Png/sunglasses.png',
    'iconpack/Png/magnet.png',
    'iconpack/Png/safe.png',
    'iconpack/Png/kings_hat.png',
    'iconpack/Png/apple.png',
    'iconpack/Png/cake.png',
    'iconpack/Png/pizza.png',
    'iconpack/Png/burger.png',
    'iconpack/Png/ice_cream.png',
    'iconpack/Png/cup.png',
    'iconpack/Png/tea.png',
    'iconpack/Png/honey.png',
    'iconpack/Png/lemonade.png'
  ];
  
  function createIcon() {
    const icon = document.createElement('img');
    icon.className = 'falling-icon';
    const iconPath = icons[Math.floor(Math.random() * icons.length)];
    icon.src = chrome.runtime.getURL(iconPath);
    icon.alt = '';
    
    // Get container dimensions for proper calculation
    const containerHeight = container.offsetHeight || 300;
    const containerWidth = container.offsetWidth || 200;
    
    // Random size variation (small, medium, large)
    const sizeVariation = Math.random();
    let size, sizeClass;
    if (sizeVariation < 0.3) {
      size = 24 + Math.random() * 8; // Small: 24-32px
      sizeClass = 'small';
    } else if (sizeVariation < 0.7) {
      size = 32 + Math.random() * 8; // Medium: 32-40px
      sizeClass = 'medium';
    } else {
      size = 40 + Math.random() * 12; // Large: 40-52px
      sizeClass = 'large';
    }
    
    const startX = Math.random() * (containerWidth - size);
    const duration = 3 + Math.random() * 4; // 3-7 seconds (more variation)
    
    // Random horizontal drift
    const driftAmount = (Math.random() - 0.5) * 40; // -20px to +20px
    const rotationSpeed = 360 + (Math.random() - 0.5) * 180; // 270-450 degrees
    
    icon.style.left = `${startX}px`;
    icon.style.top = `-${size}px`;
    icon.style.width = `${size}px`;
    icon.style.height = `${size}px`;
    icon.style.animationDuration = `${duration}s`;
    icon.style.animationDelay = '0s';
    icon.style.setProperty('--fall-distance', `${containerHeight + size}px`);
    icon.style.setProperty('--drift-amount', `${driftAmount}px`);
    icon.style.setProperty('--rotation', `${rotationSpeed}deg`);
    icon.dataset.size = sizeClass;
    
    container.appendChild(icon);
    
    // Remove icon after animation completes
    setTimeout(() => {
      if (icon.parentNode) {
        icon.remove();
      }
    }, duration * 1000);
  }
  
  // Wait for container to be sized, then create icons
  setTimeout(() => {
    // Create initial icons
    for (let i = 0; i < 5; i++) {
      setTimeout(() => createIcon(), i * 300);
    }
    
    // Continuously create new icons
    setInterval(() => {
      if (container.children.length < 8) {
        createIcon();
      }
    }, 1000);
  }, 200);
}

// Initialize after DOM is ready
setTimeout(async () => {
  // Initialize database service (will check for Supabase config)
  await initializeDatabase();
  
  loadXPState();
  updateXPBar();
  createTutorialCards();
  loadAchievements();
  createFallingIcons();
  
  // Check if we should navigate to tutorials page (from overlay button or URL parameter)
  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get('page');
  
  chrome.storage.local.get(['popupNavigateTo', 'popupMainLessonTitle'], (result) => {
    if (result.popupNavigateTo === 'tutorials' || pageParam === 'tutorials') {
      showTutorialsPage();
      // Clear the navigation flag
      chrome.storage.local.remove(['popupNavigateTo', 'popupMainLessonTitle']);
    } else if (result.popupNavigateTo === 'mini-lessons' && result.popupMainLessonTitle) {
      // Find the tutorial ID from the mainLessonTitle
      // Wait a bit for tutorialLessons and games to be loaded
      setTimeout(() => {
        const allItems = [...(tutorialLessons || []), ...(games || [])];
        const item = allItems.find(t => t.title === result.popupMainLessonTitle);
        if (item) {
          showMiniLessonsPage(item.id);
        } else {
          // Fallback to tutorials page if tutorial not found
          showTutorialsPage();
        }
        // Clear the navigation flags
        chrome.storage.local.remove(['popupNavigateTo', 'popupMainLessonTitle']);
      }, 100);
    }
  });
  
  // Tutorials button click
  const tutorialsBtn = document.querySelector('.tutorials-text');
  if (tutorialsBtn) {
    tutorialsBtn.addEventListener('click', showTutorialsPage);
  }
  
  // Achievements button click
  const achievementsBtn = document.getElementById('achievements-btn');
  if (achievementsBtn) {
    achievementsBtn.addEventListener('click', showAchievements);
  }
  
  // Shop button click
  const shopBtn = document.getElementById('shop-btn');
  if (shopBtn) {
    shopBtn.addEventListener('click', () => {
      // TODO: Implement shop functionality
      alert('Shop coming soon! 🛒');
    });
  }
  
  // Profile section click - open profile page
  const profileSection = document.getElementById('profile-section');
  if (profileSection) {
    profileSection.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const profileUrl = chrome.runtime.getURL('pages/profile.html');
        chrome.tabs.create({ url: profileUrl });
      }
    });
    
    // Load avatar for profile icon (after a delay to ensure avatar-utils is loaded)
    setTimeout(async () => {
      const profileIcon = profileSection.querySelector('.profile-avatar-icon');
      if (profileIcon) {
        if (typeof updateAvatarImage !== 'undefined') {
          await updateAvatarImage(profileIcon);
          // Show icon if avatar loaded successfully
          if (profileIcon.src && !profileIcon.src.includes('robot.png') && profileIcon.src !== '') {
            profileIcon.style.display = 'block';
          }
        } else {
          // Fallback: load directly
          try {
            await initializeDatabase();
            const avatarKey = databaseService.getUserKey('avatarImage');
            const result = await chrome.storage.local.get([avatarKey]);
            if (result[avatarKey] && !result[avatarKey].includes('robot.png')) {
              profileIcon.src = result[avatarKey];
              profileIcon.style.display = 'block';
            }
          } catch (e) {
            console.error('[Popup] Error loading avatar:', e);
          }
        }
      }
    }, 300);
    
    // Load avatar for profile icon (after a delay to ensure avatar-utils is loaded)
    setTimeout(async () => {
      const profileIcon = profileSection.querySelector('.profile-avatar-icon');
      if (profileIcon) {
        if (typeof updateAvatarImage !== 'undefined') {
          await updateAvatarImage(profileIcon);
          // Show icon if avatar loaded successfully (not robot)
          if (profileIcon.src && !profileIcon.src.includes('robot.png') && profileIcon.src !== '') {
            profileIcon.style.display = 'block';
          }
        } else {
          // Fallback: load directly
          try {
            await initializeDatabase();
            const avatarKey = databaseService.getUserKey('avatarImage');
            const result = await chrome.storage.local.get([avatarKey]);
            if (result[avatarKey] && !result[avatarKey].includes('robot.png')) {
              profileIcon.src = result[avatarKey];
              profileIcon.style.display = 'block';
            }
          } catch (e) {
            console.error('[Popup] Error loading avatar:', e);
          }
        }
      }
    }, 300);
  }
  
  // Logo click - open Cadet Hub
  const logoImg = document.getElementById('logo-img');
  if (logoImg) {
    logoImg.src = chrome.runtime.getURL('images/logo.png');
    logoImg.style.cursor = 'pointer';
    logoImg.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: 'https://code-cadets.getlearnworlds.com/' });
      }
    });
  }
  
  // Back button clicks
  const tutorialsBackBtn = document.getElementById('tutorials-back-btn');
  if (tutorialsBackBtn) {
    tutorialsBackBtn.addEventListener('click', hideTutorialsPage);
  }
  
  const miniLessonsBackBtn = document.getElementById('mini-lessons-back-btn');
  if (miniLessonsBackBtn) {
    miniLessonsBackBtn.addEventListener('click', hideMiniLessonsPage);
  }
  
  const achievementsBackBtn = document.getElementById('achievements-back-btn');
  if (achievementsBackBtn) {
    achievementsBackBtn.addEventListener('click', hideAchievements);
  }
  
  // Tutorial card clicks - show mini lessons
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.tutorial-card');
    if (card) {
      const tutorialId = parseInt(card.dataset.id);
      showMiniLessonsPage(tutorialId);
    }
  });
  
  
  // Listen for messages to start next mini lesson
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'startNextMiniLesson') {
        const { mainLessonTitle, currentMiniLessonIndex } = request;
        const miniLessons = miniLessonsData[mainLessonTitle] || [];
        const nextIndex = currentMiniLessonIndex + 1;
        
        if (nextIndex < miniLessons.length) {
          const nextMiniLesson = miniLessons[nextIndex];
          const completionKey = `completion_${mainLessonTitle.replace(/\s+/g, '_')}`;
          const miniLessonKey = `${completionKey}_${nextIndex}`;
          
          let lessonNumber = null;
          if (mainLessonTitle === "Tutorial Lesson 1") {
            lessonNumber = 1;
          } else if (mainLessonTitle === "Tutorial Lesson 2") {
            lessonNumber = 2;
          }
          
          startMiniLesson(mainLessonTitle, lessonNumber, nextIndex, nextMiniLesson, miniLessonKey);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, reason: 'no_more_lessons' });
        }
        return true;
      }
    });
  }
}, 100);
