// Profile page script - loads user data and XP stats (user-specific)

// Load XP state and display stats
let xpState = {
  xp: 0,
  level: 1,
  xpForNextLevel: 100
};

let userData = null;
let achievements = null;
let dbInitialized = false;

// Initialize database service
async function initializeDatabase() {
  if (dbInitialized) return;
  
  try {
    await databaseService.initialize();
    
    // Try to initialize Supabase config if not already initialized
    if (typeof initializeSupabaseConfig === 'function' && !databaseService.useRemoteStorage) {
      console.log('[Profile] Attempting to initialize Supabase config...');
      await initializeSupabaseConfig();
    }
    
    dbInitialized = true;
    console.log('[Profile] Database service initialized');
    console.log('[Profile] Remote storage enabled:', databaseService.useRemoteStorage);
    
    // Auto-sync is automatically started when remote storage is initialized
    if (databaseService.useRemoteStorage) {
      console.log('[Profile] Auto-sync is active');
      updateSyncStatusIndicator();
    }
  } catch (e) {
    console.error('[Profile] Failed to initialize database service:', e);
  }
}

async function loadXPState() {
  try {
    await initializeDatabase();
    
    // Load XP state (user-specific)
    const loadedState = await databaseService.loadXPState();
    if (loadedState) {
      xpState = { ...xpState, ...loadedState };
          updateProfileStats();
        }
        
        // Load user data from LearnWorlds
    const result = await chrome.storage.local.get(['learnworldsUserData']);
        if (result.learnworldsUserData) {
          console.log('[Profile] Found user data:', result.learnworldsUserData);
          userData = result.learnworldsUserData;
          updateUserInfo();
        } else {
          console.log('[Profile] No user data found in storage');
    }
    
    // Load achievements (user-specific)
    achievements = await databaseService.loadAchievements();
    updateAchievementsPreview();
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName === 'local') {
        await initializeDatabase();
        
        // Check for XP state changes (user-specific)
        const userKey = databaseService.getUserKey('xpState');
        if (changes[userKey]) {
          const newState = changes[userKey].newValue;
          if (newState) {
            xpState = { ...xpState, ...newState };
            updateProfileStats();
          }
        }
        
        // Check for achievements changes (user-specific)
        const achievementsKey = databaseService.getUserKey('achievements');
        if (changes[achievementsKey]) {
          achievements = changes[achievementsKey].newValue || {};
          updateAchievementsPreview();
        }
        
        // Check for user data changes
        if (changes.learnworldsUserData) {
          userData = changes.learnworldsUserData.newValue;
          updateUserInfo();
        }
        
        // Check for avatar image changes
        const avatarKey = databaseService.getUserKey('avatarImage');
        if (changes[avatarKey]) {
          // Use avatar-utils to update if available, otherwise use our function
          if (typeof updateAllAvatarImages !== 'undefined') {
            updateAllAvatarImages();
    } else {
            loadAvatarImage();
          }
        }
    }
    });
  } catch (e) {
    console.error('Error loading XP state:', e);
  }
}

async function updateUserInfo() {
  if (!userData) {
    console.log('[Profile] No user data to display');
    return;
  }
  
  console.log('[Profile] Updating user info with:', userData);
  
  const usernameEl = document.getElementById('user-username');
  const emailEl = document.getElementById('user-email');
  const roleEl = document.getElementById('user-role');
  const userInfoSection = document.getElementById('user-info-section');
  
  if (usernameEl) {
    usernameEl.textContent = userData.username || 'N/A';
    console.log('[Profile] Set username:', userData.username || 'N/A');
  }
  if (emailEl) {
    emailEl.textContent = userData.email || 'N/A';
    console.log('[Profile] Set email:', userData.email || 'N/A');
  }
  if (roleEl) {
    roleEl.textContent = userData.userRole || userData.usertype || 'N/A';
    console.log('[Profile] Set role:', userData.userRole || userData.usertype || 'N/A');
  }
  
  if (userInfoSection && userData.id) {
    userInfoSection.style.display = 'flex';
    console.log('[Profile] User info section displayed');
  } else {
    console.log('[Profile] User info section not displayed - missing ID or element');
  }
  
  // Update welcome message with username if available
  const welcomeMessage = document.getElementById('welcome-message');
  if (welcomeMessage && userData.username) {
    const welcomeText = welcomeMessage.querySelector('p');
    if (welcomeText) {
      welcomeText.textContent = `Welcome back, ${userData.username}! Keep learning and earning XP to level up. Complete tutorials and challenges to unlock achievements!`;
    }
  }
  
  // Load and display avatar image using avatar-utils
  await loadAvatarImage();
}

