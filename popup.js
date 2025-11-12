// API configuration - Hardcoded API key for Scratch AI Assistant
const API_KEY = 'AIzaSyDcmb4l04vlgxKatscOHH9nMXXFMMK9wMY';

// Styles are now in popup-layout.css

const layoutMarkup = `
  <!-- XP Bar (always visible) -->
  <div class="xp-bar" id="xp-bar">
    <div class="xp-bar-content">
      <div class="xp-info">
        <span class="xp-label">XP</span>
        <span class="xp-value" id="xp-value">0</span>
      </div>
      <div class="xp-progress-container">
        <div class="xp-progress-bar">
          <div class="xp-progress-fill" id="xp-progress-fill"></div>
        </div>
        <div class="xp-progress-text" id="xp-progress-text">0 / 100</div>
      </div>
      <div class="xp-level">
        <span class="level-label">LVL</span>
        <span class="level-value" id="level-value">1</span>
      </div>
    </div>
  </div>

  <div class="shell">
    <div class="div1">
      <span class="tutorials-text">tutorials</span>
    </div>
    <div class="div2">
      <button class="achievement-btn" id="achievements-btn">
        <span>Achievements</span>
      </button>
    </div>
    <div class="div4">
      <img class="gear gear-1" src="icons/gears/gear1.png" alt="Gear 1">
      <img class="robot" src="mascot.png" alt="Robot">
      <span class="title">GAME <span class="maker">MAKER</span></span>
    </div>
    <div class="div5">
      <div class="getting-started-content">
        <span class="getting-started-text">Getting Started</span>
        <div class="getting-started-subtitle">Begin your journey</div>
      </div>
    </div>
    <div class="div6">Content area</div>
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
cssLink.href = 'popup-layout.css';
document.head.appendChild(cssLink);

document.body.innerHTML = layoutMarkup;

// XP State
let xpState = {
  xp: 0,
  level: 1,
  xpForNextLevel: 100
};

// Load XP state from storage
function loadXPState() {
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['xpState'], (result) => {
        if (result.xpState) {
          xpState = { ...xpState, ...result.xpState };
          updateXPBar();
        }
      });
    }
  } catch (e) {
    console.error('Error loading XP state:', e);
  }
}

// Save XP state
function saveXPState() {
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ xpState });
    }
  } catch (e) {
    console.error('Error saving XP state:', e);
  }
}

// Update XP bar display
function updateXPBar() {
  const xpValue = document.getElementById('xp-value');
  const levelValue = document.getElementById('level-value');
  const progressFill = document.getElementById('xp-progress-fill');
  const progressText = document.getElementById('xp-progress-text');
  
  if (xpValue) xpValue.textContent = xpState.xp;
  if (levelValue) levelValue.textContent = xpState.level;
  
  const xpInCurrentLevel = xpState.xp % xpState.xpForNextLevel;
  const progressPercent = (xpInCurrentLevel / xpState.xpForNextLevel) * 100;
  
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }
  if (progressText) {
    progressText.textContent = `${xpInCurrentLevel} / ${xpState.xpForNextLevel}`;
  }
}

// Award XP
function awardXP(amount) {
  xpState.xp += amount;
  const newLevel = Math.floor(xpState.xp / 100) + 1;
  if (newLevel > xpState.level) {
    xpState.level = newLevel;
  }
  updateXPBar();
  saveXPState();
}

// Tutorial data - using comprehensive structure from backup
const tutorialLessons = [
  { id: 1, title: "Tutorial Lesson 1", icon: "📚", type: "tutorial", lessonNumber: 1 },
  { id: 2, title: "Tutorial Lesson 2", icon: "📖", type: "tutorial", lessonNumber: 2 }
];

const games = [
  { id: 3, title: "Platform Game", icon: "🕹️", type: "game" },
  { id: 4, title: "Catch Game", icon: "🎯", type: "game" },
  { id: 5, title: "Race Game", icon: "🏎️", type: "game" },
  { id: 6, title: "Pong Game", icon: "🏓", type: "game" },
  { id: 7, title: "Snake Game", icon: "🐍", type: "game" },
  { id: 8, title: "Maze Game", icon: "🧩", type: "game" },
  { id: 9, title: "Quiz Game", icon: "❓", type: "game" },
  { id: 10, title: "Adventure Game", icon: "🗺️", type: "game" },
  { id: 11, title: "Puzzle Game", icon: "🧩", type: "game" },
  { id: 12, title: "Shooter Game", icon: "🎮", type: "game" }
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
    
    card.innerHTML = `
      <div class="tutorial-card-icon">${tutorial.icon}</div>
      <div class="tutorial-card-title">${tutorial.title}</div>
      <div class="tutorial-card-description">${tutorial.type === 'tutorial' ? 'Learn Scratch step by step' : 'Build a complete game'}</div>
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
    
    card.innerHTML = `
      <div class="tutorial-card-icon">${game.icon}</div>
      <div class="tutorial-card-title">${game.title}</div>
      <div class="tutorial-card-description">Build a complete game</div>
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

// Get completion data from storage
function getCompletionData(key) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || {});
      });
    } else {
      resolve({});
    }
  });
}

// Save completion data to storage
function saveCompletionData(key, data) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ [key]: data }, () => {
      console.log('Completion data saved:', key, data);
    });
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

// Achievements functions
function loadAchievements() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['achievements'], (result) => {
      const achievements = result.achievements || {};
      displayAchievements(achievements);
    });
  } else {
    displayAchievements({});
  }
}

function displayAchievements(achievements) {
  const achievementsList = document.getElementById('achievements-list');
  if (!achievementsList) return;
  
  achievementsList.innerHTML = '';
  
  const achievementData = {
    'tutorial_completed': {
      title: 'Tutorial Master',
      description: 'You completed the full Scratch tutorial!',
      icon: '🎓'
    }
  };
  
  const achievementKeys = Object.keys(achievements);
  const totalAchievements = achievementKeys.length;
  const totalStars = achievementKeys.reduce((sum, key) => {
    return sum + (achievements[key].stars || 3);
  }, 0);
  
  const statsHTML = `
    <div class="achievements-stats">
      <div class="stat-box">
        <div class="stat-value">${totalAchievements}</div>
        <div class="stat-label">Achievements</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${totalStars}</div>
        <div class="stat-label">Total Stars</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${totalAchievements > 0 ? Math.round(totalStars / totalAchievements * 10) / 10 : 0}</div>
        <div class="stat-label">Avg Stars</div>
      </div>
    </div>
  `;
  
  achievementsList.innerHTML = statsHTML;
  
  if (achievementKeys.length === 0) {
    achievementsList.innerHTML += `
      <div class="no-achievements">
        <div class="no-achievements-icon">🏆</div>
        <div class="no-achievements-title">No Achievements Yet!</div>
        <div class="no-achievements-text">
          Complete tutorials to unlock amazing achievements!<br>
          Each achievement earns you up to 3 stars! ⭐⭐⭐
        </div>
      </div>
    `;
    return;
  }
  
  achievementKeys.forEach((key, index) => {
    const achievement = achievements[key];
    const data = achievementData[key] || {
      title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'Great job completing this challenge!',
      icon: '🎯'
    };
    
    const card = document.createElement('div');
    card.className = 'achievement-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
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
          `<div class="achievement-star" style="animation-delay: ${i * 0.3}s">⭐</div>`
        ).join('')}
      </div>
      <div class="achievement-date">🏅 Earned on ${date}</div>
    `;
    
    achievementsList.appendChild(card);
  });
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

// Initialize after DOM is ready
setTimeout(() => {
  loadXPState();
  updateXPBar();
  createTutorialCards();
  loadAchievements();
  
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
  
  // Getting Started button
  const gettingStartedBtn = document.querySelector('.getting-started-content');
  if (gettingStartedBtn) {
    gettingStartedBtn.addEventListener('click', async () => {
      showLoading();
      try {
        const systemInstruction = 'You are a friendly and patient Scratch programming tutor for children and beginners. Explain concepts clearly and simply.';
        const prompt = `Give a comprehensive but friendly introduction to Scratch programming. Include:
1. What Scratch is
2. Why it's great for learning programming
3. Key concepts: sprites, blocks, scripts, backdrop, etc.
4. How to get started
5. What you can create with Scratch

Make it engaging and exciting, as if you're talking to a curious beginner!`;
        
        const introduction = await callGeminiAPI(prompt, systemInstruction);
        alert(introduction);
      } catch (error) {
        alert(`Error: ${error.message}`);
      } finally {
        hideLoading();
      }
    });
  }
  
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
