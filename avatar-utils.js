// Avatar Utilities - Get custom avatar URL across the extension
// This file provides a simple way to get the current avatar (custom or default)

let cachedAvatarUrl = null;
let avatarLoadPromise = null;

// Get avatar URL (async - loads from storage if needed)
async function getAvatarUrl() {
  // Return cached if available
  if (cachedAvatarUrl) {
    return cachedAvatarUrl;
  }

  // If already loading, return that promise
  if (avatarLoadPromise) {
    return avatarLoadPromise;
  }

  // Load avatar from storage
  avatarLoadPromise = loadAvatarFromStorage();
  const url = await avatarLoadPromise;
  cachedAvatarUrl = url;
  return url;
}

// Load avatar from storage
async function loadAvatarFromStorage() {
  try {
    // Try to get database service
    if (typeof databaseService === 'undefined') {
      return null; // Don't return robot
    }

    // Wait for database service to initialize
    if (!databaseService.userId) {
      await databaseService.initialize();
    }

    if (!databaseService.userId) {
      return null; // Don't return robot
    }

    // Load from local storage
    const key = databaseService.getUserKey('avatarImage');
    const result = await chrome.storage.local.get([key]);
    
    if (result[key]) {
      return result[key];
    }

    // Try to sync from remote
    if (databaseService.useRemoteStorage) {
      try {
        const remoteImage = await databaseService.syncFromRemote('avatarImage');
        if (remoteImage) {
          return remoteImage;
        }
      } catch (error) {
        console.warn('[Avatar Utils] Failed to sync avatar from remote:', error);
      }
    }

    // Don't return robot - return empty string or keep trying
    console.warn('[Avatar Utils] No avatar found, but not using robot fallback');
    return null; // Return null instead of robot
  } catch (error) {
    console.error('[Avatar Utils] Error loading avatar:', error);
    return null; // Return null instead of robot
  }
}

// Clear cache (call when avatar is updated)
function clearAvatarCache() {
  cachedAvatarUrl = null;
  avatarLoadPromise = null;
}

// Export to window for use in other scripts
if (typeof window !== 'undefined') {
  window.clearAvatarCache = clearAvatarCache;
  window.getAvatarUrl = getAvatarUrl;
  window.updateAvatarImage = updateAvatarImage;
}

// Update avatar in an image element
async function updateAvatarImage(imgElement) {
  if (!imgElement) return;
  
  try {
    const url = await getAvatarUrl();
    
    // Only update if we have a valid avatar URL (not null/robot)
    if (url && url !== 'icons/robot.png' && !url.includes('robot.png')) {
      console.log('[Avatar Utils] Setting avatar URL:', url.substring(0, 50) + (url.length > 50 ? '...' : ''));
      imgElement.src = url;
      imgElement.style.display = 'block'; // Ensure it's visible
      
      // Verify it was set correctly
      if (imgElement.src === url || (url.startsWith('data:') && imgElement.src.includes('data:image'))) {
        console.log('[Avatar Utils] ✅ Avatar image updated successfully');
      } else {
        console.warn('[Avatar Utils] ⚠️ Avatar src mismatch. Expected:', url.substring(0, 30), 'Got:', imgElement.src.substring(0, 30));
      }
    } else {
      // Don't set robot - keep current image or use a placeholder
      console.log('[Avatar Utils] No custom avatar available, keeping current image');
      // Only set robot if image is completely empty
      if (!imgElement.src || imgElement.src === '' || imgElement.src.includes('about:blank')) {
        // Use a transparent placeholder instead of robot
        imgElement.style.display = 'none';
        console.log('[Avatar Utils] Hiding avatar image (no custom avatar)');
      } else if (!imgElement.src.includes('robot.png')) {
        // If we have a valid avatar, make sure it's visible
        imgElement.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('[Avatar Utils] Error updating avatar image:', error);
    // Don't set robot on error - keep current or hide
    if (!imgElement.src || imgElement.src === '' || imgElement.src.includes('about:blank')) {
      imgElement.style.display = 'none';
    }
  }
}

// Listen for avatar updates
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && typeof databaseService !== 'undefined') {
    const avatarKey = databaseService.getUserKey('avatarImage');
    if (changes[avatarKey]) {
      clearAvatarCache();
      // Update all avatar images on the page
      updateAllAvatarImages();
    }
  }
});

// Update all avatar images on the current page
function updateAllAvatarImages() {
  const avatarImages = document.querySelectorAll('[data-avatar], .profile-avatar-icon, #avatar-image, .avatar-full-body, .welcome-mascot, .corner-mascot-img');
  avatarImages.forEach(img => {
    updateAvatarImage(img);
  });
}

