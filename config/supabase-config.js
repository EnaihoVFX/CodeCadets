// Supabase Configuration
// ⚠️ IMPORTANT: Use the ANON/PUBLIC key, NOT the service_role secret key!
//
// STEP 1: Go to https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api
// STEP 2: Copy the "anon" "public" key (starts with "eyJ...")
// STEP 3: Paste it below, replacing "YOUR-ANON-KEY-HERE"

const SUPABASE_CONFIG = {
  // Your Supabase Project URL (already configured ✅)
  supabaseUrl: 'https://bpxoowtrrvxdbazqtkez.supabase.co',
  
  // ✅ Anon/Public key configured
  // This is safe for client-side use (Chrome extension)
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweG9vd3RycnZ4ZGJhenF0a2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODU1OTIsImV4cCI6MjA3OTE2MTU5Mn0.haaHAQno_WPBpAbv8T85QJTZ9j2VKq_E7KUG6Ci32BI',
  
  // Enable Supabase integration
  useSupabase: true
};

// Helper function to check if config is valid
function isSupabaseConfigured() {
  return SUPABASE_CONFIG.supabaseKey && 
         SUPABASE_CONFIG.supabaseKey !== 'YOUR-ANON-KEY-HERE' &&
         SUPABASE_CONFIG.supabaseKey.length > 50; // Anon keys are typically long
}

// Initialize Supabase when this file loads
async function initializeSupabaseConfig() {
  try {
    // Check if config is valid first
    if (!isSupabaseConfigured()) {
      console.warn('[Supabase] ⚠️ API key not configured yet!');
      console.warn('[Supabase] Get your anon key from: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api');
      console.warn('[Supabase] Then update supabase-config.js with your key');
      return false;
    }
    
    if (typeof databaseService !== 'undefined') {
      const result = await databaseService.initializeFirebase({
        supabaseUrl: SUPABASE_CONFIG.supabaseUrl,
        supabaseKey: SUPABASE_CONFIG.supabaseKey,
        useSupabase: SUPABASE_CONFIG.useSupabase
      });
      
      if (result) {
        console.log('[Supabase] ✅ Configuration loaded successfully!');
        console.log('[Supabase] Project URL:', SUPABASE_CONFIG.supabaseUrl);
        console.log('[Supabase] API key configured:', SUPABASE_CONFIG.supabaseKey.substring(0, 20) + '...');
      } else {
        console.error('[Supabase] ❌ Initialization failed - check your API key');
      }
      return result;
    } else {
      console.warn('[Supabase] Database service not available yet');
      return false;
    }
  } catch (error) {
    console.error('[Supabase] Initialization error:', error);
    return false;
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for database service to be available
    setTimeout(initializeSupabaseConfig, 100);
  });
} else {
  // DOM already loaded
  setTimeout(initializeSupabaseConfig, 100);
}

// Also try immediately if database service is already available
if (typeof databaseService !== 'undefined') {
  initializeSupabaseConfig();
}

