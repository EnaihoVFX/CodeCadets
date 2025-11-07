// API configuration - Hardcoded API key for Scratch AI Assistant
const API_KEY = 'AIzaSyDcmb4l04vlgxKatscOHH9nMXXFMMK9wMY';

// DOM elements
const introBtn = document.getElementById('intro-btn');
const achievementsBtn = document.getElementById('achievements-btn');
const backBtn = document.getElementById('back-btn');
const lessonsGrid = document.getElementById('lessons-grid');
const achievementsView = document.getElementById('achievements-view');
const achievementsList = document.getElementById('achievements-list');
const loading = document.getElementById('loading');
const logoImg = document.getElementById('logo-img');
const miniLessonsView = document.getElementById('mini-lessons-view');
const miniLessonsGrid = document.getElementById('mini-lessons-grid');
const miniLessonsBackBtn = document.getElementById('mini-lessons-back-btn');
const miniLessonsTitle = document.getElementById('mini-lessons-title');
const progressPercentage = document.getElementById('progress-percentage');
const progressBarFill = document.getElementById('progress-bar-fill');

// Set logo image
if (logoImg && chrome.runtime) {
  logoImg.src = chrome.runtime.getURL('logo.png');
}

// Mini lessons data for each main lesson/game
// Each mini lesson builds upon the previous one to create a cumulative project
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
    { 
      title: "Advanced Motion", 
      icon: "🌊", 
      stepRange: null,
      description: "Advanced movement: smooth animations, physics simulation, and complex sprite behaviors.",
      categories: ["Motion", "Operators"]
    },
    { 
      title: "Advanced Control", 
      icon: "🧠", 
      stepRange: null,
      description: "Complex logic: nested loops, multiple conditions, custom blocks, and program organization.",
      categories: ["Control", "Operators"]
    },
    { 
      title: "Game Mechanics", 
      icon: "🎯", 
      stepRange: null,
      description: "Build game systems: scoring, lives, levels, win/lose conditions, and game state management.",
      categories: ["Variables", "Control", "Sensing"]
    },
    { 
      title: "Multi-Sprite Projects", 
      icon: "👥", 
      stepRange: null,
      description: "Work with multiple sprites: sprite communication, cloning, sprite interactions, and scene management.",
      categories: ["Events", "Control", "Sensing"]
    },
    { 
      title: "Final Project", 
      icon: "🏆", 
      stepRange: null,
      description: "Create a complete interactive project using all Scratch categories: a polished game or animation.",
      categories: ["All Categories"]
    }
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

// Tutorial lessons (shown first)
const tutorialLessons = [
  { title: "Tutorial Lesson 1", icon: "📚", type: "tutorial", lessonNumber: 1 },
  { title: "Tutorial Lesson 2", icon: "📖", type: "tutorial", lessonNumber: 2 }
];

// Games (shown after tutorials)
const games = [
  { title: "Platform Game", icon: "🕹️", type: "game" },
  { title: "Catch Game", icon: "🎯", type: "game" },
  { title: "Race Game", icon: "🏎️", type: "game" },
  { title: "Pong Game", icon: "🏓", type: "game" },
  { title: "Snake Game", icon: "🐍", type: "game" },
  { title: "Maze Game", icon: "🧩", type: "game" },
  { title: "Quiz Game", icon: "❓", type: "game" },
  { title: "Adventure Game", icon: "🗺️", type: "game" },
  { title: "Puzzle Game", icon: "🧩", type: "game" },
  { title: "Shooter Game", icon: "🎮", type: "game" }
];

function generateLessons() {
  lessonsGrid.innerHTML = '';
  let itemIndex = 0;
  
  // First, add tutorial lessons
  tutorialLessons.forEach((tutorial) => {
    const lessonBox = document.createElement('div');
    lessonBox.className = 'lesson-box';
    
    lessonBox.innerHTML = `
      <div class="lesson-content">
        <div class="lesson-icon">${tutorial.icon}</div>
        <div class="lesson-number">Tutorial ${tutorial.lessonNumber}</div>
        <div class="lesson-title">${tutorial.title}</div>
      </div>
    `;
    lessonBox.addEventListener('click', () => showMiniLessons(tutorial.title, tutorial.lessonNumber));
    lessonsGrid.appendChild(lessonBox);
    itemIndex++;
  });
  
  // Then, add games (shuffled for variety)
  const shuffledGames = [...games].sort(() => Math.random() - 0.5);
  shuffledGames.forEach((game) => {
    const lessonBox = document.createElement('div');
    lessonBox.className = 'lesson-box';
    
    lessonBox.innerHTML = `
      <div class="lesson-content">
        <div class="lesson-icon">${game.icon}</div>
        <div class="lesson-number">Game</div>
        <div class="lesson-title">${game.title}</div>
      </div>
    `;
    lessonBox.addEventListener('click', () => showMiniLessons(game.title, null));
    lessonsGrid.appendChild(lessonBox);
    itemIndex++;
  });
}

