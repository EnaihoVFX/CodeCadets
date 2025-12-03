// Content script for LearnWorlds site to capture user information
// Runs on code-cadets.getlearnworlds.com

console.log('[Cadet Help] LearnWorlds user script loaded');

// Function to extract user data from the page
function extractUserData() {
  let userData = null;
  
  console.log('[Cadet Help] Starting user data extraction...');
  
  // Method 1: Check for user data in script tags (especially at start of page)
  // Prioritize script tags that might contain initialization data
  const scripts = document.querySelectorAll('script:not([src])'); // Inline scripts first
  const externalScripts = document.querySelectorAll('script[src]');
  const allScripts = Array.from(scripts).concat(Array.from(externalScripts));
  
  console.log(`[Cadet Help] Found ${allScripts.length} script tags (${scripts.length} inline, ${externalScripts.length} external)`);
  
  // Also check script tags with src that might be loaded
  for (let i = 0; i < allScripts.length; i++) {
    const script = allScripts[i];
    let text = script.textContent || script.innerHTML;
    
    // For external scripts, try to get content if available
    if (script.src && !text) {
      // Script might be loaded, try to access it
      try {
        // Some scripts expose data via window objects
        if (script.src.includes('start') || script.src.includes('init')) {
          console.log(`[Cadet Help] Found potential start script: ${script.src}`);
        }
      } catch (e) {}
    }
    
    if (!text || text.length < 50) continue;
    
    // Look for the exact structure the user mentioned
    // Pattern: "id": "...", "username": "...", etc.
    // Also look for: var me = { ... }; or const me = { ... };
    try {
      // First, try to find patterns like: var me = { ... }; or const me = { ... };
      const varMePatterns = [
        /(?:var|let|const)\s+me\s*=\s*({[\s\S]*?"id"[\s\S]*?});/,
        /(?:var|let|const)\s+me\s*=\s*({[\s\S]*?});/
      ];
      
      for (const pattern of varMePatterns) {
        const match = text.match(pattern);
        if (match) {
          console.log(`[Cadet Help] Found "var me = {...}" pattern in script ${i}`);
          let jsonStr = match[1];
          
          // Find the matching closing brace for the object
          let braceCount = 0;
          let endPos = -1;
          for (let j = 0; j < jsonStr.length; j++) {
            if (jsonStr[j] === '{') braceCount++;
            if (jsonStr[j] === '}') {
              braceCount--;
              if (braceCount === 0) {
                endPos = j + 1;
                break;
              }
            }
          }
          
          if (endPos > 0) {
            jsonStr = jsonStr.substring(0, endPos);
            
            // Try to parse
            try {
              userData = JSON.parse(jsonStr);
              if (userData && userData.id && (userData.username || userData.email)) {
                console.log('[Cadet Help] ✅ Successfully parsed user data from "var me" pattern:', {
                  id: userData.id,
                  username: userData.username,
                  email: userData.email
                });
                break;
              }
            } catch (e) {
              // If parsing fails, try regex extraction
              const idMatch = jsonStr.match(/"id"\s*:\s*"([^"]+)"/);
              const usernameMatch = jsonStr.match(/"username"\s*:\s*"([^"]*)"/);
              const emailMatch = jsonStr.match(/"email"\s*:\s*"([^"]*)"/);
              const usertypeMatch = jsonStr.match(/"usertype"\s*:\s*"([^"]*)"/);
              
              if (idMatch && (usernameMatch || emailMatch)) {
                userData = {
                  id: idMatch[1],
                  username: usernameMatch ? usernameMatch[1] : '',
                  email: emailMatch ? emailMatch[1] : '',
                  usertype: usertypeMatch ? usertypeMatch[1] : ''
                };
                console.log('[Cadet Help] ✅ Extracted user data from "var me" pattern using regex');
                break;
              }
            }
          }
        }
      }
      
      if (userData && userData.id) {
        // Found via var me pattern, break out of script loop
        break;
      }
      
      // Second, try to find a complete JSON object starting with "id"
      // This matches the exact format: "id": "655f97ed5bcf47f9c40c141e", "username": "Max", ...
      const idPattern = /"id"\s*:\s*"([^"]+)"/;
      const idMatch = text.match(idPattern);
      
      if (idMatch) {
        console.log(`[Cadet Help] Found ID pattern in script ${i}:`, idMatch[1]);
        
        // Try to extract the full object - look for opening brace before "id" and closing brace after
        // Find the position of the "id" field
        const idPos = text.indexOf(idMatch[0]);
        
        // Look backwards for opening brace
        let startPos = idPos;
        let braceCount = 0;
        let foundStart = false;
        for (let j = idPos; j >= 0; j--) {
          if (text[j] === '}') braceCount++;
          if (text[j] === '{') {
            braceCount--;
            if (braceCount === 0) {
              startPos = j;
              foundStart = true;
              break;
            }
          }
        }
        
        // Look forwards for closing brace
        let endPos = idPos;
        braceCount = 0;
        let foundEnd = false;
        for (let j = idPos; j < text.length; j++) {
          if (text[j] === '{') braceCount++;
          if (text[j] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endPos = j + 1;
              foundEnd = true;
              break;
            }
          }
        }
        
        if (foundStart && foundEnd) {
          let jsonStr = text.substring(startPos, endPos);
          console.log(`[Cadet Help] Extracted JSON string (length: ${jsonStr.length})`);
          
          // Try to find where the actual JSON object ends (might be followed by JS code)
          // Look for the closing brace that matches our opening brace
          let braceCount = 0;
          let actualEndPos = -1;
          for (let k = 0; k < jsonStr.length; k++) {
            if (jsonStr[k] === '{') braceCount++;
            if (jsonStr[k] === '}') {
              braceCount--;
              if (braceCount === 0) {
                actualEndPos = k + 1;
                break;
              }
            }
          }
          
          if (actualEndPos > 0) {
            jsonStr = jsonStr.substring(0, actualEndPos);
          }
          
          // Clean up: remove anything after the last closing brace
          const lastBrace = jsonStr.lastIndexOf('}');
          if (lastBrace > 0 && lastBrace < jsonStr.length - 1) {
            jsonStr = jsonStr.substring(0, lastBrace + 1);
          }
          
          // Try direct parse first
          try {
            userData = JSON.parse(jsonStr);
            if (userData && userData.id && (userData.username || userData.email)) {
              console.log('[Cadet Help] ✅ Successfully parsed user data:', {
                id: userData.id,
                username: userData.username,
                email: userData.email
              });
              break;
            }
          } catch (parseError) {
            console.log('[Cadet Help] JSON parse error, trying regex extraction...', parseError.message.substring(0, 50));
            
            // Immediately try regex extraction as fallback
            const idMatch2 = jsonStr.match(/"id"\s*:\s*"([^"]+)"/);
            const usernameMatch = jsonStr.match(/"username"\s*:\s*"([^"]*)"/);
            const emailMatch = jsonStr.match(/"email"\s*:\s*"([^"]*)"/);
            const usertypeMatch = jsonStr.match(/"usertype"\s*:\s*"([^"]*)"/);
            
            if (idMatch2 && (usernameMatch || emailMatch)) {
              userData = {
                id: idMatch2[1],
                username: usernameMatch ? usernameMatch[1] : '',
                email: emailMatch ? emailMatch[1] : '',
                usertype: usertypeMatch ? usertypeMatch[1] : ''
              };
              console.log('[Cadet Help] ✅ Extracted user data from regex patterns');
              break;
            }
            
            // If regex extraction didn't work, try fixing JSON
            try {
              // Remove trailing commas
              let fixedJson = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
              // Remove comments (though JSON shouldn't have them)
              fixedJson = fixedJson.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
              // Try to handle unquoted keys
              fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
              // Remove anything after the last valid closing brace
              const lastBrace2 = fixedJson.lastIndexOf('}');
              if (lastBrace2 > 0) {
                fixedJson = fixedJson.substring(0, lastBrace2 + 1);
              }
              
              userData = JSON.parse(fixedJson);
              if (userData && userData.id && (userData.username || userData.email)) {
                console.log('[Cadet Help] ✅ Successfully parsed fixed user data');
                break;
              }
            } catch (e2) {
              console.log('[Cadet Help] All extraction methods failed for this script');
            }
          }
        }
      }
      
      // Try to find complete user object with all the fields mentioned
      const userObjectPattern = /\{\s*"id"\s*:\s*"[^"]+"\s*,\s*"username"\s*:\s*"[^"]+"\s*,\s*"usertype"\s*:\s*"[^"]+"\s*,[\s\S]*?\}/;
      const userMatch = text.match(userObjectPattern);
      if (userMatch && !userData) {
        try {
          userData = JSON.parse(userMatch[0]);
          if (userData.id && userData.username) {
            console.log('[Cadet Help] Found complete user data in script tag');
            break;
          }
        } catch (e) {
          // Try to extract more carefully
          try {
            // Look for the pattern more flexibly
            const flexibleMatch = text.match(/\{\s*"id"\s*:\s*"[^"]+"[\s\S]{100,5000}?\}/);
            if (flexibleMatch) {
              userData = JSON.parse(flexibleMatch[0]);
              if (userData.id) {
                console.log('[Cadet Help] Found user data with flexible pattern');
                break;
              }
            }
          } catch (e2) {}
        }
      }
      
      // Look for patterns like: var user = {...} or const user = {...} or let user = {...}
      const varPatterns = [
        /(?:var|let|const)\s+user\s*=\s*({[\s\S]*?"id"[\s\S]*?});/,
        /(?:var|let|const)\s+userData\s*=\s*({[\s\S]*?"id"[\s\S]*?});/,
        /(?:var|let|const)\s+currentUser\s*=\s*({[\s\S]*?"id"[\s\S]*?});/,
        /window\.user\s*=\s*({[\s\S]*?"id"[\s\S]*?});/,
        /window\.userData\s*=\s*({[\s\S]*?"id"[\s\S]*?});/
      ];
      
      for (const pattern of varPatterns) {
        const match = text.match(pattern);
        if (match && !userData) {
          try {
            // Try to extract and parse the JSON object
            let jsonStr = match[1];
            // Find the matching closing brace
            let braceCount = 0;
            let endPos = -1;
            for (let j = 0; j < jsonStr.length; j++) {
              if (jsonStr[j] === '{') braceCount++;
              if (jsonStr[j] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endPos = j + 1;
                  break;
                }
              }
            }
            if (endPos > 0) {
              jsonStr = jsonStr.substring(0, endPos);
              userData = JSON.parse(jsonStr);
              if (userData && userData.id) {
                console.log('[Cadet Help] Found user data via variable pattern');
                break;
              }
            }
          } catch (e) {
            console.log('[Cadet Help] Variable pattern parse failed:', e.message);
          }
        }
      }
      
      if (userData && userData.id) break;
      
      // Look for user data patterns in script content
      // Common patterns: window.userData, lw.user, userInfo, etc.
      // Try to find JSON-like user data
      const userMatch2 = text.match(/(?:user|userData|userInfo|currentUser)\s*[:=]\s*({[^}]+"id"[^}]+})/);
      if (userMatch2 && !userData) {
        try {
          userData = JSON.parse(userMatch2[1]);
          if (userData.id) {
            console.log('[Cadet Help] Found user data in script tag');
            break;
          }
        } catch (e) {
          // Try to extract more complete JSON
          const fullMatch = text.match(/(?:user|userData|userInfo|currentUser)\s*[:=]\s*({[\s\S]*?"id"[\s\S]*?})/);
          if (fullMatch) {
            try {
              // Try to parse with better extraction
              let jsonStr = fullMatch[1];
              // Find matching braces
              let braceCount = 0;
              let endPos = -1;
              for (let j = 0; j < jsonStr.length; j++) {
                if (jsonStr[j] === '{') braceCount++;
                if (jsonStr[j] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    endPos = j + 1;
                    break;
                  }
                }
              }
              if (endPos > 0) {
                jsonStr = jsonStr.substring(0, endPos);
                jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                userData = JSON.parse(jsonStr);
                if (userData.id) break;
              }
            } catch (e2) {}
          }
        }
      }
      
      // Look for window.lw or similar global objects
      if (text.includes('window.lw') || text.includes('lw.user') || text.includes('window.user')) {
        try {
          // Try to access window.lw if available
          if (typeof window.lw !== 'undefined' && window.lw.user) {
            userData = window.lw.user;
            console.log('[Cadet Help] Found user data in window.lw');
            break;
          }
          // Try window.user
          if (typeof window.user !== 'undefined') {
            userData = window.user;
            console.log('[Cadet Help] Found user data in window.user');
            break;
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[Cadet Help] Error parsing script:', e);
    }
  }
  
  // Method 2: Check localStorage
  if (!userData) {
    try {
      const storageKeys = Object.keys(localStorage);
      for (const key of storageKeys) {
        if (key.toLowerCase().includes('user') || key.toLowerCase().includes('auth')) {
          try {
            const value = localStorage.getItem(key);
            const parsed = JSON.parse(value);
            if (parsed && parsed.id && parsed.username) {
              userData = parsed;
              console.log('[Cadet Help] Found user data in localStorage:', key);
              break;
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('[Cadet Help] Error accessing localStorage:', e);
    }
  }
  
  // Method 3: Check sessionStorage
  if (!userData) {
    try {
      const storageKeys = Object.keys(sessionStorage);
      for (const key of storageKeys) {
        if (key.toLowerCase().includes('user') || key.toLowerCase().includes('auth')) {
          try {
            const value = sessionStorage.getItem(key);
            const parsed = JSON.parse(value);
            if (parsed && parsed.id && parsed.username) {
              userData = parsed;
              console.log('[Cadet Help] Found user data in sessionStorage:', key);
              break;
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('[Cadet Help] Error accessing sessionStorage:', e);
    }
  }
  
  // Method 4: Try to access window objects directly
  if (!userData) {
    try {
      // Common LearnWorlds patterns - check these directly
      const windowChecks = [
        () => window.lw?.user,
        () => window.user,
        () => window.userData,
        () => window.currentUser,
        () => window.userInfo,
        () => window.__USER_DATA__,
        () => window.__INITIAL_STATE__?.user,
        () => window.app?.user,
        () => window.store?.getState?.()?.user,
        () => window.LW?.user,
        () => window.learnworlds?.user,
        () => window.lwUser,
        () => window.currentUserData
      ];
      
      for (const check of windowChecks) {
        try {
          const value = check();
          if (value && value.id && (value.username || value.email)) {
            userData = value;
            console.log('[Cadet Help] ✅ Found user data in window object');
            break;
          }
        } catch (e) {}
      }
      
      // Also check for data in common LearnWorlds global variables
      if (!userData) {
        // Check all window properties that might contain user data
        for (const key in window) {
          try {
            const value = window[key];
            if (value && typeof value === 'object' && value.id && (value.username || value.email)) {
              // Make sure it looks like user data
              if (value.usertype || value.userRole || value.email) {
                userData = value;
                console.log(`[Cadet Help] ✅ Found user data in window.${key}`);
                break;
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('[Cadet Help] Error accessing window objects:', e);
    }
  }
  
  // Method 5: Listen for network requests that might contain user data
  // This will be handled by intercepting fetch/XHR if needed
  
  return userData;
}

// Function to store user data
function storeUserData(userData) {
  if (!userData || !userData.id) {
    console.warn('[Cadet Help] Invalid user data, not storing. Data:', userData);
    return;
  }
  
  console.log('[Cadet Help] Storing user data:', {
    id: userData.id,
    username: userData.username,
    email: userData.email
  });
  
  // Clean and structure the data
  const cleanUserData = {
    id: userData.id,
    username: userData.username || '',
    email: userData.email || '',
    usertype: userData.usertype || '',
    userRole: userData.userRole || '',
    userPermissions: userData.userPermissions || [],
    parentRole: userData.parentRole || '',
    phone: userData.phone || '',
    address: userData.address || '',
    country: userData.country || '',
    company: userData.company || '',
    website: userData.website || '',
    birthday: userData.birthday || '',
    university: userData.university || '',
    graduation_date: userData.graduation_date || '',
    company_size: userData.company_size || '',
    profession: userData.profession || '',
    country_dropdown: userData.country_dropdown || '',
    created: userData.created || null,
    isInstructorIn: userData.isInstructorIn || null,
    isModeratorIn: userData.isModeratorIn || [],
    isAInstructor: userData.isAInstructor || false,
    isAffiliate: userData.isAffiliate || false,
    groups: userData.groups || [],
    popups: userData.popups || {},
    lastUpdated: Date.now()
  };
  
  // Store in chrome.storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    console.log('[Cadet Help] Attempting to store user data in chrome.storage...');
    chrome.storage.local.set({ 
      learnworldsUserData: cleanUserData 
    }, () => {
      if (chrome.runtime && chrome.runtime.lastError) {
        console.error('[Cadet Help] ❌ Error storing user data:', chrome.runtime.lastError);
      } else {
        console.log('[Cadet Help] ✅ User data stored successfully:', cleanUserData.username || cleanUserData.id);
        
        // Verify it was stored immediately
        chrome.storage.local.get(['learnworldsUserData'], (result) => {
          if (result.learnworldsUserData) {
            console.log('[Cadet Help] ✅ Verified user data in storage:', {
              id: result.learnworldsUserData.id,
              username: result.learnworldsUserData.username,
              email: result.learnworldsUserData.email
            });
            
            // Also check all keys to see what's in storage
            chrome.storage.local.get(null, (allData) => {
              console.log('[Cadet Help] All storage keys:', Object.keys(allData));
            });
          } else {
            console.error('[Cadet Help] ❌ User data not found in storage after saving!');
            console.error('[Cadet Help] Storage result:', result);
          }
        });
      }
      
      // Notify background script
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'USER_DATA_UPDATED',
          userData: cleanUserData
        }).catch(err => {
          console.log('[Cadet Help] Could not send message to background:', err);
        });
      }
    });
  } else {
    console.error('[Cadet Help] Chrome storage not available!');
    console.error('[Cadet Help] chrome:', typeof chrome);
    console.error('[Cadet Help] chrome.storage:', typeof chrome?.storage);
    console.error('[Cadet Help] chrome.storage.local:', typeof chrome?.storage?.local);
  }
}

// Function to intercept fetch requests for user data
function interceptNetworkRequests() {
  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).then(response => {
      // Clone response to read it
      const clonedResponse = response.clone();
      
      // Check if response might contain user data
      const url = args[0];
      if (typeof url === 'string' && (
        url.includes('/user') || 
        url.includes('/me') || 
        url.includes('/profile') ||
        url.includes('/auth')
      )) {
        clonedResponse.json().then(data => {
          if (data && (data.id || data.user?.id)) {
            const userData = data.user || data;
            if (userData.id) {
              console.log('[Cadet Help] Found user data in fetch response');
              storeUserData(userData);
            }
          }
        }).catch(() => {});
      }
      
      return response;
    });
  };
  
  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._url && (
      this._url.includes('/user') || 
      this._url.includes('/me') || 
      this._url.includes('/profile') ||
      this._url.includes('/auth')
    )) {
      this.addEventListener('load', function() {
        try {
          const response = JSON.parse(this.responseText);
          if (response && (response.id || response.user?.id)) {
            const userData = response.user || response;
            if (userData.id) {
              console.log('[Cadet Help] Found user data in XHR response');
              storeUserData(userData);
            }
          }
        } catch (e) {}
      });
    }
    return originalSend.apply(this, args);
  };
}

// Main function to extract and store user data
function captureUserData() {
  console.log('[Cadet Help] Attempting to capture user data...');
  console.log('[Cadet Help] Current URL:', window.location.href);
  console.log('[Cadet Help] Document ready state:', document.readyState);
  console.log('[Cadet Help] Is /start page:', window.location.pathname.includes('/start'));
  
  // Try immediate extraction
  let userData = extractUserData();
  
  if (userData && userData.id) {
    console.log('[Cadet Help] ✅ Found user data on first try');
    storeUserData(userData);
  } else {
    console.log('[Cadet Help] User data not found on first try, retrying...');
    
    // Multiple retries with increasing delays for /start page
    const retries = [1000, 2000, 3000, 5000];
    retries.forEach((delay, index) => {
      setTimeout(() => {
        console.log(`[Cadet Help] Retry attempt ${index + 1} after ${delay}ms`);
        userData = extractUserData();
        if (userData && userData.id) {
          console.log(`[Cadet Help] ✅ Found user data on retry ${index + 1}`);
          storeUserData(userData);
        } else if (index === retries.length - 1) {
          console.log('[Cadet Help] ❌ User data not found after all retries');
          console.log('[Cadet Help] Checking if user is logged in...');
          
          // Check if there's any indication user is logged in
          const bodyText = document.body ? document.body.textContent : '';
          if (bodyText.includes('login') || bodyText.includes('sign in') || bodyText.includes('Sign in')) {
            console.log('[Cadet Help] ⚠️ User might not be logged in');
          } else {
            console.log('[Cadet Help] ⚠️ User appears to be logged in but data not found');
            console.log('[Cadet Help] Try checking the page source for user data');
          }
        }
      }, delay);
    });
  }
}

// Set up network interception
interceptNetworkRequests();

// Try to capture user data on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', captureUserData);
} else {
  captureUserData();
}

// Multiple attempts with different delays, especially for /start page
const isStartPage = window.location.pathname.includes('/start');
const delays = isStartPage 
  ? [500, 1000, 2000, 3000, 5000, 7000, 10000] // More attempts for /start
  : [1000, 3000, 5000]; // Standard attempts for other pages

delays.forEach((delay, index) => {
  setTimeout(() => {
    console.log(`[Cadet Help] Delayed capture attempt ${index + 1} (${delay}ms)`);
    captureUserData();
  }, delay);
});

// Listen for navigation changes (SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('[Cadet Help] URL changed to:', url);
    setTimeout(captureUserData, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Also listen for popstate (back/forward)
window.addEventListener('popstate', () => {
  console.log('[Cadet Help] Popstate event - URL changed');
  setTimeout(captureUserData, 1000);
});

// Listen for storage changes (in case user data is stored in localStorage)
window.addEventListener('storage', (e) => {
  if (e.key && (e.key.toLowerCase().includes('user') || e.key.toLowerCase().includes('auth'))) {
    console.log('[Cadet Help] Storage changed:', e.key);
    setTimeout(captureUserData, 500);
  }
});

// Monitor script additions - some scripts might set user data after execution
const originalAppendChild = Node.prototype.appendChild;
Node.prototype.appendChild = function(child) {
  const result = originalAppendChild.call(this, child);
  if (child.tagName === 'SCRIPT' && child.textContent && child.textContent.length > 100) {
    // Script was added, check if it contains user data after a short delay
    setTimeout(() => {
      const userData = extractUserData();
      if (userData && userData.id) {
        console.log('[Cadet Help] ✅ Found user data in dynamically added script');
        storeUserData(userData);
      }
    }, 200);
  }
  return result;
};

// Expose debug function to console
window.debugLearnWorldsUser = function() {
  console.log('=== LEARNWORLDS USER DEBUG ===');
  console.log('Current URL:', window.location.href);
  console.log('Is /start page:', window.location.pathname.includes('/start'));
  console.log('Document ready state:', document.readyState);
  
  // Check storage
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(null, (allData) => {
      console.log('=== ALL STORAGE DATA ===');
      console.log('All keys:', Object.keys(allData));
      console.log('learnworldsUserData:', allData.learnworldsUserData);
      console.log('xpState:', allData.xpState);
    });
  } else {
    console.log('Chrome storage not available');
  }
  
  // Check window objects
  console.log('=== WINDOW OBJECTS ===');
  console.log('window.user:', window.user);
  console.log('window.userData:', window.userData);
  console.log('window.lw:', window.lw);
  console.log('window.LW:', window.LW);
  console.log('window.learnworlds:', window.learnworlds);
  
  // Try extraction
  console.log('=== EXTRACTION TEST ===');
  const userData = extractUserData();
  console.log('Extracted user data:', userData);
  
  if (userData && userData.id) {
    console.log('✅ User data found! Attempting to store...');
    storeUserData(userData);
  } else {
    console.log('❌ No user data extracted');
  }
  
  // Show all script tags with potential user data
  const scripts = document.querySelectorAll('script');
  console.log(`=== SCRIPT TAGS (${scripts.length} total) ===`);
  let foundScripts = 0;
  scripts.forEach((script, i) => {
    const text = script.textContent || script.innerHTML;
    if (text && text.length > 50) {
      // Check for user data patterns
      if (text.includes('"id"') && (text.includes('username') || text.includes('email'))) {
        foundScripts++;
        console.log(`\n--- Script ${i} (${script.src || 'inline'}) ---`);
        console.log('Length:', text.length);
        // Find the ID
        const idMatch = text.match(/"id"\s*:\s*"([^"]+)"/);
        if (idMatch) {
          console.log('Found ID:', idMatch[1]);
          // Show context around the ID
          const idPos = text.indexOf(idMatch[0]);
          const context = text.substring(Math.max(0, idPos - 100), Math.min(text.length, idPos + 500));
          console.log('Context:', context);
        }
      }
    }
  });
  console.log(`\nFound ${foundScripts} scripts with potential user data`);
};

// Manual test function - can be called from console to test extraction
window.testUserExtraction = function() {
  console.log('[Cadet Help] === MANUAL EXTRACTION TEST ===');
  const userData = extractUserData();
  if (userData && userData.id) {
    console.log('[Cadet Help] ✅ Found user data:', userData);
    storeUserData(userData);
    return userData;
  } else {
    console.log('[Cadet Help] ❌ No user data found');
    console.log('[Cadet Help] Try running debugLearnWorldsUser() for more details');
    return null;
  }
};

// Also try to manually store test data if needed
window.manualStoreUserData = function(testData) {
  if (!testData || !testData.id) {
    console.error('[Cadet Help] Invalid test data. Provide an object with at least an id field.');
    console.log('[Cadet Help] Example: manualStoreUserData({id: "123", username: "Test", email: "test@example.com"})');
    return;
  }
  console.log('[Cadet Help] Manually storing test data:', testData);
  storeUserData(testData);
};

console.log('[Cadet Help] LearnWorlds user capture script initialized');
console.log('[Cadet Help] Run debugLearnWorldsUser() in console to debug');
console.log('[Cadet Help] Run testUserExtraction() to manually test extraction');

