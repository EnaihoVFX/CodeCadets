// Database service for remote storage and user-specific data management
// Supports both local Chrome storage (user-specific) and optional Firebase Firestore sync

class DatabaseService {
  constructor() {
    this.userId = null;
    this.userData = null;
    this.firebaseConfig = null;
    this.db = null;
    this.useRemoteStorage = false;
    this.autoSyncInterval = null;
    this.autoSyncEnabled = false;
    this.syncDebounceTimer = null;
    this.lastSyncTime = null;
    this.syncInProgress = false;
  }

  // Map camelCase data keys to lowercase Postgres column names
  getColumnName(dataKey) {
    const columnNameMap = {
      'xpState': 'xpstate',
      'achievements': 'achievements',
      'completion_data': 'completion_data',
      'avatarImage': 'avatarimage',
      'avatarData': 'avatardata'
    };
    if (typeof dataKey !== 'string') {
      return dataKey;
    }
    return columnNameMap[dataKey] || dataKey.toLowerCase();
  }

  // Initialize the database service with user ID
  async initialize() {
    try {
      // Get user data from storage
      const result = await chrome.storage.local.get(['learnworldsUserData']);
      if (result.learnworldsUserData && result.learnworldsUserData.id) {
        this.userId = result.learnworldsUserData.id;
        this.userData = result.learnworldsUserData;
        console.log('[Database] Initialized with user ID:', this.userId);
        return true;
      } else {
        console.warn('[Database] No user ID found, using local storage only');
        return false;
      }
    } catch (error) {
      console.error('[Database] Initialization error:', error);
      return false;
    }
  }

  // Get user-specific storage key
  getUserKey(key) {
    if (this.userId) {
      return `user_${this.userId}_${key}`;
    }
    // Fallback to non-user-specific key if no user ID
    return key;
  }

  // Save XP state (user-specific)
  async saveXPState(xpState) {
    const key = this.getUserKey('xpState');
    
    // Save to local storage
    await chrome.storage.local.set({ [key]: xpState });
    
    // If remote storage is enabled, sync to remote
    if (this.useRemoteStorage && this.apiEndpoint && this.userId) {
      try {
        await this.syncToRemote('xpState', xpState);
        // Trigger debounced full sync to ensure consistency
        this.debouncedSync();
      } catch (error) {
        console.error('[Database] Failed to sync XP state to remote:', error);
      }
    }
  }

  // Load XP state (user-specific)
  async loadXPState() {
    const key = this.getUserKey('xpState');
    
    try {
      const result = await chrome.storage.local.get([key]);
      let xpState = result[key] || { xp: 0, level: 1, xpForNextLevel: 100 };
      
      // If remote storage is enabled, try to sync from remote
      if (this.useRemoteStorage && this.apiEndpoint && this.userId) {
        try {
          const remoteData = await this.syncFromRemote('xpState');
          if (remoteData) {
            // Merge with local data (prefer remote if it exists)
            xpState = { ...xpState, ...remoteData };
            await chrome.storage.local.set({ [key]: xpState });
          }
        } catch (error) {
          console.error('[Database] Failed to sync XP state from remote:', error);
        }
      }
      
      return xpState;
    } catch (error) {
      console.error('[Database] Failed to load XP state:', error);
      return { xp: 0, level: 1, xpForNextLevel: 100 };
    }
  }

  // Save achievements (user-specific)
  async saveAchievements(achievements) {
    const key = this.getUserKey('achievements');
    
    // Save to local storage
    await chrome.storage.local.set({ [key]: achievements });
    
    // If remote storage is enabled, sync to remote
    if (this.useRemoteStorage && this.apiEndpoint && this.userId) {
      try {
        await this.syncToRemote('achievements', achievements);
        // Trigger debounced full sync to ensure consistency
        this.debouncedSync();
      } catch (error) {
        console.error('[Database] Failed to sync achievements to remote:', error);
      }
    }
  }

  // Load achievements (user-specific)
  async loadAchievements() {
    const key = this.getUserKey('achievements');
    
    try {
      const result = await chrome.storage.local.get([key]);
      let achievements = result[key] || {};
      
      // If remote storage is enabled, try to sync from remote
      if (this.useRemoteStorage && this.apiEndpoint && this.userId) {
        try {
          const remoteData = await this.syncFromRemote('achievements');
          if (remoteData) {
            // Merge achievements (keep both local and remote)
            achievements = { ...achievements, ...remoteData };
            await chrome.storage.local.set({ [key]: achievements });
          }
        } catch (error) {
          console.error('[Database] Failed to sync achievements from remote:', error);
        }
      }
      
      return achievements;
    } catch (error) {
      console.error('[Database] Failed to load achievements:', error);
      return {};
    }
  }