// Load avatar image from storage/database using avatar-utils
async function loadAvatarImage() {
  try {
    const avatarImage = document.getElementById('avatar-image');
    if (!avatarImage) {
      console.warn('[Profile] Avatar image element not found');
      return;
    }
    
    // Load directly from storage
    await initializeDatabase();
    const avatarKey = databaseService.getUserKey('avatarImage');
    const result = await chrome.storage.local.get([avatarKey]);
    
    let avatarImageUrl = result[avatarKey];
    
    // If not in local storage, try to sync from remote
    if (!avatarImageUrl && databaseService.useRemoteStorage) {
      console.log('[Profile] Avatar not in local storage, syncing from remote...');
      avatarImageUrl = await databaseService.syncFromRemote('avatarImage');
      if (avatarImageUrl) {
        // Save to local storage
        await chrome.storage.local.set({ [avatarKey]: avatarImageUrl });
      }
    }
    
    // Set the avatar if we found one
    if (avatarImageUrl && !avatarImageUrl.includes('robot.png') && avatarImageUrl !== '') {
      avatarImage.src = avatarImageUrl;
      avatarImage.style.display = 'block';
      console.log('[Profile] ✅ Avatar image loaded');
    } else {
      // Try using avatar-utils as fallback
      if (typeof updateAvatarImage !== 'undefined') {
        await updateAvatarImage(avatarImage);
        // Check if it set a valid avatar
        if (avatarImage.src && avatarImage.src !== '' && !avatarImage.src.includes('robot.png')) {
          avatarImage.style.display = 'block';
          console.log('[Profile] ✅ Avatar loaded via avatar-utils');
        } else {
          avatarImage.style.display = 'none';
          console.log('[Profile] 💡 No custom avatar found. Click "✏️ CUSTOMIZE" button to create one!');
        }
      } else {
        avatarImage.style.display = 'none';
        console.log('[Profile] 💡 No custom avatar found. Click "✏️ CUSTOMIZE" button to create one!');
      }
    }
  } catch (error) {
    console.error('[Profile] Error loading avatar image:', error);
    // Don't set robot on error - keep current or hide
    const avatarImage = document.getElementById('avatar-image');
    if (avatarImage) {
      // Only hide if it's currently showing robot
      if (avatarImage.src.includes('robot.png')) {
        avatarImage.style.display = 'none';
        console.log('[Profile] Hiding avatar image due to error');
      }
    }
  }
}

// Debug function - expose to console
window.debugProfile = function() {
  chrome.storage.local.get(['learnworldsUserData', 'xpState'], (result) => {
    console.log('=== PROFILE DEBUG ===');
    console.log('Storage result:', result);
    console.log('User data:', result.learnworldsUserData);
    console.log('XP state:', result.xpState);
    console.log('Current userData variable:', userData);
    console.log('Current xpState variable:', xpState);
  });
};