// Initialize lessons on load
generateLessons();

// Load achievements on page load
loadAchievements();

// Achievement button handler
achievementsBtn.addEventListener('click', () => {
  showAchievements();
});

// Back button handler
backBtn.addEventListener('click', () => {
  showLessons();
});

// Mini lessons back button handler
if (miniLessonsBackBtn) {
  miniLessonsBackBtn.addEventListener('click', () => {
    showLessons();
  });
}

function showAchievements() {
  lessonsGrid.style.display = 'none';
  achievementsView.style.display = 'block';
  loadAchievements();
}

function showLessons() {
  achievementsView.style.display = 'none';
  miniLessonsView.style.display = 'none';
  lessonsGrid.style.display = 'grid';
}

// Show mini lessons for a main lesson/game
async function showMiniLessons(mainLessonTitle, lessonNumber) {
  // Hide main grid and show mini lessons view
  lessonsGrid.style.display = 'none';
  achievementsView.style.display = 'none';
  miniLessonsView.style.display = 'block';
  
  // Set title
  if (miniLessonsTitle) {
    miniLessonsTitle.textContent = mainLessonTitle;
  }
  
  // Get mini lessons for this main lesson
  const miniLessons = miniLessonsData[mainLessonTitle] || [];
  
  // Get completion status
  const completionKey = `completion_${mainLessonTitle.replace(/\s+/g, '_')}`;
  const completionData = await getCompletionData(completionKey);
  
  // Clear and populate mini lessons grid
  if (miniLessonsGrid) {
    miniLessonsGrid.innerHTML = '';
    
    // Determine which lessons are completed, current, or locked
    let firstIncompleteIndex = -1;
    miniLessons.forEach((_, index) => {
      const miniLessonKey = `${completionKey}_${index}`;
      if (!completionData[miniLessonKey] && firstIncompleteIndex === -1) {
        firstIncompleteIndex = index;
      }
    });
    
    miniLessons.forEach(async (miniLesson, index) => {
      const miniLessonKey = `${completionKey}_${index}`;
      const isCompleted = completionData[miniLessonKey] || false;
      const isCurrent = index === firstIncompleteIndex;
      const isLocked = firstIncompleteIndex !== -1 && index > firstIncompleteIndex;
      
      // Get progress for this mini-lesson
      const progress = await getStepProgress(mainLessonTitle, index);
      
      // Get total steps from tutorial data if available
      let totalSteps = progress.totalSteps;
      if (totalSteps === 0 && lessonNumber !== null) {
        const lessonData = COMPREHENSIVE_TUTORIAL_DATA["Tutorial Lesson 1"];
        if (lessonData && lessonData[miniLesson.title]) {
          totalSteps = lessonData[miniLesson.title].length;
        }
      }
      
      const progressPercent = totalSteps > 0 
        ? (progress.completedSteps / totalSteps) * 100 
        : 0;
      
      const miniLessonBox = document.createElement('div');
      let boxClasses = 'mini-lesson-box';
      if (isCompleted) {
        boxClasses += ' completed';
      } else if (isCurrent) {
        boxClasses += ' current';
      } else if (isLocked) {
        boxClasses += ' locked';
      }
      miniLessonBox.className = boxClasses;
      
      // Calculate circumference for circular progress
      // Box is 100px total, border is 5px
      // To center on the border edge: radius = (100 - 5) / 2 = 47.5
      // To be slightly inside: radius = (100 - 10) / 2 = 45
      // Using 47.5 to align with border edge
      const radius = 47.5;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (progressPercent / 100) * circumference;
      
      miniLessonBox.innerHTML = `
        <svg class="progress-ring" width="100" height="100" viewBox="0 0 100 100">
          <circle
            class="progress-ring-circle-bg"
            stroke="#9CA3AF"
            stroke-width="6"
            fill="transparent"
            r="${radius}"
            cx="50"
            cy="50"
          />
          <circle
            class="progress-ring-circle"
            stroke="${isCompleted ? '#10B981' : isCurrent ? '#FBBF24' : '#7C3AED'}"
            stroke-width="6"
            fill="transparent"
            r="${radius}"
            cx="50"
            cy="50"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            transform="rotate(-90 50 50)"
            stroke-linecap="round"
          />
        </svg>
        <div class="mini-lesson-icon">${miniLesson.icon}</div>
        <div class="mini-lesson-number">${index + 1}</div>
        <div class="mini-lesson-title">${miniLesson.title}</div>
      `;
      
      if (!isLocked) {
        miniLessonBox.addEventListener('click', () => {
          startMiniLesson(mainLessonTitle, lessonNumber, index, miniLesson, miniLessonKey);
        });
      }
      
      miniLessonsGrid.appendChild(miniLessonBox);
    });
    
    // Update path styling based on completion (SVG path removed)
    const lessonPath = document.getElementById('lesson-path');
    if (lessonPath) {
      const completedCount = miniLessons.filter((_, index) => {
        const miniLessonKey = `${completionKey}_${index}`;
        return completionData[miniLessonKey];
      }).length;
      
      // Add completed-segment class if all lessons are done
      if (completedCount === miniLessons.length) {
        lessonPath.classList.add('completed-segment');
      } else {
        lessonPath.classList.remove('completed-segment');
      }
    }
  }
  
  // Update progress
  updateProgress(mainLessonTitle, completionData);
}

