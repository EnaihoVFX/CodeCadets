# Quick Fix: Sync Error

## The Problem:
You're getting: `Remote storage not enabled. Please configure Supabase in supabase-config.js`

## The Solution (3 steps):

### Step 1: Get Your Anon Key (2 minutes)

1. **Go to Supabase API Settings:**
   - Direct link: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api

2. **Find the anon/public key:**
   - Look for the section **"Project API keys"**
   - Find the key labeled **`anon` `public`** 
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Copy this entire key** (it's long!)

3. **⚠️ Important:** Make sure it's the **anon/public** key, NOT the `service_role` `secret` key!

### Step 2: Update supabase-config.js (30 seconds)

1. Open `supabase-config.js` in your project
2. Find this line:
   ```javascript
   supabaseKey: 'YOUR-ANON-KEY-HERE',
   ```
3. Replace `YOUR-ANON-KEY-HERE` with your actual anon key:
   ```javascript
   supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweG9vd3RycnZ4ZGJhenF0a2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4NTY3ODQsImV4cCI6MjAzMzQzMjc4NH0.xxxxxxxxx',
   ```
4. **Save the file**

### Step 3: Create the Database Table (1 minute)

1. **Go to SQL Editor:**
   - Direct link: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/sql/new

2. **Click "New query"**

3. **Paste and run this SQL:**
   ```sql
   CREATE TABLE IF NOT EXISTS user_data (
     userId TEXT PRIMARY KEY,
     xpState JSONB DEFAULT '{}'::jsonb,
     achievements JSONB DEFAULT '{}'::jsonb,
     completion_data JSONB DEFAULT '{}'::jsonb,
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Allow all operations"
   ON user_data FOR ALL
   USING (true) WITH CHECK (true);
   ```

4. **Click "Run"** (or press Ctrl+Enter)

### Step 4: Test (30 seconds)

1. **Reload your extension** in Chrome (`chrome://extensions/`)
2. **Open the extension popup**
3. **Go to Profile page**
4. **Click SYNC button**
5. ✅ It should work now!

## Still Having Issues?

**Check the browser console (F12):**
- Look for error messages starting with `[Profile]` or `[Database]`
- The new error messages will tell you exactly what's wrong

**Common Issues:**
- ❌ **Still says "API key not configured"** → Your anon key isn't in `supabase-config.js` correctly
- ❌ **404 error** → The database table doesn't exist (run Step 3)
- ❌ **401 error** → Wrong API key (make sure it's the anon key, not service_role)

## Direct Links:
- **API Settings**: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api
- **SQL Editor**: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/sql/new
- **Table Editor** (to check if table exists): https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/editor