  // Save completion data (user-specific)
  async saveCompletionData(completionKey, data) {
    const key = this.getUserKey(completionKey);
    
    // Save to local storage
    await chrome.storage.local.set({ [key]: data });
    
    // If remote storage is enabled, sync to remote
    if (this.useRemoteStorage && this.apiEndpoint && this.userId) {
      try {
        await this.syncToRemote(completionKey, data);
        // Trigger debounced full sync to ensure consistency
        this.debouncedSync();
      } catch (error) {
        console.error('[Database] Failed to sync completion data to remote:', error);
      }
    }
  }

  // Load completion data (user-specific)
  async loadCompletionData(completionKey) {
    const key = this.getUserKey(completionKey);
    
    try {
      const result = await chrome.storage.local.get([key]);
      let data = result[key] || {};
      
      // If remote storage is enabled, try to sync from remote
      if (this.useRemoteStorage && this.apiEndpoint && this.userId) {
        try {
          const remoteData = await this.syncFromRemote(completionKey);
          if (remoteData) {
            // Merge data
            data = { ...data, ...remoteData };
            await chrome.storage.local.set({ [key]: data });
          }
        } catch (error) {
          console.error('[Database] Failed to sync completion data from remote:', error);
        }
      }
      
      return data;
    } catch (error) {
      console.error('[Database] Failed to load completion data:', error);
      return {};
    }
  }

  // Initialize Supabase/Firebase (optional - can be enabled later via backend API)
  async initializeFirebase(config) {
    try {
      // Support both Supabase (recommended) and custom API endpoints
      this.apiEndpoint = config.apiEndpoint || config.supabaseUrl || 'https://your-project.supabase.co/rest/v1';
      this.apiKey = config.apiKey || config.supabaseKey || null;
      this.useSupabase = config.useSupabase !== false && (this.apiEndpoint.includes('supabase.co') || config.useSupabase === true);
      
      // Validate configuration
      if (!this.apiEndpoint || this.apiEndpoint.includes('your-project') || this.apiEndpoint === 'https://your-api-endpoint.com/api') {
        console.warn('[Database] Invalid API endpoint. Remote storage disabled.');
        this.useRemoteStorage = false;
        return false;
      }
      
      if (!this.apiKey || this.apiKey === 'YOUR-ANON-KEY-HERE') {
        console.warn('[Database] API key not configured. Remote storage disabled.');
        this.useRemoteStorage = false;
        return false;
      }
      
      // Add /rest/v1 to Supabase URL if not present
      if (this.useSupabase && !this.apiEndpoint.includes('/rest/v1')) {
        this.apiEndpoint = `${this.apiEndpoint}/rest/v1`;
      }
      
      this.useRemoteStorage = true;
      
      if (this.useSupabase) {
        console.log('[Database] Supabase remote storage initialized');
        console.log('[Database] Endpoint:', this.apiEndpoint);
      } else {
        console.log('[Database] Remote storage initialized with API endpoint');
      }
      
      // Start auto-sync if enabled
      this.startAutoSync();
      
      return true;
    } catch (error) {
      console.error('[Database] Remote storage initialization error:', error);
      this.useRemoteStorage = false;
      return false;
    }
  }