// Create curved SVG path connecting lessons
function createCurvedPath(numLessons) {
  const lessonPath = document.getElementById('lesson-path');
  if (!lessonPath || numLessons < 2) return;
  
  // Remove existing SVG if any
  const existingSvg = lessonPath.querySelector('.lesson-path-svg');
  if (existingSvg) {
    existingSvg.remove();
  }
  
  // Get the actual height of the lessons grid
  const miniLessonsGrid = document.getElementById('mini-lessons-grid');
  if (!miniLessonsGrid) return;
  
  // Wait a moment for layout to settle
  setTimeout(() => {
    const gridHeight = miniLessonsGrid.offsetHeight;
    const gridTop = miniLessonsGrid.offsetTop;
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'lesson-path-svg');
    svg.style.position = 'absolute';
    svg.style.top = `${gridTop}px`;
    svg.style.left = '50%';
    svg.style.transform = 'translateX(-50%)';
    svg.style.width = '200px';
    svg.style.height = `${gridHeight}px`;
    svg.setAttribute('viewBox', `0 0 200 ${gridHeight}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    
    // Calculate positions for curved path
    const centerX = 100; // Center of the path
    const lessonSpacing = gridHeight / (numLessons - 1);
    const curveAmount = 35; // How much to curve left/right
    
    // Create path with curves
    let pathData = '';
    const startY = 50;
    
    for (let i = 0; i < numLessons - 1; i++) {
      const y1 = startY + (i * lessonSpacing);
      const y2 = startY + ((i + 1) * lessonSpacing);
      const midY = (y1 + y2) / 2;
      
      // Alternate curve direction for visual interest
      const curveX = i % 2 === 0 ? centerX + curveAmount : centerX - curveAmount;
      
      if (i === 0) {
        pathData += `M ${centerX} ${y1}`;
      }
      
      // Create smooth curve using quadratic bezier
      pathData += ` Q ${curveX} ${midY}, ${centerX} ${y2}`;
    }
    
    // Create path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'lesson-path-line');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', '#10B981');
    path.setAttribute('stroke-width', '6');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    
    svg.appendChild(path);
    lessonPath.insertBefore(svg, miniLessonsGrid);
  }, 50);
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

// Update progress bar and percentage
function updateProgress(mainLessonTitle, completionData) {
  const miniLessons = miniLessonsData[mainLessonTitle] || [];
  const completionKey = `completion_${mainLessonTitle.replace(/\s+/g, '_')}`;
  
  let completedCount = 0;
  miniLessons.forEach((_, index) => {
    const miniLessonKey = `${completionKey}_${index}`;
    if (completionData[miniLessonKey]) {
      completedCount++;
    }
  });
  
  const total = miniLessons.length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  
  if (progressPercentage) {
    progressPercentage.textContent = `${percentage}%`;
  }
  
  if (progressBarFill) {
    progressBarFill.style.width = `${percentage}%`;
  }
}

// Start a mini lesson
async function startMiniLesson(mainLessonTitle, lessonNumber, miniIndex, miniLesson, completionKey) {
  showLoading();
  
  try {
    let tutorialData = [];
    
    // Use pre-defined comprehensive tutorial data
    if (lessonNumber !== null) {
      // Get tutorial data from comprehensive tutorial data structure
      const lessonData = COMPREHENSIVE_TUTORIAL_DATA["Tutorial Lesson 1"];
      if (lessonData && lessonData[miniLesson.title]) {
        tutorialData = lessonData[miniLesson.title];
      } else {
        // Fallback to basic tutorial if not found
        alert(`⚠️ Tutorial data not found for "${miniLesson.title}". Using basic tutorial.`);
        const fullTutorialData = SCRATCH_TUTORIAL_STRUCTURE?.steps || [];
        tutorialData = fullTutorialData.slice(0, 5);
      }
    } else if (lessonNumber !== null) {
      // For tutorial lessons without specific ranges, split the tutorial
      const fullTutorialData = SCRATCH_TUTORIAL_STRUCTURE?.steps || [];
      const totalSteps = fullTutorialData.length;
      const midPoint = Math.ceil(totalSteps / 2);
      
      if (lessonNumber === 1) {
        tutorialData = fullTutorialData.slice(0, midPoint);
      } else {
        tutorialData = fullTutorialData.slice(midPoint);
      }
    } else {
      // For games, generate tutorial using AI
      const systemInstruction = 'You are a friendly and patient Scratch programming tutor for children and beginners. Explain concepts clearly and simply.';
      const prompt = `Create a step-by-step tutorial for the "${miniLesson.title}" part of making a "${mainLessonTitle}" in Scratch. Make it beginner-friendly with clear instructions. Break it down into 3-5 steps.`;
      
      const gameTutorial = await callGeminiAPI(prompt, systemInstruction);
      // For now, show in alert. In future, could parse into steps
      alert(`🎮 ${miniLesson.title} Tutorial:\n\n${gameTutorial}`);
      hideLoading();
      
      // Mark as completed after showing
      const completionKeyFull = `completion_${mainLessonTitle.replace(/\s+/g, '_')}`;
      const completionData = await getCompletionData(completionKeyFull);
      completionData[completionKey] = true;
      saveCompletionData(completionKeyFull, completionData);
      
      // Refresh mini lessons view to update progress
      showMiniLessons(mainLessonTitle, lessonNumber);
      return;
    }
    
    // Send tutorial data to Scratch
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.url || !tab.url.includes('scratch.mit.edu')) {
        alert('⚠️ Please navigate to scratch.mit.edu and try again!');
        hideLoading();
        return;
      }

      const onSuccess = () => {
        alert(`✅ ${miniLesson.title} started on Scratch!`);
        hideLoading();
        
        // Initialize progress tracking
        const totalSteps = tutorialData.length;
        saveStepProgress(mainLessonTitle, miniIndex, 0, totalSteps);
        
        // Set up listener for step progress updates
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          const progressListener = (message, sender, sendResponse) => {
            if (message.action === 'stepProgress' && 
                message.mainLessonTitle === mainLessonTitle && 
                message.miniLessonIndex === miniIndex) {
              saveStepProgress(mainLessonTitle, miniIndex, message.stepIndex, message.totalSteps).then(() => {
                // Refresh mini lessons view to update progress display
                showMiniLessons(mainLessonTitle, lessonNumber);
              });
            }
          };
          
          // Store listener reference for cleanup (would need to be cleaned up on tutorial completion)
          chrome.runtime.onMessage.addListener(progressListener);
        }
      };
      
      const onFail = () => {
        alert('⚠️ Please open a Scratch project and try again!');
        hideLoading();
      };

      // Try top frame first
      chrome.tabs.sendMessage(tab.id, { 
        action: 'startTutorial', 
        tutorialData,
        mainLessonTitle: mainLessonTitle,
        miniLessonIndex: miniIndex
      }, (response) => {
        if (response && response.success) return onSuccess();

        // Then try all frames if available
        if (!chrome.webNavigation || !chrome.webNavigation.getAllFrames) return onFail();
        chrome.webNavigation.getAllFrames({ tabId: tab.id }, (frames) => {
          if (!frames || !frames.length) return onFail();
          let pending = frames.length;
          let done = false;
          frames.forEach((f) => {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'startTutorial', 
              tutorialData,
              mainLessonTitle: mainLessonTitle,
              miniLessonIndex: miniIndex
            }, { frameId: f.frameId }, (resp) => {
              pending--;
              if (!done && resp && resp.success) {
                done = true;
                onSuccess();
              }
              if (pending === 0 && !done) onFail();
            });
          });
        });
      });
    });
  } catch (error) {
    alert(`Error: ${error.message}`);
    hideLoading();
  }
}

// Mark mini lesson as complete
// Save step progress for a mini-lesson
async function saveStepProgress(mainLessonTitle, miniLessonIndex, stepIndex, totalSteps) {
  const progressKey = `progress_${mainLessonTitle.replace(/\s+/g, '_')}`;
  const progressData = await getCompletionData(progressKey);
  
  const miniLessonProgressKey = `${progressKey}_${miniLessonIndex}`;
  if (!progressData[miniLessonProgressKey]) {
    progressData[miniLessonProgressKey] = { completedSteps: 0, totalSteps: totalSteps };
  }
  
  // Update completed steps (ensure we don't go backwards)
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

async function markMiniLessonComplete(mainLessonTitle, completionKey, lessonNumber) {
  const completionKeyFull = `completion_${mainLessonTitle.replace(/\s+/g, '_')}`;
  const completionData = await getCompletionData(completionKeyFull);
  completionData[completionKey] = true;
  saveCompletionData(completionKeyFull, completionData);
  
  // Refresh mini lessons view to update UI
  showMiniLessons(mainLessonTitle, lessonNumber);
}

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
  achievementsList.innerHTML = '';
  
  const achievementData = {
    'tutorial_completed': {
      title: 'Tutorial Master',
      description: 'You completed the full Scratch tutorial!',
      icon: '🎓'
    }
  };
  
  const achievementKeys = Object.keys(achievements);
  
  // Calculate statistics
  const totalAchievements = achievementKeys.length;
  const totalStars = achievementKeys.reduce((sum, key) => {
    return sum + (achievements[key].stars || 3);
  }, 0);
  
  // Show statistics
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

// Show/hide loading
function showLoading() {
  if (loading) loading.style.display = 'flex';
}

function hideLoading() {
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

// Introduction button handler
introBtn.addEventListener('click', async () => {
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
    
    // Create a modal or alert with the introduction
    alert(introduction);
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
});

// Start tutorial lesson handler (for Tutorial Lesson 1 and 2)
async function startTutorialLesson(lessonNumber) {
  showLoading();
  try {
    // Get the full tutorial data
    let fullTutorialData = SCRATCH_TUTORIAL_STRUCTURE?.steps || [];
    
    // Split tutorial into two parts
    const totalSteps = fullTutorialData.length;
    const midPoint = Math.ceil(totalSteps / 2);
    
    let tutorialData;
    if (lessonNumber === 1) {
      // First half of tutorial
      tutorialData = fullTutorialData.slice(0, midPoint);
    } else {
      // Second half of tutorial
      tutorialData = fullTutorialData.slice(midPoint);
    }
    
    // Send tutorial data to Scratch
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.url || !tab.url.includes('scratch.mit.edu')) {
        alert('⚠️ Please navigate to scratch.mit.edu and try again!');
        hideLoading();
        return;
      }

      const onSuccess = () => {
        alert(`✅ Tutorial Lesson ${lessonNumber} started on Scratch!`);
        hideLoading();
      };
      
      const onFail = () => {
        alert('⚠️ Please open a Scratch project and try again!');
        hideLoading();
      };

      // Try top frame first
      chrome.tabs.sendMessage(tab.id, { 
        action: 'startTutorial', 
        tutorialData,
        mainLessonTitle: mainLessonTitle,
        miniLessonIndex: miniIndex
      }, (response) => {
        if (response && response.success) return onSuccess();

        // Then try all frames if available
        if (!chrome.webNavigation || !chrome.webNavigation.getAllFrames) return onFail();
        chrome.webNavigation.getAllFrames({ tabId: tab.id }, (frames) => {
          if (!frames || !frames.length) return onFail();
          let pending = frames.length;
          let done = false;
          frames.forEach((f) => {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'startTutorial', 
              tutorialData,
              mainLessonTitle: mainLessonTitle,
              miniLessonIndex: miniIndex
            }, { frameId: f.frameId }, (resp) => {
              pending--;
              if (!done && resp && resp.success) {
                done = true;
                onSuccess();
              }
              if (pending === 0 && !done) onFail();
            });
          });
        });
      });
    });
  } catch (error) {
    alert(`Error: ${error.message}`);
    hideLoading();
  }
}

// Start game handler
async function startGame(gameTitle) {
  showLoading();
  try {
    // For now, games will use AI to generate tutorial content
    // In the future, this could load specific game tutorials
    const systemInstruction = 'You are a friendly and patient Scratch programming tutor for children and beginners. Explain concepts clearly and simply.';
    const prompt = `Create a step-by-step tutorial for making a "${gameTitle}" in Scratch. Make it beginner-friendly with clear instructions. Break it down into 5-8 steps.`;
    
    const gameTutorial = await callGeminiAPI(prompt, systemInstruction);
    
    // For now, show the tutorial in an alert
    // In the future, this could be integrated with the tutorial system
    alert(`🎮 ${gameTitle} Tutorial:\n\n${gameTutorial}`);
    hideLoading();
  } catch (error) {
    alert(`Error: ${error.message}`);
    hideLoading();
  }
}
