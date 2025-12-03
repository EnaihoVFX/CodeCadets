// Avatar Customization Handler
// Integrates with LPC Character Generator: https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator

let avatarData = null;
let avatarImageUrl = null;

// Initialize avatar customization
document.addEventListener('DOMContentLoaded', async () => {
  await loadCustomAvatar();
  setupAvatarCustomization();
});

// Setup event listeners for avatar customization
function setupAvatarCustomization() {
  const customizeBtn = document.getElementById('customize-avatar-btn');
  const modal = document.getElementById('avatar-modal');
  const closeBtn = document.getElementById('avatar-modal-close');
  const saveBtn = document.getElementById('avatar-save-btn');
  const resetBtn = document.getElementById('avatar-reset-btn');

  if (customizeBtn) {
    customizeBtn.addEventListener('click', () => {
      openAvatarModal();
      // Initialize character builder when modal opens
      setTimeout(() => {
        if (typeof initializeCharacterBuilder === 'function') {
          initializeCharacterBuilder();
        }
      }, 100);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeAvatarModal();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAvatarModal();
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      await saveAvatarFromBuilder();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      await resetAvatar();
    });
  }

}

// Open avatar customization modal
function openAvatarModal() {
  const modal = document.getElementById('avatar-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

// Close avatar customization modal
function closeAvatarModal() {
  const modal = document.getElementById('avatar-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Handle avatar export from LPC generator
async function handleAvatarExport(data) {
  try {
    if (data.png) {
      // Save PNG image
      avatarImageUrl = data.png;
      await saveAvatarImage(data.png);
    }
    
    if (data.json) {
      // Save JSON configuration
      avatarData = data.json;
      await saveAvatarData(data.json);
    }

    // Update avatar display
    updateAvatarDisplay();
    
    // Clear cache
    notifyAvatarCacheCleared();
    
    // Close modal after a short delay
    setTimeout(() => {
      closeAvatarModal();
      showNotification('✅ Avatar saved successfully!');
    }, 500);
  } catch (error) {
    console.error('[Avatar] Error handling export:', error);
    showNotification('❌ Error saving avatar. Please try again.');
  }
}

// Save avatar from custom builder
async function saveAvatarFromBuilder() {
  try {
    if (typeof window.getCharacterBuilder === 'function' && typeof window.exportCharacter === 'function') {
      const builder = window.getCharacterBuilder();
      if (!builder) {
        showNotification('⚠️ Character builder not initialized');
        return;
      }

      const exportData = await window.exportCharacter();
      if (!exportData || !exportData.image) {
        showNotification('⚠️ Could not export character');
        return;
      }

      // Save image
      await saveAvatarImage(exportData.image);
      
      // Save JSON configuration
      if (exportData.json) {
        await saveAvatarData(exportData.json);
      }

      // Update display
      updateAvatarDisplay();
      
      // Clear cache
      notifyAvatarCacheCleared();
      
      // Update all avatar images on the page (including profile avatar)
      if (typeof updateAllAvatarImages === 'function') {
        updateAllAvatarImages();
      }
      
      // Also update the canvas in the character builder to show the saved image
      if (builder && builder.canvas && builder.ctx) {
        const img = new Image();
        img.onload = () => {
          builder.ctx.clearRect(0, 0, builder.canvas.width, builder.canvas.height);
          builder.ctx.drawImage(img, 0, 0, builder.canvas.width, builder.canvas.height);
          console.log('[Avatar] Canvas updated with saved avatar');
        };
        img.src = exportData.image;
      }

      showNotification('✅ Avatar saved successfully!');
      closeAvatarModal();
    } else {
      showNotification('⚠️ Character builder not available');
    }
  } catch (error) {
    console.error('[Avatar] Error saving from builder:', error);
    showNotification('❌ Error saving avatar. Please try again.');
  }
}

// Save avatar image (base64 PNG)
async function saveAvatarImage(imageData) {
  try {
    if (!databaseService || !databaseService.userId) {
      console.warn('[Avatar] Database service not initialized');
      return;
    }

    // Save to local storage
    const key = databaseService.getUserKey('avatarImage');
    await chrome.storage.local.set({ [key]: imageData });

    // Sync to remote if enabled
    if (databaseService.useRemoteStorage) {
      try {
        await databaseService.syncToRemote('avatarImage', imageData);
      } catch (error) {
        console.error('[Avatar] Failed to sync avatar image to remote:', error);
      }
    }

    console.log('[Avatar] Avatar image saved');
  } catch (error) {
    console.error('[Avatar] Error saving avatar image:', error);
    throw error;
  }
}

// Save avatar data (JSON configuration)
async function saveAvatarData(jsonData) {
  try {
    if (!databaseService || !databaseService.userId) {
      console.warn('[Avatar] Database service not initialized');
      return;
    }

    // Save to local storage
    const key = databaseService.getUserKey('avatarData');
    await chrome.storage.local.set({ [key]: jsonData });

    // Sync to remote if enabled
    if (databaseService.useRemoteStorage) {
      try {
        await databaseService.syncToRemote('avatarData', jsonData);
      } catch (error) {
        console.error('[Avatar] Failed to sync avatar data to remote:', error);
      }
    }

    console.log('[Avatar] Avatar data saved');
  } catch (error) {
    console.error('[Avatar] Error saving avatar data:', error);
    throw error;
  }
}

// Load custom avatar
async function loadCustomAvatar() {
  try {
    if (!databaseService || !databaseService.userId) {
      return;
    }

    // Load from local storage
    const imageKey = databaseService.getUserKey('avatarImage');
    const dataKey = databaseService.getUserKey('avatarData');
    
    const result = await chrome.storage.local.get([imageKey, dataKey]);
    
    if (result[imageKey]) {
      avatarImageUrl = result[imageKey];
    }
    
    if (result[dataKey]) {
      avatarData = result[dataKey];
    }

    // Update immediately with cached/local data
    updateAvatarDisplay();

    // Try to sync from remote
    if (databaseService.useRemoteStorage) {
      try {
        const remoteImage = await databaseService.syncFromRemote('avatarImage');
        if (remoteImage) {
          avatarImageUrl = remoteImage;
        }
        
        const remoteData = await databaseService.syncFromRemote('avatarData');
        if (remoteData) {
          avatarData = remoteData;
        }
      } catch (error) {
        console.warn('[Avatar] Failed to sync avatar from remote:', error);
      }
    }
    
    // Update display again in case remote provided newer data
    updateAvatarDisplay();
  } catch (error) {
    console.error('[Avatar] Error loading custom avatar:', error);
  }
}

// Update avatar display
function updateAvatarDisplay() {
  const avatarImage = document.getElementById('avatar-image');
  if (!avatarImage) return;

  if (avatarImageUrl) {
    // Use custom avatar
    avatarImage.src = avatarImageUrl;
    avatarImage.alt = 'Custom Avatar';
    console.log('[Avatar] Displaying custom avatar');
  } else {
    // Use default avatar
    // Don't set robot - keep current or hide
    if (avatarImage.src && !avatarImage.src.includes('robot.png')) {
      // Keep current avatar
    } else {
      avatarImage.style.display = 'none';
    }
    avatarImage.alt = 'Avatar';
  }
}

// Reset avatar to default
async function resetAvatar() {
  try {
    if (!confirm('Reset avatar to default? This cannot be undone.')) {
      return;
    }

    if (!databaseService || !databaseService.userId) {
      return;
    }

    // Clear from local storage
    const imageKey = databaseService.getUserKey('avatarImage');
    const dataKey = databaseService.getUserKey('avatarData');
    
    await chrome.storage.local.remove([imageKey, dataKey]);

    // Clear from remote if enabled
    if (databaseService.useRemoteStorage) {
      try {
        // Set to null to clear remote data
        await databaseService.syncToRemote('avatarImage', null);
        await databaseService.syncToRemote('avatarData', null);
      } catch (error) {
        console.error('[Avatar] Failed to clear avatar from remote:', error);
      }
    }

    // Reset variables
    avatarImageUrl = null;
    
    // Update display - hide instead of showing robot
    const avatarImage = document.getElementById('avatar-image');
    if (avatarImage) {
      avatarImage.style.display = 'none';
      avatarImage.src = '';
    }
    avatarData = null;

    // Update display
    updateAvatarDisplay();
    
    // Clear cache
    notifyAvatarCacheCleared();

    showNotification('🔄 Avatar reset to default');
    closeAvatarModal();
  } catch (error) {
    console.error('[Avatar] Error resetting avatar:', error);
    showNotification('❌ Error resetting avatar');
  }
}

// Show notification
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(16, 185, 129, 0.95);
    border: 3px solid #10B981;
    color: #ffffff;
    padding: 15px 30px;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    z-index: 10000;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
    animation: slideDown 0.3s ease;
  `;
  notification.textContent = message;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideDown 0.3s ease reverse';
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 300);
  }, 3000);
}

// Export function to get avatar URL (for use in other scripts)
function getAvatarUrl() {
  return avatarImageUrl || null;
}

// Clear avatar cache when updated (if avatar-utils.js is loaded)
function notifyAvatarCacheCleared() {
  if (typeof window !== 'undefined' && typeof window.clearAvatarCache === 'function') {
    window.clearAvatarCache();
  }
}

// Export function to get avatar data
function getAvatarData() {
  return avatarData;
}

