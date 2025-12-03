// Supabase Configuration Example
// Copy this file and rename to supabase-config.js
// Replace the values with your actual Supabase credentials

// Initialize Supabase when extension loads
async function initializeSupabase() {
  try {
    // Get your credentials from Supabase Dashboard:
    // Settings → API → Project URL and anon/public key
    
    await databaseService.initializeFirebase({
      supabaseUrl: 'https://YOUR-PROJECT-ID.supabase.co',  // Replace with your Project URL
      supabaseKey: 'YOUR-ANON-KEY-HERE',  // Replace with your anon/public key
      useSupabase: true
    });
    
    console.log('[Extension] Supabase initialized successfully!');
    return true;
  } catch (error) {
    console.error('[Extension] Failed to initialize Supabase:', error);
    return false;
  }
}

// Call this when your extension loads
// You can add this to popup.js or background.js

// Example usage in popup.js:
/*
// At the top of popup.js, after other initialization
(async () => {
  await initializeSupabase();
})();
*/

// Example usage in background.js:
/*
// In background.js, add this to chrome.runtime.onInstalled
chrome.runtime.onInstalled.addListener(async () => {
  await initializeSupabase();
});
*/

// Or call it manually when user clicks a "Connect to Supabase" button