function updateProfileStats() {
  const statsContainer = document.getElementById('profile-stats');
  if (!statsContainer) return;

  // Calculate XP needed for next level
  const xpForCurrentLevel = (xpState.level - 1) * 100;
  const xpForNextLevel = xpState.level * 100;
  const xpInCurrentLevel = xpState.xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.floor((xpInCurrentLevel / xpNeeded) * 100);
  
  // Calculate achievements count
  const achievementsCount = achievements ? Object.keys(achievements).length : 0;

  statsContainer.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Level</div>
      <div class="stat-value">${xpState.level}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total XP</div>
      <div class="stat-value">${xpState.xp}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Progress</div>
      <div class="stat-value">${progressPercent}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Achievements</div>
      <div class="stat-value">${achievementsCount}</div>
    </div>
  `;
}

function updateAchievementsPreview() {
  const achievementsList = document.getElementById('achievements-list');
  if (!achievementsList) return;
  
  if (!achievements || Object.keys(achievements).length === 0) {
    achievementsList.innerHTML = '<div class="no-achievements">No achievements yet. Complete tutorials to earn them!</div>';
    return;
  }
  
  const achievementsArray = Object.entries(achievements);
  achievementsList.innerHTML = achievementsArray.map(([key, achievement]) => {
    const date = achievement.date ? new Date(achievement.date).toLocaleDateString() : '';
    const icon = achievement.icon || '🏆';
    const name = achievement.name || key;
    
    return `
      <div class="achievement-item">
        <div class="achievement-icon">${icon}</div>
        <div class="achievement-info">
          <div class="achievement-name">${name}</div>
          ${date ? `<div class="achievement-date">Earned: ${date}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  updateProfileStats();
}

// Load state on page load
loadXPState();

// Also load avatar image when page loads (after a short delay to ensure avatar-utils is loaded)
setTimeout(() => {
  loadAvatarImage();
}, 200);

// Ensure avatar customizer initializes immediately for faster perceived load
if (typeof loadCustomAvatar === 'function') {
  loadCustomAvatar();
}

// Sync button functionality
const syncButton = document.getElementById('sync-button');
if (syncButton) {
  syncButton.addEventListener('click', async () => {
    try {
      syncButton.classList.add('syncing');
      syncButton.textContent = 'SYNCING...';
      
      await initializeDatabase();
      
      // Try to initialize Supabase config explicitly if not already done
      if (typeof initializeSupabaseConfig === 'function' && !databaseService.useRemoteStorage) {
        console.log('[Profile] Retrying Supabase initialization...');
        await initializeSupabaseConfig();
      }
      
      // Check if Supabase is properly configured
      if (!databaseService.useRemoteStorage) {
        console.error('[Profile] ⚠️ Remote storage not enabled!');
        console.log('[Profile] Current config:', {
          apiEndpoint: databaseService.apiEndpoint,
          hasApiKey: !!databaseService.apiKey,
          apiKeyPreview: databaseService.apiKey ? `${databaseService.apiKey.substring(0, 20)}...` : 'MISSING',
          useSupabase: databaseService.useSupabase
        });
        
        if (!databaseService.apiKey || databaseService.apiKey === 'YOUR-ANON-KEY-HERE') {
          const errorMsg = '❌ Supabase API key not configured!\n\n' +
            '👉 Get your ANON key from:\n' +
            'https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api\n\n' +
            'Then update supabase-config.js with:\n' +
            'supabaseKey: "your-anon-key-here"';
          throw new Error(errorMsg);
        } else if (!databaseService.apiEndpoint || databaseService.apiEndpoint.includes('your-project')) {
          throw new Error('Supabase endpoint not configured. Please check supabase-config.js');
        } else {
          throw new Error('Remote storage not enabled. Check browser console for details.');
        }
      }
      
      if (!databaseService.apiEndpoint || !databaseService.apiKey) {
        throw new Error('Supabase not configured. Please add your API key to supabase-config.js');
      }
      
      if (!databaseService.userId) {
        throw new Error('User ID not found. Please visit CodeCadets Hub first to scrape your user ID.');
      }
      
      if (databaseService.useRemoteStorage) {
        // Sync to remote
        try {
          const success = await databaseService.syncAllToRemote();
          if (success) {
            syncButton.textContent = 'SYNCED!';
            setTimeout(() => {
              syncButton.textContent = 'SYNC';
              syncButton.classList.remove('syncing');
            }, 2000);
          } else {
            throw new Error('Sync returned false');
          }
        } catch (syncError) {
          console.error('[Profile] Sync error details:', syncError);
          throw syncError;
        }
      } else {
        // Try to sync from remote
        const success = await databaseService.syncAllFromRemote();
        if (success) {
          syncButton.textContent = 'LOADED!';
          // Reload data
          await loadXPState();
          setTimeout(() => {
            syncButton.textContent = 'SYNC';
            syncButton.classList.remove('syncing');
          }, 2000);
        } else {
          syncButton.textContent = 'NO REMOTE';
          setTimeout(() => {
            syncButton.textContent = 'SYNC';
            syncButton.classList.remove('syncing');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('[Profile] Sync error:', error);
      const errorMessage = error.message || 'Unknown error';
      syncButton.textContent = 'ERROR';
      syncButton.title = errorMessage; // Show error on hover
      
      // Show more detailed error in console
      if (errorMessage.includes('not configured')) {
        console.error('[Profile] ⚠️ Supabase API key missing! Get it from: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api');
      } else if (errorMessage.includes('User ID not found')) {
        console.error('[Profile] ⚠️ Visit CodeCadets Hub first to scrape your user ID!');
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        console.error('[Profile] ⚠️ Database table not found! Run the SQL from SUPABASE_SETUP.md to create the table.');
      } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        console.error('[Profile] ⚠️ Invalid API key! Make sure you\'re using the ANON/PUBLIC key, not the service_role key.');
      }
      
      setTimeout(() => {
        syncButton.textContent = 'SYNC';
        syncButton.title = 'Sync with remote database';
        syncButton.classList.remove('syncing');
      }, 3000);
    }
  });
}

// Update sync status indicator
function updateSyncStatusIndicator() {
  const syncButton = document.getElementById('sync-button');
  if (!syncButton) return;
  
  if (databaseService.useRemoteStorage && databaseService.autoSyncEnabled) {
    // Add a subtle indicator that auto-sync is active
    syncButton.title = 'Auto-sync is active (syncs every 5 minutes)';
    if (!syncButton.classList.contains('auto-sync-active')) {
      syncButton.classList.add('auto-sync-active');
    }
  } else {
    syncButton.title = 'Sync with remote database';
    syncButton.classList.remove('auto-sync-active');
  }
}

