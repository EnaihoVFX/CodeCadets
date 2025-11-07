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

// Set logo image
if (logoImg && chrome.runtime) {
  logoImg.src = chrome.runtime.getURL('logo.png');
}

// Generate lesson boxes with emoji icons (reliable and works offline)
const lessons = [
  { title: "Getting Started", icon: "🚀" },
  { title: "Move the Cat", icon: "🐱" },
  { title: "Change Colors", icon: "🎨" },
  { title: "Play Sounds", icon: "🔊" },
  { title: "Say Something", icon: "💬" },
  { title: "Turn Around", icon: "🔄" },
  { title: "Go to Position", icon: "📍" },
  { title: "Change Size", icon: "📏" },
  { title: "Hide and Show", icon: "👻" },
  { title: "Glide Movement", icon: "✨" },
  { title: "Forever Loop", icon: "♾️" },
  { title: "Repeat Blocks", icon: "🔁" },
  { title: "If Statements", icon: "❓" },
  { title: "Variables", icon: "📊" },
  { title: "Ask and Answer", icon: "💭" },
  { title: "Operators", icon: "➕" },
  { title: "Random Numbers", icon: "🎲" },
  { title: "Sensing Blocks", icon: "👁️" },
  { title: "Touching Color", icon: "🎯" },
  { title: "Key Pressed", icon: "⌨️" },
  { title: "Mouse Position", icon: "🖱️" },
  { title: "Timers", icon: "⏱️" },
  { title: "Broadcast Messages", icon: "📡" },
  { title: "Receive Messages", icon: "📨" },
  { title: "Create Clones", icon: "👯" },
  { title: "Pen Blocks", icon: "🖊️" },
  { title: "Draw Shapes", icon: "🟢" },
  { title: "Change Backdrop", icon: "🖼️" },
  { title: "Switch Costumes", icon: "👗" },
  { title: "Animation", icon: "🎬" },
  { title: "Scoring System", icon: "🏆" },
  { title: "Game Over", icon: "🛑" },
  { title: "Levels", icon: "📈" },
  { title: "Platform Game", icon: "🕹️" },
  { title: "Catch Game", icon: "🎯" },
  { title: "Race Game", icon: "🏎️" },
  { title: "Story Animation", icon: "📖" },
  { title: "Interactive Art", icon: "🎨" }
];

function generateLessons() {
  lessonsGrid.innerHTML = '';
  lessons.forEach((lesson, index) => {
    const lessonBox = document.createElement('div');
    lessonBox.className = 'lesson-box';
    
    lessonBox.innerHTML = `
      <div class="lesson-content">
        <div class="lesson-icon">${lesson.icon}</div>
        <div class="lesson-number">Lesson ${index + 1}</div>
        <div class="lesson-title">${lesson.title}</div>
      </div>
    `;
    lessonBox.addEventListener('click', () => startLesson(index + 1, lesson.title));
    lessonsGrid.appendChild(lessonBox);
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

function showAchievements() {
  lessonsGrid.style.display = 'none';
  achievementsView.style.display = 'block';
  loadAchievements();
}

function showLessons() {
  achievementsView.style.display = 'none';
  lessonsGrid.style.display = 'grid';
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

// Start lesson handler
async function startLesson(lessonNumber, lessonTitle) {
  showLoading();
  try {
    // Use the tutorial data if available
    let tutorialData = SCRATCH_TUTORIAL_STRUCTURE?.steps || [];
    
    // Send tutorial data to Scratch
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.url || !tab.url.includes('scratch.mit.edu')) {
        alert('⚠️ Please navigate to scratch.mit.edu and try again!');
        hideLoading();
        return;
      }

      const onSuccess = () => {
        alert(`✅ Tutorial "${lessonTitle}" started on Scratch!`);
        hideLoading();
      };
      
      const onFail = () => {
        alert('⚠️ Please open a Scratch project and try again!');
        hideLoading();
      };

      // Try top frame first
      chrome.tabs.sendMessage(tab.id, { action: 'startTutorial', tutorialData }, (response) => {
        if (response && response.success) return onSuccess();

        // Then try all frames if available
        if (!chrome.webNavigation || !chrome.webNavigation.getAllFrames) return onFail();
        chrome.webNavigation.getAllFrames({ tabId: tab.id }, (frames) => {
          if (!frames || !frames.length) return onFail();
          let pending = frames.length;
          let done = false;
          frames.forEach((f) => {
            chrome.tabs.sendMessage(tab.id, { action: 'startTutorial', tutorialData }, { frameId: f.frameId }, (resp) => {
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
