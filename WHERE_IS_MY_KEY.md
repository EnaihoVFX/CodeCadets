# Where to Find Your Supabase Anon Key

## Quick Steps:

### 1. Open Supabase Dashboard
👉 **Direct Link**: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api

### 2. Find "Project API keys" Section
Scroll down on the API settings page until you see a section called:
**"Project API keys"**

### 3. Look for These Two Keys:

You'll see TWO different keys:

```
┌─────────────────────────────────────────┐
│ Project API keys                        │
├─────────────────────────────────────────┤
│ 🔑 anon public                          │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... │ ← USE THIS ONE ✅
│ [Reveal] [Copy]                         │
├─────────────────────────────────────────┤
│ 🔒 service_role secret                  │
│ sb_secret_Gl7MwMatr430GTlhieDy6Q_YVxp...│ ← NOT THIS ONE ❌
│ [Reveal] [Copy]                         │
└─────────────────────────────────────────┘
```

### 4. Click "Copy" on the `anon public` Key
- It will start with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- It's a long string (usually 200+ characters)

### 5. Update supabase-config.js

1. Open `supabase-config.js` in your project
2. Find this line:
   ```javascript
   supabaseKey: 'YOUR-ANON-KEY-HERE',
   ```
3. Replace `YOUR-ANON-KEY-HERE` with your copied key:
   ```javascript
   supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweG9vd3RycnZ4ZGJhenF0a2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4NTY3ODQsImV4cCI6MjAzMzQzMjc4NH0.xxxxxxxxxxxxxxxxxxxxx',
   ```
4. Save the file
5. Reload your extension

## Visual Guide:

**What the anon key looks like:**
- Starts with: `eyJ`
- Very long (200+ characters)
- Format: `eyJ...eyJ...xxxxx`

**What the service_role key looks like:**
- Starts with: `sb_secret_`
- Shorter (50-100 characters)
- Format: `sb_secret_xxxxxxxxx`

## ❌ Common Mistakes:

1. ❌ Using the `service_role` secret key instead of `anon` public key
2. ❌ Forgetting to remove the quotes around `YOUR-ANON-KEY-HERE`
3. ❌ Copying only part of the key (must copy the entire key)
4. ❌ Forgetting to save the file after updating

## ✅ After Updating:

1. **Save** `supabase-config.js`
2. **Reload** your extension in Chrome
3. **Open** the Profile page
4. **Click** SYNC button
5. ✅ Should work now!

## Need Help?

If you still can't find it:
1. Make sure you're logged into Supabase
2. Make sure you're looking at the correct project: `bpxoowtrrvxdbazqtkez`
3. The key should be visible without clicking "Reveal" (for anon key)

## Direct Links:
- **API Settings**: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api
- **Dashboard**: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez










