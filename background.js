// Background service worker for Chrome extension

// Load JSZip library
try {
  importScripts('vendor/jszip.min.js');
} catch (e) {
  console.warn('Failed to load JSZip:', e);
}

// Session state
let sessionState = {
  isRecording: false,
  sessionTitle: '',
  sessionNotes: '',
  recordedSteps: [],
  audioUrl: null,
  audioBlobBuffer: null // Store as array buffer for smaller files
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('Scratch AI Learning Assistant installed');
  // Load session state from storage
  chrome.storage.local.get(['sessionState'], (result) => {
    if (result.sessionState) {
      sessionState = { ...sessionState, ...result.sessionState };
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getApiKey') {
    chrome.storage.local.get(['gemini_api_key'], (result) => {
      sendResponse({ apiKey: result.gemini_api_key });
    });
    return true;
  }
  
  // Handle START_SESSION
  if (request.type === 'START_SESSION') {
    sessionState.isRecording = true;
    sessionState.sessionTitle = request.title || 'Scratch Lesson';
    sessionState.sessionNotes = request.notes || '';
    sessionState.recordedSteps = [];
    
    // Save to storage
    chrome.storage.local.set({ sessionState }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Handle STOP_SESSION
  if (request.type === 'STOP_SESSION') {
    sessionState.isRecording = false;
    
    // Save to storage
    chrome.storage.local.set({ sessionState }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Handle GET_SESSION_STATUS
  if (request.type === 'GET_SESSION_STATUS') {
    sendResponse({
      isRecording: sessionState.isRecording,
      title: sessionState.sessionTitle,
      notes: sessionState.sessionNotes
    });
    return true;
  }
  
  // Handle recording step
  if (request.type === 'RECORD_STEP') {
    if (sessionState.isRecording) {
      sessionState.recordedSteps.push(request.step);
      chrome.storage.local.set({ sessionState });
    }
    sendResponse({ success: true });
    return true;
  }
  
  // Handle LESSON_AUDIO_READY - store audio and create zip export
  if (request.type === 'LESSON_AUDIO_READY') {
    if (!sessionState.isRecording) {
      sendResponse({ success: false, error: 'No active session' });
      return true;
    }
    
    // Store audio URL (blob URLs can't be stored in chrome.storage)
    sessionState.audioUrl = request.audioUrl;
    
    // Store audio blob reference if provided (for immediate use)
    if (request.audioBlob) {
      // Convert blob to array buffer for storage (limited size)
      // For large files, we'll use the URL
      if (request.audioBlob.size < 5 * 1024 * 1024) { // 5MB limit
        request.audioBlob.arrayBuffer().then(buffer => {
          sessionState.audioBlobBuffer = Array.from(new Uint8Array(buffer));
          chrome.storage.local.set({ sessionState: { ...sessionState, audioBlobBuffer: sessionState.audioBlobBuffer } });
        }).catch(() => {
          // If conversion fails, just use URL
          chrome.storage.local.set({ sessionState: { ...sessionState, audioUrl: sessionState.audioUrl } });
        });
      } else {
        chrome.storage.local.set({ sessionState: { ...sessionState, audioUrl: sessionState.audioUrl } });
      }
    } else {
      chrome.storage.local.set({ sessionState: { ...sessionState, audioUrl: sessionState.audioUrl } });
    }
    
    // Export as zip (async, don't wait for response)
    exportLessonAsZip(request.audioBlob || null).then(() => {
      console.log('Lesson exported as zip successfully');
    }).catch((error) => {
      console.warn('Failed to export zip, falling back to separate downloads:', error);
      exportLessonSeparate(request.audioBlob || null);
    });
    
    sendResponse({ success: true, exported: true });
    return true;
  }
  
  // Handle EXPORT_LESSON - manually trigger export
  if (request.type === 'EXPORT_LESSON') {
    // Export as zip (async, don't wait for response)
    exportLessonAsZip(null).then(() => {
      console.log('Lesson exported as zip successfully');
    }).catch((error) => {
      console.warn('Failed to export zip, falling back to separate downloads:', error);
      exportLessonSeparate(null);
    });
    
    sendResponse({ success: true });
    return true;
  }
});

// Function to export lesson package (called when exporting)
function exportLessonPackage() {
  return {
    title: sessionState.sessionTitle || 'Scratch Lesson',
    notes: sessionState.sessionNotes || '',
    steps: sessionState.recordedSteps || []
  };
}

// Export lesson as ZIP file
async function exportLessonAsZip(audioBlobOverride = null) {
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip not loaded');
  }
  
  const zip = new JSZip();
  const lessonData = exportLessonPackage();
  
  // Add JSON file
  zip.file('lesson.json', JSON.stringify(lessonData, null, 2));
  
  // Add audio file if available
  let audioBlob = audioBlobOverride;
  
  if (!audioBlob) {
    // Try to reconstruct from buffer
    if (sessionState.audioBlobBuffer) {
      audioBlob = new Blob([new Uint8Array(sessionState.audioBlobBuffer)], { type: 'audio/webm' });
    } else if (sessionState.audioUrl) {
      // Fetch audio from URL if we have a URL but not a blob
      try {
        const response = await fetch(sessionState.audioUrl);
        audioBlob = await response.blob();
      } catch (error) {
        console.warn('Failed to fetch audio from URL:', error);
      }
    }
  }
  
  if (audioBlob) {
    zip.file('lesson-audio.webm', audioBlob);
  }
  
  // Generate zip as blob
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  // Download using chrome.downloads API
  const blobUrl = URL.createObjectURL(zipBlob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `scratch-lesson-package-${timestamp}.zip`;
  
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: blobUrl,
      filename: filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        URL.revokeObjectURL(blobUrl);
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        // Clean up blob URL after a short delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        resolve(downloadId);
      }
    });
  });
}

// Fallback: Export as separate files
function exportLessonSeparate(audioBlobOverride = null) {
  const lessonData = exportLessonPackage();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  // Download JSON
  const jsonBlob = new Blob([JSON.stringify(lessonData, null, 2)], { type: 'application/json' });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  
  chrome.downloads.download({
    url: jsonUrl,
    filename: `lesson-${timestamp}.json`,
    saveAs: true
  }, () => {
    URL.revokeObjectURL(jsonUrl);
  });
  
  // Download audio if available
  let audioBlob = audioBlobOverride;
  
  if (!audioBlob) {
    // Try to reconstruct from buffer
    if (sessionState.audioBlobBuffer) {
      audioBlob = new Blob([new Uint8Array(sessionState.audioBlobBuffer)], { type: 'audio/webm' });
    }
  }
  
  if (audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    chrome.downloads.download({
      url: audioUrl,
      filename: `lesson-audio-${timestamp}.webm`,
      saveAs: true
    }, () => {
      URL.revokeObjectURL(audioUrl);
    });
  } else if (sessionState.audioUrl) {
    chrome.downloads.download({
      url: sessionState.audioUrl,
      filename: `lesson-audio-${timestamp}.webm`,
      saveAs: true
    });
  }
}

// Make exportLessonPackage available globally if needed
if (typeof globalThis !== 'undefined') {
  globalThis.exportLessonPackage = exportLessonPackage;
  globalThis.exportLessonAsZip = exportLessonAsZip;
  globalThis.exportLessonSeparate = exportLessonSeparate;
}