  // Sync data to remote database via API (Supabase or custom)
  async syncToRemote(dataKey, data) {
    if (!this.useRemoteStorage || !this.apiEndpoint || !this.userId) {
      return;
    }
    
    try {
      if (this.useSupabase) {
        // Use Supabase REST API - upsert user data
        // PostgreSQL converts unquoted identifiers to lowercase
        // So use lowercase column names: userid, xpstate, etc.
        const lowerDataKey = this.getColumnName(dataKey);
        
        const payload = {
          userid: this.userId,  // Use lowercase userid
          [lowerDataKey]: data,
          updated_at: new Date().toISOString()
        };
        
        let response = await fetch(`${this.apiEndpoint}/user_data?userid=eq.${encodeURIComponent(this.userId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.warn('[Database] POST failed, trying PATCH...', errorText);
          
          // Try PATCH if POST fails (for updates)
          const patchPayloadLower = {
            [lowerDataKey]: data,
            updated_at: new Date().toISOString()
          };
          const patchPayloadOriginal = {
            [dataKey]: data,
            updated_at: new Date().toISOString()
          };
          
          let patchResponse = await fetch(`${this.apiEndpoint}/user_data?userid=eq.${encodeURIComponent(this.userId)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': this.apiKey,
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(patchPayloadLower)
          });
          
          // If userid fails, try userId (camelCase)
          if (!patchResponse.ok && patchResponse.status === 400) {
            console.warn('[Database] userid column not found, trying userId...');
            patchResponse = await fetch(`${this.apiEndpoint}/user_data?userId=eq.${encodeURIComponent(this.userId)}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': this.apiKey,
                'Authorization': `Bearer ${this.apiKey}`
              },
              body: JSON.stringify(patchPayloadOriginal)
            });
            
            // If that fails, try user_id
            if (!patchResponse.ok && patchResponse.status === 400) {
              console.warn('[Database] userId column not found, trying user_id...');
              patchResponse = await fetch(`${this.apiEndpoint}/user_data?user_id=eq.${encodeURIComponent(this.userId)}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': this.apiKey,
                  'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(patchPayloadLower)
              });
            }
          }
          
          if (!patchResponse.ok) {
            const patchErrorText = await patchResponse.text();
            console.error('[Database] PATCH error details:', patchErrorText);
            throw new Error(`Supabase error: ${patchResponse.status} - ${patchErrorText}`);
          }
          response = patchResponse;
        }
      } else {
        // Use custom API endpoint
        const response = await fetch(`${this.apiEndpoint}/users/${this.userId}/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
          },
          body: JSON.stringify({
            [dataKey]: data,
            userId: this.userId
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
      }
      
      console.log('[Database] Synced to remote:', dataKey);
    } catch (error) {
      console.error('[Database] Remote sync error:', error);
      // Don't throw - allow local storage to work even if remote fails
    }
  }

  // Sync data from remote database via API (Supabase or custom)
  async syncFromRemote(dataKey) {
    if (!this.useRemoteStorage || !this.apiEndpoint || !this.userId) {
      return null;
    }
    
    try {
      if (this.useSupabase) {
        // Use Supabase REST API - select user data
        // Try both userId (camelCase) and user_id (snake_case) for compatibility
        let response;
        let errorDetails = null;
        
        // PostgreSQL converts unquoted identifiers to lowercase
        // So userId becomes userid, xpState becomes xpstate, etc.
        // Try lowercase column names first (most common case)
        const lowerDataKey = this.getColumnName(dataKey);
        
        try {
          // Try userid (lowercase) first - this is what PostgreSQL creates from unquoted userId
          response = await fetch(`${this.apiEndpoint}/user_data?userid=eq.${encodeURIComponent(this.userId)}&select=${encodeURIComponent(lowerDataKey)}`, {
            method: 'GET',
            headers: {
              'apikey': this.apiKey,
              'Authorization': `Bearer ${this.apiKey}`
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            errorDetails = errorText;
            
            // If userid fails, try userId (camelCase with quotes) or user_id (snake_case)
            if (response.status === 400) {
              console.warn('[Database] userid column not found, trying userId...');
              response = await fetch(`${this.apiEndpoint}/user_data?userId=eq.${encodeURIComponent(this.userId)}&select=${encodeURIComponent(dataKey)}`, {
                method: 'GET',
                headers: {
                  'apikey': this.apiKey,
                  'Authorization': `Bearer ${this.apiKey}`
                }
              });
              
              // If that fails, try user_id
              if (!response.ok && response.status === 400) {
                console.warn('[Database] userId column not found, trying user_id...');
                response = await fetch(`${this.apiEndpoint}/user_data?user_id=eq.${encodeURIComponent(this.userId)}&select=${encodeURIComponent(lowerDataKey)}`, {
                  method: 'GET',
                  headers: {
                    'apikey': this.apiKey,
                    'Authorization': `Bearer ${this.apiKey}`
                  }
                });
              }
            }
          }
        } catch (fetchError) {
          console.error('[Database] Fetch error:', fetchError);
          throw fetchError;
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            return null; // No data yet
          }
          const errorText = await response.text();
          console.error('[Database] Supabase error details:', errorText);
          throw new Error(`Supabase error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        // Try both camelCase and lowercase keys
        if (result && result.length > 0) {
          const row = result[0];
          const value = row[dataKey] || row[lowerDataKey];
          if (value) {
            console.log('[Database] Synced from remote:', dataKey);
            return value;
          }
        }
        return null;
      } else {
        // Use custom API endpoint
        const response = await fetch(`${this.apiEndpoint}/users/${this.userId}/data/${dataKey}`, {
          method: 'GET',
          headers: {
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            return null; // No data yet
          }
          throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[Database] Synced from remote:', dataKey);
        return result[dataKey] || null;
      }
    } catch (error) {
      console.error('[Database] Remote sync error:', error);
      return null;
    }
  }

  // Get all user data for profile
  async getUserProfileData() {
    if (!this.userId) {
      return null;
    }
    
    try {
      const [xpState, achievements] = await Promise.all([
        this.loadXPState(),
        this.loadAchievements()
      ]);
      
      // Get all completion data
      const allKeys = await chrome.storage.local.get(null);
      const completionData = {};
      
      const userPrefix = `user_${this.userId}_completion_`;
      for (const [key, value] of Object.entries(allKeys)) {
        if (key.startsWith(userPrefix)) {
          const completionKey = key.replace(userPrefix, '');
          completionData[completionKey] = value;
        }
      }
      
      return {
        userId: this.userId,
        userData: this.userData,
        xpState,
        achievements,
        completionData
      };
    } catch (error) {
      console.error('[Database] Failed to get user profile data:', error);
      return null;
    }
  }

  // Sync all data to remote (for manual sync)
  async syncAllToRemote() {
    if (!this.useRemoteStorage || !this.apiEndpoint || !this.userId) {
      console.warn('[Database] Cannot sync: missing remote storage config or user ID');
      return false;
    }
    
    try {
      const profileData = await this.getUserProfileData();
      if (!profileData) {
        console.warn('[Database] No profile data to sync');
        return false;
      }
      
      let response;
      if (this.useSupabase) {
        // Use Supabase REST API - upsert user data
        // PostgreSQL converts unquoted identifiers to lowercase
        // So use lowercase: userid, xpstate, achievements, completion_data
        const payload = {
          "userid": this.userId,  // Use lowercase userid
          "xpstate": profileData.xpState || {},
          "achievements": profileData.achievements || {},
          "completion_data": profileData.completionData || {},
          "updated_at": new Date().toISOString()
        };
        
        response = await fetch(`${this.apiEndpoint}/user_data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
        
        // If POST fails with 400 (column not found), try with quoted identifiers (camelCase)
        if (!response.ok && response.status === 400) {
          const errorText = await response.text();
          console.warn('[Database] userid column not found, trying userId (quoted)...', errorText);
          const payloadQuoted = {
            "userId": this.userId,
            "xpState": profileData.xpState || {},
            "achievements": profileData.achievements || {},
            "completion_data": profileData.completionData || {},
            "updated_at": new Date().toISOString()
          };
          response = await fetch(`${this.apiEndpoint}/user_data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': this.apiKey,
              'Authorization': `Bearer ${this.apiKey}`,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(payloadQuoted)
          });
        }
      } else {
        // Use custom API endpoint
        response = await fetch(`${this.apiEndpoint}/users/${this.userId}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
          },
          body: JSON.stringify(profileData)
        });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Database] Sync failed:', response.status, errorText);
        throw new Error(`Sync failed: ${response.status} - ${errorText}`);
      }
      
      console.log('[Database] Synced all data to remote');
      return true;
    } catch (error) {
      console.error('[Database] Failed to sync all data:', error);
      throw error; // Re-throw to let caller handle it
    }
  }

  // Sync all data from remote (for manual sync)
  async syncAllFromRemote() {
    if (!this.useRemoteStorage || !this.apiEndpoint || !this.userId) {
      console.warn('[Database] Cannot sync from remote: missing remote storage config or user ID');
      return false;
    }
    
    try {
      let response;
      let remoteData;
      
      if (this.useSupabase) {
        // Use Supabase REST API - get all user data
        // PostgreSQL converts unquoted identifiers to lowercase
        // Try userid (lowercase) first, then userId (quoted) as fallback
        response = await fetch(`${this.apiEndpoint}/user_data?userid=eq.${encodeURIComponent(this.userId)}`, {
          method: 'GET',
          headers: {
            'apikey': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        
        // If userid fails, try userId (quoted/camelCase)
        if (!response.ok && response.status === 400) {
          const errorText = await response.text();
          console.warn('[Database] userid column not found, trying userId...', errorText);
          response = await fetch(`${this.apiEndpoint}/user_data?userId=eq.${encodeURIComponent(this.userId)}`, {
            method: 'GET',
            headers: {
              'apikey': this.apiKey,
              'Authorization': `Bearer ${this.apiKey}`
            }
          });
          
          // If that fails, try user_id
          if (!response.ok && response.status === 400) {
            console.warn('[Database] userId column not found, trying user_id...');
            response = await fetch(`${this.apiEndpoint}/user_data?user_id=eq.${encodeURIComponent(this.userId)}`, {
              method: 'GET',
              headers: {
                'apikey': this.apiKey,
                'Authorization': `Bearer ${this.apiKey}`
              }
            });
          }
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            return false; // No remote data yet
          }
          const errorText = await response.text();
          throw new Error(`Supabase error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        if (!result || result.length === 0) {
          return false; // No data
        }
        remoteData = result[0];
        
        // Map lowercase column names back to camelCase for compatibility
        if (remoteData.xpstate && !remoteData.xpState) {
          remoteData.xpState = remoteData.xpstate;
        }
        if (remoteData.userid && !remoteData.userId) {
          remoteData.userId = remoteData.userid;
        }
      } else {
        // Use custom API endpoint
        response = await fetch(`${this.apiEndpoint}/users/${this.userId}/sync`, {
          method: 'GET',
          headers: {
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            return false; // No remote data yet
          }
          throw new Error(`API error: ${response.status}`);
        }
        
        remoteData = await response.json();
      }
      
      // Update local storage with remote data
      if (remoteData.xpState) {
        await this.saveXPState(remoteData.xpState);
      }
      
      if (remoteData.achievements) {
        await this.saveAchievements(remoteData.achievements);
      }
      
      if (remoteData.completionData) {
        for (const [key, value] of Object.entries(remoteData.completionData)) {
          await this.saveCompletionData(`completion_${key}`, value);
        }
      }
      
      console.log('[Database] Synced all data from remote');
      return true;
    } catch (error) {
      console.error('[Database] Failed to sync all data from remote:', error);
      return false;
    }
  }

  // Start automatic syncing (periodic and on visibility change)
  startAutoSync() {
    if (!this.useRemoteStorage || !this.userId || this.autoSyncEnabled) {
      return;
    }
    
    this.autoSyncEnabled = true;
    console.log('[Database] Auto-sync enabled');
    
    // Periodic sync every 5 minutes
    this.autoSyncInterval = setInterval(() => {
      this.autoSync();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Sync on page visibility change (when user returns to tab)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.useRemoteStorage) {
          // User returned to the page, sync after a short delay
          setTimeout(() => {
            this.autoSync();
          }, 1000);
        }
      });
    }
    
    // Initial sync after a short delay
    setTimeout(() => {
      this.autoSync();
    }, 2000);
  }

  // Stop automatic syncing
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
    this.autoSyncEnabled = false;
    console.log('[Database] Auto-sync disabled');
  }

  // Debounced sync to avoid too many syncs
  debouncedSync(delay = 2000) {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    
    this.syncDebounceTimer = setTimeout(() => {
      this.autoSync();
    }, delay);
  }

  // Automatic sync (pulls from remote, then pushes local changes)
  async autoSync() {
    if (!this.useRemoteStorage || !this.userId || this.syncInProgress) {
      return;
    }
    
    // Don't sync too frequently (minimum 30 seconds between syncs)
    const now = Date.now();
    if (this.lastSyncTime && (now - this.lastSyncTime) < 30000) {
      return;
    }
    
    this.syncInProgress = true;
    
    try {
      // First, try to pull latest data from remote
      const remoteData = await this.syncAllFromRemote();
      
      // Then, push local changes to remote (this will merge/update)
      await this.syncAllToRemote();
      
      this.lastSyncTime = Date.now();
      console.log('[Database] Auto-sync completed');
    } catch (error) {
      // Don't log errors for auto-sync failures (they're expected if offline, etc.)
      // Only log if it's a significant error
      if (error.message && !error.message.includes('404')) {
        console.warn('[Database] Auto-sync warning:', error.message);
      }
    } finally {
      this.syncInProgress = false;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = databaseService;
}

